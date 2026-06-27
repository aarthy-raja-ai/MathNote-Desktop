import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Trash2, Eye, X, Package } from 'lucide-react';
import { useApp } from '../context';
import { useAuth } from '../context/AuthContext';
import { SaleItem, INDIAN_STATES } from '../utils/storage';

const PurchasesScreen: React.FC = () => {
    const { state, addPurchase, deletePurchase } = useApp();
    const { auth } = useAuth();
    const currency = state.settings.currency || '₹';
    const fmt = (n: number) => `${currency}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [viewPurchase, setViewPurchase] = useState<typeof state.purchases[0] | null>(null);

    // Form state
    const [vendorName, setVendorName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
    const [note, setNote] = useState('');
    const [paidAmount, setPaidAmount] = useState('');
    const [vendorState, setVendorState] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const businessState = auth.profile?.state || '';
    const isInterState = vendorState ? vendorState !== businessState : (state.settings.gstType === 'inter');

    // Item-level
    const [items, setItems] = useState<(SaleItem & { _key: number })[]>([]);
    const [itemSearch, setItemSearch] = useState('');
    let _keyCounter = Date.now();

    const addItem = (productId: string) => {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;
        const existing = items.find(i => i.productId === productId);
        if (existing) {
            setItems(items.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i));
        } else {
            setItems([...items, { _key: _keyCounter++, productId, productName: product.name, quantity: 1, price: product.costPrice || product.price, costPrice: product.costPrice, total: product.costPrice || product.price }]);
        }
        setItemSearch('');
    };

    const updateItemQty = (key: number, qty: number) => {
        if (qty < 1) return;
        setItems(items.map(i => i._key === key ? { ...i, quantity: qty, total: qty * i.price } : i));
    };

    const updateItemPrice = (key: number, price: number) => {
        setItems(items.map(i => i._key === key ? { ...i, price, total: i.quantity * price } : i));
    };

    const removeItem = (key: number) => setItems(items.filter(i => i._key !== key));

    const subtotal = items.reduce((s, i) => s + i.total, 0);

    const gstEnabled = state.settings.gstEnabled;
    const gstRate = state.settings.gstRate || 18;
    const gstType = state.settings.gstType || 'intra';
    const taxAmount = gstEnabled ? subtotal * gstRate / 100 : 0;
    const grandTotal = subtotal + taxAmount;

    const handleAdd = async () => {
        const total = items.length > 0 ? grandTotal : parseFloat(paidAmount) || 0;
        if (total <= 0 || !vendorName.trim()) return;
        const paid = parseFloat(paidAmount) || total;

        await addPurchase({
            date: new Date().toISOString().split('T')[0],
            vendorName: vendorName.trim(),
            vendorState: vendorState || undefined,
            totalAmount: Math.round(total * 100) / 100,
            paidAmount: Math.round(paid * 100) / 100,
            paymentMethod,
            note,
            items: items.length > 0 ? items.map(({ _key, ...rest }) => rest) : undefined,
            cgst: gstEnabled && !isInterState ? Math.round(taxAmount / 2 * 100) / 100 : undefined,
            sgst: gstEnabled && !isInterState ? Math.round(taxAmount / 2 * 100) / 100 : undefined,
            igst: gstEnabled && isInterState ? Math.round(taxAmount * 100) / 100 : undefined,
            gstRate: gstEnabled ? gstRate : undefined,
        });

        setVendorName(''); setPaidAmount(''); setPaymentMethod('Cash'); setNote('');
        setItems([]); setVendorState(''); setShowModal(false);
    };

    const filtered = useMemo(() => {
        let list = [...state.purchases].reverse();
        if (search) list = list.filter(p => p.vendorName?.toLowerCase().includes(search.toLowerCase()));
        return list;
    }, [state.purchases, search]);

    const productResults = useMemo(() => {
        if (!itemSearch) return [];
        return state.products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase()) || p.sku?.toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 8);
    }, [state.products, itemSearch]);

    const todayPurchases = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return state.purchases.filter(p => p.date === today);
    }, [state.purchases]);

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Purchases</h1>
                    <p>{state.purchases.length} total · Today: {todayPurchases.length} ({fmt(todayPurchases.reduce((s, p) => s + p.totalAmount, 0))})</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} />New Purchase</button>
            </div>

            <div className="flex gap-md" style={{ marginBottom: '1rem' }}>
                <div className="search-box" style={{ flex: 1, maxWidth: 400 }}>
                    <Search className="search-icon" />
                    <input className="form-input" placeholder="Search by vendor..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {filtered.length > 0 ? (
                    <table className="data-table">
                        <thead><tr><th>Date</th><th>Vendor</th><th>Items</th><th>Total</th><th>Paid</th><th>Method</th><th>Note</th><th style={{ width: 100 }}>Actions</th></tr></thead>
                        <tbody>
                            {filtered.slice(0, 100).map(p => (
                                <tr key={p.id}>
                                    <td>{p.date}</td>
                                    <td style={{ fontWeight: 500 }}>{p.vendorName}</td>
                                    <td>{p.items ? `${p.items.length} item${p.items.length !== 1 ? 's' : ''}` : '—'}</td>
                                    <td style={{ fontWeight: 600 }}>{fmt(p.totalAmount)}</td>
                                    <td style={{ color: p.paidAmount < p.totalAmount ? 'var(--color-warning)' : 'var(--color-success)' }}>{fmt(p.paidAmount)}</td>
                                    <td><span className={`badge ${p.paymentMethod === 'Cash' ? 'badge-success' : 'badge-primary'}`}>{p.paymentMethod || 'Cash'}</span></td>
                                    <td style={{ color: 'var(--color-text-secondary)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.note || '—'}</td>
                                    <td>
                                        <div className="flex gap-xs">
                                            <button className="btn btn-ghost btn-sm" onClick={() => setViewPurchase(p)}><Eye size={15} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete this purchase?')) deletePurchase(p.id); }}><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state"><ShoppingBag size={48} /><h3>No purchases yet</h3><p>Track vendor purchases here</p></div>
                )}
            </div>

            {/* Add Purchase Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '95%' }}>
                        <div className="modal-header">
                            <h2><ShoppingBag size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />New Purchase</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">Vendor Name *</label>
                                    <input className="form-input" value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="Vendor / Supplier name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Method</label>
                                    <div className="flex gap-xs">
                                        {(['Cash', 'UPI'] as const).map(m => (
                                            <button key={m} className={`chip ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>{m}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Vendor State */}
                            <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                <label className="form-label">Vendor State</label>
                                <select className="form-input form-select" value={vendorState} onChange={e => setVendorState(e.target.value)}>
                                    <option value="">Same as business ({businessState || 'not set'})</option>
                                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Items */}
                            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Package size={14} /> Add Items (stock will be added automatically)
                                </label>
                                <div style={{ position: 'relative' }} ref={dropdownRef}>
                                    <input className="form-input" placeholder="Search products..." value={itemSearch} onChange={e => { setItemSearch(e.target.value); setShowDropdown(true); }} onFocus={() => itemSearch && setShowDropdown(true)} />
                                    {showDropdown && productResults.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                                            {productResults.map(p => (
                                                <div key={p.id} onClick={() => { addItem(p.id); setShowDropdown(false); }} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-light)', transition: 'background 0.15s' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}>
                                                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>Cost: {fmt(p.costPrice || p.price)} · Stock: {p.stock}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {items.length > 0 && (
                                    <table className="data-table" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                                        <thead><tr><th>Product</th><th style={{ width: 80 }}>Qty</th><th style={{ width: 110 }}>Cost/Unit</th><th style={{ width: 100 }}>Total</th><th style={{ width: 40 }}></th></tr></thead>
                                        <tbody>
                                            {items.map(item => (
                                                <tr key={item._key}>
                                                    <td style={{ fontWeight: 500 }}>{item.productName}</td>
                                                    <td><input className="form-input" type="number" min={1} value={item.quantity} onChange={e => updateItemQty(item._key, parseInt(e.target.value) || 1)} style={{ width: 60, padding: '0.25rem 0.5rem', textAlign: 'center' }} /></td>
                                                    <td><input className="form-input" type="number" min={0} step={0.01} value={item.price} onChange={e => updateItemPrice(item._key, parseFloat(e.target.value) || 0)} style={{ width: 90, padding: '0.25rem 0.5rem' }} /></td>
                                                    <td style={{ fontWeight: 600 }}>{fmt(item.total)}</td>
                                                    <td><button className="btn btn-danger btn-sm" onClick={() => removeItem(item._key)} style={{ padding: '2px 4px' }}><X size={14} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Totals */}
                            {items.length > 0 && (
                                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
                                        <span style={{ fontWeight: 500 }}>{fmt(subtotal)}</span>
                                    </div>
                                    {gstEnabled && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                                            <span>GST ({gstRate}%)</span>
                                            <span>+{fmt(taxAmount)}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', paddingTop: '0.5rem', borderTop: '2px solid var(--color-border)' }}>
                                        <span>Grand Total</span>
                                        <span style={{ color: 'var(--color-primary)' }}>{fmt(grandTotal)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-2" style={{ marginTop: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Paid Amount</label>
                                    <input className="form-input" type="number" placeholder={items.length > 0 ? `${grandTotal.toFixed(2)} (full)` : 'Amount *'} value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Note</label>
                                    <input className="form-input" placeholder="Optional" value={note} onChange={e => setNote(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAdd}><Plus size={16} /> Add Purchase</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Purchase Modal */}
            {viewPurchase && (
                <div className="modal-overlay" onClick={() => setViewPurchase(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
                        <div className="modal-header">
                            <h2>Purchase Details</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setViewPurchase(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                                <div><span className="form-label">Vendor</span><p style={{ fontWeight: 500 }}>{viewPurchase.vendorName}</p></div>
                                <div><span className="form-label">Date</span><p>{viewPurchase.date}</p></div>
                                <div><span className="form-label">Total</span><p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fmt(viewPurchase.totalAmount)}</p></div>
                                <div><span className="form-label">Paid</span><p style={{ fontWeight: 600, color: viewPurchase.paidAmount < viewPurchase.totalAmount ? 'var(--color-warning)' : 'var(--color-success)' }}>{fmt(viewPurchase.paidAmount)}</p></div>
                            </div>
                            {viewPurchase.note && <div style={{ marginTop: '0.75rem' }}><span className="form-label">Note</span><p style={{ color: 'var(--color-text-secondary)' }}>{viewPurchase.note}</p></div>}
                            {viewPurchase.items && viewPurchase.items.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <span className="form-label">Items ({viewPurchase.items.length})</span>
                                    <table className="data-table" style={{ marginTop: '0.5rem' }}>
                                        <thead><tr><th>Product</th><th>Qty</th><th>Cost</th><th>Total</th></tr></thead>
                                        <tbody>
                                            {viewPurchase.items.map((item, i) => (
                                                <tr key={i}><td>{item.productName}</td><td>{item.quantity}</td><td>{fmt(item.price)}</td><td style={{ fontWeight: 600 }}>{fmt(item.total)}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchasesScreen;
