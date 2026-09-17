import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  QrCode,
  X,
  Sparkles,
  Link as LinkIcon,
  ChevronRight,
  Hash,
  Activity,
  Layers,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BusinessProfile, StaffUser, SolanaTransaction, Invoice } from '../types';
import {
  solanaService,
  DEFAULT_NGN_USDC_RATE,
  SOLANA_MAINNET_USDC_MINT,
  VerificationResult,
} from '../services/solanaService';
import { formatMoney, formatDate } from '../utils/formatters';

interface BlockchainViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  transactions: SolanaTransaction[];
  invoices: Invoice[];
  onSaveTransaction: (tx: SolanaTransaction) => void;
  onUpdateBusiness: (biz: BusinessProfile) => void;
  onDeleteTransaction?: (id: string) => void;
  onNavigateTab?: (tab: any) => void;
}

export const BlockchainView: React.FC<BlockchainViewProps> = ({
  business,
  currentStaff,
  transactions,
  invoices,
  onSaveTransaction,
  onUpdateBusiness,
  onDeleteTransaction,
  onNavigateTab,
}) => {
  // Wallet Address & Settings
  const walletAddress =
    business.solanaWalletAddress || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
  const exchangeRate = business.solanaUsdcNgnRate || DEFAULT_NGN_USDC_RATE;

  // Live Balances
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isWalletConfigOpen, setIsWalletConfigOpen] = useState(false);
  const [newWalletInput, setNewWalletInput] = useState(business.solanaWalletAddress || '');
  const [newRateInput, setNewRateInput] = useState(exchangeRate.toString());
  const [walletConfigError, setWalletConfigError] = useState<string | null>(null);

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifySigInput, setVerifySigInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [isVerifyingSig, setIsVerifyingSig] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [selectedTx, setSelectedTx] = useState<SolanaTransaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [isReverifyingId, setIsReverifyingId] = useState<string | null>(null);

  // Fetch balances on mount or address change
  const fetchLiveBalances = async () => {
    if (!walletAddress) return;
    setIsLoadingBalances(true);
    try {
      const [sol, usdc] = await Promise.all([
        solanaService.getSolBalance(walletAddress),
        solanaService.getUsdcBalance(walletAddress),
      ]);
      setSolBalance(sol);
      setUsdcBalance(usdc);
    } catch (err) {
      console.warn('Could not fetch balances:', err);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  useEffect(() => {
    fetchLiveBalances();
  }, [walletAddress]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  // Re-verify a specific transaction on Solana Mainnet RPC
  const handleReverifyTx = async (tx: SolanaTransaction) => {
    if (!tx.signature) return;
    setIsReverifyingId(tx.id);
    try {
      const res = await solanaService.verifyTransaction(
        tx.signature,
        tx.recipientAddress,
        tx.amountUsdc
      );
      if (res.verified) {
        onSaveTransaction({
          ...tx,
          status: 'confirmed',
          confirmationStatus: res.status === 'finalized' ? 'finalized' : 'confirmed',
          slot: res.slot || tx.slot,
          blockTime: res.blockTime || tx.blockTime,
          payerAddress: res.payer || tx.payerAddress,
          verifiedAt: new Date().toISOString(),
        });
      } else if (res.status === 'failed') {
        onSaveTransaction({
          ...tx,
          status: 'failed',
          errorMessage: res.error,
        });
      }
    } catch (err) {
      console.warn('Re-verify failed:', err);
    } finally {
      setIsReverifyingId(null);
    }
  };

  // Save new wallet address & exchange rate
  const handleSaveWalletConfig = () => {
    const trimmed = newWalletInput.trim();
    if (trimmed && !solanaService.isValidAddress(trimmed)) {
      setWalletConfigError('Please enter a valid Base58 Solana public key (32-44 characters).');
      return;
    }

    const parsedRate = parseFloat(newRateInput) || DEFAULT_NGN_USDC_RATE;
    if (parsedRate <= 0) {
      setWalletConfigError('Exchange rate must be greater than 0.');
      return;
    }

    onUpdateBusiness({
      ...business,
      solanaWalletAddress: trimmed || undefined,
      solanaUsdcEnabled: true,
      solanaUsdcNgnRate: parsedRate,
      solanaCluster: 'mainnet-beta',
    });

    setIsWalletConfigOpen(false);
    setWalletConfigError(null);
  };

  // Connect browser extension (Phantom / Solflare)
  const handleConnectBrowserWallet = async () => {
    try {
      const wallet = await solanaService.connectBrowserWallet();
      if (wallet) {
        setNewWalletInput(wallet.address);
        setWalletConfigError(null);
      } else {
        alert('No Solana wallet extension detected. You can manually paste your address.');
      }
    } catch (err) {
      console.warn('Connect error:', err);
    }
  };

  // Manual verification tool
  const handleVerifyAnySignature = async () => {
    if (!verifySigInput.trim()) {
      setVerifyError('Please enter a transaction signature to verify.');
      return;
    }
    setIsVerifyingSig(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const result = await solanaService.verifyTransaction(verifySigInput.trim());
      setVerifyResult(result);
      if (!result.verified && result.status !== 'pending') {
        setVerifyError(result.error || 'Transaction could not be verified on Solana Mainnet.');
      }
    } catch (err: any) {
      setVerifyError(err?.message || 'Failed to query Solana Mainnet RPC node.');
    } finally {
      setIsVerifyingSig(false);
    }
  };

  // Save manually verified signature to ledger
  const handleSaveVerifiedAsRecord = () => {
    if (!verifyResult || !verifySigInput.trim()) return;
    const cleanSig = verifySigInput.trim();
    const newTx: SolanaTransaction = {
      id: 'sol_manual_' + Date.now(),
      businessId: business.id,
      signature: cleanSig,
      type: 'transfer',
      status: verifyResult.verified ? 'confirmed' : 'pending',
      amountUsdc: verifyResult.amountUsdc || 0,
      amountNgn: solanaService.convertUsdcToNgn(verifyResult.amountUsdc || 0, exchangeRate),
      exchangeRate,
      recipientAddress: walletAddress,
      payerAddress: verifyResult.payer || undefined,
      timestamp: new Date().toISOString(),
      slot: verifyResult.slot,
      blockTime: verifyResult.blockTime,
      confirmationStatus: verifyResult.status === 'finalized' ? 'finalized' : 'confirmed',
      explorerUrl: solanaService.getExplorerUrl(cleanSig, 'tx', 'mainnet-beta'),
      notes: 'Manually verified on Solana Mainnet-Beta',
      verifiedAt: new Date().toISOString(),
    };

    onSaveTransaction(newTx);
    setIsVerifyModalOpen(false);
    setVerifySigInput('');
    setVerifyResult(null);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Status filter
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSig = t.signature?.toLowerCase().includes(q);
        const matchesInv = t.invoiceNumber?.toLowerCase().includes(q);
        const matchesCust = t.customerName?.toLowerCase().includes(q);
        const matchesPayer = t.payerAddress?.toLowerCase().includes(q);
        const matchesNotes = t.notes?.toLowerCase().includes(q);
        return matchesSig || matchesInv || matchesCust || matchesPayer || matchesNotes;
      }

      return true;
    });
  }, [transactions, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const confirmed = transactions.filter((t) => t.status === 'confirmed');
    const pending = transactions.filter((t) => t.status === 'pending');
    const failed = transactions.filter((t) => t.status === 'failed');

    const totalUsdcSettled = confirmed.reduce((acc, t) => acc + (t.amountUsdc || 0), 0);
    const totalNgnSettled = confirmed.reduce((acc, t) => acc + (t.amountNgn || 0), 0);

    return {
      totalUsdcSettled,
      totalNgnSettled,
      confirmedCount: confirmed.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      totalCount: transactions.length,
    };
  }, [transactions]);

  return (
    <div id="blockchain-payments-view" className="space-y-6 animate-in fade-in duration-150">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-0.5 shadow-md shadow-purple-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-xs font-black text-white">◎</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100">
              Solana Blockchain & USDC Payments
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Accept USDC payments, store verifiable on-chain records, and track live Solana Mainnet settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsVerifyModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/80 flex items-center gap-1.5 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verify Signature</span>
          </button>
          <button
            onClick={() => setIsWalletConfigOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-950 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Store Wallet Settings</span>
          </button>
        </div>
      </div>

      {/* Business Solana Wallet Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Address and Network */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Solana Mainnet-Beta</span>
              </span>
              <span className="text-xs text-slate-400">
                Settlement Token: <strong className="text-slate-200">USDC (SPL)</strong>
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-400 font-medium">Business Settlement Wallet</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-sm sm:text-base font-bold text-slate-100 break-all">
                  {walletAddress}
                </span>
                <button
                  onClick={() => copyToClipboard(walletAddress, 'wallet')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex-shrink-0"
                  title="Copy Wallet Address"
                >
                  {copiedItem === 'wallet' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => setIsQrModalOpen(true)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex-shrink-0"
                  title="Show QR Code"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
                <a
                  href={solanaService.getExplorerUrl(walletAddress, 'address', 'mainnet-beta')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex-shrink-0"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Right: Live Balances & Rate */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
            <div>
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
                USDC Token Balance
              </span>
              <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                {usdcBalance !== null ? usdcBalance.toFixed(2) : '0.00'}{' '}
                <span className="text-xs font-semibold text-slate-400">USDC</span>
              </p>
              <span className="text-[11px] text-slate-400 font-medium">
                ≈ {formatMoney((usdcBalance || 0) * exchangeRate, business)}
              </span>
            </div>

            <div className="h-10 w-[1px] bg-slate-800 hidden sm:block"></div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
                SOL Balance (Gas)
              </span>
              <p className="text-lg sm:text-xl font-black text-slate-200 font-mono">
                {solBalance !== null ? solBalance.toFixed(4) : '0.0000'}{' '}
                <span className="text-xs font-semibold text-slate-400">SOL</span>
              </p>
              <span className="text-[11px] text-slate-500 font-medium">Network Gas Reserve</span>
            </div>

            <div className="h-10 w-[1px] bg-slate-800 hidden sm:block"></div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
                Store Rate
              </span>
              <p className="text-sm font-bold text-slate-200">
                1 USDC = ₦{exchangeRate.toLocaleString()}
              </p>
              <button
                onClick={fetchLiveBalances}
                disabled={isLoadingBalances}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 mt-0.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingBalances ? 'animate-spin' : ''}`} />
                <span>Refresh Balances</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Total On-Chain Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
            {stats.totalUsdcSettled.toFixed(2)}{' '}
            <span className="text-xs text-slate-400">USDC</span>
          </p>
          <span className="text-xs text-slate-400 font-medium">
            ≈ {formatMoney(stats.totalNgnSettled, business)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-slate-100">{stats.confirmedCount}</p>
          <span className="text-xs text-emerald-400/90 font-medium">Finalized on Mainnet</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Pending Node Finality</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-slate-100">{stats.pendingCount}</p>
          <span className="text-xs text-amber-400 font-medium">Confirming blocks</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Failed / Reverted</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-black text-slate-100">{stats.failedCount}</p>
          <span className="text-xs text-slate-400 font-medium">On-chain rejected</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All Transactions', count: stats.totalCount },
              { id: 'confirmed', label: 'Confirmed', count: stats.confirmedCount },
              { id: 'pending', label: 'Pending', count: stats.pendingCount },
              { id: 'failed', label: 'Failed', count: stats.failedCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === tab.id ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search signature, invoice, address..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-300">No Transactions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'No transactions matching your search query. Try clearing the search.'
                : 'Transactions settled via Solana USDC or recorded on-chain will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredTransactions.map((tx) => {
              const isConfirmed = tx.status === 'confirmed';
              const isPending = tx.status === 'pending';
              const isFailed = tx.status === 'failed';

              return (
                <div
                  key={tx.id}
                  className="p-4 sm:p-5 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  {/* Left info */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isConfirmed
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isPending
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isConfirmed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isPending ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-100">
                          {tx.customerName || tx.invoiceNumber || 'On-Chain Payment'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isConfirmed
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : isPending
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {tx.status}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 uppercase">
                          {tx.type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Signature line */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-mono text-[11px] text-slate-400">
                          Sig: {solanaService.truncateAddress(tx.signature, 6)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(tx.signature, tx.id)}
                          className="text-slate-500 hover:text-slate-300 transition"
                          title="Copy Full Signature"
                        >
                          {copiedItem === tx.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <span className="text-slate-600">•</span>
                        <span className="text-[11px] text-slate-500">
                          {formatDate(tx.timestamp)}
                        </span>
                      </div>

                      {/* Error or notes */}
                      {tx.errorMessage && (
                        <p className="text-[11px] text-rose-400 max-w-lg leading-snug">
                          {tx.errorMessage}
                        </p>
                      )}
                      {tx.notes && !tx.errorMessage && (
                        <p className="text-[11px] text-slate-500 max-w-lg leading-snug">
                          {tx.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right side: Amount and Explorer button */}
                  <div className="flex items-center justify-between md:justify-end gap-4 pl-12 md:pl-0">
                    <div className="text-left md:text-right">
                      <p className="text-base font-black text-slate-100 font-mono">
                        {tx.amountUsdc ? tx.amountUsdc.toFixed(2) : '0.00'}{' '}
                        <span className="text-xs font-semibold text-emerald-400">USDC</span>
                      </p>
                      <span className="text-xs text-slate-400 font-medium">
                        ≈ {formatMoney(tx.amountNgn, business)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <button
                          onClick={() => handleReverifyTx(tx)}
                          disabled={isReverifyingId === tx.id}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                          title="Check confirmation on Solana Mainnet"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${isReverifyingId === tx.id ? 'animate-spin' : ''}`}
                          />
                          <span className="hidden sm:inline">Verify</span>
                        </button>
                      )}

                      <a
                        href={tx.explorerUrl || solanaService.getExplorerUrl(tx.signature, 'tx')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1 transition"
                        title="Open in Solana Explorer"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        onClick={() => {
                          setSelectedTx(tx);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                        title="View Details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Store Wallet & Settings */}
      {isWalletConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-slate-100">Store Solana Wallet</h3>
              </div>
              <button
                onClick={() => setIsWalletConfigOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Solana Receiving Address (Mainnet Public Key)
                </label>
                <input
                  type="text"
                  value={newWalletInput}
                  onChange={(e) => setNewWalletInput(e.target.value)}
                  placeholder="Paste Base58 Solana address (e.g. 7xKX...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                />
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleConnectBrowserWallet}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Auto-detect Phantom / Solflare</span>
                  </button>
                  <span className="text-[10px] text-slate-500">Mainnet-Beta</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  USDC to NGN Conversion Rate (1 USDC =)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₦
                  </span>
                  <input
                    type="number"
                    value={newRateInput}
                    onChange={(e) => setNewRateInput(e.target.value)}
                    placeholder="1550"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Used to automatically compute USDC totals on invoices and POS checkout.
                </p>
              </div>

              {walletConfigError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p>{walletConfigError}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsWalletConfigOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveWalletConfig}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-950 transition cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Verify Any Transaction Signature */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Verify Transaction On Solana Mainnet
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsVerifyModalOpen(false);
                  setVerifyResult(null);
                  setVerifyError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Solana Transaction Signature
                </label>
                <input
                  type="text"
                  value={verifySigInput}
                  onChange={(e) => setVerifySigInput(e.target.value)}
                  placeholder="Paste transaction signature to check on-chain..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={handleVerifyAnySignature}
                disabled={isVerifyingSig || !verifySigInput.trim()}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow"
              >
                {isVerifyingSig ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying Solana Mainnet RPC Nodes...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Query On-Chain Status</span>
                  </>
                )}
              </button>

              {verifyError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p>{verifyError}</p>
                </div>
              )}

              {verifyResult && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Status:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase ${
                        verifyResult.verified
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {verifyResult.status}
                    </span>
                  </div>
                  {verifyResult.slot && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Block Slot:</span>
                      <span className="font-mono text-slate-200">#{verifyResult.slot}</span>
                    </div>
                  )}
                  {verifyResult.payer && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Payer Account:</span>
                      <span className="font-mono text-slate-200">
                        {solanaService.truncateAddress(verifyResult.payer, 6)}
                      </span>
                    </div>
                  )}
                  {verifyResult.feeSol !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Network Fee:</span>
                      <span className="font-mono text-slate-200">
                        {verifyResult.feeSol.toFixed(6)} SOL
                      </span>
                    </div>
                  )}

                  <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                    <a
                      href={solanaService.getExplorerUrl(verifySigInput.trim(), 'tx')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Solana Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {verifyResult.verified && (
                      <button
                        onClick={handleSaveVerifiedAsRecord}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs"
                      >
                        Save to Ledger
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: QR Code Display for Store Wallet */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">Store Solana Address</h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-white rounded-2xl inline-block shadow-md mx-auto">
              <QRCodeSVG value={walletAddress} size={180} level="M" />
            </div>
            <p className="font-mono text-xs text-slate-300 break-all bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              {walletAddress}
            </p>
            <button
              onClick={() => copyToClipboard(walletAddress, 'modal-wallet')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {copiedItem === 'modal-wallet' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Address</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Transaction Cryptographic Detail Modal */}
      {isDetailModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">On-Chain Record Details</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span
                    className={`font-bold uppercase ${
                      selectedTx.status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {selectedTx.status} ({selectedTx.confirmationStatus || 'finalized'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount (USDC)</span>
                  <span className="font-mono font-bold text-slate-100">
                    {selectedTx.amountUsdc?.toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount (NGN)</span>
                  <span className="font-bold text-slate-100">
                    {formatMoney(selectedTx.amountNgn, business)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp</span>
                  <span className="text-slate-300">{formatDate(selectedTx.timestamp)}</span>
                </div>
                {selectedTx.slot && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Solana Slot</span>
                    <span className="font-mono text-slate-300">#{selectedTx.slot}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Transaction Signature</span>
                <p className="font-mono text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 break-all">
                  {selectedTx.signature}
                </p>
              </div>

              {selectedTx.payerAddress && (
                <div>
                  <span className="text-slate-400 font-medium block mb-1">Payer Address</span>
                  <p className="font-mono text-[11px] text-slate-300 bg-slate-950 p-2 rounded-xl border border-slate-800 break-all">
                    {selectedTx.payerAddress}
                  </p>
                </div>
              )}

              <div>
                <span className="text-slate-400 font-medium block mb-1">Recipient Address</span>
                <p className="font-mono text-[11px] text-slate-300 bg-slate-950 p-2 rounded-xl border border-slate-800 break-all">
                  {selectedTx.recipientAddress}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <a
                href={
                  selectedTx.explorerUrl ||
                  solanaService.getExplorerUrl(selectedTx.signature, 'tx')
                }
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <span>View on Solana Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
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
