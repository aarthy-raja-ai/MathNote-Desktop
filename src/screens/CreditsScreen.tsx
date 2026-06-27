import React, { useState, useMemo } from 'react';
import { CreditCard, Plus, Search, Trash2, X, DollarSign, ArrowUpRight, ArrowDownRight, MessageSquare, Download, History, ChevronDown, ChevronRight, User } from 'lucide-react';
import { useApp } from '../context';
import { exportCreditsCSV } from '../utils/exportService';

const CreditsScreen: React.FC = () => {
    const { state, addCredit, addCreditPayment, deleteCredit } = useApp();
    const currency = state.settings.currency || '₹';
    const fmt = (n: number) => `${currency}${n.toLocaleString('en-IN')}`;

    const [showModal, setShowModal] = useState(false);
    const [showPayment, setShowPayment] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('pending');
    const [viewMode, setViewMode] = useState<'individual' | 'party'>('individual');

    const [form, setForm] = useState({ party: '', type: 'given' as 'given' | 'taken', amount: '', note: '', dueDate: '' });
    const [paymentForm, setPaymentForm] = useState({ amount: '', note: '', paymentMode: 'Cash' as 'Cash' | 'UPI' });

    // Individual records
    const filtered = useMemo(() => {
        let list = [...state.credits].reverse();
        if (search) list = list.filter(c => c.party.toLowerCase().includes(search.toLowerCase()));
        if (filterType !== 'all') list = list.filter(c => c.type === filterType);
        if (filterStatus !== 'all') list = list.filter(c => c.status === filterStatus);
        return list;
    }, [state.credits, search, filterType, filterStatus]);

    // Party-wise grouping
    const partyGroups = useMemo(() => {
        const groups: Record<string, { party: string, given: number, taken: number, net: number, count: number }> = {};
        state.credits.forEach(c => {
            if (!groups[c.party]) groups[c.party] = { party: c.party, given: 0, taken: 0, net: 0, count: 0 };
            const balance = c.amount - (c.paidAmount || 0);
            if (c.type === 'given') groups[c.party].given += balance;
            else groups[c.party].taken += balance;
            groups[c.party].count++;
        });

        return Object.values(groups)
            .map(g => ({ ...g, net: g.given - g.taken }))
            .filter(g => !search || g.party.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    }, [state.credits, search]);

    const totalGiven = state.credits.filter(c => c.type === 'given' && c.status === 'pending').reduce((s, c) => s + (c.amount - c.paidAmount), 0);
    const totalTaken = state.credits.filter(c => c.type === 'taken' && c.status === 'pending').reduce((s, c) => s + (c.amount - c.paidAmount), 0);

    const handleAdd = async () => {
        const amount = parseFloat(form.amount);
        if (!form.party || !amount) return;
        await addCredit({ party: form.party, type: form.type, amount, status: 'pending', date: new Date().toISOString().split('T')[0], dueDate: form.dueDate, note: form.note });
        setForm({ party: '', type: 'given', amount: '', note: '', dueDate: '' });
        setShowModal(false);
    };

    const handlePayment = async () => {
        const amount = parseFloat(paymentForm.amount);
        if (!showPayment || !amount) return;
        await addCreditPayment(showPayment, { date: new Date().toISOString().split('T')[0], amount, note: paymentForm.note, paymentMode: paymentForm.paymentMode });
        setPaymentForm({ amount: '', note: '', paymentMode: 'Cash' });
        setShowPayment(null);
    };

    const sendWhatsAppReminder = (party: string, amount: number, type: 'given' | 'taken') => {
        if (type !== 'given') return;
        const msg = `Hello ${party}, this is a friendly reminder regarding your outstanding balance of ${fmt(amount)} at our business. Please let us know when you can clear it. Thank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleExport = () => {
        exportCreditsCSV(state.credits, currency);
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Credits & Ledger</h1>
                    <p>{state.credits.length} total entries</p>
                </div>
                <div className="flex gap-sm">
                    <button className="btn btn-secondary" onClick={handleExport}><Download size={18} />Export CSV</button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} />Add Credit</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))', borderColor: 'rgba(245,158,11,0.2)', padding: '1.25rem' }}>
                    <div className="flex flex-between">
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ArrowUpRight size={18} />Given (Receivable)
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em' }}>{fmt(totalGiven)}</div>
                        </div>
                        <div style={{ padding: 10, borderRadius: 12, background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)' }}>
                            <DollarSign size={24} />
                        </div>
                    </div>
                </div>
                <div className="card" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))', borderColor: 'rgba(239,68,68,0.2)', padding: '1.25rem' }}>
                    <div className="flex flex-between">
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ArrowDownRight size={18} />Taken (Payable)
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em' }}>{fmt(totalTaken)}</div>
                        </div>
                        <div style={{ padding: 10, borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
                            <CreditCard size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* View Selection & Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="flex gap-xs" style={{ background: 'var(--color-bg-alt)', padding: 4, borderRadius: 10 }}>
                    <button className={`chip ${viewMode === 'individual' ? 'active' : ''}`} onClick={() => setViewMode('individual')} style={{ borderRadius: 8 }}>Individual List</button>
                    <button className={`chip ${viewMode === 'party' ? 'active' : ''}`} onClick={() => setViewMode('party')} style={{ borderRadius: 8 }}>Party Grouping</button>
                </div>

                <div className="search-box" style={{ flex: 1, minWidth: 200, maxWidth: 350 }}>
                    <Search className="search-icon" />
                    <input className="form-input" placeholder="Search party..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                </div>

                {viewMode === 'individual' && (
                    <>
                        <div className="flex gap-xs">
                            {[{ v: 'all', l: 'All Types' }, { v: 'given', l: 'Given' }, { v: 'taken', l: 'Taken' }].map(m => (
                                <button key={m.v} className={`chip ${filterType === m.v ? 'active' : ''}`} onClick={() => setFilterType(m.v)}>{m.l}</button>
                            ))}
                        </div>
                        <div className="flex gap-xs">
                            {[{ v: 'all', l: 'All Status' }, { v: 'pending', l: 'Pending' }, { v: 'paid', l: 'Paid' }].map(m => (
                                <button key={m.v} className={`chip ${filterStatus === m.v ? 'active' : ''}`} onClick={() => setFilterStatus(m.v)}>{m.l}</button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {viewMode === 'individual' ? (
                    filtered.length > 0 ? (
                        <table className="data-table">
                            <thead><tr><th>Date</th><th>Party</th><th>Type</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th style={{ width: 150 }}>Actions</th></tr></thead>
                            <tbody>
                                {filtered.slice(0, 50).map(c => {
                                    const balance = c.amount - c.paidAmount;
                                    return (
                                        <tr key={c.id}>
                                            <td style={{ fontSize: '0.85rem' }}>{c.date}</td>
                                            <td style={{ fontWeight: 600 }}>{c.party}</td>
                                            <td><span className={`badge ${c.type === 'given' ? 'badge-warning' : 'badge-error'}`}>{c.type}</span></td>
                                            <td style={{ fontWeight: 500 }}>{fmt(c.amount)}</td>
                                            <td style={{ color: 'var(--color-success)' }}>{fmt(c.paidAmount)}</td>
                                            <td style={{ fontWeight: 700, color: balance > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>{fmt(balance)}</td>
                                            <td><span className={`badge ${c.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{c.status}</span></td>
                                            <td>
                                                <div className="flex gap-xs">
                                                    {c.status === 'pending' && <button className="btn btn-ghost btn-sm" onClick={() => setShowPayment(c.id)} title="Record Payment"><DollarSign size={15} /></button>}
                                                    {c.payments && c.payments.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(c.id)} title="Payment History"><History size={15} /></button>}
                                                    {c.type === 'given' && balance > 0 && <button className="btn btn-ghost btn-sm" onClick={() => sendWhatsAppReminder(c.party, balance, c.type)} title="WhatsApp Reminder"><MessageSquare size={15} style={{ color: '#25D366' }} /></button>}
                                                    <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Delete?')) deleteCredit(c.id); }} title="Delete"><Trash2 size={15} style={{ color: 'var(--color-error)' }} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-state"><CreditCard size={48} /><h3>No records found</h3><p>Try matching your search or filters</p></div>
                    )
                ) : (
                    partyGroups.length > 0 ? (
                        <table className="data-table">
                            <thead><tr><th>Party</th><th>Given Balance</th><th>Taken Balance</th><th>Net Ledger</th><th>Entries</th><th style={{ width: 100 }}>Actions</th></tr></thead>
                            <tbody>
                                {partyGroups.map(g => (
                                    <tr key={g.party}>
                                        <td style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={16} />
                                            </div>
                                            {g.party}
                                        </td>
                                        <td style={{ color: 'var(--color-warning)', fontWeight: 500 }}>{fmt(g.given)}</td>
                                        <td style={{ color: 'var(--color-error)', fontWeight: 500 }}>{fmt(g.taken)}</td>
                                        <td style={{ fontWeight: 800, color: g.net > 0 ? 'var(--color-warning)' : g.net < 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                                            {g.net > 0 ? `Receivable: ${fmt(g.net)}` : g.net < 0 ? `Payable: ${fmt(Math.abs(g.net))}` : 'Settled'}
                                        </td>
                                        <td style={{ color: 'var(--color-text-muted)' }}>{g.count} entries</td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(g.party); setViewMode('individual'); setFilterType('all'); setFilterStatus('all'); }}>
                                                View All <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-state"><User size={48} /><h3>No parties found</h3><p>Start by adding credits for customers or vendors</p></div>
                    )
                )}
            </div>

            {/* Payment History Modal */}
            {showHistory && (
                <div className="modal-overlay" onClick={() => setShowHistory(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <div>
                                <h2>Payment History</h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{state.credits.find(s => s.id === showHistory)?.party}</p>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: 0 }}>
                            <table className="data-table">
                                <thead><tr><th>Date</th><th>Mode</th><th>Amount</th><th>Note</th></tr></thead>
                                <tbody>
                                    {state.credits.find(s => s.id === showHistory)?.payments?.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.date}</td>
                                            <td><span className="badge badge-info">{p.paymentMode || 'Cash'}</span></td>
                                            <td style={{ fontWeight: 600 }}>{fmt(p.amount)}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{p.note || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(!state.credits.find(s => s.id === showHistory)?.payments || state.credits.find(s => s.id === showHistory)?.payments?.length === 0) && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No payments recorded yet</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Credit Modal (Unchanged but with minor UI fixes) */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header"><h2>Record New Credit</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Party Name (Customer/Vendor) *</label><input className="form-input" value={form.party} onChange={e => setForm({ ...form, party: e.target.value })} autoFocus /></div>
                            <div className="form-group"><label className="form-label">Credit Type</label><div className="flex gap-xs" style={{ marginTop: 4 }}>{(['given', 'taken'] as const).map(t => <button key={t} className={`chip ${form.type === t ? 'active' : ''}`} onClick={() => setForm({ ...form, type: t })}>{t === 'given' ? 'I gave credit (Receivable)' : 'I took credit (Payable)'}</button>)}</div></div>
                            <div className="grid grid-2">
                                <div className="form-group"><label className="form-label">Total Amount *</label><input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Reference / Note</label><input className="form-input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Add Credit Record</button></div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPayment && (
                <div className="modal-overlay" onClick={() => setShowPayment(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header"><h2>Record Payment</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowPayment(null)}><X size={18} /></button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Payment Amount *</label><input className="form-input" type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} autoFocus /></div>
                            <div className="form-group"><label className="form-label">Payment Mode</label><div className="flex gap-xs" style={{ marginTop: 4 }}>{(['Cash', 'UPI'] as const).map(m => <button key={m} className={`chip ${paymentForm.paymentMode === m ? 'active' : ''}`} onClick={() => setPaymentForm({ ...paymentForm, paymentMode: m })}>{m}</button>)}</div></div>
                            <div className="form-group"><label className="form-label">Payment Note</label><input className="form-input" value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowPayment(null)}>Cancel</button><button className="btn btn-primary" onClick={handlePayment}>Submit Payment</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditsScreen;
