import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  BookOpen,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Share2,
  CheckCircle2,
  Copy,
  Clock,
  ChevronRight,
  Sparkles,
  Zap,
  Package,
  FileText,
  AlertTriangle,
  AlertCircle,
  Fuel,
  Lightbulb,
  DollarSign,
  Printer,
  Calendar,
  X,
  Check,
  Search,
  Lock,
} from 'lucide-react';
import {
  BusinessProfile,
  Sale,
  Product,
  DebtRecord,
  Expense,
  StaffUser,
  NavigationTab,
  ExpenseCategory,
} from '../types';
import {
  formatMoney,
  formatShortDate,
  formatDate,
  buildWhatsAppDebtReminderUrl,
  buildWhatsAppReceiptUrl,
} from '../utils/formatters';
import { PRODUCT_CATEGORIES, EXPENSE_CATEGORIES_CONFIG } from '../services/nigerianData';

interface DashboardViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  sales: Sale[];
  products: Product[];
  debts: DebtRecord[];
  expenses: Expense[];
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenReceipt?: (sale: Sale) => void;
  onQuickRestock?: (product: Product) => void;
  onSaveExpense?: (expense: Expense) => void;
  onSaveProduct?: (product: Product) => void;
  onRestockProduct?: (productId: string, addedQty: number, newCostPrice?: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  business,
  currentStaff,
  sales,
  products,
  debts,
  expenses,
  onNavigateTab,
  onOpenReceipt,
  onQuickRestock,
  onSaveExpense,
  onSaveProduct,
  onRestockProduct,
}) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Permission Checks
  const canViewProfit = currentStaff.role === 'owner' || currentStaff.role === 'accountant' || currentStaff.canViewProfit === true;
  const canManageExpenses = currentStaff.role === 'owner' || currentStaff.role === 'accountant' || currentStaff.role === 'manager' || currentStaff.canManageExpenses === true;
  const canManageProducts = currentStaff.role === 'owner' || currentStaff.role === 'manager' || currentStaff.role === 'inventory_manager' || currentStaff.canManageProducts === true;
  const canRestock = currentStaff.role === 'owner' || currentStaff.role === 'manager' || currentStaff.role === 'inventory_manager' || currentStaff.canRestock === true;

  // Modals for instant dashboard action
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [targetRestockProduct, setTargetRestockProduct] = useState<Product | null>(null);

  // Quick Expense Form State
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('generator_fuel');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'cash' | 'transfer' | 'pos'>('cash');
  const [expenseNote, setExpenseNote] = useState('');

  // Quick Product Form State
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [productCostPrice, setProductCostPrice] = useState('');
  const [productSellingPrice, setProductSellingPrice] = useState('');
  const [productStockQuantity, setProductStockQuantity] = useState('');
  const [productMinThreshold, setProductMinThreshold] = useState('5');
  const [productUnit, setProductUnit] = useState('pcs');

  // Quick Restock Form State
  const [restockQtyInput, setRestockQtyInput] = useState('10');
  const [restockCostInput, setRestockCostInput] = useState('');

  // Today Sales Metrics
  const todaySales = useMemo(
    () => sales.filter((s) => s.createdAt.startsWith(todayStr) && s.status === 'completed'),
    [sales, todayStr]
  );
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const todayProfit = todaySales.reduce((acc, s) => acc + s.profit, 0);

  // Sales Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let transfer = 0;
    let pos = 0;
    let credit = 0;

    todaySales.forEach((s) => {
      if (s.paymentMethod === 'cash') cash += s.totalAmount;
      else if (s.paymentMethod === 'transfer') transfer += s.totalAmount;
      else if (s.paymentMethod === 'pos') pos += s.totalAmount;
      else if (s.paymentMethod === 'credit') credit += s.totalAmount;
      else if (s.paymentMethod === 'split' && s.splitPayments) {
        cash += s.splitPayments.cash || 0;
        transfer += s.splitPayments.transfer || 0;
        pos += s.splitPayments.pos || 0;
        credit += s.splitPayments.credit || 0;
      }
    });

    return { cash, transfer, pos, credit };
  }, [todaySales]);

  // Today Expenses Metrics
  const todayExpensesList = useMemo(
    () => expenses.filter((e) => e.date.startsWith(todayStr)),
    [expenses, todayStr]
  );
  const todayExpensesTotal = todayExpensesList.reduce((acc, e) => acc + e.amount, 0);

  // Today Net Profit (Gross Profit from Sales minus Operating Expenses)
  const todayNetProfit = todayProfit - todayExpensesTotal;
  const profitMarginPercent = todayRevenue > 0 ? Math.round((todayNetProfit / todayRevenue) * 100) : 0;

  // Active Debts (Outstanding Receivables)
  const activeDebts = useMemo(
    () => debts.filter((d) => d.status === 'active' || d.status === 'overdue' || d.status === 'partially_paid'),
    [debts]
  );
  const totalReceivables = activeDebts.reduce((acc, d) => acc + d.balanceDue, 0);
  const overdueDebts = activeDebts.filter((d) => d.status === 'overdue' || (d.dueDate && d.dueDate < todayStr));

  // Low Stock & Out of Stock Products
  const criticalProducts = useMemo(() => {
    return products
      .filter((p) => p.isActive && p.stockQuantity <= p.minStockThreshold)
      .sort((a, b) => a.stockQuantity - b.stockQuantity);
  }, [products]);

  // Out of stock count
  const outOfStockCount = useMemo(
    () => products.filter((p) => p.isActive && p.stockQuantity <= 0).length,
    [products]
  );

  // Recent Completed Sales (Last 5)
  const recentTransactions = useMemo(() => {
    return sales
      .filter((s) => s.status === 'completed')
      .slice(0, 5);
  }, [sales]);

  // Weekly Sales Trend Data (7 Days)
  const weeklySalesTrend = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: { day: string; date: string; amount: number; heightPercent: number }[] = [];

    let maxAmount = 1000;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];

      const dayTotal = sales
        .filter((s) => s.createdAt.startsWith(dStr) && s.status === 'completed')
        .reduce((sum, s) => sum + s.totalAmount, 0);

      if (dayTotal > maxAmount) maxAmount = dayTotal;
      result.push({ day: dayName, date: dStr, amount: dayTotal, heightPercent: 0 });
    }

    return result.map((item) => ({
      ...item,
      heightPercent: item.amount === 0 ? 12 : Math.max(20, Math.min(100, Math.round((item.amount / maxAmount) * 100))),
    }));
  }, [sales]);

  // Bank Account Copy State
  const defaultBank = business.bankAccounts.find((b) => b.isDefault) || business.bankAccounts[0];
  const [copiedBank, setCopiedBank] = useState(false);

  const handleCopyAccount = () => {
    if (defaultBank) {
      navigator.clipboard.writeText(
        `${defaultBank.bankName} - ${defaultBank.accountNumber} (${defaultBank.accountName})`
      );
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    }
  };

  // Quick Add Expense Submit
  const handleQuickAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amountNum) || amountNum <= 0) return;

    const newExpense: Expense = {
      id: 'exp_' + Date.now(),
      businessId: business.id,
      title: expenseTitle.trim(),
      category: expenseCategory,
      amount: amountNum,
      paymentMethod: expensePaymentMethod,
      date: new Date().toISOString(),
      recordedBy: currentStaff.name,
      receiptNote: expenseNote.trim() || undefined,
      isSynced: true,
    };

    if (onSaveExpense) {
      onSaveExpense(newExpense);
    }
    // Reset Form
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseNote('');
    setIsAddExpenseModalOpen(false);
  };

  // Quick Add Product Submit
  const handleQuickAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(productCostPrice) || 0;
    const sell = parseFloat(productSellingPrice) || 0;
    const qty = parseInt(productStockQuantity, 10) || 0;
    const minThreshold = parseInt(productMinThreshold, 10) || 5;

    if (!productName.trim() || sell <= 0) return;

    const newProduct: Product = {
      id: 'prod_' + Date.now(),
      businessId: business.id,
      name: productName.trim(),
      category: productCategory,
      sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      costPrice: cost,
      sellingPrice: sell,
      stockQuantity: qty,
      minStockThreshold: minThreshold,
      unit: productUnit || 'pcs',
      isActive: true,
      updatedAt: new Date().toISOString(),
    };

    if (onSaveProduct) {
      onSaveProduct(newProduct);
    }
    // Reset Form
    setProductName('');
    setProductCostPrice('');
    setProductSellingPrice('');
    setProductStockQuantity('');
    setIsAddProductModalOpen(false);
  };

  // Quick Restock Submit
  const handleQuickRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRestockProduct) return;
    const addedQty = parseInt(restockQtyInput, 10);
    const newCost = restockCostInput ? parseFloat(restockCostInput) : undefined;

    if (isNaN(addedQty) || addedQty <= 0) return;

    if (onRestockProduct) {
      onRestockProduct(targetRestockProduct.id, addedQty, newCost);
    }
    setIsRestockModalOpen(false);
    setTargetRestockProduct(null);
  };

  const openRestockModal = (prod: Product) => {
    setTargetRestockProduct(prod);
    setRestockQtyInput('10');
    setRestockCostInput(String(prod.costPrice));
    setIsRestockModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP GREETING & STATUS BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{business.logoEmoji || '🏬'}</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {business.name}
            </h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {business.city}, {business.state}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800 font-semibold">{currentStaff.name}</strong> ({currentStaff.role}) • Today: {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Offline Ready</span>
          </div>

          {defaultBank && (
            <button
              onClick={handleCopyAccount}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-xl transition cursor-pointer border border-slate-200"
              title="Copy Bank Transfer Details"
            >
              {copiedBank ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedBank ? 'Bank Copied!' : `${defaultBank.bankName.split(' ')[0]}: ${defaultBank.accountNumber}`}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. PROMINENT PRIMARY ACTION BUTTONS (4-GRID) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* QUICK SALE (PRIMARY) */}
        <button
          id="btn-quick-sale-hero"
          onClick={() => onNavigateTab('pos')}
          className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md hover:shadow-lg transition-all transform active:scale-98 text-left border border-slate-700 cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/15 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-xs group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              F1 / Pos
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1">
              <span>Quick Sale</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Record counter sale & receipt
            </p>
          </div>
        </button>

        {/* ADD EXPENSE */}
        <button
          id="btn-add-expense-hero"
          onClick={() => setIsAddExpenseModalOpen(true)}
          className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white hover:bg-rose-50/50 text-slate-900 shadow-xs hover:shadow-md transition-all transform active:scale-98 text-left border border-slate-200/80 hover:border-rose-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black shadow-xs group-hover:scale-110 transition-transform">
              <Fuel className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
              Fuel & NEPA
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1 group-hover:text-rose-700 transition-colors">
              <span>Add Expense</span>
              <Plus className="w-4 h-4 text-rose-600" />
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Log PMS petrol, bills & rent
            </p>
          </div>
        </button>

        {/* ADD PRODUCT */}
        <button
          id="btn-add-product-hero"
          onClick={() => setIsAddProductModalOpen(true)}
          className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white hover:bg-sky-50/50 text-slate-900 shadow-xs hover:shadow-md transition-all transform active:scale-98 text-left border border-slate-200/80 hover:border-sky-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black shadow-xs group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
              {products.length} Items
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1 group-hover:text-sky-700 transition-colors">
              <span>Add Product</span>
              <Plus className="w-4 h-4 text-sky-600" />
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              New stock, prices & barcode
            </p>
          </div>
        </button>

        {/* CREATE INVOICE */}
        <button
          id="btn-create-invoice-hero"
          onClick={() => onNavigateTab('invoices')}
          className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white hover:bg-purple-50/50 text-slate-900 shadow-xs hover:shadow-md transition-all transform active:scale-98 text-left border border-slate-200/80 hover:border-purple-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black shadow-xs group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
              WhatsApp
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1 group-hover:text-purple-700 transition-colors">
              <span>Create Invoice</span>
              <ArrowUpRight className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Send PDF quote / bill to buyer
            </p>
          </div>
        </button>
      </div>

      {/* 3. TODAY'S FINANCIAL METRICS (4 CORE KPIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TODAY'S SALES */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Today's Sales
              </span>
              <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                {todaySales.length} Orders
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono tracking-tight">
              {formatMoney(todayRevenue, business)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Avg. {todaySales.length > 0 ? formatMoney(Math.round(todayRevenue / todaySales.length), business) : '₦0'} / order
            </p>
          </div>

          {/* Payment Breakdown Pills */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[10px] text-slate-600">
            <div className="flex justify-between bg-slate-50 px-2 py-1 rounded-md">
              <span className="text-slate-400">Cash:</span>
              <span className="font-bold font-mono">{formatMoney(paymentBreakdown.cash, business, true)}</span>
            </div>
            <div className="flex justify-between bg-slate-50 px-2 py-1 rounded-md">
              <span className="text-slate-400">Transfer:</span>
              <span className="font-bold font-mono">{formatMoney(paymentBreakdown.transfer, business, true)}</span>
            </div>
            <div className="flex justify-between bg-slate-50 px-2 py-1 rounded-md">
              <span className="text-slate-400">POS:</span>
              <span className="font-bold font-mono">{formatMoney(paymentBreakdown.pos, business, true)}</span>
            </div>
            <div className="flex justify-between bg-amber-50 px-2 py-1 rounded-md text-amber-900">
              <span className="text-amber-600">Credit:</span>
              <span className="font-bold font-mono">{formatMoney(paymentBreakdown.credit, business, true)}</span>
            </div>
          </div>
        </div>

        {/* TODAY'S EXPENSES */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Today's Expenses
              </span>
              <span className="text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full">
                {todayExpensesList.length} Logged
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-rose-600 mt-2 font-mono tracking-tight">
              {formatMoney(todayExpensesTotal, business)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Fuel, electricity, transport & rent
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('expenses')}
              className="text-xs font-bold text-slate-700 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition"
            >
              <span>View All Expenses</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsAddExpenseModalOpen(true)}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              + Log Fast
            </button>
          </div>
        </div>

        {/* TODAY'S ESTIMATED NET PROFIT */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Today's Net Profit
              </span>
              {canViewProfit ? (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    todayNetProfit >= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}
                >
                  {profitMarginPercent}% Margin
                </span>
              ) : (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
            {canViewProfit ? (
              <>
                <h3
                  className={`text-2xl sm:text-3xl font-black mt-2 font-mono tracking-tight ${
                    todayNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatMoney(todayNetProfit, business)}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Gross Profit {formatMoney(todayProfit, business, true)} - Expenses
                </p>
              </>
            ) : (
              <div className="mt-2.5 space-y-1">
                <h3 className="text-xl font-black text-slate-400 font-mono tracking-tight">
                  🔒 Restricted
                </h3>
                <p className="text-xs text-slate-400">
                  Hidden by store role policy
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Net Status:</span>
            {canViewProfit ? (
              <span
                className={`font-bold ${
                  todayNetProfit > 0
                    ? 'text-emerald-700'
                    : todayNetProfit === 0
                    ? 'text-slate-500'
                    : 'text-rose-600'
                }`}
              >
                {todayNetProfit > 0 ? '✅ Profitable Day' : todayNetProfit === 0 ? '⚖️ Break-even' : '⚠️ Net Loss Today'}
              </span>
            ) : (
              <span className="font-medium text-slate-400">Accountant/Owner role</span>
            )}
          </div>
        </div>

        {/* TOTAL OUTSTANDING DEBTS (RECEIVABLES) */}
        <div className="bg-[#0F172A] text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Customer Debts
              </span>
              <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                {activeDebts.length} Debtors
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 font-mono tracking-tight">
              {formatMoney(totalReceivables, business)}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              {overdueDebts.length > 0 ? `${overdueDebts.length} overdue payments pending` : 'All debtor balances tracked'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('debts')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition"
            >
              <span>Open Debt Book</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-400 font-medium">
              WhatsApp ready
            </span>
          </div>
        </div>
      </div>

      {/* 4. MAIN TWO-COLUMN SECTION: RECENT TRANSACTIONS & LOW STOCK PRODUCTS */}
      <div className="grid grid-cols-12 gap-5">
        {/* LEFT COLUMN (Span 7 / 12): RECENT TRANSACTIONS */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Recent Transactions</h3>
                  <p className="text-xs text-slate-400">Latest completed counter sales & receipts</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('reports')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <span>All Sales ({sales.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Transactions List */}
            <div className="divide-y divide-slate-100 mt-2">
              {recentTransactions.map((sale) => {
                const totalItemCount = sale.items.reduce((acc, it) => acc + it.quantity, 0);
                const itemsSummary = sale.items.map((it) => it.productName).slice(0, 2).join(', ') + (sale.items.length > 2 ? '...' : '');

                return (
                  <div
                    key={sale.id}
                    onClick={() => onOpenReceipt && onOpenReceipt(sale)}
                    className="py-3 px-2 -mx-2 rounded-xl hover:bg-slate-50/80 transition flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-xs font-black text-slate-700 flex-shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition">
                        #{sale.receiptNumber.slice(-3)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {sale.customerName || 'Walk-in Customer'}
                          </p>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              sale.paymentMethod === 'credit'
                                ? 'bg-amber-100 text-amber-800'
                                : sale.paymentMethod === 'transfer'
                                ? 'bg-sky-100 text-sky-800'
                                : sale.paymentMethod === 'pos'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {sale.paymentMethod}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {formatShortDate(sale.createdAt)} • {totalItemCount} item{totalItemCount === 1 ? '' : 's'} ({itemsSummary})
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                          {formatMoney(sale.totalAmount, business)}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          +{formatMoney(sale.profit, business, true)} profit
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
                    </div>
                  </div>
                );
              })}

              {recentTransactions.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-700">No sales recorded yet today</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click "Quick Sale" to ring up your first counter order.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('pos')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Record New Sale</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN (Span 5 / 12): LOW-STOCK & CRITICAL INVENTORY */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900">Low-Stock Alert</h3>
                    {criticalProducts.length > 0 && (
                      <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                        {criticalProducts.length} Needs Restock
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Items at or below reorder threshold</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('inventory')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Stock ({products.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Critical Products List */}
            <div className="divide-y divide-slate-100 mt-2">
              {criticalProducts.slice(0, 4).map((prod) => {
                const isOut = prod.stockQuantity <= 0;

                return (
                  <div
                    key={prod.id}
                    className="py-3 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-base flex-shrink-0">
                        {prod.imageEmoji || prod.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {prod.category} • Price: {formatMoney(prod.sellingPrice, business, true)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <span
                          className={`inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : `${prod.stockQuantity} ${prod.unit} left`}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-0.5">Min: {prod.minStockThreshold}</p>
                      </div>

                      <button
                        onClick={() => openRestockModal(prod)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                        title={`Quick Restock ${prod.name}`}
                      >
                        + Restock
                      </button>
                    </div>
                  </div>
                );
              })}

              {criticalProducts.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-xs font-bold text-slate-700">Inventory levels are healthy</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">All products are currently above their reorder threshold.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => setIsAddProductModalOpen(true)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-xl text-xs font-bold transition text-center cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              <span>+ Add New Product</span>
            </button>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Stock Table →
            </button>
          </div>
        </div>
      </div>

      {/* 5. 7-DAY SALES TREND VISUALIZATION */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className="font-black text-slate-900 text-base">Weekly Sales Trend (Last 7 Days)</h3>
            <p className="text-xs text-slate-400">Revenue performance across the trading week</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
              <span className="text-slate-600 font-medium">Daily Revenue</span>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-emerald-600 font-bold hover:underline cursor-pointer"
            >
              Full Analytics →
            </button>
          </div>
        </div>

        {/* Dynamic Bar Chart */}
        <div className="flex items-end justify-between h-32 pt-4 px-2 sm:px-6 gap-2 sm:gap-4 bg-slate-50/70 rounded-xl border border-slate-100">
          {weeklySalesTrend.map((item, idx) => {
            const isToday = item.date === todayStr;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="text-[10px] font-mono font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition truncate">
                  {formatMoney(item.amount, business, true)}
                </div>
                <div className="w-full max-w-[48px] bg-slate-200/60 rounded-t-lg h-24 flex items-end overflow-hidden">
                  <div
                    style={{ height: `${item.heightPercent}%` }}
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      isToday
                        ? 'bg-emerald-500 hover:bg-emerald-400 shadow-xs ring-1 ring-emerald-600'
                        : item.amount > 0
                        ? 'bg-emerald-300 hover:bg-emerald-400'
                        : 'bg-slate-300/60'
                    }`}
                  />
                </div>
                <div className="text-center mt-1">
                  <span className={`text-[11px] font-bold block ${isToday ? 'text-emerald-700 font-black' : 'text-slate-500'}`}>
                    {item.day}
                  </span>
                  {isToday && (
                    <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-100 px-1 py-0.2 rounded">
                      Today
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUICK IN-DASHBOARD MODALS */}
      {/* ========================================================================= */}

      {/* 1. QUICK ADD EXPENSE MODAL */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Add Operating Expense</h3>
                  <p className="text-xs text-slate-400">Record shop spending, fuel or electricity</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddExpenseSubmit} className="space-y-4 mt-4">
              {/* Preset quick buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseTitle('Generator Fuel (PMS)');
                    setExpenseCategory('generator_fuel');
                  }}
                  className="p-2 rounded-xl border border-slate-200 hover:border-rose-300 bg-slate-50 hover:bg-rose-50 text-[11px] font-bold text-slate-700 text-left transition cursor-pointer"
                >
                  ⛽ Gen Petrol
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseTitle('NEPA Disco Token');
                    setExpenseCategory('electricity_nepa');
                  }}
                  className="p-2 rounded-xl border border-slate-200 hover:border-amber-300 bg-slate-50 hover:bg-amber-50 text-[11px] font-bold text-slate-700 text-left transition cursor-pointer"
                >
                  💡 NEPA Token
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseTitle('Dispatch Delivery');
                    setExpenseCategory('transport_dispatch');
                  }}
                  className="p-2 rounded-xl border border-slate-200 hover:border-sky-300 bg-slate-50 hover:bg-sky-50 text-[11px] font-bold text-slate-700 text-left transition cursor-pointer"
                >
                  🛵 Dispatch Fare
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10 Litres Petrol for Generator"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-rose-500"
                  >
                    {Object.entries(EXPENSE_CATEGORIES_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.iconEmoji} {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₦) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="e.g. 8500"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-rose-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Paid Via</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'transfer', 'pos'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setExpensePaymentMethod(method)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize transition cursor-pointer border ${
                        expensePaymentMethod === method
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Note / Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TotalEnergies filling station Lekki"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. QUICK ADD PRODUCT MODAL */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Add Inventory Product</h3>
                  <p className="text-xs text-slate-400">Register new item to stock catalog</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddProductSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Golden Penny Spaghetti 500g"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-500"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={productUnit}
                    onChange={(e) => setProductUnit(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-500"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="carton">Carton</option>
                    <option value="pack">Pack</option>
                    <option value="roll">Roll</option>
                    <option value="bottle">Bottle</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="litre">Litre</option>
                    <option value="pair">Pair</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cost Price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 700"
                    value={productCostPrice}
                    onChange={(e) => setProductCostPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₦) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="e.g. 950"
                    value={productSellingPrice}
                    onChange={(e) => setProductSellingPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-emerald-700 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    value={productStockQuantity}
                    onChange={(e) => setProductStockQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Low-Stock Alert Level</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={productMinThreshold}
                    onChange={(e) => setProductMinThreshold(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. QUICK RESTOCK MODAL */}
      {isRestockModalOpen && targetRestockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-slate-900 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Restock Product</h3>
                  <p className="text-xs text-slate-400 truncate max-w-[200px]">{targetRestockProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRestockModalOpen(false);
                  setTargetRestockProduct(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickRestockSubmit} className="space-y-4 mt-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Stock:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {targetRestockProduct.stockQuantity} {targetRestockProduct.unit}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-500">Alert Threshold:</span>
                  <span className="font-bold text-amber-700 font-mono">
                    {targetRestockProduct.minStockThreshold} {targetRestockProduct.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantity to Add ({targetRestockProduct.unit}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={restockQtyInput}
                  onChange={(e) => setRestockQtyInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-black text-emerald-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supplier Cost Price per unit (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={restockCostInput}
                  onChange={(e) => setRestockCostInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRestockModalOpen(false);
                    setTargetRestockProduct(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
