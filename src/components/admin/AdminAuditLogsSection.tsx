import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  Filter,
  Download,
  Trash2,
  User,
  Shield,
  Activity,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Package,
  Receipt,
  Users,
  FileText,
  CreditCard,
  Database,
  Sliders,
} from 'lucide-react';
import { AuditLog, StaffUser } from '../../types';
import { storageService } from '../../services/storage';

interface AdminAuditLogsSectionProps {
  auditLogs: AuditLog[];
  staffList: StaffUser[];
  onClearLogs?: () => void;
}

const ENTITY_CONFIG: Record<
  string,
  { label: string; icon: any; badgeColor: string }
> = {
  sale: {
    label: 'Sales & Orders',
    icon: TrendingUp,
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
  },
  product: {
    label: 'Inventory & Stock',
    icon: Package,
    badgeColor: 'bg-sky-950/80 text-sky-300 border-sky-800',
  },
  debt: {
    label: 'Customer Debts',
    icon: Users,
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-800',
  },
  expense: {
    label: 'Expenses',
    icon: Receipt,
    badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800',
  },
  invoice: {
    label: 'Invoices',
    icon: FileText,
    badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
  },
  staff: {
    label: 'Staff & Auth',
    icon: User,
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-800',
  },
  financial: {
    label: 'Financial & Banks',
    icon: CreditCard,
    badgeColor: 'bg-teal-950/80 text-teal-300 border-teal-800',
  },
  business: {
    label: 'Store Profile',
    icon: Layers,
    badgeColor: 'bg-blue-950/80 text-blue-300 border-blue-800',
  },
  backup: {
    label: 'Backups & DB',
    icon: Database,
    badgeColor: 'bg-orange-950/80 text-orange-300 border-orange-800',
  },
  settings: {
    label: 'Settings',
    icon: Sliders,
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  system: {
    label: 'System Engine',
    icon: Activity,
    badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
  },
};

export const AdminAuditLogsSection: React.FC<AdminAuditLogsSectionProps> = ({
  auditLogs,
  staffList,
  onClearLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.staffName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchEntity = selectedEntity === 'all' || log.entityType === selectedEntity;
      const matchStaff = selectedStaff === 'all' || log.staffName === selectedStaff;

      return matchSearch && matchEntity && matchStaff;
    });
  }, [auditLogs, searchQuery, selectedEntity, selectedStaff]);

  const handleExportCSV = () => {
    const csv = storageService.exportAuditLogsCSV();
    storageService.downloadCSVFile(csv, `Activity_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span>System Activity Logs & Audit Trail ({filteredLogs.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive tamper-evident record of all cashier sales, inventory updates, expense logs, staff logins, and config changes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition active:scale-95 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            {onClearLogs && auditLogs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear audit logs history?')) {
                    onClearLogs();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800 text-xs font-semibold rounded-xl transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search action or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Event Categories ({auditLogs.length})</option>
              <option value="sale">Sales & Orders</option>
              <option value="product">Inventory & Stock</option>
              <option value="debt">Customer Debts</option>
              <option value="expense">Operating Expenses</option>
              <option value="invoice">Invoices & Quotes</option>
              <option value="staff">Staff & Authentication</option>
              <option value="financial">Financial & Bank Accounts</option>
              <option value="backup">Backups & Restores</option>
              <option value="business">Store Profile</option>
              <option value="settings">Settings & Alerts</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Staff Members</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit Log Timeline Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3">Actor / Staff</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Action Event</th>
                <th className="py-3 px-3">Details & Parameters</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No activity logs found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const entity = ENTITY_CONFIG[log.entityType] || ENTITY_CONFIG.system;
                  const Icon = entity.icon;
                  const logDate = new Date(log.timestamp);

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        <span className="text-slate-200 font-semibold">
                          {logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {logDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                            {log.staffName.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-200">{log.staffName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${entity.badgeColor}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{entity.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-100 whitespace-nowrap">
                        {log.action}
                      </td>

                      <td className="py-3 px-3 text-slate-300 max-w-xs md:max-w-md truncate">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
