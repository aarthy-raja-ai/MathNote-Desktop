import React, { useState } from 'react';
import { Users, Plus, Trash2, Edit, X, Shield, ShieldCheck, ShieldAlert, User as UserIcon } from 'lucide-react';
import { useAuth, getDefaultPermissions } from '../context/AuthContext';
import { UserRole, UserPermissions } from '../utils/storage';

const PERMISSION_TABS = [
    { id: 'sales', label: 'Sale', keys: [{ id: 'sales' as keyof UserPermissions, label: 'Sales & Customers' }] },
    { id: 'purchases', label: 'Purchase', keys: [{ id: 'purchases' as keyof UserPermissions, label: 'Purchases & Vendors' }] },
    { id: 'inventory', label: 'Inventory', keys: [{ id: 'inventory' as keyof UserPermissions, label: 'Inventory & Products' }] },
    { id: 'staff', label: 'Staff', keys: [{ id: 'staff' as keyof UserPermissions, label: 'Staff & Users' }] },
    { id: 'account', label: 'Account', keys: [{ id: 'expenses' as keyof UserPermissions, label: 'Expenses' }, { id: 'credits' as keyof UserPermissions, label: 'Credits' }] },
    { id: 'reports', label: 'Report', keys: [{ id: 'reports' as keyof UserPermissions, label: 'Reports & Analytics' }] },
    { id: 'settings', label: 'Settings', keys: [{ id: 'settings' as keyof UserPermissions, label: 'Settings & Backups' }] },
];

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
    const [modalTab, setModalTab] = useState<'user' | 'rights'>('user');
    const [activeRightTab, setActiveRightTab] = useState('sales');
    const [form, setForm] = useState({
        name: '',
        username: '',
        password: '',
        role: 'staff' as UserRole,
        permissions: getDefaultPermissions('staff')
    });

    const resetForm = () => {
        setForm({
            name: '',
            username: '',
            password: '',
            role: 'staff',
            permissions: getDefaultPermissions('staff')
        });
        setModalTab('user');
        setEditId(null);
        setError('');
    };

    const openAdd = () => {
        resetForm();
        setShowModal(true);
    };

    const openEdit = (user: typeof auth.users[0]) => {
        setEditId(user.id);
        setForm({
            name: user.name,
            username: user.username,
            password: '',
            role: user.role,
            permissions: user.permissions || getDefaultPermissions(user.role)
        });
        setModalTab('user');
        setError('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Name is required'); return; }
        if (!form.username.trim()) { setError('Username is required'); return; }
        if (form.username.trim().length < 3) { setError('Username must be at least 3 characters'); return; }
        if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) { setError('Username can only contain letters, numbers, and underscores'); return; }

        if (editId) {
            const updates: Record<string, any> = {
                name: form.name,
                username: form.username,
                role: form.role,
                permissions: form.permissions
            };
            if (form.password) {
                if (form.password.length < 4) { setError('Password must be at least 4 characters'); return; }
                updates.password = form.password;
            }
            const success = await updateUser(editId, updates);
            if (!success) { setError('Username already taken'); return; }
        } else {
            if (!form.password) { setError('Password is required'); return; }
            if (form.password.length < 4) { setError('Password must be at least 4 characters'); return; }
            const success = await addUser(form.name, form.username, form.password, form.role, form.permissions);
            if (!success) { setError('Username already taken'); return; }
        }
        setShowModal(false);
        resetForm();
    };

    const handleRoleChange = (newRole: UserRole) => {
        setForm({
            ...form,
            role: newRole,
            permissions: getDefaultPermissions(newRole)
        });
    };

    const handleTogglePermission = (key: keyof UserPermissions, action: 'view' | 'add' | 'modify' | 'delete') => {
        const updated = { ...form.permissions };
        updated[key] = { ...updated[key], [action]: !updated[key][action] };
        setForm({ ...form, permissions: updated });
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
                    <div className="modal" style={{ width: '820px', maxWidth: '95vw', height: '580px', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                            <h2>{editId ? 'Edit User' : 'Add User'}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        
                        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                            {/* Modal Sidebar */}
                            <div style={{ width: '180px', borderRight: '1px solid var(--color-border)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--color-bg-secondary)' }}>
                                <button className={`btn ${modalTab === 'user' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setModalTab('user')} style={{ justifyContent: 'flex-start', width: '100%', padding: '8px 12px' }}>
                                    <UserIcon size={16} style={{ marginRight: 8 }} /> Manage User
                                </button>
                                <button className={`btn ${modalTab === 'rights' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setModalTab('rights')} style={{ justifyContent: 'flex-start', width: '100%', padding: '8px 12px' }}>
                                    <Shield size={16} style={{ marginRight: 8 }} /> Access Rights
                                </button>
                            </div>

                            {/* Modal Tab Content Area */}
                            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                {modalTab === 'user' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                                                        onClick={() => handleRoleChange(r.value)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                                    >
                                                        {r.icon} {r.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {error && <div className="auth-error" style={{ marginTop: '0.5rem' }}>{error}</div>}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        {form.role === 'owner' ? (
                                            <div style={{ padding: '1rem', backgroundColor: '#e2f0d9', color: '#385723', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                                Note : Admin/Owner role will override these settings and get full access
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                                {/* Access tabs bar */}
                                                <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '4px' }}>
                                                    {PERMISSION_TABS.map(tab => (
                                                        <button
                                                            key={tab.id}
                                                            className={`btn ${activeRightTab === tab.id ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}`}
                                                            onClick={() => setActiveRightTab(tab.id)}
                                                            style={{ padding: '4px 10px', height: '28px', fontSize: '0.8rem' }}
                                                        >
                                                            {tab.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Rights table */}
                                                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr>
                                                            <th>Name</th>
                                                            <th style={{ width: 80, textAlign: 'center' }}>View</th>
                                                            <th style={{ width: 80, textAlign: 'center' }}>Add</th>
                                                            <th style={{ width: 80, textAlign: 'center' }}>Modify</th>
                                                            <th style={{ width: 80, textAlign: 'center' }}>Delete</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {PERMISSION_TABS.find(t => t.id === activeRightTab)?.keys.map(key => {
                                                            const perm = form.permissions[key.id] || { view: false, add: false, modify: false, delete: false };
                                                            return (
                                                                <tr key={key.id}>
                                                                    <td style={{ fontWeight: 600 }}>{key.label}</td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <input type="checkbox" checked={perm.view} onChange={() => handleTogglePermission(key.id, 'view')} />
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <input type="checkbox" checked={perm.add} onChange={() => handleTogglePermission(key.id, 'add')} />
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <input type="checkbox" checked={perm.modify} onChange={() => handleTogglePermission(key.id, 'modify')} />
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <input type="checkbox" checked={perm.delete} onChange={() => handleTogglePermission(key.id, 'delete')} />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)' }}>
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
