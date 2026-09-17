import React, { useState } from 'react';
import {
  Printer,
  Share2,
  Check,
  X,
  Building2,
  Phone,
  Calendar,
  User,
  Download,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { Sale, BusinessProfile } from '../types';
import {
  formatMoney,
  formatDate,
  buildWhatsAppReceiptUrl,
  downloadHtmlFile,
} from '../utils/formatters';

interface ReceiptModalProps {
  isOpen: boolean;
  sale: Sale | null;
  business: BusinessProfile;
  onClose: () => void;
  onNewSale?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  sale,
  business,
  onClose,
  onNewSale,
}) => {
  const [copiedToast, setCopiedToast] = useState(false);

  if (!isOpen || !sale) return null;

  const defaultBank = business.bankAccounts.find((b) => b.isDefault) || business.bankAccounts[0];
  const whatsAppUrl = buildWhatsAppReceiptUrl(sale, business);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    window.open(whatsAppUrl, '_blank');
  };

  const handleCopyReceiptText = () => {
    let itemsText = sale.items
      .map(
        (item) =>
          `• ${item.productName} (x${item.quantity}) - ${formatMoney(item.subtotal, business, true)}`
      )
      .join('\n');

    let msg = `🧾 *SALES RECEIPT — ${business.name.toUpperCase()}*\n` +
      `--------------------------------\n` +
      `📄 Receipt: *${sale.receiptNumber}*\n` +
      `📅 Date: ${formatDate(sale.createdAt)}\n` +
      `👤 Cashier: ${sale.staffName}\n` +
      (sale.customerName ? `🧑 Customer: ${sale.customerName}\n` : '') +
      `--------------------------------\n` +
      `*ITEMS:*\n${itemsText}\n` +
      `--------------------------------\n` +
      `Subtotal: ${formatMoney(sale.subtotal, business, true)}\n` +
      (sale.discountAmount > 0 ? `Discount: -${formatMoney(sale.discountAmount, business, true)}\n` : '') +
      (sale.taxAmount > 0 ? `VAT/Tax: +${formatMoney(sale.taxAmount, business, true)}\n` : '') +
      `💰 *TOTAL AMOUNT:* *${formatMoney(sale.totalAmount, business, true)}*\n` +
      `💳 Payment Mode: ${sale.paymentMethod.toUpperCase()}${sale.isCredit ? ' (CREDIT/DEBT)' : ''}\n` +
      `--------------------------------\n` +
      `📍 ${business.address}, ${business.city}, ${business.state}\n` +
      `📞 ${business.phone}\n` +
      (defaultBank ? `🏦 Bank: ${defaultBank.bankName} - ${defaultBank.accountNumber} (${defaultBank.accountName})\n` : '') +
      `\n_${business.receiptFooterMessage || 'Thank you for your patronage!'}_`;

    navigator.clipboard.writeText(msg);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleDownloadReceiptHtml = () => {
    const itemsHtml = sale.items
      .map(
        (item) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
          <div>
            <strong>${item.productName}</strong><br>
            <span style="color: #64748b; font-size: 10px;">${item.quantity} x ${formatMoney(item.unitPrice, business, true)}</span>
          </div>
          <div style="font-weight: bold; font-family: monospace;">${formatMoney(item.subtotal, business, true)}</div>
        </div>
      `
      )
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${sale.receiptNumber} - ${business.name}</title>
  <style>
    @page { size: 80mm auto; margin: 5mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      color: #0f172a;
      background: #f8fafc;
      padding: 20px;
    }
    .receipt-box {
      max-width: 320px;
      margin: 0 auto;
      background: #ffffff;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .header { text-align: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 12px; }
    .logo { font-size: 28px; margin-bottom: 4px; }
    .biz-name { font-size: 16px; font-weight: 800; text-transform: uppercase; }
    .biz-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
    .meta-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: #475569; }
    .items-section { border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 10px; }
    .totals-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: #475569; }
    .grand-total {
      display: flex; justify-content: space-between; font-size: 14px; font-weight: 900;
      color: #0f172a; border-top: 1px solid #0f172a; padding-top: 6px; margin-top: 6px;
    }
    .footer { text-align: center; font-size: 10px; color: #64748b; margin-top: 12px; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .receipt-box { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: center; margin-bottom: 12px;">
    <button onclick="window.print()" style="background: #0f172a; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">🖨️ Print Receipt</button>
  </div>
  <div class="receipt-box">
    <div class="header">
      <div class="logo">${business.logoEmoji || '🏬'}</div>
      <div class="biz-name">${business.name}</div>
      ${business.tagline ? `<div class="biz-sub">${business.tagline}</div>` : ''}
      <div class="biz-sub">${business.address}, ${business.city}</div>
      <div class="biz-sub">Tel: ${business.phone}</div>
      ${business.cacNumber ? `<div class="biz-sub">CAC: ${business.cacNumber}</div>` : ''}
    </div>

    <div style="border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 10px;">
      <div class="meta-row"><span>Receipt #:</span> <strong>${sale.receiptNumber}</strong></div>
      <div class="meta-row"><span>Date:</span> <span>${formatDate(sale.createdAt)}</span></div>
      <div class="meta-row"><span>Cashier:</span> <span>${sale.staffName}</span></div>
      ${sale.customerName ? `<div class="meta-row"><span>Customer:</span> <strong>${sale.customerName}</strong></div>` : ''}
    </div>

    <div class="items-section">
      ${itemsHtml}
    </div>

    <div style="border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 10px;">
      <div class="totals-row"><span>Subtotal:</span> <span>${formatMoney(sale.subtotal, business, true)}</span></div>
      ${sale.discountAmount > 0 ? `<div class="totals-row" style="color: #16a34a;"><span>Discount:</span> <span>-${formatMoney(sale.discountAmount, business, true)}</span></div>` : ''}
      ${sale.taxAmount > 0 ? `<div class="totals-row"><span>VAT/Tax:</span> <span>+${formatMoney(sale.taxAmount, business, true)}</span></div>` : ''}
      <div class="grand-total">
        <span>TOTAL:</span>
        <span style="font-family: monospace;">${formatMoney(sale.totalAmount, business, true)}</span>
      </div>
      <div class="totals-row" style="margin-top: 6px;">
        <span>Payment:</span>
        <strong style="text-transform: uppercase;">${sale.paymentMethod} ${sale.isCredit ? '(DEBT)' : ''}</strong>
      </div>
    </div>

    <div class="footer">
      <p style="font-style: italic;">${business.receiptFooterMessage || 'Thank you for your patronage!'}</p>
      <p style="font-size: 8px; margin-top: 4px; text-transform: uppercase;">Business OS • Simpler Business Onchain (Powered by Solana)</p>
    </div>
  </div>
</body>
</html>`;

    downloadHtmlFile(htmlContent, `Receipt_${sale.receiptNumber}.html`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-black text-sm sm:text-base text-slate-900">Sale Receipt Generated</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60">
          <div
            id="printable-receipt"
            className="bg-white text-slate-900 rounded-xl p-5 shadow-xs border border-slate-200 text-xs font-mono select-text"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
              <div className="text-2xl mb-1">{business.logoEmoji || '🏬'}</div>
              <h2 className="text-base font-black uppercase tracking-wider text-slate-900 font-sans">
                {business.name}
              </h2>
              {business.tagline && (
                <p className="text-[11px] text-slate-500 italic font-sans">{business.tagline}</p>
              )}
              <p className="text-[10px] text-slate-600 mt-1">
                {business.address}, {business.city}, {business.state}
              </p>
              <p className="text-[10px] text-slate-600">Tel: {business.phone}</p>
              {business.cacNumber && (
                <p className="text-[9px] text-slate-400">CAC: {business.cacNumber}</p>
              )}
            </div>

            {/* Receipt Meta */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2 mb-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt #:</span>
                <span className="font-bold">{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span>{formatDate(sale.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cashier:</span>
                <span>{sale.staffName}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-bold">{sale.customerName}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="border-b border-dashed border-slate-300 pb-2 mb-2">
              <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase pb-1 border-b border-slate-100">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-4 text-right">Price</span>
              </div>
              <div className="divide-y divide-slate-100 mt-1">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-1.5 text-[11px] leading-tight">
                    <div className="col-span-6 pr-1 font-sans">
                      <p className="font-bold text-slate-800 truncate">{item.productName}</p>
                      <p className="text-[10px] text-slate-400">@{formatMoney(item.unitPrice, business, true)}/{item.unit || 'pc'}</p>
                    </div>
                    <div className="col-span-2 text-center font-bold">x{item.quantity}</div>
                    <div className="col-span-4 text-right font-black text-slate-900">
                      {formatMoney(item.subtotal, business, true)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Summary */}
            <div className="space-y-1 text-xs border-b border-dashed border-slate-300 pb-2 mb-3">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{formatMoney(sale.subtotal, business, true)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount:</span>
                  <span>-{formatMoney(sale.discountAmount, business, true)}</span>
                </div>
              )}
              {sale.taxAmount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>VAT / Tax:</span>
                  <span>+{formatMoney(sale.taxAmount, business, true)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-950 pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{formatMoney(sale.totalAmount, business, true)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                <span>Payment:</span>
                <span className="font-bold uppercase tracking-wider">
                  {sale.paymentMethod} {sale.isCredit ? '(DEBT)' : ''}
                </span>
              </div>
              {sale.bankTransferReference && (
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Ref:</span>
                  <span>{sale.bankTransferReference}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-400 space-y-1">
              {defaultBank && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left mb-2">
                  <p className="font-bold text-slate-700 text-[10px]">Bank Transfer Details:</p>
                  <p className="text-[10px] font-mono text-slate-900 font-semibold">{defaultBank.bankName}</p>
                  <p className="text-[11px] font-bold font-mono text-slate-900">{defaultBank.accountNumber}</p>
                  <p className="text-[9px] text-slate-500">{defaultBank.accountName}</p>
                </div>
              )}
              <p className="italic font-sans text-slate-600">{business.receiptFooterMessage}</p>
              <p className="font-bold text-[9px] text-slate-400 mt-1 uppercase tracking-widest">
                *** BUSINESS OS • ONCHAIN SOLANA ***
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-wrap gap-2 justify-end">
          <button
            id="btn-share-receipt-whatsapp"
            onClick={handleWhatsAppShare}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition active:scale-95 shadow-xs cursor-pointer"
            title="Share directly to Customer on WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleCopyReceiptText}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Copy formatted receipt text"
          >
            {copiedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedToast ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownloadReceiptHtml}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Download printable HTML / PDF receipt"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
          
          <button
            id="btn-print-receipt"
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs border border-slate-200 transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            id="btn-close-receipt-modal"
            onClick={() => {
              onClose();
              if (onNewSale) onNewSale();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Next Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
};
