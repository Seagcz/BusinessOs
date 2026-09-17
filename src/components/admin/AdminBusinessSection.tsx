import React, { useState } from 'react';
import {
  Building2,
  Store,
  Check,
  Save,
  Plus,
  X,
  MapPin,
  Phone,
  Mail,
  FileText,
  Smile,
  Receipt,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { BusinessProfile } from '../../types';
import { NIGERIAN_STATES } from '../../services/nigerianData';

interface AdminBusinessSectionProps {
  business: BusinessProfile;
  businessesList: BusinessProfile[];
  onUpdateBusiness: (updated: BusinessProfile) => void;
  onSwitchBusiness: (businessId: string) => void;
  onCreateBusiness: (newBiz: BusinessProfile) => void;
  onLogActivity?: (action: string, details: string, entityType: 'business') => void;
}

const EMOJI_PRESETS = ['🏬', '🛒', '🛍️', '🍞', '🥤', '💻', '👗', '💊', '🍲', '🔧', '📦', '🏪'];

export const AdminBusinessSection: React.FC<AdminBusinessSectionProps> = ({
  business,
  businessesList,
  onUpdateBusiness,
  onSwitchBusiness,
  onCreateBusiness,
  onLogActivity,
}) => {
  const [bizName, setBizName] = useState(business.name);
  const [bizTagline, setBizTagline] = useState(business.tagline || '');
  const [bizPhone, setBizPhone] = useState(business.phone);
  const [bizEmail, setBizEmail] = useState(business.email || '');
  const [bizAddress, setBizAddress] = useState(business.address);
  const [bizCity, setBizCity] = useState(business.city);
  const [bizState, setBizState] = useState(business.state);
  const [bizCac, setBizCac] = useState(business.cacNumber || '');
  const [bizTin, setBizTin] = useState(business.tinNumber || '');
  const [bizLogoEmoji, setBizLogoEmoji] = useState(business.logoEmoji || '🏬');
  const [bizFooterMsg, setBizFooterMsg] = useState(
    business.receiptFooterMessage || 'Thank you for your patronage! Goods sold in good condition cannot be returned.'
  );
  const [bizSavedSuccess, setBizSavedSuccess] = useState(false);

  // New Branch Modal
  const [isNewBranchModalOpen, setIsNewBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCategory, setNewBranchCategory] = useState('Retail Supermarket & Provisions');
  const [newBranchState, setNewBranchState] = useState('Lagos');
  const [newBranchAddress, setNewBranchAddress] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BusinessProfile = {
      ...business,
      name: bizName.trim(),
      tagline: bizTagline.trim(),
      phone: bizPhone.trim(),
      email: bizEmail.trim() || undefined,
      address: bizAddress.trim(),
      city: bizCity.trim(),
      state: bizState,
      cacNumber: bizCac.trim() || undefined,
      tinNumber: bizTin.trim() || undefined,
      logoEmoji: bizLogoEmoji,
      receiptFooterMessage: bizFooterMsg.trim(),
    };
    onUpdateBusiness(updated);
    if (onLogActivity) {
      onLogActivity('Updated Store Profile', `Saved changes for business ${updated.name}`, 'business');
    }
    setBizSavedSuccess(true);
    setTimeout(() => setBizSavedSuccess(false), 3000);
  };

  const handleCreateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    const newBiz: BusinessProfile = {
      id: 'biz_' + Date.now(),
      name: newBranchName.trim(),
      tagline: 'Quality Products & Superior Service',
      category: newBranchCategory,
      phone: business.phone,
      address: newBranchAddress.trim() || 'Branch Office',
      city: 'Main City',
      state: newBranchState,
      currencySymbol: business.currencySymbol || '₦',
      currencyCode: business.currencyCode || 'NGN',
      logoEmoji: '🏪',
      bankAccounts: business.bankAccounts ? [...business.bankAccounts] : [],
      taxRate: business.taxRate || 0,
      receiptFooterMessage: business.receiptFooterMessage || 'Thank you for your patronage!',
      createdAt: new Date().toISOString(),
    };

    onCreateBusiness(newBiz);
    if (onLogActivity) {
      onLogActivity('Created Store Branch', `Added new branch: ${newBiz.name} (${newBiz.state})`, 'business');
    }
    setNewBranchName('');
    setNewBranchAddress('');
    setIsNewBranchModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Store Identity Card */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span>Business Profile & Store Identity</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure your store branding, official contact details, CAC/TIN registration, and printed receipt notes.
            </p>
          </div>

          {bizSavedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Changes Saved!</span>
            </div>
          )}
        </div>

        {/* Logo Emoji Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">Store Icon / Logo Emoji:</label>
          <div className="flex flex-wrap items-center gap-2">
            {EMOJI_PRESETS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setBizLogoEmoji(emoji)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition ${
                  bizLogoEmoji === emoji
                    ? 'bg-emerald-600/30 border-2 border-emerald-400 shadow-md scale-110'
                    : 'bg-slate-950 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {emoji}
              </button>
            ))}
            <input
              type="text"
              maxLength={2}
              value={bizLogoEmoji}
              onChange={(e) => setBizLogoEmoji(e.target.value)}
              className="w-12 h-10 bg-slate-950 border border-slate-800 rounded-2xl text-center text-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              title="Custom emoji"
            />
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Registered Business / Store Name <span className="text-rose-400">*</span>:
            </label>
            <input
              type="text"
              required
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Slogan / Tagline:</label>
            <input
              type="text"
              placeholder="e.g. Quality Goods at Wholesales Prices"
              value={bizTagline}
              onChange={(e) => setBizTagline(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Phone / WhatsApp Number <span className="text-rose-400">*</span>:</span>
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 0803 123 4567"
              value={bizPhone}
              onChange={(e) => setBizPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              <span>Official Email Address:</span>
            </label>
            <input
              type="email"
              placeholder="e.g. contact@business.com"
              value={bizEmail}
              onChange={(e) => setBizEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Store Address / Physical Shop Location <span className="text-rose-400">*</span>:</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Shop 14, Trade Fair Complex"
              value={bizAddress}
              onChange={(e) => setBizAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">City / LGA:</label>
              <input
                type="text"
                required
                value={bizCity}
                onChange={(e) => setBizCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">State:</label>
              <select
                value={bizState}
                onChange={(e) => setBizState(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {NIGERIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>CAC / RC Number (Optional):</span>
            </label>
            <input
              type="text"
              placeholder="e.g. RC-1849204 or BN-392019"
              value={bizCac}
              onChange={(e) => setBizCac(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tax Identification Number (TIN):</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 23901928-0001"
              value={bizTin}
              onChange={(e) => setBizTin(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Receipt Customization */}
        <div className="pt-2 border-t border-slate-800/80">
          <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            <span>Printed Receipt Footer Policy / Thank You Note:</span>
          </label>
          <input
            type="text"
            value={bizFooterMsg}
            onChange={(e) => setBizFooterMsg(e.target.value)}
            placeholder="e.g. Thank you for your patronage! Goods sold in good condition cannot be returned."
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950 transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Store Settings</span>
          </button>
        </div>
      </form>

      {/* Multi-Store & Branch Manager */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-sky-400" />
              <span>Multi-Branch & Store Outlets ({businessesList.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage all company branches, retail kiosks, and warehouses under one unified OS.
            </p>
          </div>

          <button
            onClick={() => setIsNewBranchModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Branch</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businessesList.map((b) => {
            const isCurrent = b.id === business.id;
            return (
              <div
                key={b.id}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-slate-950 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{b.logoEmoji || '🏬'}</span>
                      <div>
                        <h4 className="font-bold text-sm text-slate-100">{b.name}</h4>
                        <p className="text-[11px] text-slate-400">{b.category || 'Retail Store'}</p>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 whitespace-nowrap">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    <p className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{b.address}, {b.state}</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{b.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {b.id.substring(0, 8)}
                  </span>
                  {!isCurrent ? (
                    <button
                      onClick={() => onSwitchBusiness(b.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1"
                    >
                      <span>Switch Store</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Current Store
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE BRANCH MODAL */}
      {isNewBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleCreateBranchSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-white">Add New Store Branch</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBranchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Branch / Store Outlet Name <span className="text-rose-400">*</span>:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Adeola Supermarket (Lekki Branch)"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Business Line / Category:</label>
              <input
                type="text"
                value={newBranchCategory}
                onChange={(e) => setNewBranchCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">State:</label>
                <select
                  value={newBranchState}
                  onChange={(e) => setNewBranchState(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Physical Address:</label>
                <input
                  type="text"
                  placeholder="e.g. Admiralty Way, Lekki Phase 1"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-sky-950 active:scale-95"
              >
                Create Branch Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
