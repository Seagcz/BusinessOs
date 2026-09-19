import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  DollarSign,
  Percent,
  Calendar,
  Wallet,
  ShieldCheck,
  Copy,
  X,
  Zap,
  Building2,
} from 'lucide-react';
import { BusinessProfile, BankAccount } from '../../types';
import { NIGERIAN_BANKS } from '../../services/nigerianData';
import { PrivateSettlementModal } from '../PrivateSettlementModal';

interface AdminFinancialSectionProps {
  business: BusinessProfile;
  onUpdateBusiness: (updated: BusinessProfile) => void;
  onLogActivity?: (action: string, details: string, entityType: 'financial') => void;
}

export const AdminFinancialSection: React.FC<AdminFinancialSectionProps> = ({
  business,
  onUpdateBusiness,
  onLogActivity,
}) => {
  // Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(business.bankAccounts || []);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [formBankName, setFormBankName] = useState(NIGERIAN_BANKS[0]);
  const [formAccountNum, setFormAccountNum] = useState('');
  const [formAccountName, setFormAccountName] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);
  const [isPrivateSettlementModalOpen, setIsPrivateSettlementModalOpen] = useState(false);

  // Financial Rules State
  const [taxRate, setTaxRate] = useState<number>(business.taxRate || 0);
  const [taxInclusive, setTaxInclusive] = useState<boolean>(business.taxInclusive || false);
  const [enableTax, setEnableTax] = useState<boolean>((business.taxRate || 0) > 0);
  const [defaultDiscount, setDefaultDiscount] = useState<number>(business.defaultDiscount || 0);
  const [creditGracePeriodDays, setCreditGracePeriodDays] = useState<number>(business.creditGracePeriodDays || 14);
  const [startingCashFloat, setStartingCashFloat] = useState<number>(business.startingCashFloat || 10000);
  const [currencySymbol, setCurrencySymbol] = useState(business.currencySymbol || '₦');
  const [currencyCode, setCurrencyCode] = useState(business.currencyCode || 'NGN');
  const [showCurrencySymbol, setShowCurrencySymbol] = useState(business.showCurrencySymbol !== false);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Bank Handlers
  const handleOpenAddBank = () => {
    setEditingBank(null);
    setFormBankName(NIGERIAN_BANKS[0]);
    setFormAccountNum('');
    setFormAccountName(business.name);
    setFormIsDefault(bankAccounts.length === 0);
    setIsBankModalOpen(true);
  };

  const handleOpenEditBank = (b: BankAccount) => {
    setEditingBank(b);
    setFormBankName(b.bankName);
    setFormAccountNum(b.accountNumber);
    setFormAccountName(b.accountName);
    setFormIsDefault(b.isDefault);
    setIsBankModalOpen(true);
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAccountNum.trim() || !formAccountName.trim()) {
      alert('Please fill account number and account name.');
      return;
    }

    let updatedList = [...bankAccounts];
    if (editingBank) {
      updatedList = updatedList.map((b) =>
        b.id === editingBank.id
          ? {
              ...b,
              bankName: formBankName,
              accountNumber: formAccountNum.trim(),
              accountName: formAccountName.trim(),
              isDefault: formIsDefault,
            }
          : formIsDefault
          ? { ...b, isDefault: false }
          : b
      );
    } else {
      if (formIsDefault) {
        updatedList = updatedList.map((b) => ({ ...b, isDefault: false }));
      }
      updatedList.push({
        id: 'bank_' + Date.now(),
        bankName: formBankName,
        accountNumber: formAccountNum.trim(),
        accountName: formAccountName.trim(),
        isDefault: formIsDefault || bankAccounts.length === 0,
      });
    }

    setBankAccounts(updatedList);
    const updatedBiz = { ...business, bankAccounts: updatedList };
    onUpdateBusiness(updatedBiz);
    if (onLogActivity) {
      onLogActivity(
        editingBank ? 'Updated Bank Account' : 'Added Settlement Bank Account',
        `${formBankName} - ${formAccountNum} (${formAccountName})`,
        'financial'
      );
    }
    setIsBankModalOpen(false);
  };

  const handleDeleteBank = (id: string) => {
    const updated = bankAccounts.filter((b) => b.id !== id);
    setBankAccounts(updated);
    onUpdateBusiness({ ...business, bankAccounts: updated });
    if (onLogActivity) {
      onLogActivity('Removed Settlement Bank Account', `Bank Account ID: ${id}`, 'financial');
    }
  };

  const handleCopyAccount = (accountNum: string, id: string) => {
    navigator.clipboard.writeText(accountNum);
    setCopiedBankId(id);
    setTimeout(() => setCopiedBankId(null), 2000);
  };

  // Save Financial Rules
  const handleSaveFinancialRules = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BusinessProfile = {
      ...business,
      taxRate: enableTax ? Number(taxRate) : 0,
      taxInclusive: enableTax ? taxInclusive : false,
      defaultDiscount: Number(defaultDiscount) || 0,
      creditGracePeriodDays: Number(creditGracePeriodDays) || 14,
      startingCashFloat: Number(startingCashFloat) || 0,
      currencySymbol: currencySymbol.trim() || '₦',
      currencyCode: currencyCode.trim() || 'NGN',
      showCurrencySymbol,
      bankAccounts,
    };

    onUpdateBusiness(updated);
    if (onLogActivity) {
      onLogActivity(
        'Updated Financial & Tax Settings',
        `VAT Rate: ${enableTax ? taxRate + '%' : 'Disabled'}, Credit Grace: ${creditGracePeriodDays} days, Drawer Float: ₦${startingCashFloat.toLocaleString()}`,
        'financial'
      );
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 0. Private Account & Solana Settlement Engine */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3 text-purple-400" />
                Dual-Channel Settlement
              </span>
              <span className="text-xs text-slate-400 font-mono">Bank + Web3 Linked</span>
            </div>
            <h3 className="font-bold text-lg text-white">Private Account & Solana Wallet Integration</h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Connect your store's private settlement bank account number and Solana wallet address to work in synergy for point-of-sale checkouts, debt recovery, and instant crypto settlements.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsPrivateSettlementModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
          >
            <Wallet className="w-4 h-4" />
            <span>Configure Private Accounts</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Private Bank Account */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Private Bank Account Number</span>
              </span>
              {business.privateAccountNumber ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  Active
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                  Unconfigured
                </span>
              )}
            </div>

            {business.privateAccountNumber ? (
              <div className="space-y-1">
                <p className="text-lg font-black font-mono text-emerald-400 tracking-wider">
                  {business.privateAccountNumber}
                </p>
                <p className="text-xs text-slate-300 font-medium">
                  {business.privateBankName || 'Bank Not Specified'} • <span className="uppercase text-slate-400">{business.privateAccountName || business.name}</span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No private account number configured. Tap "Configure Private Accounts" to set up.
              </p>
            )}
          </div>

          {/* Private Solana Wallet */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-purple-400" />
                <span>Solana Wallet (Mainnet-Beta)</span>
              </span>
              {business.solanaWalletAddress ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                  Connected
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                  Unconfigured
                </span>
              )}
            </div>

            {business.solanaWalletAddress ? (
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-slate-200 break-all bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  {business.solanaWalletAddress}
                </p>
                <p className="text-[11px] text-slate-400">
                  Store Exchange Rate: <strong className="text-purple-300">1 USDC = ₦{(business.solanaUsdcNgnRate || 1500).toLocaleString()}</strong>
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No Solana wallet linked. Tap "Configure Private Accounts" to connect Phantom, Solflare, or paste your address.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 1. Settlement Bank Accounts */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <span>Settlement Bank Accounts ({bankAccounts.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              These Nigerian bank accounts are printed on customer receipts, invoices, and payment link reminders.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddBank}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bank Account</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((b) => (
            <div
              key={b.id}
              className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                b.isDefault
                  ? 'bg-slate-950 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/20'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-100">{b.bankName}</span>
                  {b.isDefault && (
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 whitespace-nowrap">
                      Primary
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xl font-black font-mono text-emerald-400 tracking-wider">
                    {b.accountNumber}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(b.accountNumber, b.id)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    title="Copy account number"
                  >
                    {copiedBankId === b.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wide">
                  {b.accountName}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  {b.isDefault ? 'Printed on receipts' : 'Secondary account'}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditBank(b)}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    title="Edit account"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBank(b.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                    title="Delete bank"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Tax, Discounts & Financial Policies Form */}
      <form
        onSubmit={handleSaveFinancialRules}
        className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Tax (VAT), Discounts & Cash Drawer Policies</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Set automated VAT taxation rates, maximum cashier discount caps, credit terms, and cash float limits.
            </p>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Financial Rules Saved!</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Tax / VAT Settings */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-emerald-400" />
                <span>Value Added Tax (VAT / Sales Tax)</span>
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTax}
                  onChange={(e) => setEnableTax(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {enableTax ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    VAT Rate Percentage (%):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs text-slate-400">
                      % (Standard Nigerian VAT is <strong>7.5%</strong>)
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={taxInclusive}
                    onChange={(e) => setTaxInclusive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700"
                  />
                  <span>Product prices already include tax (Tax Inclusive)</span>
                </label>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                VAT calculation is currently turned off for retail checkout receipts.
              </p>
            )}
          </div>

          {/* Cash Drawer Starting Float */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-sky-400" />
              <span>Daily Cash Drawer Starting Float</span>
            </label>
            <p className="text-xs text-slate-400">
              Standard initial cash float provided at morning store opening for giving change.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                {business.currencySymbol || '₦'}
              </span>
              <input
                type="number"
                min={0}
                value={startingCashFloat}
                onChange={(e) => setStartingCashFloat(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Default Credit Due Grace Period */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Customer Credit Term / Due Days</span>
            </label>
            <p className="text-xs text-slate-400">
              Default number of days allowed for customer debt settlement before marked as overdue.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={365}
                value={creditGracePeriodDays}
                onChange={(e) => setCreditGracePeriodDays(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-slate-400">Days (e.g. 7, 14, or 30 days)</span>
            </div>
          </div>

          {/* Cashier Max Discount Cap */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-purple-400" />
              <span>Cashier Max Discount Allowance</span>
            </label>
            <p className="text-xs text-slate-400">
              Maximum percentage discount a cashier can give at POS without supervisor approval.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                value={defaultDiscount}
                onChange={(e) => setDefaultDiscount(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-500"
              />
              <span className="text-xs text-slate-400">% max discount cap</span>
            </div>
          </div>
        </div>

        {/* Currency Display Settings */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-200">Currency & Formatting</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Currency Symbol:</label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Currency Code:</label>
              <input
                type="text"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCurrencySymbol}
                  onChange={(e) => setShowCurrencySymbol(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-800 focus:ring-0"
                />
                <span>Display Currency Symbol on Receipts</span>
              </label>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950 transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Financial Settings</span>
          </button>
        </div>
      </form>

      {/* ADD / EDIT BANK MODAL */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveBank}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">
                  {editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Select Bank / Fintech:</label>
              <select
                value={formBankName}
                onChange={(e) => setFormBankName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
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
                NUBAN Account Number (10 digits) <span className="text-rose-400">*</span>:
              </label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="e.g. 0123456789"
                value={formAccountNum}
                onChange={(e) => setFormAccountNum(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 tracking-wider"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Account Name <span className="text-rose-400">*</span>:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ADE & SONS SUPERSTORES"
                value={formAccountName}
                onChange={(e) => setFormAccountName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500 uppercase"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-800 focus:ring-0"
              />
              <span>Set as primary default account on invoices & receipts</span>
            </label>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-950 active:scale-95"
              >
                Save Bank Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRIVATE SETTLEMENT MODAL (BANK + SOLANA WALLET) */}
      <PrivateSettlementModal
        isOpen={isPrivateSettlementModalOpen}
        onClose={() => setIsPrivateSettlementModalOpen(false)}
        business={business}
        onUpdateBusiness={onUpdateBusiness}
      />
    </div>
  );
};
