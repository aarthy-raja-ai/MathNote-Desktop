import React, { Suspense, lazy, useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './theme/ThemeContext';
import Sidebar from './components/Sidebar';
import LoginScreen from './screens/LoginScreen';
import BusinessProfileScreen from './screens/BusinessProfileScreen';
import { performAutoBackup } from './utils/backupService';

// Simple Error Boundary to catch renderer crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Renderer Crash Caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', background: '#0F172A', color: '#F87171', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', fontFamily: 'sans-serif' }}>
                    <h2 style={{ marginBottom: '1rem' }}>Something went wrong.</h2>
                    <pre style={{ background: '#1E293B', padding: '1rem', borderRadius: '8px', overflow: 'auto', maxWidth: '80%', color: '#F1F5F9', fontSize: '14px' }}>
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', background: '#6366F1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Reload Application
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const Dashboard = lazy(() => import('./screens/DashboardScreen'));
const Sales = lazy(() => import('./screens/SalesScreen'));
const Expenses = lazy(() => import('./screens/ExpensesScreen'));
const Credits = lazy(() => import('./screens/CreditsScreen'));
const Inventory = lazy(() => import('./screens/InventoryScreen'));
const Reports = lazy(() => import('./screens/ReportsScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const Contacts = lazy(() => import('./screens/ContactsScreen'));
const Purchases = lazy(() => import('./screens/PurchasesScreen'));
const UserManager = lazy(() => import('./screens/UserManagerScreen'));
const Quotations = lazy(() => import('./screens/QuotationScreen'));
const PurchaseOrders = lazy(() => import('./screens/PurchaseOrderScreen'));
const Attendance = lazy(() => import('./screens/AttendanceScreen'));
const Returns = lazy(() => import('./screens/ReturnsScreen'));
const InvoicePreview = lazy(() => import('./screens/InvoicePreviewScreen'));

const Loading = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
            <p>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

const AuthGate: React.FC = () => {
    console.log("[AuthGate] Rendering...");
    const { auth } = useAuth();
    const { state } = useApp();
    const [showRegister, setShowRegister] = useState(false);

    useEffect(() => {
        console.log("[AuthGate] Status:", {
            isRegistered: auth.isRegistered,
            isAuthenticated: auth.isAuthenticated,
            isLoading: state.isLoading
        });
    }, [auth.isRegistered, auth.isAuthenticated, state.isLoading]);

    // Auto-backup whenever sales or settings change significantly
    useEffect(() => {
        if (auth.isAuthenticated && state.settings.autoBackupEnabled) {
            const timer = setTimeout(() => {
                performAutoBackup();
            }, 5000); // Debounce backups
            return () => clearTimeout(timer);
        }
    }, [state.sales, state.expenses, state.settings.autoBackupEnabled, auth.isAuthenticated]);

    // Not registered → show register (forced)
    if (!auth.isRegistered) {
        return <BusinessProfileScreen onBack={() => { }} />;
    }

    // Registered but not authenticated → show login
    if (!auth.isAuthenticated) {
        if (showRegister) {
            return <BusinessProfileScreen onBack={() => setShowRegister(false)} />;
        }
        return <LoginScreen onRegister={() => setShowRegister(true)} />;
    }

    // Authenticated → show app
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-content" style={{ marginLeft: 'var(--sidebar-width)' }}>
                <Suspense fallback={<Loading />}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/expenses" element={<Expenses />} />
                        <Route path="/credits" element={<Credits />} />
                        <Route path="/purchases" element={<Purchases />} />
                        <Route path="/quotations" element={<Quotations />} />
                        <Route path="/purchase-orders" element={<PurchaseOrders />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/contacts" element={<Contacts />} />
                        <Route path="/attendance" element={<Attendance />} />
                        <Route path="/returns" element={<Returns />} />
                        <Route path="/invoice-preview/:type/:id" element={<InvoicePreview />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/settings" element={<SettingsScreen />} />
                        <Route path="/user-manager" element={<UserManager />} />
                    </Routes>
                </Suspense>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <AppProvider>
                    <AuthProvider>
                        <HashRouter>
                            <AuthGate />
                        </HashRouter>
                    </AuthProvider>
                </AppProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
};

export default App;
