import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, Receipt, CreditCard,
    Package, FileBarChart, Settings, Users, ShoppingBag,
    Moon, Sun, TrendingUp, LogOut, UserCog,
    FileText, ClipboardList, Calendar, Building
} from 'lucide-react';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

const navItems = [
    { section: 'Overview' },
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { section: 'Business' },
    { path: '/sales', icon: ShoppingCart, label: 'Sales' },
    { path: '/returns', icon: Receipt, label: 'Returns' },
    { path: '/quotations', icon: FileText, label: 'Quotations' },
    { path: '/expenses', icon: Receipt, label: 'Expenses' },
    { path: '/credits', icon: CreditCard, label: 'Credits' },
    { path: '/purchases', icon: ShoppingBag, label: 'Purchases' },
    { path: '/purchase-orders', icon: ClipboardList, label: 'Purchase Orders' },
    { section: 'Manage' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/contacts', icon: Users, label: 'Contacts' },
    { path: '/attendance', icon: Calendar, label: 'Attendance' },
    { path: '/companies', icon: Building, label: 'Companies', ownerOnly: true },
    { path: '/user-manager', icon: UserCog, label: 'User Manager', ownerOnly: true },
    { section: 'Insights' },
    { path: '/reports', icon: FileBarChart, label: 'Reports' },
];

const Sidebar: React.FC = () => {
    const { isDark, toggleTheme } = useTheme();
    const { auth, logout, canManageUsers, hasPermission } = useAuth();
    const { selectedFY, setSelectedFY, availableFYs, selectedCompanyId, setSelectedCompanyId, state: { companies } } = useApp();
    const location = useLocation();

    const isPathVisible = (path: string | undefined): boolean => {
        if (!path) return false;
        if (!auth.currentUser) return false;
        if (auth.currentUser.role === 'owner') return true;
        
        switch (path) {
            case '/':
                return true;
            case '/sales':
            case '/returns':
            case '/quotations':
                return hasPermission('sales', 'view');
            case '/expenses':
                return hasPermission('expenses', 'view');
            case '/credits':
                return hasPermission('credits', 'view');
            case '/purchases':
            case '/purchase-orders':
                return hasPermission('purchases', 'view');
            case '/inventory':
                return hasPermission('inventory', 'view');
            case '/contacts':
                return hasPermission('sales', 'view') || hasPermission('purchases', 'view');
            case '/attendance':
                return hasPermission('staff', 'view');
            case '/companies':
                return hasPermission('settings', 'view');
            case '/user-manager':
                return hasPermission('staff', 'view');
            case '/reports':
                return hasPermission('reports', 'view');
            default:
                return true;
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <TrendingUp size={20} />
                </div>
                <div className="sidebar-brand">
                    <h1>MathNote</h1>
                    <p>Every Number. Clearly Noted.</p>
                </div>
            </div>

            {/* Current User Info */}
            {auth.currentUser && (
                <div style={{
                    padding: '0.5rem 1rem',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: '0.8rem',
                }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{auth.currentUser.name}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                        @{auth.currentUser.username} · {auth.currentUser.role.charAt(0).toUpperCase() + auth.currentUser.role.slice(1)}
                    </div>
                </div>
            )}

            {/* Company & Financial Year Switchers */}
            <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
            }}>
                {/* Company Switcher */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Active Company</label>
                    <select
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.4rem 0.5rem',
                            borderRadius: '4px',
                            background: 'var(--color-bg-light)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <option value="default">Default Company</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Financial Year Switcher */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Financial Year</label>
                    <select
                        value={selectedFY}
                        onChange={(e) => setSelectedFY(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.4rem 0.5rem',
                            borderRadius: '4px',
                            background: 'var(--color-bg-light)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {availableFYs.map(fy => (
                            <option key={fy} value={fy}>FY {fy}</option>
                        ))}
                    </select>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item, i) => {
                    if ('section' in item && !('path' in item)) {
                        return <div key={i} className="sidebar-section-label">{item.section}</div>;
                    }
                    if (!('path' in item)) return null;
                    if (!isPathVisible(item.path)) return null;
                    const Icon = item.icon!;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path!}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            end={item.path === '/'}
                        >
                            <Icon className="sidebar-icon" size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <NavLink
                    to="/settings"
                    className={`sidebar-link ${location.pathname === '/settings' ? 'active' : ''}`}
                >
                    <Settings className="sidebar-icon" size={20} />
                    <span>Settings</span>
                </NavLink>
                <button className="sidebar-link" onClick={toggleTheme}>
                    {isDark ? <Sun className="sidebar-icon" size={20} /> : <Moon className="sidebar-icon" size={20} />}
                    <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button className="sidebar-link" onClick={logout} style={{ color: 'var(--color-error)' }}>
                    <LogOut className="sidebar-icon" size={20} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
