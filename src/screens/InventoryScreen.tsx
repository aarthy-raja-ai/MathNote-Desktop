import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Package, Plus, Search, Trash2, Edit, X, AlertTriangle, BarChart3, TrendingDown, DollarSign, ShoppingBag } from 'lucide-react';
import { useApp } from '../context';

const InventoryScreen: React.FC = () => {
    const { state, addProduct, updateProduct, deleteProduct, selectedCompanyId } = useApp();
    const location = useLocation();
    const navigate = useNavigate();
    const currency = state.settings.currency || '₹';
    const fmt = (n: number) => `${currency}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const [showModal, setShowModal] = useState(false);
    const [extraBarcodes, setExtraBarcodes] = useState<string[]>([]);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [editId, setEditId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [form, setForm] = useState({ category: '', brand: '', name: '', price: '', costPrice: '', stock: '', sku: '', barcode: '', unit: 'pcs', lowStockThreshold: '5', taxRate: '18' });

    const filtered = useMemo(() => {
        let list = [...state.products].filter(p => (p.companyId || 'default') === selectedCompanyId);
        if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.toLowerCase().includes(search.toLowerCase()) || p.barcodes?.some(b => b.toLowerCase().includes(search.toLowerCase())));
        if (filterCategory !== 'all') list = list.filter(p => (p.category || 'Uncategorized') === filterCategory);
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [state.products, search, filterCategory, selectedCompanyId]);

    const categories = useMemo(() => {
        const cats = new Set(state.products.filter(p => (p.companyId || 'default') === selectedCompanyId).map(p => p.category || 'Uncategorized'));
        return ['all', ...Array.from(cats).sort()];
    }, [state.products, selectedCompanyId]);

    // Summary stats
    const companyProducts = useMemo(() => state.products.filter(p => (p.companyId || 'default') === selectedCompanyId), [state.products, selectedCompanyId]);
    const lowStock = companyProducts.filter(p => p.stock <= (p.lowStockThreshold || 5));
    const outOfStock = companyProducts.filter(p => p.stock === 0);
    const totalSellingValue = companyProducts.reduce((s, p) => s + p.price * p.stock, 0);
    const totalCostValue = companyProducts.reduce((s, p) => s + (p.costPrice || 0) * p.stock, 0);
    const totalItems = companyProducts.reduce((s, p) => s + p.stock, 0);
    const potentialProfit = totalSellingValue - totalCostValue;

    const openEdit = (p: typeof state.products[0]) => {
        setEditId(p.id);
        setForm({
            category: p.category || '',
            brand: p.brand || '',
            name: p.name,
            price: String(p.price ?? ''),
            costPrice: String(p.costPrice || ''),
            stock: String(p.stock ?? ''),
            sku: p.sku || '',
            barcode: p.barcode || '',
            unit: p.unit || 'pcs',
            lowStockThreshold: String(p.lowStockThreshold || 5),
            taxRate: String(p.taxRate !== undefined ? p.taxRate : 18)
        });
        setExtraBarcodes(p.barcodes || []);
        setBarcodeInput('');
        setShowModal(true);
    };

    const handleSave = async () => {
        const price = parseFloat(form.price);
        const stock = parseInt(form.stock);
        const taxRate = parseFloat(form.taxRate);
        if (!form.name || isNaN(price)) return;
        const data = {
            category: form.category,
            brand: form.brand,
            name: form.name,
            price,
            costPrice: parseFloat(form.costPrice) || 0,
            stock: isNaN(stock) ? 0 : stock,
            sku: form.sku,
            barcode: form.barcode,
            barcodes: extraBarcodes.filter(b => b.trim()),
            unit: form.unit,
            lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
            taxRate: isNaN(taxRate) ? 18 : taxRate
        };
        if (editId) { await updateProduct(editId, data); } else { await addProduct(data); }
        setForm({ category: '', brand: '', name: '', price: '', costPrice: '', stock: '', sku: '', barcode: '', unit: 'pcs', lowStockThreshold: '5', taxRate: '18' });
        setExtraBarcodes([]);
        setBarcodeInput('');
        setEditId(null);
        setShowModal(false);
    };

    const openAddNew = () => {
        setEditId(null);
        setForm({ category: '', brand: '', name: '', price: '', costPrice: '', stock: '', sku: '', barcode: '', unit: 'pcs', lowStockThreshold: '5', taxRate: '18' });
        setExtraBarcodes([]);
        setBarcodeInput('');
        setShowModal(true);
    };

    useEffect(() => {
        if (location.state) {
            const { barcode, productId, search: stateSearch } = location.state;
            window.history.replaceState(null, '');

            if (stateSearch) {
                setSearch(stateSearch);
            } else if (barcode) {
                setEditId(null);
                setForm({
                    category: '',
                    brand: '',
                    name: '',
                    price: '',
                    costPrice: '',
                    stock: '',
                    sku: '',
                    barcode: barcode,
                    unit: 'pcs',
                    lowStockThreshold: '5',
                    taxRate: '18'
                });
                setShowModal(true);
            } else if (productId) {
                const product = state.products.find(p => p.id === productId);
                if (product) {
                    openEdit(product);
                }
            }
        }
    }, [location.state, state.products]);

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Inventory</h1>
                    <p>{state.products.length} products · {totalItems} total items in stock</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/purchases', { state: { openAddModal: true } })} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShoppingBag size={18} />Record Purchase
                    </button>
                    <button className="btn btn-primary" onClick={openAddNew}><Plus size={18} />Add Product</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <DollarSign size={16} color="var(--color-primary)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Selling Value</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{fmt(totalSellingValue)}</div>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <BarChart3 size={16} color="var(--color-info, #3b82f6)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost Value</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{fmt(totalCostValue)}</div>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <TrendingDown size={16} color="var(--color-success)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Potential Profit</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: potentialProfit >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{fmt(potentialProfit)}</div>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <AlertTriangle size={16} color="var(--color-error)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alerts</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                        {lowStock.length > 0 ? <span style={{ color: 'var(--color-warning)' }}>{lowStock.length} low</span> : '0 low'}
                        {outOfStock.length > 0 && <span style={{ color: 'var(--color-error)', marginLeft: 8 }}>{outOfStock.length} out</span>}
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStock.length > 0 && (
                <div className="card" style={{ marginBottom: '1rem', background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                        <AlertTriangle size={18} color="var(--color-error)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-error)', fontWeight: 500 }}>
                            {lowStock.length} product(s) low on stock: {lowStock.map(p => `${p.name} (${p.stock})`).join(', ')}
                        </span>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-md" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div className="search-box" style={{ flex: 1, maxWidth: 400 }}>
                    <Search className="search-icon" />
                    <input className="form-input" placeholder="Search by name, SKU, or barcode..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                </div>
                {categories.length > 2 && (
                    <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                        {categories.map(cat => (
                            <button key={cat} className={`chip ${filterCategory === cat ? 'active' : ''}`} onClick={() => setFilterCategory(cat)} style={{ fontSize: '0.8rem' }}>
                                {cat === 'all' ? 'All' : cat}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {filtered.length > 0 ? (
                    <table className="data-table">
                        <thead><tr><th>Category</th><th>Brand</th><th>Name</th><th>SKU</th><th>Barcode</th><th>Selling Price</th><th>Cost Price</th><th>Stock</th><th>GST %</th><th style={{ width: 100 }}>Actions</th></tr></thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id}>
                                    <td>{p.category ? <span className="badge badge-primary">{p.category}</span> : '—'}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{p.brand || '—'}</td>
                                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                                    <td style={{ color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku || '—'}</td>
                                    <td style={{ color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                        {p.barcode || '—'}
                                        {p.barcodes && p.barcodes.length > 0 && <span style={{ marginLeft: 4, color: 'var(--color-primary)', fontSize: '0.7rem' }}>+{p.barcodes.length}</span>}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{fmt(p.price)}</td>
                                    <td style={{ color: 'var(--color-text-secondary)' }}>{p.costPrice ? fmt(p.costPrice) : '—'}</td>
                                    <td>
                                        <span className={`badge ${p.stock === 0 ? 'badge-error' : p.stock <= (p.lowStockThreshold || 5) ? 'badge-warning' : 'badge-success'}`}>
                                            {p.stock} {p.unit || 'pcs'}
                                        </span>
                                    </td>
                                    <td><span className="badge badge-secondary">{p.taxRate !== undefined ? p.taxRate : 18}%</span></td>
                                    <td>{p.unit || 'pcs'}</td>
                                    <td>
                                        <div className="flex gap-xs">
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Edit size={15} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete this product?')) deleteProduct(p.id); }}><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state"><Package size={48} /><h3>No products yet</h3><p>Add products to track inventory</p></div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editId ? 'Edit Product' : 'Add Product'}</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <input className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Footwear, Mattress" />
                            </div>
                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">Brand</label>
                                    <input className="form-input" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Walkaroo, Duroflex" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Product Name / Model *</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 1030, Spring Mattress" />
                                </div>
                            </div>
                            <div className="grid grid-3">
                                <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="e.g. PRD-001" /></div>
                                <div className="form-group">
                                    <label className="form-label">Barcodes</label>
                                    <input className="form-input" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="Primary barcode" />
                                    {/* Extra barcodes chips */}
                                    {extraBarcodes.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                                            {extraBarcodes.map((bc, idx) => (
                                                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--color-soft)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '2px 8px', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                                                    {bc}
                                                    <button type="button" onClick={() => setExtraBarcodes(extraBarcodes.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: 0, lineHeight: 1, fontSize: '0.9rem' }}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {/* Add barcode row */}
                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                                        <input className="form-input" style={{ flex: 1, fontSize: '0.85rem' }} value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && barcodeInput.trim()) { setExtraBarcodes([...extraBarcodes, barcodeInput.trim()]); setBarcodeInput(''); }}} placeholder="Add another barcode & press Enter" />
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (barcodeInput.trim()) { setExtraBarcodes([...extraBarcodes, barcodeInput.trim()]); setBarcodeInput(''); }}} style={{ whiteSpace: 'nowrap' }}>+ Add</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">GST Tax Rate (%)</label>
                                    <select className="form-input form-select" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })}>
                                        <option value="0">0% (Exempt)</option>
                                        <option value="5">5% GST</option>
                                        <option value="12">12% GST</option>
                                        <option value="18">18% GST</option>
                                        <option value="28">28% GST</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-2">
                                <div className="form-group"><label className="form-label">Selling Price *</label><input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Cost Price</label><input className="form-input" type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} /></div>
                            </div>
                            <div className="grid grid-3">
                                <div className="form-group"><label className="form-label">Stock</label><input className="form-input" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Unit</label><input className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="pcs" /></div>
                                <div className="form-group"><label className="form-label">Low Stock Alert</label><input className="form-input" type="number" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: e.target.value })} /></div>
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>{editId ? 'Save Changes' : 'Add Product'}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryScreen;
