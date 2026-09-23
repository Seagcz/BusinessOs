import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Building2,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  FileText,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Link as LinkIcon,
  X,
  ArrowUpRight,
  TrendingUp,
  Download,
  Eye,
} from 'lucide-react';
import {
  BusinessProfile,
  StaffUser,
  Sale,
  Invoice,
  DebtRecord,
  SolanaTransaction,
  NavigationTab,
} from '../types';
import { solanaService, DEFAULT_NGN_USDC_RATE } from '../services/solanaService';
import { storageService } from '../services/storage';
import { formatMoney } from '../utils/formatters';

export interface UnifiedPaymentItem {
  id: string;
  sourceType: 'invoice' | 'sale' | 'debt_payment' | 'solana_direct';
  date: string;
  customerName: string;
  customerPhone?: string;
  channel: 'solana' | 'transfer' | 'cash' | 'pos' | 'credit' | 'split';
  reference: string;
  amountNgn: number;
  amountUsdc?: number;
  status: 'reconciled' | 'unreconciled' | 'pending';
  invoiceId?: string;
  invoiceNumber?: string;
  saleId?: string;
  receiptNumber?: string;
  debtId?: string;
  solanaSignature?: string;
  solanaExplorerUrl?: string;
  notes?: string;
}

interface PaymentsViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  sales: Sale[];
  invoices: Invoice[];
  debts: DebtRecord[];
  solanaTransactions?: SolanaTransaction[];
  onSaveInvoice: (inv: Invoice) => void;
  onSaveSale?: (sale: Sale) => void;
  onSaveTransaction: (tx: SolanaTransaction) => void;
  onNavigateTab: (tab: NavigationTab) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  business,
  currentStaff,
  sales,
  invoices,
  debts,
  solanaTransactions: propSolanaTxs,
  onSaveInvoice,
  onSaveTransaction,
  onNavigateTab,
}) => {
  // Filters & State
  const [channelFilter, setChannelFilter] = useState<'all' | 'solana' | 'transfer' | 'cash' | 'pos' | 'credit'>('all');
  const [reconcileFilter, setReconcileFilter] = useState<'all' | 'reconciled' | 'unreconciled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Interactive UI
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [isAutoReconciling, setIsAutoReconciling] = useState(false);
  const [autoReconcileResult, setAutoReconcileResult] = useState<{
    reconciledCount: number;
    matchedInvoices: { invoiceNumber: string; amountNgn: number; signature: string }[];
  } | null>(null);

  // Manual Link Modal
  const [selectedUnreconciledItem, setSelectedUnreconciledItem] = useState<UnifiedPaymentItem | null>(null);
  const [targetInvoiceIdToLink, setTargetInvoiceIdToLink] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  // Detail Modal
  const [viewingItem, setViewingItem] = useState<UnifiedPaymentItem | null>(null);

  // Live on-chain reverify state
  const [reverifyingSig, setReverifyingSig] = useState<string | null>(null);
  const [reverifyMessage, setReverifyMessage] = useState<string | null>(null);

  // Fetch all Solana transactions from props or persistent storage
  const solanaTxs = useMemo(() => {
    const list = propSolanaTxs && propSolanaTxs.length > 0
      ? propSolanaTxs
      : storageService.getSolanaTransactions(business.id);
    return list;
  }, [propSolanaTxs, business.id]);

  // Aggregate ALL payments into a unified ledger
  const unifiedPayments: UnifiedPaymentItem[] = useMemo(() => {
    const list: UnifiedPaymentItem[] = [];

    // 1. Paid / Part-paid Invoices
    for (const inv of invoices) {
      if ((inv.amountPaid || 0) > 0) {
        const isSolana = inv.paymentMethod === 'solana' || !!inv.solanaSignature;
        const channel: UnifiedPaymentItem['channel'] = isSolana
          ? 'solana'
          : inv.paymentMethod === 'cash'
          ? 'cash'
          : inv.paymentMethod === 'pos'
          ? 'pos'
          : 'transfer';

        list.push({
          id: `pay_inv_${inv.id}`,
          sourceType: 'invoice',
          date: inv.solanaConfirmedAt || inv.updatedAt || inv.issueDate || inv.createdAt,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          channel,
          reference: inv.solanaSignature || inv.paymentReference || inv.invoiceNumber,
          amountNgn: inv.amountPaid || inv.totalAmount,
          amountUsdc: inv.solanaUsdcAmount,
          status: 'reconciled',
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          solanaSignature: inv.solanaSignature,
          solanaExplorerUrl: inv.solanaExplorerUrl || (inv.solanaSignature ? solanaService.getExplorerUrl(inv.solanaSignature) : undefined),
          notes: isSolana ? `Settled on Solana Mainnet (${inv.solanaUsdcAmount || ''} USDC)` : 'Settlement of invoice',
        });
      }
    }

    // 2. POS Sales
    for (const sale of sales) {
      // Avoid duplicating invoice payments that generated sales records
      if (sale.invoiceId && list.some((p) => p.invoiceId === sale.invoiceId)) {
        continue;
      }

      const isSolana = sale.paymentMethod === 'solana' || !!sale.solanaSignature;
      const channel: UnifiedPaymentItem['channel'] = isSolana
        ? 'solana'
        : sale.paymentMethod === 'cash'
        ? 'cash'
        : sale.paymentMethod === 'pos'
        ? 'pos'
        : sale.paymentMethod === 'credit'
        ? 'credit'
        : sale.paymentMethod === 'split'
        ? 'split'
        : 'transfer';

      list.push({
        id: `pay_sale_${sale.id}`,
        sourceType: 'sale',
        date: sale.createdAt,
        customerName: sale.customerName || 'Walk-in Customer',
        customerPhone: sale.customerPhone,
        channel,
        reference: sale.solanaSignature || sale.receiptNumber,
        amountNgn: sale.total,
        amountUsdc: isSolana ? Math.round((sale.total / (business.solanaUsdcNgnRate || 1550)) * 100) / 100 : undefined,
        status: 'reconciled',
        saleId: sale.id,
        receiptNumber: sale.receiptNumber,
        solanaSignature: sale.solanaSignature,
        solanaExplorerUrl: sale.solanaSignature ? solanaService.getExplorerUrl(sale.solanaSignature) : undefined,
        notes: `POS Register Sale #${sale.receiptNumber}`,
      });
    }

    // 3. Customer Debt Payments
    for (const debt of debts) {
      if (debt.paymentHistory && debt.paymentHistory.length > 0) {
        for (const payment of debt.paymentHistory) {
          list.push({
            id: `pay_debt_${debt.id}_${payment.id || payment.timestamp}`,
            sourceType: 'debt_payment',
            date: payment.timestamp || payment.date || debt.createdAt,
            customerName: debt.customerName,
            customerPhone: debt.customerPhone,
            channel: (payment.paymentMethod as any) || 'cash',
            reference: payment.reference || `REP-${debt.id.slice(-6)}`,
            amountNgn: payment.amount,
            status: 'reconciled',
            debtId: debt.id,
            notes: `Debt repayment by ${debt.customerName}`,
          });
        }
      }
    }

    // 4. Standalone Solana On-Chain Transactions (Direct Transfers, Payments)
    for (const tx of solanaTxs) {
      // Check if this signature is already captured via invoice or sale
      const existsInList = list.some(
        (item) => item.solanaSignature && item.solanaSignature === tx.signature
      );

      if (!existsInList) {
        const isReconciled = !!tx.reconciled || !!tx.invoiceId || !!tx.saleId;
        list.push({
          id: `pay_sol_${tx.id}`,
          sourceType: 'solana_direct',
          date: tx.timestamp || new Date().toISOString(),
          customerName: tx.customerName || (tx.payerAddress ? solanaService.truncateAddress(tx.payerAddress, 4) : 'Solana Payer'),
          channel: 'solana',
          reference: tx.signature,
          amountNgn: tx.amountNgn,
          amountUsdc: tx.amountUsdc,
          status: isReconciled ? 'reconciled' : 'unreconciled',
          invoiceId: tx.invoiceId,
          invoiceNumber: tx.invoiceNumber,
          saleId: tx.saleId,
          receiptNumber: tx.receiptNumber,
          solanaSignature: tx.signature,
          solanaExplorerUrl: tx.explorerUrl || solanaService.getExplorerUrl(tx.signature),
          notes: tx.notes || `On-chain transfer on Solana Mainnet (${tx.amountUsdc} USDC)`,
        });
      }
    }

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, sales, debts, solanaTxs, business.solanaUsdcNgnRate]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalAllNgn = 0;
    let totalSolanaNgn = 0;
    let totalSolanaUsdc = 0;
    let solanaCount = 0;
    let totalBankNgn = 0;
    let bankCount = 0;
    let totalCashNgn = 0;
    let cashCount = 0;
    let totalPosNgn = 0;
    let posCount = 0;
    let reconciledCount = 0;
    let unreconciledCount = 0;

    for (const item of unifiedPayments) {
      totalAllNgn += item.amountNgn;

      if (item.status === 'reconciled') {
        reconciledCount++;
      } else {
        unreconciledCount++;
      }

      switch (item.channel) {
        case 'solana':
          totalSolanaNgn += item.amountNgn;
          if (item.amountUsdc) totalSolanaUsdc += item.amountUsdc;
          solanaCount++;
          break;
        case 'transfer':
          totalBankNgn += item.amountNgn;
          bankCount++;
          break;
        case 'cash':
          totalCashNgn += item.amountNgn;
          cashCount++;
          break;
        case 'pos':
          totalPosNgn += item.amountNgn;
          posCount++;
          break;
      }
    }

    const totalCount = unifiedPayments.length;
    const reconcileRate = totalCount > 0 ? Math.round((reconciledCount / totalCount) * 100) : 100;

    return {
      totalAllNgn,
      totalSolanaNgn,
      totalSolanaUsdc,
      solanaCount,
      totalBankNgn,
      bankCount,
      totalCashNgn,
      cashCount,
      totalPosNgn,
      posCount,
      reconciledCount,
      unreconciledCount,
      totalCount,
      reconcileRate,
    };
  }, [unifiedPayments]);

  // Filtered List
  const filteredPayments = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - now.getDay() * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return unifiedPayments.filter((p) => {
      // Channel Filter
      if (channelFilter !== 'all' && p.channel !== channelFilter) return false;

      // Reconciled Filter
      if (reconcileFilter === 'reconciled' && p.status !== 'reconciled') return false;
      if (reconcileFilter === 'unreconciled' && p.status === 'reconciled') return false;

      // Date Range Filter
      const pTime = new Date(p.date).getTime();
      if (dateRange === 'today' && pTime < startOfToday) return false;
      if (dateRange === 'week' && pTime < startOfWeek) return false;
      if (dateRange === 'month' && pTime < startOfMonth) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCustomer = p.customerName.toLowerCase().includes(q);
        const matchesRef = p.reference.toLowerCase().includes(q);
        const matchesInvoice = p.invoiceNumber?.toLowerCase().includes(q);
        const matchesSig = p.solanaSignature?.toLowerCase().includes(q);
        if (!matchesCustomer && !matchesRef && !matchesInvoice && !matchesSig) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedPayments, channelFilter, reconcileFilter, dateRange, searchQuery]);

  // Unpaid invoices available for manual linking
  const unpaidInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'draft' || inv.status === 'pending' || inv.status === 'partial');
  }, [invoices]);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // Re-verify a specific Solana payment on-chain via RPC
  const handleVerifyOnChain = async (sig: string) => {
    if (!sig) return;
    setReverifyingSig(sig);
    setReverifyMessage(null);
    try {
      const res = await solanaService.verifyTransaction(sig);
      if (res.verified) {
        setReverifyMessage(
          `On-Chain Verified: Status is ${res.status.toUpperCase()} at slot #${res.slot?.toLocaleString() || 'N/A'}`
        );
      } else {
        setReverifyMessage(
          `Verification Check: ${res.error || 'Transaction status is pending on Solana Mainnet.'}`
        );
      }
    } catch (err: any) {
      setReverifyMessage(`Verification Error: ${err?.message || 'Failed to ping Solana RPC'}`);
    } finally {
      setReverifyingSig(null);
    }
  };

  // Automated Reconciliation of Solana Transactions with Open Invoices
  const handleRunAutoReconcile = async () => {
    setIsAutoReconciling(true);
    const matched: { invoiceNumber: string; amountNgn: number; signature: string }[] = [];

    try {
      // 1. Get open invoices
      const openInvoices = invoices.filter(
        (inv) => inv.status === 'draft' || inv.status === 'pending' || inv.status === 'partial'
      );

      // 2. Iterate unreconciled Solana transactions
      const unreconciledTxs = solanaTxs.filter((t) => !t.reconciled && !t.invoiceId);

      for (const tx of unreconciledTxs) {
        let matchingInvoice: Invoice | undefined;

        // A. Match by explicit reference in memo/notes
        if (tx.notes || tx.invoiceNumber) {
          matchingInvoice = openInvoices.find(
            (inv) =>
              (tx.invoiceNumber && inv.invoiceNumber.toLowerCase() === tx.invoiceNumber.toLowerCase()) ||
              (tx.notes && tx.notes.includes(inv.invoiceNumber)) ||
              (inv.solanaSignature && inv.solanaSignature === tx.signature)
          );
        }

        // B. Match by customer name & close amount
        if (!matchingInvoice && tx.customerName) {
          matchingInvoice = openInvoices.find((inv) => {
            const sameCustomer =
              inv.customerName.toLowerCase() === (tx.customerName || '').toLowerCase();
            const dueAmount = inv.balanceDue > 0 ? inv.balanceDue : inv.totalAmount;
            const diff = Math.abs(dueAmount - tx.amountNgn);
            return sameCustomer && diff < 100;
          });
        }

        // C. Match by exact USDC amount against invoice balance
        if (!matchingInvoice && tx.amountUsdc > 0) {
          const rate = business.solanaUsdcNgnRate || DEFAULT_NGN_USDC_RATE;
          matchingInvoice = openInvoices.find((inv) => {
            const due = inv.balanceDue > 0 ? inv.balanceDue : inv.totalAmount;
            const expectedUsdc = Math.round((due / rate) * 100) / 100;
            return Math.abs(expectedUsdc - tx.amountUsdc) <= 0.05;
          });
        }

        if (matchingInvoice) {
          // Reconcile this invoice!
          const updatedPaid = (matchingInvoice.amountPaid || 0) + tx.amountNgn;
          const updatedBal = Math.max(0, matchingInvoice.totalAmount - updatedPaid);

          const updatedInv: Invoice = {
            ...matchingInvoice,
            amountPaid: updatedPaid,
            balanceDue: updatedBal,
            status: updatedBal === 0 ? 'paid' : 'partial',
            solanaSignature: tx.signature,
            solanaStatus: 'confirmed',
            solanaUsdcAmount: tx.amountUsdc,
            solanaSlot: tx.slot,
            solanaBlockTime: tx.blockTime,
            solanaExplorerUrl: tx.explorerUrl || solanaService.getExplorerUrl(tx.signature),
            paymentMethod: 'solana',
          };

          onSaveInvoice(updatedInv);

          // Update transaction
          const updatedTx: SolanaTransaction = {
            ...tx,
            status: 'confirmed',
            reconciled: true,
            reconciledAt: new Date().toISOString(),
            reconciledBy: currentStaff.name,
            invoiceId: matchingInvoice.id,
            invoiceNumber: matchingInvoice.invoiceNumber,
            customerName: matchingInvoice.customerName,
          };

          onSaveTransaction(updatedTx);
          storageService.saveSolanaTransaction(updatedTx, currentStaff.name);

          matched.push({
            invoiceNumber: matchingInvoice.invoiceNumber,
            amountNgn: tx.amountNgn,
            signature: tx.signature,
          });

          // Remove from open list to avoid double-matching
          const idx = openInvoices.indexOf(matchingInvoice);
          if (idx >= 0) openInvoices.splice(idx, 1);
        }
      }

      setAutoReconcileResult({
        reconciledCount: matched.length,
        matchedInvoices: matched,
      });
    } catch (err) {
      console.warn('Auto-reconciliation error:', err);
    } finally {
      setIsAutoReconciling(false);
    }
  };

  // Manual Link Confirm
  const handleConfirmManualLink = () => {
    if (!selectedUnreconciledItem || !targetInvoiceIdToLink) return;

    setIsLinking(true);
    const targetInv = invoices.find((inv) => inv.id === targetInvoiceIdToLink);
    if (!targetInv) return;

    const isSolana = selectedUnreconciledItem.channel === 'solana';
    const updatedPaid = (targetInv.amountPaid || 0) + selectedUnreconciledItem.amountNgn;
    const updatedBal = Math.max(0, targetInv.totalAmount - updatedPaid);

    const updatedInv: Invoice = {
      ...targetInv,
      amountPaid: updatedPaid,
      balanceDue: updatedBal,
      status: updatedBal === 0 ? 'paid' : 'partial',
      paymentMethod: selectedUnreconciledItem.channel as any,
      solanaSignature: isSolana ? selectedUnreconciledItem.solanaSignature : targetInv.solanaSignature,
      solanaStatus: isSolana ? 'confirmed' : targetInv.solanaStatus,
      solanaUsdcAmount: isSolana ? selectedUnreconciledItem.amountUsdc : targetInv.solanaUsdcAmount,
      solanaExplorerUrl: isSolana ? selectedUnreconciledItem.solanaExplorerUrl : targetInv.solanaExplorerUrl,
    };

    onSaveInvoice(updatedInv);

    // If it was a Solana transaction, mark transaction as reconciled
    if (selectedUnreconciledItem.solanaSignature) {
      const matchTx = solanaTxs.find((t) => t.signature === selectedUnreconciledItem.solanaSignature);
      if (matchTx) {
        const updatedTx: SolanaTransaction = {
          ...matchTx,
          status: 'confirmed',
          reconciled: true,
          reconciledAt: new Date().toISOString(),
          reconciledBy: currentStaff.name,
          invoiceId: targetInv.id,
          invoiceNumber: targetInv.invoiceNumber,
          customerName: targetInv.customerName,
        };
        onSaveTransaction(updatedTx);
        storageService.saveSolanaTransaction(updatedTx, currentStaff.name);
      }
    }

    setIsLinking(false);
    setSelectedUnreconciledItem(null);
    setTargetInvoiceIdToLink('');
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Customer',
      'Channel',
      'Amount (NGN)',
      'Amount (USDC)',
      'Reference / Signature',
      'Status',
      'Associated Record',
    ];

    const rows = filteredPayments.map((p) => [
      `"${new Date(p.date).toLocaleString()}"`,
      `"${p.customerName.replace(/"/g, '""')}"`,
      `"${p.channel.toUpperCase()}"`,
      p.amountNgn,
      p.amountUsdc || 0,
      `"${p.reference.replace(/"/g, '""')}"`,
      `"${p.status.toUpperCase()}"`,
      `"${p.invoiceNumber ? `Invoice #${p.invoiceNumber}` : p.receiptNumber ? `Sale #${p.receiptNumber}` : 'N/A'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payments_reconciliation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Payments & Unified Reconciliation</h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Multi-Channel
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Consolidated record of Bank, Cash, POS, and verified Solana USDC on-chain payments with automated invoice reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRunAutoReconcile}
            disabled={isAutoReconciling}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAutoReconciling ? 'animate-spin' : ''}`} />
            <span>{isAutoReconciling ? 'Reconciling On-Chain...' : 'Auto-Reconcile Solana'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => onNavigateTab('blockchain')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 border border-purple-800/40 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Solana Wallet</span>
          </button>
        </div>
      </div>

      {/* Reverify feedback banner if active */}
      {reverifyMessage && (
        <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{reverifyMessage}</span>
          </div>
          <button
            onClick={() => setReverifyMessage(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Collected */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Received</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white tracking-tight">
            {formatMoney(metrics.totalAllNgn, business, true)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">
            {metrics.totalCount} total payments
          </div>
        </div>

        {/* Solana USDC (On-Chain) */}
        <div className="bg-gradient-to-br from-purple-950/30 to-emerald-950/20 border border-purple-800/40 p-4 rounded-xl">
          <div className="flex items-center justify-between text-purple-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Solana USDC</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              ◎ Mainnet
            </span>
          </div>
          <div className="text-lg font-bold text-purple-200 tracking-tight">
            ${metrics.totalSolanaUsdc.toFixed(2)}{' '}
            <span className="text-xs font-normal text-purple-400">USDC</span>
          </div>
          <div className="text-[10px] text-purple-400/80 mt-1 font-medium">
            ≈ {formatMoney(metrics.totalSolanaNgn, business, true)} ({metrics.solanaCount} txs)
          </div>
        </div>

        {/* Bank Transfers */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-sky-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Bank Transfer</span>
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-slate-100 tracking-tight">
            {formatMoney(metrics.totalBankNgn, business, true)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">
            {metrics.bankCount} transfers
          </div>
        </div>

        {/* Cash in Hand */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Cash in Hand</span>
            <Banknote className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-slate-100 tracking-tight">
            {formatMoney(metrics.totalCashNgn, business, true)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">
            {metrics.cashCount} cash payments
          </div>
        </div>

        {/* POS Card Terminal */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">POS Terminal</span>
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-slate-100 tracking-tight">
            {formatMoney(metrics.totalPosNgn, business, true)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">
            {metrics.posCount} card swipes
          </div>
        </div>

        {/* Reconciliation Health */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-indigo-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Reconciled</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-bold text-indigo-200 tracking-tight">
            {metrics.reconcileRate}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between font-medium">
            <span>{metrics.reconciledCount} Linked</span>
            {metrics.unreconciledCount > 0 && (
              <span className="text-amber-400 font-bold">{metrics.unreconciledCount} Pending</span>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, reference, invoice #, or Solana signature..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Channel Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Channels' },
            { id: 'solana', label: '◎ Solana USDC' },
            { id: 'transfer', label: 'Bank' },
            { id: 'cash', label: 'Cash' },
            { id: 'pos', label: 'POS Card' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setChannelFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                channelFilter === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Reconciliation Status Pill & Date Selector */}
        <div className="flex items-center gap-2">
          <select
            value={reconcileFilter}
            onChange={(e) => setReconcileFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="reconciled">Reconciled Only</option>
            <option value="unreconciled">Unreconciled / Pending</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Unified Payments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Customer / Payer</th>
                <th className="py-3.5 px-4">Associated Record</th>
                <th className="py-3.5 px-4">Reference / Signature</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Reconciliation</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-400">No payment records found.</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Payments recorded through Invoices, POS Sales, or Solana transfers will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isSolana = p.channel === 'solana';

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        <div className="font-semibold">{new Date(p.date).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {new Date(p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Channel Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSolana ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <span>◎</span> Solana USDC
                          </span>
                        ) : p.channel === 'transfer' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            <Building2 className="w-2.5 h-2.5" /> Bank Transfer
                          </span>
                        ) : p.channel === 'pos' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <CreditCard className="w-2.5 h-2.5" /> POS Card
                          </span>
                        ) : p.channel === 'cash' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Banknote className="w-2.5 h-2.5" /> Cash
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                            {p.channel.toUpperCase()}
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 text-white font-medium whitespace-nowrap">
                        <div>{p.customerName}</div>
                        {p.customerPhone && (
                          <div className="text-[10px] text-slate-500 font-normal">{p.customerPhone}</div>
                        )}
                      </td>

                      {/* Associated Record */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.invoiceNumber ? (
                          <button
                            onClick={() => onNavigateTab('invoices')}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Invoice #{p.invoiceNumber}</span>
                          </button>
                        ) : p.receiptNumber ? (
                          <span className="text-[11px] font-semibold text-slate-400">
                            Sale #{p.receiptNumber}
                          </span>
                        ) : p.sourceType === 'debt_payment' ? (
                          <span className="text-[11px] font-semibold text-rose-400">Debt Repayment</span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Direct On-Chain Transfer</span>
                        )}
                      </td>

                      {/* Reference / Signature */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                          {isSolana && p.solanaSignature ? (
                            <>
                              <span className="text-purple-300 font-semibold" title={p.solanaSignature}>
                                {solanaService.truncateAddress(p.solanaSignature, 5)}
                              </span>
                              <button
                                onClick={() => copyToClipboard(p.solanaSignature!, p.id)}
                                className="p-0.5 text-slate-500 hover:text-white rounded"
                                title="Copy signature"
                              >
                                {copiedItem === p.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <a
                                href={p.solanaExplorerUrl || solanaService.getExplorerUrl(p.solanaSignature)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-0.5 text-slate-500 hover:text-purple-400 rounded"
                                title="Verify on Solana Explorer"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          ) : (
                            <span className="truncate max-w-[120px]">{p.reference || 'N/A'}</span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-white tracking-tight">
                          {formatMoney(p.amountNgn, business, true)}
                        </div>
                        {isSolana && p.amountUsdc && (
                          <div className="text-[10px] font-mono text-purple-400 font-semibold">
                            ${p.amountUsdc.toFixed(2)} USDC
                          </div>
                        )}
                      </td>

                      {/* Reconciliation Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {p.status === 'reconciled' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Reconciled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Clock className="w-2.5 h-2.5" /> Unreconciled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === 'unreconciled' && (
                            <button
                              onClick={() => {
                                setSelectedUnreconciledItem(p);
                                setTargetInvoiceIdToLink(unpaidInvoices[0]?.id || '');
                              }}
                              className="px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-[10px] font-bold text-white flex items-center gap-1 transition-colors"
                              title="Link this payment to an invoice"
                            >
                              <LinkIcon className="w-2.5 h-2.5" />
                              <span>Link Invoice</span>
                            </button>
                          )}

                          {isSolana && p.solanaSignature && (
                            <button
                              onClick={() => handleVerifyOnChain(p.solanaSignature!)}
                              disabled={reverifyingSig === p.solanaSignature}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white transition-colors"
                              title="Verify live on Solana RPC"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${
                                  reverifyingSig === p.solanaSignature ? 'animate-spin' : ''
                                }`}
                              />
                            </button>
                          )}

                          <button
                            onClick={() => setViewingItem(p)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="View Payment Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Link to Invoice Modal */}
      {selectedUnreconciledItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Link Payment to Invoice</h3>
              </div>
              <button
                onClick={() => setSelectedUnreconciledItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="text-slate-400">Payment Reference / Signature:</div>
              <div className="font-mono text-purple-300 text-[11px] break-all">
                {selectedUnreconciledItem.reference}
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800/80 font-bold text-white">
                <span>Payment Amount:</span>
                <span>{formatMoney(selectedUnreconciledItem.amountNgn, business, true)}</span>
              </div>
              {selectedUnreconciledItem.amountUsdc && (
                <div className="flex justify-between text-[11px] text-purple-400 font-mono">
                  <span>USDC Value:</span>
                  <span>${selectedUnreconciledItem.amountUsdc.toFixed(2)} USDC</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Select Outstanding Invoice to Reconcile:
              </label>
              {unpaidInvoices.length === 0 ? (
                <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-300">
                  No unpaid or pending invoices found in the system.
                </div>
              ) : (
                <select
                  value={targetInvoiceIdToLink}
                  onChange={(e) => setTargetInvoiceIdToLink(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {unpaidInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      #{inv.invoiceNumber} - {inv.customerName} (Due:{' '}
                      {formatMoney(inv.balanceDue > 0 ? inv.balanceDue : inv.totalAmount, business, true)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setSelectedUnreconciledItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmManualLink}
                disabled={!targetInvoiceIdToLink || isLinking}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
              >
                {isLinking ? 'Reconciling...' : 'Confirm Reconciliation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Reconcile Summary Modal */}
      {autoReconcileResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Auto-Reconciliation Report</h3>
              </div>
              <button
                onClick={() => setAutoReconcileResult(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              {autoReconcileResult.reconciledCount > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-emerald-300 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      Successfully matched & reconciled {autoReconcileResult.reconciledCount} Solana payment
                      {autoReconcileResult.reconciledCount > 1 ? 's' : ''} with outstanding invoices!
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {autoReconcileResult.matchedInvoices.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <div className="font-bold text-white">Invoice #{m.invoiceNumber}</div>
                          <div className="text-slate-500 font-mono">
                            {solanaService.truncateAddress(m.signature, 6)}
                          </div>
                        </div>
                        <div className="font-bold text-emerald-400">
                          {formatMoney(m.amountNgn, business, true)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-300">All Solana payments are already reconciled!</p>
                  <p className="text-[11px] text-slate-500">
                    No unmatched on-chain Solana payments were found for open invoices.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setAutoReconcileResult(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Payment Ledger Record</h3>
              </div>
              <button
                onClick={() => setViewingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Channel</span>
                  <span className="font-bold text-white uppercase">{viewingItem.channel}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Timestamp</span>
                  <span className="font-semibold text-slate-300">
                    {new Date(viewingItem.date).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Customer</span>
                  <span className="font-bold text-white">{viewingItem.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Amount</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {formatMoney(viewingItem.amountNgn, business, true)}
                  </span>
                  {viewingItem.amountUsdc && (
                    <span className="block text-[11px] text-purple-400 font-mono">
                      ${viewingItem.amountUsdc.toFixed(2)} USDC
                    </span>
                  )}
                </div>
              </div>

              {viewingItem.solanaSignature && (
                <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      Solana On-Chain Receipt
                    </span>
                    <a
                      href={viewingItem.solanaExplorerUrl || solanaService.getExplorerUrl(viewingItem.solanaSignature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-[11px] font-bold flex items-center gap-1"
                    >
                      <span>Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="font-mono text-[11px] text-purple-200 break-all bg-slate-950 p-2 rounded border border-purple-900/50">
                    {viewingItem.solanaSignature}
                  </div>
                </div>
              )}

              {viewingItem.notes && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-slate-500 block text-[10px] uppercase mb-1">Notes / Description</span>
                  <span>{viewingItem.notes}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
