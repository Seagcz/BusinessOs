import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  Package,
  CreditCard,
  BellRing,
  FileSpreadsheet,
  Database,
  Clock,
  ArrowLeft,
  Lock,
  KeyRound,
  Store,
  Sparkles,
  AlertCircle,
  LogOut,
  Wallet,
  Mail,
} from 'lucide-react';
import {
  BusinessProfile,
  StaffUser,
  Product,
  Sale,
  DebtRecord,
  Expense,
  Invoice,
  Customer,
  AppNotification,
  AuditLog,
  NavigationTab,
  AuthenticatedUser,
} from '../types';
import { storageService } from '../services/storage';

// Subcomponents
import { AdminBusinessSection } from './admin/AdminBusinessSection';
import { AdminStaffSection } from './admin/AdminStaffSection';
import { AdminProductsSection } from './admin/AdminProductsSection';
import { AdminFinancialSection } from './admin/AdminFinancialSection';
import { AdminNotificationsSection } from './admin/AdminNotificationsSection';
import { AdminDataExportSection } from './admin/AdminDataExportSection';
import { AdminBackupsSection } from './admin/AdminBackupsSection';
import { AdminAuditLogsSection } from './admin/AdminAuditLogsSection';

export type AdminSectionTab =
  | 'business'
  | 'staff'
  | 'products'
  | 'financial'
  | 'notifications'
  | 'export'
  | 'backups'
  | 'audit';

