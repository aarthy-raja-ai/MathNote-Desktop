import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Trash2, Eye, X, ShoppingCart, Printer } from 'lucide-react';
import { useApp } from '../context';
import { useAuth } from '../context/AuthContext';
import { SaleItem, INDIAN_STATES } from '../utils/storage';
import { generateInvoiceHTML, printInvoice, saleToInvoiceData } from '../utils/invoiceGenerator';
import { getFinancialYear, getNextSequenceNumber } from '../utils/fyHelpers';

const SalesScreen: React.FC = () => {
    const { state, addSale, deleteSale, updateSettings, selectedFY, selectedCompanyId } = useApp();
    const location = useLocation();
    const { auth, canDelete, hasPermission } = useAuth();
    const currency = state.settings.currency || '₹';
    const fmt = (n: number) => `${currency}${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    const [showModal, setShowModal] = useState(false);
    const [viewSale, setViewSale] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterMethod, setFilterMethod] = useState('all');

    // Form state
    const [customerName, setCustomerName] = useState('Walk-in');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerGSTIN, setCustomerGSTIN] = useState('');
    const [customerState, setCustomerState] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
    const [paidAmount, setPaidAmount] = useState('');
    const [note, setNote] = useState('');
    const [items, setItems] = useState<SaleItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
    const [taxMode, setTaxMode] = useState<'exclusive' | 'inclusive'>(state.settings.taxMode || 'exclusive');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowProductDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const businessState = auth.profile?.state || '';

    // Determine GST type based on customer state
    const isInterState = useMemo(() => {
        if (!businessState || !customerState) return state.settings.gstType === 'inter';
        return customerState !== businessState;
    }, [businessState, customerState, state.settings.gstType]);

    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return [];
        const q = productSearch.toLowerCase();
        return state.products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.barcode?.toLowerCase().includes(q)
        ).slice(0, 8);
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
                productId: product.id,
                productName: product.name,
                brand: product.brand,
                quantity: 1,
                price: product.price,
                costPrice: product.costPrice,
                total: product.price,
                hsnCode: product.hsnCode,
                taxRate: product.taxRate !== undefined ? product.taxRate : 18,
            }]);
        }
        setProductSearch('');
        setShowProductDropdown(false);
    };

    useEffect(() => {
        if (location.state && location.state.productId) {
            const prodId = location.state.productId;
            window.history.replaceState(null, '');
            setShowModal(true);
            addItem(prodId);
        }
    }, [location.state, state.products]);

    const updateItem = (index: number, field: 'quantity' | 'price', value: number) => {
        setItems(items.map((item, i) => {
            if (i !== index) return item;
            const updated = { ...item, [field]: value };
            updated.total = updated.quantity * updated.price;
            return updated;
        }));
    };

    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    // Calculate totals item-wise
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const discountAmount = discountType === 'percent'
        ? subtotal * (parseFloat(discountValue) || 0) / 100
        : parseFloat(discountValue) || 0;

    const gstEnabled = state.settings.taxType !== 'NON-GST';
    const isComposition = state.settings.taxType === 'Composition';

    const computedItems = items.map(item => {
        const itemShareOfDiscount = subtotal > 0 ? (item.total / subtotal) * discountAmount : 0;
        const itemNet = item.total - itemShareOfDiscount;
        const rate = gstEnabled ? (item.taxRate !== undefined ? item.taxRate : 18) : 0;

        let taxableValue = itemNet;
        let taxTotal = 0;

        if (isComposition) {
            taxableValue = itemNet;
            taxTotal = 0;
        } else if (taxMode === 'inclusive' && rate > 0) {
            taxableValue = itemNet / (1 + rate / 100);
            taxTotal = itemNet - taxableValue;
        } else {
            taxableValue = itemNet;
            taxTotal = itemNet * rate / 100;
        }

        const itemCGST = !isInterState ? taxTotal / 2 : 0;
        const itemSGST = !isInterState ? taxTotal / 2 : 0;
        const itemIGST = isInterState ? taxTotal : 0;

        return {
            ...item,
            discount: Math.round(itemShareOfDiscount * 100) / 100,
            taxableValue: Math.round(taxableValue * 100) / 100,
            taxTotal: Math.round(taxTotal * 100) / 100,
            cgst: itemCGST ? Math.round(itemCGST * 100) / 100 : undefined,
            sgst: itemSGST ? Math.round(itemSGST * 100) / 100 : undefined,
            igst: itemIGST ? Math.round(itemIGST * 100) / 100 : undefined,
        };
    });

    const taxGroups = useMemo(() => {
        const groups: Record<number, { rate: number; cgst: number; sgst: number; igst: number; taxTotal: number }> = {};
        computedItems.forEach(item => {
            const rate = gstEnabled ? (item.taxRate !== undefined ? item.taxRate : (state.settings.gstRate || 18)) : 0;
            if (rate <= 0) return;
            if (!groups[rate]) {
                groups[rate] = { rate, cgst: 0, sgst: 0, igst: 0, taxTotal: 0 };
            }
            groups[rate].cgst += item.cgst || 0;
            groups[rate].sgst += item.sgst || 0;
            groups[rate].igst += item.igst || 0;
            groups[rate].taxTotal += item.taxTotal || 0;
        });
        return Object.values(groups).sort((a, b) => a.rate - b.rate);
    }, [computedItems, gstEnabled]);

    const taxAmount = computedItems.reduce((sum, item) => sum + (item.taxTotal || 0), 0);
    const cgst = computedItems.reduce((sum, item) => sum + (item.cgst || 0), 0);
    const sgst = computedItems.reduce((sum, item) => sum + (item.sgst || 0), 0);
    const igst = computedItems.reduce((sum, item) => sum + (item.igst || 0), 0);
    const afterDiscount = subtotal - discountAmount;
    const grandTotal = taxMode === 'inclusive' ? afterDiscount : afterDiscount + taxAmount;
    const gstRate = gstEnabled ? (state.settings.gstRate || 18) : 0;

    const invoiceNumber = getNextSequenceNumber(state.sales, state.settings.invoicePrefix || 'INV', 'invoiceNumber', selectedFY, selectedCompanyId);

    const resetForm = () => {
        setCustomerName('Walk-in');
        setCustomerPhone('');
        setCustomerAddress('');
        setCustomerGSTIN('');
        setCustomerState('');
        setPaymentMethod('Cash');
        setPaidAmount('');
        setNote('');
        setItems([]);
        setProductSearch('');
        setDiscountValue('');
        setDiscountType('percent');
        setTaxMode(state.settings.taxMode || 'exclusive');
    };

    const handleSubmit = async () => {
        if (items.length === 0) return;
        const paid = paidAmount === '' ? grandTotal : parseFloat(paidAmount) || 0;
        await addSale({
            customerName: customerName.trim() || 'Walk-in',
            customerPhone: customerPhone.trim(),
            customerAddress: customerAddress.trim(),
            customerGSTIN: customerGSTIN.trim(),
            customerState,
            totalAmount: Math.round(grandTotal * 100) / 100,
            paidAmount: Math.round(paid * 100) / 100,
            paymentMethod,
            note: note.trim(),
            items: computedItems,
            invoiceNumber,
            subtotal,
            discountTotal: discountAmount,
            discountType: discountAmount > 0 ? discountType : undefined,
            taxTotal: Math.round(taxAmount * 100) / 100,
            cgst: cgst ? Math.round(cgst * 100) / 100 : undefined,
            sgst: sgst ? Math.round(sgst * 100) / 100 : undefined,
            igst: igst ? Math.round(igst * 100) / 100 : undefined,
            gstRate: gstRate || undefined,
            taxMode,
        });
        resetForm();
        setShowModal(false);
    };

    const filtered = useMemo(() => {
        let list = [...state.sales].filter(s => getFinancialYear(s.date) === selectedFY && (s.companyId || 'default') === selectedCompanyId).reverse();
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.customerName?.toLowerCase().includes(q) ||
                s.invoiceNumber?.toLowerCase().includes(q) ||
                s.note?.toLowerCase().includes(q)
            );
        }
        if (filterMethod !== 'all') list = list.filter(s => s.paymentMethod === filterMethod);
        return list;
    }, [state.sales, search, filterMethod, selectedFY, selectedCompanyId]);

    const today = new Date().toISOString().split('T')[0];
    const todaySales = useMemo(() => {
        return state.sales.filter(s => s.date === today && (s.companyId || 'default') === selectedCompanyId);
    }, [state.sales, selectedCompanyId]);

    const todayTotal = todaySales.reduce((s, sale) => s + sale.totalAmount, 0);
    const todayCount = todaySales.length;

    // Print invoice handler
    const handlePrint = async (saleId: string) => {
        const sale = state.sales.find(s => s.id === saleId);
        if (!sale || !auth.profile) return;
        
        let qrCodeDataUrl: string | undefined;
        if (state.settings.upiId) {
            try {
                const QRCode = await import('qrcode');
                const upiUrl = `upi://pay?pa=${state.settings.upiId}&pn=${encodeURIComponent(auth.profile.businessName)}&am=${sale.totalAmount}&tr=${sale.invoiceNumber || sale.id}&tn=Invoice_${sale.invoiceNumber || sale.id}`;
                qrCodeDataUrl = await QRCode.toDataURL(upiUrl, { width: 150, margin: 1 });
            } catch (err) {
                console.error('Failed to generate QR code for print:', err);
            }
        }

        const data = {
            ...saleToInvoiceData(sale),
            qrCodeDataUrl
        };
        const html = generateInvoiceHTML(data, auth.profile, state.settings);
        printInvoice(html);
    };

    const currentViewSale = viewSale ? state.sales.find(s => s.id === viewSale) : null;

    const viewTaxGroups = useMemo(() => {
        if (!currentViewSale || !currentViewSale.items) return [];
        const groups: Record<number, { rate: number; cgst: number; sgst: number; igst: number; taxTotal: number }> = {};
        currentViewSale.items.forEach(item => {
            const rate = item.taxRate !== undefined ? item.taxRate : (currentViewSale.gstRate || 18);
            if (rate <= 0) return;
            const itemTax = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0) + (item.taxTotal || 0);
            if (itemTax <= 0) return;
            if (!groups[rate]) {
                groups[rate] = { rate, cgst: 0, sgst: 0, igst: 0, taxTotal: 0 };
            }
            groups[rate].cgst += item.cgst || 0;
            groups[rate].sgst += item.sgst || 0;
            groups[rate].igst += item.igst || 0;
            groups[rate].taxTotal += item.taxTotal || 0;
        });
        return Object.values(groups).sort((a, b) => a.rate - b.rate);
    }, [currentViewSale]);

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Sales</h1>
                    <p>{state.sales.length} total sales · Today: {todayCount} sales ({fmt(todayTotal)})</p>
                </div>
                {hasPermission('sales', 'add') && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} />New Sale</button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-md" style={{ marginBottom: '1rem' }}>
                <div className="search-box" style={{ flex: 1, maxWidth: 400 }}>
                    <Search className="search-icon" />
                    <input className="form-input" placeholder="Search by customer, invoice, or note..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                </div>
                <div className="flex gap-xs">
                    {['all', 'Cash', 'UPI'].map(m => (
                        <button key={m} className={`chip ${filterMethod === m ? 'active' : ''}`} onClick={() => setFilterMethod(m)}>
                            {m === 'all' ? 'All' : m}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {filtered.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th>Amount</th><th>Paid</th><th>Method</th><th style={{ width: 140 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.slice(0, 100).map(s => (
                                <tr key={s.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-primary)' }}>{s.invoiceNumber || '—'}</td>
                                    <td>{s.date}</td>
                                    <td style={{ fontWeight: 500 }}>{s.customerName || 'Walk-in'}</td>
                                    <td>{s.items ? `${s.items.length} item${s.items.length !== 1 ? 's' : ''}` : '—'}</td>
                                    <td style={{ fontWeight: 600 }}>{fmt(s.totalAmount)}</td>
                                    <td style={{ color: s.paidAmount < s.totalAmount ? 'var(--color-warning)' : 'var(--color-success)' }}>{fmt(s.paidAmount)}</td>
                                    <td><span className={`badge ${s.paymentMethod === 'Cash' ? 'badge-success' : 'badge-primary'}`}>{s.paymentMethod}</span></td>
                                    <td>
                                        <div className="flex gap-xs">
                                            <button className="btn btn-ghost btn-sm" onClick={() => setViewSale(s.id)} title="View"><Eye size={15} /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handlePrint(s.id)} title="Print"><Printer size={15} /></button>
                                            {canDelete && (
                                                <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete this sale?')) deleteSale(s.id); }} title="Delete"><Trash2 size={15} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <ShoppingCart size={48} />
                        <h3>No sales yet</h3>
                        <p>Click "New Sale" to record your first sale</p>
                    </div>
                )}
            </div>

            {/* New Sale Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { resetForm(); setShowModal(false); } }}>
                    <div className="modal" style={{ maxWidth: 650 }}>
                        <div className="modal-header">
                            <h2><ShoppingCart size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />New Sale</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => { resetForm(); setShowModal(false); }}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            {/* Customer & Payment */}
                            <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Customer Name</label>
                                    <input className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in" />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Customer Phone</label>
                                    <input className="form-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone number" />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Customer Address</label>
                                <textarea className="form-input" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Full address" rows={2} style={{ resize: 'vertical' }} />
                            </div>

                            <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Customer GSTIN</label>
                                    <input className="form-input" value={customerGSTIN} onChange={e => setCustomerGSTIN(e.target.value.toUpperCase())} placeholder="15-digit GSTIN" />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Payment Method</label>
                                    <div className="flex gap-xs">
                                        {(['Cash', 'UPI'] as const).map(m => (
                                            <button key={m} className={`chip ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>{m}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Customer State */}
                            <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Customer State</label>
                                    <select className="form-input form-select" value={customerState} onChange={e => setCustomerState(e.target.value)}>
                                        <option value="">Same as business ({businessState || 'not set'})</option>
                                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Tax Mode</label>
                                    <div className="flex gap-xs">
                                        {(['exclusive', 'inclusive'] as const).map(m => (
                                            <button key={m} className={`chip ${taxMode === m ? 'active' : ''}`} onClick={() => setTaxMode(m)}>
                                                {m === 'exclusive' ? 'Exclusive' : 'Inclusive'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Auto GST indicator */}
                            {state.settings.gstEnabled && customerState && (
                                <div style={{
                                    padding: '6px 12px', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: 600,
                                    background: isInterState ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    color: isInterState ? 'var(--color-error)' : 'var(--color-success)',
                                }}>
                                    {isInterState ? `⚡ Inter-State (IGST ${gstRate}%) — ${businessState} → ${customerState}` : `✓ Intra-State (CGST ${gstRate / 2}% + SGST ${gstRate / 2}%) — ${customerState}`}
                                </div>
                            )}

                            {/* Product Search */}
                            <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                                <label className="form-label">⊕ Add Items from Inventory</label>
                                <input
                                    className="form-input"
                                    placeholder="Search product by name, SKU, or barcode..."
                                    value={productSearch}
                                    onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                                    onFocus={() => productSearch && setShowProductDropdown(true)}
                                />
                                {showProductDropdown && filteredProducts.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto',
                                    }}>
                                        {filteredProducts.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => addItem(p.id)}
                                                style={{
                                                    padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                                                    alignItems: 'center', borderBottom: '1px solid var(--color-border-light)',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-soft)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                                            >
                                                <span style={{ fontWeight: 500 }}>
                                                    {p.brand ? <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>[{p.brand}] </span> : ''}
                                                    {p.name}
                                                    {p.sku ? <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}> ({p.sku})</span> : ''}
                                                </span>
                                                <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 600 }}>{fmt(p.price)}</span>
                                                    <span style={{ fontSize: '0.75rem', color: p.stock > 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
                                                        {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                                                    </span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Items list */}
                            {items.length > 0 && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr><th>Item</th><th style={{ width: 70 }}>Qty</th><th style={{ width: 90 }}>Price</th><th style={{ width: 80 }}>GST %</th><th style={{ width: 90 }}>Total</th><th style={{ width: 40 }}></th></tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 500 }}>
                                                        {item.brand ? <span style={{ color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>{item.brand}</span> : ''}
                                                        {item.productName}
                                                    </td>
                                                    <td><input className="form-input" type="number" min={1} value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} style={{ padding: '4px 6px', width: 60 }} /></td>
                                                    <td><input className="form-input" type="number" min={0} step="0.01" value={item.price} onChange={e => updateItem(i, 'price', parseFloat(e.target.value) || 0)} style={{ padding: '4px 6px', width: 80 }} /></td>
                                                    <td>
                                                        <select className="form-input form-select" value={item.taxRate || 18} onChange={e => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setItems(items.map((it, idx) => idx === i ? { ...it, taxRate: val } : it));
                                                        }} style={{ padding: '4px 6px', width: 75, fontSize: '0.8rem' }}>
                                                            <option value="0">0%</option>
                                                            <option value="5">5%</option>
                                                            <option value="12">12%</option>
                                                            <option value="18">18%</option>
                                                            <option value="28">28%</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>{fmt(item.total)}</td>
                                                    <td><button className="btn btn-ghost btn-sm" onClick={() => removeItem(i)}><X size={14} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Discount and Paid Amount */}
                            <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Discount</label>
                                    <div className="flex gap-xs">
                                        <input className="form-input" type="number" min={0} step="0.01" placeholder="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)} style={{ flex: 1 }} />
                                        <button className={`chip ${discountType === 'percent' ? 'active' : ''}`} onClick={() => setDiscountType('percent')}>%</button>
                                        <button className={`chip ${discountType === 'flat' ? 'active' : ''}`} onClick={() => setDiscountType('flat')}>₹</button>
                                    </div>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Paid Amount</label>
                                    <input className="form-input" type="number" min={0} step="0.01" placeholder={grandTotal.toFixed(2)} value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Note</label>
                                <input className="form-input" placeholder="Optional note..." value={note} onChange={e => setNote(e.target.value)} />
                            </div>

                            {/* Summary */}
                            {items.length > 0 && (
                                <div style={{ background: 'var(--color-soft)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span>Subtotal</span><span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--color-success)' }}>
                                            <span>Discount ({discountType === 'percent' ? `${discountValue}%` : `₹${discountValue}`})</span><span>-{fmt(discountAmount)}</span>
                                        </div>
                                    )}
                                    {state.settings.taxType !== 'NON-GST' && !isComposition && taxGroups.map(group => (
                                        <React.Fragment key={group.rate}>
                                            {isInterState ? (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--color-text-secondary)' }}>
                                                    <span>IGST ({group.rate}%){taxMode === 'inclusive' ? ' (incl.)' : ''}</span><span>{fmt(group.igst)}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--color-text-secondary)' }}>
                                                        <span>CGST ({group.rate / 2}%){taxMode === 'inclusive' ? ' (incl.)' : ''}</span><span>{fmt(group.cgst)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--color-text-secondary)' }}>
                                                        <span>SGST ({group.rate / 2}%){taxMode === 'inclusive' ? ' (incl.)' : ''}</span><span>{fmt(group.sgst)}</span>
                                                    </div>
                                                </>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    {isComposition && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4, fontStyle: 'italic' }}>
                                            * Composition dealer: Tax not collected from customer.
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 4 }}>
                                        <span>Grand Total</span><span style={{ color: 'var(--color-primary)' }}>{fmt(grandTotal)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>📄 Invoice: {invoiceNumber}</span>
                            <div className="flex gap-sm">
                                <button className="btn btn-secondary" onClick={() => { resetForm(); setShowModal(false); }}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSubmit} disabled={items.length === 0}>
                                    <Plus size={16} />Add Sale
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Sale Modal */}
            {currentViewSale && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setViewSale(null); }}>
                    <div className="modal" style={{ maxWidth: 550 }}>
                        <div className="modal-header">
                            <h2>Sale Details — {currentViewSale.invoiceNumber || '—'}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setViewSale(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-2" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                <div><strong>Date:</strong> {currentViewSale.date}</div>
                                <div><strong>Customer:</strong> {currentViewSale.customerName || 'Walk-in'}</div>
                                <div><strong>Payment:</strong> {currentViewSale.paymentMethod}</div>
                                {currentViewSale.customerState && <div><strong>State:</strong> {currentViewSale.customerState}</div>}
                                {currentViewSale.taxMode && <div><strong>Tax Mode:</strong> {currentViewSale.taxMode === 'inclusive' ? 'Inclusive' : 'Exclusive'}</div>}
                            </div>

                            {currentViewSale.items && currentViewSale.items.length > 0 && (
                                <table className="data-table" style={{ marginBottom: '1rem' }}>
                                    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>GST %</th><th>Total</th></tr></thead>
                                    <tbody>
                                        {currentViewSale.items.map((item, i) => (
                                            <tr key={i}>
                                                <td>
                                                    {item.brand ? <span style={{ color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>{item.brand}</span> : ''}
                                                    {item.productName}
                                                </td>
                                                <td>{item.quantity}</td>
                                                <td>{fmt(item.price)}</td>
                                                <td>{item.taxRate !== undefined ? item.taxRate : 18}%</td>
                                                <td style={{ fontWeight: 600 }}>{fmt(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            <div style={{ background: 'var(--color-soft)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '0.85rem' }}>
                                {currentViewSale.subtotal && <div className="flex flex-between" style={{ marginBottom: 4 }}><span>Subtotal</span><span>{fmt(currentViewSale.subtotal)}</span></div>}
                                {currentViewSale.discountTotal ? <div className="flex flex-between" style={{ marginBottom: 4, color: 'var(--color-success)' }}><span>Discount</span><span>-{fmt(currentViewSale.discountTotal)}</span></div> : null}
                                {viewTaxGroups.map(group => (
                                    <React.Fragment key={group.rate}>
                                        {currentViewSale.igst ? (
                                            <div className="flex flex-between" style={{ marginBottom: 4 }}>
                                                <span>IGST ({group.rate}%){currentViewSale.taxMode === 'inclusive' ? ' (incl.)' : ''}</span>
                                                <span>{fmt(group.igst)}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex flex-between" style={{ marginBottom: 4 }}>
                                                    <span>CGST ({group.rate / 2}%){currentViewSale.taxMode === 'inclusive' ? ' (incl.)' : ''}</span>
                                                    <span>{fmt(group.cgst)}</span>
                                                </div>
                                                <div className="flex flex-between" style={{ marginBottom: 4 }}>
                                                    <span>SGST ({group.rate / 2}%){currentViewSale.taxMode === 'inclusive' ? ' (incl.)' : ''}</span>
                                                    <span>{fmt(group.sgst)}</span>
                                                </div>
                                            </>
                                        )}
                                    </React.Fragment>
                                ))}
                                <div className="flex flex-between" style={{ fontWeight: 700, borderTop: '1px solid var(--color-border)', paddingTop: 6, marginTop: 4 }}>
                                    <span>Total</span><span>{fmt(currentViewSale.totalAmount)}</span>
                                </div>
                                <div className="flex flex-between" style={{ marginTop: 4 }}>
                                    <span>Paid</span><span style={{ color: currentViewSale.paidAmount < currentViewSale.totalAmount ? 'var(--color-warning)' : 'var(--color-success)', fontWeight: 600 }}>{fmt(currentViewSale.paidAmount)}</span>
                                </div>
                                {currentViewSale.paidAmount < currentViewSale.totalAmount && (
                                    <div className="flex flex-between" style={{ marginTop: 4, color: 'var(--color-error)', fontWeight: 600 }}>
                                        <span>Balance Due</span><span>{fmt(currentViewSale.totalAmount - currentViewSale.paidAmount)}</span>
                                    </div>
                                )}
                            </div>

                            {currentViewSale.note && <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>📝 {currentViewSale.note}</p>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => handlePrint(currentViewSale.id)}>
                                <Printer size={16} />Print Invoice
                            </button>
                            <button className="btn btn-primary" onClick={() => setViewSale(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesScreen;
