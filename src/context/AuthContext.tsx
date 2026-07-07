import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import storage, { User, UserRole, UserPermissions } from '../utils/storage';

export interface BusinessProfile {
    businessName: string;
    ownerName: string;
    phone: string;
    email: string;
    address: string;
    state: string;
    city: string;
    pincode: string;
    gstin: string;
    panNumber: string;
    category: string;
    taxType: 'GST' | 'NON-GST' | 'Composition';
    logoBase64: string;
}

interface AuthState {
    isRegistered: boolean;
    isAuthenticated: boolean;
    currentUser: User | null;
    users: User[];
    profile: BusinessProfile | null;
}

interface AuthContextType {
    auth: AuthState;
    profile: BusinessProfile | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    register: (profile: BusinessProfile, ownerUsername: string, ownerPassword: string, ownerName: string) => Promise<void>;
    updateProfile: (updates: Partial<BusinessProfile>) => void;
    addUser: (name: string, username: string, password: string, role: UserRole, permissions?: UserPermissions) => Promise<boolean>;
    updateUser: (id: string, updates: Partial<User>) => Promise<boolean>;
    deleteUser: (id: string) => boolean;
    canDelete: boolean;
    canManageSettings: boolean;
    canManageUsers: boolean;
    canViewReports: boolean;
    hasPermission: (module: keyof UserPermissions, action: 'view' | 'add' | 'modify' | 'delete') => boolean;
}

const PROFILE_KEY = '@mathnote_auth';
const USERS_KEY = '@mathnote_users';

