import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, Building, AlertCircle } from 'lucide-react';
import { Company } from '../utils/storage';

const CompanyManagerScreen: React.FC = () => {
    const { state: { companies }, addCompany, updateCompany, deleteCompany, selectedCompanyId, setSelectedCompanyId } = useApp();
    const [name, setName] = useState('');
    const [gstin, setGstin] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Company name is required.');
            return;
        }

        try {
            if (editingId) {
                await updateCompany(editingId, {
                    name: name.trim(),
                    gstin: gstin.trim() || undefined,
                    address: address.trim() || undefined,
                    phone: phone.trim() || undefined,
                });
                setEditingId(null);
            } else {
                await addCompany({
                    name: name.trim(),
                    gstin: gstin.trim() || undefined,
                    address: address.trim() || undefined,
                    phone: phone.trim() || undefined,
                });
            }
            resetForm();
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        }
    };

    const handleEdit = (company: Company) => {
        setEditingId(company.id);
        setName(company.name);
        setGstin(company.gstin || '');
        setAddress(company.address || '');
        setPhone(company.phone || '');
        setError('');
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this company? All items tagged with this company will lose their partition.')) {
            await deleteCompany(id);
        }
    };

    const resetForm = () => {
        setName('');
        setGstin('');
        setAddress('');
        setPhone('');
        setEditingId(null);
        setError('');
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--color-text)' }}>
                        <Building size={28} />
                        Company Manager
                    </h1>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Manage multi-company profiles and partitions.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Form Section */}
                <div style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    height: 'fit-content'
                }}>
                    <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', color: 'var(--color-text)' }}>
                        {editingId ? 'Edit Company' : 'Add New Company'}
                    </h2>
                    
                    {error && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid var(--color-error)',
                            borderRadius: '6px',
                            color: 'var(--color-error)',
                            fontSize: '0.85rem',
                            marginBottom: '1rem'
                        }}>
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Company Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter company name"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>GSTIN</label>
                            <input
                                type="text"
                                className="form-input"
                                value={gstin}
                                onChange={(e) => setGstin(e.target.value)}
                                placeholder="e.g. 22AAAAA0000A1Z5"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Phone</label>
                            <input
                                type="text"
                                className="form-input"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter contact phone"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Address</label>
                            <textarea
                                className="form-input"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter office address"
                                rows={3}
                                style={{ width: '100%', resize: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <Plus size={16} />
                                {editingId ? 'Save Changes' : 'Create Company'}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={resetForm}
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List Section */}
                <div style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '1.5rem'
                }}>
                    <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', color: 'var(--color-text)' }}>
                        Registered Companies
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Default Company display */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem',
                            borderRadius: '6px',
                            background: selectedCompanyId === 'default' ? 'var(--color-bg-light)' : 'transparent',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text)' }}>Default Company</h3>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    System default workspace for unassigned transactions.
                                </p>
                            </div>
                            <div>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedCompanyId('default')}
                                    disabled={selectedCompanyId === 'default'}
                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                >
                                    {selectedCompanyId === 'default' ? 'Active' : 'Switch To'}
                                </button>
                            </div>
                        </div>

                        {/* List other companies */}
                        {companies.map((c) => (
                            <div key={c.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                borderRadius: '6px',
                                background: selectedCompanyId === c.id ? 'var(--color-bg-light)' : 'transparent',
                                border: '1px solid var(--color-border)'
                            }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text)' }}>{c.name}</h3>
                                    {(c.phone || c.gstin) && (
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            {c.phone && `Phone: ${c.phone}`}
                                            {c.phone && c.gstin && ' · '}
                                            {c.gstin && `GSTIN: ${c.gstin}`}
                                        </p>
                                    )}
                                    {c.address && (
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            Address: {c.address}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setSelectedCompanyId(c.id)}
                                        disabled={selectedCompanyId === c.id}
                                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                    >
                                        {selectedCompanyId === c.id ? 'Active' : 'Switch To'}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(c)}
                                        style={{
                                            padding: '0.4rem',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-text-muted)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                        title="Edit Company"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(c.id)}
                                        style={{
                                            padding: '0.4rem',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-error)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                        title="Delete Company"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {companies.length === 0 && (
                            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', margin: '1rem 0' }}>
                                No custom companies created.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyManagerScreen;
