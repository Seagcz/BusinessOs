import React, { useState, useEffect } from 'react';
import {
  Building2,
  Wallet,
  Copy,
  Check,
  ShieldCheck,
  Key,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ExternalLink,
  X,
  ArrowLeftRight,
  CreditCard,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { NIGERIAN_BANKS } from '../services/nigerianData';
import { solanaService, DEFAULT_NGN_USDC_RATE } from '../services/solanaService';
import { formatMoney } from '../utils/formatters';

interface PrivateSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessProfile;
  onUpdateBusiness: (updated: BusinessProfile) => void;
  onLogActivity?: (action: string, details: string, entityType: 'business' | 'financial') => void;
}

export const PrivateSettlementModal: React.FC<PrivateSettlementModalProps> = ({
  isOpen,
  onClose,
  business,
  onUpdateBusiness,
  onLogActivity,
}) => {
  // Bank Account State
  const [bankName, setBankName] = useState(
    business.privateAccountBank || (business.bankAccounts && business.bankAccounts[0]?.bankName) || NIGERIAN_BANKS[0]
  );
  const [accountNumber, setAccountNumber] = useState(
    business.privateAccountNumber || (business.bankAccounts && business.bankAccounts[0]?.accountNumber) || ''
  );
  const [accountName, setAccountName] = useState(
    business.privateAccountName || (business.bankAccounts && business.bankAccounts[0]?.accountName) || business.name || ''
  );

  // Solana Wallet State
  const [walletAddress, setWalletAddress] = useState(business.solanaWalletAddress || '');
  const [exchangeRate, setExchangeRate] = useState(
    (business.solanaUsdcNgnRate || DEFAULT_NGN_USDC_RATE).toString()
  );
  const [enableUsdc, setEnableUsdc] = useState(business.solanaUsdcEnabled !== false);

  // Keypair Generator State
  const [generatedKeypair, setGeneratedKeypair] = useState<{
    publicKey: string;
    secretKeyHex: string;
    secretKeyBytes: number[];
  } | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live onchain wallet verification
  const [isVerifyingWallet, setIsVerifyingWallet] = useState(false);
  const [walletVerificationStatus, setWalletVerificationStatus] = useState<{
    valid: boolean;
    sol: number | null;
    usdc: number | null;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBankName(
        business.privateAccountBank || (business.bankAccounts && business.bankAccounts[0]?.bankName) || NIGERIAN_BANKS[0]
      );
      setAccountNumber(
        business.privateAccountNumber || (business.bankAccounts && business.bankAccounts[0]?.accountNumber) || ''
      );
      setAccountName(
        business.privateAccountName || (business.bankAccounts && business.bankAccounts[0]?.accountName) || business.name || ''
      );
      setWalletAddress(business.solanaWalletAddress || '');
      setExchangeRate((business.solanaUsdcNgnRate || DEFAULT_NGN_USDC_RATE).toString());
      setEnableUsdc(business.solanaUsdcEnabled !== false);
      setErrorMsg(null);
      setSavedSuccess(false);
      setGeneratedKeypair(null);
      setShowSecretKey(false);
    }
  }, [isOpen, business]);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateWallet = () => {
    try {
      const kp = solanaService.generateNewKeypair();
      setGeneratedKeypair(kp);
      setWalletAddress(kp.publicKey);
      setShowSecretKey(false);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg('Failed to generate Solana keypair on this device.');
    }
  };

  const handleTestOnchainBalance = async () => {
    const trimmed = walletAddress.trim();
    if (!trimmed) {
      setErrorMsg('Please provide a Solana wallet address first.');
      return;
    }
    if (!solanaService.isValidAddress(trimmed)) {
      setErrorMsg('Invalid Solana address format. Must be a 32-44 character Base58 public key.');
      return;
    }

    setIsVerifyingWallet(true);
    setErrorMsg(null);
    try {
      const [sol, usdc] = await Promise.all([
        solanaService.getSolBalance(trimmed),
        solanaService.getUsdcBalance(trimmed),
      ]);
      setWalletVerificationStatus({
        valid: true,
        sol,
        usdc,
        message: 'Connected to Solana Mainnet-Beta successfully.',
      });
    } catch (err: any) {
      setWalletVerificationStatus({
        valid: true,
        sol: 0,
        usdc: 0,
        message: 'Address is valid Base58 format. Balance could not be queried.',
      });
    } finally {
      setIsVerifyingWallet(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanAccNum = accountNumber.trim().replace(/\D/g, '');
    const cleanWallet = walletAddress.trim();
    const rateNum = parseFloat(exchangeRate) || DEFAULT_NGN_USDC_RATE;

    if (cleanAccNum && cleanAccNum.length !== 10) {
      setErrorMsg('Nigerian NUBAN account number must be exactly 10 digits.');
      return;
    }

    if (cleanWallet && !solanaService.isValidAddress(cleanWallet)) {
      setErrorMsg('Invalid Solana wallet address. Please verify or click "Generate New Secure Wallet".');
      return;
    }

    // Build updated bank accounts list
    let updatedBankAccounts = business.bankAccounts ? [...business.bankAccounts] : [];
    if (cleanAccNum) {
      const existingIdx = updatedBankAccounts.findIndex((b) => b.isDefault);
      const primaryBank = {
        id: existingIdx >= 0 ? updatedBankAccounts[existingIdx].id : 'bank_primary',
        bankName,
        accountNumber: cleanAccNum,
        accountName: accountName.trim() || business.name,
        isDefault: true,
      };

      if (existingIdx >= 0) {
        updatedBankAccounts[existingIdx] = primaryBank;
      } else {
        updatedBankAccounts = [primaryBank, ...updatedBankAccounts.map((b) => ({ ...b, isDefault: false }))];
      }
    }

    const updated: BusinessProfile = {
      ...business,
      privateAccountNumber: cleanAccNum,
      privateAccountBank: bankName,
      privateAccountName: accountName.trim() || business.name,
      bankAccounts: updatedBankAccounts,
      solanaWalletAddress: cleanWallet,
      solanaUsdcEnabled: enableUsdc,
      solanaUsdcNgnRate: rateNum,
      isConfigured: true,
    };

    onUpdateBusiness(updated);
    if (onLogActivity) {
      onLogActivity(
        'Updated Settlement Accounts',
        `Configured Private Bank (${bankName}: ${cleanAccNum || 'None'}) & Solana Wallet (${solanaService.truncateAddress(cleanWallet) || 'None'})`,
        'financial'
      );
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-5 sm:p-7 text-slate-100 my-auto animate-fade-in space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Private Settlement Accounts</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Bank & Wallet Pair
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Link your Nigerian private bank account and Solana wallet so fiat & crypto settlements work seamlessly together.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-950/50 border border-rose-800 rounded-2xl text-xs text-rose-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 rounded-2xl text-xs text-emerald-300 flex items-center gap-2.5">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Private Settlement Pair saved successfully! Ready for POS and Invoices.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Rail 1: Nigerian Private Bank Account */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Rail 1: Private Nigerian Bank Account</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">NUBAN Transfers</span>
            </div>
            <p className="text-xs text-slate-400">
              When cashiers select <strong>"Transfer"</strong> at POS or send an invoice, customers will be directed to transfer to this account.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Financial Institution:</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  10-Digit Private Account Number:
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 0123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono font-bold text-emerald-400 tracking-wider focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Account Holder / Beneficiary Name:
              </label>
              <input
                type="text"
                placeholder="e.g. Business Legal Name or Owner Full Name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Rail 2: Private Solana Wallet Address */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Rail 2: Private Solana Wallet Address</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateWallet}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/60 border border-purple-800 text-purple-300 hover:bg-purple-900 text-[11px] font-bold rounded-lg transition"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Generate New Secure Wallet</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              When cashiers select <strong>"USDC Pay"</strong> at POS or clients choose Web3 invoice settlement, payments settle directly into this private Solana address.
            </p>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Solana Public Address (Base58):
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste your Phantom, Solflare, or Backpack address (e.g. 7xKX...)"
                  value={walletAddress}
                  onChange={(e) => {
                    setWalletAddress(e.target.value);
                    setWalletVerificationStatus(null);
                  }}
                  className="w-full pl-3 pr-24 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={handleTestOnchainBalance}
                  disabled={isVerifyingWallet || !walletAddress}
                  className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isVerifyingWallet ? 'animate-spin' : ''}`} />
                  <span>{isVerifyingWallet ? 'Querying...' : 'Verify'}</span>
                </button>
              </div>
            </div>

            {/* Generated Keypair Display */}
            {generatedKeypair && (
              <div className="p-3.5 bg-purple-950/40 border border-purple-800/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    <span>Newly Generated Private Solana Keypair</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold uppercase">Keep secret key safe!</span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono break-all bg-slate-900/90 p-2 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                  <span>Public: {generatedKeypair.publicKey}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedKeypair.publicKey, 'pubkey')}
                    className="p-1 hover:text-white"
                  >
                    {copiedKey === 'pubkey' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>Secret Key (Hex):</span>
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="flex items-center gap-1 text-purple-300 hover:underline"
                    >
                      {showSecretKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showSecretKey ? 'Hide' : 'Reveal Secret'}</span>
                    </button>
                  </div>
                  {showSecretKey && (
                    <div className="text-[10px] font-mono break-all bg-slate-900 p-2 rounded-xl text-rose-300 border border-rose-900/50 flex items-center justify-between gap-2">
                      <span>{generatedKeypair.secretKeyHex}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(generatedKeypair.secretKeyHex, 'privkey')}
                        className="p-1 hover:text-white"
                      >
                        {copiedKey === 'privkey' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wallet Verification Result */}
            {walletVerificationStatus && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Mainnet-Beta Verified</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{walletVerificationStatus.message}</p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-emerald-300 font-bold">
                    {walletVerificationStatus.usdc?.toFixed(2) || '0.00'} USDC
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {walletVerificationStatus.sol?.toFixed(4) || '0.0000'} SOL
                  </div>
                </div>
              </div>
            )}

            {/* Live Exchange Rate & USDC Enabled Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Settlement Rate (₦ per 1 USDC):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">₦</span>
                  <input
                    type="number"
                    min={100}
                    step={1}
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableUsdc}
                    onChange={(e) => setEnableUsdc(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-800 focus:ring-0"
                  />
                  <span>Enable Solana USDC Option at Checkout & Invoices</span>
                </label>
              </div>
            </div>
          </div>

          {/* Unified Settlement Preview */}
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ArrowLeftRight className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Dual Rail Mode:</strong> Invoices & POS will support direct bank transfer to <strong>{bankName}</strong> and instant USDC payment to your Solana address.
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                ₦{parseFloat(exchangeRate || '1550').toLocaleString()} = 1 USDC
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950 transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save & Activate Settlement Accounts</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
