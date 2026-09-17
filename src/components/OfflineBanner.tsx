import React from 'react';
import { WifiOff, Wifi, CheckCircle2, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { NetworkStatus } from '../types';

interface OfflineBannerProps {
  isOnline: boolean;
  networkStatus?: NetworkStatus;
  pendingCount?: number;
  onSyncNow?: () => void;
  onOpenSyncModal?: () => void;
  isSyncing?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  networkStatus,
  pendingCount = 0,
  onSyncNow,
  onOpenSyncModal,
  isSyncing = false,
}) => {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`px-3 sm:px-6 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 border-b transition ${
        !isOnline
          ? 'bg-amber-950/90 text-amber-200 border-amber-800/80 shadow-inner'
          : 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!isOnline ? (
          <>
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="truncate">
              <strong>Offline Mode Active:</strong> Cashier sales and debts stored safely on phone.
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="truncate">
              Back online ({networkStatus?.effectiveType?.toUpperCase() || '4G'}). {pendingCount} item{pendingCount === 1 ? '' : 's'} awaiting sync.
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        {pendingCount > 0 && onOpenSyncModal && (
          <button
            onClick={onOpenSyncModal}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-bold transition border border-slate-700 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>{pendingCount} Pending</span>
          </button>
        )}

        {isOnline && pendingCount > 0 && onSyncNow && (
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
