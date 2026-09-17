import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Check,
  TrendingUp,
  Package,
  Users,
  Receipt,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { storageService } from '../../services/storage';
import { BusinessProfile } from '../../types';

interface AdminDataExportSectionProps {
  business: BusinessProfile;
  salesCount: number;
  productsCount: number;
  customersCount: number;
  expensesCount: number;
  invoicesCount: number;
  auditLogsCount: number;
  onLogActivity?: (action: string, details: string, entityType: 'export') => void;
}

export const AdminDataExportSection: React.FC<AdminDataExportSectionProps> = ({
  business,
  salesCount,
  productsCount,
  customersCount,
  expensesCount,
  invoicesCount,
  auditLogsCount,
  onLogActivity,
}) => {
  const [downloadedExport, setDownloadedExport] = useState<string | null>(null);

  const triggerExport = (
    type: 'sales' | 'products' | 'customers' | 'expenses' | 'invoices' | 'audit_logs',
    title: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const cleanBiz = business.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

    let csvContent = '';
    let fileName = '';

    switch (type) {
      case 'sales':
        csvContent = storageService.exportSalesCSV(business.id);
        fileName = `${cleanBiz}_Sales_Transactions_${today}.csv`;
        break;
      case 'products':
        csvContent = storageService.exportProductsCSV(business.id);
        fileName = `${cleanBiz}_Inventory_Catalog_${today}.csv`;
        break;
      case 'customers':
        csvContent = storageService.exportCustomersCSV(business.id);
        fileName = `${cleanBiz}_Customers_Debts_Ledger_${today}.csv`;
        break;
      case 'expenses':
        csvContent = storageService.exportExpensesCSV(business.id);
        fileName = `${cleanBiz}_Operating_Expenses_${today}.csv`;
        break;
      case 'invoices':
        csvContent = storageService.exportInvoicesCSV(business.id);
        fileName = `${cleanBiz}_Invoices_Quotations_${today}.csv`;
        break;
      case 'audit_logs':
        csvContent = storageService.exportAuditLogsCSV();
        fileName = `${cleanBiz}_System_Audit_Logs_${today}.csv`;
        break;
    }

    storageService.downloadCSVFile(csvContent, fileName);

    if (onLogActivity) {
      onLogActivity('Exported CSV Data', `Exported ${title} to ${fileName}`, 'export');
    }

    setDownloadedExport(type);
    setTimeout(() => setDownloadedExport(null), 3000);
  };

  const EXPORT_ITEMS = [
    {
      id: 'sales' as const,
      title: 'Sales & POS Transactions',
      description:
        'All sales tickets with items, payment methods (Cash, Transfer, POS, Split), gross total, profit and cashier name.',
      count: salesCount,
      unit: 'transactions',
      icon: TrendingUp,
      color: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
    },
    {
      id: 'products' as const,
      title: 'Inventory & Product Catalog',
      description:
        'Full stock list with Cost Prices, Selling Prices, Gross Margin %, Stock Quantity, SKU and Total Valuation.',
      count: productsCount,
      unit: 'products',
      icon: Package,
      color: 'text-sky-400 bg-sky-950/80 border-sky-800',
    },
    {
      id: 'customers' as const,
      title: 'Customers & Debt Ledger',
      description:
        'Customer directories with total purchases, outstanding credit balances, phone numbers, and debt status.',
      count: customersCount,
      unit: 'customers',
      icon: Users,
      color: 'text-purple-400 bg-purple-950/80 border-purple-800',
    },
    {
      id: 'expenses' as const,
      title: 'Operating Expenses Log',
      description:
        'Daily operational expenditure breakdown with category, payee, amount (₦), notes, and recording staff member.',
      count: expensesCount,
      unit: 'records',
      icon: Receipt,
      color: 'text-amber-400 bg-amber-950/80 border-amber-800',
    },
    {
      id: 'invoices' as const,
      title: 'Invoices & Quotations',
      description:
        'Official customer invoices, billing numbers, status (Paid/Pending/Overdue), issue dates, and amounts.',
      count: invoicesCount,
      unit: 'invoices',
      icon: FileText,
      color: 'text-indigo-400 bg-indigo-950/80 border-indigo-800',
    },
    {
      id: 'audit_logs' as const,
      title: 'Activity Logs & Audit Trail',
      description:
        'Time-stamped audit logs of staff logins, price adjustments, voids, expenses, backup operations, and settings changes.',
      count: auditLogsCount,
      unit: 'log entries',
      icon: Clock,
      color: 'text-rose-400 bg-rose-950/80 border-rose-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <span>Data Export Center (Excel & CSV)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Download clean, UTF-8 formatted CSV spreadsheets compatible with Microsoft Excel, Google Sheets, and accounting software.
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Excel UTF-8 BOM Enabled</span>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          All financial figures and Nigerian Naira (₦) currency strings are cleanly formatted with standard decimal formatting for direct formula calculation in spreadsheets.
        </p>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORT_ITEMS.map((item) => {
          const Icon = item.icon;
          const isJustDownloaded = downloadedExport === item.id;

          return (
            <div
              key={item.id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className={`p-3 rounded-2xl border ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-950 text-slate-300 border border-slate-800">
                    {item.count} {item.unit}
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="font-bold text-sm text-slate-100">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => triggerExport(item.id, item.title)}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md ${
                    isJustDownloaded
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                  }`}
                >
                  {isJustDownloaded ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Downloaded Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Export CSV to Excel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
