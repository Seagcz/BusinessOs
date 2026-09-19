import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Share2,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Building2,
  X,
  Check,
  Edit2,
  DollarSign,
  Send,
  Download,
  Copy,
  Receipt,
  AlertTriangle,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  ChevronDown,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  InvoiceDocumentType,
  BusinessProfile,
  StaffUser,
  Customer,
  Product,
  PaymentMethod,
} from '../types';
import {
  formatMoney,
  formatDate,
  generateInvoiceNumber,
  buildWhatsAppInvoiceUrl,
  buildWhatsAppInvoiceMessage,
  generateInvoiceHtmlDocument,
  downloadHtmlFile,
} from '../utils/formatters';
import { SolanaPaymentModal } from './SolanaPaymentModal';
import { solanaService } from '../services/solanaService';
import { storageService } from '../services/storage';

interface InvoicesViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  onSaveInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onSaveCustomer?: (customer: Customer) => void;
  onRecordPayment?: (
    invoiceId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference?: string,
    notes?: string
  ) => void;
}

const COMMON_UNITS = [
  'pcs',
  'cartons',
  'bags',
  'packs',
  'rolls',
  'boxes',
  'kg',
  'pairs',
  'litres',
  'hours',
  'trips',
  'set',
];

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  business,
  currentStaff,
  invoices,
  customers,
  products,
  onSaveInvoice,
  onDeleteInvoice,
  onSaveCustomer,
  onRecordPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [previewStyle, setPreviewStyle] = useState<'modern' | 'thermal'>('modern');

  // Payment Recording Modal
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<Invoice | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethod>('transfer');
  const [paymentRefInput, setPaymentRefInput] = useState<string>('');
  const [paymentNotesInput, setPaymentNotesInput] = useState<string>('');

  // Solana Settlement Modal
  const [isSolanaModalOpen, setIsSolanaModalOpen] = useState(false);
  const [solanaTargetInvoice, setSolanaTargetInvoice] = useState<Invoice | null>(null);
  const [solanaPaymentEnabled, setSolanaPaymentEnabled] = useState(true);

  // Toast indicator
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setCopiedToast(msg);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  // Form State
  const [docType, setDocType] = useState<InvoiceDocumentType>('invoice');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [custName, setCustName] = useState('');
  const [custCompany, setCustCompany] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [saveAsNewCustomer, setSaveAsNewCustomer] = useState(false);

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unit: 'pcs', unitPrice: 0, amount: 0 },
  ]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(business.taxRate || 0);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [status, setStatus] = useState<InvoiceStatus>('sent');
  const [selectedBankId, setSelectedBankId] = useState<string>(
    business.bankAccounts.find((b) => b.isDefault)?.id || business.bankAccounts[0]?.id || ''
  );
  const [notes, setNotes] = useState('Kindly transfer to our official bank account with invoice number as reference.');
  const [terms, setTerms] = useState(
    business.receiptFooterMessage || 'Goods received in good condition are not returnable after 48 hours.'
  );

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return invoices.filter((inv) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.customerCompany && inv.customerCompany.toLowerCase().includes(q)) ||
        inv.customerPhone.includes(q) ||
        inv.items.some((i) => i.description.toLowerCase().includes(q));

      const isOverdue = inv.balanceDue > 0 && inv.dueDate < today;
      let effectiveStatus = inv.status;
      if (isOverdue && inv.status !== 'paid') {
        effectiveStatus = 'overdue';
      }

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'overdue' ? isOverdue : effectiveStatus === statusFilter);

      const matchesType = typeFilter === 'all' || (inv.documentType || 'invoice') === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [invoices, searchQuery, statusFilter, typeFilter]);

  // Overall Financial Metrics
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    invoices.forEach((inv) => {
      totalInvoiced += inv.totalAmount || 0;
      totalCollected += inv.amountPaid || 0;
      totalPending += inv.balanceDue || 0;
      if (inv.balanceDue > 0 && inv.dueDate < today) {
        totalOverdue += inv.balanceDue;
      }
    });

    return { totalInvoiced, totalCollected, totalPending, totalOverdue };
  }, [invoices]);

  // Form Live Calculations
  const formSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice || 0), 0);
  }, [items]);

  const formDiscountAmount = (formSubtotal * (discountPercent || 0)) / 100;
  const formTaxAmount = (((formSubtotal - formDiscountAmount) * (taxPercent || 0)) / 100);
  const formTotalAmount = formSubtotal - formDiscountAmount + formTaxAmount + (shippingFee || 0);
  const formBalanceDue = Math.max(0, formTotalAmount - (amountPaid || 0));

  // Customer Select Handler
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    if (!custId) {
      return;
    }
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustName(found.name);
      setCustPhone(found.phone);
      setCustEmail(found.email || '');
      setCustAddress(found.address || '');
      setSaveAsNewCustomer(false);
    }
  };

  // Line Item Handlers
  const handleItemChange = (
    id: string,
    field: 'description' | 'quantity' | 'unit' | 'unitPrice' | 'discountPercent',
    val: string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          let updated = { ...item };
          if (field === 'description' || field === 'unit') {
            updated[field] = val;
          } else if (field === 'quantity') {
            updated.quantity = parseFloat(val) || 0;
          } else if (field === 'unitPrice') {
            updated.unitPrice = parseFloat(val) || 0;
          } else if (field === 'discountPercent') {
            updated.discountPercent = parseFloat(val) || 0;
          }

          const lineDisc = updated.discountPercent ? (updated.unitPrice * updated.discountPercent) / 100 : 0;
          const effectivePrice = Math.max(0, updated.unitPrice - lineDisc);
          updated.amount = updated.quantity * effectivePrice;
          return updated;
        }
        return item;
      })
    );
  };

  const handlePickProductForItem = (itemId: string, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const qty = item.quantity || 1;
          return {
            ...item,
            productId: prod.id,
            description: prod.name,
            unitPrice: prod.sellingPrice,
            unit: prod.unit || 'pcs',
            amount: qty * prod.sellingPrice,
          };
        }
        return item;
      })
    );
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
        description: '',
        quantity: 1,
        unit: 'pcs',
        unitPrice: 0,
        amount: 0,
      },
    ]);
  };

  const removeItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Open Create Modal
  const handleOpenCreate = (prefillType: InvoiceDocumentType = 'invoice') => {
    setEditingInvoice(null);
    setDocType(prefillType);
    setSelectedCustomerId('');
    setCustName('');
    setCustCompany('');
    setCustPhone('');
    setCustEmail('');
    setCustAddress('');
    setSaveAsNewCustomer(false);
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setItems([
      { id: '1', description: '', quantity: 1, unit: 'pcs', unitPrice: 0, amount: 0 },
    ]);
    setDiscountPercent(0);
    setTaxPercent(business.taxRate || 0);
    setShippingFee(0);
    setAmountPaid(0);
    setPaymentMethod('transfer');
    setStatus(prefillType === 'receipt' ? 'paid' : 'sent');
    setSelectedBankId(
      business.bankAccounts.find((b) => b.isDefault)?.id || business.bankAccounts[0]?.id || ''
    );
    setNotes(
      prefillType === 'quotation'
        ? 'This quotation is valid for 14 days from date of issue.'
        : prefillType === 'proforma'
        ? 'Proforma invoice for advance payment clearance.'
        : 'Kindly transfer to our official bank account with invoice number as reference.'
    );
    setTerms(business.receiptFooterMessage || 'Goods received in good condition.');
    setSolanaPaymentEnabled(business.solanaUsdcEnabled ?? true);
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setDocType(inv.documentType || 'invoice');
    setSelectedCustomerId(inv.customerId || '');
    setCustName(inv.customerName);
    setCustCompany(inv.customerCompany || '');
    setCustPhone(inv.customerPhone);
    setCustEmail(inv.customerEmail || '');
    setCustAddress(inv.customerAddress || '');
    setSaveAsNewCustomer(false);
    setIssueDate(inv.issueDate);
    setDueDate(inv.dueDate);
    setItems(
      inv.items.map((it) => ({
        ...it,
        unit: it.unit || 'pcs',
      }))
    );
    setDiscountPercent(inv.discountPercent || 0);
    setTaxPercent(inv.taxPercent || 0);
    setShippingFee(inv.shippingFee || 0);
    setAmountPaid(inv.amountPaid || 0);
    setPaymentMethod(inv.paymentMethod || 'transfer');
    setStatus(inv.status);
    setNotes(inv.notes || '');
    setTerms(inv.terms || '');
    setSolanaPaymentEnabled(inv.solanaPaymentEnabled ?? (business.solanaUsdcEnabled ?? true));
    setIsEditorOpen(true);
  };

  // Duplicate / Clone Invoice
  const handleDuplicate = (inv: Invoice) => {
    setEditingInvoice(null);
    setDocType(inv.documentType || 'invoice');
    setSelectedCustomerId(inv.customerId || '');
    setCustName(inv.customerName);
    setCustCompany(inv.customerCompany || '');
    setCustPhone(inv.customerPhone);
    setCustEmail(inv.customerEmail || '');
    setCustAddress(inv.customerAddress || '');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setItems(inv.items.map((it) => ({ ...it, id: 'item_' + Math.random().toString(36).slice(2, 7) })));
    setDiscountPercent(inv.discountPercent || 0);
    setTaxPercent(inv.taxPercent || 0);
    setShippingFee(inv.shippingFee || 0);
    setAmountPaid(0);
    setStatus('sent');
    setNotes(inv.notes || '');
    setTerms(inv.terms || '');
    setSolanaPaymentEnabled(inv.solanaPaymentEnabled ?? (business.solanaUsdcEnabled ?? true));
    setIsEditorOpen(true);
  };

  // Save Submit
  const handleSaveInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) {
      alert('Please fill customer name and phone number.');
      return;
    }

    const validItems = items.filter((i) => i.description.trim() !== '');
    if (validItems.length === 0) {
      alert('Please add at least one line item with a description.');
      return;
    }

    const selectedBank =
      business.bankAccounts.find((b) => b.id === selectedBankId) ||
      business.bankAccounts.find((b) => b.isDefault) ||
      business.bankAccounts[0];

    // Optionally save customer to CRM
    let linkedCustomerId = selectedCustomerId;
    if (saveAsNewCustomer && onSaveCustomer && !selectedCustomerId) {
      const newCust: Customer = {
        id: 'cust_' + Date.now(),
        businessId: business.id,
        name: custName.trim(),
        phone: custPhone.trim(),
        email: custEmail.trim() || undefined,
        address: custAddress.trim() || undefined,
        totalPurchases: amountPaid,
        currentDebt: formBalanceDue,
        lastPurchaseDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      onSaveCustomer(newCust);
      linkedCustomerId = newCust.id;
    }

    const effectiveStatus: InvoiceStatus =
      docType === 'receipt' || formBalanceDue === 0
        ? 'paid'
        : amountPaid > 0
        ? 'partial'
        : status === 'draft'
        ? 'draft'
        : 'sent';

    const invoiceObj: Invoice = {
      id: editingInvoice ? editingInvoice.id : 'inv_' + Date.now(),
      invoiceNumber: editingInvoice
        ? editingInvoice.invoiceNumber
        : generateInvoiceNumber(invoices.length),
      documentType: docType,
      businessId: business.id,
      customerId: linkedCustomerId || undefined,
      customerName: custName.trim(),
      customerCompany: custCompany.trim() || undefined,
      customerPhone: custPhone.trim(),
      customerEmail: custEmail.trim() || undefined,
      customerAddress: custAddress.trim() || undefined,
      issueDate,
      dueDate,
      items: validItems,
      subtotal: formSubtotal,
      discountPercent,
      discountAmount: formDiscountAmount,
      taxPercent,
      taxAmount: formTaxAmount,
      shippingFee: shippingFee || 0,
      totalAmount: formTotalAmount,
      amountPaid,
      balanceDue: formBalanceDue,
      status: effectiveStatus,
      paymentMethod,
      solanaPaymentEnabled,
      solanaUsdcAmount: solanaPaymentEnabled
        ? Number((formTotalAmount / (business.solanaUsdcNgnRate || 1550)).toFixed(2))
        : undefined,
      solanaUsdcRate: business.solanaUsdcNgnRate || 1550,
      solanaSignature: editingInvoice?.solanaSignature,
      solanaStatus: editingInvoice?.solanaStatus,
      solanaExplorerUrl: editingInvoice?.solanaExplorerUrl,
      bankDetails: selectedBank
        ? {
            bankName: selectedBank.bankName,
            accountNumber: selectedBank.accountNumber,
            accountName: selectedBank.accountName,
          }
        : undefined,
      notes: notes.trim() || undefined,
      terms: terms.trim() || undefined,
      createdAt: editingInvoice ? editingInvoice.createdAt : new Date().toISOString(),
    };

    onSaveInvoice(invoiceObj);
    setIsEditorOpen(false);
    setPreviewInvoice(invoiceObj);
    setIsPreviewOpen(true);
    showToast(`Invoice #${invoiceObj.invoiceNumber} saved successfully!`);
  };

  // Open Payment Record Modal
  const handleOpenRecordPayment = (inv: Invoice) => {
    setPaymentTargetInvoice(inv);
    setPaymentAmountInput(String(inv.balanceDue));
    setPaymentMethodInput('transfer');
    setPaymentRefInput('');
    setPaymentNotesInput('Settlement of outstanding invoice balance');
    setIsRecordPaymentOpen(true);
  };

  // Handle Confirmed Solana USDC Payment for Invoice
  const handleSolanaPaymentConfirmed = (details: {
    signature: string;
    amountUsdc: number;
    amountNgn: number;
    exchangeRate: number;
    payerAddress?: string;
    recipientAddress: string;
    slot?: number;
    blockTime?: number;
    explorerUrl: string;
  }) => {
    if (!solanaTargetInvoice) return;
    const target = solanaTargetInvoice;
    const updatedPaid = (target.amountPaid || 0) + details.amountNgn;
    const updatedBal = Math.max(0, target.totalAmount - updatedPaid);

    const updatedInv: Invoice = {
      ...target,
      amountPaid: updatedPaid,
      balanceDue: updatedBal,
      status: updatedBal === 0 ? 'paid' : 'partial',
      solanaSignature: details.signature,
      solanaStatus: 'confirmed',
      solanaUsdcAmount: details.amountUsdc,
      solanaPayerAddress: details.payerAddress,
      solanaRecipientAddress: details.recipientAddress,
      solanaSlot: details.slot,
      solanaBlockTime: details.blockTime,
      solanaExplorerUrl: details.explorerUrl,
      paymentMethod: 'solana',
    };

    onSaveInvoice(updatedInv);

    // Call onRecordPayment if provided
    if (onRecordPayment) {
      onRecordPayment(
        target.id,
        details.amountNgn,
        'solana',
        details.signature,
        `Settled via Solana USDC on Mainnet (${details.amountUsdc} USDC)`
      );
    }

    // Record on-chain transaction in persistent storage
    storageService.saveSolanaTransaction(
      {
        id: 'sol_inv_' + Date.now(),
        businessId: business.id,
        signature: details.signature,
        type: 'invoice',
        status: 'confirmed',
        amountUsdc: details.amountUsdc,
        amountNgn: details.amountNgn,
        exchangeRate: details.exchangeRate,
        recipientAddress: details.recipientAddress,
        payerAddress: details.payerAddress,
        invoiceId: target.id,
        invoiceNumber: target.invoiceNumber,
        customerName: target.customerName,
        timestamp: new Date().toISOString(),
        slot: details.slot,
        blockTime: details.blockTime,
        confirmationStatus: 'finalized',
        explorerUrl: details.explorerUrl,
        notes: `Invoice #${target.invoiceNumber} settled in USDC on Solana Mainnet`,
        verifiedAt: new Date().toISOString(),
      },
      currentStaff.name
    );

    if (previewInvoice && previewInvoice.id === target.id) {
      setPreviewInvoice(updatedInv);
    }

    setIsSolanaModalOpen(false);
    setSolanaTargetInvoice(null);
    showToast(`Invoice #${target.invoiceNumber} settled on Solana Mainnet (${details.amountUsdc} USDC)!`);
  };

  // Submit Payment Record
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetInvoice) return;
    const amt = parseFloat(paymentAmountInput);
    if (!amt || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    if (onRecordPayment) {
      onRecordPayment(
        paymentTargetInvoice.id,
        amt,
        paymentMethodInput,
        paymentRefInput.trim() || undefined,
        paymentNotesInput.trim() || undefined
      );
    } else {
      // Local fallback update
      const updatedPaid = (paymentTargetInvoice.amountPaid || 0) + amt;
      const updatedBal = Math.max(0, paymentTargetInvoice.totalAmount - updatedPaid);
      const updatedInv: Invoice = {
        ...paymentTargetInvoice,
        amountPaid: updatedPaid,
        balanceDue: updatedBal,
        status: updatedBal === 0 ? 'paid' : 'partial',
      };
      onSaveInvoice(updatedInv);
    }

    setIsRecordPaymentOpen(false);
    showToast(`Payment of ₦${amt.toLocaleString()} recorded!`);

    // Update preview if open
    if (previewInvoice && previewInvoice.id === paymentTargetInvoice.id) {
      const updatedPaid = (previewInvoice.amountPaid || 0) + amt;
      const updatedBal = Math.max(0, previewInvoice.totalAmount - updatedPaid);
      setPreviewInvoice({
        ...previewInvoice,
        amountPaid: updatedPaid,
        balanceDue: updatedBal,
        status: updatedBal === 0 ? 'paid' : 'partial',
      });
    }
  };

  // Download Standalone HTML/PDF document
  const handleDownloadInvoice = (inv: Invoice) => {
    const htmlContent = generateInvoiceHtmlDocument(inv, business);
    const filename = `${inv.documentType || 'invoice'}_${inv.invoiceNumber}_${inv.customerName.replace(/\s+/g, '_')}.html`;
    downloadHtmlFile(htmlContent, filename);
    showToast('Download started! Open file in browser to print or save as PDF.');
  };

  // Copy WhatsApp message text
  const handleCopyWhatsAppMessage = (inv: Invoice) => {
    const msg = buildWhatsAppInvoiceMessage(inv, business);
    navigator.clipboard.writeText(msg);
    showToast('WhatsApp message text copied to clipboard!');
  };

  const getDocTypeBadge = (type?: InvoiceDocumentType) => {
    switch (type) {
      case 'quotation':
        return <span className="bg-amber-950/80 text-amber-300 border border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Quotation</span>;
      case 'proforma':
        return <span className="bg-blue-950/80 text-blue-300 border border-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Proforma</span>;
      case 'receipt':
        return <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Receipt</span>;
      default:
        return <span className="bg-purple-950/80 text-purple-300 border border-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Tax Invoice</span>;
    }
  };

  return (
    <div className="space-y-4 pb-24 text-slate-100">
      {/* Toast Alert */}
      {copiedToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce border border-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Header & Financial Highlights */}
      <div className="bg-slate-900/90 p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Invoices & Quotations</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/60">
                    Commercial Suite
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Professional billing, quotations, proforma bills, WhatsApp instant delivery & printable receipts
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              id="btn-create-quotation"
              onClick={() => handleOpenCreate('quotation')}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-2xl border border-slate-700 transition active:scale-95 cursor-pointer"
              title="Create a price estimate / quote for prospective client"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>New Quotation</span>
            </button>

            <button
              id="btn-create-invoice"
              onClick={() => handleOpenCreate('invoice')}
              className="flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-purple-950 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Invoice</span>
            </button>
          </div>
        </div>

        {/* 4 Financial Highlight Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 pt-1">
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">Total Invoiced Value</span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-100 mt-0.5 block">
              {formatMoney(metrics.totalInvoiced, business)}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{invoices.length} commercial documents</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] font-semibold text-emerald-400 block truncate">Payments Collected</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-300 mt-0.5 block">
              {formatMoney(metrics.totalCollected, business)}
            </span>
            <span className="text-[10px] text-emerald-500/80 mt-0.5 block">Realized revenue</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] font-semibold text-purple-400 block truncate">Pending Balance Due</span>
            <span className="text-base sm:text-lg font-black font-mono text-purple-300 mt-0.5 block">
              {formatMoney(metrics.totalPending, business)}
            </span>
            <span className="text-[10px] text-purple-400/80 mt-0.5 block">Awaiting customer clearance</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] font-semibold text-rose-400 block truncate">Overdue Receivables</span>
            <span className="text-base sm:text-lg font-black font-mono text-rose-400 mt-0.5 block">
              {formatMoney(metrics.totalOverdue, business)}
            </span>
            <span className="text-[10px] text-rose-500/80 mt-0.5 block">Past payment deadline</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number, client name, company, phone, or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Document Type Filter */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-2xl overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All Docs' },
              { id: 'invoice', label: 'Invoices' },
              { id: 'quotation', label: 'Quotes' },
              { id: 'proforma', label: 'Proforma' },
              { id: 'receipt', label: 'Receipts' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  typeFilter === t.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {[
            { id: 'all', label: 'All Status' },
            { id: 'sent', label: 'Pending / Sent' },
            { id: 'paid', label: 'Fully Paid' },
            { id: 'partial', label: 'Partially Paid' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'draft', label: 'Draft' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-slate-800 text-purple-300 border border-purple-500/50 shadow-xs'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800/80 hover:bg-slate-850'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-3.5 sm:p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider">
            Showing {filteredInvoices.length} of {invoices.length} Document{invoices.length === 1 ? '' : 's'}
          </span>
          <span className="text-[11px]">Instant 1-Click WhatsApp & Print Ready</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {filteredInvoices.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-600 stroke-1" />
              <p className="font-semibold text-slate-400">No matching invoices or quotations found.</p>
              <p className="text-[11px] text-slate-500">
                Click "Create Invoice" or "New Quotation" above to bill clients with professional company branding.
              </p>
            </div>
          ) : (
            filteredInvoices.map((inv) => {
              const isOverdue = inv.balanceDue > 0 && inv.dueDate < new Date().toISOString().split('T')[0];
              const isFullyPaid = inv.balanceDue === 0 || inv.status === 'paid';

              return (
                <div
                  key={inv.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-850/40 transition"
                >
                  {/* Left Column: Details */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black font-mono text-sm text-purple-300">
                        #{inv.invoiceNumber}
                      </span>
                      {getDocTypeBadge(inv.documentType)}
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          isFullyPaid
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                            : inv.status === 'partial' || (inv.amountPaid > 0 && inv.balanceDue > 0)
                            ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                            : isOverdue
                            ? 'bg-rose-950/80 text-rose-300 border-rose-700 animate-pulse'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isFullyPaid ? 'Fully Paid' : isOverdue ? 'Overdue' : inv.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-slate-100 truncate">
                        {inv.customerName}
                      </h3>
                      {inv.customerCompany && (
                        <span className="text-xs text-slate-400 font-semibold px-2 py-0.5 bg-slate-800/80 rounded-md border border-slate-700/50">
                          {inv.customerCompany}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {inv.customerPhone}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Issued: {inv.issueDate}
                      </span>
                      <span>•</span>
                      <span className={`font-semibold ${isOverdue ? 'text-rose-400' : 'text-slate-400'}`}>
                        Due: {inv.dueDate} {isOverdue && '⚠️'}
                      </span>
                      <span>•</span>
                      <span>{inv.items.length} item{inv.items.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  {/* Right Column: Financial & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-400 block font-medium">Total Payable</span>
                      <span className="text-base font-black font-mono text-white block">
                        {formatMoney(inv.totalAmount, business)}
                      </span>
                      <div className="text-[11px] flex items-center sm:justify-end gap-1.5 mt-0.5">
                        {isFullyPaid ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Fully Settled
                          </span>
                        ) : (
                          <span className="text-purple-300">
                            Bal Due: <strong className="font-mono text-rose-300">{formatMoney(inv.balanceDue, business)}</strong>
                          </span>
                        )}
                      </div>
                      {inv.solanaSignature ? (
                        <a
                          href={inv.solanaExplorerUrl || `https://explorer.solana.com/tx/${inv.solanaSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono font-bold flex items-center sm:justify-end gap-1 mt-0.5"
                          title="View settled transaction on Solana Explorer"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>USDC Settled</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (inv.solanaPaymentEnabled || business.solanaUsdcEnabled) && inv.balanceDue > 0 ? (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center sm:justify-end gap-1 mt-0.5">
                          <span>≈ {((inv.balanceDue) / (inv.solanaUsdcRate || business.solanaUsdcNgnRate || 1550)).toFixed(2)} USDC</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                      {inv.balanceDue > 0 && (
                        <>
                          <button
                            onClick={() => handleOpenRecordPayment(inv)}
                            className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl transition cursor-pointer"
                            title="Record customer payment towards this invoice"
                          >
                            + Payment
                          </button>
                          <button
                            onClick={() => {
                              setSolanaTargetInvoice(inv);
                              setIsSolanaModalOpen(true);
                            }}
                            className="px-2.5 py-2 bg-gradient-to-r from-purple-950/60 to-emerald-950/60 hover:from-purple-900/60 hover:to-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                            title="Receive payment in USDC on Solana Mainnet"
                          >
                            <span className="text-xs font-black">◎</span>
                            <span className="hidden sm:inline">USDC</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setPreviewInvoice(inv);
                          setIsPreviewOpen(true);
                        }}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
                        title="View / Print / Download / WhatsApp"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <a
                        href={buildWhatsAppInvoiceUrl(inv, business)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 rounded-xl transition cursor-pointer"
                        title="Share directly via WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleDownloadInvoice(inv)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition cursor-pointer"
                        title="Download Standalone Printable HTML / PDF Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(inv)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                        title="Edit invoice"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete ${inv.documentType || 'invoice'} #${inv.invoiceNumber} permanently?`)) {
                            onDeleteInvoice(inv.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
                        title="Delete invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CREATE / EDIT INVOICE & QUOTATION MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <form
            onSubmit={handleSaveInvoiceSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl p-5 sm:p-7 text-slate-100 space-y-5 max-h-[92vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div>
                <h3 className="font-black text-lg text-white tracking-tight">
                  {editingInvoice
                    ? `Edit ${docType.toUpperCase()} #${editingInvoice.invoiceNumber}`
                    : `Create New ${docType.toUpperCase()}`}
                </h3>
                <p className="text-xs text-slate-400">
                  Fill in customer details, inventory items, discounts, taxes, and payment instructions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Document Type:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'invoice', label: 'Tax Invoice', desc: 'Official commercial bill' },
                  { id: 'quotation', label: 'Quotation', desc: 'Price bid / estimate' },
                  { id: 'proforma', label: 'Proforma', desc: 'Advance payment bill' },
                  { id: 'receipt', label: 'Sales Receipt', desc: 'Payment confirmation' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDocType(t.id as InvoiceDocumentType)}
                    className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                      docType === t.id
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-xs'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-100">{t.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Details Section */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span>Customer & Client Information</span>
                </h4>

                {customers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Autofill:</span>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="">-- Choose Existing Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Customer / Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chief Emeka or Dr. Amina"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Company / Organization (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Tech Ltd or Grace Hospital"
                    value={custCompany}
                    onChange={(e) => setCustCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">WhatsApp / Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0803 123 4567"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. client@company.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">Billing / Delivery Address (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Plot 14, Admiralty Way, Lekki Phase 1, Lagos"
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {!selectedCustomerId && onSaveCustomer && (
                <label className="flex items-center gap-2 pt-1 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsNewCustomer}
                    onChange={(e) => setSaveAsNewCustomer(e.target.checked)}
                    className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Save this customer to Store Customer Directory for future billing</span>
                </label>
              )}
            </div>

            {/* Dates & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Issue Date:</label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Payment Due Date:</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Line Items Section */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Line Items & Services</span>
                </h4>

                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 px-2.5 py-1 bg-purple-950/60 border border-purple-800 rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2"
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-6 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold">Item {idx + 1} Description:</span>
                          {products.length > 0 && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) handlePickProductForItem(item.id, e.target.value);
                              }}
                              className="text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                            >
                              <option value="">-- Pick from Inventory --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (₦{p.sellingPrice.toLocaleString()}) - Stock: {p.stockLevel}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 50kg Royal Rice or Electrical Wiring Service"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <span className="text-[10px] text-slate-400 font-semibold block">Qty:</span>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          required
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-center text-slate-100 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <span className="text-[10px] text-slate-400 font-semibold block">Unit:</span>
                        <select
                          value={item.unit || 'pcs'}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                        >
                          {COMMON_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <span className="text-[10px] text-slate-400 font-semibold block">Unit Price (₦):</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={item.unitPrice || ''}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-right text-slate-100 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80 text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px]">Item Disc (%):</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={item.discountPercent || ''}
                          onChange={(e) => handleItemChange(item.id, 'discountPercent', e.target.value)}
                          className="w-16 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-center text-slate-200"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-200">
                          Line Total: <strong className="font-mono text-purple-300">{formatMoney(item.amount, business)}</strong>
                        </span>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations & Discounts & Taxes */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                Financial Breakdown & Adjustments
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Global Discount (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">VAT / Tax Rate (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Logistics / Delivery Fee (₦):</label>
                  <input
                    type="number"
                    min="0"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Amount Paid Initial Deposit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Amount Paid / Initial Deposit (₦):</label>
                  <input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Deposit Payment Method:</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="pos">POS Terminal</option>
                  </select>
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-200">{formatMoney(formSubtotal, business)}</span>
                </div>
                {formDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({discountPercent}%):</span>
                    <span className="font-mono">-{formatMoney(formDiscountAmount, business)}</span>
                  </div>
                )}
                {formTaxAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>VAT ({taxPercent}%):</span>
                    <span className="font-mono">+{formatMoney(formTaxAmount, business)}</span>
                  </div>
                )}
                {shippingFee > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Logistics:</span>
                    <span className="font-mono">+{formatMoney(shippingFee, business)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-white pt-1.5 border-t border-slate-800">
                  <span>TOTAL PAYABLE:</span>
                  <span className="font-mono text-purple-300">{formatMoney(formTotalAmount, business)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-rose-400 pt-1">
                  <span>OUTSTANDING BALANCE DUE:</span>
                  <span className="font-mono">{formatMoney(formBalanceDue, business)}</span>
                </div>
              </div>
            </div>

            {/* Bank Account Selection & Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Official Settlement Bank Account:</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  {business.bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountNumber} ({b.accountName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Payment Status Override:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="sent">Sent / Pending Payment</option>
                  <option value="paid">Mark as Paid</option>
                  <option value="partial">Partially Paid</option>
                  <option value="draft">Save as Draft</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-400 block mb-1">Payment Notes & Reference:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-400 block mb-1">Terms & Conditions / Warranty Notice:</label>
                <input
                  type="text"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Optional Solana Blockchain Settlement Toggle */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    ◎
                  </div>
                  <div>
                    <span className="font-bold text-slate-200">Optional Solana USDC Settlement</span>
                    <p className="text-[11px] text-slate-400">Allow customer to optionally pay in USDC on Solana Mainnet</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={solanaPaymentEnabled}
                    onChange={(e) => setSolanaPaymentEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {solanaPaymentEnabled && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    USDC Equivalent:{' '}
                    <strong className="text-emerald-400 font-mono">
                      {(formTotalAmount / (business.solanaUsdcNgnRate || 1550)).toFixed(2)} USDC
                    </strong>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Rate: 1 USDC = ₦{(business.solanaUsdcNgnRate || 1550).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-2 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-purple-950 cursor-pointer"
              >
                {editingInvoice ? 'Update Document' : 'Save & Preview Document'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isRecordPaymentOpen && paymentTargetInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <form
            onSubmit={handleRecordPaymentSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">Record Invoice Payment</h3>
                <p className="text-xs text-slate-400">
                  Invoice #{paymentTargetInvoice.invoiceNumber} • {paymentTargetInvoice.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total Amount:</span>
                <span className="font-mono text-slate-200">{formatMoney(paymentTargetInvoice.totalAmount, business)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Already Paid:</span>
                <span className="font-mono text-emerald-400">{formatMoney(paymentTargetInvoice.amountPaid, business)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-400 pt-1 border-t border-slate-800">
                <span>Outstanding Balance:</span>
                <span className="font-mono">{formatMoney(paymentTargetInvoice.balanceDue, business)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 font-semibold">Payment Amount Received (₦):</label>
                  <button
                    type="button"
                    onClick={() => setPaymentAmountInput(String(paymentTargetInvoice.balanceDue))}
                    className="text-[10px] text-purple-400 hover:underline font-bold"
                  >
                    Pay Full Balance
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  max={paymentTargetInvoice.balanceDue}
                  step="any"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Payment Method:</label>
                <select
                  value={paymentMethodInput}
                  onChange={(e) => setPaymentMethodInput(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="pos">POS Terminal</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Payment Reference / Transaction ID:</label>
                <input
                  type="text"
                  placeholder="e.g. TRF-9021893 or Cash Desk"
                  value={paymentRefInput}
                  onChange={(e) => setPaymentRefInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Notes / Remarks:</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared by Bank Alert"
                  value={paymentNotesInput}
                  onChange={(e) => setPaymentNotesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950"
              >
                Confirm Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PREVIEW & PRINT DOCUMENT MODAL */}
      {isPreviewOpen && previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-4 sm:p-6 text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-purple-400">
                  {previewInvoice.documentType ? previewInvoice.documentType.toUpperCase() : 'INVOICE'} PREVIEW
                </span>
                <span className="font-mono text-xs text-slate-400">#{previewInvoice.invoiceNumber}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Template style switch */}
                <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setPreviewStyle('modern')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      previewStyle === 'modern' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    A4 Executive
                  </button>
                  <button
                    onClick={() => setPreviewStyle('thermal')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      previewStyle === 'thermal' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Thermal Slip
                  </button>
                </div>

                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            {previewStyle === 'modern' ? (
              <div
                id="printable-commercial-invoice"
                className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-200 text-xs space-y-5 select-text font-sans relative overflow-hidden"
              >
                {/* Status Watermark / Stamp */}
                <div className="absolute right-6 top-28 pointer-events-none opacity-80 select-none">
                  {previewInvoice.balanceDue === 0 || previewInvoice.status === 'paid' ? (
                    <div className="border-4 border-emerald-600 text-emerald-600 font-black text-2xl tracking-widest px-4 py-1.5 rounded-2xl uppercase rotate-[-12deg] shadow-sm">
                      ✓ FULLY PAID
                    </div>
                  ) : previewInvoice.amountPaid > 0 ? (
                    <div className="border-4 border-amber-600 text-amber-600 font-black text-xl tracking-wider px-3 py-1 rounded-xl uppercase rotate-[-12deg]">
                      PARTIAL PAYMENT
                    </div>
                  ) : previewInvoice.documentType === 'quotation' ? (
                    <div className="border-4 border-purple-600 text-purple-600 font-black text-xl tracking-wider px-3 py-1 rounded-xl uppercase rotate-[-12deg]">
                      OFFICIAL QUOTATION
                    </div>
                  ) : previewInvoice.dueDate < new Date().toISOString().split('T')[0] ? (
                    <div className="border-4 border-rose-600 text-rose-600 font-black text-xl tracking-wider px-3 py-1 rounded-xl uppercase rotate-[-12deg]">
                      ⚠️ OVERDUE
                    </div>
                  ) : null}
                </div>

                {/* Document Header */}
                <div className="flex justify-between items-start border-b-2 border-purple-600 pb-5">
                  <div className="max-w-[60%]">
                    <div className="text-3xl mb-1">{business.logoEmoji || '🏢'}</div>
                    <h2 className="text-xl font-extrabold text-slate-950 uppercase tracking-tight">
                      {business.name}
                    </h2>
                    {business.tagline && (
                      <p className="text-slate-600 text-xs italic">{business.tagline}</p>
                    )}
                    <div className="text-slate-600 text-[11px] mt-1 space-y-0.5">
                      <p>{business.address}, {business.city}, {business.state}</p>
                      <p>Tel: {business.phone} {business.email ? `• ${business.email}` : ''}</p>
                      {(business.cacNumber || business.tinNumber) && (
                        <p className="text-[10px] text-slate-500">
                          {business.cacNumber ? `RC/CAC: ${business.cacNumber}` : ''}{' '}
                          {business.tinNumber ? `• TIN: ${business.tinNumber}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <h3 className="text-xl font-black text-purple-700 uppercase tracking-wider">
                      {previewInvoice.documentType === 'quotation'
                        ? 'OFFICIAL QUOTE'
                        : previewInvoice.documentType === 'proforma'
                        ? 'PROFORMA INVOICE'
                        : previewInvoice.documentType === 'receipt'
                        ? 'PAYMENT RECEIPT'
                        : 'TAX INVOICE'}
                    </h3>
                    <p className="font-mono font-bold text-sm text-slate-900">
                      #{previewInvoice.invoiceNumber}
                    </p>
                    <div className="text-slate-600 text-[11px] mt-2 space-y-0.5">
                      <p><strong>Date Issued:</strong> {previewInvoice.issueDate}</p>
                      {previewInvoice.documentType !== 'receipt' && (
                        <p className="font-semibold text-slate-800">
                          <strong>Due Date:</strong> {previewInvoice.dueDate}
                        </p>
                      )}
                      <p className="uppercase text-[10px] font-bold text-purple-600">
                        Status: {previewInvoice.status}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Billed to Customer Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Billed To Client:
                    </span>
                    <h4 className="font-bold text-sm text-slate-950 mt-0.5">
                      {previewInvoice.customerName}
                    </h4>
                    {previewInvoice.customerCompany && (
                      <p className="text-xs font-semibold text-slate-700">{previewInvoice.customerCompany}</p>
                    )}
                    <div className="text-slate-600 text-[11px] mt-1 space-y-0.5">
                      <p>Phone: {previewInvoice.customerPhone}</p>
                      {previewInvoice.customerEmail && <p>Email: {previewInvoice.customerEmail}</p>}
                      {previewInvoice.customerAddress && <p>Address: {previewInvoice.customerAddress}</p>}
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-[11px] text-slate-600">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Currency
                    </span>
                    <p className="font-bold font-mono text-slate-900 mt-0.5">
                      {business.currencyCode || 'NGN'} ({business.currencySymbol})
                    </p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-slate-500 text-[10px] font-extrabold uppercase bg-slate-100/70">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewInvoice.items.map((i, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {i.description}
                            {i.discountPercent ? (
                              <span className="text-[10px] text-emerald-600 ml-1.5 font-normal">
                                (-{i.discountPercent}%)
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                            {i.quantity} {i.unit || 'pcs'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {formatMoney(i.unitPrice, business, true)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black font-mono text-slate-950">
                            {formatMoney(i.amount, business, true)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary & Bank Transfer Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 items-start">
                  {/* Bank Transfer Details */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-1.5">
                    <span className="font-extrabold text-[10px] uppercase text-purple-700 tracking-wider block">
                      OFFICIAL SETTLEMENT ACCOUNT
                    </span>
                    {previewInvoice.bankDetails ? (
                      <div className="text-xs space-y-1 text-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Bank:</span>
                          <span className="font-bold">{previewInvoice.bankDetails.bankName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Account No:</span>
                          <span className="font-mono font-black text-sm text-purple-800">
                            {previewInvoice.bankDetails.accountNumber}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Account Name:</span>
                          <span className="font-medium text-[11px]">{previewInvoice.bankDetails.accountName}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-[11px]">Payment upon delivery or collection.</p>
                    )}
                  </div>

                  {/* Calculations */}
                  <div className="space-y-1.5 text-right text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-semibold">{formatMoney(previewInvoice.subtotal, business, true)}</span>
                    </div>
                    {previewInvoice.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount ({previewInvoice.discountPercent}%):</span>
                        <span className="font-mono font-semibold">-{formatMoney(previewInvoice.discountAmount, business, true)}</span>
                      </div>
                    )}
                    {previewInvoice.taxAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>VAT ({previewInvoice.taxPercent}%):</span>
                        <span className="font-mono font-semibold">+{formatMoney(previewInvoice.taxAmount, business, true)}</span>
                      </div>
                    )}
                    {previewInvoice.shippingFee && previewInvoice.shippingFee > 0 ? (
                      <div className="flex justify-between text-slate-600">
                        <span>Logistics / Delivery:</span>
                        <span className="font-mono font-semibold">+{formatMoney(previewInvoice.shippingFee, business, true)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t-2 border-slate-900">
                      <span>TOTAL PAYABLE:</span>
                      <span className="font-mono text-purple-700">{formatMoney(previewInvoice.totalAmount, business, true)}</span>
                    </div>
                    {previewInvoice.amountPaid > 0 && (
                      <div className="flex justify-between text-xs font-bold text-emerald-600">
                        <span>Amount Paid:</span>
                        <span className="font-mono">{formatMoney(previewInvoice.amountPaid, business, true)}</span>
                      </div>
                    )}
                    {previewInvoice.balanceDue > 0 ? (
                      <div className="flex justify-between text-xs font-black text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                        <span>BALANCE DUE:</span>
                        <span className="font-mono">{formatMoney(previewInvoice.balanceDue, business, true)}</span>
                      </div>
                    ) : (
                      <div className="text-emerald-700 font-bold text-xs bg-emerald-50 p-1.5 rounded-lg text-center border border-emerald-100">
                        ✓ All Accounts Settled in Full
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes & Terms */}
                {(previewInvoice.notes || previewInvoice.terms) && (
                  <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                    {previewInvoice.notes && <p><strong>Notes:</strong> {previewInvoice.notes}</p>}
                    {previewInvoice.terms && <p><strong>Terms:</strong> {previewInvoice.terms}</p>}
                  </div>
                )}

                {/* Authorized Signature Block */}
                <div className="pt-6 border-t border-dashed border-slate-300 flex justify-between items-end text-[10px] text-slate-400">
                  <div>
                    <p className="font-bold text-slate-700 uppercase">Customer Acceptance Signature:</p>
                    <div className="w-36 border-b border-slate-400 mt-6" />
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-slate-700 uppercase">For {business.name}:</p>
                    <div className="w-36 border-b border-slate-400 mt-6 ml-auto" />
                    <p className="mt-1 text-[9px]">Authorized Signatory & Stamp</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Thermal POS 80mm Slip Format */
              <div
                id="printable-thermal-invoice"
                className="bg-white text-slate-900 p-5 rounded-2xl shadow-xl border border-slate-300 text-xs font-mono select-text max-w-sm mx-auto space-y-3"
              >
                <div className="text-center border-b border-dashed border-slate-400 pb-3">
                  <div className="text-2xl mb-1">{business.logoEmoji || '🏬'}</div>
                  <h3 className="font-black text-sm uppercase text-slate-950">{business.name}</h3>
                  <p className="text-[10px] text-slate-600">{business.address}, {business.city}</p>
                  <p className="text-[10px] text-slate-600">Tel: {business.phone}</p>
                </div>

                <div className="text-[11px] space-y-1 border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Doc:</span>
                    <span className="font-bold">#{previewInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Client:</span>
                    <span className="font-bold">{previewInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span>{previewInvoice.issueDate}</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-slate-400 pb-2 space-y-1.5">
                  {previewInvoice.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <div>
                        <p className="font-bold">{it.description}</p>
                        <p className="text-[10px] text-slate-500">x{it.quantity} @ {formatMoney(it.unitPrice, business, true)}</p>
                      </div>
                      <span className="font-bold">{formatMoney(it.amount, business, true)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-xs border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatMoney(previewInvoice.subtotal, business, true)}</span>
                  </div>
                  {previewInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span>-{formatMoney(previewInvoice.discountAmount, business, true)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300">
                    <span>TOTAL:</span>
                    <span>{formatMoney(previewInvoice.totalAmount, business, true)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>BALANCE DUE:</span>
                    <span>{formatMoney(previewInvoice.balanceDue, business, true)}</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-500">
                  <p>{business.receiptFooterMessage || 'Thank you for your patronage!'}</p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2 justify-end">
              <a
                href={buildWhatsAppInvoiceUrl(previewInvoice, business)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp Client</span>
              </a>

              <button
                onClick={() => handleCopyWhatsAppMessage(previewInvoice)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                title="Copy formatted text to clipboard"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Text</span>
              </button>

              {previewInvoice.balanceDue > 0 && (previewInvoice.solanaPaymentEnabled || business.solanaUsdcEnabled) && (
                <button
                  onClick={() => {
                    setSolanaTargetInvoice(previewInvoice);
                    setIsSolanaModalOpen(true);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-700 to-emerald-600 hover:from-purple-600 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                  title="Receive payment on Solana Mainnet in USDC"
                >
                  <span className="font-mono font-black text-sm">◎</span>
                  <span>Settle with Solana USDC</span>
                </button>
              )}

              <button
                onClick={() => handleDownloadInvoice(previewInvoice)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                title="Download Standalone Printable HTML / PDF"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF/HTML</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>

              <button
                onClick={() => handleDuplicate(previewInvoice)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                title="Clone / Duplicate this document"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Solana USDC Payment Modal */}
      {isSolanaModalOpen && solanaTargetInvoice && (
        <SolanaPaymentModal
          isOpen={isSolanaModalOpen}
          onClose={() => {
            setIsSolanaModalOpen(false);
            setSolanaTargetInvoice(null);
          }}
          business={business}
          amountNgn={solanaTargetInvoice.balanceDue > 0 ? solanaTargetInvoice.balanceDue : solanaTargetInvoice.totalAmount}
          invoiceId={solanaTargetInvoice.id}
          invoiceNumber={solanaTargetInvoice.invoiceNumber}
          customerName={solanaTargetInvoice.customerName}
          customerPhone={solanaTargetInvoice.customerPhone}
          onPaymentConfirmed={handleSolanaPaymentConfirmed}
        />
      )}
    </div>
  );
};
