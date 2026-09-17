import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Trash2,
  X,
  Database,
  ShieldCheck,
  Smartphone,
  Layers,
  ArrowUpRight,
  Receipt,
  Package,
  BookOpen,
  DollarSign,
  FileText,
  User,
} from 'lucide-react';
import { NetworkStatus, SyncQueueItem, OfflineSyncSummary, BusinessProfile } from '../types';
import { storageService } from '../services/storage';
import { syncService } from '../services/syncService';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessProfile;
  networkStatus?: NetworkStatus;
  syncSummary?: OfflineSyncSummary;
  onTriggerSync?: () => Promise<void>;
  onSyncComplete?: () => void;
}

export const SyncStatusModal: React.FC<SyncStatusModalProps> = ({
  isOpen,
  onClose,
  business,
  networkStatus: propNetworkStatus,
  syncSummary: propSyncSummary,
  onTriggerSync,
  onSyncComplete,
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => propNetworkStatus || syncService.getNetworkStatus());
  const [syncSummary, setSyncSummary] = useState<OfflineSyncSummary>(() => propSyncSummary || storageService.getSyncSummary(business.id));
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>(() => storageService.getSyncQueue(business.id));
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubNet = syncService.subscribeNetwork((net) => {
      setNetworkStatus(net);
    });

    const unsubSync = syncService.subscribeSync((sum) => {
      setSyncSummary(sum);
      setQueueItems(storageService.getSyncQueue(business.id));
      setIsSyncing(sum.isSyncing);
    });

    return () => {
      unsubNet();
      unsubSync();
    };
  }, [isOpen, business.id]);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    if (!networkStatus.isOnline) {
      setFeedbackMsg({
        type: 'error',
        text: 'Device is currently offline. Reconnect to Wi-Fi or Mobile Data to sync.',
      });
      return;
    }

    setIsSyncing(true);
    setFeedbackMsg(null);
    try {
      const res = await syncService.syncNow(business.id);
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: `Sync complete! ${res.syncedCount} transaction${res.syncedCount === 1 ? '' : 's'} verified and synchronized safely.`,
        });
        if (onSyncComplete) onSyncComplete();
      } else {
        setFeedbackMsg({
          type: 'error',
          text: `Sync finished with ${res.errors} error(s). Tap "Retry" on pending items.`,
        });
      }
    } catch {
      setFeedbackMsg({
        type: 'error',
        text: 'Sync encountered a temporary network timeout. Retrying automatically...',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadEmergencyBackup = () => {
    try {
      const json = storageService.exportFullBackupJSON();
      const filename = `Emergency_Backup_${business.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Backup download error', e);
    }
  };

  const handleRetryItem = (id: string) => {
    syncService.retryItem(id);
    setQueueItems(storageService.getSyncQueue(business.id));
  };

  const handleRemoveItem = (id: string) => {
    syncService.removeItem(id);
    setQueueItems(storageService.getSyncQueue(business.id));
  };

  const handleClearSynced = () => {
    syncService.clearSynced();
    setQueueItems(storageService.getSyncQueue(business.id));
  };

  const getEntityIcon = (type: SyncQueueItem['entityType']) => {
    switch (type) {
      case 'sale':
        return <Receipt className="w-4 h-4 text-emerald-400" />;
      case 'product':
        return <Package className="w-4 h-4 text-amber-400" />;
      case 'debt':
        return <BookOpen className="w-4 h-4 text-rose-400" />;
      case 'expense':
        return <DollarSign className="w-4 h-4 text-purple-400" />;
      case 'invoice':
        return <FileText className="w-4 h-4 text-sky-400" />;
      case 'customer':
        return <User className="w-4 h-4 text-teal-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                networkStatus.isOnline
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
              }`}
            >
              {networkStatus.isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-slate-100">
                  Offline Sync & Network Manager
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    networkStatus.isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {networkStatus.isOnline ? `Online (${networkStatus.effectiveType?.toUpperCase() || '4G'})` : 'Offline Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Idempotent local storage engine for Nigerian mobile networks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Feedback message banner */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-800 text-rose-200'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Pending Mutations</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="font-mono font-black text-base sm:text-lg text-amber-300">
                  {syncSummary.pendingCount}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Synced Verified</span>
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono font-black text-base sm:text-lg text-emerald-300">
                  {syncSummary.syncedCount}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Network Latency</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Wifi className="w-4 h-4 text-sky-400" />
                <span className="font-mono font-bold text-xs sm:text-sm text-sky-200">
                  {networkStatus.isOnline ? `${networkStatus.rtt || 25} ms` : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Local Storage</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Database className="w-4 h-4 text-purple-400" />
                <span className="font-mono font-bold text-xs sm:text-sm text-purple-200 truncate">
                  IndexedDB + LS
                </span>
              </div>
            </div>
          </div>

          {/* Sync Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                id="btn-trigger-manual-sync"
                onClick={handleManualSync}
                disabled={isSyncing || !networkStatus.isOnline}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer ${
                  isSyncing
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : !networkStatus.isOnline
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Synchronizing Data...' : 'Sync Pending Items Now'}</span>
              </button>

              {syncSummary.syncedCount > 0 && (
                <button
                  onClick={handleClearSynced}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition cursor-pointer"
                >
                  Clear Synced Log
                </button>
              )}
            </div>

            <button
              onClick={handleDownloadEmergencyBackup}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700 cursor-pointer"
              title="Download entire store database as offline JSON"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Emergency Backup JSON</span>
            </button>
          </div>

          {/* Queue Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Transaction Mutation Ledger ({queueItems.length})
              </h3>
              {syncSummary.lastSyncedAt && (
                <span className="text-[11px] text-slate-500">
                  Last Sync: {new Date(syncSummary.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {queueItems.length === 0 ? (
              <div className="py-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80 p-4 space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60" />
                <p className="text-xs font-semibold text-slate-300">All local data is fully synchronized</p>
                <p className="text-[11px] text-slate-500">
                  Any sales, stock edits, or debt collections made offline will queue here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {queueItems.map((item) => {
                  const isPending = item.status === 'pending';
                  const isSyncingItem = item.status === 'syncing';
                  const isFailed = item.status === 'failed';
                  const isSynced = item.status === 'synced';

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0">
                          {getEntityIcon(item.entityType)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-100 truncate">{item.summary}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="capitalize">{item.entityType} ({item.action})</span>
                            <span>•</span>
                            <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {item.idempotencyKey && (
                              <span className="font-mono text-slate-600 truncate max-w-[80px]">
                                key:{item.idempotencyKey.slice(0, 8)}
                              </span>
                            )}
                          </div>
                          {item.errorMessage && (
                            <p className="text-[10px] text-rose-400 mt-1">{item.errorMessage}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSynced && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                            Synced
                          </span>
                        )}
                        {isSyncingItem && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-bold flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Syncing
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                            Queued
                          </span>
                        )}
                        {isFailed && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                            Failed
                          </span>
                        )}

                        {isFailed && (
                          <button
                            onClick={() => handleRetryItem(item.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400"
                            title="Retry sync"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Offline Durability Guarantee Info Box */}
          <div className="p-3.5 bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Nigerian Low-Bandwidth & Offline Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong>Zero Data Loss:</strong> Transactions and receipts are written instantly to phone hardware storage before network transport.
              <br />
              • <strong>Duplicate Prevention:</strong> Each checkout is stamped with a unique cryptographic idempotency token to prevent double-charging or duplicate stock deduction even during erratic 2G/3G network drops.
              <br />
              • <strong>PWA Offline Startup:</strong> The app opens and rings sales instantly without needing an active internet connection.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
          >
            Close Manager
          </button>
        </div>
      </div>
    </div>
  );
};
