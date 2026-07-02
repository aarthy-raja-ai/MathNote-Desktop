import React, { useState, useMemo } from 'react';
import { Users, Plus, Search, Trash2, Edit, X, Phone, Mail } from 'lucide-react';
import { useApp } from '../context';

const ContactsScreen: React.FC = () => {
    const { state, addContact, updateContact, deleteContact, selectedCompanyId } = useApp();
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', type: 'customer' as 'customer' | 'vendor' | 'both' | 'staff' | 'employee' | 'other' });

    const filtered = useMemo(() => {
        let list = [...state.contacts].filter(c => (c.companyId || 'default') === selectedCompanyId);
        if (search) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
        if (filterType !== 'all') list = list.filter(c => c.type === filterType);
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [state.contacts, search, filterType, selectedCompanyId]);

    const openEdit = (c: typeof state.contacts[0]) => {
        setEditId(c.id);
        setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', type: c.type });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name) return;
        if (editId) { await updateContact(editId, form); } else { await addContact(form); }
        setForm({ name: '', phone: '', email: '', address: '', type: 'customer' }); setEditId(null); setShowModal(false);
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <div><h1>Contacts</h1><p>{filtered.length} contacts</p></div>
                <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ name: '', phone: '', email: '', address: '', type: 'customer' }); setShowModal(true); }}><Plus size={18} />Add Contact</button>
            </div>

            <div className="flex gap-md" style={{ marginBottom: '1rem' }}>
                <div className="search-box" style={{ flex: 1, maxWidth: 400 }}><Search className="search-icon" /><input className="form-input" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} /></div>
                <div className="flex gap-xs">
                    {[{ v: 'all', l: 'All' }, { v: 'customer', l: 'Customers' }, { v: 'vendor', l: 'Vendors' }, { v: 'both', l: 'Both' }, { v: 'staff', l: 'Staff' }, { v: 'employee', l: 'Employee' }].map(m => (
                        <button key={m.v} className={`chip ${filterType === m.v ? 'active' : ''}`} onClick={() => setFilterType(m.v)}>{m.l}</button>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {filtered.length > 0 ? (
                    <table className="data-table">
                        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Type</th><th>Address</th><th style={{ width: 100 }}>Actions</th></tr></thead>
                        <tbody>
                            {filtered.map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                                    <td>{c.phone ? <span className="flex gap-xs" style={{ alignItems: 'center' }}><Phone size={14} color="var(--color-text-muted)" />{c.phone}</span> : '—'}</td>
                                    <td>{c.email ? <span className="flex gap-xs" style={{ alignItems: 'center' }}><Mail size={14} color="var(--color-text-muted)" />{c.email}</span> : '—'}</td>
                                    <td><span className={`badge ${c.type === 'customer' ? 'badge-primary' : c.type === 'vendor' ? 'badge-warning' : c.type === 'staff' || c.type === 'employee' ? 'badge-info' : 'badge-success'}`}>{c.type}</span></td>
                                    <td style={{ color: 'var(--color-text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address || '—'}</td>
                                    <td><div className="flex gap-xs"><button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><Edit size={15} /></button><button className="btn btn-danger btn-sm" onClick={() => deleteContact(c.id)}><Trash2 size={15} /></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state"><Users size={48} /><h3>No contacts yet</h3><p>Add customers and vendors</p></div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editId ? 'Edit Contact' : 'Add Contact'}</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="grid grid-2">
                                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Type</label><div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>{(['customer', 'vendor', 'both', 'staff', 'employee', 'other'] as const).map(t => <button key={t} className={`chip ${form.type === t ? 'active' : ''}`} onClick={() => setForm({ ...form, type: t })}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}</div></div>
                            <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>{editId ? 'Save' : 'Add Contact'}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactsScreen;
