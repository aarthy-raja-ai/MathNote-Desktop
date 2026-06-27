import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingCart,
    Receipt, CreditCard, Package, ArrowUpRight, ArrowDownRight,
    Banknote, Smartphone, BarChart3, Clock, AlertTriangle, Users, BookOpen,
    Barcode, Plus, Search, X
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useApp, useAuth } from '../context';
import { useTheme } from '../theme';

const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const DARK_CHART_COLORS = ['#818CF8', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6', '#2DD4BF', '#FB923C'];

const DashboardScreen: React.FC = () => {
    const { state, getTodaySales, getTodayExpenses, getTodayProfit, getBalance, getCashBalance, getUPIBalance } = useApp();
    const { canViewReports } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [barcodeQuery, setBarcodeQuery] = useState('');
    const [scannedProduct, setScannedProduct] = useState<typeof state.products[0] | null>(null);
    const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
    const [showScanConfirmModal, setShowScanConfirmModal] = useState(false);

    const handleBarcodeSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const query = barcodeQuery.trim();
        if (!query) return;

        const matched = state.products.find(p => p.barcode === query || p.id === query);
        if (matched) {
            setScannedProduct(matched);
            setUnknownBarcode(null);
            setShowScanConfirmModal(true);
            setBarcodeQuery('');
        } else {
            const q = query.toLowerCase();
            const matches = state.products.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.sku?.toLowerCase().includes(q) ||
                p.barcode?.toLowerCase().includes(q)
            );

            if (matches.length === 1) {
                setScannedProduct(matches[0]);
                setUnknownBarcode(null);
                setShowScanConfirmModal(true);
                setBarcodeQuery('');
            } else if (matches.length > 1) {
                navigate('/inventory', { state: { search: query } });
                setBarcodeQuery('');
            } else {
                setUnknownBarcode(query);
                setScannedProduct(null);
                setShowScanConfirmModal(true);
                setBarcodeQuery('');
            }
        }
    };
    const chartColors = isDark ? DARK_CHART_COLORS : CHART_COLORS;
    const currency = state.settings.currency || '₹';

    const fmt = (n: number) => `${currency}${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const todaySales = getTodaySales();
    const todayExpenses = getTodayExpenses();
    const todayProfit = getTodayProfit();
    const balance = getBalance();
    const cashBalance = getCashBalance();
    const upiBalance = getUPIBalance();

    // Weekly sales data
    const weeklyData = useMemo(() => {
        const days: { name: string; sales: number; expenses: number; profit: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en', { weekday: 'short' });
            const daySales = state.sales.filter(s => s.date === dateStr).reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
            const dayExpenses = state.expenses.filter(e => e.date === dateStr).reduce((sum, e) => sum + (e.amount ?? 0), 0);
            days.push({ name: dayName, sales: daySales, expenses: dayExpenses, profit: daySales - dayExpenses });
        }
        return days;
    }, [state.sales, state.expenses]);

    // Expense categories
    const expenseByCategory = useMemo(() => {
        const catMap: Record<string, number> = {};
        state.expenses.forEach(e => {
            catMap[e.category || 'Other'] = (catMap[e.category || 'Other'] || 0) + e.amount;
        });
        return Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [state.expenses]);

    // Recent activity
    const recentActivity = useMemo(() => {
        const activities: { id: string; type: string; label: string; amount: number; date: string; icon: string }[] = [];
        state.sales.slice(-5).forEach(s => activities.push({
            id: s.id, type: 'sale', label: s.customerName || 'Walk-in', amount: s.totalAmount, date: s.date, icon: 'sale'
        }));
        state.expenses.slice(-5).forEach(e => activities.push({
            id: e.id, type: 'expense', label: e.category, amount: -e.amount, date: e.date, icon: 'expense'
        }));
        state.credits.filter(c => c.status === 'pending').slice(-3).forEach(c => activities.push({
            id: c.id, type: 'credit', label: c.party, amount: c.amount - c.paidAmount, date: c.date, icon: 'credit'
        }));
        return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
    }, [state.sales, state.expenses, state.credits]);

    // Pending credits
    const pendingCredits = useMemo(() =>
        state.credits.filter(c => c.status === 'pending' && c.type === 'given')
        , [state.credits]);

    const totalPending = pendingCredits.reduce((s, c) => s + (c.amount - c.paidAmount), 0);

    // Low stock products
    const lowStockProducts = useMemo(() =>
        state.products.filter(p => p.stock <= (p.lowStockThreshold || 5)).slice(0, 5)
        , [state.products]);

    // Monthly comparison
    const monthlyComparison = useMemo(() => {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

        const thisMonthSales = state.sales.filter(s => s.date.startsWith(thisMonth)).reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
        const lastMonthSales = state.sales.filter(s => s.date.startsWith(lastMonth)).reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
        const change = lastMonthSales > 0 ? ((thisMonthSales - lastMonthSales) / lastMonthSales * 100) : 0;
        return { thisMonth: thisMonthSales, lastMonth: lastMonthSales, change };
    }, [state.sales]);

    // Top customers
    const topCustomers = useMemo(() => {
        const custMap: Record<string, number> = {};
        state.sales.forEach(s => {
            if (s.customerName) custMap[s.customerName] = (custMap[s.customerName] || 0) + (s.totalAmount ?? 0);
        });
        return Object.entries(custMap)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [state.sales]);

    const tooltipStyle = {
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        color: isDark ? '#F1F5F9' : '#1E293B',
        fontSize: '0.8rem',
        padding: '8px 12px'
    };

    return (
        <div className="animate-in" style={{ maxWidth: 1400, paddingBottom: '2rem' }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ letterSpacing: '-0.02em', fontSize: '2rem' }}>Dashboard Overview</h1>
                    <p style={{ fontWeight: 500, opacity: 0.8 }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex gap-sm">
                    <div className="glass" style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <BookOpen size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                        {state.sales.length} Sales · {state.products.length} Products
                    </div>
                </div>
            </div>

            {/* Quick Actions & Barcode Scan / Search Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Shortcuts Card */}
                <div className="card glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                        Quick Actions
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <button className="btn btn-ghost" onClick={() => navigate('/sales')} style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', borderRadius: 'var(--radius-lg)', gap: '0.5rem', alignItems: 'center', height: '100%', border: '1px solid var(--color-border-light)', background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)' }}>
                            <div className="stat-icon success" style={{ marginBottom: 0, width: '40px', height: '40px', borderRadius: '50%' }}>
                                <TrendingUp size={20} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>Record Sale</span>
                        </button>
                        <button className="btn btn-ghost" onClick={() => navigate('/inventory')} style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', borderRadius: 'var(--radius-lg)', gap: '0.5rem', alignItems: 'center', height: '100%', border: '1px solid var(--color-border-light)', background: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)' }}>
                            <div className="stat-icon primary" style={{ marginBottom: 0, width: '40px', height: '40px', borderRadius: '50%' }}>
                                <Package size={20} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>Add Stock</span>
                        </button>
                        <button className="btn btn-ghost" onClick={() => navigate('/expenses')} style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', borderRadius: 'var(--radius-lg)', gap: '0.5rem', alignItems: 'center', height: '100%', border: '1px solid var(--color-border-light)', background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)' }}>
                            <div className="stat-icon error" style={{ marginBottom: 0, width: '40px', height: '40px', borderRadius: '50%' }}>
                                <Receipt size={20} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-error)' }}>Spend</span>
                        </button>
                    </div>
                </div>

                {/* Scan Barcode / Search Box */}
                <div className="card glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Barcode size={16} /> Barcode Scanner / Search
                    </div>
                    <form onSubmit={handleBarcodeSearchSubmit} style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                        <div className="search-box" style={{ flex: 1, position: 'relative' }}>
                            <Search className="search-icon" style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)', position: 'absolute', color: 'var(--color-text-secondary)' }} size={18} />
                            <input
                                className="form-input"
                                style={{ paddingLeft: '2.75rem', height: '48px', fontSize: '0.95rem' }}
                                placeholder="Scan barcode or type name..."
                                value={barcodeQuery}
                                onChange={e => setBarcodeQuery(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem', height: '48px' }}>
                            Search
                        </button>
                    </form>
                </div>
            </div>

            {/* Stat Cards Row */}
            <div className="grid grid-5" style={{ marginBottom: '2rem', gap: '1.5rem' }}>
                <div className="stat-card primary glass">
                    <div className="stat-icon primary"><ShoppingCart size={22} /></div>
                    <div className="stat-label">Today's Sales</div>
                    <div className="stat-value">{fmt(todaySales)}</div>
                    {monthlyComparison.change !== 0 && (
                        <div className={`stat-change ${monthlyComparison.change >= 0 ? 'positive' : 'negative'}`} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                            {monthlyComparison.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {Math.abs(monthlyComparison.change).toFixed(1)}% vs last month
                        </div>
                    )}
                </div>

                <div className="stat-card error glass">
                    <div className="stat-icon error"><Receipt size={22} /></div>
                    <div className="stat-label">Today's Expenses</div>
                    <div className="stat-value">{fmt(todayExpenses)}</div>
                    <div className="stat-change" style={{ opacity: 0.6, marginTop: 8 }}>Controlled spending</div>
                </div>

                {canViewReports && (
                    <>
                        <div className="stat-card success glass">
                            <div className="stat-icon success"><TrendingUp size={22} /></div>
                            <div className="stat-label">Today's Profit</div>
                            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                                {fmt(todayProfit)}
                            </div>
                            <div className="stat-change positive" style={{ marginTop: 8 }}>+12% projected</div>
                        </div>

                        <div className="stat-card warning glass">
                            <div className="stat-icon warning"><CreditCard size={22} /></div>
                            <div className="stat-label">Pending Credits</div>
                            <div className="stat-value">{fmt(totalPending)}</div>
                            <div className="stat-change" style={{ color: 'var(--color-warning)', marginTop: 8 }}>
                                {pendingCredits.length} parties owe you
                            </div>
                        </div>

                        <div className="stat-card primary glass">
                            <div className="stat-icon primary" style={{ background: 'var(--grad-primary)' }}><Users size={22} /></div>
                            <div className="stat-label">Active Contacts</div>
                            <div className="stat-value">{state.contacts.length}</div>
                            <div className="stat-change" style={{ marginTop: 8 }}>Growing network</div>
                        </div>
                    </>
                )}
            </div>

            {/* Summary Row */}
            {canViewReports && (
                <div className="grid grid-2" style={{ marginBottom: '2rem', gap: '1.5rem' }}>
                    <div className="card glass" style={{ borderLeft: '4px solid var(--color-success)', background: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.02)' }}>
                        <div className="flex flex-between">
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-success)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Banknote size={20} /> Total Net Balance
                                </div>
                                <div style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{fmt(balance)}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                                    Cash: <strong>{fmt(cashBalance)}</strong> · UPI: <strong>{fmt(upiBalance)}</strong>
                                </div>
                            </div>
                            <div className="stat-icon success" style={{ width: 64, height: 64, borderRadius: 'var(--radius-xl)' }}>
                                <DollarSign size={32} />
                            </div>
                        </div>
                    </div>

                    <div className="card glass" style={{ borderLeft: '4px solid var(--color-primary)', background: isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.02)' }}>
                        <div className="flex flex-between">
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Smartphone size={20} /> Digital Liquidity
                                </div>
                                <div style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{fmt(upiBalance)}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                                    {((upiBalance / (balance || 1)) * 100).toFixed(1)}% of total net
                                </div>
                            </div>
                            <div className="stat-icon primary" style={{ width: 64, height: 64, borderRadius: 'var(--radius-xl)' }}>
                                <Smartphone size={32} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Row */}
            {canViewReports && (
                <div className="grid grid-2" style={{ marginBottom: '2rem', gap: '1.5rem' }}>
                    {/* Weekly Trend */}
                    <div className="card glass">
                        <div className="card-header">
                            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ padding: 6, background: 'rgba(99, 102, 241, 0.1)', borderRadius: 8 }}>
                                    <BarChart3 size={18} color="var(--color-primary)" />
                                </div>
                                Revenue vs Expenses
                            </span>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartColors[0]} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartColors[3]} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={chartColors[3]} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Area type="monotone" dataKey="sales" stroke={chartColors[0]} fill="url(#salesGrad)" strokeWidth={3} name="Sales" dot={{ r: 4, fill: chartColors[0] }} />
                                <Area type="monotone" dataKey="expenses" stroke={chartColors[3]} fill="url(#expGrad)" strokeWidth={3} name="Expenses" dot={{ r: 4, fill: chartColors[3] }} />
                                <Legend verticalAlign="top" height={36} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Expense Breakdown */}
                    <div className="card glass">
                        <div className="card-header">
                            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ padding: 6, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
                                    <Receipt size={18} color="var(--color-error)" />
                                </div>
                                Expense Distribution
                            </span>
                        </div>
                        {expenseByCategory.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', height: 280 }}>
                                <ResponsiveContainer width="55%" height="100%">
                                    <PieChart>
                                        <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={4} dataKey="value">
                                            {expenseByCategory.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} stroke="transparent" />)}
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => fmt(val)} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ flex: 1, paddingLeft: '1rem' }}>
                                    {expenseByCategory.map((cat, i) => (
                                        <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                            <span style={{ width: 12, height: 12, borderRadius: 4, background: chartColors[i % chartColors.length], flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{fmt(cat.value)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state" style={{ height: 280 }}>
                                <Receipt size={48} style={{ opacity: 0.3 }} />
                                <h3>No expenses yet</h3>
                                <p>Start tracking your spending</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bottom Row: Activities & Quick Lists */}
            <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '1.5rem' }}>
                {/* Recent Activity */}
                <div className="card glass">
                    <div className="card-header">
                        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock size={16} /> Recent Transactions
                        </span>
                        <button className="btn btn-ghost btn-sm">View All</button>
                    </div>
                    {recentActivity.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {recentActivity.map(a => (
                                <div key={a.id} className="flex flex-between" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: '1px solid var(--color-border-light)' }}>
                                    <div className="flex gap-md" style={{ alignItems: 'center', minWidth: 0 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: a.type === 'sale' ? 'rgba(16,185,129,0.15)' : a.type === 'expense' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: a.type === 'sale' ? 'var(--color-success)' : a.type === 'expense' ? 'var(--color-error)' : 'var(--color-warning)',
                                            flexShrink: 0,
                                        }}>
                                            {a.type === 'sale' ? <ArrowUpRight size={20} /> : a.type === 'expense' ? <ArrowDownRight size={20} /> : <CreditCard size={20} />}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {a.date} · <span style={{ textTransform: 'capitalize' }}>{a.type}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: a.amount >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                                            {a.amount >= 0 ? '+' : '-'}{fmt(a.amount)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state"><h3>Quiet for now</h3></div>
                    )}
                </div>

                {/* Pending Credits */}
                <div className="card glass">
                    <div className="card-header">
                        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CreditCard size={16} /> Credit Reminders
                        </span>
                        <span className="badge badge-warning" style={{ borderRadius: 6 }}>{pendingCredits.length}</span>
                    </div>
                    {pendingCredits.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pendingCredits.slice(0, 5).map(c => (
                                <div key={c.id} style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'linear-gradient(to right, rgba(245,158,11,0.05), transparent)', borderLeft: '3px solid var(--color-warning)' }}>
                                    <div className="flex flex-between">
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{c.party}</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-warning)' }}>{fmt(c.amount - c.paidAmount)}</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={12} /> Due: {c.dueDate || 'Standard term'}
                                    </div>
                                </div>
                            ))}
                            {pendingCredits.length > 5 && (
                                <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 5 }}>And {pendingCredits.length - 5} more recipients...</button>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <TrendingUp size={40} style={{ color: 'var(--color-success)', opacity: 0.5 }} />
                            <h3>All Clear!</h3>
                            <p>No outstanding credits to collect</p>
                        </div>
                    )}
                </div>

                {/* Combined Product & Customers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card glass" style={{ borderTop: '4px solid var(--color-error)' }}>
                        <div className="card-header">
                            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertTriangle size={16} color="var(--color-error)" /> Low Inventory
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {lowStockProducts.length > 0 ? (
                                lowStockProducts.map(p => (
                                    <div key={p.id} className="flex flex-between" style={{ fontSize: '0.85rem', padding: '0.25rem 0' }}>
                                        <span style={{ fontWeight: 500 }}>{p.name}</span>
                                        <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>{p.stock} units</span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)' }}>
                                    <Package size={20} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                                    All products are well stocked
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card glass" style={{ borderTop: '4px solid var(--color-primary)' }}>
                        <div className="card-header">
                            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={16} color="var(--color-primary)" /> Top Performers
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {topCustomers.map((c, i) => (
                                <div key={c.name} className="flex flex-between" style={{ alignItems: 'center' }}>
                                    <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: chartColors[i], color: '#fff', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.name}</span>
                                    </div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{fmt(c.total)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scanner Confirmation Modal */}
            {showScanConfirmModal && (
                <div className="modal-overlay" onClick={() => setShowScanConfirmModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h2>{scannedProduct ? 'Product Found' : 'Product Not Found'}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowScanConfirmModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: '1.5rem' }}>
                            {scannedProduct ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ borderBottom: '1px solid var(--color-border-light)', paddingBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{scannedProduct.name}</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Category: {scannedProduct.category || 'General'}</p>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Price</span>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>{fmt(scannedProduct.price)}</div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Current Stock</span>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: scannedProduct.stock <= (scannedProduct.lowStockThreshold || 5) ? 'var(--color-error)' : 'var(--color-text)' }}>
                                                {scannedProduct.stock} {scannedProduct.unit || 'pcs'}
                                            </div>
                                        </div>
                                    </div>
                                    {scannedProduct.barcode && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', background: 'var(--color-soft)', padding: '6px 12px', borderRadius: '6px' }}>
                                            <Barcode size={14} /> Barcode: <strong>{scannedProduct.barcode}</strong>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', alignItems: 'center', padding: '1rem 0' }}>
                                    <AlertTriangle size={48} style={{ color: 'var(--color-warning)' }} />
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Barcode not found</p>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                                            No product matches barcode: <strong style={{ fontFamily: 'monospace' }}>{unknownBarcode}</strong>
                                        </p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                            Would you like to register this product in inventory?
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer" style={{ background: 'var(--color-border-light)', borderTop: 'none' }}>
                            <button className="btn btn-secondary" onClick={() => setShowScanConfirmModal(false)}>
                                Cancel
                            </button>
                            {scannedProduct ? (
                                <>
                                    <button className="btn btn-secondary" onClick={() => {
                                        setShowScanConfirmModal(false);
                                        navigate('/inventory', { state: { productId: scannedProduct.id } });
                                    }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Package size={16} /> Manage Stock
                                    </button>
                                    <button className="btn btn-primary" onClick={() => {
                                        setShowScanConfirmModal(false);
                                        navigate('/sales', { state: { productId: scannedProduct.id } });
                                    }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <ShoppingCart size={16} /> Record Sale
                                    </button>
                                </>
                            ) : (
                                <button className="btn btn-primary" onClick={() => {
                                    setShowScanConfirmModal(false);
                                    navigate('/inventory', { state: { barcode: unknownBarcode } });
                                }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Plus size={16} /> Add Product
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardScreen;

