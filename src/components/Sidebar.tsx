import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BookOpen,
  Receipt,
  FileText,
  BarChart3,
  ShieldCheck,
  Zap,
  Store,
  ChevronRight,
  LogOut,
  Wallet,
  Mail,
} from 'lucide-react';
import { BusinessProfile, StaffUser, NavigationTab, AuthenticatedUser } from '../types';
import { BusinessOSLogo } from './BusinessOSLogo';

interface SidebarProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenAuthModal: () => void;
  onOpenBusinessModal?: () => void;
  cartCount?: number;
  overdueDebtCount?: number;
  unreadNotificationCount?: number;
  authenticatedUser?: AuthenticatedUser | null;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  business,
  currentStaff,
  activeTab,
  onSelectTab,
  onOpenAuthModal,
  onOpenBusinessModal,
  cartCount = 0,
  overdueDebtCount = 0,
  unreadNotificationCount = 0,
  authenticatedUser,
  onSignOut,
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; badge?: number | string | null; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Sales & POS', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : null },
    { id: 'inventory', label: 'Inventory & Stock', icon: Package },
    { id: 'debts', label: 'Customers & Debts', icon: BookOpen, badge: overdueDebtCount > 0 ? `${overdueDebtCount} Due` : null, badgeColor: 'bg-rose-500 text-white' },
    { id: 'expenses', label: 'Operating Expenses', icon: Receipt },
    { id: 'invoices', label: 'Invoices & Quotes', icon: FileText },
    { id: 'blockchain', label: 'Solana & USDC', icon: ShieldCheck, badge: 'Mainnet', badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold' },
    { id: 'reports', label: 'Reports & P&L', icon: BarChart3 },
  ];

  return (
    <aside className="hidden lg:flex w-64 bg-[#0F172A] text-white flex-col flex-shrink-0 min-h-screen sticky top-0 border-r border-slate-800 z-20">
      {/* Brand Header */}
      <div className="p-6 pb-4">
        <div className="mb-6">
          <BusinessOSLogo variant="header" size="md" showSubtitle={true} />
        </div>

        {/* Navigation Items */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer text-left ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Admin & Quick Link Section */}
      <div className="px-6 py-2">
        <div className="pt-2 border-t border-white/10">
          <button
            id="sidebar-tab-admin"
            onClick={() => onSelectTab('admin')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer text-left ${
              activeTab === 'admin'
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                : 'text-amber-400 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Admin Control</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      </div>

      {/* Footer Store & Staff Info */}
      <div className="mt-auto p-6 border-t border-white/10 space-y-3">
        {/* Active Store Card */}
        <button
          onClick={onOpenBusinessModal}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition text-left group"
          title="Switch Store"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-sm flex-shrink-0 border border-emerald-500/30">
            {business.logoEmoji || '🏬'}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <p className="text-xs font-semibold truncate text-slate-200 group-hover:text-white">
              {business.name}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {business.city}, {business.state} • Pro
            </p>
          </div>
        </button>

        {/* Authenticated Account Card & Sign Out */}
        {authenticatedUser && (
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              {authenticatedUser.provider === 'google' ? (
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
              ) : authenticatedUser.provider === 'wallet' ? (
                <div className="w-6 h-6 rounded-full bg-purple-950 border border-purple-700 text-purple-300 flex items-center justify-center shrink-0">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{authenticatedUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {authenticatedUser.email || (authenticatedUser.walletAddress ? `${authenticatedUser.walletAddress.slice(0, 6)}...` : authenticatedUser.provider)}
                </p>
              </div>
            </div>

            {onSignOut && (
              <button
                type="button"
                id="sidebar-sign-out-btn"
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Current Staff Switcher */}
        <button
          onClick={onOpenAuthModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition text-left"
          title="Switch Staff PIN"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={`w-6 h-6 rounded-md ${currentStaff.avatarColor || 'bg-emerald-600'} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
              {currentStaff.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{currentStaff.name}</p>
              <p className="text-[9px] text-emerald-400 capitalize truncate">{currentStaff.role}</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            PIN
          </span>
        </button>
      </div>
    </aside>
  );
};
