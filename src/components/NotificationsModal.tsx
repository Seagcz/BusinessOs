import React from 'react';
import { X, Bell, AlertTriangle, AlertCircle, Calendar, Check, Trash2, ArrowRight } from 'lucide-react';
import { AppNotification, NavigationTab } from '../types';
import { formatDate } from '../utils/formatters';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onAction?: (notification: AppNotification) => void;
  onMarkRead?: (id: string) => void;
  onNavigateTab?: (tab: NavigationTab) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onClearAll,
  onAction,
  onMarkRead,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const handleMark = onMarkAsRead || onMarkRead || (() => {});

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'debt_overdue':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'daily_closing':
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bell className="w-4 h-4 text-sky-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden text-slate-900 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">Notifications & Alerts</h3>
              <p className="text-xs text-slate-400">Stock updates, debt notices and summaries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                title="Clear all alerts"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">All caught up!</p>
              <p className="text-xs text-slate-400 mt-0.5">No pending business alerts.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition ${
                  n.read || n.isRead
                    ? 'bg-slate-50 border-slate-100 text-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-slate-50 border border-slate-200/60 flex-shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-black truncate ${n.read || n.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {formatDate(n.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                      {n.linkTab && (
                        <button
                          onClick={() => {
                            if (!n.read && !n.isRead) handleMark(n.id);
                            if (onAction) onAction(n);
                            else if (onNavigateTab) onNavigateTab(n.linkTab as NavigationTab);
                            onClose();
                          }}
                          className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open {n.linkTab.toUpperCase()}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {!n.read && !n.isRead && (
                        <button
                          onClick={() => handleMark(n.id)}
                          className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer ml-auto"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark Read</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
