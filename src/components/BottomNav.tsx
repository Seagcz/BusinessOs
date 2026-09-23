import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BookOpen,
  Receipt,
  FileText,
  BarChart3,
  ShieldCheck,
  MoreHorizontal,
  X,
  ChevronRight,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { NavigationTab, StaffUser } from '../types';

interface BottomNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  currentStaff?: StaffUser;
  unreadNotificationCount?: number;
  cartCount?: number;
  overdueDebtCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  cartCount = 0,
  overdueDebtCount = 0,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const primaryTabs = [
    { id: 'dashboard' as NavigationTab, label: 'Home', icon: LayoutDashboard },
    { id: 'pos' as NavigationTab, label: 'POS', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : null },
    { id: 'inventory' as NavigationTab, label: 'Stock', icon: Package },
    { id: 'debts' as NavigationTab, label: 'Debts', icon: BookOpen, badge: overdueDebtCount > 0 ? overdueDebtCount : null, badgeColor: 'bg-rose-500 text-white' },
  ];

  const moreTabs: { id: NavigationTab; label: string; description: string; icon: React.FC<{ className?: string }>; badge?: number | string | null; badgeColor?: string }[] = [
    { id: 'invoices', label: 'Invoices & Quotes', description: 'Create, share & track client invoices', icon: FileText },
    { id: 'payments', label: 'Payments & Reconcile', description: 'Bank, cash, POS & Solana payments with auto-reconcile', icon: CreditCard, badge: 'Unified', badgeColor: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' },
    { id: 'blockchain', label: 'Solana Wallet', description: 'On-chain USDC payments, records & explorer', icon: ShieldCheck, badge: 'Mainnet', badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold' },
    { id: 'expenses', label: 'Operating Expenses', description: 'Fuel, electricity, logistics & salaries', icon: Receipt },
    { id: 'reports', label: 'Reports & P&L', description: 'Daily summary, profit analytics & Z-reports', icon: BarChart3 },
    { id: 'admin', label: 'Admin & Settings', description: 'Staff, roles, backup & store profile', icon: ShieldCheck, badge: 'Pro', badgeColor: 'bg-amber-400 text-slate-950 font-black' },
  ];

  const isMoreActive = moreTabs.some((t) => t.id === activeTab);

  const handleSelectTab = (tab: NavigationTab) => {
    onSelectTab(tab);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* "More" Bottom Sheet Modal */}
      {isMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setIsMoreOpen(false)}
            aria-label="Close menu"
          />
          <div className="relative bg-slate-900 border-t border-slate-700/80 rounded-t-3xl p-4 sm:p-5 shadow-2xl z-50 animate-in slide-in-from-bottom duration-200 safe-area-pb">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                  More Business Tools
                </h3>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-3">
              {moreTabs.map((t) => {
                const Icon = t.icon;
                const isCurrent = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    id={`more-menu-tab-${t.id}`}
                    onClick={() => handleSelectTab(t.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-left cursor-pointer active:scale-98 min-h-[52px] ${
                      isCurrent
                        ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                        : 'bg-slate-800/70 border-slate-700/60 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isCurrent
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-700/80 text-slate-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-100 truncate block">
                            {t.label}
                          </span>
                          {t.badge && (
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                t.badgeColor || 'bg-emerald-500 text-slate-950'
                              }`}
                            >
                              {t.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {t.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Sticky Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0F172A]/95 backdrop-blur-md border-t border-slate-800 safe-area-pb">
        <div className="max-w-md mx-auto flex items-center justify-around px-1 py-1.5">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => handleSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition active:scale-95 flex-1 min-h-[46px] cursor-pointer ${
                  isActive
                    ? 'text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-emerald-400' : ''}`} />
                  {tab.badge && (
                    <span
                      className={`absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
                        tab.badgeColor || 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 truncate max-w-[50px] leading-tight">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
                )}
              </button>
            );
          })}

          {/* More Action Tab */}
          <button
            id="nav-tab-more"
            onClick={() => setIsMoreOpen(true)}
            className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition active:scale-95 flex-1 min-h-[46px] cursor-pointer ${
              isMoreActive || isMoreOpen
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <MoreHorizontal className={`w-5 h-5 transition-transform ${isMoreActive ? 'scale-110 text-emerald-400' : ''}`} />
              {isMoreActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </div>
            <span className="text-[10px] mt-1 truncate max-w-[50px] leading-tight">
              {isMoreActive ? 'Tools' : 'More'}
            </span>
            {isMoreActive && (
              <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};

