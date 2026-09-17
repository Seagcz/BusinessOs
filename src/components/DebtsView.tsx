import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Phone,
  MessageSquare,
  Calendar,
  X,
  Check,
  Building2,
  CreditCard,
  Banknote,
  ArrowRight,
  History,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  FileText,
  Printer,
  Copy,
  ExternalLink,
  ShieldCheck,
  Percent,
  Wallet,
} from 'lucide-react';
import {
  DebtRecord,
  Customer,
  BusinessProfile,
  StaffUser,
  Sale,
  PaymentMethod,
} from '../types';
import {
  formatMoney,
  formatDate,
  formatShortDate,
  buildWhatsAppDebtReminderUrl,
  buildWhatsAppCustomerStatementUrl,
} from '../utils/formatters';

interface DebtsViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  debts: DebtRecord[];
  customers: Customer[];
  sales?: Sale[];
  onRecordDebtPayment: (
    debtId: string,
    amount: number,
    method: 'cash' | 'transfer' | 'pos',
    notes?: string
  ) => void;
  onRecordCustomerLumpPayment?: (
    customerId: string,
    amount: number,
    method: 'cash' | 'transfer' | 'pos',
    notes?: string
  ) => void;
  onAddNewDebt: (debt: DebtRecord) => void;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => boolean;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  business,
  currentStaff,
  debts,
  customers,
  sales = [],
  onRecordDebtPayment,
  onRecordCustomerLumpPayment,
  onAddNewDebt,
  onSaveCustomer,
  onDeleteCustomer,
}) => {
  // Main view tab: 'debts_ledger' | 'customers_dir'
  const [activeMainTab, setActiveMainTab] = useState<'debts_ledger' | 'customers_dir'>('debts_ledger');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'settled'>('all');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'indebted' | 'clear' | 'top_spenders'>('all');

  // Modals
  // 1. Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetType, setPaymentTargetType] = useState<'debt' | 'customer'>('debt');
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtRecord | null>(null);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer' | 'pos'>('cash');
  const [payNotes, setPayNotes] = useState('');

  // 2. WhatsApp Reminder Modal
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedDebtForWhatsApp, setSelectedDebtForWhatsApp] = useState<DebtRecord | null>(null);
  const [selectedCustomerForWhatsApp, setSelectedCustomerForWhatsApp] = useState<Customer | null>(null);
  const [reminderTone, setReminderTone] = useState<'polite' | 'standard' | 'firm'>('polite');
  const [copiedText, setCopiedText] = useState(false);

  // 3. Customer Statement Modal
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  // 4. Add / Edit Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custFormName, setCustFormName] = useState('');
  const [custFormPhone, setCustFormPhone] = useState('');
  const [custFormEmail, setCustFormEmail] = useState('');
  const [custFormAddress, setCustFormAddress] = useState('');
  const [custFormNotes, setCustFormNotes] = useState('');

  // 5. New Debt Modal
  const [isNewDebtModalOpen, setIsNewDebtModalOpen] = useState(false);
  const [newDebtCustId, setNewDebtCustId] = useState('');
  const [newDebtCustName, setNewDebtCustName] = useState('');
  const [newDebtCustPhone, setNewDebtCustPhone] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtDueDate, setNewDebtDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [newDebtNotes, setNewDebtNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Overall Financial Metrics
  const totalOutstanding = useMemo(() => {
    return debts.reduce((sum, d) => sum + (d.balanceDue || 0), 0);
  }, [debts]);

  const totalOverdue = useMemo(() => {
    return debts
      .filter((d) => (d.status === 'overdue' || (d.dueDate && d.dueDate < todayStr)) && d.balanceDue > 0)
      .reduce((sum, d) => sum + d.balanceDue, 0);
  }, [debts, todayStr]);

  const overdueCount = useMemo(() => {
    return debts.filter(
      (d) => (d.status === 'overdue' || (d.dueDate && d.dueDate < todayStr)) && d.balanceDue > 0
    ).length;
  }, [debts, todayStr]);

  const totalRecovered = useMemo(() => {
    return debts.reduce((sum, d) => {
      const historySum = (d.history || []).reduce((hSum, h) => hSum + h.amount, 0);
      return sum + historySum;
    }, 0);
  }, [debts]);

  const indebtedCustomersCount = useMemo(() => {
    return customers.filter((c) => (c.currentDebt || 0) > 0).length;
  }, [customers]);

  // Filtered Debts List
  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      const matchesSearch =
        d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.customerPhone.includes(searchQuery) ||
        (d.receiptNumber && d.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.notes && d.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const isOverdue = d.status === 'overdue' || (d.dueDate && d.dueDate < todayStr && d.balanceDue > 0);
      const isSettled = d.balanceDue === 0 || d.status === 'settled';
      const isActive = !isSettled;

      if (statusFilter === 'overdue') return matchesSearch && isOverdue && !isSettled;
      if (statusFilter === 'active') return matchesSearch && isActive;
      if (statusFilter === 'settled') return matchesSearch && isSettled;
      return matchesSearch;
    });
  }, [debts, searchQuery, statusFilter, todayStr]);

  // Filtered Customers List
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));

      const hasDebt = (c.currentDebt || 0) > 0;

      if (customerFilter === 'indebted') return matchesSearch && hasDebt;
      if (customerFilter === 'clear') return matchesSearch && !hasDebt;
      if (customerFilter === 'top_spenders') return matchesSearch;
      return matchesSearch;
    }).sort((a, b) => {
      if (customerFilter === 'top_spenders') {
        return (b.totalPurchases || 0) - (a.totalPurchases || 0);
      }
      // By default sort by indebted first, then name
      if ((b.currentDebt || 0) !== (a.currentDebt || 0)) {
        return (b.currentDebt || 0) - (a.currentDebt || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [customers, searchQuery, customerFilter]);

  // Helper to calculate days overdue or days left
  const getDueStatusText = (dueDate?: string, isSettled?: boolean) => {
    if (isSettled) return { text: 'Settled', isOverdue: false, days: 0 };
    if (!dueDate) return { text: 'No due date', isOverdue: false, days: 0 };

    const due = new Date(dueDate).getTime();
    const today = new Date(todayStr).getTime();
    const diffDays = Math.round((due - today) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`,
        isOverdue: true,
        days: Math.abs(diffDays),
      };
    } else if (diffDays === 0) {
      return { text: 'Due today', isOverdue: true, days: 0 };
    } else {
      return {
        text: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
        isOverdue: false,
        days: diffDays,
      };
    }
  };

  // Open Payment modal for specific debt
  const handleOpenDebtPayment = (debt: DebtRecord) => {
    setSelectedDebtForPayment(debt);
    setSelectedCustomerForPayment(null);
    setPaymentTargetType('debt');
    setPayAmount(String(debt.balanceDue));
    setPayMethod('cash');
    setPayNotes('');
    setIsPaymentModalOpen(true);
  };

  // Open Payment modal for customer lump-sum
  const handleOpenCustomerPayment = (customer: Customer) => {
    setSelectedCustomerForPayment(customer);
    setSelectedDebtForPayment(null);
    setPaymentTargetType('customer');
    setPayAmount(String(customer.currentDebt));
    setPayMethod('cash');
    setPayNotes(`Payment from ${customer.name}`);
    setIsPaymentModalOpen(true);
  };

  // Submit Payment
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (paymentTargetType === 'debt' && selectedDebtForPayment) {
      onRecordDebtPayment(selectedDebtForPayment.id, amt, payMethod, payNotes);
    } else if (paymentTargetType === 'customer' && selectedCustomerForPayment) {
      if (onRecordCustomerLumpPayment) {
        onRecordCustomerLumpPayment(selectedCustomerForPayment.id, amt, payMethod, payNotes);
      } else {
        // Fallback to paying oldest debt
        const custDebts = debts.filter(
          (d) => d.customerId === selectedCustomerForPayment.id && d.balanceDue > 0
        );
        if (custDebts.length > 0) {
          onRecordDebtPayment(custDebts[0].id, amt, payMethod, payNotes);
        }
      }
    }

    setIsPaymentModalOpen(false);
    setSelectedDebtForPayment(null);
    setSelectedCustomerForPayment(null);
  };

  // Open WhatsApp modal for Debt
  const handleOpenWhatsAppDebt = (debt: DebtRecord) => {
    setSelectedDebtForWhatsApp(debt);
    setSelectedCustomerForWhatsApp(null);
    const isOverdue = debt.status === 'overdue' || (debt.dueDate && debt.dueDate < todayStr);
    setReminderTone(isOverdue ? 'firm' : 'polite');
    setCopiedText(false);
    setIsWhatsAppModalOpen(true);
  };

  // Open WhatsApp modal for Customer
  const handleOpenWhatsAppCustomer = (customer: Customer) => {
    setSelectedCustomerForWhatsApp(customer);
    setSelectedDebtForWhatsApp(null);
    const hasOverdue = debts.some(
      (d) =>
        (d.customerId === customer.id || d.customerPhone === customer.phone) &&
        (d.status === 'overdue' || (d.dueDate && d.dueDate < todayStr)) &&
        d.balanceDue > 0
    );
    setReminderTone(hasOverdue ? 'firm' : 'polite');
    setCopiedText(false);
    setIsWhatsAppModalOpen(true);
  };

  // Open Customer Statement
  const handleOpenCustomerStatement = (customer: Customer) => {
    setStatementCustomer(customer);
    setIsStatementModalOpen(true);
  };

  // Customer Edit/Add Modal
  const handleOpenNewCustomer = () => {
    setEditingCustomer(null);
    setCustFormName('');
    setCustFormPhone('');
    setCustFormEmail('');
    setCustFormAddress('');
    setCustFormNotes('');
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustFormName(customer.name);
    setCustFormPhone(customer.phone);
    setCustFormEmail(customer.email || '');
    setCustFormAddress(customer.address || '');
    setCustFormNotes(customer.notes || '');
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custFormName.trim() || !custFormPhone.trim()) {
      alert('Please provide customer name and phone number.');
      return;
    }

    const updatedCustomer: Customer = {
      id: editingCustomer ? editingCustomer.id : 'cust_' + Date.now(),
      businessId: business.id,
      name: custFormName.trim(),
      phone: custFormPhone.trim(),
      email: custFormEmail.trim() || undefined,
      address: custFormAddress.trim() || undefined,
      notes: custFormNotes.trim() || undefined,
      totalPurchases: editingCustomer ? editingCustomer.totalPurchases : 0,
      currentDebt: editingCustomer ? editingCustomer.currentDebt : 0,
      lastPurchaseDate: editingCustomer ? editingCustomer.lastPurchaseDate : undefined,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
    };

    onSaveCustomer(updatedCustomer);
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  // Add New Debt Submit
  const handleAddNewDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newDebtAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid debt amount.');
      return;
    }

    let custId = newDebtCustId;
    let name = newDebtCustName.trim();
    let phone = newDebtCustPhone.trim();

    if (newDebtCustId) {
      const found = customers.find((c) => c.id === newDebtCustId);
      if (found) {
        name = found.name;
        phone = found.phone;
      }
    } else {
      custId = 'cust_' + Date.now();
      if (!name || !phone) {
        alert('Please provide customer name and phone number.');
        return;
      }
      onSaveCustomer({
        id: custId,
        businessId: business.id,
        name,
        phone,
        totalPurchases: amt,
        currentDebt: amt,
        createdAt: new Date().toISOString(),
      });
    }

    const newRecord: DebtRecord = {
      id: 'debt_' + Date.now(),
      businessId: business.id,
      customerId: custId,
      customerName: name,
      customerPhone: phone,
      initialAmount: amt,
      balanceDue: amt,
      dueDate: newDebtDueDate || undefined,
      notes: newDebtNotes || 'Direct customer debt ledger entry',
      status: 'active',
      history: [],
      createdAt: new Date().toISOString(),
    };

    onAddNewDebt(newRecord);
    setIsNewDebtModalOpen(false);
    setNewDebtCustId('');
    setNewDebtCustName('');
    setNewDebtCustPhone('');
    setNewDebtAmount('');
    setNewDebtNotes('');
  };

  return (
    <div className="space-y-4 pb-24 text-slate-100">
      {/* Header & High-Level Summary Card */}
      <div className="bg-slate-900/95 p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Customers & Debt Management
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track credit sales, record partial payments, maintain 100% consistent ledger balances, and dispatch WhatsApp debt reminders
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-add-customer"
              onClick={handleOpenNewCustomer}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 transition active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Add Customer</span>
            </button>

            <button
              id="btn-record-debt"
              onClick={() => setIsNewDebtModalOpen(true)}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-rose-950 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Credit / Debt</span>
            </button>
          </div>
        </div>

        {/* 4 Financial Health Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] font-semibold text-rose-400 flex items-center justify-between">
              <span>Total Outstanding</span>
              <DollarSign className="w-3.5 h-3.5 opacity-60" />
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-rose-300 mt-1 block">
              {formatMoney(totalOutstanding, business)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Across {debts.filter((d) => d.balanceDue > 0).length} active credit sales
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] font-semibold text-amber-400 flex items-center justify-between">
              <span>Overdue Receivables</span>
              <AlertCircle className="w-3.5 h-3.5 opacity-60" />
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-300 mt-1 block">
              {formatMoney(totalOverdue, business)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {overdueCount} account{overdueCount === 1 ? '' : 's'} past due date
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center justify-between">
              <span>Total Recovered</span>
              <CheckCircle2 className="w-3.5 h-3.5 opacity-60" />
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-300 mt-1 block">
              {formatMoney(totalRecovered, business)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Collected partial & full settlements
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] font-semibold text-sky-400 flex items-center justify-between">
              <span>Customer Debt Ratio</span>
              <Users className="w-3.5 h-3.5 opacity-60" />
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-sky-300 mt-1 block">
              {indebtedCustomersCount} / {customers.length}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Customers currently owing
            </span>
          </div>
        </div>

        {/* Dual Tab Navigation Switcher */}
        <div className="flex border-b border-slate-800 pt-1">
          <button
            id="subtab-debts-ledger"
            onClick={() => setActiveMainTab('debts_ledger')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeMainTab === 'debts_ledger'
                ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Credit & Debt Ledger (Iwe Gbese)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {debts.length}
            </span>
          </button>

          <button
            id="subtab-customers-dir"
            onClick={() => setActiveMainTab('customers_dir')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeMainTab === 'customers_dir'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Directory & Balances</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {customers.length}
            </span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTER TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-debt-search"
            type="text"
            placeholder={
              activeMainTab === 'debts_ledger'
                ? 'Search customer name, phone number, receipt # or notes...'
                : 'Search customers by name, phone, email, or address...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Filter Pills */}
        {activeMainTab === 'debts_ledger' ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all' as const, label: `All (${debts.length})` },
              {
                id: 'active' as const,
                label: `Active Unpaid (${debts.filter((d) => d.balanceDue > 0).length})`,
              },
              { id: 'overdue' as const, label: `Overdue (${overdueCount})` },
              {
                id: 'settled' as const,
                label: `Fully Settled (${debts.filter((d) => d.balanceDue === 0).length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all' as const, label: `All Customers (${customers.length})` },
              {
                id: 'indebted' as const,
                label: `Owing (${indebtedCustomersCount})`,
              },
              {
                id: 'clear' as const,
                label: `Clear Balance (${customers.filter((c) => !c.currentDebt).length})`,
              },
              { id: 'top_spenders' as const, label: `Top Spenders` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCustomerFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  customerFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW 1: DEBTS & CREDIT SALES LEDGER */}
      {activeMainTab === 'debts_ledger' && (
        <div className="space-y-3">
          {filteredDebts.length === 0 ? (
            <div className="py-14 text-center bg-slate-900/60 rounded-3xl border border-slate-800 p-6 text-slate-500 text-xs">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-700 opacity-60" />
              <p className="text-slate-300 font-bold text-sm">No credit or debt records found</p>
              <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                All credit sales from the POS or manual debt entries appear here with live balance reconciliation.
              </p>
              <button
                onClick={() => setIsNewDebtModalOpen(true)}
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Record New Debt
              </button>
            </div>
          ) : (
            filteredDebts.map((debt) => {
              const dueInfo = getDueStatusText(debt.dueDate, debt.balanceDue === 0);
              const isSettled = debt.balanceDue === 0 || debt.status === 'settled';
              const percentPaid = Math.min(
                100,
                Math.round(
                  (((debt.initialAmount || debt.balanceDue) - debt.balanceDue) /
                    (debt.initialAmount || debt.balanceDue)) *
                    100
                )
              );

              return (
                <div
                  key={debt.id}
                  id={`debt-card-${debt.id}`}
                  className={`p-4 sm:p-5 rounded-3xl border transition shadow-lg ${
                    isSettled
                      ? 'bg-slate-900/50 border-slate-800 text-slate-400 opacity-80'
                      : dueInfo.isOverdue
                      ? 'bg-slate-900 border-rose-800/80 ring-1 ring-rose-600/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Customer & Debt metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-slate-100 truncate">
                          {debt.customerName}
                        </h3>

                        {isSettled ? (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Fully Settled
                          </span>
                        ) : dueInfo.isOverdue ? (
                          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 animate-pulse flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{dueInfo.text}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{dueInfo.text}</span>
                          </span>
                        )}

                        {debt.receiptNumber && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                            #{debt.receiptNumber}
                          </span>
                        )}
                      </div>

                      {/* Phone & Date details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5">
                        <a
                          href={`tel:${debt.customerPhone}`}
                          className="flex items-center gap-1 hover:text-emerald-400 transition"
                        >
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{debt.customerPhone || 'No phone'}</span>
                        </a>

                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>Created: {formatShortDate(debt.createdAt)}</span>
                        </span>

                        {debt.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>
                              Due:{' '}
                              <strong className={dueInfo.isOverdue ? 'text-rose-400' : 'text-slate-300'}>
                                {debt.dueDate}
                              </strong>
                            </span>
                          </span>
                        )}
                      </div>

                      {debt.notes && (
                        <p className="text-xs text-slate-300 italic mt-2 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/60 inline-block">
                          "{debt.notes}"
                        </p>
                      )}
                    </div>

                    {/* Right: Balance Due & Fast Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-400 block">
                          Initial: {formatMoney(debt.initialAmount, business)}
                        </span>
                        <span
                          className={`text-lg sm:text-xl font-black font-mono block ${
                            isSettled ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isSettled ? 'PAID IN FULL' : formatMoney(debt.balanceDue, business)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isSettled && (
                          <>
                            <button
                              id={`btn-pay-debt-${debt.id}`}
                              onClick={() => handleOpenDebtPayment(debt)}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Receive Payment</span>
                            </button>

                            <button
                              id={`btn-wa-debt-${debt.id}`}
                              onClick={() => handleOpenWhatsAppDebt(debt)}
                              className="p-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800 rounded-xl transition active:scale-95 cursor-pointer"
                              title="Send WhatsApp Payment Reminder"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar of Payment */}
                  {!isSettled && debt.initialAmount > debt.balanceDue && (
                    <div className="mt-3 pt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Recovered {percentPaid}%</span>
                        <span>
                          {formatMoney(debt.initialAmount - debt.balanceDue, business)} of{' '}
                          {formatMoney(debt.initialAmount, business)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Settlement Payment History Timeline */}
                  {debt.history && debt.history.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-2">
                        <History className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Settlement History ({debt.history.length} payment{debt.history.length === 1 ? '' : 's'} recorded):</span>
                      </div>
                      <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/50">
                        {debt.history.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center justify-between text-[11px] text-slate-300 py-0.5"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                              <span className="text-slate-400">{formatShortDate(h.date)}</span>
                              <span className="font-semibold uppercase text-slate-300">
                                [{h.paymentMethod}]
                              </span>
                              <span className="text-slate-400 truncate">
                                received by {h.receivedByStaff}
                                {h.notes ? ` • "${h.notes}"` : ''}
                              </span>
                            </div>
                            <span className="font-bold font-mono text-emerald-400 flex-shrink-0 ml-2">
                              +{formatMoney(h.amount, business)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: CUSTOMER DIRECTORY & BALANCES */}
      {activeMainTab === 'customers_dir' && (
        <div className="space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="py-14 text-center bg-slate-900/60 rounded-3xl border border-slate-800 p-6 text-slate-500 text-xs">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-700 opacity-60" />
              <p className="text-slate-300 font-bold text-sm">No customers found</p>
              <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                Add customers to keep their purchase history, credit balances, and dispatch statements.
              </p>
              <button
                onClick={handleOpenNewCustomer}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Add First Customer
              </button>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const hasDebt = (customer.currentDebt || 0) > 0;
              const customerActiveDebts = debts.filter(
                (d) => (d.customerId === customer.id || d.customerPhone === customer.phone) && d.balanceDue > 0
              );

              return (
                <div
                  key={customer.id}
                  id={`customer-card-${customer.id}`}
                  className={`p-4 sm:p-5 rounded-3xl border transition shadow-lg ${
                    hasDebt
                      ? 'bg-slate-900 border-rose-800/60 ring-1 ring-rose-600/20'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Customer Info */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Avatar */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white text-base flex-shrink-0 shadow-md ${
                          hasDebt ? 'bg-rose-600 shadow-rose-950' : 'bg-emerald-600 shadow-emerald-950'
                        }`}
                      >
                        {customer.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-slate-100 truncate">
                            {customer.name}
                          </h3>

                          {hasDebt ? (
                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                              Owes {formatMoney(customer.currentDebt, business)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Clear Balance
                            </span>
                          )}
                        </div>

                        {/* Contacts */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                          <a
                            href={`tel:${customer.phone}`}
                            className="flex items-center gap-1 hover:text-emerald-400 transition"
                          >
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{customer.phone}</span>
                          </a>

                          {customer.address && (
                            <span className="flex items-center gap-1 text-slate-500 truncate max-w-xs">
                              <Building2 className="w-3 h-3" />
                              <span className="truncate">{customer.address}</span>
                            </span>
                          )}

                          {customer.lastPurchaseDate && (
                            <span className="text-slate-500">
                              Last visited: {formatShortDate(customer.lastPurchaseDate)}
                            </span>
                          )}
                        </div>

                        {customer.notes && (
                          <p className="text-xs text-slate-400 italic mt-1.5">
                            "{customer.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Financial Figures & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-400 block">Lifetime Purchases</span>
                        <span className="text-base sm:text-lg font-bold font-mono text-emerald-400 block">
                          {formatMoney(customer.totalPurchases || 0, business)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Statement Button */}
                        <button
                          id={`btn-statement-${customer.id}`}
                          onClick={() => handleOpenCustomerStatement(customer)}
                          className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition active:scale-95 cursor-pointer flex items-center gap-1"
                          title="View Complete Customer Ledger Statement"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-400" />
                          <span className="hidden md:inline">Statement</span>
                        </button>

                        {/* Pay Balance Button */}
                        {hasDebt && (
                          <button
                            id={`btn-pay-customer-${customer.id}`}
                            onClick={() => handleOpenCustomerPayment(customer)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Pay Balance</span>
                          </button>
                        )}

                        {/* WhatsApp Reminder Button */}
                        {hasDebt && (
                          <button
                            id={`btn-wa-customer-${customer.id}`}
                            onClick={() => handleOpenWhatsAppCustomer(customer)}
                            className="p-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800 rounded-xl transition active:scale-95 cursor-pointer"
                            title="Send WhatsApp Debt Statement"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Edit Profile Button */}
                        <button
                          onClick={() => handleOpenEditCustomer(customer)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition active:scale-95 cursor-pointer"
                          title="Edit Customer Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Customer Button */}
                        {onDeleteCustomer && !hasDebt && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete customer "${customer.name}"?`)) {
                                onDeleteCustomer(customer.id);
                              }
                            }}
                            className="p-2 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 transition active:scale-95 cursor-pointer"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Active Debt Records list if owing */}
                  {hasDebt && customerActiveDebts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs">
                      <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                        Active Unpaid Invoices / Credit Items ({customerActiveDebts.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {customerActiveDebts.map((d) => (
                          <div
                            key={d.id}
                            className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between"
                          >
                            <div className="truncate">
                              <span className="font-semibold text-slate-200 block truncate">
                                {d.notes || 'Credit Sale'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {d.receiptNumber ? `#${d.receiptNumber} • ` : ''}Due:{' '}
                                {d.dueDate || 'N/A'}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-rose-400 ml-2">
                              {formatMoney(d.balanceDue, business)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: RECORD DEBT / CUSTOMER SETTLEMENT PAYMENT */}
      {/* ============================================================ */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm">
          <form
            onSubmit={handlePaymentSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">Record Payment / Settlement</h3>
                <p className="text-xs text-slate-400">
                  {paymentTargetType === 'debt'
                    ? selectedDebtForPayment?.customerName
                    : selectedCustomerForPayment?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Remaining Balance Summary */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Outstanding:</span>
              <span className="font-bold font-mono text-base text-rose-400">
                {formatMoney(
                  paymentTargetType === 'debt'
                    ? selectedDebtForPayment?.balanceDue
                    : selectedCustomerForPayment?.currentDebt,
                  business
                )}
              </span>
            </div>

            {/* Quick Percentage Presets */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Quick Amount Presets:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '25%', factor: 0.25 },
                  { label: '50%', factor: 0.5 },
                  { label: '75%', factor: 0.75 },
                  { label: '100% Full', factor: 1 },
                ].map((preset) => {
                  const maxAmt =
                    paymentTargetType === 'debt'
                      ? selectedDebtForPayment?.balanceDue || 0
                      : selectedCustomerForPayment?.currentDebt || 0;
                  const calculated = Math.round(maxAmt * preset.factor);

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPayAmount(String(calculated))}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition"
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Amount Received ({business.currencySymbol}):
              </label>
              <input
                id="input-pay-amount"
                type="number"
                required
                min="1"
                max={
                  paymentTargetType === 'debt'
                    ? selectedDebtForPayment?.balanceDue
                    : selectedCustomerForPayment?.currentDebt
                }
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-lg font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />

              {/* Math Breakdown after payment */}
              {payAmount && (
                <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 px-1">
                  <span>Balance After Payment:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {formatMoney(
                      Math.max(
                        0,
                        (paymentTargetType === 'debt'
                          ? selectedDebtForPayment?.balanceDue || 0
                          : selectedCustomerForPayment?.currentDebt || 0) - (parseFloat(payAmount) || 0)
                      ),
                      business
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Payment Channel:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash' as const, label: 'Cash', icon: Banknote },
                  { id: 'transfer' as const, label: 'Transfer', icon: Building2 },
                  { id: 'pos' as const, label: 'POS Card', icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = payMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Payment Reference / Note:</label>
              <input
                type="text"
                placeholder="e.g. Moniepoint transfer ref, cash handed to manager"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-payment"
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer"
              >
                Confirm Settlement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: WHATSAPP DEBT REMINDER DISPATCHER */}
      {/* ============================================================ */}
      {isWhatsAppModalOpen && (selectedDebtForWhatsApp || selectedCustomerForWhatsApp) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">WhatsApp Payment Reminder</h3>
                  <p className="text-xs text-slate-400">
                    {selectedDebtForWhatsApp
                      ? selectedDebtForWhatsApp.customerName
                      : selectedCustomerForWhatsApp?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tone Selector */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Select Message Tone:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'polite' as const, label: 'Gentle & Polite', desc: 'Friendly reminder with appreciation' },
                  { id: 'standard' as const, label: 'Standard Official', desc: 'Direct formal notice' },
                  { id: 'firm' as const, label: 'Firm Overdue', desc: 'Urgent notice for overdue debts' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setReminderTone(t.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      reminderTone === t.id
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold block">{t.label}</span>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Message Preview Box */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Message Preview:</label>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 space-y-2 whitespace-pre-line max-h-48 overflow-y-auto">
                {selectedDebtForWhatsApp ? (
                  decodeURIComponent(
                    buildWhatsAppDebtReminderUrl(selectedDebtForWhatsApp, business, reminderTone).split('text=')[1] || ''
                  )
                ) : selectedCustomerForWhatsApp ? (
                  decodeURIComponent(
                    buildWhatsAppCustomerStatementUrl(
                      selectedCustomerForWhatsApp,
                      debts.filter((d) => d.customerId === selectedCustomerForWhatsApp.id && d.balanceDue > 0),
                      business
                    ).split('text=')[1] || ''
                  )
                ) : null}
              </div>
            </div>

            {/* Bank details note */}
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
              <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                Default Bank Account: <strong>{business.bankAccounts[0]?.bankName || 'Moniepoint'}</strong> (
                {business.bankAccounts[0]?.accountNumber || '8123456789'})
              </span>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const textToCopy = selectedDebtForWhatsApp
                    ? decodeURIComponent(
                        buildWhatsAppDebtReminderUrl(selectedDebtForWhatsApp, business, reminderTone).split('text=')[1] || ''
                      )
                    : selectedCustomerForWhatsApp
                    ? decodeURIComponent(
                        buildWhatsAppCustomerStatementUrl(
                          selectedCustomerForWhatsApp,
                          debts.filter((d) => d.customerId === selectedCustomerForWhatsApp.id && d.balanceDue > 0),
                          business
                        ).split('text=')[1] || ''
                      )
                    : '';
                  navigator.clipboard.writeText(textToCopy);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2500);
                }}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                {copiedText ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <a
                id="btn-send-whatsapp-confirm"
                href={
                  selectedDebtForWhatsApp
                    ? buildWhatsAppDebtReminderUrl(selectedDebtForWhatsApp, business, reminderTone)
                    : selectedCustomerForWhatsApp
                    ? buildWhatsAppCustomerStatementUrl(
                        selectedCustomerForWhatsApp,
                        debts.filter((d) => d.customerId === selectedCustomerForWhatsApp.id && d.balanceDue > 0),
                        business
                      )
                    : '#'
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-center"
              >
                <Share2 className="w-4 h-4" />
                <span>Open WhatsApp & Send</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: COMPLETE CUSTOMER ACCOUNT STATEMENT / LEDGER */}
      {/* ============================================================ */}
      {isStatementModalOpen && statementCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-white">Customer Account Statement</h3>
                <p className="text-xs text-slate-400">
                  Comprehensive ledger & transaction summary for {statementCustomer.name}
                </p>
              </div>
              <button
                onClick={() => setIsStatementModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Statement Header Box */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-base text-white">{statementCustomer.name}</h4>
                  <p className="text-xs text-slate-400">{statementCustomer.phone} • {statementCustomer.address || 'No address'}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-slate-400 block">Current Outstanding Balance</span>
                  <span
                    className={`text-lg font-black font-mono block ${
                      statementCustomer.currentDebt > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatMoney(statementCustomer.currentDebt, business)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Lifetime Spent</span>
                  <span className="font-bold font-mono text-emerald-400">
                    {formatMoney(statementCustomer.totalPurchases, business)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Customer Since</span>
                  <span className="font-semibold text-slate-300">
                    {formatShortDate(statementCustomer.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Last Activity</span>
                  <span className="font-semibold text-slate-300">
                    {statementCustomer.lastPurchaseDate ? formatShortDate(statementCustomer.lastPurchaseDate) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">
                Ledger History (Debts & Partial Payments):
              </h4>
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Description / Item</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Balance Due</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {debts
                      .filter((d) => d.customerId === statementCustomer.id || d.customerPhone === statementCustomer.phone)
                      .map((d) => (
                        <tr key={d.id} className="hover:bg-slate-900/40">
                          <td className="p-3 text-slate-400 whitespace-nowrap">
                            {formatShortDate(d.createdAt)}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-200 block">{d.notes || 'Credit Sale'}</span>
                            {d.receiptNumber && (
                              <span className="text-[10px] text-slate-500 font-mono">#{d.receiptNumber}</span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-300">
                            {formatMoney(d.initialAmount, business)}
                          </td>
                          <td className="p-3 font-mono font-bold text-rose-400">
                            {formatMoney(d.balanceDue, business)}
                          </td>
                          <td className="p-3">
                            {d.balanceDue === 0 ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                                Settled
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded-full border border-rose-800">
                                Owing
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Statement</span>
              </button>

              <a
                href={buildWhatsAppCustomerStatementUrl(
                  statementCustomer,
                  debts.filter((d) => d.customerId === statementCustomer.id && d.balanceDue > 0),
                  business
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-center"
              >
                <Share2 className="w-4 h-4" />
                <span>Send Statement on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: ADD / EDIT CUSTOMER PROFILE */}
      {/* ============================================================ */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm">
          <form
            onSubmit={handleSaveCustomerSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">
                {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Customer Full Name *:</label>
              <input
                id="input-customer-name"
                type="text"
                required
                placeholder="e.g. Mama Nkechi, Alhaji Musa"
                value={custFormName}
                onChange={(e) => setCustFormName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Phone Number (WhatsApp) *:</label>
              <input
                id="input-customer-phone"
                type="tel"
                required
                placeholder="e.g. 0802 345 6789"
                value={custFormPhone}
                onChange={(e) => setCustFormPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Email Address (Optional):</label>
              <input
                type="email"
                placeholder="customer@email.com"
                value={custFormEmail}
                onChange={(e) => setCustFormEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Physical Address / Stall Location:</label>
              <input
                type="text"
                placeholder="e.g. Shop 12, Block B, Main Market"
                value={custFormAddress}
                onChange={(e) => setCustFormAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Notes / Credit Terms:</label>
              <textarea
                rows={2}
                placeholder="e.g. Regular catering client, pays bi-weekly"
                value={custFormNotes}
                onChange={(e) => setCustFormNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                id="btn-save-customer-submit"
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer"
              >
                {editingCustomer ? 'Update Profile' : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: RECORD NEW DEBT / CREDIT SALE ENTRY */}
      {/* ============================================================ */}
      {isNewDebtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm">
          <form
            onSubmit={handleAddNewDebtSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">Record Credit / Debt Entry</h3>
                <p className="text-xs text-slate-400">
                  Direct ledger entry with automatic balance synchronization
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewDebtModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Choose Existing Customer or New */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Select Customer:</label>
              <select
                id="select-debt-customer"
                value={newDebtCustId}
                onChange={(e) => {
                  setNewDebtCustId(e.target.value);
                  const selected = customers.find((c) => c.id === e.target.value);
                  if (selected) {
                    setNewDebtCustName(selected.name);
                    setNewDebtCustPhone(selected.phone);
                  } else {
                    setNewDebtCustName('');
                    setNewDebtCustPhone('');
                  }
                }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Create New Customer On-The-Fly --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) {c.currentDebt ? `• Owes ₦${c.currentDebt.toLocaleString()}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {!newDebtCustId && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Customer Name *:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chief Okafor"
                    value={newDebtCustName}
                    onChange={(e) => setNewDebtCustName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Phone Number *:</label>
                  <input
                    type="tel"
                    required
                    placeholder="080..."
                    value={newDebtCustPhone}
                    onChange={(e) => setNewDebtCustPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Debt Amount ({business.currencySymbol}) *:
                </label>
                <input
                  id="input-new-debt-amount"
                  type="number"
                  required
                  min="1"
                  placeholder="0.00"
                  value={newDebtAmount}
                  onChange={(e) => setNewDebtAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Due Date:</label>
                <input
                  type="date"
                  value={newDebtDueDate}
                  onChange={(e) => setNewDebtDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Particulars / Items Taken on Credit:
              </label>
              <textarea
                rows={2}
                placeholder="e.g. 2 bags of rice & 1 carton groundnut oil"
                value={newDebtNotes}
                onChange={(e) => setNewDebtNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsNewDebtModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                id="btn-save-new-debt-submit"
                type="submit"
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950 transition active:scale-95 cursor-pointer"
              >
                Record Debt
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
