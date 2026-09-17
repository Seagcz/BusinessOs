import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Share2,
  Download,
  Printer,
  ShoppingBag,
  CreditCard,
  Building2,
  Banknote,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  UserCheck,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  Filter,
  X,
  Clock,
  AlertTriangle,
  ChevronDown,
  Percent,
  Wallet,
  Users,
  Search,
  Eye,
  FileText,
  Copy,
  ChevronRight,
  Check,
} from 'lucide-react';
import {
  Sale,
  Expense,
  Product,
  DebtRecord,
  BusinessProfile,
  StaffUser,
  Customer,
  Invoice,
  PaymentMethod,
} from '../types';
import {
  formatMoney,
  formatDate,
  formatShortDate,
  downloadHtmlFile,
} from '../utils/formatters';

interface ReportsViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  debts: DebtRecord[];
  customers?: Customer[];
  staffList?: StaffUser[];
  invoices?: Invoice[];
  onOpenReceipt?: (sale: Sale) => void;
}

type ReportTab = 'overview' | 'sales' | 'payments' | 'inventory' | 'staff_debts';
type PresetRange =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'last_month'
  | 'quarter'
  | 'year'
  | 'custom'
  | 'all';

export const ReportsView: React.FC<ReportsViewProps> = ({
  business,
  currentStaff,
  sales,
  expenses,
  products,
  debts,
  customers = [],
  staffList = [],
  invoices = [],
  onOpenReceipt,
}) => {
  // Navigation Sub-tab
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('overview');

  // Date Range Controls
  const [timeRange, setTimeRange] = useState<PresetRange>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Secondary Filters
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [topProductsSortBy, setTopProductsSortBy] = useState<'revenue' | 'qty' | 'profit'>('revenue');

  // Modals
  const [isZReportModalOpen, setIsZReportModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setCopiedToast(msg);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  // Date helpers
  const todayObj = new Date();
  const todayStr = todayObj.toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const thisMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

  // Calculate Start & End Date based on Preset
  const { filterStartDate, filterEndDate, rangeLabel } = useMemo(() => {
    let start = todayStr;
    let end = todayStr;
    let label = 'Today';

    if (timeRange === 'today') {
      start = todayStr;
      end = todayStr;
      label = `Today (${todayStr})`;
    } else if (timeRange === 'yesterday') {
      start = yesterdayStr;
      end = yesterdayStr;
      label = `Yesterday (${yesterdayStr})`;
    } else if (timeRange === 'week') {
      const d = new Date(Date.now() - 6 * 86400000);
      start = d.toISOString().split('T')[0];
      end = todayStr;
      label = 'Last 7 Days';
    } else if (timeRange === 'month') {
      start = `${thisMonthPrefix}-01`;
      end = todayStr;
      label = `This Month (${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })})`;
    } else if (timeRange === 'last_month') {
      const lastMonthDate = new Date(todayObj.getFullYear(), todayObj.getMonth() - 1, 1);
      const lastMonthEnd = new Date(todayObj.getFullYear(), todayObj.getMonth(), 0);
      start = lastMonthDate.toISOString().split('T')[0];
      end = lastMonthEnd.toISOString().split('T')[0];
      label = `Last Month (${lastMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })})`;
    } else if (timeRange === 'quarter') {
      const currentQuarter = Math.floor(todayObj.getMonth() / 3);
      const qStart = new Date(todayObj.getFullYear(), currentQuarter * 3, 1);
      start = qStart.toISOString().split('T')[0];
      end = todayStr;
      label = `This Quarter (Q${currentQuarter + 1} ${todayObj.getFullYear()})`;
    } else if (timeRange === 'year') {
      start = `${todayObj.getFullYear()}-01-01`;
      end = todayStr;
      label = `Year ${todayObj.getFullYear()}`;
    } else if (timeRange === 'custom') {
      start = customStartDate || '1970-01-01';
      end = customEndDate || todayStr;
      label = `${customStartDate} to ${customEndDate}`;
    } else if (timeRange === 'all') {
      start = '1970-01-01';
      end = '2099-12-31';
      label = 'All Time History';
    }

    return { filterStartDate: start, filterEndDate: end, rangeLabel: label };
  }, [timeRange, todayStr, yesterdayStr, thisMonthPrefix, customStartDate, customEndDate]);

  // List of all unique product categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered Sales Transactions (Completed, within date range and matching secondary filters)
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Must not be voided
      if (sale.status === 'voided') return false;

      const saleDateStr = (sale.createdAt || sale.date || '').split('T')[0];
      if (!saleDateStr) return false;

      // Date range check
      if (saleDateStr < filterStartDate || saleDateStr > filterEndDate) {
        return false;
      }

      // Staff filter
      if (selectedStaffFilter !== 'all') {
        if (sale.staffName !== selectedStaffFilter && sale.staffId !== selectedStaffFilter) {
          return false;
        }
      }

      // Payment filter
      if (selectedPaymentFilter !== 'all') {
        if (sale.paymentMethod !== selectedPaymentFilter) {
          return false;
        }
      }

      // Category filter
      if (selectedCategoryFilter !== 'all') {
        const hasCategory = sale.items.some((item) => {
          const prod = products.find((p) => p.id === item.productId || p.name === item.productName);
          return prod?.category === selectedCategoryFilter;
        });
        if (!hasCategory) return false;
      }

      return true;
    });
  }, [
    sales,
    filterStartDate,
    filterEndDate,
    selectedStaffFilter,
    selectedPaymentFilter,
    selectedCategoryFilter,
    products,
  ]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const expDateStr = (exp.date || '').split('T')[0];
      if (!expDateStr) return false;

      if (expDateStr < filterStartDate || expDateStr > filterEndDate) {
        return false;
      }

      if (selectedStaffFilter !== 'all' && exp.recordedBy !== selectedStaffFilter) {
        return false;
      }

      return true;
    });
  }, [expenses, filterStartDate, filterEndDate, selectedStaffFilter]);

  // Filtered Debt Payments Collected in this date range
  const filteredDebtPayments = useMemo(() => {
    const list: {
      debtId: string;
      customerName: string;
      customerPhone: string;
      amount: number;
      date: string;
      paymentMethod: string;
      receivedByStaff: string;
    }[] = [];

    debts.forEach((debt) => {
      if (debt.history && debt.history.length > 0) {
        debt.history.forEach((hist) => {
          const histDateStr = (hist.date || '').split('T')[0];
          if (histDateStr >= filterStartDate && histDateStr <= filterEndDate) {
            list.push({
              debtId: debt.id,
              customerName: debt.customerName,
              customerPhone: debt.customerPhone,
              amount: hist.amount,
              date: hist.date,
              paymentMethod: hist.paymentMethod,
              receivedByStaff: hist.receivedByStaff,
            });
          }
        });
      }
    });

    return list;
  }, [debts, filterStartDate, filterEndDate]);

  // -------------------------------------------------------------
  // ACCURATE FINANCIAL CALCULATIONS
  // -------------------------------------------------------------

  // 1. Sales & Revenue
  const totalSalesRevenue = useMemo(
    () => filteredSales.reduce((sum, s) => sum + (s.totalAmount ?? s.total ?? 0), 0),
    [filteredSales]
  );

  const totalSalesSubtotal = useMemo(
    () => filteredSales.reduce((sum, s) => sum + (s.subtotal ?? s.totalAmount ?? 0), 0),
    [filteredSales]
  );

  const totalDiscountsGranted = useMemo(
    () => filteredSales.reduce((sum, s) => sum + (s.discountAmount || 0), 0),
    [filteredSales]
  );

  const totalTaxesCollected = useMemo(
    () => filteredSales.reduce((sum, s) => sum + (s.taxAmount || 0), 0),
    [filteredSales]
  );

  const totalCostOfGoodsSold = useMemo(
    () => filteredSales.reduce((sum, s) => sum + (s.totalCost ?? s.costTotal ?? 0), 0),
    [filteredSales]
  );

  const totalOrdersCount = filteredSales.length;

  const averageOrderValue = totalOrdersCount > 0 ? totalSalesRevenue / totalOrdersCount : 0;

  const totalUnitsSold = useMemo(() => {
    return filteredSales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, item) => iSum + (item.quantity || 0), 0),
      0
    );
  }, [filteredSales]);

  // 2. Profitability
  const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;
  const grossProfitMarginPercent =
    totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  const totalOperatingExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const netProfit = grossProfit - totalOperatingExpenses;
  const netProfitMarginPercent =
    totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

  // 3. Payment Methods Breakdown (with split payments accuracy)
  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let transfer = 0;
    let pos = 0;
    let credit = 0;

    filteredSales.forEach((s) => {
      if (s.paymentMethod === 'split' && s.splitPayments) {
        cash += s.splitPayments.cash || 0;
        transfer += s.splitPayments.transfer || 0;
        pos += s.splitPayments.pos || 0;
        credit += s.splitPayments.credit || 0;
      } else if (s.paymentMethod === 'cash') {
        cash += s.totalAmount ?? s.total ?? 0;
      } else if (s.paymentMethod === 'transfer') {
        transfer += s.totalAmount ?? s.total ?? 0;
      } else if (s.paymentMethod === 'pos') {
        pos += s.totalAmount ?? s.total ?? 0;
      } else if (s.paymentMethod === 'credit') {
        credit += s.totalAmount ?? s.total ?? 0;
      }
    });

    const totalCollected = cash + transfer + pos;
    const totalWithCredit = totalCollected + credit;

    return {
      cash,
      transfer,
      pos,
      credit,
      totalCollected,
      totalWithCredit,
      cashPercent: totalWithCredit > 0 ? (cash / totalWithCredit) * 100 : 0,
      transferPercent: totalWithCredit > 0 ? (transfer / totalWithCredit) * 100 : 0,
      posPercent: totalWithCredit > 0 ? (pos / totalWithCredit) * 100 : 0,
      creditPercent: totalWithCredit > 0 ? (credit / totalWithCredit) * 100 : 0,
    };
  }, [filteredSales]);

  // 4. Categorized Expenses
  const categorizedExpenses = useMemo(() => {
    const map: { [cat: string]: { category: string; amount: number; count: number } } = {};
    filteredExpenses.forEach((exp) => {
      const cat = exp.category || 'other';
      if (!map[cat]) {
        map[cat] = { category: cat, amount: 0, count: 0 };
      }
      map[cat].amount += exp.amount;
      map[cat].count += 1;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  // 5. Best-Selling Products Analytics
  const topProductsAnalytics = useMemo(() => {
    const map: {
      [key: string]: {
        id: string;
        name: string;
        category: string;
        unit: string;
        qtySold: number;
        revenue: number;
        cost: number;
        profit: number;
        margin: number;
      };
    } = {};

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const pKey = item.productId || item.productName;
        const prod = products.find((p) => p.id === item.productId || p.name === item.productName);

        const itemRev = item.subtotal ?? item.unitPrice * item.quantity;
        const itemUnitCost = item.costPrice ?? prod?.costPrice ?? 0;
        const itemCost = itemUnitCost * item.quantity;
        const itemProfit = itemRev - itemCost;

        if (!map[pKey]) {
          map[pKey] = {
            id: item.productId || pKey,
            name: item.productName || prod?.name || 'Item',
            category: prod?.category || 'General',
            unit: item.unit || prod?.unit || 'pcs',
            qtySold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
          };
        }

        map[pKey].qtySold += item.quantity;
        map[pKey].revenue += itemRev;
        map[pKey].cost += itemCost;
        map[pKey].profit += itemProfit;
      });
    });

    const list = Object.values(map).map((p) => ({
      ...p,
      margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
    }));

    if (topProductsSortBy === 'qty') {
      return list.sort((a, b) => b.qtySold - a.qtySold);
    } else if (topProductsSortBy === 'profit') {
      return list.sort((a, b) => b.profit - a.profit);
    } else {
      return list.sort((a, b) => b.revenue - a.revenue);
    }
  }, [filteredSales, products, topProductsSortBy]);

  // 6. Category Revenue Distribution
  const categoryRevenueBreakdown = useMemo(() => {
    const map: { [cat: string]: { category: string; revenue: number; itemsCount: number } } = {};
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId || p.name === item.productName);
        const cat = prod?.category || 'General';
        const itemRev = item.subtotal ?? item.unitPrice * item.quantity;

        if (!map[cat]) {
          map[cat] = { category: cat, revenue: 0, itemsCount: 0 };
        }
        map[cat].revenue += itemRev;
        map[cat].itemsCount += item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, products]);

  // 7. Hourly Peak Trading Hours (for daily/weekly inspection)
  const hourlySalesDistribution = useMemo(() => {
    const hoursMap: { [hour: number]: { hour: number; label: string; count: number; total: number } } = {};
    for (let h = 0; h < 24; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formattedH = h % 12 === 0 ? 12 : h % 12;
      hoursMap[h] = {
        hour: h,
        label: `${formattedH} ${ampm}`,
        count: 0,
        total: 0,
      };
    }

    filteredSales.forEach((sale) => {
      const d = new Date(sale.createdAt || sale.date || '');
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        hoursMap[h].count += 1;
        hoursMap[h].total += sale.totalAmount ?? sale.total ?? 0;
      }
    });

    return Object.values(hoursMap).filter((h) => h.hour >= 6 && h.hour <= 22); // active trading window 6am - 10pm
  }, [filteredSales]);

  // 8. Staff / Cashier Sales Leaderboard
  const staffSalesPerformance = useMemo(() => {
    const map: {
      [name: string]: {
        name: string;
        ordersCount: number;
        totalRevenue: number;
        totalDiscounts: number;
        avgOrder: number;
      };
    } = {};

    filteredSales.forEach((s) => {
      const name = s.staffName || 'Cashier';
      if (!map[name]) {
        map[name] = {
          name,
          ordersCount: 0,
          totalRevenue: 0,
          totalDiscounts: 0,
          avgOrder: 0,
        };
      }
      map[name].ordersCount += 1;
      map[name].totalRevenue += s.totalAmount ?? s.total ?? 0;
      map[name].totalDiscounts += s.discountAmount || 0;
    });

    return Object.values(map)
      .map((st) => ({
        ...st,
        avgOrder: st.ordersCount > 0 ? st.totalRevenue / st.ordersCount : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredSales]);

  // 9. Live Inventory Valuation & Stock Health Metrics
  const inventoryValuation = useMemo(() => {
    let totalStockUnits = 0;
    let wholesaleCostValue = 0;
    let retailSellingValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let healthyStockCount = 0;

    const thresholdGlobal = business.lowStockGlobalThreshold || 5;

    products.forEach((p) => {
      const qty = Math.max(0, p.stockQuantity || 0);
      const cost = p.costPrice || 0;
      const sell = p.sellingPrice || 0;

      totalStockUnits += qty;
      wholesaleCostValue += qty * cost;
      retailSellingValue += qty * sell;

      const minThresh = p.minStockThreshold ?? thresholdGlobal;
      if (qty === 0) {
        outOfStockCount += 1;
      } else if (qty <= minThresh) {
        lowStockCount += 1;
      } else {
        healthyStockCount += 1;
      }
    });

    const potentialUnrealizedProfit = retailSellingValue - wholesaleCostValue;
    const potentialMarginPercent =
      retailSellingValue > 0 ? (potentialUnrealizedProfit / retailSellingValue) * 100 : 0;

    return {
      totalProductsCount: products.length,
      totalStockUnits,
      wholesaleCostValue,
      retailSellingValue,
      potentialUnrealizedProfit,
      potentialMarginPercent,
      lowStockCount,
      outOfStockCount,
      healthyStockCount,
    };
  }, [products, business.lowStockGlobalThreshold]);

  // 10. Debts & Receivables Overview
  const debtMetrics = useMemo(() => {
    let totalOutstandingBalance = 0;
    let overdueBalance = 0;
    let activeDebtorsCount = 0;
    let overdueDebtorsCount = 0;

    const todayDate = todayStr;

    debts.forEach((d) => {
      if (d.balanceDue > 0) {
        totalOutstandingBalance += d.balanceDue;
        activeDebtorsCount += 1;

        if (d.status === 'overdue' || (d.dueDate && d.dueDate < todayDate)) {
          overdueBalance += d.balanceDue;
          overdueDebtorsCount += 1;
        }
      }
    });

    const totalRecoveredInRange = filteredDebtPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalOutstandingBalance,
      overdueBalance,
      activeDebtorsCount,
      overdueDebtorsCount,
      totalRecoveredInRange,
    };
  }, [debts, filteredDebtPayments, todayStr]);

  // -------------------------------------------------------------
  // SHARING & EXPORTS
  // -------------------------------------------------------------

  // Generate Formatted WhatsApp Summary
  const buildWhatsAppSummaryText = () => {
    const text = `📊 *${business.name.toUpperCase()} — FINANCIAL REPORT*
🗓️ *Period:* ${rangeLabel}
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Gross Sales Revenue:* ${formatMoney(totalSalesRevenue, business, true)}
📦 *Cost of Goods (COGS):* -${formatMoney(totalCostOfGoodsSold, business, true)}
📈 *Gross Profit:* ${formatMoney(grossProfit, business, true)} (${grossProfitMarginPercent.toFixed(1)}% margin)
🧾 *Operating Expenses:* -${formatMoney(totalOperatingExpenses, business, true)}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 *CLEAN NET PROFIT:* *${formatMoney(netProfit, business, true)}* (${netProfitMarginPercent.toFixed(1)}% net margin)
━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 *PAYMENT RECONCILIATION:*
• 💵 Cash in Drawer: ${formatMoney(paymentBreakdown.cash, business, true)} (${paymentBreakdown.cashPercent.toFixed(0)}%)
• 📱 Bank Transfers: ${formatMoney(paymentBreakdown.transfer, business, true)} (${paymentBreakdown.transferPercent.toFixed(0)}%)
• 💳 POS Terminal: ${formatMoney(paymentBreakdown.pos, business, true)} (${paymentBreakdown.posPercent.toFixed(0)}%)
• 📝 Customer Credit/Debts: ${formatMoney(paymentBreakdown.credit, business, true)}
${paymentBreakdown.credit > 0 ? `• 🪙 Actual Liquid Collected: ${formatMoney(paymentBreakdown.totalCollected, business, true)}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 *SALES VOLUME:*
• Completed Orders: ${totalOrdersCount} orders
• Total Units Sold: ${totalUnitsSold} items
• Average Order Value: ${formatMoney(averageOrderValue, business, true)}

📦 *INVENTORY VALUATION:*
• Wholesale Stock Value: ${formatMoney(inventoryValuation.wholesaleCostValue, business, true)}
• Retail Potential Value: ${formatMoney(inventoryValuation.retailSellingValue, business, true)}
• Low/Out of Stock SKUs: ${inventoryValuation.lowStockCount + inventoryValuation.outOfStockCount} items

📝 *RECEIVABLES (DEBTS):*
• Total Outstanding Debt: ${formatMoney(debtMetrics.totalOutstandingBalance, business, true)}
• Debt Recoveries in Period: ${formatMoney(debtMetrics.totalRecoveredInRange, business, true)}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated via Small Business OS • ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

    return text;
  };

  const handleShareWhatsApp = () => {
    const msg = buildWhatsAppSummaryText();
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCopySummary = () => {
    const msg = buildWhatsAppSummaryText();
    navigator.clipboard.writeText(msg);
    showToast('Executive Report copied to clipboard!');
  };

  // Export CSV Sales Ledger
  const handleExportSalesCSV = () => {
    const headers =
      'Receipt Number,Date,Time,Cashier,Customer,Items Count,Subtotal,Discount,Tax,Total Revenue,COGS Cost,Gross Profit,Payment Method\n';
    const rows = filteredSales
      .map((s) => {
        const d = new Date(s.createdAt || s.date || '');
        const datePart = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
        const timePart = !isNaN(d.getTime())
          ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : '';
        const total = s.totalAmount ?? s.total ?? 0;
        const cost = s.totalCost ?? s.costTotal ?? 0;
        const profit = s.profit ?? total - cost;
        const itemsCount = s.items.reduce((sum, it) => sum + it.quantity, 0);

        return `"${s.receiptNumber}","${datePart}","${timePart}","${s.staffName}","${
          s.customerName || 'Walk-in'
        }","${itemsCount}","${s.subtotal || total}","${s.discountAmount || 0}","${
          s.taxAmount || 0
        }","${total}","${cost}","${profit}","${s.paymentMethod}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sales_Ledger_${business.name.replace(/\s+/g, '_')}_${filterStartDate}_to_${filterEndDate}.csv`;
    link.click();
    showToast('Sales CSV export downloaded!');
  };

  // Export CSV Best Sellers
  const handleExportTopProductsCSV = () => {
    const headers = 'Product Name,Category,Unit,Quantity Sold,Total Revenue,Total Cost,Gross Profit,Profit Margin %\n';
    const rows = topProductsAnalytics
      .map((p) => {
        return `"${p.name}","${p.category}","${p.unit}","${p.qtySold}","${p.revenue}","${p.cost}","${p.profit}","${p.margin.toFixed(1)}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Best_Selling_Products_${business.name.replace(/\s+/g, '_')}_${filterStartDate}_to_${filterEndDate}.csv`;
    link.click();
    showToast('Best-Sellers CSV export downloaded!');
  };

  // Download Printable Full Financial Statement HTML
  const handleDownloadExecutiveStatementHtml = () => {
    const defaultBank = business.bankAccounts.find((b) => b.isDefault) || business.bankAccounts[0];

    const topItemsRows = topProductsAnalytics
      .slice(0, 10)
      .map(
        (p, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 6px 8px;">${idx + 1}. <strong>${p.name}</strong></td>
        <td style="padding: 6px 8px; color: #64748b;">${p.category}</td>
        <td style="padding: 6px 8px; text-align: center;">${p.qtySold} ${p.unit}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace;">${formatMoney(p.revenue, business, true)}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #16a34a; font-weight: bold;">${formatMoney(p.profit, business, true)}</td>
      </tr>
    `
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Financial Report - ${business.name} - ${rangeLabel}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #fff; padding: 20px; line-height: 1.5; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .biz-title { font-size: 22px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
    .biz-sub { font-size: 11px; color: #475569; margin-top: 2px; }
    .report-badge { background: #0f172a; color: #fff; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; display: inline-block; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
    .kpi-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; }
    .kpi-val { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px; font-family: monospace; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 20px 0 10px 0; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
    .pl-table td { padding: 8px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    .pl-grand { font-size: 14px; font-weight: 900; background: #f8fafc; }
    .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #64748b; text-align: center; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right; margin-bottom: 15px;">
    <button onclick="window.print()" style="background: #0f172a; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">🖨️ Print Statement / Save PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="biz-title">${business.name}</div>
      <div class="biz-sub">${business.address}, ${business.city}, ${business.state} • Tel: ${business.phone}</div>
      ${business.cacNumber ? `<div class="biz-sub">RC / CAC: ${business.cacNumber} ${business.tinNumber ? `• TIN: ${business.tinNumber}` : ''}</div>` : ''}
    </div>
    <div style="text-align: right;">
      <div class="report-badge">Executive P&L Statement</div>
      <div style="font-size: 11px; font-weight: bold; margin-top: 6px; color: #0f172a;">${rangeLabel}</div>
      <div style="font-size: 10px; color: #64748b;">Generated: ${new Date().toLocaleString('en-GB')}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Sales Revenue</div>
      <div class="kpi-val" style="color: #16a34a;">${formatMoney(totalSalesRevenue, business, true)}</div>
      <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${totalOrdersCount} orders (${totalUnitsSold} items)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Cost of Goods (COGS)</div>
      <div class="kpi-val">${formatMoney(totalCostOfGoodsSold, business, true)}</div>
      <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Inventory wholesale cost</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Operating Expenses</div>
      <div class="kpi-val" style="color: #ea580c;">${formatMoney(totalOperatingExpenses, business, true)}</div>
      <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${filteredExpenses.length} expense items</div>
    </div>
    <div class="kpi-card" style="background: #f0fdf4; border-color: #bbf7d0;">
      <div class="kpi-label" style="color: #16a34a;">Clean Net Profit</div>
      <div class="kpi-val" style="color: #15803d;">${formatMoney(netProfit, business, true)}</div>
      <div style="font-size: 9px; color: #16a34a; font-weight: bold; margin-top: 2px;">${netProfitMarginPercent.toFixed(1)}% Net Margin</div>
    </div>
  </div>

  <div class="section-title">Income Statement (P&L Breakdown)</div>
  <table class="pl-table">
    <tr>
      <td>Gross Invoiced Sales (Subtotal)</td>
      <td style="text-align: right; font-family: monospace;">${formatMoney(totalSalesSubtotal, business, true)}</td>
    </tr>
    ${
      totalDiscountsGranted > 0
        ? `<tr>
        <td style="color: #16a34a;">Less: Customer Discounts Granted</td>
        <td style="text-align: right; font-family: monospace; color: #16a34a;">-${formatMoney(totalDiscountsGranted, business, true)}</td>
      </tr>`
        : ''
    }
    ${
      totalTaxesCollected > 0
        ? `<tr>
        <td>Plus: VAT / Sales Tax Collected</td>
        <td style="text-align: right; font-family: monospace;">+${formatMoney(totalTaxesCollected, business, true)}</td>
      </tr>`
        : ''
    }
    <tr style="font-weight: bold; background: #f8fafc;">
      <td>NET SALES REVENUE</td>
      <td style="text-align: right; font-family: monospace; font-size: 13px;">${formatMoney(totalSalesRevenue, business, true)}</td>
    </tr>
    <tr>
      <td style="color: #475569;">Less: Cost of Goods Sold (COGS)</td>
      <td style="text-align: right; font-family: monospace; color: #475569;">-${formatMoney(totalCostOfGoodsSold, business, true)}</td>
    </tr>
    <tr style="font-weight: bold; background: #f1f5f9;">
      <td>GROSS PROFIT (${grossProfitMarginPercent.toFixed(1)}% Margin)</td>
      <td style="text-align: right; font-family: monospace; font-size: 13px; color: #16a34a;">${formatMoney(grossProfit, business, true)}</td>
    </tr>
    <tr>
      <td style="color: #dc2626;">Less: Total Operational Expenses</td>
      <td style="text-align: right; font-family: monospace; color: #dc2626;">-${formatMoney(totalOperatingExpenses, business, true)}</td>
    </tr>
    <tr class="pl-grand" style="border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a;">
      <td>CLEAN NET PROFIT</td>
      <td style="text-align: right; font-family: monospace; font-size: 15px; color: ${netProfit >= 0 ? '#15803d' : '#dc2626'};">${formatMoney(netProfit, business, true)}</td>
    </tr>
  </table>

  <div class="section-title">Payment Settlement Reconciliation</div>
  <table>
    <thead>
      <tr>
        <th>Payment Channel</th>
        <th>Recorded Revenue</th>
        <th>% Share</th>
        <th>Status / Verification</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>💵 Cash in Drawer (Till)</td>
        <td style="font-family: monospace; font-weight: bold;">${formatMoney(paymentBreakdown.cash, business, true)}</td>
        <td>${paymentBreakdown.cashPercent.toFixed(1)}%</td>
        <td style="color: #16a34a;">Counted in Register</td>
      </tr>
      <tr>
        <td>📱 Bank Transfers</td>
        <td style="font-family: monospace; font-weight: bold;">${formatMoney(paymentBreakdown.transfer, business, true)}</td>
        <td>${paymentBreakdown.transferPercent.toFixed(1)}%</td>
        <td style="color: #2563eb;">Settled to Bank Account</td>
      </tr>
      <tr>
        <td>💳 POS Terminal / Cards</td>
        <td style="font-family: monospace; font-weight: bold;">${formatMoney(paymentBreakdown.pos, business, true)}</td>
        <td>${paymentBreakdown.posPercent.toFixed(1)}%</td>
        <td style="color: #7c3aed;">Merchant Terminal Slip</td>
      </tr>
      <tr>
        <td>📝 Credit Sales (Customer Debts)</td>
        <td style="font-family: monospace; font-weight: bold; color: #dc2626;">${formatMoney(paymentBreakdown.credit, business, true)}</td>
        <td>${paymentBreakdown.creditPercent.toFixed(1)}%</td>
        <td style="color: #dc2626;">Recorded in Debt Ledger</td>
      </tr>
      <tr style="font-weight: bold; background: #f8fafc; border-top: 1px solid #0f172a;">
        <td>TOTAL REALIZED LIQUID CASH/INFLOW</td>
        <td style="font-family: monospace;">${formatMoney(paymentBreakdown.totalCollected, business, true)}</td>
        <td>${(paymentBreakdown.cashPercent + paymentBreakdown.transferPercent + paymentBreakdown.posPercent).toFixed(1)}%</td>
        <td>Ready for Banking</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">Top 10 Revenue Generating Products</div>
  <table>
    <thead>
      <tr>
        <th>Product Name</th>
        <th>Category</th>
        <th style="text-align: center;">Units Sold</th>
        <th style="text-align: right;">Revenue</th>
        <th style="text-align: right;">Gross Profit</th>
      </tr>
    </thead>
    <tbody>
      ${topItemsRows || '<tr><td colspan="5" style="text-align: center; padding: 12px; color: #64748b;">No product sales in selected period.</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <p>Certified Official Business Report • ${business.name} • Generated via Small Business OS</p>
  </div>
</body>
</html>`;

    downloadHtmlFile(html, `Executive_Statement_${business.name.replace(/\s+/g, '_')}_${filterStartDate}_to_${filterEndDate}.html`);
    showToast('Executive Financial Statement downloaded!');
  };

  const peakHourMaxTotal = useMemo(() => {
    return Math.max(...hourlySalesDistribution.map((h) => h.total), 1);
  }, [hourlySalesDistribution]);

  const topProductMaxRevenue = useMemo(() => {
    return topProductsAnalytics[0]?.revenue || 1;
  }, [topProductsAnalytics]);

  return (
    <div className="space-y-4 pb-24 text-slate-100">
      {/* Copied Toast Alert */}
      {copiedToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce border border-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* HEADER & REPORT RANGE SELECTOR */}
      <div className="bg-slate-900/90 p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Real-Time Business Reports</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-800">
                    Live Analytics
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Accurate P&L ledger, COGS calculation, live inventory valuation, payment reconciliation & performance
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-thermal-zreport"
              onClick={() => setIsZReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-2xl border border-slate-700 transition active:scale-95 cursor-pointer shadow-xs"
              title="Generate Daily Cash Register Closing Slip (Z-Report)"
            >
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Thermal Z-Report</span>
            </button>

            <button
              id="btn-share-whatsapp-summary"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black rounded-2xl shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer"
              title="Share End of Day Summary directly via WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp Daily Close</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 transition cursor-pointer"
              title="Copy Summary Text to Clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownloadExecutiveStatementHtml}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl border border-slate-700 transition cursor-pointer"
              title="Print or Download Executive Statement"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Statement</span>
            </button>
          </div>
        </div>

        {/* Date Presets Selector Bar */}
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Report Time Horizon:</span>
              <strong className="text-white font-mono">{rangeLabel}</strong>
            </span>
            <span className="text-[11px] text-slate-500">
              {filteredSales.length} Transactions Analyzed
            </span>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1 overflow-x-auto scrollbar-none">
            {[
              { id: 'today' as const, label: 'Today' },
              { id: 'yesterday' as const, label: 'Yesterday' },
              { id: 'week' as const, label: 'Last 7 Days' },
              { id: 'month' as const, label: 'This Month' },
              { id: 'last_month' as const, label: 'Last Month' },
              { id: 'quarter' as const, label: 'This Quarter' },
              { id: 'year' as const, label: 'This Year' },
              { id: 'all' as const, label: 'All Time' },
              { id: 'custom' as const, label: 'Custom Range ⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id)}
                className={`py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-emerald-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker Sub-Bar */}
          {timeRange === 'custom' && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
                <span className="font-semibold">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="font-semibold">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="text-[11px] text-emerald-400 font-mono font-bold">
                Analyzing period: {customStartDate} → {customEndDate}
              </div>
            </div>
          )}
        </div>

        {/* Secondary Filter Row: Staff, Payment Method, Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {/* Staff Filter */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 w-full focus:outline-none cursor-pointer"
            >
              <option value="all">Staff: All Cashiers & Managers</option>
              {staffList.map((st) => (
                <option key={st.id} value={st.name}>
                  Staff: {st.name} ({st.role})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedPaymentFilter}
              onChange={(e) => setSelectedPaymentFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 w-full focus:outline-none cursor-pointer"
            >
              <option value="all">Payment: All Channels</option>
              <option value="cash">Payment: Cash In Drawer</option>
              <option value="transfer">Payment: Bank Transfer</option>
              <option value="pos">Payment: POS Terminal</option>
              <option value="credit">Payment: On Credit (Debt)</option>
              <option value="split">Payment: Split Payments</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 w-full focus:outline-none cursor-pointer"
            >
              <option value="all">Category: All Product Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  Category: {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* REPORT SUB-TABS NAVIGATION */}
      <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'overview' as const, label: '📊 P&L & Overview', desc: 'Income statement & KPIs' },
          { id: 'sales' as const, label: '🛒 Sales & Best Sellers', desc: 'Top items & peak hours' },
          { id: 'payments' as const, label: '💳 Payment Reconciliation', desc: 'Cash vs Transfer vs POS' },
          { id: 'inventory' as const, label: '📦 Stock Valuation', desc: 'Tied capital & stock health' },
          { id: 'staff_debts' as const, label: '👥 Staff & Debts', desc: 'Cashiers & receivables' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-left transition cursor-pointer ${
              activeReportTab === tab.id
                ? 'bg-slate-800 text-white border border-emerald-500/50 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <div className="text-xs font-black truncate">{tab.label}</div>
            <div className="text-[10px] text-slate-400 truncate hidden sm:block">{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: EXECUTIVE OVERVIEW & P&L STATEMENT */}
      {/* ========================================================================= */}
      {activeReportTab === 'overview' && (
        <div className="space-y-4">
          {/* 4 Core Financial KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Revenue */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Net Sales Revenue</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg sm:text-2xl font-black font-mono text-emerald-400 mt-2">
                {formatMoney(totalSalesRevenue, business)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>{totalOrdersCount} orders</span>
                <span>AOV: {formatMoney(averageOrderValue, business)}</span>
              </div>
            </div>

            {/* Cost of Goods Sold (COGS) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Cost of Goods (COGS)</span>
                <Package className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-lg sm:text-2xl font-black font-mono text-slate-200 mt-2">
                {formatMoney(totalCostOfGoodsSold, business)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Wholesale cost of {totalUnitsSold} sold units
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Operating Expenses</span>
                <TrendingDown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg sm:text-2xl font-black font-mono text-amber-400 mt-2">
                {formatMoney(totalOperatingExpenses, business)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {filteredExpenses.length} operational expenses
              </div>
            </div>

            {/* Clean Net Profit */}
            <div
              className={`p-4 sm:p-5 rounded-3xl border shadow-md ${
                netProfit >= 0
                  ? 'bg-emerald-950/40 border-emerald-700/80 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-700/80 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Clean Net Profit</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700">
                  {netProfitMarginPercent.toFixed(1)}% Net Margin
                </span>
              </div>
              <div
                className={`text-lg sm:text-2xl font-black font-mono mt-2 ${
                  netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'
                }`}
              >
                {formatMoney(netProfit, business)}
              </div>
              <div className="text-[11px] opacity-80 mt-1">
                {netProfit >= 0 ? '✓ Profitable Operations' : '⚠️ Net Operational Loss'}
              </div>
            </div>
          </div>

          {/* Income Statement Waterfall Breakdown */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Profit & Loss Statement (Income Waterfall)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Exact mathematical reconciliation of income, direct costs, overheads and bottom-line margin
                </p>
              </div>
              <button
                onClick={handleDownloadExecutiveStatementHtml}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Statement</span>
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Row 1: Gross Sales Subtotal */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="font-sans text-slate-300 font-semibold">
                  Gross Sales (Product Subtotals)
                </span>
                <span className="font-bold text-slate-100">
                  {formatMoney(totalSalesSubtotal, business)}
                </span>
              </div>

              {/* Row 2: Customer Discounts */}
              {totalDiscountsGranted > 0 && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-400">
                  <span className="font-sans font-semibold">
                    (-) Customer Discounts Granted
                  </span>
                  <span className="font-bold">
                    -{formatMoney(totalDiscountsGranted, business)}
                  </span>
                </div>
              )}

              {/* Row 3: Taxes */}
              {totalTaxesCollected > 0 && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-blue-400">
                  <span className="font-sans font-semibold">
                    (+) VAT / Sales Tax Collected
                  </span>
                  <span className="font-bold">
                    +{formatMoney(totalTaxesCollected, business)}
                  </span>
                </div>
              )}

              {/* Row 4: Net Sales Revenue */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/80 text-emerald-300">
                <span className="font-sans font-black text-sm">
                  (=) NET SALES REVENUE
                </span>
                <span className="font-black text-base">
                  {formatMoney(totalSalesRevenue, business)}
                </span>
              </div>

              {/* Row 5: Cost of Goods Sold */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300">
                <span className="font-sans font-semibold">
                  (-) Cost of Goods Sold (Inventory Purchase Cost)
                </span>
                <span className="font-bold text-slate-400">
                  -{formatMoney(totalCostOfGoodsSold, business)}
                </span>
              </div>

              {/* Row 6: Gross Profit */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-white">
                <div>
                  <span className="font-sans font-black text-sm block">
                    (=) GROSS PROFIT
                  </span>
                  <span className="font-sans text-[10px] text-slate-400">
                    Gross Margin: {grossProfitMarginPercent.toFixed(1)}% of Revenue
                  </span>
                </div>
                <span className="font-black text-base text-emerald-400">
                  {formatMoney(grossProfit, business)}
                </span>
              </div>

              {/* Row 7: Operating Expenses */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-amber-400">
                <span className="font-sans font-semibold">
                  (-) Operating Expenses (Fuel, Rent, Staff Salaries, Logistics, etc.)
                </span>
                <span className="font-bold">
                  -{formatMoney(totalOperatingExpenses, business)}
                </span>
              </div>

              {/* Row 8: Net Profit Grand Final */}
              <div
                className={`flex items-center justify-between p-4 rounded-2xl border-2 ${
                  netProfit >= 0
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500 text-rose-200'
                }`}
              >
                <div>
                  <span className="font-sans font-black text-base block">
                    🌟 BOTTOM-LINE NET PROFIT
                  </span>
                  <span className="font-sans text-xs opacity-80">
                    Net Margin: {netProfitMarginPercent.toFixed(1)}% | Period: {rangeLabel}
                  </span>
                </div>
                <span className="font-black text-xl sm:text-2xl">
                  {formatMoney(netProfit, business)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick 2-Column Overview: Payment Methods & Categorized Expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Methods Meter */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-md">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Payment Channels Split</span>
                </h4>
                <button
                  onClick={() => setActiveReportTab('payments')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <span>Reconcile</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Visual Distribution Progress Bar */}
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                {paymentBreakdown.cash > 0 && (
                  <div
                    style={{ width: `${paymentBreakdown.cashPercent}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Cash: ${paymentBreakdown.cashPercent.toFixed(1)}%`}
                  />
                )}
                {paymentBreakdown.transfer > 0 && (
                  <div
                    style={{ width: `${paymentBreakdown.transferPercent}%` }}
                    className="bg-blue-500 h-full"
                    title={`Transfer: ${paymentBreakdown.transferPercent.toFixed(1)}%`}
                  />
                )}
                {paymentBreakdown.pos > 0 && (
                  <div
                    style={{ width: `${paymentBreakdown.posPercent}%` }}
                    className="bg-purple-500 h-full"
                    title={`POS: ${paymentBreakdown.posPercent.toFixed(1)}%`}
                  />
                )}
                {paymentBreakdown.credit > 0 && (
                  <div
                    style={{ width: `${paymentBreakdown.creditPercent}%` }}
                    className="bg-rose-500 h-full"
                    title={`Credit: ${paymentBreakdown.creditPercent.toFixed(1)}%`}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Cash in Till:</span>
                  </div>
                  <div className="font-mono font-bold text-white mt-1">
                    {formatMoney(paymentBreakdown.cash, business)}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Bank Transfers:</span>
                  </div>
                  <div className="font-mono font-bold text-white mt-1">
                    {formatMoney(paymentBreakdown.transfer, business)}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>POS Terminals:</span>
                  </div>
                  <div className="font-mono font-bold text-white mt-1">
                    {formatMoney(paymentBreakdown.pos, business)}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Credit / Debts:</span>
                  </div>
                  <div className="font-mono font-bold text-rose-400 mt-1">
                    {formatMoney(paymentBreakdown.credit, business)}
                  </div>
                </div>
              </div>
            </div>

            {/* Categorized Expenses List */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-md">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                  <span>Expense Breakdown ({categorizedExpenses.length} Categories)</span>
                </h4>
                <span className="text-xs font-mono font-bold text-amber-400">
                  Total: {formatMoney(totalOperatingExpenses, business)}
                </span>
              </div>

              {categorizedExpenses.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  No operating expenses logged in this period.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {categorizedExpenses.map((c, idx) => {
                    const pct =
                      totalOperatingExpenses > 0 ? (c.amount / totalOperatingExpenses) * 100 : 0;
                    return (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200 capitalize truncate">
                              {c.category.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-amber-300">
                            {formatMoney(c.amount, business)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: SALES & BEST-SELLING PRODUCTS */}
      {/* ========================================================================= */}
      {activeReportTab === 'sales' && (
        <div className="space-y-4">
          {/* Best Selling Products Control Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>Best-Selling Products & Profit Contributions</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Identify top revenue drivers, high-margin inventory items & fast-moving stock
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Sort By:</span>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setTopProductsSortBy('revenue')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      topProductsSortBy === 'revenue'
                        ? 'bg-emerald-600 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Revenue ₦
                  </button>
                  <button
                    onClick={() => setTopProductsSortBy('qty')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      topProductsSortBy === 'qty'
                        ? 'bg-emerald-600 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Units Sold
                  </button>
                  <button
                    onClick={() => setTopProductsSortBy('profit')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      topProductsSortBy === 'profit'
                        ? 'bg-emerald-600 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Gross Profit ₦
                  </button>
                </div>

                <button
                  onClick={handleExportTopProductsCSV}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Products Ranked Table */}
            {topProductsAnalytics.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No product transactions recorded in this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                      <th className="py-2.5 px-3"># Rank & Item</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center">Units Sold</th>
                      <th className="py-2.5 px-3 text-right">Total Revenue</th>
                      <th className="py-2.5 px-3 text-right">Wholesale Cost</th>
                      <th className="py-2.5 px-3 text-right">Gross Profit</th>
                      <th className="py-2.5 px-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {topProductsAnalytics.map((p, idx) => {
                      const shareOfTop = (p.revenue / topProductMaxRevenue) * 100;
                      return (
                        <tr key={idx} className="hover:bg-slate-850/40 transition">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-5 h-5 rounded-full font-mono text-[10px] font-black flex items-center justify-center ${
                                  idx === 0
                                    ? 'bg-amber-400 text-slate-950'
                                    : idx === 1
                                    ? 'bg-slate-300 text-slate-950'
                                    : idx === 2
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-slate-100 block">{p.name}</span>
                                <div className="w-24 bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{ width: `${shareOfTop}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                            {p.qtySold} <span className="text-[10px] text-slate-400">{p.unit}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                            {formatMoney(p.revenue, business)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-400">
                            {formatMoney(p.cost, business)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-300">
                            {formatMoney(p.profit, business)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold">
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                                p.margin >= 30
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : p.margin >= 15
                                  ? 'bg-blue-950 text-blue-300'
                                  : 'bg-amber-950 text-amber-300'
                              }`}
                            >
                              {p.margin.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Peak Trading Hours Distribution Visual */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Peak Trading Hours Analysis (Revenue by Hour of Day)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Discover when your store experiences the highest sales volume and customer influx
                </p>
              </div>
              <button
                onClick={handleExportSalesCSV}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Sales Ledger CSV</span>
              </button>
            </div>

            {/* Visual Hourly Bar Chart */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 items-end h-36 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                {hourlySalesDistribution.map((h, idx) => {
                  const heightPercent =
                    peakHourMaxTotal > 0 ? Math.max(8, (h.total / peakHourMaxTotal) * 100) : 8;
                  const isTopHour = h.total === peakHourMaxTotal && h.total > 0;

                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center h-full justify-end group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition absolute -top-10 bg-slate-900 border border-slate-700 text-white text-[10px] px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap z-20 font-mono shadow-xl">
                        {h.label}: {formatMoney(h.total, business)} ({h.count} sales)
                      </div>

                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all ${
                          isTopHour
                            ? 'bg-purple-500 shadow-md shadow-purple-500/50'
                            : h.total > 0
                            ? 'bg-emerald-500/80 hover:bg-emerald-400'
                            : 'bg-slate-800/40'
                        }`}
                      />
                      <span className="text-[9px] text-slate-500 mt-1 truncate block font-mono">
                        {h.hour}h
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Trading Hours: 6:00 AM — 10:00 PM</span>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-500" />
                  <span>Peak Peak Trading Hour</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: CASH & PAYMENT RECONCILIATION */}
      {/* ========================================================================= */}
      {activeReportTab === 'payments' && (
        <div className="space-y-4">
          {/* Main Reconciliation Dashboard Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="font-black text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Daily Till & Payment Method Reconciliation</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Balance physical cash in register drawer against direct bank transfers, POS settlement and credit
              </p>
            </div>

            {/* 4 Payment Channel Detail Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Cash In Drawer */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" /> Cash in Till
                  </span>
                  <span className="font-mono">{paymentBreakdown.cashPercent.toFixed(1)}%</span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-white">
                  {formatMoney(paymentBreakdown.cash, business)}
                </div>
                <p className="text-[10px] text-slate-400">
                  Physical currency expected in cash drawer at end-of-shift
                </p>
              </div>

              {/* Bank Transfers */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Bank Transfers
                  </span>
                  <span className="font-mono">{paymentBreakdown.transferPercent.toFixed(1)}%</span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-white">
                  {formatMoney(paymentBreakdown.transfer, business)}
                </div>
                <p className="text-[10px] text-slate-400">
                  Direct electronic deposits to business bank accounts
                </p>
              </div>

              {/* POS Terminals */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-purple-400">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> POS / Cards
                  </span>
                  <span className="font-mono">{paymentBreakdown.posPercent.toFixed(1)}%</span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-white">
                  {formatMoney(paymentBreakdown.pos, business)}
                </div>
                <p className="text-[10px] text-slate-400">
                  Merchant terminal card swipes & debit collections
                </p>
              </div>

              {/* Customer Debts */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-rose-400">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Credit / Debts
                  </span>
                  <span className="font-mono">{paymentBreakdown.creditPercent.toFixed(1)}%</span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-rose-400">
                  {formatMoney(paymentBreakdown.credit, business)}
                </div>
                <p className="text-[10px] text-slate-400">
                  Uncollected purchases recorded to customer debt ledger
                </p>
              </div>
            </div>

            {/* Total Liquid Cash Available Calculation */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-white block text-sm">
                  Total Liquid Collected (Cash + Bank + POS)
                </span>
                <span className="text-slate-400 text-[11px]">
                  Excludes unpaid credit sales. Ready for cash audit & banking.
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-xl text-emerald-400">
                  {formatMoney(paymentBreakdown.totalCollected, business)}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Transactions in selected range */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Sales Ledger Audit ({filteredSales.length} Transactions)</span>
              </h4>
              <button
                onClick={handleExportSalesCSV}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Ledger</span>
              </button>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto pr-1">
              {filteredSales.slice(0, 30).map((sale) => (
                <div
                  key={sale.id}
                  className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-850/40 px-2 rounded-xl transition"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">
                        #{sale.receiptNumber}
                      </span>
                      <span className="font-bold text-slate-200 truncate">
                        {sale.customerName || 'Walk-in Customer'}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          sale.paymentMethod === 'cash'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : sale.paymentMethod === 'transfer'
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : sale.paymentMethod === 'pos'
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}
                      >
                        {sale.paymentMethod}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{formatDate(sale.createdAt || sale.date)}</span>
                      <span>•</span>
                      <span>Cashier: {sale.staffName}</span>
                      <span>•</span>
                      <span>{sale.items.length} items</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-bold text-white block">
                        {formatMoney(sale.totalAmount ?? sale.total, business)}
                      </span>
                    </div>
                    {onOpenReceipt && (
                      <button
                        onClick={() => onOpenReceipt(sale)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="View Receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: INVENTORY VALUATION & STOCK HEALTH */}
      {/* ========================================================================= */}
      {activeReportTab === 'inventory' && (
        <div className="space-y-4">
          {/* Inventory Capital Snapshot */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Wholesale Cost Value */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-xs font-semibold text-slate-400 block">
                Tied Capital (Wholesale Cost)
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-slate-100 mt-2 block">
                {formatMoney(inventoryValuation.wholesaleCostValue, business)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Total purchase capital currently in stock
              </span>
            </div>

            {/* Retail Selling Value */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-xs font-semibold text-slate-400 block">
                Potential Retail Sales Value
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-emerald-400 mt-2 block">
                {formatMoney(inventoryValuation.retailSellingValue, business)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Gross revenue when all stock is sold
              </span>
            </div>

            {/* Potential Unrealized Profit */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-xs font-semibold text-slate-400 block">
                Unrealized Stock Profit
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-emerald-300 mt-2 block">
                {formatMoney(inventoryValuation.potentialUnrealizedProfit, business)}
              </span>
              <span className="text-[10px] text-emerald-500 font-bold mt-1 block">
                {inventoryValuation.potentialMarginPercent.toFixed(1)}% expected margin
              </span>
            </div>

            {/* Stock Health */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-xs font-semibold text-slate-400 block">
                Stock Health Status
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                  {inventoryValuation.healthyStockCount} In Stock
                </span>
                <span className="text-xs px-2.5 py-1 rounded-xl bg-amber-950 text-amber-300 font-bold border border-amber-800">
                  {inventoryValuation.lowStockCount} Low
                </span>
                <span className="text-xs px-2.5 py-1 rounded-xl bg-rose-950 text-rose-300 font-bold border border-rose-800">
                  {inventoryValuation.outOfStockCount} Out
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 block">
                {inventoryValuation.totalProductsCount} total product items in catalog
              </span>
            </div>
          </div>

          {/* Category Distribution Breakdown */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-md">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Sales Revenue Contribution by Product Category</span>
              </h3>
              <p className="text-xs text-slate-400">
                Departmental performance and product line breakdown for {rangeLabel}
              </p>
            </div>

            {categoryRevenueBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No category sales recorded in this period.
              </p>
            ) : (
              <div className="space-y-3">
                {categoryRevenueBreakdown.map((cat, idx) => {
                  const sharePct =
                    totalSalesRevenue > 0 ? (cat.revenue / totalSalesRevenue) * 100 : 0;

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{cat.category}</span>
                          <span className="text-[10px] text-slate-400">
                            ({cat.itemsCount} units sold)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-400">
                            {formatMoney(cat.revenue, business)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2">
                            ({sharePct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: STAFF PERFORMANCE & DEBTS RECOVERY */}
      {/* ========================================================================= */}
      {activeReportTab === 'staff_debts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cashier Team Sales Leaderboard */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-md">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Cashier Staff Sales Leaderboard ({rangeLabel})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Track individual staff sales volume, transaction frequency and average ticket size
                </p>
              </div>

              {staffSalesPerformance.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  No staff sales recorded in this period.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {staffSalesPerformance.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl font-bold flex items-center justify-center text-xs ${
                            idx === 0
                              ? 'bg-emerald-600 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {st.name.charAt(0)}
                        </span>
                        <div>
                          <span className="font-bold text-slate-100 block">{st.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {st.ordersCount} sales • Avg Ticket: {formatMoney(st.avgOrder, business)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400 block text-sm">
                          {formatMoney(st.totalRevenue, business)}
                        </span>
                        {st.totalDiscounts > 0 && (
                          <span className="text-[10px] text-slate-500">
                            Disc: {formatMoney(st.totalDiscounts, business)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Debt Recoveries & Receivables Summary */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-md">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Customer Debt & Receivables Status</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Track overdue balances, customer credit exposure and debt collections
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Active Receivables</span>
                  <span className="font-mono font-black text-rose-400 text-base mt-1 block">
                    {formatMoney(debtMetrics.totalOutstandingBalance, business)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Across {debtMetrics.activeDebtorsCount} customers
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[11px] text-emerald-400 block">Debt Recovered in Period</span>
                  <span className="font-mono font-black text-emerald-300 text-base mt-1 block">
                    {formatMoney(debtMetrics.totalRecoveredInRange, business)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {filteredDebtPayments.length} repayment installments
                  </span>
                </div>
              </div>

              {/* Recent Debt Repayments List */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Recent Debt Collections in this Period:
                </span>
                {filteredDebtPayments.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No customer debt payments logged in this date range.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {filteredDebtPayments.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-950 rounded-xl border border-slate-800/80 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-200 block">{p.customerName}</span>
                          <span className="text-[10px] text-slate-400">
                            {formatShortDate(p.date)} via {p.paymentMethod.toUpperCase()} • Received by {p.receivedByStaff}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          +{formatMoney(p.amount, business)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* THERMAL Z-REPORT MODAL (PRINT & WHATSAPP CASH CLOSING SLIP) */}
      {/* ========================================================================= */}
      {isZReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Daily Z-Report Closing Slip</h3>
              </div>
              <button
                onClick={() => setIsZReportModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal POS Slip Content */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-950">
              <div
                id="thermal-z-report"
                className="bg-white text-slate-950 rounded-xl p-5 shadow-xs border border-slate-300 text-xs font-mono select-text"
              >
                {/* Header */}
                <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
                  <div className="text-2xl mb-1">{business.logoEmoji || '🏬'}</div>
                  <h2 className="text-sm font-black uppercase tracking-wider font-sans">
                    {business.name}
                  </h2>
                  <p className="text-[10px] text-slate-600">{business.address}, {business.city}</p>
                  <p className="text-[10px] text-slate-600">Tel: {business.phone}</p>
                  <div className="mt-2 font-black text-xs uppercase bg-slate-100 py-1 rounded">
                    *** DAILY Z-REPORT (CLOSE) ***
                  </div>
                </div>

                {/* Period Meta */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2 mb-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date:</span>
                    <span>{todayStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Period:</span>
                    <span className="font-bold">{rangeLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Generated By:</span>
                    <span>{currentStaff.name} ({currentStaff.role})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Orders:</span>
                    <span className="font-bold">{totalOrdersCount}</span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-1 text-xs border-b border-dashed border-slate-400 pb-2 mb-2">
                  <div className="flex justify-between font-bold">
                    <span>GROSS SALES:</span>
                    <span>{formatMoney(totalSalesRevenue, business, true)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>COGS Direct Cost:</span>
                    <span>-{formatMoney(totalCostOfGoodsSold, business, true)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>GROSS PROFIT:</span>
                    <span>{formatMoney(grossProfit, business, true)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Expenses Paid:</span>
                    <span>-{formatMoney(totalOperatingExpenses, business, true)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-900">
                    <span>NET PROFIT:</span>
                    <span>{formatMoney(netProfit, business, true)}</span>
                  </div>
                </div>

                {/* Till Cash Reconciliation */}
                <div className="space-y-1 text-xs border-b border-dashed border-slate-400 pb-2 mb-3">
                  <div className="font-bold text-[10px] uppercase text-slate-500 mb-1">
                    PAYMENT RECONCILIATION:
                  </div>
                  <div className="flex justify-between">
                    <span>💵 Cash in Drawer:</span>
                    <span className="font-bold">{formatMoney(paymentBreakdown.cash, business, true)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>📱 Bank Transfers:</span>
                    <span className="font-bold">{formatMoney(paymentBreakdown.transfer, business, true)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💳 POS Terminals:</span>
                    <span className="font-bold">{formatMoney(paymentBreakdown.pos, business, true)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>📝 Credit Sales (Debt):</span>
                    <span>{formatMoney(paymentBreakdown.credit, business, true)}</span>
                  </div>
                  <div className="flex justify-between font-black pt-1 border-t border-slate-300">
                    <span>TOTAL LIQUID INFLOW:</span>
                    <span>{formatMoney(paymentBreakdown.totalCollected, business, true)}</span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-2 text-[10px] space-y-4 text-slate-500">
                  <div className="flex justify-between">
                    <span>Cashier Signature: _________________</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manager Signature: _________________</span>
                  </div>
                  <p className="text-center italic font-sans text-[9px] text-slate-400">
                    *** END OF DAY RECONCILIATION ***
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Send WhatsApp</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
