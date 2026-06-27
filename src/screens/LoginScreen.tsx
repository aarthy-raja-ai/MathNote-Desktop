import React, { useState, useRef, useEffect } from 'react';
import { TrendingUp, Lock, Eye, EyeOff, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginScreen: React.FC<{ onRegister: () => void }> = ({ onRegister }) => {
    const { auth, login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const usernameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        usernameRef.current?.focus();
    }, []);

    const handleLogin = async () => {
        if (!username.trim()) {
            setError('Please enter your username.');
            return;
        }
        if (!password) {
            setError('Please enter your password.');
            return;
        }
        const success = await login(username, password);
        if (!success) {
            setError('Invalid username or password.');
            setShake(true);
            setTimeout(() => {
                setShake(false);
            }, 500);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleLogin();
    };

    return (
        <div className="auth-screen">
            <div className="auth-bg-pattern" />

            <div className="auth-card" style={shake ? { animation: 'shake 0.4s ease' } : {}}>
                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <TrendingUp size={28} />
                    </div>
                    <h1>MathNote</h1>
                    <p className="auth-tagline">Every Number. Clearly Noted.</p>
                </div>

                {/* Welcome */}
                <div className="auth-welcome">
                    <h2>Welcome back{auth.profile?.ownerName ? `, ${auth.profile.ownerName.split(' ')[0]}` : ''}!</h2>
                    {auth.profile?.businessName && (
                        <p className="auth-business-name">{auth.profile.businessName}</p>
                    )}
                    <p className="auth-instruction">Sign in with your username and password</p>
                </div>

                {/* Username */}
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label">
                        <User size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Username
                    </label>
                    <input
                        ref={usernameRef}
                        className={`form-input ${error ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={e => { setUsername(e.target.value); setError(''); }}
                        onKeyDown={handleKeyDown}
                        autoComplete="username"
                    />
                </div>

                {/* Password */}
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label">
                        <Lock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Password
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            className={`form-input ${error ? 'input-error' : ''}`}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            onKeyDown={handleKeyDown}
                            autoComplete="current-password"
                        />
                        <button
                            className="pin-eye-btn"
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                {error && <div className="auth-error">{error}</div>}

                {/* Login Button */}
                <button
                    className="btn btn-primary btn-lg auth-submit"
                    onClick={handleLogin}
                    style={{ marginTop: '0.5rem' }}
                >
                    <Lock size={18} /> Sign In
                </button>

                {/* Footer Links */}
                <div className="auth-footer">
                    <p>Don't have an account?</p>
                    <button className="auth-link" onClick={onRegister}>
                        Register your business <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
