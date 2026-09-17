import { BusinessProfile, Sale, DebtRecord, Invoice, Customer } from '../types';

export function formatMoney(
  amount: number | undefined | null,
  business?: Partial<BusinessProfile> | null,
  forceSymbol: boolean = false
): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const formatted = num.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const showSymbol = forceSymbol || (business ? business.showCurrencySymbol !== false : true);
  const symbol = business?.currencySymbol ?? '₦';

  if (!showSymbol) {
    return formatted;
  }
  return `${symbol}${formatted}`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString: string | undefined | null): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const yr = String(now.getFullYear()).slice(-2);
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `REC-${yr}${mo}${day}-${rand}`;
}

export function generateInvoiceNumber(existingCount: number = 0): string {
  const year = new Date().getFullYear();
  const num = String(existingCount + 1).padStart(4, '0');
  return `INV-${year}-${num}`;
}

export function cleanPhoneNumber(phone: string): string {
  // Convert 080... to 23480... for international WhatsApp links
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    return '234' + digits.slice(1);
  }
  if (digits.startsWith('234')) {
    return digits;
  }
  return digits;
}

export function buildWhatsAppDebtReminderUrl(
  debt: DebtRecord,
  business: BusinessProfile,
  tone: 'polite' | 'standard' | 'firm' = 'polite'
): string {
  const cleanPhone = cleanPhoneNumber(debt.customerPhone);
  const amountStr = formatMoney(debt.balanceDue, business, true);
  const defaultBank = business.bankAccounts.find((b) => b.isDefault) || business.bankAccounts[0];

  let message = '';
  if (tone === 'polite') {
    message = `Hello ${debt.customerName},\n\n` +
      `Trust you are doing great today. This is a gentle reminder from *${business.name}* regarding your outstanding balance of *${amountStr}*${debt.dueDate ? ` which is due on ${debt.dueDate}` : ''}.\n\n` +
      `Kindly find our payment details below for your transfer:\n` +
      `🏦 *Bank:* ${defaultBank?.bankName || 'Moniepoint'}\n` +
      `🔢 *Account No:* ${defaultBank?.accountNumber || '8123456789'}\n` +
      `👤 *Account Name:* ${defaultBank?.accountName || business.name}\n\n` +
      `Please send us a screenshot once payment is completed. Thank you for your continued patronage! 🙏`;
  } else if (tone === 'standard') {
    message = `Dear ${debt.customerName},\n\n` +
      `This is an official payment reminder from *${business.name}*.\n` +
      `You have a pending debt balance of *${amountStr}*${debt.receiptNumber ? ` (Receipt: ${debt.receiptNumber})` : ''}.\n\n` +
      `Please make payment to:\n` +
      `• Bank: ${defaultBank?.bankName}\n` +
      `• Acct No: ${defaultBank?.accountNumber}\n` +
      `• Name: ${defaultBank?.accountName}\n\n` +
      `Thank you for prompt settlement. Reach us on ${business.phone} for any inquiries.`;
  } else {
    message = `⚠️ *URGENT PAYMENT NOTICE*\n\n` +
      `Dear ${debt.customerName},\n` +
      `Your balance of *${amountStr}* at *${business.name}* is overdue.\n` +
      `We kindly request immediate settlement today into our account:\n` +
      `${defaultBank?.bankName} | ${defaultBank?.accountNumber} | ${defaultBank?.accountName}\n\n` +
      `Kindly reply with your payment receipt once transferred.`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppReceiptUrl(sale: Sale, business: BusinessProfile): string {
  const cleanPhone = sale.customerPhone ? cleanPhoneNumber(sale.customerPhone) : '';
  const defaultBank = business.bankAccounts.find((b) => b.isDefault) || business.bankAccounts[0];

  let itemsText = sale.items
    .map((item) => `• ${item.productName} (x${item.quantity}) - ${formatMoney(item.subtotal, business, true)}`)
    .join('\n');

  let message = `🧾 *SALES RECEIPT — ${business.name.toUpperCase()}*\n` +
    `--------------------------------\n` +
    `📄 Receipt: *${sale.receiptNumber}*\n` +
    `📅 Date: ${formatDate(sale.createdAt)}\n` +
    `👤 Cashier: ${sale.staffName}\n` +
    (sale.customerName ? `🧑 Customer: ${sale.customerName}\n` : '') +
    `--------------------------------\n` +
    `*ITEMS:*\n${itemsText}\n` +
    `--------------------------------\n` +
    `💰 *TOTAL PAID:* *${formatMoney(sale.totalAmount, business, true)}*\n` +
    `💳 Payment Mode: ${sale.paymentMethod.toUpperCase()}${sale.isCredit ? ' (CREDIT RECORDED)' : ''}\n` +
    `--------------------------------\n` +
    `📍 ${business.address}, ${business.city}, ${business.state}\n` +
    `📞 ${business.phone}\n` +
    (defaultBank ? `🏦 Bank: ${defaultBank.bankName} - ${defaultBank.accountNumber} (${defaultBank.accountName})\n` : '') +
    `\n_${business.receiptFooterMessage}_`;

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppInvoiceMessage(
  invoice: Invoice,
  business: BusinessProfile,
  tone: 'standard' | 'formal' | 'reminder' = 'standard'
): string {
  const docTypeLabels: Record<string, string> = {
    invoice: 'TAX INVOICE',
    proforma: 'PROFORMA INVOICE',
    quotation: 'QUOTATION / ESTIMATE',
    receipt: 'PAYMENT RECEIPT',
  };
  const docTitle = docTypeLabels[invoice.documentType || 'invoice'] || 'INVOICE';
  const defaultBank = invoice.bankDetails || business.bankAccounts.find((b) => b.isDefault) || business.bankAccounts[0];

  const itemsText = invoice.items
    .map(
      (i, idx) =>
        `${idx + 1}. *${i.description}* (x${i.quantity} ${i.unit || 'pcs'} @ ${formatMoney(i.unitPrice, business, true)}) = *${formatMoney(i.amount, business, true)}*`
    )
    .join('\n');

  let headerIntro = `📄 *${docTitle} — ${business.name.toUpperCase()}*`;
  if (business.tagline) {
    headerIntro += `\n_${business.tagline}_`;
  }

  let statusBadge = '⏳ PENDING PAYMENT';
  if (invoice.status === 'paid' || invoice.balanceDue === 0) {
    statusBadge = '✅ FULLY PAID';
  } else if (invoice.status === 'partial' || invoice.amountPaid > 0) {
    statusBadge = `🟡 PARTIALLY PAID (Paid: ${formatMoney(invoice.amountPaid, business, true)})`;
  } else if (invoice.status === 'overdue') {
    statusBadge = '🚨 OVERDUE';
  }

  let message = `${headerIntro}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔢 *${docTitle} NO:* ${invoice.invoiceNumber}\n` +
    `📅 *Date Issued:* ${invoice.issueDate}\n` +
    (invoice.documentType !== 'receipt' ? `⏰ *Due Date:* ${invoice.dueDate}\n` : '') +
    `👤 *Billed To:* ${invoice.customerName}${invoice.customerCompany ? ` (${invoice.customerCompany})` : ''}\n` +
    `📞 *Customer Phone:* ${invoice.customerPhone}\n` +
    `📊 *Status:* ${statusBadge}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*PARTICULARS / ITEMS:*\n${itemsText}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `• Subtotal: ${formatMoney(invoice.subtotal, business, true)}\n` +
    (invoice.discountAmount > 0 ? `• Discount (${invoice.discountPercent}%): -${formatMoney(invoice.discountAmount, business, true)}\n` : '') +
    (invoice.taxAmount > 0 ? `• VAT/Tax (${invoice.taxPercent}%): +${formatMoney(invoice.taxAmount, business, true)}\n` : '') +
    (invoice.shippingFee && invoice.shippingFee > 0 ? `• Delivery / Logistics: +${formatMoney(invoice.shippingFee, business, true)}\n` : '') +
    `💰 *TOTAL PAYABLE: ${formatMoney(invoice.totalAmount, business, true)}*\n` +
    (invoice.amountPaid > 0 ? `💵 Amount Paid: ${formatMoney(invoice.amountPaid, business, true)}\n` : '') +
    (invoice.balanceDue > 0
      ? `⚠️ *BALANCE DUE: ${formatMoney(invoice.balanceDue, business, true)}*\n`
      : `✅ *BALANCE DUE: ₦0.00 (SETTLED)*\n`) +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (invoice.balanceDue > 0 && defaultBank) {
    message += `*OFFICIAL SETTLEMENT ACCOUNT:*\n` +
      `🏦 *Bank:* ${defaultBank.bankName}\n` +
      `🔢 *Account No:* *${defaultBank.accountNumber}*\n` +
      `👤 *Account Name:* ${defaultBank.accountName}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  }

  if (invoice.notes) {
    message += `📝 *Notes:* ${invoice.notes}\n`;
  }
  if (invoice.terms) {
    message += `⚖️ *Terms:* ${invoice.terms}\n`;
  }

  message += `\n📍 ${business.address}, ${business.city}, ${business.state}\n` +
    `📞 Phone/WhatsApp: ${business.phone}\n` +
    (business.email ? `✉️ Email: ${business.email}\n` : '') +
    (business.cacNumber ? `🏢 Reg CAC: ${business.cacNumber}\n` : '') +
    `_Thank you for your business and partnership!_ 🙏`;

  return message;
}

export function buildWhatsAppInvoiceUrl(
  invoice: Invoice,
  business: BusinessProfile,
  tone: 'standard' | 'formal' | 'reminder' = 'standard'
): string {
  const cleanPhone = cleanPhoneNumber(invoice.customerPhone);
  const message = buildWhatsAppInvoiceMessage(invoice, business, tone);

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function generateInvoiceHtmlDocument(invoice: Invoice, business: BusinessProfile): string {
  const docTypeLabels: Record<string, string> = {
    invoice: 'TAX INVOICE',
    proforma: 'PROFORMA INVOICE',
    quotation: 'OFFICIAL QUOTATION',
    receipt: 'SALES RECEIPT',
  };
  const docTitle = docTypeLabels[invoice.documentType || 'invoice'] || 'TAX INVOICE';
  const defaultBank = invoice.bankDetails || business.bankAccounts.find((b) => b.isDefault) || business.bankAccounts[0];
  const isPaid = invoice.status === 'paid' || invoice.balanceDue === 0;

  const rows = invoice.items
    .map(
      (item, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px; text-align: center; color: #64748b; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">
          ${item.description}
          ${item.discountPercent ? `<div style="font-size: 10px; color: #10b981; font-weight: normal;">(Discount: ${item.discountPercent}%)</div>` : ''}
        </td>
        <td style="padding: 10px 12px; text-align: center; color: #334155; font-family: monospace;">${item.quantity} ${item.unit || 'pcs'}</td>
        <td style="padding: 10px 12px; text-align: right; color: #334155; font-family: monospace;">${formatMoney(item.unitPrice, business, true)}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">${formatMoney(item.amount, business, true)}</td>
      </tr>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} - ${invoice.invoiceNumber} - ${business.name}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 30px 20px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .biz-brand { max-width: 60%; }
    .biz-logo { font-size: 36px; line-height: 1; margin-bottom: 8px; }
    .biz-name { font-size: 22px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
    .biz-tagline { font-size: 12px; color: #64748b; font-style: italic; margin-bottom: 6px; }
    .biz-contact { font-size: 11px; color: #475569; line-height: 1.5; }
    .doc-meta { text-align: right; }
    .doc-title { font-size: 22px; font-weight: 900; color: #4f46e5; letter-spacing: 0.5px; margin-bottom: 4px; }
    .doc-number { font-family: monospace; font-size: 14px; font-weight: 700; color: #1e293b; }
    .doc-dates { font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.5; }
    
    .status-stamp {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 8px;
    }
    .stamp-paid { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .stamp-partial { background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }
    .stamp-pending { background: #ede9fe; color: #6d28d9; border: 1px solid #c4b5fd; }
    .stamp-overdue { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }

    .client-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
    }
    .client-info h4 { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .client-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .client-details { font-size: 11px; color: #475569; line-height: 1.5; margin-top: 2px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th {
      background: #f1f5f9;
      padding: 10px 12px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
    }

    .totals-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .bank-box {
      width: 48%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      font-size: 11px;
    }
    .bank-box h5 { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #4f46e5; margin-bottom: 6px; }
    .bank-row { display: flex; justify-content: space-between; margin-bottom: 4px; color: #334155; }
    .bank-highlight { font-weight: 800; font-family: monospace; color: #0f172a; font-size: 13px; }

    .totals-table { width: 45%; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9; }
    .grand-total {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      border-bottom: 2px solid #0f172a;
      border-top: 2px solid #0f172a;
      margin-top: 6px;
    }
    .balance-due {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      font-weight: 800;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 6px;
      padding: 6px 8px;
      margin-top: 8px;
    }

    .notes-terms {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 16px;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
      font-size: 11px;
      color: #94a3b8;
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; gap: 10px;">
    <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer;">🖨️ Print / Save as PDF</button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div class="biz-brand">
        <div class="biz-logo">${business.logoEmoji || '🏢'}</div>
        <div class="biz-name">${business.name}</div>
        ${business.tagline ? `<div class="biz-tagline">${business.tagline}</div>` : ''}
        <div class="biz-contact">
          ${business.address}, ${business.city}, ${business.state}<br>
          Tel: ${business.phone}${business.email ? ` • ${business.email}` : ''}<br>
          ${business.cacNumber ? `RC/CAC: ${business.cacNumber}` : ''} ${business.tinNumber ? `• TIN: ${business.tinNumber}` : ''}
        </div>
      </div>

      <div class="doc-meta">
        <div class="doc-title">${docTitle}</div>
        <div class="doc-number">#${invoice.invoiceNumber}</div>
        <div class="doc-dates">
          <strong>Issue Date:</strong> ${invoice.issueDate}<br>
          ${invoice.documentType !== 'receipt' ? `<strong>Due Date:</strong> ${invoice.dueDate}<br>` : ''}
        </div>
        <div>
          ${
            isPaid
              ? '<span class="status-stamp stamp-paid">✓ FULLY PAID</span>'
              : invoice.status === 'partial'
              ? '<span class="status-stamp stamp-partial">PARTIALLY PAID</span>'
              : invoice.status === 'overdue'
              ? '<span class="status-stamp stamp-overdue">OVERDUE</span>'
              : '<span class="status-stamp stamp-pending">PAYMENT PENDING</span>'
          }
        </div>
      </div>
    </div>

    <div class="client-box">
      <div class="client-info">
        <h4>BILLED TO / CUSTOMER:</h4>
        <div class="client-name">${invoice.customerName}</div>
        ${invoice.customerCompany ? `<div style="font-weight: 600; color: #475569; font-size: 12px;">${invoice.customerCompany}</div>` : ''}
        <div class="client-details">
          Phone: ${invoice.customerPhone}<br>
          ${invoice.customerEmail ? `Email: ${invoice.customerEmail}<br>` : ''}
          ${invoice.customerAddress ? `Address: ${invoice.customerAddress}` : ''}
        </div>
      </div>
      <div style="text-align: right; font-size: 11px; color: #64748b;">
        <div><strong>Currency:</strong> ${business.currencyCode || 'NGN'} (${business.currencySymbol})</div>
        <div><strong>Status:</strong> ${invoice.status.toUpperCase()}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Description</th>
          <th style="width: 90px; text-align: center;">Qty</th>
          <th style="width: 120px; text-align: right;">Unit Price</th>
          <th style="width: 130px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals-area">
      <div class="bank-box">
        ${
          defaultBank
            ? `
          <h5>OFFICIAL BANK TRANSFER DETAILS</h5>
          <div class="bank-row"><span>Bank Name:</span> <strong>${defaultBank.bankName}</strong></div>
          <div class="bank-row"><span>Account Number:</span> <span class="bank-highlight">${defaultBank.accountNumber}</span></div>
          <div class="bank-row"><span>Account Name:</span> <strong>${defaultBank.accountName}</strong></div>
          <div style="font-size: 10px; color: #64748b; margin-top: 6px;">Please use invoice #${invoice.invoiceNumber} as payment reference.</div>
        `
            : `<div style="color: #64748b; font-size: 11px;">Payment Method: Cash / Transfer upon receipt.</div>`
        }
      </div>

      <div class="totals-table">
        <div class="total-row"><span>Subtotal:</span> <strong style="font-family: monospace;">${formatMoney(invoice.subtotal, business, true)}</strong></div>
        ${
          invoice.discountAmount > 0
            ? `<div class="total-row" style="color: #16a34a;"><span>Discount (${invoice.discountPercent}%):</span> <strong style="font-family: monospace;">-${formatMoney(invoice.discountAmount, business, true)}</strong></div>`
            : ''
        }
        ${
          invoice.taxAmount > 0
            ? `<div class="total-row"><span>VAT / Tax (${invoice.taxPercent}%):</span> <strong style="font-family: monospace;">+${formatMoney(invoice.taxAmount, business, true)}</strong></div>`
            : ''
        }
        ${
          invoice.shippingFee && invoice.shippingFee > 0
            ? `<div class="total-row"><span>Logistics / Shipping:</span> <strong style="font-family: monospace;">+${formatMoney(invoice.shippingFee, business, true)}</strong></div>`
            : ''
        }
        <div class="grand-total">
          <span>TOTAL AMOUNT:</span>
          <span style="font-family: monospace; color: #4f46e5;">${formatMoney(invoice.totalAmount, business, true)}</span>
        </div>
        ${
          invoice.amountPaid > 0
            ? `<div class="total-row" style="color: #16a34a; font-weight: bold;"><span>Amount Paid:</span> <strong style="font-family: monospace;">${formatMoney(invoice.amountPaid, business, true)}</strong></div>`
            : ''
        }
        ${
          invoice.balanceDue > 0
            ? `<div class="balance-due"><span>BALANCE DUE:</span> <strong style="font-family: monospace;">${formatMoney(invoice.balanceDue, business, true)}</strong></div>`
            : `<div style="text-align: right; font-weight: bold; color: #16a34a; font-size: 12px; margin-top: 6px;">✓ ALL CLEAR / FULLY SETTLED</div>`
        }
      </div>
    </div>

    ${
      invoice.notes || invoice.terms
        ? `
      <div class="notes-terms">
        ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
        ${invoice.terms ? `<p style="margin-top: 4px;"><strong>Terms & Conditions:</strong> ${invoice.terms}</p>` : ''}
      </div>
    `
        : ''
    }

    <div class="footer">
      <p>Thank you for doing business with <strong>${business.name}</strong>!</p>
      <p style="font-size: 9px; margin-top: 4px;">Generated by Small Business OS • Official Commercial Invoice</p>
    </div>
  </div>
</body>
</html>`;
}

export function downloadHtmlFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildWhatsAppCustomerStatementUrl(
  customer: Customer,
  activeDebts: DebtRecord[],
  business: BusinessProfile
): string {
  const cleanPhone = cleanPhoneNumber(customer.phone);
  const defaultBank = business.bankAccounts.find((b) => b.isDefault) || business.bankAccounts[0];
  const totalBalance = customer.currentDebt;

  const debtItemsList = activeDebts
    .filter((d) => d.balanceDue > 0)
    .map((d) => `• ${d.notes || 'Purchase'}${d.receiptNumber ? ` (#${d.receiptNumber})` : ''} - Bal: ${formatMoney(d.balanceDue, business, true)}${d.dueDate ? ` (Due: ${d.dueDate})` : ''}`)
    .join('\n');

  const message = `📋 *ACCOUNT STATEMENT — ${business.name.toUpperCase()}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Customer: *${customer.name}*\n` +
    `📞 Phone: ${customer.phone}\n` +
    `📅 Date: ${new Date().toLocaleDateString('en-GB')}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🛒 Lifetime Purchases: ${formatMoney(customer.totalPurchases, business, true)}\n` +
    `💰 *CURRENT OUTSTANDING BALANCE:* *${formatMoney(totalBalance, business, true)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    (debtItemsList ? `*ACTIVE UNPAID ITEMS:*\n${debtItemsList}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : '') +
    `*SETTLEMENT ACCOUNT:*\n` +
    `🏦 Bank: ${defaultBank?.bankName || 'Moniepoint MFB'}\n` +
    `🔢 Account No: *${defaultBank?.accountNumber || '8123456789'}*\n` +
    `👤 Account Name: ${defaultBank?.accountName || business.name}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Kindly send payment confirmation once transferred. Thank you for your continued partnership! 🙏`;

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
