import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ClipboardList, Plus, Search, Trash2, Eye, X, ArrowRight, Printer } from 'lucide-react';
import { useApp } from '../context';
import { useAuth } from '../context/AuthContext';
import { SaleItem, INDIAN_STATES, PurchaseOrderStatus } from '../utils/storage';
import { generateInvoiceHTML, printInvoice, poToInvoiceData } from '../utils/invoiceGenerator';

const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
    draft: 'var(--color-text-muted)',
    sent: 'var(--color-primary)',
    received: 'var(--color-success)',
    cancelled: 'var(--color-error)',
};

const PurchaseOrderScreen: React.FC = () => {
    const { state, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, addPurchase, updateSettings } = useApp();
    const { auth } = useAuth();
    const currency = state.settings.currency || '₹';
    const fmt = (n: number) => `${currency}${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    const [showModal, setShowModal] = useState(false);
    const [viewId, setViewId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [vendorName, setVendorName] = useState('');
    const [vendorState, setVendorState] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [formNote, setFormNote] = useState('');
    const [items, setItems] = useState<SaleItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const businessState = auth.profile?.state || '';

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return [];
        const q = productSearch.toLowerCase();
        return state.products.filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)).slice(0, 8);
    }, [productSearch, state.products]);

    const addItem = (productId: string) => {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;
        const existing = items.find(i => i.productId === productId);
        if (existing) {
            setItems(items.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i));
        } else {
            setItems([...items, { productId: product.id, productName: product.name, quantity: 1, price: product.costPrice || product.price, costPrice: product.costPrice, total: product.costPrice || product.price, hsnCode: product.hsnCode }]);
        }
        setProductSearch(''); setShowDropdown(false);
    };

    const updateItem = (index: number, field: 'quantity' | 'price', value: number) => {
        setItems(items.map((item, i) => { if (i !== index) return item; const updated = { ...item, [field]: value }; updated.total = updated.quantity * updated.price; return updated; }));
    };
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const isInterState = vendorState ? vendorState !== businessState : false;
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const gstRate = state.settings.gstEnabled ? (state.settings.gstRate || 18) : 0;
    const taxAmount = subtotal * gstRate / 100;
    const cgst = !isInterState ? taxAmount / 2 : 0;
    const sgst = !isInterState ? taxAmount / 2 : 0;
    const igst = isInterState ? taxAmount : 0;
    const grandTotal = subtotal + taxAmount;

    const poNumber = `${state.settings.poPrefix || 'PO'}-${String((state.settings.lastPONumber || 0) + 1).padStart(4, '0')}`;

    const resetForm = () => {
        setVendorName(''); setVendorState(''); setExpectedDate(''); setFormNote('');
        setItems([]); setProductSearch('');
    };

    const handleSubmit = async () => {
        if (items.length === 0 || !vendorName.trim()) return;
        await addPurchaseOrder({
            date: new Date().toISOString().split('T')[0],
            poNumber,
            vendorName: vendorName.trim(),
            vendorState: vendorState || undefined,
            items,
            subtotal,
            taxTotal: Math.round(taxAmount * 100) / 100,
            cgst: cgst ? Math.round(cgst * 100) / 100 : undefined,
            sgst: sgst ? Math.round(sgst * 100) / 100 : undefined,
            igst: igst ? Math.round(igst * 100) / 100 : undefined,
            gstRate: gstRate || undefined,
            grandTotal: Math.round(grandTotal * 100) / 100,
            expectedDate: expectedDate || undefined,
            status: 'draft',
            note: formNote || undefined,
        });
        await updateSettings({ lastPONumber: (state.settings.lastPONumber || 0) + 1 });
        resetForm(); setShowModal(false);
    };

    const handleConvert = async (poId: string) => {
        const po = state.purchaseOrders.find(x => x.id === poId);
        if (!po || po.status === 'received') return;
        if (!confirm('Convert this PO to a purchase? Stock will be added.')) return;
        await addPurchase({
            date: new Date().toISOString().split('T')[0],
            vendorName: po.vendorName,
            vendorState: po.vendorState,
            totalAmount: po.grandTotal,
            paidAmount: po.grandTotal,
            paymentMethod: 'Cash',
            note: `Converted from ${po.poNumber}`,
            items: po.items,
            cgst: po.cgst, sgst: po.sgst, igst: po.igst, gstRate: po.gstRate,
        });
        await updatePurchaseOrder(poId, { status: 'received' });
    };

    const handlePrint = (poId: string) => {
        const po = state.purchaseOrders.find(x => x.id === poId);
        if (!po || !auth.profile) return;
        const data = poToInvoiceData(po);
        const html = generateInvoiceHTML(data, auth.profile, state.settings);
        printInvoice(html);
    };

    const filtered = useMemo(() => {
        let list = [...state.purchaseOrders].reverse();
        if (search) { const q = search.toLowerCase(); list = list.filter(x => x.vendorName?.toLowerCase().includes(q) || x.poNumber?.toLowerCase().includes(q)); }
        if (statusFilter !== 'all') list = list.filter(x => x.status === statusFilter);
        return list;
    }, [state.purchaseOrders, search, statusFilter]);

    const currentView = viewId ? state.purchaseOrders.find(po => po.id === viewId) : null;

    return (
        <div className="animate-in">
            <div className="page-header">
                <div><h1>Purchase Orders</h1><p>{state.purchaseOrders.length} purchase orders</p></div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} />New PO</button>
            </div>

            <div className="flex gap-md" style={{ marginBottom: '1rem' }}>
                <div className="search-box" style={{ flex: 1, maxWidth: 400 }}>
                    <Search className="search-icon" />
                    <input className="form-input" placeholder="Search by vendor or PO number..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                </div>
                <div className="flex gap-xs">
                    {['all', 'draft', 'sent', 'received', 'cancelled'].map(s => (
                        <button key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {filtered.length > 0 ? (
                    <table className="data-table">
                        <thead><tr><th>PO #</th><th>Date</th><th>Vendor</th><th>Items</th><th>Total</th><th>Status</th><th style={{ width: 160 }}>Actions</th></tr></thead>
                        <tbody>
                            {filtered.slice(0, 100).map(po => (
                                <tr key={po.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-primary)' }}>{po.poNumber}</td>
                                    <td>{po.date}</td>
                                    <td style={{ fontWeight: 500 }}>{po.vendorName}</td>
                                    <td>{po.items.length} item{po.items.length !== 1 ? 's' : ''}</td>
                                    <td style={{ fontWeight: 600 }}>{fmt(po.grandTotal)}</td>
                                    <td><span className="badge" style={{ background: STATUS_COLORS[po.status] + '20', color: STATUS_COLORS[po.status] }}>{po.status}</span></td>
                                    <td>
                                        <div className="flex gap-xs">
                                            <button className="btn btn-ghost btn-sm" onClick={() => setViewId(po.id)}><Eye size={15} /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handlePrint(po.id)}><Printer size={15} /></button>
                                            {po.status !== 'received' && (
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-success)' }} onClick={() => handleConvert(po.id)} title="Convert to Purchase"><ArrowRight size={15} /></button>
                                            )}
                                            <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete?')) deletePurchaseOrder(po.id); }}><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state"><ClipboardList size={48} /><h3>No purchase orders yet</h3><p>Create POs for your vendors</p></div>
                )}
            </div>

            {/* New PO Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { resetForm(); setShowModal(false); } }}>
                    <div className="modal" style={{ maxWidth: 650 }}>
                        <div className="modal-header">
                            <h2><ClipboardList size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />New Purchase Order</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => { resetForm(); setShowModal(false); }}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Vendor Name *</label>
                                    <input className="form-input" value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="Vendor / Supplier" />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Vendor State</label>
                                    <select className="form-input form-select" value={vendorState} onChange={e => setVendorState(e.target.value)}>
                                        <option value="">Same as business</option>
                                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Expected Delivery Date</label>
                                <input className="form-input" type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
                            </div>

                            <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                                <label className="form-label">⊕ Add Items</label>
                                <input className="form-input" placeholder="Search product..." value={productSearch}
                                    onChange={e => { setProductSearch(e.target.value); setShowDropdown(true); }}
                                    onFocus={() => productSearch && setShowDropdown(true)} />
                                {showDropdown && filteredProducts.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto' }}>
                                        {filteredProducts.map(p => (
                                            <div key={p.id} onClick={() => addItem(p.id)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-light)', transition: 'background 0.15s' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}>
                                                <span style={{ fontWeight: 500 }}>{p.name}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Cost: {fmt(p.costPrice || p.price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {items.length > 0 && (
                                <table className="data-table" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    <thead><tr><th>Item</th><th style={{ width: 70 }}>Qty</th><th style={{ width: 90 }}>Price</th><th style={{ width: 90 }}>Total</th><th style={{ width: 40 }}></th></tr></thead>
                                    <tbody>
                                        {items.map((item, i) => (
                                            <tr key={i}>
                                                <td>{item.productName}</td>
                                                <td><input className="form-input" type="number" min={1} value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} style={{ padding: '4px 6px', width: 60 }} /></td>
                                                <td><input className="form-input" type="number" min={0} step="0.01" value={item.price} onChange={e => updateItem(i, 'price', parseFloat(e.target.value) || 0)} style={{ padding: '4px 6px', width: 80 }} /></td>
                                                <td style={{ fontWeight: 600 }}>{fmt(item.total)}</td>
                                                <td><button className="btn btn-ghost btn-sm" onClick={() => removeItem(i)}><X size={14} /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            <div className="form-group">
                                <label className="form-label">Note</label>
                                <input className="form-input" value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Optional note..." />
                            </div>

                            {items.length > 0 && (
                                <div style={{ background: 'var(--color-soft)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                                    {state.settings.gstEnabled && gstRate > 0 && (
                                        isInterState
                                            ? <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>IGST ({gstRate}%)</span><span>{fmt(igst)}</span></div>
                                            : <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>CGST ({gstRate / 2}%)</span><span>{fmt(cgst)}</span></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>SGST ({gstRate / 2}%)</span><span>{fmt(sgst)}</span></div>
                                            </>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 4 }}>
                                        <span>Grand Total</span><span style={{ color: 'var(--color-primary)' }}>{fmt(grandTotal)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>📄 {poNumber}</span>
                            <div className="flex gap-sm">
                                <button className="btn btn-secondary" onClick={() => { resetForm(); setShowModal(false); }}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSubmit} disabled={items.length === 0 || !vendorName.trim()}>
                                    <Plus size={16} />Create PO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View PO Modal */}
            {currentView && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setViewId(null); }}>
                    <div className="modal" style={{ maxWidth: 550 }}>
                        <div className="modal-header">
                            <h2>{currentView.poNumber}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setViewId(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-2" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                <div><strong>Vendor:</strong> {currentView.vendorName}</div>
                                <div><strong>Date:</strong> {currentView.date}</div>
                                <div><strong>Status:</strong> <span style={{ color: STATUS_COLORS[currentView.status], fontWeight: 600 }}>{currentView.status}</span></div>
                                {currentView.expectedDate && <div><strong>Expected:</strong> {currentView.expectedDate}</div>}
                            </div>
                            <table className="data-table" style={{ marginBottom: '1rem' }}>
                                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                                <tbody>
                                    {currentView.items.map((item, i) => (
                                        <tr key={i}><td>{item.productName}</td><td>{item.quantity}</td><td>{fmt(item.price)}</td><td style={{ fontWeight: 600 }}>{fmt(item.total)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ background: 'var(--color-soft)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                                <span>Grand Total</span><span style={{ color: 'var(--color-primary)' }}>{fmt(currentView.grandTotal)}</span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => handlePrint(currentView.id)}><Printer size={16} />Print</button>
                            {currentView.status !== 'received' && (
                                <button className="btn btn-primary" onClick={() => { handleConvert(currentView.id); setViewId(null); }}>
                                    <ArrowRight size={16} />Convert to Purchase
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderScreen;
