import React, { useState, useMemo } from 'react';
import { RefreshCcw, Plus, Search, Trash2, X, AlertTriangle, ShoppingCart } from 'lucide-react';
import { useApp } from '../context';
import { SaleItem } from '../utils/storage';

const ReturnsScreen: React.FC = () => {
    const { state, addReturn, deleteReturn } = useApp();
    const currency = state.settings.currency || '₹';
    const fmt = (n: number) => `${currency}${n.toLocaleString('en-IN')}`;

    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedSaleId, setSelectedSaleId] = useState('');
    const [returnNote, setReturnNote] = useState('');
    const [saleSearch, setSaleSearch] = useState('');

    const filtered = useMemo(() => {
        let list = [...state.returns].reverse();
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(r =>
                r.party?.toLowerCase().includes(s) ||
                r.note?.toLowerCase().includes(s) ||
                r.id.toLowerCase().includes(s)
            );
        }
        return list;
    }, [state.returns, search]);

    const matchingSales = useMemo(() => {
        if (!saleSearch) return [];
        const s = saleSearch.toLowerCase();
        return state.sales.filter(sale =>
            sale.invoiceNumber?.toLowerCase().includes(s) ||
            sale.customerName?.toLowerCase().includes(s)
        ).slice(0, 5);
    }, [state.sales, saleSearch]);

    const selectedSale = useMemo(() =>
        state.sales.find(s => s.id === selectedSaleId),
        [state.sales, selectedSaleId]);

    const handleAdd = async () => {
        if (!selectedSaleId) return;
        await addReturn({
            saleId: selectedSaleId,
            note: returnNote,
            // In this version, we return the whole sale by default
            // Future enhancement: item-level selection
        });
        setSelectedSaleId('');
        setReturnNote('');
        setSaleSearch('');
        setShowModal(false);
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Sales Returns</h1>
                    <p>{state.returns.length} total returns recorded</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} />New Return
                </button>
            </div>

            <div className="flex gap-md" style={{ marginBottom: '1rem' }}>
                <div className="search-box" style={{ flex: 1, maxWidth: 400 }}>
                    <Search className="search-icon" />
                    <input
                        className="form-input"
                        placeholder="Search returns..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {filtered.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Party</th>
                                <th>Amount</th>
                                <th>Note</th>
                                <th style={{ width: 80 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.id}>
                                    <td>{r.date}</td>
                                    <td style={{ fontWeight: 500 }}>{r.party}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--color-error)' }}>{fmt(r.amount)}</td>
                                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{r.note || '—'}</td>
                                    <td>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => { if (confirm('Delete return record? This will not reverse stock/balance changes.')) deleteReturn(r.id); }}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <RefreshCcw size={48} />
                        <h3>No returns found</h3>
                        <p>Track customer returns and stock restoration here</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2>Record Sale Return</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Find Sale (Invoice # or Customer)</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="form-input"
                                        placeholder="Search sales..."
                                        value={saleSearch}
                                        onChange={e => setSaleSearch(e.target.value)}
                                    />
                                    {matchingSales.length > 0 && !selectedSaleId && (
                                        <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, padding: 0, marginTop: 4, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                            {matchingSales.map(s => (
                                                <div
                                                    key={s.id}
                                                    className="sidebar-link"
                                                    style={{ cursor: 'pointer', borderRadius: 0, borderBottom: '1px solid var(--color-border)' }}
                                                    onClick={() => {
                                                        setSelectedSaleId(s.id);
                                                        setSaleSearch(s.invoiceNumber || s.customerName || 'Walk-in');
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                        <span>{s.invoiceNumber ? `#${s.invoiceNumber}` : 'No Invoice'} — {s.customerName || 'Walk-in'}</span>
                                                        <span style={{ fontWeight: 600 }}>{fmt(s.totalAmount)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedSale && (
                                <div className="card" style={{ background: 'var(--color-bg-alt)', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Original Sale Total:</span>
                                        <span style={{ fontWeight: 600 }}>{fmt(selectedSale.totalAmount)}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        {selectedSale.items?.length || 0} items will be restored to inventory.
                                    </div>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ marginTop: '0.5rem', color: 'var(--color-primary)' }}
                                        onClick={() => { setSelectedSaleId(''); setSaleSearch(''); }}
                                    >
                                        Change Sale
                                    </button>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Return Note</label>
                                <textarea
                                    className="form-input"
                                    placeholder="Reason for return..."
                                    value={returnNote}
                                    onChange={e => setReturnNote(e.target.value)}
                                    style={{ minHeight: 80, resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                <AlertTriangle size={20} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                    Recording a return will **restore stock** for all items and create a **Credit (Taken)** record for the refund amount.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAdd}
                                disabled={!selectedSaleId}
                            >
                                Confirm Return
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReturnsScreen;
