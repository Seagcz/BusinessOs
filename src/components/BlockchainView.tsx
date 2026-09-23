import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Search,
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
  Activity,
  Layers,
  Zap,
  Download,
  Key,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BusinessProfile, StaffUser, SolanaTransaction, Invoice } from '../types';
import {
  solanaService,
  DEFAULT_NGN_USDC_RATE,
  VerificationResult,
  OnChainTransactionSummary,
  ClusterHealth,
} from '../services/solanaService';
import { storageService } from '../services/storage';
import { formatMoney, formatDate } from '../utils/formatters';

interface BlockchainViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  transactions?: SolanaTransaction[];
  invoices: Invoice[];
  sales?: any[];
  onSaveTransaction?: (tx: SolanaTransaction) => void;
  onUpdateBusiness: (biz: BusinessProfile) => void;
  onDeleteTransaction?: (id: string) => void;
  onNavigateTab?: (tab: any) => void;
}

export const BlockchainView: React.FC<BlockchainViewProps> = ({
  business,
  currentStaff,
  transactions: propTransactions,
  invoices,
  onSaveTransaction,
  onUpdateBusiness,
  onDeleteTransaction,
  onNavigateTab,
}) => {
  // Active Wallet Address & Settings
  const walletAddress = business.solanaWalletAddress || '';
  const exchangeRate = business.solanaUsdcNgnRate || DEFAULT_NGN_USDC_RATE;

  // Local Transactions list
  const transactions = useMemo(() => {
    if (propTransactions && propTransactions.length > 0) return propTransactions;
    return storageService.getSolanaTransactions(business.id);
  }, [propTransactions, business.id]);

  // Live Balances
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Live RPC Cluster Health
  const [clusterHealth, setClusterHealth] = useState<ClusterHealth | null>(null);
  const [isCheckingCluster, setIsCheckingCluster] = useState(false);

  // Browser Wallet Connection
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string | null>(null);
  const [connectedWalletName, setConnectedWalletName] = useState<string>('Solana Wallet');
  const [walletConnectionError, setWalletConnectionError] = useState<string | null>(null);
  const [isInstallWalletModalOpen, setIsInstallWalletModalOpen] = useState(false);

  // Real on-chain RPC signatures feed
  const [onChainSignatures, setOnChainSignatures] = useState<OnChainTransactionSummary[]>([]);
  const [isLoadingSignatures, setIsLoadingSignatures] = useState(false);
  const [feedMode, setFeedMode] = useState<'records' | 'onchain_rpc'>('records');

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

  const [isKeypairModalOpen, setIsKeypairModalOpen] = useState(false);
  const [generatedKeypair, setGeneratedKeypair] = useState<{
    publicKey: string;
    secretKeyHex: string;
    secretKeyBytes: number[];
  } | null>(null);

  const [selectedTx, setSelectedTx] = useState<SolanaTransaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [isReverifyingId, setIsReverifyingId] = useState<string | null>(null);

  // Fetch balances and cluster health
  const fetchLiveBalances = useCallback(async () => {
    const target = walletAddress || connectedWalletAddress;
    if (!target) {
      setSolBalance(null);
      setUsdcBalance(null);
      return;
    }
    setIsLoadingBalances(true);
    try {
      const [sol, usdc] = await Promise.all([
        solanaService.getSolBalance(target),
        solanaService.getUsdcBalance(target),
      ]);
      setSolBalance(sol);
      setUsdcBalance(usdc);
    } catch (err) {
      console.warn('Could not fetch balances:', err);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [walletAddress, connectedWalletAddress]);

  const checkClusterHealth = useCallback(async () => {
    setIsCheckingCluster(true);
    try {
      const health = await solanaService.getClusterHealth();
      setClusterHealth(health);
    } catch (err) {
      console.warn('Cluster health error:', err);
    } finally {
      setIsCheckingCluster(false);
    }
  }, []);

  // Fetch actual on-chain signatures from Solana RPC
  const fetchOnChainSignatures = useCallback(async () => {
    const target = walletAddress || connectedWalletAddress;
    if (!target) return;
    setIsLoadingSignatures(true);
    try {
      const sigs = await solanaService.getSignaturesForAddress(target, 20);
      setOnChainSignatures(sigs);
    } catch (err) {
      console.warn('Failed to load on-chain signatures:', err);
    } finally {
      setIsLoadingSignatures(false);
    }
  }, [walletAddress, connectedWalletAddress]);

  useEffect(() => {
    fetchLiveBalances();
    checkClusterHealth();
    fetchOnChainSignatures();
  }, [fetchLiveBalances, checkClusterHealth, fetchOnChainSignatures]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  // Connect browser wallet (Phantom, Solflare, Backpack)
  const handleConnectWallet = async () => {
    setIsConnectingWallet(true);
    setWalletConnectionError(null);
    try {
      const res = await solanaService.connectBrowserWallet();
      if (res.success && res.address) {
        setConnectedWalletAddress(res.address);
        if (res.walletName) setConnectedWalletName(res.walletName);

        // If no business wallet is saved yet, ask or automatically set as settlement wallet
        if (!business.solanaWalletAddress) {
          onUpdateBusiness({
            ...business,
            solanaWalletAddress: res.address,
            solanaUsdcEnabled: true,
            solanaCluster: 'mainnet-beta',
          });
        }
      } else {
        if (res.errorType === 'NO_WALLET_FOUND') {
          setIsInstallWalletModalOpen(true);
        } else {
          setWalletConnectionError(res.errorMessage || 'Failed to connect Solana wallet.');
        }
      }
    } catch (err: any) {
      setWalletConnectionError(err?.message || 'Wallet connection was cancelled.');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleDisconnectWallet = async () => {
    await solanaService.disconnectBrowserWallet();
    setConnectedWalletAddress(null);
  };

  const handleSetConnectedAsSettlement = () => {
    if (!connectedWalletAddress) return;
    onUpdateBusiness({
      ...business,
      solanaWalletAddress: connectedWalletAddress,
      solanaUsdcEnabled: true,
      solanaCluster: 'mainnet-beta',
    });
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
        const updated: SolanaTransaction = {
          ...tx,
          status: 'confirmed',
          confirmationStatus: res.status === 'finalized' ? 'finalized' : 'confirmed',
          slot: res.slot || tx.slot,
          blockTime: res.blockTime || tx.blockTime,
          payerAddress: res.payer || tx.payerAddress,
          verifiedAt: new Date().toISOString(),
        };
        if (onSaveTransaction) {
          onSaveTransaction(updated);
        }
        storageService.saveSolanaTransaction(updated, currentStaff.name);
      } else if (res.status === 'failed') {
        const updated: SolanaTransaction = {
          ...tx,
          status: 'failed',
          errorMessage: res.error,
        };
        if (onSaveTransaction) {
          onSaveTransaction(updated);
        }
        storageService.saveSolanaTransaction(updated, currentStaff.name);
      }
    } catch (err) {
      console.warn('Re-verify failed:', err);
    } finally {
      setIsReverifyingId(null);
    }
  };

  // Save new wallet address & exchange rate manually
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

  // Generate offline Solana Keypair
  const handleGenerateKeypair = () => {
    const kp = solanaService.generateNewKeypair();
    setGeneratedKeypair(kp);
    setIsKeypairModalOpen(true);
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
      const res = await solanaService.verifyTransaction(verifySigInput.trim());
      setVerifyResult(res);
      if (!res.verified && res.status !== 'pending') {
        setVerifyError(res.error || 'Transaction could not be verified on Solana Mainnet.');
      }
    } catch (err: any) {
      setVerifyError(err?.message || 'Error communicating with Solana Mainnet RPC node.');
    } finally {
      setIsVerifyingSig(false);
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
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

  const activeDisplayAddress = walletAddress || connectedWalletAddress;

  return (
    <div id="blockchain-payments-view" className="space-y-6 pb-20">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-0.5 shadow-md shadow-purple-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-xs font-black text-white">◎</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Solana Wallet & USDC Settlements
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real on-chain wallet connection, Mainnet-Beta RPC verification, live balances, and non-simulated USDC settlement.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsVerifyModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 flex items-center gap-1.5 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verify Tx Signature</span>
          </button>

          <button
            onClick={handleGenerateKeypair}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-purple-400" />
            <span>Generate Keypair</span>
          </button>

          <button
            onClick={() => setIsWalletConfigOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-950 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Wallet Settings</span>
          </button>
        </div>
      </div>

      {/* Wallet Connection Error Banner */}
      {walletConnectionError && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{walletConnectionError}</span>
          </div>
          <button
            onClick={() => setWalletConnectionError(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Business Solana Wallet Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {activeDisplayAddress ? (
            /* Left: Address and Network */
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Solana Mainnet-Beta</span>
                </span>

                {connectedWalletAddress ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Connected via {connectedWalletName}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                    Configured Settlement Address
                  </span>
                )}

                {clusterHealth && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    <span>Slot #{clusterHealth.currentSlot.toLocaleString()}</span>
                    <span>• {clusterHealth.latencyMs}ms</span>
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-400 font-medium">Business Receiving Address</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="font-mono text-sm sm:text-base font-bold text-slate-100 break-all">
                    {activeDisplayAddress}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(activeDisplayAddress, 'wallet')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex-shrink-0"
                      title="Copy Address"
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
                      href={solanaService.getExplorerUrl(activeDisplayAddress, 'address', 'mainnet-beta')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex-shrink-0"
                      title="View on Solana Explorer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {connectedWalletAddress && connectedWalletAddress !== walletAddress && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={handleSetConnectedAsSettlement}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition"
                    >
                      Set as Store Settlement Wallet
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Wallet Disconnected
                </span>
                <span className="text-xs text-slate-400">Solana Mainnet-Beta</span>
              </div>
              <h3 className="text-base font-bold text-slate-100">Connect Business Solana Wallet</h3>
              <p className="text-xs text-slate-400 max-w-md">
                Connect Phantom, Solflare, or Backpack to view real on-chain balances, manage transactions, and accept verified USDC settlements.
              </p>
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnectingWallet}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-950 transition cursor-pointer disabled:opacity-50"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{isConnectingWallet ? 'Connecting...' : 'Connect Solana Wallet'}</span>
                </button>
                <button
                  onClick={() => setIsWalletConfigOpen(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700"
                >
                  Enter Address Manually
                </button>
              </div>
            </div>
          )}

          {/* Right: Live Balances & Quick Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Balances Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-6">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">SOL Balance</span>
                </div>
                <div className="text-lg font-black text-slate-100 font-mono mt-0.5">
                  {isLoadingBalances ? (
                    <span className="text-xs text-slate-500 animate-pulse">Querying RPC...</span>
                  ) : solBalance !== null ? (
                    `${solBalance.toFixed(4)} SOL`
                  ) : (
                    '—'
                  )}
                </div>
              </div>

              <div className="border-l border-slate-800 pl-6">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  <span>USDC Balance</span>
                </div>
                <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                  {isLoadingBalances ? (
                    <span className="text-xs text-slate-500 animate-pulse">Querying RPC...</span>
                  ) : usdcBalance !== null ? (
                    `$${usdcBalance.toFixed(2)}`
                  ) : (
                    '—'
                  )}
                </div>
              </div>

              <button
                onClick={fetchLiveBalances}
                disabled={isLoadingBalances}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
                title="Refresh On-Chain Balances"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingBalances ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Wallet Toggle / Disconnect */}
            {connectedWalletAddress ? (
              <button
                onClick={handleDisconnectWallet}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
              >
                Disconnect
              </button>
            ) : (
              activeDisplayAddress && (
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnectingWallet}
                  className="px-3.5 py-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Connect Extension</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            USDC Settled
          </span>
          <span className="text-xl font-black text-emerald-400 font-mono mt-1 block">
            ${stats.totalUsdcSettled.toFixed(2)} USDC
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            ≈ {formatMoney(stats.totalNgnSettled, business, true)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Confirmed On-Chain
          </span>
          <span className="text-xl font-black text-slate-100 font-mono mt-1 block">
            {stats.confirmedCount}
          </span>
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> 100% On-Chain Finalized
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Pending Confirmation
          </span>
          <span className="text-xl font-black text-amber-400 font-mono mt-1 block">
            {stats.pendingCount}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            Awaiting RPC block inclusion
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Store Exchange Rate
          </span>
          <span className="text-xl font-black text-purple-300 font-mono mt-1 block">
            ₦{exchangeRate.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            Per 1.00 USDC
          </span>
        </div>
      </div>

      {/* Feed Mode Switcher & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        {/* Feed Mode Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setFeedMode('records')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              feedMode === 'records'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Settled Ledger Records ({transactions.length})
          </button>
          <button
            onClick={() => {
              setFeedMode('onchain_rpc');
              fetchOnChainSignatures();
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              feedMode === 'onchain_rpc'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3 h-3 text-emerald-300" />
            <span>Live On-Chain Signatures (RPC)</span>
          </button>
        </div>

        {feedMode === 'records' ? (
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search signature, customer, invoice #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        ) : (
          <button
            onClick={fetchOnChainSignatures}
            disabled={isLoadingSignatures}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg font-medium"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingSignatures ? 'animate-spin' : ''}`} />
            <span>Refresh RPC Signatures</span>
          </button>
        )}
      </div>

      {/* Main Table Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {feedMode === 'records' ? (
          /* Business Ledger Transactions Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Customer / Payer</th>
                  <th className="py-3 px-4">Signature (Explorer Link)</th>
                  <th className="py-3 px-4 text-right">Amount (USDC / NGN)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-400" />
                      <p className="font-semibold text-slate-400">No settled transactions yet.</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        When customers settle invoices or POS sales via Solana USDC, verified signatures appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        <div className="font-semibold">{new Date(tx.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase">
                          {tx.type.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-white whitespace-nowrap">
                        <div>{tx.customerName || 'Direct Transfer'}</div>
                        {tx.invoiceNumber && (
                          <div className="text-[10px] text-indigo-400 font-bold">
                            Invoice #{tx.invoiceNumber}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-purple-300 font-semibold" title={tx.signature}>
                            {solanaService.truncateAddress(tx.signature, 6)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(tx.signature, tx.id)}
                            className="p-0.5 text-slate-500 hover:text-white rounded"
                            title="Copy signature"
                          >
                            {copiedItem === tx.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <a
                            href={tx.explorerUrl || solanaService.getExplorerUrl(tx.signature)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-0.5 text-slate-500 hover:text-purple-400 rounded"
                            title="View on Solana Explorer"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-emerald-400 font-mono">
                          ${(tx.amountUsdc || 0).toFixed(2)} USDC
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatMoney(tx.amountNgn, business, true)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {tx.status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Confirmed
                          </span>
                        ) : tx.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleReverifyTx(tx)}
                            disabled={isReverifyingId === tx.id}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium flex items-center gap-1 transition"
                            title="Re-query confirmation status from Solana RPC"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${isReverifyingId === tx.id ? 'animate-spin' : ''}`}
                            />
                            <span>Verify</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Live On-Chain Signatures from RPC */
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
              <span className="font-semibold text-slate-300">
                Direct RPC On-Chain History for {activeDisplayAddress ? solanaService.truncateAddress(activeDisplayAddress, 5) : 'Wallet'}
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">Solana Mainnet-Beta</span>
            </div>

            {isLoadingSignatures ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                <p>Querying Solana Mainnet-Beta RPC node...</p>
              </div>
            ) : onChainSignatures.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="font-semibold text-slate-400">No on-chain transactions found for this address.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Once transactions are broadcast on Solana Mainnet, they will show here directly from the network.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {onChainSignatures.map((sigItem, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-purple-300 font-bold">
                          {solanaService.truncateAddress(sigItem.signature, 8)}
                        </span>
                        <a
                          href={solanaService.getExplorerUrl(sigItem.signature)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-purple-400"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Slot #{sigItem.slot.toLocaleString()} • {sigItem.blockTime ? new Date(sigItem.blockTime * 1000).toLocaleString() : 'Recent'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {sigItem.confirmationStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Verify Signature Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Verify Any Solana Transaction</h3>
              </div>
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste any transaction signature to query real-time confirmation status directly from the Solana Mainnet-Beta RPC node.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={verifySigInput}
                onChange={(e) => setVerifySigInput(e.target.value)}
                placeholder="Paste 88-char Solana transaction signature..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleVerifyAnySignature}
                disabled={isVerifyingSig || !verifySigInput.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifyingSig ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying Solana Mainnet RPC...</span>
                  </>
                ) : (
                  <span>Verify On-Chain</span>
                )}
              </button>
            </div>

            {verifyError && (
              <div className="p-3 bg-rose-950/30 border border-rose-800/50 rounded-xl text-xs text-rose-300">
                {verifyError}
              </div>
            )}

            {verifyResult && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Confirmation Status:</span>
                  <span className="font-bold text-emerald-400 uppercase">{verifyResult.status}</span>
                </div>
                {verifyResult.slot && (
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-400">Solana Slot:</span>
                    <span className="text-white">#{verifyResult.slot.toLocaleString()}</span>
                  </div>
                )}
                {verifyResult.payer && (
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-400">Payer Address:</span>
                    <span className="text-purple-300">{solanaService.truncateAddress(verifyResult.payer, 6)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <a
                    href={solanaService.getExplorerUrl(verifySigInput.trim())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                  >
                    <span>View on Solana Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wallet Settings Modal */}
      {isWalletConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Store Solana Configuration</h3>
              </div>
              <button
                onClick={() => setIsWalletConfigOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Settlement Wallet Public Address:
                </label>
                <input
                  type="text"
                  value={newWalletInput}
                  onChange={(e) => setNewWalletInput(e.target.value)}
                  placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Custom NGN / USDC Exchange Rate (₦):
                </label>
                <input
                  type="number"
                  value={newRateInput}
                  onChange={(e) => setNewRateInput(e.target.value)}
                  placeholder="1550"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              {walletConfigError && (
                <div className="p-2.5 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-300">
                  {walletConfigError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsWalletConfigOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWalletConfig}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install Wallet Helper Modal */}
      {isInstallWalletModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Install a Solana Wallet</h3>
              </div>
              <button
                onClick={() => setIsInstallWalletModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              No Solana browser extension was detected. You can install an official browser wallet extension, or enter your wallet address manually.
            </p>

            <div className="space-y-2.5 pt-1">
              <a
                href="https://phantom.app/download"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-slate-950 hover:bg-slate-800/70 border border-slate-800 rounded-xl flex items-center justify-between transition group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-300 flex items-center justify-center font-bold">
                    P
                  </div>
                  <div>
                    <div className="font-bold text-white group-hover:text-purple-300">Phantom Wallet</div>
                    <div className="text-[10px] text-slate-500">Most popular Solana extension & mobile app</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </a>

              <a
                href="https://solflare.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-slate-950 hover:bg-slate-800/70 border border-slate-800 rounded-xl flex items-center justify-between transition group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-300 flex items-center justify-center font-bold">
                    S
                  </div>
                  <div>
                    <div className="font-bold text-white group-hover:text-amber-300">Solflare Wallet</div>
                    <div className="text-[10px] text-slate-500">Full featured, secure Solana wallet</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </a>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs">
              <button
                onClick={() => {
                  setIsInstallWalletModalOpen(false);
                  setIsWalletConfigOpen(true);
                }}
                className="text-purple-400 hover:text-purple-300 font-semibold"
              >
                Enter Address Manually
              </button>
              <button
                onClick={() => setIsInstallWalletModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && activeDisplayAddress && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Store Receiving QR</h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl mx-auto inline-block shadow-lg">
              <QRCodeSVG value={activeDisplayAddress} size={180} level="M" />
            </div>

            <p className="font-mono text-xs text-purple-300 break-all px-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              {activeDisplayAddress}
            </p>

            <button
              onClick={() => copyToClipboard(activeDisplayAddress, 'qr-addr')}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              {copiedItem === 'qr-addr' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedItem === 'qr-addr' ? 'Copied to Clipboard' : 'Copy Wallet Address'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Generated Keypair Modal */}
      {isKeypairModalOpen && generatedKeypair && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">New Offline Solana Keypair</h3>
              </div>
              <button
                onClick={() => setIsKeypairModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-amber-300 bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/40">
              Generated securely on client side using @solana/web3.js Keypair.generate(). Save your private key offline safely!
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold mb-1">Public Address:</span>
                <div className="p-2.5 bg-slate-950 rounded-xl font-mono text-purple-300 break-all border border-slate-800">
                  {generatedKeypair.publicKey}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-1">Secret Key (Hex):</span>
                <div className="p-2.5 bg-slate-950 rounded-xl font-mono text-slate-300 break-all border border-slate-800 text-[10px]">
                  {generatedKeypair.secretKeyHex}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => {
                  onUpdateBusiness({
                    ...business,
                    solanaWalletAddress: generatedKeypair.publicKey,
                    solanaUsdcEnabled: true,
                  });
                  setIsKeypairModalOpen(false);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
              >
                Use as Settlement Address
              </button>
              <button
                onClick={() => setIsKeypairModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
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
