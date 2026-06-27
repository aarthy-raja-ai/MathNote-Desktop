import React, { useState, useRef } from 'react';
import { TrendingUp, Building2, User, Phone, Mail, MapPin, Hash, Tag, Lock, Eye, EyeOff, ArrowLeft, Check, CreditCard, Landmark, QrCode, Image } from 'lucide-react';
import { useAuth, BusinessProfile } from '../context/AuthContext';
import { INDIAN_STATES } from '../utils/storage';

const CATEGORIES = [
    'Retail', 'Wholesale', 'Manufacturing', 'Food & Beverage', 'Services',
    'Electronics', 'Textiles', 'Pharmacy', 'Hardware', 'General Store', 'Other'
];

type FormData = BusinessProfile & {
    ownerUsername: string;
    ownerPassword: string;
    confirmPassword: string;
    ownerName: string;
};

const BusinessProfileScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { register } = useAuth();
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [enableSync, setEnableSync] = useState(false);
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState<FormData>({
        businessName: '',
        ownerName: '',
        phone: '',
        email: '',
        address: '',
        state: '',
        city: '',
        pincode: '',
        gstin: '',
        panNumber: '',
        category: '',
        taxType: 'GST',
        logoBase64: '',
        ownerUsername: '',
        ownerPassword: '',
        confirmPassword: '',
    });

    const update = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    };

    const validateStep1 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!form.businessName.trim()) errs.businessName = 'Business name is required';
        if (!form.ownerName.trim()) errs.ownerName = 'Owner name is required';
        if (!form.phone.trim()) errs.phone = 'Phone number is required';
        else if (form.phone.length < 10) errs.phone = 'Enter a valid phone number';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
        if (!form.state) errs.state = 'Select your state';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errs: Record<string, string> = {};
        if (form.gstin && form.gstin.length !== 15) errs.gstin = 'GSTIN must be 15 characters';
        if (form.panNumber && form.panNumber.length !== 10) errs.panNumber = 'PAN must be 10 characters';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep3Sync = (): boolean => {
        if (!enableSync) return true;
        const errs: Record<string, string> = {};
        if (!supabaseUrl.trim()) errs.supabaseUrl = 'Supabase Project URL is required';
        else if (!supabaseUrl.trim().startsWith('http')) errs.supabaseUrl = 'URL must start with http:// or https://';
        if (!supabaseKey.trim()) errs.supabaseKey = 'Supabase Anon Key is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateAccountSetup = (): boolean => {
        const errs: Record<string, string> = {};
        if (!form.ownerUsername.trim()) errs.ownerUsername = 'Username is required';
        else if (form.ownerUsername.trim().length < 3) errs.ownerUsername = 'Username must be at least 3 characters';
        else if (!/^[a-zA-Z0-9_]+$/.test(form.ownerUsername.trim())) errs.ownerUsername = 'Username can only contain letters, numbers, and underscores';
        if (!form.ownerPassword) errs.ownerPassword = 'Password is required';
        else if (form.ownerPassword.length < 4) errs.ownerPassword = 'Password must be at least 4 characters';
        if (form.ownerPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleNext = async () => {
        if (step === 1 && validateStep1()) setStep(2);
        else if (step === 2 && validateStep2()) setStep(3);
        else if (step === 3 && validateStep3Sync()) setStep(4);
        else if (step === 4 && validateAccountSetup()) {
            if (enableSync) {
                localStorage.setItem('SUPABASE_URL', supabaseUrl.trim());
                localStorage.setItem('SUPABASE_KEY', supabaseKey.trim());
                (window as any).SUPABASE_URL = supabaseUrl.trim();
                (window as any).SUPABASE_KEY = supabaseKey.trim();
                try {
                    const { resetSupabaseClient } = await import('../services/supabaseClient');
                    resetSupabaseClient();
                } catch (e) {
                    console.error('Failed to reset supabase client:', e);
                }
            } else {
                localStorage.removeItem('SUPABASE_URL');
                localStorage.removeItem('SUPABASE_KEY');
                (window as any).SUPABASE_URL = '';
                (window as any).SUPABASE_KEY = '';
            }

            const { ownerUsername, ownerPassword, confirmPassword, ...profile } = form;
            await register(profile, ownerUsername, ownerPassword, form.ownerName);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) {
            setErrors(prev => ({ ...prev, logo: 'Logo must be under 500KB' }));
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            update('logoBase64', ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="auth-screen">
            <div className="auth-bg-pattern" />

            <div className="auth-card register-card" style={{ maxWidth: 600 }}>
                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <TrendingUp size={28} />
                    </div>
                    <h1>MathNote</h1>
                    <p className="auth-tagline">Set up your business profile</p>
                </div>

                {/* Progress Steps */}
                <div className="register-steps" style={{ gap: '0.25rem' }}>
                    <div className={`register-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
                        <div className="step-number">{step > 1 ? <Check size={12} /> : '1'}</div>
                        <span style={{ fontSize: '0.75rem' }}>Business Info</span>
                    </div>
                    <div className="step-line" />
                    <div className={`register-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
                        <div className="step-number">{step > 2 ? <Check size={12} /> : '2'}</div>
                        <span style={{ fontSize: '0.75rem' }}>Tax Details</span>
                    </div>
                    <div className="step-line" />
                    <div className={`register-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'done' : ''}`}>
                        <div className="step-number">{step > 3 ? <Check size={12} /> : '3'}</div>
                        <span style={{ fontSize: '0.75rem' }}>Cloud Sync</span>
                    </div>
                    <div className="step-line" />
                    <div className={`register-step ${step >= 4 ? 'active' : ''}`}>
                        <div className="step-number">4</div>
                        <span style={{ fontSize: '0.75rem' }}>Account</span>
                    </div>
                </div>

                {/* Step 1: Business Info */}
                {step === 1 && (
                    <div className="register-form">
                        <div className="form-group">
                            <label className="form-label"><Building2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Business Name *</label>
                            <input className={`form-input ${errors.businessName ? 'input-error' : ''}`} placeholder="e.g. Arjun Electronics" value={form.businessName} onChange={e => update('businessName', e.target.value)} />
                            {errors.businessName && <span className="field-error">{errors.businessName}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label"><User size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Owner Name *</label>
                            <input className={`form-input ${errors.ownerName ? 'input-error' : ''}`} placeholder="Your full name" value={form.ownerName} onChange={e => update('ownerName', e.target.value)} />
                            {errors.ownerName && <span className="field-error">{errors.ownerName}</span>}
                        </div>

                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label"><Phone size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Phone *</label>
                                <input className={`form-input ${errors.phone ? 'input-error' : ''}`} placeholder="10-digit number" value={form.phone} onChange={e => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                                {errors.phone && <span className="field-error">{errors.phone}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label"><Mail size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Email</label>
                                <input className={`form-input ${errors.email ? 'input-error' : ''}`} type="email" placeholder="Optional" value={form.email} onChange={e => update('email', e.target.value)} />
                                {errors.email && <span className="field-error">{errors.email}</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label"><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />State *</label>
                            <select className={`form-input form-select ${errors.state ? 'input-error' : ''}`} value={form.state} onChange={e => update('state', e.target.value)}>
                                <option value="">Select State / UT</option>
                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {errors.state && <span className="field-error">{errors.state}</span>}
                        </div>

                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">City</label>
                                <input className="form-input" placeholder="City" value={form.city} onChange={e => update('city', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pincode</label>
                                <input className="form-input" placeholder="6-digit" value={form.pincode} onChange={e => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label"><Tag size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Business Category</label>
                            <div className="category-grid">
                                {CATEGORIES.map(cat => (
                                    <button key={cat} className={`chip ${form.category === cat ? 'active' : ''}`} onClick={() => update('category', cat)}>{cat}</button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label"><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Address</label>
                            <textarea className="form-input" placeholder="Full business address" rows={2} value={form.address} onChange={e => update('address', e.target.value)} style={{ resize: 'vertical' }} />
                        </div>
                    </div>
                )}

                {/* Step 2: Tax Details */}
                {step === 2 && (
                    <div className="register-form">
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                            Select your taxation type and provide tax identifiers if applicable.
                        </div>

                        <div className="form-group">
                            <label className="form-label">Taxation Type *</label>
                            <div className="flex gap-sm">
                                {(['GST', 'NON-GST', 'Composition'] as const).map(type => (
                                    <button
                                        key={type}
                                        className={`chip ${form.taxType === type ? 'active' : ''}`}
                                        onClick={() => update('taxType', type)}
                                        style={{ flex: 1, padding: '10px' }}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {form.taxType !== 'NON-GST' && (
                            <div className="grid grid-2 animate-in">
                                <div className="form-group">
                                    <label className="form-label"><Hash size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />GSTIN</label>
                                    <input className={`form-input ${errors.gstin ? 'input-error' : ''}`} placeholder="15-digit GSTIN" value={form.gstin} onChange={e => update('gstin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))} />
                                    {errors.gstin && <span className="field-error">{errors.gstin}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label"><CreditCard size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />PAN Number</label>
                                    <input className={`form-input ${errors.panNumber ? 'input-error' : ''}`} placeholder="10-character PAN" value={form.panNumber} onChange={e => update('panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} />
                                    {errors.panNumber && <span className="field-error">{errors.panNumber}</span>}
                                </div>
                            </div>
                        )}

                        <div style={{ height: 1, background: 'var(--color-border-light)', margin: '1rem 0' }} />

                        <div className="form-group">
                            <label className="form-label"><Image size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Business Logo</label>
                            <input type="file" accept="image/*" ref={logoInputRef} style={{ display: 'none' }} onChange={handleLogoUpload} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {form.logoBase64 ? (
                                    <img src={form.logoBase64} alt="Logo" style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', objectFit: 'contain', border: '1px solid var(--color-border)' }} />
                                ) : (
                                    <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', border: '2px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                                        <Image size={24} />
                                    </div>
                                )}
                                <div>
                                    <button className="btn btn-secondary btn-sm" onClick={() => logoInputRef.current?.click()}>
                                        {form.logoBase64 ? 'Change Logo' : 'Upload Logo'}
                                    </button>
                                    {form.logoBase64 && (
                                        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => update('logoBase64', '')}>Remove</button>
                                    )}
                                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Max 500KB · PNG, JPG</p>
                                </div>
                            </div>
                            {errors.logo && <span className="field-error">{errors.logo}</span>}
                        </div>
                    </div>
                )}

                {/* Step 3: Cloud Sync */}
                {step === 3 && (
                    <div className="register-form animate-in">
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Real-time Cloud Sync</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                                Do you want to sync your data across multiple devices (Desktop & Mobile)?
                            </p>
                        </div>

                        <div className="form-group">
                            <div className="flex gap-sm">
                                <button
                                    type="button"
                                    className={`chip ${enableSync ? 'active' : ''}`}
                                    onClick={() => { setEnableSync(true); setErrors({}); }}
                                    style={{ flex: 1, padding: '12px', fontSize: '0.9rem', fontWeight: 600 }}
                                >
                                    Yes, enable Cloud Sync
                                </button>
                                <button
                                    type="button"
                                    className={`chip ${!enableSync ? 'active' : ''}`}
                                    onClick={() => { setEnableSync(false); setErrors({}); }}
                                    style={{ flex: 1, padding: '12px', fontSize: '0.9rem', fontWeight: 600 }}
                                >
                                    No, local device only
                                </button>
                            </div>
                        </div>

                        {enableSync && (
                            <div className="animate-in" style={{ marginTop: '1.5rem' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                                    Enter your Supabase database connection details below to link your devices:
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Supabase Project URL *</label>
                                    <input
                                        className={`form-input ${errors.supabaseUrl ? 'input-error' : ''}`}
                                        placeholder="https://your-project.supabase.co"
                                        value={supabaseUrl}
                                        onChange={e => { setSupabaseUrl(e.target.value); setErrors(prev => { const n = {...prev}; delete n.supabaseUrl; return n; }); }}
                                    />
                                    {errors.supabaseUrl && <span className="field-error">{errors.supabaseUrl}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Supabase Anon Key *</label>
                                    <input
                                        className={`form-input ${errors.supabaseKey ? 'input-error' : ''}`}
                                        placeholder="your-supabase-anon-key"
                                        value={supabaseKey}
                                        onChange={e => { setSupabaseKey(e.target.value); setErrors(prev => { const n = {...prev}; delete n.supabaseKey; return n; }); }}
                                    />
                                    {errors.supabaseKey && <span className="field-error">{errors.supabaseKey}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Account Setup */}
                {step === 4 && (
                    <div className="register-form animate-in">
                        <div className="security-header">
                            <Lock size={32} color="var(--color-primary)" />
                            <h3>Create your account</h3>
                            <p>Set up a username and password. You'll need these credentials every time you sign in to MathNote.</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label"><User size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Username *</label>
                            <input
                                className={`form-input ${errors.ownerUsername ? 'input-error' : ''}`}
                                type="text"
                                placeholder="e.g. arjun_owner"
                                value={form.ownerUsername}
                                onChange={e => update('ownerUsername', e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
                                autoComplete="username"
                            />
                            {errors.ownerUsername && <span className="field-error">{errors.ownerUsername}</span>}
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'block' }}>Letters, numbers, and underscores only</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label"><Lock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Password *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className={`form-input ${errors.ownerPassword ? 'input-error' : ''}`}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="At least 4 characters"
                                    value={form.ownerPassword}
                                    onChange={e => update('ownerPassword', e.target.value)}
                                    autoComplete="new-password"
                                />
                                <button className="pin-eye-btn" onClick={() => setShowPassword(!showPassword)} type="button" tabIndex={-1}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.ownerPassword && <span className="field-error">{errors.ownerPassword}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label"><Lock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Confirm Password *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                                    type={showConfirm ? 'text' : 'password'}
                                    placeholder="Re-enter password"
                                    value={form.confirmPassword}
                                    onChange={e => update('confirmPassword', e.target.value)}
                                    autoComplete="new-password"
                                />
                                <button className="pin-eye-btn" onClick={() => setShowConfirm(!showConfirm)} type="button" tabIndex={-1}>
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
                        </div>
                    </div>
                )}

                {/* Buttons */}
                <div className="register-actions">
                    <button className="btn btn-secondary" onClick={step === 1 ? onBack : () => setStep(step - 1)}>
                        <ArrowLeft size={16} />{step === 1 ? 'Back to Login' : 'Back'}
                    </button>
                    <button className="btn btn-primary btn-lg" onClick={handleNext}>
                        {step === 4 ? (
                            <><Check size={18} /> Create Account</>
                        ) : (
                            <>Continue <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BusinessProfileScreen;
