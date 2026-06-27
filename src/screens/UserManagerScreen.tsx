import React, { useState } from 'react';
import { Users, Plus, Trash2, Edit, X, Shield, ShieldCheck, ShieldAlert, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../utils/storage';

const ROLES: { value: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'owner', label: 'Owner', icon: <ShieldAlert size={16} />, desc: 'Full access — can manage users, settings, and all data' },
    { value: 'manager', label: 'Manager', icon: <ShieldCheck size={16} />, desc: 'Can view reports and delete records' },
    { value: 'staff', label: 'Staff', icon: <Shield size={16} />, desc: 'Basic access — can add sales, expenses, and purchases' },
];

const UserManagerScreen: React.FC = () => {
    const { auth, addUser, updateUser, deleteUser, canManageUsers } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', username: '', password: '', role: 'staff' as UserRole });

    const resetForm = () => {
        setForm({ name: '', username: '', password: '', role: 'staff' });
        setEditId(null);
        setError('');
    };

    const openAdd = () => {
        resetForm();
        setShowModal(true);
    };

    const openEdit = (user: typeof auth.users[0]) => {
        setEditId(user.id);
        setForm({ name: user.name, username: user.username, password: '', role: user.role });
        setError('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Name is required'); return; }
        if (!form.username.trim()) { setError('Username is required'); return; }
        if (form.username.trim().length < 3) { setError('Username must be at least 3 characters'); return; }
        if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) { setError('Username can only contain letters, numbers, and underscores'); return; }

        if (editId) {
            const updates: Record<string, string> = { name: form.name, username: form.username, role: form.role };
            if (form.password) {
                if (form.password.length < 4) { setError('Password must be at least 4 characters'); return; }
                updates.password = form.password;
            }
            const success = await updateUser(editId, updates);
            if (!success) { setError('Username already taken'); return; }
        } else {
            if (!form.password) { setError('Password is required'); return; }
            if (form.password.length < 4) { setError('Password must be at least 4 characters'); return; }
            const success = await addUser(form.name, form.username, form.password, form.role);
            if (!success) { setError('Username already taken'); return; }
        }
        setShowModal(false);
        resetForm();
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this user?')) {
            const success = deleteUser(id);
            if (!success) alert('Cannot delete the last owner account.');
        }
    };

    const getRoleBadge = (role: UserRole) => {
        const colors: Record<UserRole, string> = { owner: 'badge-error', manager: 'badge-warning', staff: 'badge-primary' };
        return <span className={`badge ${colors[role]}`}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>;
    };

    if (!canManageUsers) {
        return (
            <div className="animate-in">
                <div className="page-header"><div><h1>User Management</h1></div></div>
                <div className="card"><div className="empty-state"><Shield size={48} /><h3>Access Denied</h3><p>Only owners can manage users</p></div></div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>User Management</h1>
                    <p>{auth.users.length} user{auth.users.length !== 1 ? 's' : ''} registered</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    <Plus size={18} />Add User
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Created</th>
                            <th>Status</th>
                            <th style={{ width: 100 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {auth.users.map(user => (
                            <tr key={user.id}>
                                <td style={{ fontWeight: 500 }}>
                                    <div className="flex gap-xs" style={{ alignItems: 'center' }}>
                                        <UserIcon size={16} />
                                        {user.name}
                                    </div>
                                </td>
                                <td style={{ fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>@{user.username}</td>
                                <td>{getRoleBadge(user.role)}</td>
                                <td style={{ color: 'var(--color-text-secondary)' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td>
                                    {auth.currentUser?.id === user.id ? (
                                        <span className="badge badge-success">Active</span>
                                    ) : (
                                        <span className="badge" style={{ opacity: 0.5 }}>Offline</span>
                                    )}
                                </td>
                                <td>
                                    <div className="flex gap-xs">
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(user)} title="Edit"><Edit size={15} /></button>
                                        {auth.currentUser?.id !== user.id && (
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user.id)} title="Delete"><Trash2 size={15} /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Role Legend */}
            <div className="card" style={{ marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>Role Permissions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    {ROLES.map(r => (
                        <div key={r.value} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <div style={{ color: 'var(--color-primary)', marginTop: 2 }}>{r.icon}</div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.label}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{r.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editId ? 'Edit User' : 'Add User'}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input className="form-input" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setError(''); }} placeholder="e.g. Ravi Kumar" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Username *</label>
                                <input className="form-input" value={form.username} onChange={e => { setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) }); setError(''); }} placeholder="e.g. ravi_staff" autoComplete="off" />
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'block' }}>Letters, numbers, and underscores only</span>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password {editId ? '(leave blank to keep current)' : '*'}</label>
                                <input className="form-input" type="password" value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }} placeholder={editId ? 'Leave blank to keep unchanged' : 'At least 4 characters'} autoComplete="new-password" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Role *</label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {ROLES.map(r => (
                                        <button
                                            key={r.value}
                                            className={`chip ${form.role === r.value ? 'active' : ''}`}
                                            onClick={() => setForm({ ...form, role: r.value })}
                                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                            {r.icon} {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {error && <div className="auth-error" style={{ marginTop: '0.5rem' }}>{error}</div>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Save Changes' : 'Add User'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagerScreen;
