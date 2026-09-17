import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  AlertTriangle,
  Calendar,
  DollarSign,
  MessageSquare,
  Check,
  Save,
  Send,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { BusinessProfile, AppNotification } from '../../types';

interface AdminNotificationsSectionProps {
  business: BusinessProfile;
  notifications: AppNotification[];
  onUpdateBusiness: (updated: BusinessProfile) => void;
  onClearNotifications?: () => void;
  onSendTestNotification?: (notif: AppNotification) => void;
  onLogActivity?: (action: string, details: string, entityType: 'settings') => void;
}

export const AdminNotificationsSection: React.FC<AdminNotificationsSectionProps> = ({
  business,
  notifications,
  onUpdateBusiness,
  onClearNotifications,
  onSendTestNotification,
  onLogActivity,
}) => {
  const [notifyLowStock, setNotifyLowStock] = useState(business.notifyLowStock !== false);
  const [notifyOverdueDebts, setNotifyOverdueDebts] = useState(business.notifyOverdueDebts !== false);
  const [notifyDailySummary, setNotifyDailySummary] = useState(business.notifyDailySummary !== false);
  const [notifyWhatsAppReceipts, setNotifyWhatsAppReceipts] = useState(
    business.notifyWhatsAppReceipts !== false
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveNotificationSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BusinessProfile = {
      ...business,
      notifyLowStock,
      notifyOverdueDebts,
      notifyDailySummary,
      notifyWhatsAppReceipts,
    };
    onUpdateBusiness(updated);
    if (onLogActivity) {
      onLogActivity(
        'Updated Notification Alerts',
        `Low Stock: ${notifyLowStock ? 'ON' : 'OFF'}, Debts: ${notifyOverdueDebts ? 'ON' : 'OFF'}, Daily Summary: ${notifyDailySummary ? 'ON' : 'OFF'}`,
        'settings'
      );
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTriggerTestAlert = () => {
    if (onSendTestNotification) {
      const testNotif: AppNotification = {
        id: 'notif_' + Date.now(),
        businessId: business.id,
        title: '🔔 Test Admin Notification',
        message: `System notification sent by Admin at ${new Date().toLocaleTimeString()}. Alerts are working properly.`,
        type: 'system',
        read: false,
        timestamp: new Date().toISOString(),
      };
      onSendTestNotification(testNotif);
      if (onLogActivity) {
        onLogActivity('Triggered Test Notification', 'Dispatched test admin notification alert', 'settings');
      }
      alert('Test notification dispatched! Check your notification bell on top right.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Rules Form */}
      <form
        onSubmit={handleSaveNotificationSettings}
        className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <BellRing className="w-5 h-5 text-emerald-400" />
              <span>Automated Store Notifications & Alerts</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Set triggers for automated low-inventory alerts, customer debt maturity notices, and end-of-day reports.
            </p>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Alert Preferences Saved!</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Low Stock Warning */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">Low Stock Inventory Alerts</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Receive instant notifications when product quantity drops at or below minimum threshold.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={notifyLowStock}
                onChange={(e) => setNotifyLowStock(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Overdue Debt Reminders */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-slate-200">Customer Debt Due & Overdue Alerts</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Highlight customers with overdue balances past the grace period for follow-up.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={notifyOverdueDebts}
                onChange={(e) => setNotifyOverdueDebts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Daily Closing Summary */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">End-of-Day Store Sales Digest</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Generate a notification summarizing total sales, cash collected, transfers, and daily profit.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={notifyDailySummary}
                onChange={(e) => setNotifyDailySummary(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* WhatsApp Digital Receipt Option */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-xs font-bold text-slate-200">WhatsApp Digital Receipt Share</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Allow cashiers to share instant digital sales receipt messages directly via WhatsApp to customers.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={notifyWhatsAppReceipts}
                onChange={(e) => setNotifyWhatsAppReceipts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleTriggerTestAlert}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition active:scale-95"
          >
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span>Send Test Alert</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950 transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Alert Rules</span>
          </button>
        </div>
      </form>

      {/* Notification Activity List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-base text-white">Recent System Notifications ({notifications.length})</h3>
          </div>

          {onClearNotifications && notifications.length > 0 && (
            <button
              type="button"
              onClick={onClearNotifications}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-500">No active notifications in the system.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition ${
                  n.read
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-70'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 text-sky-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-bold text-xs text-slate-100">{n.title}</h5>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
