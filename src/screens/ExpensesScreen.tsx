import React, { useState, useMemo } from 'react';
import { Receipt, Plus, Search, Trash2, Edit, X, Calendar, Filter, ArrowRight, DollarSign } from 'lucide-react';
import { useApp } from '../context';
import { getFinancialYear } from '../utils/fyHelpers';

const CATEGORIES = ['Food', 'Transport', 'Utilities', 'Rent', 'Salaries', 'Purchase', 'Marketing', 'Maintenance', 'Other'];

const ExpensesScreen: React.FC = () => {
    const { state, addExpense, updateExpense, deleteExpense, selectedFY, selectedCompanyId } = useApp();
    const currency = state.settings.currency || '₹';
    const fmt = (n: number) => `${currency}${n.toLocaleString('en-IN')}`;

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('all');

    // Filters
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [form, setForm] = useState({
        category: 'Other',
        amount: '',
        note: '',
        vendorName: '',
        paymentMethod: 'Cash' as 'Cash' | 'UPI',
        date: new Date().toISOString().split('T')[0]
    });

    const filtered = useMemo(() => {
        let list = [...state.expenses].filter(e => getFinancialYear(e.date) === selectedFY && (e.companyId || 'default') === selectedCompanyId).reverse();
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(e =>
                e.note?.toLowerCase().includes(s) ||
                e.category?.toLowerCase().includes(s) ||
                e.vendorName?.toLowerCase().includes(s)
            );
        }
        if (filterCat !== 'all') list = list.filter(e => e.category === filterCat);
        if (dateRange.start) list = list.filter(e => e.date >= dateRange.start);
        if (dateRange.end) list = list.filter(e => e.date <= dateRange.end);
        return list;
    }, [state.expenses, search, filterCat, dateRange, selectedFY, selectedCompanyId]);

    const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);

    const handleOpenAdd = () => {
        setEditingId(null);
        setForm({
            category: 'Other',
            amount: '',
            note: '',
            vendorName: '',
            paymentMethod: 'Cash',
            date: new Date().toISOString().split('T')[0]
        });
        setShowModal(true);
    };

    const handleOpenEdit = (expense: any) => {
        setEditingId(expense.id);
        setForm({
            category: expense.category,
            amount: (expense.amount ?? '').toString(),
            note: expense.note || '',
            vendorName: expense.vendorName || '',
            paymentMethod: expense.paymentMethod || 'Cash',
            date: expense.date
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        const amount = parseFloat(form.amount);
        if (!amount || amount <= 0) return;

        const expenseData = {
            date: form.date,
            category: form.category,
            amount,
            note: form.note,
            vendorName: form.vendorName,
            paymentMethod: form.paymentMethod
        };

        if (editingId) {
            await updateExpense(editingId, expenseData);
        } else {
            await addExpense(expenseData);
        }

        setShowModal(false);
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Expense Manager</h1>
                    <p>{state.expenses.length} records · Total {fmt(state.expenses.reduce((s, e) => s + e.amount, 0))}</p>
                </div>
                <button className="btn btn-primary" onClick={handleOpenAdd}><Plus size={18} />Add Expense</button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--color-error)' }}>
                    <div className="stat-label">Filtered Total</div>
                    <div className="stat-value" style={{ color: 'var(--color-error)' }}>{fmt(totalExpenses)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{filtered.length} transactions</div>
                </div>
                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--color-success)' }}>
                    <div className="stat-label">Cash Expenses</div>
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>{fmt(filtered.filter(e => e.paymentMethod === 'Cash').reduce((s, e) => s + e.amount, 0))}</div>
                </div>
                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
                    <div className="stat-label">UPI Expenses</div>
                    <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{fmt(filtered.filter(e => e.paymentMethod === 'UPI').reduce((s, e) => s + e.amount, 0))}</div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                <div className="flex flex-col gap-md">
                    <div className="flex gap-md items-center flex-wrap">
                        <div className="search-box" style={{ flex: 1, minWidth: 250 }}>
                            <Search className="search-icon" />
                            <input className="form-input" placeholder="Search by vendor, note or category..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                        </div>
                        <div className="flex items-center gap-sm">
                            <Calendar size={18} className="text-muted" />
                            <input type="date" className="form-input" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} style={{ width: 140 }} />
                            <ArrowRight size={14} className="text-muted" />
                            <input type="date" className="form-input" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} style={{ width: 140 }} />
                            {(dateRange.start || dateRange.end) && (
                                <button className="btn btn-ghost btn-sm" onClick={() => setDateRange({ start: '', end: '' })}><X size={14} /></button>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-xs flex-wrap">
                        <button className={`chip ${filterCat === 'all' ? 'active' : ''}`} onClick={() => setFilterCat('all')}>All Categories</button>
                        {CATEGORIES.map(c => (
                            <button key={c} className={`chip ${filterCat === c ? 'active' : ''}`} onClick={() => setFilterCat(c)}>{c}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {filtered.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Vendor</th>
                                <th>Note</th>
                                <th>Method</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                                <th style={{ width: 100, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(e => (
                                <tr key={e.id}>
                                    <td style={{ fontSize: '0.85rem' }}>{e.date}</td>
                                    <td><span className="badge badge-error" style={{ opacity: 0.8 }}>{e.category}</span></td>
                                    <td style={{ fontWeight: 500 }}>{e.vendorName || '—'}</td>
                                    <td style={{ color: 'var(--color-text-secondary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.note}>{e.note || '—'}</td>
                                    <td><span className={`badge ${e.paymentMethod === 'Cash' ? 'badge-success' : 'badge-primary'}`}>{e.paymentMethod || 'Cash'}</span></td>
                                    <td style={{ fontWeight: 700, textAlign: 'right', color: 'var(--color-error)' }}>{fmt(e.amount)}</td>
                                    <td>
                                        <div className="flex gap-xs justify-center">
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEdit(e)} title="Edit"><Edit size={15} /></button>
                                            <button className="btn btn-ghost btn-sm text-error" onClick={() => { if (confirm('Delete this expense?')) deleteExpense(e.id); }} title="Delete"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <Receipt size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <h3>No expenses found</h3>
                        <p>Try adjusting your search or filters</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Expense' : 'Add New Expense'}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-input form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">Amount *</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>{currency}</div>
                                        <input className="form-input" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={{ paddingLeft: '2.2rem' }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Mode</label>
                                    <div className="flex gap-xs" style={{ marginTop: '0.4rem' }}>
                                        {(['Cash', 'UPI'] as const).map(m => (
                                            <button key={m} className={`chip ${form.paymentMethod === m ? 'active' : ''}`} onClick={() => setForm({ ...form, paymentMethod: m })}>{m}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Vendor Name</label>
                                <input className="form-input" placeholder="e.g. Amazon, Local Store" value={form.vendorName} onChange={e => setForm({ ...form, vendorName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Note / Remark</label>
                                <textarea className="form-input" placeholder="Describe the expense..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ minHeight: 80, resize: 'vertical' }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                {editingId ? 'Update Expense' : 'Add Expense'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpensesScreen;
