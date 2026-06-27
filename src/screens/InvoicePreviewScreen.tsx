import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, X, FileText, Layout, Maximize2, ChevronLeft, MessageSquare, Share2, FileDown } from 'lucide-react';
import { useApp } from '../context';
import { useAuth } from '../context/AuthContext';
import { generateInvoiceHTML, saleToInvoiceData, quotationToInvoiceData, poToInvoiceData, returnToInvoiceData, InvoiceData, generateWhatsAppMessage } from '../utils/invoiceGenerator';
import { InvoiceTemplate, InvoicePrintSize } from '../utils/storage';
import QRCode from 'qrcode';

const InvoicePreviewScreen: React.FC = () => {
    const { state } = useApp();
    const { profile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Data can come from location state
    const { sourceData, type } = (location.state as { sourceData: any, type: 'sale' | 'quotation' | 'po' | 'return' }) || {};

    const [template, setTemplate] = useState<InvoiceTemplate>(state.settings.invoiceTemplate || 'modern');
    const [printSize, setPrintSize] = useState<InvoicePrintSize>(state.settings.invoicePrintSize || 'A4');
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

    const invoiceData = useMemo(() => {
        if (!sourceData) return null;
        let baseData: InvoiceData | null = null;
        if (type === 'sale') baseData = saleToInvoiceData(sourceData);
        else if (type === 'quotation') baseData = quotationToInvoiceData(sourceData);
        else if (type === 'po') baseData = poToInvoiceData(sourceData);
        else if (type === 'return') baseData = returnToInvoiceData(sourceData, state.sales.find(s => s.id === sourceData.saleId)!);
        
        if (baseData) {
            return {
                ...baseData,
                qrCodeDataUrl: qrCodeUrl || undefined
            };
        }
        return null;
    }, [sourceData, type, state.sales, qrCodeUrl]);

    useEffect(() => {
        if (!sourceData) return;
        let baseData: InvoiceData | null = null;
        if (type === 'sale') baseData = saleToInvoiceData(sourceData);
        else if (type === 'quotation') baseData = quotationToInvoiceData(sourceData);
        else if (type === 'po') baseData = poToInvoiceData(sourceData);
        else if (type === 'return') baseData = returnToInvoiceData(sourceData, state.sales.find(s => s.id === sourceData.saleId)!);

        if (state.settings.upiId && baseData) {
            const upiUrl = `upi://pay?pa=${state.settings.upiId}&pn=${encodeURIComponent(profile?.businessName || '')}&am=${baseData.grandTotal}&tr=${baseData.docNumber}&tn=Invoice_${baseData.docNumber}`;
            QRCode.toDataURL(upiUrl, { width: 150, margin: 1 })
                .then(url => setQrCodeUrl(url))
                .catch(err => console.error('QR code generation failed', err));
        } else {
            setQrCodeUrl('');
        }
    }, [state.settings.upiId, sourceData, type, state.sales, profile]);

    const html = useMemo(() => {
        if (!invoiceData || !profile) return '';
        // Note: The generateInvoiceHTML in desktop might not support template/size yet
        // We'll need to update it in Phase 3/4 if needed, but for now we'll use it
        return generateInvoiceHTML(invoiceData, profile, {
            ...state.settings,
            invoiceTemplate: template,
            invoicePrintSize: printSize
        });
    }, [invoiceData, profile, state.settings, template, printSize]);

    const handlePrint = () => {
        const iframe = document.getElementById('invoice-frame') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }
    };

    const handleWhatsAppShare = () => {
        if (!invoiceData || !profile) return;
        const message = generateWhatsAppMessage(invoiceData, profile, state.settings);
        const phone = invoiceData.partyPhone ? invoiceData.partyPhone.replace(/\D/g, '') : '';
        const url = `https://wa.me/${phone}?text=${message}`;
        window.open(url, '_blank');
    };

    const handleExportPDF = async () => {
        if (!invoiceData) return;
        const fileName = `${invoiceData.docNumber}_${invoiceData.partyName.replace(/\s+/g, '_')}.pdf`;
        try {
            const result = await window.electronAPI.exportPDF(fileName, html, printSize);
            if (result.success) {
                // Success feedback if needed
            } else if (result.error) {
                alert(`Export failed: ${result.error}`);
            }
        } catch (error) {
            console.error('PDF Export Error:', error);
            alert('An unexpected error occurred during PDF export.');
        }
    };

    if (!sourceData || !invoiceData) {
        return (
            <div className="empty-state">
                <FileText size={48} />
                <h3>No data to preview</h3>
                <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
            </div>
        );
    }

    return (
        <div className="animate-in" style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
                    <div>
                        <h1>Invoice Preview</h1>
                        <p>{invoiceData.docNumber} · {invoiceData.partyName}</p>
                    </div>
                </div>
                <div className="flex gap-sm">
                    <button className="btn btn-secondary" onClick={handleExportPDF}>
                        <FileDown size={18} /> Save as PDF
                    </button>
                    <button className="btn btn-secondary" onClick={handleWhatsAppShare}>
                        <Share2 size={18} /> Share WhatsApp
                    </button>
                    <button className="btn btn-primary" onClick={handlePrint}>
                        <Printer size={18} /> Print Invoice
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
                {/* Controls Sidebar */}
                <div className="card" style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Layout size={16} /> Template
                        </label>
                        <div className="flex flex-col gap-xs" style={{ marginTop: '0.5rem' }}>
                            {(['classic', 'modern', 'minimal'] as const).map(t => (
                                <button
                                    key={t}
                                    className={`sidebar-link ${template === t ? 'active' : ''}`}
                                    onClick={() => setTemplate(t)}
                                    style={{ width: '100%', justifyContent: 'flex-start', border: '1px solid var(--color-border)' }}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Maximize2 size={16} /> Print Size
                        </label>
                        <select
                            className="form-input"
                            value={printSize}
                            onChange={e => setPrintSize(e.target.value as InvoicePrintSize)}
                            style={{ marginTop: '0.5rem' }}
                        >
                            <option value="A4">A4 Paper</option>
                            <option value="A5">A5 Paper</option>
                            <option value="thermal80">Thermal 80mm</option>
                            <option value="thermal58">Thermal 58mm</option>
                        </select>
                    </div>

                    <div style={{ marginTop: 'auto', padding: '1rem', background: 'var(--color-bg-alt)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        <p style={{ margin: 0 }}>**Tip:** Use Ctrl+P if the print button doesn't work. For thermal printers, ensure "Margins: None" is selected in the print dialog.</p>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', background: '#f1f5f9', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        width: printSize === 'A4' ? '210mm' : printSize === 'A5' ? '148mm' : '80mm',
                        height: '100%',
                        background: 'white',
                        boxShadow: '0 0 20px rgba(0,0,0,0.1)',
                        margin: '0 auto',
                        overflow: 'hidden'
                    }}>
                        <iframe
                            id="invoice-frame"
                            title="Invoice Preview"
                            srcDoc={html}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewScreen;
