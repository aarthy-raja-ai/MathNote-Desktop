import React, { useMemo, useState } from 'react';
import { FileBarChart, Download, Calendar, ArrowRight, Filter, TrendingUp, DollarSign, Wallet } from 'lucide-react';
import {
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useApp } from '../context';
import { useTheme } from '../theme';
import { exportSalesCSV, exportExpensesCSV, exportCreditsCSV } from '../utils/exportService';

const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

type Range = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' | 'all';

const ReportsScreen: React.FC = () => {
    const { state, selectedCompanyId } = useApp();
    const { isDark } = useTheme();
    const currency = state.settings.currency || '₹';
    const fmt = (n: number) => `${currency}${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const [range, setRange] = useState<Range>('month');
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const filterByRange = <T extends { date: string; companyId?: string }>(arr: T[]): T[] => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        return arr.filter(item => {
            if ((item.companyId || 'default') !== selectedCompanyId) return false;
            if (range === 'all') return true;
            if (range === 'today') return item.date === today;
            if (range === 'yesterday') {
                const yest = new Date();
                yest.setDate(yest.getDate() - 1);
                return item.date === yest.toISOString().split('T')[0];
            }
            const d = new Date(item.date);
            if (range === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return d >= weekAgo;
            }
            if (range === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            if (range === 'year') return d.getFullYear() === now.getFullYear();
            if (range === 'custom') {
                return item.date >= customRange.start && item.date <= customRange.end;
            }
            return true;
        });
    };

    const sales = useMemo(() => filterByRange(state.sales), [state.sales, range, customRange, selectedCompanyId]);
    const expenses = useMemo(() => filterByRange(state.expenses), [state.expenses, range, customRange, selectedCompanyId]);
    const credits = useMemo(() => filterByRange(state.credits), [state.credits, range, customRange, selectedCompanyId]);

    const totalSales = sales.reduce((s, e) => s + (e.totalAmount ?? 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
    const totalProfit = totalSales - totalExpenses;
    const totalPending = credits.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount - c.paidAmount), 0);

    const paymentBreakdown = useMemo(() => {
        const breakdown: Record<string, number> = {};
        sales.forEach(s => {
            const method = s.paymentMethod || 'Cash';
            breakdown[method] = (breakdown[method] || 0) + (s.totalAmount ?? 0);
        });
        return Object.entries(breakdown).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
    }, [sales]);

    const expenseByCategory = useMemo(() => {
        const catMap: Record<string, number> = {};
        expenses.forEach(e => { catMap[e.category || 'Other'] = (catMap[e.category || 'Other'] || 0) + e.amount; });
        return Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    }, [expenses]);

    const dailyTrend = useMemo(() => {
        const dayMap: Record<string, { sales: number; expenses: number }> = {};
        sales.forEach(s => { if (!dayMap[s.date]) dayMap[s.date] = { sales: 0, expenses: 0 }; dayMap[s.date].sales += s.totalAmount ?? 0; });
        expenses.forEach(e => { if (!dayMap[e.date]) dayMap[e.date] = { sales: 0, expenses: 0 }; dayMap[e.date].expenses += e.amount; });

        const sortedDays = Object.entries(dayMap).sort();
        // If range is large, we might want to group by month, but for now daily trend of the filtered range is fine
        return sortedDays.slice(-30).map(([date, data]) => ({
            date: date.slice(5), // MM-DD
            Sales: data.sales,
            Expenses: data.expenses,
            Profit: data.sales - data.expenses
        }));
    }, [sales, expenses]);

    const topCustomers = useMemo(() => {
        const custMap: Record<string, { total: number; count: number }> = {};
        sales.forEach(s => {
            const name = s.customerName || 'Walk-in';
            if (!custMap[name]) custMap[name] = { total: 0, count: 0 };
            custMap[name].total += s.totalAmount ?? 0;
            custMap[name].count++;
        });
        return Object.entries(custMap).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.total - a.total).slice(0, 6);
    }, [sales]);

    const handleExportSales = () => exportSalesCSV(sales, currency, `Sales_Report_${range}.csv`);
    const handleExportExpenses = () => exportExpensesCSV(expenses, currency, `Expenses_Report_${range}.csv`);

    const tooltipStyle = {
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        borderRadius: '10px',
        color: isDark ? '#F1F5F9' : '#1E293B',
        fontSize: '0.85rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        padding: '8px 12px',
    };

    return (
        <div className="animate-in" style={{ maxWidth: 1400 }}>
            <div className="page-header">
                <div>
                    <h1>Business Analytics</h1>
                    <p>Performance tracking & financial health</p>
                </div>
                <div className="flex gap-sm">
                    <div className="flex gap-xs" style={{ background: 'var(--color-bg-alt)', padding: 4, borderRadius: 10 }}>
                        {([['today', 'Today'], ['week', 'Week'], ['month', 'Month'], ['custom', 'Custom'], ['all', 'All']] as const).map(([v, l]) => (
                            <button key={v} className={`chip ${range === v ? 'active' : ''}`} onClick={() => setRange(v)} style={{ borderRadius: 8 }}>{l}</button>
                        ))}
                    </div>
                    <div className="flex gap-xs">
                        <button className="btn btn-secondary" onClick={handleExportSales} title="Export Sales CSV"><Download size={16} />Sales</button>
                        <button className="btn btn-secondary" onClick={handleExportExpenses} title="Export Expenses CSV"><Download size={16} />Expenses</button>
                    </div>
                </div>
            </div>

            {range === 'custom' && (
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-bg-alt)' }}>
                    <div className="flex gap-md items-center">
                        <div className="flex items-center gap-sm">
                            <Calendar size={18} className="text-primary" />
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Custom Range:</span>
                        </div>
                        <div className="flex items-center gap-xs">
                            <input type="date" className="form-input" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} style={{ width: 150 }} />
                            <ArrowRight size={16} className="text-muted" />
                            <input type="date" className="form-input" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} style={{ width: 150 }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Core Metrics */}
            <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1.25rem', borderColor: 'var(--color-primary-soft)' }}>
                    <div className="flex flex-between items-start">
                        <div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Total Revenue</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{fmt(totalSales)}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: 4, fontWeight: 500 }}>{sales.length} transactions</div>
                        </div>
                        <div style={{ padding: 10, borderRadius: 10, background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}><TrendingUp size={20} /></div>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <div className="flex flex-between items-start">
                        <div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Total Expenses</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{fmt(totalExpenses)}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: 4, fontWeight: 500 }}>{expenses.length} records</div>
                        </div>
                        <div style={{ padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}><Wallet size={20} /></div>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderColor: totalProfit >= 0 ? 'var(--color-success-soft)' : 'rgba(239,68,68,0.2)' }}>
                    <div className="flex flex-between items-start">
                        <div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Net Profit</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: totalProfit >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{fmt(totalProfit)}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Margin: {totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0}%</div>
                        </div>
                        <div style={{ padding: 10, borderRadius: 10, background: totalProfit >= 0 ? 'var(--color-success-soft)' : 'rgba(239,68,68,0.1)', color: totalProfit >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}><DollarSign size={20} /></div>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderColor: 'rgba(245,158,11,0.2)' }}>
                    <div className="flex flex-between items-start">
                        <div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Outstanding</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{fmt(totalPending)}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Credits receivable</div>
                        </div>
                        <div style={{ padding: 10, borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)' }}><FileBarChart size={20} /></div>
                    </div>
                </div>
            </div>

            {/* Trends & Distribution */}
            <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="card" style={{ minHeight: 400 }}>
                    <div className="card-header"><span className="card-title">Financial Trends</span><p>Daily sales, expenses and profit flow</p></div>
                    <div style={{ padding: '1rem' }}>
                        {dailyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={dailyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} vertical={false} />
                                    <XAxis dataKey="date" tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend verticalAlign="top" height={36} iconType="circle" />
                                    <Line type="monotone" dataKey="Sales" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="Expenses" stroke="#F43F5E" strokeWidth={3} dot={{ r: 4, fill: '#F43F5E', strokeWidth: 2, stroke: '#fff' }} />
                                    <Line type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : <div className="empty-state"><FileBarChart size={48} /><p>No data available for trend analysis</p></div>}
                    </div>
                </div>

                <div className="card" style={{ minHeight: 400 }}>
                    <div className="card-header"><span className="card-title">Expense Distribution</span><p>Top expense categories and breakdown</p></div>
                    <div style={{ padding: '1rem' }}>
                        {expenseByCategory.length > 0 ? (
                            <div className="flex items-center" style={{ height: 320 }}>
                                <ResponsiveContainer width="50%" height="100%">
                                    <PieChart>
                                        <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                            {expenseByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ width: '50%', paddingLeft: '1rem' }}>
                                    {expenseByCategory.map((d, i) => (
                                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            <div style={{ flex: 1 }}>
                                                <div className="flex flex-between" style={{ fontSize: '0.85rem' }}>
                                                    <span style={{ fontWeight: 500 }}>{d.name}</span>
                                                    <span style={{ fontWeight: 700 }}>{fmt(d.value)}</span>
                                                </div>
                                                <div style={{ height: 4, background: 'var(--color-soft)', borderRadius: 2, marginTop: 4 }}>
                                                    <div style={{ height: '100%', width: `${(d.value / totalExpenses) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 2 }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : <div className="empty-state"><Filter size={48} /><p>No expense data to display</p></div>}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Payment Methods & Top Customers */}
            <div className="grid grid-2">
                <div className="card">
                    <div className="card-header"><span className="card-title">Revenue by Payment Mode</span></div>
                    <div style={{ padding: '1rem' }}>
                        {paymentBreakdown.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={paymentBreakdown}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={tooltipStyle} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Amount">
                                        {paymentBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="empty-state"><DollarSign size={40} /><p>No payment data</p></div>}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header"><span className="card-title">Top Revenue Contributors</span><p>Customers with highest bill values</p></div>
                    <div style={{ padding: '1.5rem' }}>
                        {topCustomers.length > 0 ? (
                            <div className="flex flex-col gap-md">
                                {topCustomers.map((c, i) => {
                                    const maxVal = topCustomers[0].total;
                                    return (
                                        <div key={c.name} className="flex items-center gap-md">
                                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                                                {i + 1}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div className="flex flex-between" style={{ marginBottom: 4 }}>
                                                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                                                    <span style={{ fontWeight: 700 }}>{fmt(c.total)}</span>
                                                </div>
                                                <div style={{ height: 6, background: 'var(--color-border-light)', borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${(c.total / maxVal) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 3 }} />
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                                    {c.count} transactions • {fmt(c.total / c.count)} avg. value
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : <div className="empty-state"><FileBarChart size={40} /><p>No sales activity recorded</p></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsScreen;