interface AdminViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  staffList: StaffUser[];
  businessesList: BusinessProfile[];
  products?: Product[];
  sales?: Sale[];
  debts?: DebtRecord[];
  expenses?: Expense[];
  invoices?: Invoice[];
  customers?: Customer[];
  notifications?: AppNotification[];
  auditLogs?: AuditLog[];
  onUpdateBusiness: (updated: BusinessProfile) => void;
  onSwitchBusiness: (businessId: string) => void;
  onCreateBusiness: (newBiz: BusinessProfile) => void;
  onSaveStaff: (staff: StaffUser) => void;
  onDeleteStaff: (staffId: string) => void;
  onSaveProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonContent: string) => void;
  onResetDemoData: () => void;
  onNavigateTab?: (tab: NavigationTab) => void;
  onClearNotifications?: () => void;
  onSendTestNotification?: (notif: AppNotification) => void;
  onClearAuditLogs?: () => void;
  onLogActivity?: (action: string, details: string, entityType: any) => void;
  authenticatedUser?: AuthenticatedUser | null;
  onSignOut?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  business,
  currentStaff,
  staffList,
  businessesList,
  products = [],
  sales = [],
  debts = [],
  expenses = [],
  invoices = [],
  customers = [],
  notifications = [],
  auditLogs = [],
  onUpdateBusiness,
  onSwitchBusiness,
  onCreateBusiness,
  onSaveStaff,
  onDeleteStaff,
  onSaveProduct,
  onDeleteProduct,
  onExportBackup,
  onImportBackup,
  onResetDemoData,
  onNavigateTab,
  onClearNotifications,
  onSendTestNotification,
  onClearAuditLogs,
  onLogActivity,
  authenticatedUser,
  onSignOut,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSectionTab>('business');

  // Fallback handlers if not provided by parent
  const handleSaveProductFallback = (prod: Product) => {
    if (onSaveProduct) {
      onSaveProduct(prod);
    } else {
      storageService.saveProduct(prod);
    }
  };

  const handleDeleteProductFallback = (id: string) => {
    if (onDeleteProduct) {
      onDeleteProduct(id);
    } else {
      storageService.deleteProduct(id);
    }
  };

  const handleLogActivityFallback = (action: string, details: string, entityType: any) => {
    if (onLogActivity) {
      onLogActivity(action, details, entityType);
    } else {
      storageService.logActivity(action, details, entityType, currentStaff.name);
    }
  };

  const isAuthorized = currentStaff.role === 'owner' || currentStaff.canEditSettings || currentStaff.role === 'manager';

  const NAV_SECTIONS: {
    id: AdminSectionTab;
    label: string;
    icon: any;
    badge?: number | string;
    description: string;
  }[] = [
    {
      id: 'business',
      label: 'Store Profile & Branches',
      icon: Building2,
      badge: businessesList.length > 1 ? `${businessesList.length} Outlets` : undefined,
      description: 'Store branding, contact info, CAC, TIN and multi-branch management.',
    },
    {
      id: 'staff',
      label: 'Staff, Roles & Permissions',
      icon: Users,
      badge: staffList.length,
      description: 'Cashiers, managers, PINs, role presets and granular access permissions.',
    },
    {
      id: 'products',
      label: 'Products & Pricing Catalog',
      icon: Package,
      badge: products.length,
      description: 'Cost prices, selling prices, markup margins, batch price adjuster.',
    },
    {
      id: 'financial',
      label: 'Financial, Bank & Tax Rules',
      icon: CreditCard,
      badge: business.bankAccounts?.length || 0,
      description: 'Nigerian settlement banks, VAT tax rate, cashier discounts, cash drawer float.',
    },
    {
      id: 'notifications',
      label: 'Notification Rules & Alerts',
      icon: BellRing,
      description: 'Low stock thresholds, overdue debt notices, end-of-day sales digests.',
    },
    {
      id: 'export',
      label: 'Data Export (CSV & Excel)',
      icon: FileSpreadsheet,
      badge: 'Excel',
      description: '1-click export of sales, stock valuation, debts ledger and expenses.',
    },
    {
      id: 'backups',
      label: 'Backups & DB Restore',
      icon: Database,
      description: 'Full database snapshot backup, restore JSON, and storage health.',
    },
    {
      id: 'audit',
      label: 'Activity Logs & Audit Trail',
      icon: Clock,
      badge: auditLogs.length > 0 ? auditLogs.length : undefined,
      description: 'Chronological timeline of system events, cashier sales, voids and settings edits.',
    },
  ];

  // Restricted Access Screen for unauthorized users
  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto shadow-xl">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Administrator Access Restricted</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            You are logged in as <strong>{currentStaff.name}</strong> ({currentStaff.role}). This section contains privileged business configurations, profit margins, and security controls reserved for store owners and managers.
          </p>
        </div>

        <div className="pt-4 flex items-center justify-center gap-3">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('pos')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-950 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to POS Cashier</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SEPARATION OF ADMIN TOP BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center shadow-inner text-2xl shrink-0">
            {business.logoEmoji || '🏢'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white">{business.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Admin Console</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Isolated administrative environment &bull; Logged in as <strong className="text-slate-200">{currentStaff.name}</strong> ({currentStaff.role})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs shadow-inner">
            <img
              src="/logo.jpg"
              alt="Business OS"
              referrerPolicy="no-referrer"
              className="w-5 h-5 rounded-md object-cover"
            />
            <div className="text-left leading-none">
              <span className="text-[11px] font-bold text-white">Business OS</span>
              <p className="text-[9px] text-cyan-400 font-semibold">Solana Onchain</p>
            </div>
          </div>

          {authenticatedUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              {authenticatedUser.provider === 'google' ? (
                <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0">
                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
              ) : authenticatedUser.provider === 'wallet' ? (
                <Wallet className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              ) : (
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <div className="hidden lg:block text-left leading-tight max-w-[120px]">
                <p className="text-[11px] font-bold text-slate-200 truncate">{authenticatedUser.name}</p>
                <p className="text-[9px] text-slate-400 truncate capitalize">{authenticatedUser.provider}</p>
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('pos')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Daily Operations (POS)</span>
            </button>
          )}
        </div>
      </div>

      {/* ADMIN NAVIGATION TABS */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-1.5 shadow-lg overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {NAV_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{sec.label}</span>
                {sec.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                      isActive
                        ? 'bg-emerald-700/80 text-emerald-100'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {sec.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIVE SECTION CONTENT */}
      <div>
        {activeSection === 'business' && (
          <AdminBusinessSection
            business={business}
            businessesList={businessesList}
            onUpdateBusiness={onUpdateBusiness}
            onSwitchBusiness={onSwitchBusiness}
            onCreateBusiness={onCreateBusiness}
            onLogActivity={handleLogActivityFallback}
          />
        )}

        {activeSection === 'staff' && (
          <AdminStaffSection
            currentStaff={currentStaff}
            staffList={staffList}
            businessId={business.id}
            onSaveStaff={onSaveStaff}
            onDeleteStaff={onDeleteStaff}
            onLogActivity={handleLogActivityFallback}
          />
        )}

        {activeSection === 'products' && (
          <AdminProductsSection
            business={business}
            products={products}
            onSaveProduct={handleSaveProductFallback}
            onDeleteProduct={handleDeleteProductFallback}
            onLogActivity={handleLogActivityFallback}
          />
        )}

        {activeSection === 'financial' && (
          <AdminFinancialSection
            business={business}
            onUpdateBusiness={onUpdateBusiness}
            onLogActivity={handleLogActivityFallback}
          />
        )}

        {activeSection === 'notifications' && (
          <AdminNotificationsSection
            business={business}
            notifications={notifications}
            onUpdateBusiness={onUpdateBusiness}
            onClearNotifications={onClearNotifications}
            onSendTestNotification={onSendTestNotification}
            onLogActivity={handleLogActivityFallback}
          />
        )}

        {activeSection === 'export' && (
          <AdminDataExportSection
            business={business}
            salesCount={sales.length}
            productsCount={products.length}
            customersCount={customers.length}
            expensesCount={expenses.length}
            invoicesCount={invoices.length}
            auditLogsCount={auditLogs.length}
            onLogActivity={handleLogActivityFallback}
          />
        )}

        {activeSection === 'backups' && (
          <AdminBackupsSection
            business={business}
            onExportBackup={onExportBackup}
            onImportBackup={onImportBackup}
            onResetDemoData={onResetDemoData}
            onLogActivity={handleLogActivityFallback}
          />
        )}

        {activeSection === 'audit' && (
          <AdminAuditLogsSection
            auditLogs={auditLogs}
            staffList={staffList}
            onClearLogs={onClearAuditLogs}
          />
        )}
      </div>
    </div>
  );
};
