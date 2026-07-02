import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileText, Plus, Search, Trash2, Eye, X, ArrowRight, Printer, Check, Clock, Send, Package } from 'lucide-react';
import { useApp } from '../context';
import { useAuth } from '../context/AuthContext';
import { SaleItem, INDIAN_STATES, QuotationStatus } from '../utils/storage';
import { generateInvoiceHTML, printInvoice, quotationToInvoiceData } from '../utils/invoiceGenerator';
import { getFinancialYear, getNextSequenceNumber } from '../utils/fyHelpers';

const STATUS_COLORS: Record<QuotationStatus, string> = {
    draft: 'var(--color-text-muted)',
    sent: 'var(--color-primary)',
    accepted: 'var(--color-success)',
    converted: '#6366f1',
    expired: 'var(--color-error)',
};

const QuotationScreen: React.FC = () => {
    const { state, addQuotation, updateQuotation, deleteQuotation, addSale, updateSettings, selectedFY, selectedCompanyId } = useApp();
    const { auth } = useAuth();
    const currency = state.settings.currency || '₹';
    const fmt = (n: number) => `${currency}${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    const [showModal, setShowModal] = useState(false);
    const [viewId, setViewId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Form
    const [customerName, setCustomerName] = useState('');
    const [customerState, setCustomerState] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerGSTIN, setCustomerGSTIN] = useState('');
    const [items, setItems] = useState<SaleItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
    const [validUntil, setValidUntil] = useState('');
    const [terms, setTerms] = useState('');
    const [formNote, setFormNote] = useState('');
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
            setItems(items.map(i => i.productId === productId
                ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
                : i));
        } else {
            setItems([...items, {
                productId: product.id, productName: product.name,
                quantity: 1, price: product.price, costPrice: product.costPrice,
                total: product.price, hsnCode: product.hsnCode,
            }]);
        }
        setProductSearch('');
        setShowDropdown(false);
    };

    const updateItem = (index: number, field: 'quantity' | 'price', value: number) => {
        setItems(items.map((item, i) => {
            if (i !== index) return item;
            const updated = { ...item, [field]: value };
            updated.total = updated.quantity * updated.price;
            return updated;
        }));
    };

    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const isInterState = customerState ? customerState !== businessState : false;
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const discountAmount = discountType === 'percent'
        ? subtotal * (parseFloat(discountValue) || 0) / 100
        : parseFloat(discountValue) || 0;
    const afterDiscount = subtotal - discountAmount;
    const gstRate = state.settings.gstEnabled ? (state.settings.gstRate || 18) : 0;
    const taxAmount = afterDiscount * gstRate / 100;
    const cgst = !isInterState ? taxAmount / 2 : 0;
    const sgst = !isInterState ? taxAmount / 2 : 0;
    const igst = isInterState ? taxAmount : 0;
    const grandTotal = afterDiscount + taxAmount;

    const qtnNumber = getNextSequenceNumber(state.quotations, state.settings.quotationPrefix || 'QTN', 'quotationNumber', selectedFY, selectedCompanyId);

    const resetForm = () => {
        setCustomerName(''); setCustomerState(''); setCustomerPhone(''); setCustomerAddress('');
        setCustomerGSTIN(''); setItems([]); setProductSearch(''); setDiscountValue('');
        setDiscountType('percent'); setValidUntil(''); setTerms(''); setFormNote('');
    };

    const handleSubmit = async () => {
        if (items.length === 0 || !customerName.trim()) return;
        await addQuotation({
            date: new Date().toISOString().split('T')[0],
            quotationNumber: qtnNumber,
            customerName: customerName.trim(),
            customerState: customerState || undefined,
            customerAddress: customerAddress || undefined,
            customerGSTIN: customerGSTIN || undefined,
            customerPhone: customerPhone || undefined,
            items,
            subtotal,
            discountTotal: discountAmount,
            discountType: discountAmount > 0 ? discountType : undefined,
            taxTotal: Math.round(taxAmount * 100) / 100,
            cgst: cgst ? Math.round(cgst * 100) / 100 : undefined,
            sgst: sgst ? Math.round(sgst * 100) / 100 : undefined,
            igst: igst ? Math.round(igst * 100) / 100 : undefined,
            gstRate: gstRate || undefined,
            grandTotal: Math.round(grandTotal * 100) / 100,
            validUntil: validUntil || undefined,
            terms: terms || undefined,
            status: 'draft',
            note: formNote || undefined,
        });
        resetForm();
        setShowModal(false);
    };

    const handleConvert = async (qId: string) => {
        const q = state.quotations.find(x => x.id === qId);
        if (!q || q.status === 'converted') return;
        if (!confirm('Convert this quotation to a sale? Stock will be deducted.')) return;

        const invoiceNum = getNextSequenceNumber(state.sales, state.settings.invoicePrefix || 'INV', 'invoiceNumber', selectedFY, selectedCompanyId);
        await addSale({
            customerName: q.customerName,
            customerState: q.customerState,
            customerAddress: q.customerAddress,
            customerGSTIN: q.customerGSTIN,
            customerPhone: q.customerPhone,
            totalAmount: q.grandTotal,
            paidAmount: q.grandTotal,
            paymentMethod: 'Cash',
            note: `Converted from ${q.quotationNumber}`,
            items: q.items,
            invoiceNumber: invoiceNum,
            subtotal: q.subtotal,
            discountTotal: q.discountTotal,
            discountType: q.discountType,
            taxTotal: q.taxTotal,
            cgst: q.cgst,
            sgst: q.sgst,
            igst: q.igst,
            gstRate: q.gstRate,
        });
        await updateQuotation(qId, { status: 'converted' });
    };

    const handlePrint = async (qId: string) => {
        const q = state.quotations.find(x => x.id === qId);
        if (!q || !auth.profile) return;

        let qrCodeDataUrl: string | undefined;
        if (state.settings.upiId) {
            try {
                const QRCode = await import('qrcode');
                const upiUrl = `upi://pay?pa=${state.settings.upiId}&pn=${encodeURIComponent(auth.profile.businessName)}&am=${q.grandTotal}&tr=${q.quotationNumber}&tn=Quotation_${q.quotationNumber}`;
                qrCodeDataUrl = await QRCode.toDataURL(upiUrl, { width: 150, margin: 1 });
            } catch (err) {
                console.error('Failed to generate QR code for print:', err);
            }
        }

        const data = {
            ...quotationToInvoiceData(q),
            qrCodeDataUrl
        };
        const html = generateInvoiceHTML(data, auth.profile, state.settings);
        printInvoice(html);
    };

    const filtered = useMemo(() => {
        let list = [...state.quotations].filter(x => getFinancialYear(x.date) === selectedFY && (x.companyId || 'default') === selectedCompanyId).reverse();
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(x => x.customerName?.toLowerCase().includes(q) || x.quotationNumber?.toLowerCase().includes(q));
        }
        if (statusFilter !== 'all') list = list.filter(x => x.status === statusFilter);
        return list;
    }, [state.quotations, search, statusFilter, selectedFY, selectedCompanyId]);

    const currentView = viewId ? state.quotations.find(q => q.id === viewId) : null;

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Quotations</h1>
                    <p>{state.quotations.length} quotations created</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} />New Quotation</button>
            </div>

            <div className="flex gap-md" style={{ marginBottom: '1rem' }}>
                <div className="search-box" style={{ flex: 1, maxWidth: 400 }}>
                    <Search className="search-icon" />
                    <input className="form-input" placeholder="Search by customer or number..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                </div>
                <div className="flex gap-xs">
                    {['all', 'draft', 'sent', 'accepted', 'converted', 'expired'].map(s => (
                        <button key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {filtered.length > 0 ? (
                    <table className="data-table">
                        <thead><tr><th>Number</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th style={{ width: 160 }}>Actions</th></tr></thead>
                        <tbody>
                            {filtered.slice(0, 100).map(q => (
                                <tr key={q.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-primary)' }}>{q.quotationNumber}</td>
                                    <td>{q.date}</td>
                                    <td style={{ fontWeight: 500 }}>{q.customerName}</td>
                                    <td>{q.items.length} item{q.items.length !== 1 ? 's' : ''}</td>
                                    <td style={{ fontWeight: 600 }}>{fmt(q.grandTotal)}</td>
                                    <td><span className="badge" style={{ background: STATUS_COLORS[q.status] + '20', color: STATUS_COLORS[q.status] }}>{q.status}</span></td>
                                    <td>
                                        <div className="flex gap-xs">
                                            <button className="btn btn-ghost btn-sm" onClick={() => setViewId(q.id)} title="View"><Eye size={15} /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handlePrint(q.id)} title="Print"><Printer size={15} /></button>
                                            {q.status !== 'converted' && (
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-success)' }} onClick={() => handleConvert(q.id)} title="Convert to Sale"><ArrowRight size={15} /></button>
                                            )}
                                            <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete this quotation?')) deleteQuotation(q.id); }}><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state"><FileText size={48} /><h3>No quotations yet</h3><p>Create estimates for your customers</p></div>
                )}
            </div>

            {/* New Quotation Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { resetForm(); setShowModal(false); } }}>
                    <div className="modal" style={{ maxWidth: 650 }}>
                        <div className="modal-header">
                            <h2><FileText size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />New Quotation</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => { resetForm(); setShowModal(false); }}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Customer Name *</label>
                                    <input className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Customer State</label>
                                    <select className="form-input form-select" value={customerState} onChange={e => setCustomerState(e.target.value)}>
                                        <option value="">Same as business</option>
                                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone" />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Valid Until</label>
                                    <input className="form-input" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                                </div>
                            </div>

                            {/* Product Search */}
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
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{fmt(p.price)}</span>
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

                            <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Discount</label>
                                    <div className="flex gap-xs">
                                        <input className="form-input" type="number" min={0} placeholder="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)} style={{ flex: 1 }} />
                                        <button className={`chip ${discountType === 'percent' ? 'active' : ''}`} onClick={() => setDiscountType('percent')}>%</button>
                                        <button className={`chip ${discountType === 'flat' ? 'active' : ''}`} onClick={() => setDiscountType('flat')}>₹</button>
                                    </div>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Terms & Conditions</label>
                                    <input className="form-input" value={terms} onChange={e => setTerms(e.target.value)} placeholder="Payment terms..." />
                                </div>
                            </div>

                            {items.length > 0 && (
                                <div style={{ background: 'var(--color-soft)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                                    {discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--color-success)' }}><span>Discount</span><span>-{fmt(discountAmount)}</span></div>}
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
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>📄 {qtnNumber}</span>
                            <div className="flex gap-sm">
                                <button className="btn btn-secondary" onClick={() => { resetForm(); setShowModal(false); }}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSubmit} disabled={items.length === 0 || !customerName.trim()}>
                                    <Plus size={16} />Create Quotation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Quotation Modal */}
            {currentView && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setViewId(null); }}>
                    <div className="modal" style={{ maxWidth: 550 }}>
                        <div className="modal-header">
                            <h2>{currentView.quotationNumber}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setViewId(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-2" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                <div><strong>Customer:</strong> {currentView.customerName}</div>
                                <div><strong>Date:</strong> {currentView.date}</div>
                                <div><strong>Status:</strong> <span style={{ color: STATUS_COLORS[currentView.status], fontWeight: 600 }}>{currentView.status}</span></div>
                                {currentView.validUntil && <div><strong>Valid Until:</strong> {currentView.validUntil}</div>}
                            </div>
                            {currentView.items.length > 0 && (
                                <table className="data-table" style={{ marginBottom: '1rem' }}>
                                    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                                    <tbody>
                                        {currentView.items.map((item, i) => (
                                            <tr key={i}><td>{item.productName}</td><td>{item.quantity}</td><td>{fmt(item.price)}</td><td style={{ fontWeight: 600 }}>{fmt(item.total)}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            <div style={{ background: 'var(--color-soft)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                                <span>Grand Total</span><span style={{ color: 'var(--color-primary)' }}>{fmt(currentView.grandTotal)}</span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <div className="flex gap-sm">
                                {currentView.status === 'draft' && (
                                    <button className="btn btn-secondary" onClick={() => { updateQuotation(currentView.id, { status: 'sent' }); }}><Send size={14} />Mark Sent</button>
                                )}
                                {currentView.status === 'sent' && (
                                    <button className="btn btn-secondary" onClick={() => { updateQuotation(currentView.id, { status: 'accepted' }); }}><Check size={14} />Mark Accepted</button>
                                )}
                                <button className="btn btn-secondary" onClick={() => handlePrint(currentView.id)}><Printer size={16} />Print</button>
                            </div>
                            {currentView.status !== 'converted' && (
                                <button className="btn btn-primary" onClick={() => { handleConvert(currentView.id); setViewId(null); }}>
                                    <ArrowRight size={16} />Convert to Sale
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuotationScreen;
