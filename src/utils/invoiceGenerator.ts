// Invoice HTML generator — used for Sales Invoice, Quotation, Purchase Order, Credit Note
import { BusinessProfile } from '../context/AuthContext';
import { Sale, Quotation, PurchaseOrder, SaleReturn, SaleItem, Settings } from './storage';

const numberToWords = (n: number): string => {
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const num = Math.floor(Math.abs(n));
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
};

const fmt = (n: number, currency: string) => `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface InvoiceData {
  type: 'invoice' | 'quotation' | 'purchase_order' | 'credit_note';
  docNumber: string;
  date: string;
  partyName: string;
  partyAddress?: string;
  partyState?: string;
  partyGSTIN?: string;
  partyPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal?: number;
  discountType?: 'percent' | 'flat';
  taxTotal: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  gstRate?: number;
  grandTotal: number;
  paidAmount?: number;
  paymentMethod?: string;
  terms?: string;
  validUntil?: string;
  note?: string;
  qrCodeDataUrl?: string;
}

export function generateInvoiceHTML(
  data: InvoiceData,
  profile: BusinessProfile,
  settings: Settings
): string {
  const currency = settings.currency || '₹';
  const titleMap = {
    invoice: 'TAX INVOICE',
    quotation: 'QUOTATION / ESTIMATE',
    purchase_order: 'PURCHASE ORDER',
    credit_note: 'CREDIT NOTE',
  };
  const title = titleMap[data.type];
  const balance = data.paidAmount !== undefined ? data.grandTotal - data.paidAmount : 0;

  // Group by tax rates for GST Breakdown
  const taxBreakdown: Record<number, { taxableValue: number; cgst: number; sgst: number; igst: number; taxTotal: number }> = {};
  const gstEnabled = settings.taxType !== 'NON-GST';

  if (gstEnabled && data.items && data.items.length > 0) {
      data.items.forEach(item => {
          const rate = item.taxRate !== undefined ? item.taxRate : 18;
          if (rate === 0) return; // Skip 0% slab

          if (!taxBreakdown[rate]) {
              taxBreakdown[rate] = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, taxTotal: 0 };
          }

          const itemCGST = item.cgst !== undefined ? item.cgst : 0;
          const itemSGST = item.sgst !== undefined ? item.sgst : 0;
          const itemIGST = item.igst !== undefined ? item.igst : 0;
          const itemTaxTotal = item.taxTotal !== undefined ? item.taxTotal : (itemCGST + itemSGST + itemIGST);

          const taxableVal = item.taxableValue !== undefined ? item.taxableValue : (settings.taxMode === 'inclusive' ? (item.total - itemTaxTotal) : item.total);

          taxBreakdown[rate].taxableValue += taxableVal;
          taxBreakdown[rate].cgst += itemCGST;
          taxBreakdown[rate].sgst += itemSGST;
          taxBreakdown[rate].igst += itemIGST;
          taxBreakdown[rate].taxTotal += itemTaxTotal;
      });
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title} - ${data.docNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 12px; padding: 20px; }
  .invoice { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; }
  .header { display: flex; justify-content: space-between; padding: 20px 24px; border-bottom: 3px solid #6366f1; }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .logo-img { max-height: 60px; max-width: 120px; object-fit: contain; }
  .biz-name { font-size: 20px; font-weight: 700; color: #6366f1; }
  .biz-details { font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.5; }
  .doc-type { text-align: right; }
  .doc-type h2 { font-size: 18px; font-weight: 700; color: #6366f1; letter-spacing: 1px; }
  .doc-meta { font-size: 11px; color: #64748b; margin-top: 8px; }
  .doc-meta strong { color: #1e293b; }
  .parties { display: flex; border-bottom: 1px solid #e2e8f0; }
  .party { flex: 1; padding: 16px 24px; }
  .party:first-child { border-right: 1px solid #e2e8f0; }
  .party-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 6px; }
  .party-name { font-size: 14px; font-weight: 600; }
  .party-details { font-size: 11px; color: #64748b; line-height: 1.6; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .totals { display: flex; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid #e2e8f0; }
  .totals-table { width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .totals-row.grand { font-size: 16px; font-weight: 700; color: #6366f1; border-top: 2px solid #6366f1; padding-top: 8px; margin-top: 4px; }
  .words { padding: 12px 24px; background: #f8fafc; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  .words strong { color: #1e293b; }
  .bank-section { display: flex; border-top: 1px solid #e2e8f0; }
  .bank-details { flex: 1; padding: 16px 24px; font-size: 11px; }
  .bank-details h4 { font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; letter-spacing: 0.5px; }
  .terms { flex: 1; padding: 16px 24px; font-size: 11px; border-left: 1px solid #e2e8f0; }
  .terms h4 { font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; letter-spacing: 0.5px; }
  .footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; }
  .signature-line { border-top: 1px solid #94a3b8; width: 180px; text-align: center; padding-top: 6px; font-size: 11px; color: #64748b; }
  .balance-due { background: #fef2f2; color: #ef4444; padding: 8px 16px; border-radius: 6px; font-weight: 600; display: inline-block; }
  .paid-full { background: #f0fdf4; color: #10b981; padding: 8px 16px; border-radius: 6px; font-weight: 600; display: inline-block; }
  @media print { body { padding: 0; } .invoice { border: none; } }
</style>
</head>
<body>
<div class="invoice">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${profile.logoBase64 ? `<img src="${profile.logoBase64}" class="logo-img" />` : ''}
      <div>
        <div class="biz-name">${profile.businessName}</div>
        <div class="biz-details">
          ${profile.address ? profile.address + '<br>' : ''}${profile.city ? profile.city + ', ' : ''}${profile.state || ''}${profile.pincode ? ' - ' + profile.pincode : ''}
          ${profile.phone ? '<br>Ph: ' + profile.phone : ''}${profile.email ? ' | ' + profile.email : ''}
          ${profile.gstin ? '<br>GSTIN: ' + profile.gstin : ''}${profile.panNumber ? ' | PAN: ' + profile.panNumber : ''}
        </div>
      </div>
    </div>
    <div class="doc-type">
      <h2>${title}</h2>
      <div class="doc-meta">
        <strong>${data.type === 'quotation' ? 'Quotation' : data.type === 'purchase_order' ? 'PO' : 'Invoice'} #:</strong> ${data.docNumber}<br>
        <strong>Date:</strong> ${data.date}
        ${data.validUntil ? '<br><strong>Valid Until:</strong> ' + data.validUntil : ''}
      </div>
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <div class="party-label">${data.type === 'purchase_order' ? 'Vendor' : 'Bill To'}</div>
      <div class="party-name">${data.partyName || 'Walk-in Customer'}</div>
      <div class="party-details">
        ${data.partyAddress || ''}
        ${data.partyState ? '<br>State: ' + data.partyState : ''}
        ${data.partyGSTIN ? '<br>GSTIN: ' + data.partyGSTIN : ''}
        ${data.partyPhone ? '<br>Phone: ' + data.partyPhone : ''}
      </div>
    </div>
    <div class="party">
      <div class="party-label">${data.type === 'purchase_order' ? 'Ship To' : 'From'}</div>
      <div class="party-name">${profile.businessName}</div>
      <div class="party-details">
        ${profile.address || ''}
        ${profile.state ? '<br>State: ' + profile.state : ''}
        ${profile.gstin ? '<br>GSTIN: ' + profile.gstin : ''}
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Item</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Rate</th>
        ${data.discountTotal ? '<th class="text-right">Discount</th>' : ''}
        ${settings.taxType !== 'NON-GST' ? '<th class="text-center" style="width:60px">GST %</th>' : ''}
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          ${item.brand ? `<span style="font-size: 9px; color: #6366f1; font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 2px;">${item.brand}</span>` : ''}
          <strong>${item.productName}</strong>
          ${item.hsnCode ? '<br><span style="color:#94a3b8;font-size:10px">HSN: ' + item.hsnCode + '</span>' : ''}
        </td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">${fmt(item.price, currency)}</td>
        ${data.discountTotal ? `<td class="text-right">${item.discount ? (item.discountType === 'percent' ? item.discount + '%' : fmt(item.discount, currency)) : '-'}</td>` : ''}
        ${settings.taxType !== 'NON-GST' ? `<td class="text-center">${item.taxRate !== undefined ? item.taxRate : 18}%</td>` : ''}
        <td class="text-right">${fmt(item.total, currency)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-table">
      <div class="totals-row"><span>Subtotal</span><span>${fmt(data.subtotal, currency)}</span></div>
      ${data.discountTotal ? `<div class="totals-row"><span>Discount</span><span>-${fmt(data.discountTotal, currency)}</span></div>` : ''}
      ${Object.keys(taxBreakdown).length > 0 ? (
        !data.igst ? 
          Object.entries(taxBreakdown).map(([rate, vals]) => vals.cgst ? `
            <div class="totals-row"><span>CGST (${parseFloat(rate) / 2}%)</span><span>${fmt(vals.cgst, currency)}</span></div>
            <div class="totals-row"><span>SGST (${parseFloat(rate) / 2}%)</span><span>${fmt(vals.sgst, currency)}</span></div>
          ` : '').join('')
          : 
          Object.entries(taxBreakdown).map(([rate, vals]) => vals.igst ? `
            <div class="totals-row"><span>IGST (${rate}%)</span><span>${fmt(vals.igst, currency)}</span></div>
          ` : '').join('')
      ) : `
        ${data.cgst ? `<div class="totals-row"><span>CGST (${(data.gstRate || 0) / 2}%)</span><span>${fmt(data.cgst, currency)}</span></div>` : ''}
        ${data.sgst ? `<div class="totals-row"><span>SGST (${(data.gstRate || 0) / 2}%)</span><span>${fmt(data.sgst, currency)}</span></div>` : ''}
        ${data.igst ? `<div class="totals-row"><span>IGST (${data.gstRate || 0}%)</span><span>${fmt(data.igst, currency)}</span></div>` : ''}
      `}
      <div class="totals-row grand"><span>Grand Total</span><span>${fmt(data.grandTotal, currency)}</span></div>
      ${data.paidAmount !== undefined ? `
      <div class="totals-row"><span>Paid (${data.paymentMethod || 'Cash'})</span><span>${fmt(data.paidAmount, currency)}</span></div>
      <div class="totals-row"><span>Balance Due</span><span style="color:${balance > 0 ? '#ef4444' : '#10b981'}">${fmt(balance, currency)}</span></div>
      ` : ''}
    </div>
  </div>

  <!-- Amount in Words -->
  <div class="words">
    <strong>Amount in Words:</strong> ${numberToWords(Math.round(data.grandTotal))} Rupees Only
  </div>

  <!-- GST Tax Summary Breakdown -->
  ${Object.keys(taxBreakdown).length > 0 ? `
  <div style="padding: 12px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc;">
    <h4 style="font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px;">GST Tax Summary Breakdown</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <th style="background: transparent; padding: 4px 0; font-size: 10px; text-align: left; color: #64748b;">GST Rate</th>
          <th style="background: transparent; padding: 4px 0; font-size: 10px; text-align: right; color: #64748b;">Taxable Value</th>
          ${!data.igst ? `
          <th style="background: transparent; padding: 4px 0; font-size: 10px; text-align: right; color: #64748b;">CGST</th>
          <th style="background: transparent; padding: 4px 0; font-size: 10px; text-align: right; color: #64748b;">SGST</th>
          ` : `
          <th style="background: transparent; padding: 4px 0; font-size: 10px; text-align: right; color: #64748b;">IGST</th>
          `}
          <th style="background: transparent; padding: 4px 0; font-size: 10px; text-align: right; color: #64748b;">Total Tax</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(taxBreakdown).map(([rate, vals]) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; font-weight: 600;">GST ${rate}%</td>
          <td style="padding: 6px 0;" class="text-right">${fmt(vals.taxableValue, currency)}</td>
          ${!data.igst ? `
          <td style="padding: 6px 0;" class="text-right">${fmt(vals.cgst, currency)} (${parseFloat(rate)/2}%)</td>
          <td style="padding: 6px 0;" class="text-right">${fmt(vals.sgst, currency)} (${parseFloat(rate)/2}%)</td>
          ` : `
          <td style="padding: 6px 0;" class="text-right">${fmt(vals.igst, currency)} (${rate}%)</td>
          `}
          <td style="padding: 6px 0; font-weight: 700;" class="text-right">${fmt(vals.taxTotal, currency)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Bank & Terms -->
  ${(settings.bankName || settings.upiId || data.terms || settings.invoiceTerms) ? `
  <div class="bank-section">
    ${(settings.bankName || settings.upiId) ? `
    <div class="bank-details" style="display: flex; gap: 16px; align-items: center;">
      <div style="flex: 1;">
        <h4>Payment Details</h4>
        ${settings.bankName ? `Bank: ${settings.bankName}<br>` : ''}
        ${settings.bankAccountNumber ? `A/C No: ${settings.bankAccountNumber}<br>` : ''}
        ${settings.bankIFSC ? `IFSC: ${settings.bankIFSC}<br>` : ''}
        ${settings.upiId ? `UPI: ${settings.upiId}` : ''}
      </div>
      ${data.qrCodeDataUrl ? `
      <div style="text-align: center; flex-shrink: 0;">
        <img src="${data.qrCodeDataUrl}" style="width: 80px; height: 80px; display: block; margin: 0 auto 4px;" />
        <span style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">Scan to Pay</span>
      </div>
      ` : ''}
    </div>
    ` : ''}
    <div class="terms">
      <h4>Terms & Conditions</h4>
      ${data.terms || settings.invoiceTerms || 'Thank you for your business.'}
      ${profile.taxType === 'Composition' ? '<br><br><strong>Composition taxable person, not eligible to collect tax on supplies</strong>' : ''}
    </div>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <div style="font-size:10px; color:#94a3b8;">
      ${data.paidAmount !== undefined ? (balance > 0 ? `<span class="balance-due">Balance Due: ${fmt(balance, currency)}</span>` : '<span class="paid-full">✓ Paid in Full</span>') : ''}
    </div>
    <div class="signature-line">
      Authorized Signatory<br>${profile.businessName}
    </div>
  </div>
</div>
</body>
</html>`;
}

export function printInvoice(html: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// Helper to convert Sale/Quotation/PO to InvoiceData
export function saleToInvoiceData(sale: Sale): InvoiceData {
  return {
    type: 'invoice',
    docNumber: sale.invoiceNumber || '—',
    date: sale.date,
    partyName: sale.customerName,
    partyAddress: sale.customerAddress,
    partyState: sale.customerState,
    partyGSTIN: sale.customerGSTIN,
    partyPhone: sale.customerPhone,
    items: sale.items || [],
    subtotal: sale.subtotal || sale.totalAmount,
    discountTotal: sale.discountTotal,
    discountType: sale.discountType,
    taxTotal: sale.taxTotal || 0,
    cgst: sale.cgst,
    sgst: sale.sgst,
    igst: sale.igst,
    gstRate: sale.gstRate,
    grandTotal: sale.totalAmount,
    paidAmount: sale.paidAmount,
    paymentMethod: sale.paymentMethod,
  };
}

export function quotationToInvoiceData(q: Quotation): InvoiceData {
  return {
    type: 'quotation',
    docNumber: q.quotationNumber,
    date: q.date,
    partyName: q.customerName,
    partyAddress: q.customerAddress,
    partyState: q.customerState,
    partyGSTIN: q.customerGSTIN,
    partyPhone: q.customerPhone,
    items: q.items,
    subtotal: q.subtotal,
    discountTotal: q.discountTotal,
    discountType: q.discountType,
    taxTotal: q.taxTotal,
    cgst: q.cgst,
    sgst: q.sgst,
    igst: q.igst,
    gstRate: q.gstRate,
    grandTotal: q.grandTotal,
    validUntil: q.validUntil,
    terms: q.terms,
  };
}

export function poToInvoiceData(po: PurchaseOrder): InvoiceData {
  return {
    type: 'purchase_order',
    docNumber: po.poNumber,
    date: po.date,
    partyName: po.vendorName,
    partyState: po.vendorState,
    items: po.items,
    subtotal: po.subtotal,
    taxTotal: po.taxTotal,
    cgst: po.cgst,
    sgst: po.sgst,
    igst: po.igst,
    gstRate: po.gstRate,
    grandTotal: po.grandTotal,
    note: po.note,
  };
}

export function returnToInvoiceData(ret: SaleReturn, sale: Sale): InvoiceData {
  return {
    type: 'credit_note',
    docNumber: `CN-${ret.id.slice(0, 8)}`,
    date: ret.date,
    partyName: ret.party,
    items: ret.items || [],
    subtotal: ret.amount,
    taxTotal: 0,
    grandTotal: ret.amount,
    note: ret.note,
  };
}

export function generateWhatsAppMessage(data: InvoiceData, profile: BusinessProfile, settings: Settings): string {
  const currency = settings.currency || '₹';
  const titleMap = {
    invoice: 'Invoice',
    quotation: 'Quotation',
    purchase_order: 'Purchase Order',
    credit_note: 'Credit Note',
  };
  const title = titleMap[data.type];

  let message = `*${title} from ${profile.businessName}*\n\n`;
  message += `*No:* ${data.docNumber}\n`;
  message += `*Date:* ${data.date}\n`;
  message += `*Customer:* ${data.partyName || 'Walk-in'}\n\n`;

  message += `*Items:*\n`;
  data.items.slice(0, 10).forEach(item => {
    message += `- ${item.productName} (${item.quantity} x ${fmt(item.price, currency)})\n`;
  });
  if (data.items.length > 10) message += `- ...and ${data.items.length - 10} more items\n`;

  message += `\n*Grand Total: ${fmt(data.grandTotal, currency)}*\n`;

  if (data.paidAmount !== undefined) {
    const balance = data.grandTotal - data.paidAmount;
    message += `*Paid Amount:* ${fmt(data.paidAmount, currency)}\n`;
    if (balance > 0) message += `*Balance Due:* ${fmt(balance, currency)}\n`;
    else message += `*Status:* Paid in Full ✅\n`;
  }

  if (settings.upiId) {
    message += `\n*Pay via UPI:* ${settings.upiId}\n`;
  }

  message += `\nThank you for your business!`;

  return encodeURIComponent(message);
}
