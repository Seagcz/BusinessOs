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
} from 'lucide-react';
import { BusinessProfile, StaffUser, NavigationTab } from '../types';
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
