import React from 'react';
import { Wifi, WifiOff, Bell, UserCheck, RefreshCw, Store, Plus, Sparkles, Layers } from 'lucide-react';
import { BusinessProfile, StaffUser, AppNotification, NavigationTab } from '../types';

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
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left Side: Mobile Logo & Title / Desktop Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-slate-950 shadow-md">
              ₦
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-100 leading-none">NaijaBiz OS</h1>
              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{business.name}</p>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span className="text-slate-300 font-semibold">{business.name}</span>
              <span>/</span>
              <span className="capitalize font-bold text-slate-100 tracking-wide">
                {activeTab === 'pos' ? 'Sales & POS Register' : activeTab === 'debts' ? 'Customer Debts' : activeTab}
              </span>
            </div>
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
