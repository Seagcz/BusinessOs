import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  CreditCard,
  Building2,
  Banknote,
  BookOpen,
  Layers,
  Printer,
  Share2,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  User,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  X,
  Lock,
  Trash2,
} from 'lucide-react';
import {
  Sale,
  BusinessProfile,
  StaffUser,
  PaymentMethod,
} from '../types';
import {
  formatMoney,
  formatDate,
  formatShortDate,
  buildWhatsAppReceiptUrl,
} from '../utils/formatters';

interface SalesHistoryViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  sales: Sale[];
  onOpenReceipt: (sale: Sale) => void;
  onVoidSale?: (saleId: string, reason: string) => void;
  onDeleteSale?: (saleId: string) => void;
  onSwitchToRegister?: () => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  business,
  currentStaff,
  sales,
  onOpenReceipt,
  onVoidSale,
  onDeleteSale,
  onSwitchToRegister,
}) => {
  // Permissions
  const canViewProfit = currentStaff.role === 'owner' || currentStaff.role === 'accountant' || currentStaff.canViewProfit === true;
  const canVoidSales = currentStaff.role === 'owner' || currentStaff.role === 'manager' || currentStaff.canVoidSales === true;
  const canDeleteSales = currentStaff.role === 'owner' || currentStaff.canDeleteSales === true;

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'voided'>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Expanded items state
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Voiding modal state
  const [voidModalSale, setVoidModalSale] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('Customer returned goods');
  const [customVoidReason, setCustomVoidReason] = useState('');

  // Delete modal state
  const [deleteModalSale, setDeleteModalSale] = useState<Sale | null>(null);

  // Date boundaries
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  // Unique staff members in sales
  const uniqueStaff = useMemo(() => {
    const map = new Map<string, string>();
    sales.forEach((s) => {
      if (s.staffId && s.staffName) {
        map.set(s.staffId, s.staffName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sales]);

  // Filter and sort sales
  const filteredSales = useMemo(() => {
    return sales
      .filter((sale) => {
        const saleDateStr = (sale.createdAt || sale.date || '').split('T')[0];

        // 1. Date filter
        if (dateFilter === 'today' && saleDateStr !== todayStr) return false;
        if (dateFilter === 'yesterday' && saleDateStr !== yesterdayStr) return false;
        if (dateFilter === 'month' && !saleDateStr.startsWith(thisMonthStr)) return false;
        if (dateFilter === 'week') {
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
          if ((sale.createdAt || sale.date || '') < weekAgo) return false;
        }
        if (dateFilter === 'custom') {
          if (customStartDate && saleDateStr < customStartDate) return false;
          if (customEndDate && saleDateStr > customEndDate) return false;
        }

        // 2. Payment filter
        if (paymentFilter !== 'all' && sale.paymentMethod !== paymentFilter) return false;

        // 3. Status filter
        if (statusFilter !== 'all' && sale.status !== statusFilter) return false;

        // 4. Staff filter
        if (staffFilter !== 'all' && sale.staffId !== staffFilter && sale.staffName !== staffFilter) return false;

        // 5. Search Query (receipt, customer, phone, staff, product name)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesReceipt = sale.receiptNumber?.toLowerCase().includes(q);
          const matchesCustomer = sale.customerName?.toLowerCase().includes(q);
          const matchesPhone = sale.customerPhone?.toLowerCase().includes(q);
          const matchesStaff = sale.staffName?.toLowerCase().includes(q);
          const matchesItems = sale.items?.some((item) =>
            item.productName?.toLowerCase().includes(q)
          );
          if (!matchesReceipt && !matchesCustomer && !matchesPhone && !matchesStaff && !matchesItems) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.createdAt || b.date || 0).getTime();
        const totalA = a.totalAmount ?? a.total ?? 0;
        const totalB = b.totalAmount ?? b.total ?? 0;

        if (sortOrder === 'newest') return dateB - dateA;
        if (sortOrder === 'oldest') return dateA - dateB;
        if (sortOrder === 'highest') return totalB - totalA;
        if (sortOrder === 'lowest') return totalA - totalB;
        return 0;
      });
  }, [
    sales,
    dateFilter,
    todayStr,
    yesterdayStr,
    thisMonthStr,
    customStartDate,
    customEndDate,
    paymentFilter,
    statusFilter,
    staffFilter,
    searchQuery,
    sortOrder,
  ]);

  // Aggregate Metrics for current filtered view (excluding voided sales from financial totals)
  const metrics = useMemo(() => {
    const activeSales = filteredSales.filter((s) => s.status !== 'voided');
    const totalRev = activeSales.reduce((sum, s) => sum + (s.totalAmount ?? s.total ?? 0), 0);
    const totalCost = activeSales.reduce((sum, s) => sum + (s.totalCost ?? s.costTotal ?? 0), 0);
    const totalProfit = totalRev - totalCost;
    const count = activeSales.length;
    const avgTicket = count > 0 ? totalRev / count : 0;
    const totalItems = activeSales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0),
      0
    );

    const cashTotal = activeSales
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + (s.totalAmount ?? s.total ?? 0), 0);
    const transferTotal = activeSales
      .filter((s) => s.paymentMethod === 'transfer')
      .reduce((sum, s) => sum + (s.totalAmount ?? s.total ?? 0), 0);
    const posTotal = activeSales
      .filter((s) => s.paymentMethod === 'pos')
      .reduce((sum, s) => sum + (s.totalAmount ?? s.total ?? 0), 0);
    const creditTotal = activeSales
      .filter((s) => s.paymentMethod === 'credit')
      .reduce((sum, s) => sum + (s.totalAmount ?? s.total ?? 0), 0);

    const voidedCount = filteredSales.filter((s) => s.status === 'voided').length;

    return {
      totalRev,
      totalCost,
      totalProfit,
      count,
      avgTicket,
      totalItems,
      cashTotal,
      transferTotal,
      posTotal,
      creditTotal,
      voidedCount,
    };
  }, [filteredSales]);

  // Handle Void Confirmation
  const handleConfirmVoid = () => {
    if (!voidModalSale || !onVoidSale) return;
    const finalReason = voidReason === 'Other' ? (customVoidReason || 'Voided by manager') : voidReason;
    onVoidSale(voidModalSale.id, finalReason);
    setVoidModalSale(null);
    setVoidReason('Customer returned goods');
    setCustomVoidReason('');
  };

  // Handle Delete Confirmation (Sensitive action restricted to Owners / authorized staff)
  const handleConfirmDelete = () => {
    if (!deleteModalSale || !onDeleteSale) return;
    onDeleteSale(deleteModalSale.id);
    setDeleteModalSale(null);
  };

  // Export Filtered Sales to CSV
  const handleExportCSV = () => {
    const headers = 'Receipt Number,Date,Time,Customer,Phone,Items Count,Subtotal,Discount,Tax,Total Amount,Total Cost,Gross Profit,Payment Method,Status,Cashier,Notes\n';
    const rows = filteredSales
      .map((s) => {
        const d = new Date(s.createdAt || s.date || Date.now());
        const dateStr = d.toISOString().split('T')[0];
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const itemsCount = s.items.reduce((acc, i) => acc + i.quantity, 0);
        const subtotal = s.subtotal ?? s.totalAmount ?? 0;
        const discount = s.discountAmount ?? 0;
        const tax = s.taxAmount ?? 0;
        const total = s.totalAmount ?? s.total ?? 0;
        const cost = canViewProfit ? (s.totalCost ?? s.costTotal ?? 0) : '[Restricted]';
        const profit = canViewProfit ? (s.profit ?? (total - (s.totalCost ?? s.costTotal ?? 0))) : '[Restricted]';
        const notes = (s.notes || '').replace(/"/g, '""');
        return `"${s.receiptNumber}","${dateStr}","${timeStr}","${s.customerName || 'Walk-in'}","${s.customerPhone || ''}","${itemsCount}","${subtotal}","${discount}","${tax}","${total}","${cost}","${profit}","${s.paymentMethod}","${s.status}","${s.staffName}","${notes}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sales_History_${business.name.replace(/\s+/g, '_')}_${todayStr}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4 pb-20 text-slate-100">
      {/* Top Header & Quick Action Bar */}
      <div className="bg-slate-900/90 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              <h1 className="text-xl font-bold text-white">Sales Ledger & History</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-[11px] font-bold text-emerald-300">
                {filteredSales.length} records
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live inventory-connected transactions, receipt reprinting & payment reconciliation
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToRegister && (
              <button
                id="btn-goto-register"
                onClick={onSwitchToRegister}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Open Cashier Register</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition"
              title="Download Filtered Sales CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Sorters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="sales-history-search"
              type="text"
              placeholder="Search receipt #, customer name, phone, product item or cashier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="sm:col-span-4 flex gap-2">
            <div className="relative flex-1">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="highest">Sort: Highest Amount</option>
                <option value="lowest">Sort: Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Date Filter Tabs */}
        <div className="space-y-2">
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1 overflow-x-auto">
            {[
              { id: 'today' as const, label: 'Today' },
              { id: 'yesterday' as const, label: 'Yesterday' },
              { id: 'week' as const, label: 'Last 7 Days' },
              { id: 'month' as const, label: 'This Month' },
              { id: 'all' as const, label: 'All Time' },
              { id: 'custom' as const, label: '📅 Custom Date' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  dateFilter === tab.id
                    ? 'bg-emerald-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker inputs */}
          {dateFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
              <span className="text-slate-400">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-400">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              {(customStartDate || customEndDate) && (
                <button
                  onClick={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="text-rose-400 hover:text-rose-300 text-xs font-medium ml-auto"
                >
                  Reset Range
                </button>
              )}
            </div>
          )}
        </div>

        {/* Secondary Filter Chips Row (Payment Channel, Status, Cashier) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          {/* Payment Method Selector */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Payment Channels</option>
            <option value="cash">💵 Cash Only</option>
            <option value="transfer">📱 Bank Transfer</option>
            <option value="pos">💳 Card POS</option>
            <option value="credit">📝 Credit / Debt</option>
            <option value="split">🔀 Split Payment</option>
          </select>

          {/* Status Selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">✅ Completed Only</option>
            <option value="voided">🚫 Voided / Refunded</option>
          </select>

          {/* Cashier Selector */}
          {uniqueStaff.length > 1 && (
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Staff Cashiers</option>
              {uniqueStaff.map((st) => (
                <option key={st.id} value={st.id}>
                  👤 {st.name}
                </option>
              ))}
            </select>
          )}

          {(paymentFilter !== 'all' || statusFilter !== 'all' || staffFilter !== 'all') && (
            <button
              onClick={() => {
                setPaymentFilter('all');
                setStatusFilter('all');
                setStaffFilter('all');
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Financial Performance Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Filtered Sales Revenue */}
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 block">Gross Sales Revenue</span>
          <span className="text-base sm:text-xl font-black font-mono text-emerald-400 mt-1 block">
            {formatMoney(metrics.totalRev, business)}
          </span>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
            <span>{metrics.count} completed orders</span>
            <span>{metrics.totalItems} items sold</span>
          </div>
        </div>

        {/* Realized Gross Profit */}
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 block">Gross Profit (Margin)</span>
            {!canViewProfit && <Lock className="w-3.5 h-3.5 text-slate-500" />}
          </div>
          {canViewProfit ? (
            <>
              <span className="text-base sm:text-xl font-black font-mono text-teal-300 mt-1 block">
                {formatMoney(metrics.totalProfit, business)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {metrics.totalRev > 0
                  ? `${((metrics.totalProfit / metrics.totalRev) * 100).toFixed(1)}% margin`
                  : '0% margin'}
              </span>
            </>
          ) : (
            <div className="mt-1.5 space-y-1">
              <span className="text-sm font-bold text-slate-500 block font-mono">🔒 Restricted</span>
              <span className="text-[10px] text-slate-500 block">Accountant / Owner access</span>
            </div>
          )}
        </div>

        {/* Average Basket Size */}
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 block">Avg. Order Value</span>
          <span className="text-base sm:text-xl font-black font-mono text-blue-400 mt-1 block">
            {formatMoney(metrics.avgTicket, business)}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Per transaction ticket</span>
        </div>

        {/* Channel Breakdown Quick Pills */}
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 block">Payment Reconciled</span>
          <div className="grid grid-cols-2 gap-1 text-[10px] mt-1">
            <span className="text-emerald-400 font-mono font-semibold truncate">
              💵 {formatMoney(metrics.cashTotal, business, true)}
            </span>
            <span className="text-blue-400 font-mono font-semibold truncate">
              📱 {formatMoney(metrics.transferTotal, business, true)}
            </span>
            <span className="text-purple-400 font-mono font-semibold truncate">
              💳 {formatMoney(metrics.posTotal, business, true)}
            </span>
            <span className="text-rose-400 font-mono font-semibold truncate">
              📝 {formatMoney(metrics.creditTotal, business, true)}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredSales.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-slate-900/70 border border-slate-800 rounded-3xl space-y-3">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
            <h3 className="text-base font-bold text-slate-200">No sales match your search & filter</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting the date range, clearing filters, or switch to the cashier terminal to ring up a new customer sale.
            </p>
            {onSwitchToRegister && (
              <button
                onClick={onSwitchToRegister}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow transition"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Start New Sale</span>
              </button>
            )}
          </div>
        ) : (
          filteredSales.map((sale) => {
            const isExpanded = expandedSaleId === sale.id;
            const isVoided = sale.status === 'voided';
            const saleTotal = sale.totalAmount ?? sale.total ?? 0;
            const saleCost = sale.totalCost ?? sale.costTotal ?? 0;
            const saleProfit = sale.profit ?? (saleTotal - saleCost);
            const itemsCount = sale.items.reduce((acc, i) => acc + i.quantity, 0);
            const whatsAppUrl = buildWhatsAppReceiptUrl(sale, business);

            const getPaymentBadge = (method: PaymentMethod) => {
              switch (method) {
                case 'cash':
                  return <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">💵 Cash</span>;
                case 'transfer':
                  return <span className="px-2 py-0.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 font-bold">📱 Transfer</span>;
                case 'pos':
                  return <span className="px-2 py-0.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 font-bold">💳 POS</span>;
                case 'credit':
                  return <span className="px-2 py-0.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 font-bold">📝 Credit (Debt)</span>;
                case 'split':
                  return <span className="px-2 py-0.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 font-bold">🔀 Split</span>;
                default:
                  return <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">{method}</span>;
              }
            };

            return (
              <div
                key={sale.id}
                id={`sale-card-${sale.id}`}
                className={`rounded-3xl border transition overflow-hidden ${
                  isVoided
                    ? 'bg-rose-950/20 border-rose-900/60 opacity-85'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-md'
                }`}
              >
                {/* Main Card Header / Summary Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-black ${
                        isVoided
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                      }`}
                    >
                      {isVoided ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-sm text-white">
                          #{sale.receiptNumber}
                        </span>
                        {isVoided ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-900 text-rose-200 text-[10px] font-bold uppercase tracking-wider">
                            Voided / Refunded
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-800">
                            Completed
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {formatDate(sale.createdAt || sale.date || '')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                        <span>
                          Cashier: <strong className="text-slate-200">{sale.staffName}</strong>
                        </span>
                        {sale.customerName && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <User className="w-3 h-3 text-emerald-400" />
                            <strong>{sale.customerName}</strong>
                            {sale.customerPhone && <span className="text-slate-500">({sale.customerPhone})</span>}
                          </span>
                        )}
                        <span>
                          {itemsCount} item{itemsCount === 1 ? '' : 's'}
                        </span>
                      </div>

                      {sale.bankTransferReference && (
                        <p className="text-[11px] text-blue-300 mt-1 font-mono">
                          Ref / Remark: {sale.bankTransferReference}
                        </p>
                      )}

                      {isVoided && sale.voidReason && (
                        <p className="text-[11px] text-rose-300 mt-1 italic">
                          ⚠️ Void Note: {sale.voidReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Financial Total and Quick Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-left md:text-right">
                      <div className="text-xs text-slate-400 mb-0.5">
                        {getPaymentBadge(sale.paymentMethod)}
                      </div>
                      <span
                        className={`text-lg sm:text-xl font-black font-mono block ${
                          isVoided ? 'text-slate-500 line-through' : 'text-emerald-400'
                        }`}
                      >
                        {formatMoney(saleTotal, business)}
                      </span>
                      {!isVoided && canViewProfit && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Profit: <strong className="text-teal-300">{formatMoney(saleProfit, business, true)}</strong>
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {/* View & Print Receipt */}
                      <button
                        onClick={() => onOpenReceipt(sale)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                        title="View & Print Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Share WhatsApp */}
                      <a
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 transition"
                        title="Share WhatsApp Receipt"
                      >
                        <Share2 className="w-4 h-4" />
                      </a>

                      {/* Void / Refund Button (Manager / Permitted Staff) */}
                      {!isVoided && onVoidSale && canVoidSales && (
                        <button
                          onClick={() => setVoidModalSale(sale)}
                          className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 transition"
                          title="Void Sale & Restore Stock"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Sensitive Action: Permanently Delete Sale (Owner / Authorized Staff) */}
                      {onDeleteSale && canDeleteSales && (
                        <button
                          onClick={() => setDeleteModalSale(sale)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 border border-slate-700 transition"
                          title="🚨 Sensitive: Delete Sale Permanently (Owner action)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Expand Accordion */}
                      <button
                        onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                        title={isExpanded ? 'Collapse' : 'Expand Items'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Itemized Line Items Table */}
                {isExpanded && (
                  <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Purchased Line Items</span>
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 font-semibold text-[11px]">
                            <th className="pb-1.5">Product Name</th>
                            <th className="pb-1.5 text-center">Unit Price</th>
                            <th className="pb-1.5 text-center">Qty</th>
                            <th className="pb-1.5 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 font-sans">
                          {sale.items.map((item, i) => (
                            <tr key={i} className="text-slate-300">
                              <td className="py-2 pr-2 font-medium">
                                <div>{item.productName}</div>
                                {item.unit && <span className="text-[10px] text-slate-500">Unit: {item.unit}</span>}
                              </td>
                              <td className="py-2 text-center font-mono">
                                {formatMoney(item.unitPrice, business, true)}
                              </td>
                              <td className="py-2 text-center font-mono font-bold text-white">
                                x{item.quantity}
                              </td>
                              <td className="py-2 text-right font-mono font-bold text-emerald-400">
                                {formatMoney(item.subtotal, business, true)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Breakdown Summary footer */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                      <div className="space-x-3">
                        {sale.discountAmount > 0 && (
                          <span>Discount Applied: -{formatMoney(sale.discountAmount, business, true)}</span>
                        )}
                        {sale.taxAmount > 0 && (
                          <span>VAT Included: +{formatMoney(sale.taxAmount, business, true)}</span>
                        )}
                        {sale.notes && <span>Note: {sale.notes}</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenReceipt(sale)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold"
                        >
                          Open Full Thermal Receipt 🖨️
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* VOID SALE MODAL */}
      {voidModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800 rounded-3xl w-full max-w-md shadow-2xl p-5 text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Void & Reverse Sale</h3>
              </div>
              <button
                onClick={() => setVoidModalSale(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-xs space-y-1 text-rose-200">
              <p>
                You are voiding Receipt <strong>#{voidModalSale.receiptNumber}</strong> worth{' '}
                <strong className="font-mono text-white">
                  {formatMoney(voidModalSale.totalAmount ?? voidModalSale.total ?? 0, business)}
                </strong>.
              </p>
              <p className="text-slate-300 pt-1">
                📦 <strong>Automatic Inventory Restock:</strong> All items in this sale will be immediately returned back to your stock inventory count.
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Reason for Voiding:</label>
              <select
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="Customer returned goods">Customer returned goods / Refund</option>
                <option value="Incorrect item or quantity entered">Incorrect item or quantity entered</option>
                <option value="Customer changed mind before paying">Customer changed mind before paying</option>
                <option value="Payment reversed / failed">Bank transfer / POS Payment failed</option>
                <option value="Test transaction">Test transaction</option>
                <option value="Other">Other reason (specify below)</option>
              </select>
            </div>

            {voidReason === 'Other' && (
              <div>
                <input
                  type="text"
                  placeholder="Explain why this sale is being voided..."
                  value={customVoidReason}
                  onChange={(e) => setCustomVoidReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setVoidModalSale(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-void-sale"
                onClick={handleConfirmVoid}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Void & Restock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SENSITIVE ACTION: PERMANENT DELETE SALE MODAL */}
      {deleteModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800 rounded-3xl w-full max-w-md shadow-2xl p-5 text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Permanently Delete Sale Record</h3>
              </div>
              <button
                onClick={() => setDeleteModalSale(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-xs space-y-1 text-rose-200">
              <p className="font-bold text-white">⚠️ Sensitive Administrative Action</p>
              <p>
                You are about to permanently delete Receipt <strong>#{deleteModalSale.receiptNumber}</strong> (
                <span className="font-mono text-white">
                  {formatMoney(deleteModalSale.totalAmount ?? deleteModalSale.total ?? 0, business)}
                </span>
                ).
              </p>
              <p className="text-slate-300 pt-1">
                This will completely remove the transaction record from store ledgers and create an entry in the system audit log.
              </p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalSale(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-sale"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