// Utility for secure password hashing
const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'mathnote_salt_2025'); // Static salt for simplicity in this offline app
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [auth, setAuth] = useState<AuthState>({
        isRegistered: false,
        isAuthenticated: false,
        currentUser: null,
        users: [],
        profile: null,
    });
    const [loaded, setLoaded] = useState(false);

    const loadFromStorage = useCallback(() => {
        try {
            const storedProfile = localStorage.getItem(PROFILE_KEY);
            const storedUsers = localStorage.getItem(USERS_KEY);
            const profile = storedProfile ? JSON.parse(storedProfile) as BusinessProfile : null;
            const users = storedUsers ? JSON.parse(storedUsers) as User[] : [];

            if (profile && users.length > 0) {
                setAuth(prev => ({
                    ...prev,
                    isRegistered: true,
                    users,
                    profile,
                }));
            }
        } catch { /* ignore corrupt data */ }
    }, []);

    useEffect(() => {
        loadFromStorage();
        setLoaded(true);
    }, [loadFromStorage]);

    useEffect(() => {
        const handleAuthUpdate = () => {
            console.log('[Auth] Sync update detected, reloading credentials...');
            loadFromStorage();
        };

        window.addEventListener('mathnote_auth_updated', handleAuthUpdate);
        return () => {
            window.removeEventListener('mathnote_auth_updated', handleAuthUpdate);
        };
    }, [loadFromStorage]);

    const persistUsers = useCallback(async (users: User[]) => {
        await storage.set(USERS_KEY, users);
    }, []);

    const register = useCallback(async (profile: BusinessProfile, ownerUsername: string, ownerPassword: string, ownerName: string) => {
        const hashedPassword = await hashPassword(ownerPassword);
        const owner: User = {
            id: `user-${Date.now()}`,
            name: ownerName,
            username: ownerUsername.toLowerCase().trim(),
            password: hashedPassword,
            role: 'owner',
            createdAt: new Date().toISOString(),
        };
        const users = [owner];
        await storage.set(PROFILE_KEY, profile);
        await persistUsers(users);
        setAuth({
            isRegistered: true,
            isAuthenticated: true,
            currentUser: owner,
            users,
            profile,
        });
    }, [persistUsers]);

    const updateProfile = useCallback(async (updates: Partial<BusinessProfile>) => {
        if (auth.profile) {
            const newProfile = { ...auth.profile, ...updates };
            await storage.set(PROFILE_KEY, newProfile);
            setAuth(prev => ({ ...prev, profile: newProfile }));
        }
    }, [auth.profile]);

    const login = useCallback(async (username: string, password: string): Promise<boolean> => {
        const hashedPassword = await hashPassword(password);
        const user = auth.users.find(
            u => u.username.toLowerCase() === username.toLowerCase().trim() &&
                (u.password === hashedPassword || u.password === password) // Temporary fallback for existing plaintext users
        );
        if (user) {
            // Auto-migrate plaintext to hash if matched on plaintext
            if (user.password === password) {
                user.password = hashedPassword;
                persistUsers(auth.users);
            }
            setAuth(prev => ({ ...prev, isAuthenticated: true, currentUser: user }));
            return true;
        }
        return false;
    }, [auth.users, persistUsers]);

    const logout = useCallback(() => {
        setAuth(prev => ({ ...prev, isAuthenticated: false, currentUser: null }));
    }, []);

    const addUser = useCallback(async (name: string, username: string, password: string, role: UserRole, permissions?: UserPermissions): Promise<boolean> => {
        const uname = username.toLowerCase().trim();
        if (auth.users.some(u => u.username.toLowerCase() === uname)) {
            return false;
        }
        const hashedPassword = await hashPassword(password);
        const newUser: User = {
            id: `user-${Date.now()}`,
            name,
            username: uname,
            password: hashedPassword,
            role,
            createdAt: new Date().toISOString(),
            permissions,
        };
        const newUsers = [...auth.users, newUser];
        persistUsers(newUsers);
        setAuth(prev => ({ ...prev, users: newUsers }));
        return true;
    }, [auth.users, persistUsers]);

    const updateUser = useCallback(async (id: string, updates: Partial<User>): Promise<boolean> => {
        if (updates.username) {
            const uname = updates.username.toLowerCase().trim();
            if (auth.users.some(u => u.id !== id && u.username.toLowerCase() === uname)) {
                return false;
            }
            updates.username = uname;
        }
        if (updates.password) {
            updates.password = await hashPassword(updates.password);
        }
        const newUsers = auth.users.map(u => u.id === id ? { ...u, ...updates } : u);
        persistUsers(newUsers);
        setAuth(prev => ({
            ...prev,
            users: newUsers,
            currentUser: prev.currentUser?.id === id ? { ...prev.currentUser, ...updates } : prev.currentUser,
        }));
        return true;
    }, [auth.users, persistUsers]);

    const deleteUser = useCallback((id: string): boolean => {
        const user = auth.users.find(u => u.id === id);
        if (!user) return false;
        if (user.role === 'owner') {
            const ownerCount = auth.users.filter(u => u.role === 'owner').length;
            if (ownerCount <= 1) return false;
        }
        if (auth.users.length <= 1) return false;

        const newUsers = auth.users.filter(u => u.id !== id);
        persistUsers(newUsers);
        setAuth(prev => ({
            ...prev,
            users: newUsers,
            currentUser: prev.currentUser?.id === id ? null : prev.currentUser,
            isAuthenticated: prev.currentUser?.id === id ? false : prev.isAuthenticated,
        }));
        return true;
    }, [auth.users, persistUsers]);

    const hasPermission = useCallback((module: keyof UserPermissions, action: 'view' | 'add' | 'modify' | 'delete'): boolean => {
        const user = auth.currentUser;
        if (!user) return false;
        if (user.role === 'owner') return true;
        const perms = user.permissions || getDefaultPermissions(user.role);
        return !!perms[module]?.[action];
    }, [auth.currentUser]);

    const canManageSettings = hasPermission('settings', 'view');
    const canManageUsers = hasPermission('staff', 'view');
    const canDelete = hasPermission('sales', 'delete') || hasPermission('purchases', 'delete') || auth.currentUser?.role === 'owner' || auth.currentUser?.role === 'manager';
    const canViewReports = hasPermission('reports', 'view');

    if (!loaded) return null;

    return (
        <AuthContext.Provider value={{
            auth,
            profile: auth.profile,
            login,
            logout,
            register,
            updateProfile,
            addUser,
            updateUser,
            deleteUser,
            canDelete,
            canManageSettings,
            canManageUsers,
            canViewReports,
            hasPermission,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const getDefaultPermissions = (role: UserRole): UserPermissions => {
    const isManager = role === 'manager';
    return {
        sales: { view: true, add: true, modify: isManager, delete: false },
        purchases: { view: true, add: true, modify: isManager, delete: false },
        inventory: { view: true, add: isManager, modify: isManager, delete: false },
        expenses: { view: true, add: true, modify: isManager, delete: false },
        credits: { view: true, add: true, modify: isManager, delete: false },
        reports: { view: isManager, add: false, modify: false, delete: false },
        staff: { view: isManager, add: false, modify: false, delete: false },
        settings: { view: false, add: false, modify: false, delete: false },
    };
};

export const useAuth = (): AuthContextType => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
