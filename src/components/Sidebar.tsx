import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, Receipt, CreditCard,
    Package, FileBarChart, Settings, Users, ShoppingBag,
    Moon, Sun, TrendingUp, LogOut, UserCog,
    FileText, ClipboardList, Calendar
} from 'lucide-react';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';

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
    { path: '/user-manager', icon: UserCog, label: 'User Manager', ownerOnly: true },
    { section: 'Insights' },
    { path: '/reports', icon: FileBarChart, label: 'Reports' },
];

const Sidebar: React.FC = () => {
    const { isDark, toggleTheme } = useTheme();
    const { auth, logout, canManageUsers } = useAuth();
    const location = useLocation();

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

            <nav className="sidebar-nav">
                {navItems.map((item, i) => {
                    if ('section' in item && !('path' in item)) {
                        return <div key={i} className="sidebar-section-label">{item.section}</div>;
                    }
                    if (!('path' in item)) return null;
                    // Hide owner-only items for non-owners
                    if ('ownerOnly' in item && item.ownerOnly && !canManageUsers) return null;
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
