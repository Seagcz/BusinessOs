import React from 'react';
import { Wifi, WifiOff, Bell, UserCheck, RefreshCw, Store, Plus, Sparkles, Layers, LogOut, Wallet, Mail } from 'lucide-react';
import { BusinessProfile, StaffUser, AppNotification, NavigationTab, AuthenticatedUser } from '../types';
import { BusinessOSLogo } from './BusinessOSLogo';

interface NavbarProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenAuthModal: () => void;
  onOpenNotifications: () => void;
  unreadNotificationCount: number;
  isOnline: boolean;
  onOpenBusinessModal?: () => void;
  onOpenSyncModal?: () => void;
  pendingSyncCount?: number;
  isSyncing?: boolean;
  authenticatedUser?: AuthenticatedUser | null;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  business,
  currentStaff,
  activeTab,
  onSelectTab,
  onOpenAuthModal,
  onOpenNotifications,
  unreadNotificationCount,
  isOnline,
  onOpenBusinessModal,
  onOpenSyncModal,
  pendingSyncCount = 0,
  isSyncing = false,
  authenticatedUser,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left Side: Mobile Logo & Title / Desktop Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="lg:hidden flex items-center gap-2">
            <BusinessOSLogo variant="header" size="sm" showSubtitle={false} />
            <span className="text-slate-700">|</span>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[110px]">{business.name}</p>
          </div>

          <div className="hidden lg:flex items-center gap-2.5 text-xs text-slate-400 font-medium">
            <BusinessOSLogo variant="icon" size="sm" />
            <span className="text-slate-300 font-semibold">{business.name}</span>
            <span>/</span>
            <span className="capitalize font-bold text-slate-100 tracking-wide">
              {activeTab === 'pos' ? 'Sales & POS Register' : activeTab === 'debts' ? 'Customer Debts' : activeTab}
            </span>
          </div>
        </div>

        {/* Right Side: Network Sync Badge, Notifications, Staff & Quick Action */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Offline Sync Ready Button / Status Pill */}
          <button
            id="btn-nav-sync-status"
            onClick={onOpenSyncModal}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 border transition cursor-pointer active:scale-95 ${
              !isOnline
                ? 'bg-amber-950/80 text-amber-300 border-amber-800 shadow-sm animate-pulse'
                : pendingSyncCount > 0
                ? 'bg-sky-950/80 text-sky-300 border-sky-800'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
            }`}
            title="Open Offline Sync & Network Manager"
          >
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />
            ) : !isOnline ? (
              <WifiOff className="w-3 h-3 text-amber-400" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            <span className="hidden xs:inline">
              {isSyncing
                ? 'Syncing...'
                : !isOnline
                ? 'Offline Mode'
                : pendingSyncCount > 0
                ? `${pendingSyncCount} Pending`
                : 'Offline-Ready'}
            </span>
            <span className="xs:hidden">
              {isSyncing ? 'Sync...' : !isOnline ? 'Offline' : 'Online'}
            </span>
          </button>

          {/* Quick "+ New Sale" Button */}
          {activeTab !== 'pos' && (
            <button
              id="btn-nav-new-sale"
              onClick={() => onSelectTab('pos')}
              className="hidden sm:flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" />
              <span>New Sale +</span>
            </button>
          )}

          {/* Notifications Bell */}
          <button
            id="btn-notifications-toggle"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition active:scale-95 cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Authenticated User Badge & Sign Out */}
          {authenticatedUser && (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
              <div
                className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-slate-800/80 border border-slate-700/80 rounded-xl"
                title={`Signed in with ${authenticatedUser.provider.toUpperCase()} (${authenticatedUser.email || authenticatedUser.walletAddress || authenticatedUser.name})`}
              >
                {authenticatedUser.provider === 'google' ? (
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                ) : authenticatedUser.provider === 'wallet' ? (
                  <div className="w-5 h-5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 flex items-center justify-center shrink-0">
                    <Wallet className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 flex items-center justify-center shrink-0">
                    <Mail className="w-3 h-3" />
                  </div>
                )}
                <div className="overflow-hidden max-w-[120px] text-left">
                  <p className="text-[11px] font-bold text-slate-200 truncate leading-tight">
                    {authenticatedUser.name}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono truncate capitalize">
                    {authenticatedUser.provider}
                  </p>
                </div>
              </div>

              {onSignOut && (
                <button
                  type="button"
                  id="btn-nav-sign-out"
                  onClick={onSignOut}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 border border-slate-700 text-slate-300 transition active:scale-95 cursor-pointer"
                  title="Sign Out of SmallBusinessOS"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Mobile Staff PIN Switcher */}
          <div className="lg:hidden">
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 p-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer"
              title="Switch Staff"
            >
              <div
                className={`w-6 h-6 rounded-lg ${currentStaff.avatarColor || 'bg-emerald-600'} text-white text-xs font-bold flex items-center justify-center`}
              >
                {currentStaff.name.charAt(0)}
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
