import React, { useState, useRef, useEffect } from 'react';
import { Settings, Moon, Sun, Download, Upload, Trash2, Database, Shield, Info, ChevronRight, AlertTriangle, FileText, ClipboardList, Bell, Folder } from 'lucide-react';
import { useApp, useAuth } from '../context';
import { useTheme } from '../theme';
import storage, { INDIAN_STATES } from '../utils/storage';
import { SQL_SCHEMA } from '../utils/supabaseSchema';

const SettingsScreen: React.FC = () => {
    const { state, updateSettings, clearAllData, restoreData } = useApp();
    const { isDark, toggleTheme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(false);
    const [copiedSQL, setCopiedSQL] = useState(false);
    const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('SUPABASE_URL') || '');
    const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('SUPABASE_KEY') || '');

    const { auth, updateProfile } = useAuth();
    const [profileForm, setProfileForm] = useState({
        businessName: auth.profile?.businessName || '',
        ownerName: auth.profile?.ownerName || '',
        phone: auth.profile?.phone || '',
        email: auth.profile?.email || '',
        address: auth.profile?.address || '',
        state: auth.profile?.state || '',
        city: auth.profile?.city || '',
        pincode: auth.profile?.pincode || '',
        gstin: auth.profile?.gstin || '',
        panNumber: auth.profile?.panNumber || '',
        category: auth.profile?.category || 'Retail',
        taxType: auth.profile?.taxType || 'GST',
        logoBase64: auth.profile?.logoBase64 || '',
    });

    useEffect(() => {
        if (auth.profile) {
            setProfileForm({
                businessName: auth.profile.businessName || '',
                ownerName: auth.profile.ownerName || '',
                phone: auth.profile.phone || '',
                email: auth.profile.email || '',
                address: auth.profile.address || '',
                state: auth.profile.state || '',
                city: auth.profile.city || '',
                pincode: auth.profile.pincode || '',
                gstin: auth.profile.gstin || '',
                panNumber: auth.profile.panNumber || '',
                category: auth.profile.category || 'Retail',
                taxType: auth.profile.taxType || 'GST',
                logoBase64: auth.profile.logoBase64 || '',
            });
        }
    }, [auth.profile]);

    const handleProfileChange = (field: string, val: string) => {
        setProfileForm(prev => ({ ...prev, [field]: val }));
    };

    const handleSaveProfile = async () => {
        await updateProfile(profileForm);
        showNotif('Business Profile updated successfully!');
    };

    const handleCopySQL = () => {
        navigator.clipboard.writeText(SQL_SCHEMA);
        setCopiedSQL(true);
        setTimeout(() => setCopiedSQL(false), 2000);
    };

    const handlePrintGuide = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        printWindow.document.write(`
            <html>
            <head>
                <title>MathNote Supabase Sync Setup Guide</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; }
                    h1 { color: #6366f1; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 24px; }
                    h2 { color: #0f172a; margin-top: 25px; font-size: 18px; border-left: 4px solid #6366f1; padding-left: 10px; }
                    ol { padding-left: 20px; }
                    li { margin-bottom: 15px; }
                    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
                    pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 12px; font-family: monospace; }
                    .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; }
                </style>
            </head>
            <body>
                <h1>MathNote — Supabase Real-time Cloud Sync Guide</h1>
                <p>This guide explains how to set up real-time database synchronization between your MathNote Desktop and Mobile apps.</p>
                
                <h2>Step 1: Sign up and Create a Project</h2>
                <p>Register a free developer account at <strong>supabase.com</strong>. Create a new database project and wait for it to finish provisioning (takes about 2 minutes).</p>
                
                <h2>Step 2: Create Tables in the SQL Editor</h2>
                <p>Go to your Supabase Project Dashboard, click on <strong>SQL Editor</strong> in the left sidebar, click <strong>New Query</strong>, paste the following SQL setup code, and click <strong>Run</strong>:</p>
                
                <pre>${SQL_SCHEMA.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                
                <h2>Step 3: Enable Real-time Publication</h2>
                <p>The last line in the SQL query automatically adds all 12 tables to the <code>supabase_realtime</code> publication to enable instantaneous sync between your devices.</p>
                
                <h2>Step 4: Configure App Settings</h2>
                <p>Go to <strong>Project Settings > API</strong>, copy your <strong>Project URL</strong> and <strong>Anon Key</strong>, and paste them into the <strong>Real-time Cloud Sync</strong> section in settings on both Desktop and Mobile apps. Restart the apps to activate the connection!</p>
                
                <div class="footer">MathNote Accounting System — Setup Guide PDF — Generated on ${new Date().toLocaleDateString()}</div>
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const showNotif = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

    const handleSelectBackupFolder = async () => {
        if (window.electronAPI && window.electronAPI.selectDirectory) {
            const folder = await window.electronAPI.selectDirectory();
            if (folder) {
                updateSettings({ autoBackupPath: folder });
                showNotif('Backup folder path updated');
            }
        } else {
            alert('Folder selection is only supported when running inside the Desktop Application.');
        }
    };

    const handleExport = () => {
        const exportData = {
            sales: state.sales,
            expenses: state.expenses,
            credits: state.credits,
            contacts: state.contacts,
            products: state.products,
            returns: state.returns,
            purchases: state.purchases,
            quotations: state.quotations,
            purchaseOrders: state.purchaseOrders,
            attendance: state.attendance,
            settings: state.settings,
            exportDate: new Date().toISOString(),
            version: '1.5.0',
        };
        const jsonStr = JSON.stringify(exportData);
        let encodedContent: string;
        try {
            encodedContent = btoa(unescape(encodeURIComponent(jsonStr)));
        } catch {
            encodedContent = jsonStr;
        }
        const blob = new Blob([encodedContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mathnote-backup-${new Date().toISOString().split('T')[0]}.mathnote`;
        a.click();
        URL.revokeObjectURL(url);
        showNotif('Data exported successfully!');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const rawText = await file.text();
            let parsedText = rawText.trim();
            if (!parsedText.startsWith('{')) {
                try {
                    parsedText = decodeURIComponent(escape(atob(parsedText)));
                } catch {
                    // ignore and try raw
                }
            }
            const data = JSON.parse(parsedText);
            const success = await restoreData(data);
            if (success) showNotif('Data restored successfully!');
            else showNotif('Failed to restore data.');
        } catch {
            showNotif('Invalid backup file.');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClear = async () => {
        const success = await clearAllData();
        if (success) {
            showNotif('All data cleared. Restarting...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
        setShowClearConfirm(false);
    };

    return (
        <div className="animate-in" style={{ maxWidth: 800 }}>
            <div className="page-header">
                <div><h1>Settings</h1><p>App configuration & management</p></div>
            </div>

            {notification && (
                <div className="card" style={{ marginBottom: '1rem', background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-success)' }}>
                    {notification}
                </div>
            )}

            {/* Business Profile */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header"><span className="card-title" style={{ fontSize: '1rem' }}>🏢 Business Profile</span></div>
                <div style={{ padding: '1rem 0' }}>
                    <div className="grid grid-2">
                        <div className="form-group">
                            <label className="form-label">Business Name</label>
                            <input
                                className="form-input"
                                value={profileForm.businessName}
                                onChange={e => handleProfileChange('businessName', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Owner Name</label>
                            <input
                                className="form-input"
                                value={profileForm.ownerName}
                                onChange={e => handleProfileChange('ownerName', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-2" style={{ marginTop: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input
                                className="form-input"
                                value={profileForm.phone}
                                onChange={e => handleProfileChange('phone', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                className="form-input"
                                type="email"
                                value={profileForm.email}
                                onChange={e => handleProfileChange('email', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="form-label">Address</label>
                        <input
                            className="form-input"
                            value={profileForm.address}
                            onChange={e => handleProfileChange('address', e.target.value)}
                        />
                    </div>

                    <div className="grid grid-3" style={{ marginTop: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">City</label>
                            <input
                                className="form-input"
                                value={profileForm.city}
                                onChange={e => handleProfileChange('city', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">State</label>
                            <select
                                className="form-input form-select"
                                value={profileForm.state}
                                onChange={e => handleProfileChange('state', e.target.value)}
                            >
                                <option value="">Select State</option>
                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Pincode</label>
                            <input
                                className="form-input"
                                value={profileForm.pincode}
                                onChange={e => handleProfileChange('pincode', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-2" style={{ marginTop: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">GSTIN</label>
                            <input
                                className="form-input"
                                maxLength={15}
                                placeholder="15-digit GSTIN"
                                value={profileForm.gstin}
                                onChange={e => handleProfileChange('gstin', e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">PAN Number</label>
                            <input
                                className="form-input"
                                maxLength={10}
                                placeholder="10-digit PAN"
                                value={profileForm.panNumber}
                                onChange={e => handleProfileChange('panNumber', e.target.value.toUpperCase())}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={handleSaveProfile}>Save Business Profile</button>
                    </div>
                </div>
            </div>

            {/* Appearance */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header"><span className="card-title" style={{ fontSize: '1rem' }}>🎨 Appearance & Regional</span></div>
                <div className="flex flex-between" style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <div>
                        <div style={{ fontWeight: 500 }}>Theme</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Switch between light and dark mode</div>
                    </div>
                    <button className="btn btn-secondary" onClick={toggleTheme}>
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}{isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                </div>
                <div className="flex flex-between" style={{ padding: '1rem 0' }}>
                    <div>
                        <div style={{ fontWeight: 500 }}>Currency Symbol</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Used for all price displays</div>
                    </div>
                    <select
                        className="form-input form-select"
                        style={{ width: 120 }}
                        value={state.settings.currency || '₹'}
                        onChange={e => updateSettings({ currency: e.target.value })}
                    >
                        <option value="₹">₹ INR (India)</option>
                        <option value="$">$ USD (USA)</option>
                        <option value="€">€ EUR (Europe)</option>
                        <option value="£">£ GBP (UK)</option>
                        <option value="¥">¥ JPY (Japan)</option>
                    </select>
                </div>
            </div>

            {/* Taxation Settings */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header"><span className="card-title" style={{ fontSize: '1rem' }}>⚖️ Taxation</span></div>

                <div className="form-group" style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <label className="form-label">Taxation Type</label>
                    <div className="flex gap-xs" style={{ marginTop: '0.25rem' }}>
                        {(['GST', 'NON-GST', 'Composition'] as const).map(type => (
                            <button
                                key={type}
                                className={`chip ${state.settings.taxType === type ? 'active' : ''}`}
                                onClick={() => {
                                    updateSettings({ taxType: type, gstEnabled: type !== 'NON-GST' });
                                    updateProfile({ taxType: type });
                                }}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {state.settings.taxType !== 'NON-GST' && (
                    <div className="animate-in" style={{ padding: '1rem 0' }}>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Default Tax Rate (%)</label>
                                <select
                                    className="form-input"
                                    value={state.settings.gstRate || 18}
                                    onChange={e => updateSettings({ gstRate: parseInt(e.target.value) || 0 })}
                                >
                                    {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tax Mode</label>
                                <div className="flex gap-xs" style={{ marginTop: '0.25rem' }}>
                                    {(['exclusive', 'inclusive'] as const).map(m => (
                                        <button key={m} className={`chip ${state.settings.taxMode === m ? 'active' : ''}`} onClick={() => updateSettings({ taxMode: m })}>
                                            {m.charAt(0).toUpperCase() + m.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {state.settings.taxType === 'GST' && (
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label className="form-label">Default Transaction Type</label>
                                <div className="flex gap-xs" style={{ marginTop: '0.25rem' }}>
                                    {([['intra', 'CGST + SGST (Intra-state)'], ['inter', 'IGST (Inter-state)']] as const).map(([v, l]) => (
                                        <button key={v} className={`chip ${state.settings.gstType === v ? 'active' : ''}`} onClick={() => updateSettings({ gstType: v })}>{l}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bank & Payment Details */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header"><span className="card-title" style={{ fontSize: '1rem' }}>🏦 Bank & Payment Details</span></div>
                <div style={{ padding: '1rem 0' }}>
                    <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input
                            className="form-input"
                            placeholder="e.g. HDFC Bank"
                            value={state.settings.bankName || ''}
                            onChange={e => updateSettings({ bankName: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-2" style={{ marginTop: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Account Number</label>
                            <input
                                className="form-input"
                                placeholder="Account number"
                                value={state.settings.bankAccountNumber || ''}
                                onChange={e => updateSettings({ bankAccountNumber: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">IFSC Code</label>
                            <input
                                className="form-input"
                                placeholder="IFSC"
                                value={state.settings.bankIFSC || ''}
                                onChange={e => updateSettings({ bankIFSC: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="form-label">UPI ID (for QR codes)</label>
                        <input
                            className="form-input"
                            placeholder="e.g. business@upi"
                            value={state.settings.upiId || ''}
                            onChange={e => updateSettings({ upiId: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Cloud Sync Settings */}
            <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--color-primary-soft)' }}>
                <div className="card-header" style={{ background: 'var(--color-primary-faint)' }}>
                    <span className="card-title" style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>☁️ Real-time Cloud Sync (Supabase)</span>
                </div>
                <div style={{ padding: '1rem 0' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                        Connect to Supabase to sync data in real-time between your Desktop and Mobile devices.
                    </p>
                    <div className="form-group">
                        <label className="form-label">Supabase Project URL</label>
                        <input
                            className="form-input"
                            placeholder="https://your-project.supabase.co"
                            value={supabaseUrl}
                            onChange={e => {
                                setSupabaseUrl(e.target.value);
                                storage.set('SUPABASE_URL', e.target.value);
                                showNotif('Supabase URL updated and synchronized!');
                            }}
                        />
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="form-label">Supabase Anon Key</label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="your-anon-key"
                            value={supabaseKey}
                            onChange={e => {
                                setSupabaseKey(e.target.value);
                                storage.set('SUPABASE_KEY', e.target.value);
                                showNotif('Supabase Key updated and synchronized!');
                            }}
                        />
                    </div>
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-bg-soft)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        <strong>Note:</strong> You can get these details from your Supabase Project Settings &gt; API.
                    </div>
                    
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border-light)', paddingTop: '1rem' }}>
                        <button 
                            className="btn btn-secondary btn-sm" 
                            type="button"
                            onClick={() => setShowGuide(!showGuide)}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            {showGuide ? 'Hide Step-by-Step Setup Guide' : 'Show Step-by-Step Setup Guide'}
                        </button>
                        
                        {showGuide && (
                            <div className="animate-in" style={{ marginTop: '1rem', fontSize: '0.85rem', lineHeight: '1.5' }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                                    Follow these 4 simple steps to connect your apps:
                                </div>
                                <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <li>
                                        <strong>Create a project:</strong> Sign up for free at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>supabase.com</a> and create a new project.
                                    </li>
                                    <li>
                                        <strong>Create Tables:</strong> Go to the <strong>SQL Editor</strong> in Supabase, paste our unified database script, and click <strong>Run</strong>.
                                        <div style={{ marginTop: '0.25rem' }}>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopySQL} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                                                {copiedSQL ? 'Copied SQL! ✅' : '📋 Copy SQL Database Script'}
                                            </button>
                                        </div>
                                    </li>
                                    <li>
                                        <strong>Copy Keys:</strong> Go to <strong>Project Settings &gt; API</strong> on Supabase, copy the <strong>Project URL</strong> and <strong>Anon Key</strong>, and paste them into the input fields above.
                                    </li>
                                    <li>
                                        <strong>Print or Export PDF Guide:</strong> Download a printable PDF setup checklist for reference.
                                        <div style={{ marginTop: '0.25rem' }}>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrintGuide} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                                                🖨️ Print / Save Guide as PDF
                                            </button>
                                        </div>
                                    </li>
                                </ol>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Invoice Configuration */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header"><span className="card-title" style={{ fontSize: '1rem' }}>📄 Invoice & Documents</span></div>
                <div className="grid grid-3" style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <div className="form-group">
                        <label className="form-label">Sale Prefix</label>
                        <input className="form-input" value={state.settings.invoicePrefix || 'INV'} onChange={e => updateSettings({ invoicePrefix: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Quotation Prefix</label>
                        <input className="form-input" value={state.settings.quotationPrefix || 'QTN'} onChange={e => updateSettings({ quotationPrefix: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">PO Prefix</label>
                        <input className="form-input" value={state.settings.poPrefix || 'PO'} onChange={e => updateSettings({ poPrefix: e.target.value })} />
                    </div>
                </div>

                <div className="grid grid-2" style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <div className="form-group">
                        <label className="form-label">Default Template</label>
                        <select className="form-input" value={state.settings.invoiceTemplate || 'modern'} onChange={e => updateSettings({ invoiceTemplate: e.target.value as any })}>
                            <option value="classic">Classic (Standard)</option>
                            <option value="modern">Modern (Recommended)</option>
                            <option value="minimal">Minimal (Clean)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Print Size</label>
                        <select className="form-input" value={state.settings.invoicePrintSize || 'A4'} onChange={e => updateSettings({ invoicePrintSize: e.target.value as any })}>
                            <option value="A4">A4 Full Sheet</option>
                            <option value="A5">A5 Half Sheet</option>
                            <option value="thermal80">Thermal 80mm</option>
                            <option value="thermal58">Thermal 58mm</option>
                        </select>
                    </div>
                </div>

                <div className="form-group" style={{ padding: '1rem 0' }}>
                    <label className="form-label">Terms & Conditions</label>
                    <textarea
                        className="form-input"
                        placeholder="Default terms to show on your invoices..."
                        value={state.settings.invoiceTerms || ''}
                        onChange={e => updateSettings({ invoiceTerms: e.target.value })}
                        style={{ minHeight: 80, resize: 'vertical' }}
                    />
                </div>
            </div>

            {/* General Settings */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header"><span className="card-title" style={{ fontSize: '1rem' }}>⚙️ General</span></div>
                <div className="flex flex-between" style={{ padding: '1rem 0' }}>
                    <div>
                        <div style={{ fontWeight: 500 }}>Reminders</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Enable due date reminders (credits)</div>
                    </div>
                    <label className="toggle-switch">
                        <input type="checkbox" checked={state.settings.remindersEnabled || false} onChange={e => updateSettings({ remindersEnabled: e.target.checked })} />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            {/* Data Management */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header"><span className="card-title" style={{ fontSize: '1rem' }}>💾 Data Management</span></div>
                <div className="flex flex-between" style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <div><div style={{ fontWeight: 500 }}>Auto-Backup on Close</div><div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Save backup automatically when exiting</div></div>
                    <label className="toggle-switch">
                        <input type="checkbox" checked={state.settings.autoBackupEnabled || false} onChange={e => updateSettings({ autoBackupEnabled: e.target.checked })} />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                {state.settings.autoBackupEnabled && (
                    <div className="flex flex-between animate-fade-in" style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                        <div style={{ flex: 1, marginRight: '1rem' }}>
                            <div style={{ fontWeight: 500 }}>Backup Folder Path</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', wordBreak: 'break-all', marginTop: '0.2rem' }}>
                                {state.settings.autoBackupPath || 'No folder selected'}
                            </div>
                        </div>
                        <button className="btn btn-secondary" onClick={handleSelectBackupFolder} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Folder size={16} /> Select Folder
                        </button>
                    </div>
                )}
                <div className="flex flex-between" style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <div><div style={{ fontWeight: 500 }}>Export Backup Manual</div><div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Download all your data as a secure MathNote Backup (.mathnote) file</div></div>
                    <button className="btn btn-secondary" onClick={handleExport}><Download size={16} />Export Backup</button>
                </div>
                <div className="flex flex-between" style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <div><div style={{ fontWeight: 500 }}>Restore Data</div><div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Upload a previously exported backup file</div></div>
                    <input ref={fileInputRef} type="file" accept=".mathnote,.json" style={{ display: 'none' }} onChange={handleImport} />
                    <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}><Upload size={16} />Restore Backup</button>
                </div>
                <div className="flex flex-between" style={{ padding: '1rem 0' }}>
                    <div><div style={{ fontWeight: 500, color: 'var(--color-error)' }}>Reset Application</div><div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>This will wipe all data permanently!</div></div>
                    <button className="btn btn-danger" onClick={() => setShowClearConfirm(true)}><Trash2 size={16} />Clear Everything</button>
                </div>
            </div>

            {/* About */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header"><span className="card-title" style={{ fontSize: '1rem' }}>ℹ️ About MathNote</span></div>
                <div style={{ padding: '1rem 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <Settings size={28} />
                        </div>
                        <div>
                            <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '1.1rem', marginBottom: 2 }}>MathNote Desktop</p>
                            <p>Version 1.5.0 — Business Finance Manager</p>
                        </div>
                    </div>
                    <p style={{ marginBottom: '0.5rem' }}>Every Number. Clearly Noted.</p>
                    <p style={{ lineHeight: 1.5, marginBottom: '1rem' }}>
                        MathNote is a powerful, offline-first accounting and billing tool designed for small businesses.
                        Your data never leaves your computer, ensuring 100% privacy and lightning-fast performance.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <a href="mailto:raarthyraja@gmail.com" className="sidebar-link" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)' }}>
                            📧 Support: raarthyraja@gmail.com
                        </a>
                    </div>
                </div>
            </div>

            {/* Clear Confirm Dialog */}
            {showClearConfirm && (
                <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
                        <div style={{ padding: '2rem' }}>
                            <AlertTriangle size={48} color="var(--color-error)" style={{ marginBottom: '1rem', margin: '0 auto' }} />
                            <h2 style={{ marginBottom: '0.5rem' }}>Are you absolutely sure?</h2>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>This action cannot be undone. All your sales, expenses, credits, contacts, and products will be permanently deleted.</p>
                            <div className="flex gap-sm" style={{ justifyContent: 'center' }}>
                                <button className="btn btn-secondary" onClick={() => setShowClearConfirm(false)}>Go Back</button>
                                <button className="btn btn-danger" onClick={handleClear}><Trash2 size={16} />I understand, delete all</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsScreen;
