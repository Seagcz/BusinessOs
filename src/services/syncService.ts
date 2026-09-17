import { storageService } from './storage';
import { NetworkStatus, SyncQueueItem, OfflineSyncSummary } from '../types';

type SyncListener = (summary: OfflineSyncSummary) => void;
type NetworkListener = (status: NetworkStatus) => void;

class OfflineSyncEngine {
  private isSyncing = false;
  private syncListeners: Set<SyncListener> = new Set();
  private networkListeners: Set<NetworkListener> = new Set();
  private periodicInterval: any = null;

  constructor() {
    this.initNetworkListeners();
    this.startPeriodicSyncCheck();
  }

  private initNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.notifyNetworkChange();
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      this.notifyNetworkChange();
    });

    // Listen to Network Information API if supported on Android / Chrome
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', () => {
        this.notifyNetworkChange();
      });
    }
  }

  private startPeriodicSyncCheck() {
    if (typeof window === 'undefined') return;
    if (this.periodicInterval) clearInterval(this.periodicInterval);
    
    // Check every 25 seconds if online and there are pending items
    this.periodicInterval = setInterval(() => {
      if (this.isOnline() && !this.isSyncing) {
        const summary = storageService.getSyncSummary();
        if (summary.pendingCount > 0) {
          this.syncNow();
        }
      }
    }, 25000);
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public getNetworkStatus(): NetworkStatus {
    const isOnline = this.isOnline();
    const conn = typeof navigator !== 'undefined' ? (navigator as any).connection : null;

    if (!isOnline) {
      return {
        isOnline: false,
        effectiveType: 'offline',
      };
    }

    return {
      isOnline: true,
      effectiveType: conn?.effectiveType || '4g',
      downlink: conn?.downlink || 10,
      rtt: conn?.rtt || 30,
      saveData: conn?.saveData || false,
    };
  }

  public subscribeSync(listener: SyncListener): () => void {
    this.syncListeners.add(listener);
    listener(storageService.getSyncSummary());
    return () => this.syncListeners.delete(listener);
  }

  public subscribeNetwork(listener: NetworkListener): () => void {
    this.networkListeners.add(listener);
    listener(this.getNetworkStatus());
    return () => this.networkListeners.delete(listener);
  }

  private notifySyncChange() {
    const summary = storageService.getSyncSummary();
    summary.isSyncing = this.isSyncing;
    this.syncListeners.forEach((l) => l(summary));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sbos-sync-update', { detail: summary }));
    }
  }

  private notifyNetworkChange() {
    const status = this.getNetworkStatus();
    this.networkListeners.forEach((l) => l(status));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sbos-network-update', { detail: status }));
    }
  }

  public async syncNow(businessId?: string): Promise<{ success: boolean; syncedCount: number; errors: number }> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, errors: 0 };
    }

    if (!this.isOnline()) {
      return { success: false, syncedCount: 0, errors: 0 };
    }

    const queue = storageService.getSyncQueue(businessId);
    const pendingItems = queue.filter((item) => item.status === 'pending' || item.status === 'failed');

    if (pendingItems.length === 0) {
      storageService.clearSyncedQueue();
      this.notifySyncChange();
      return { success: true, syncedCount: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.notifySyncChange();

    let syncedCount = 0;
    let errors = 0;

    try {
      for (const item of pendingItems) {
        storageService.updateQueueItem(item.id, { status: 'syncing' });
        this.notifySyncChange();

        // Simulate safe asynchronous cloud handshake / transaction verification with network delay simulation
        await new Promise((resolve) => setTimeout(resolve, 150));

        try {
          // Verify idempotency
          if (item.idempotencyKey) {
            storageService.markIdempotencyProcessed(item.idempotencyKey);
          }

          // Mark entity as synced in storage
          if (item.entityType === 'sale' && item.payload?.id) {
            const sales = storageService.getSales(item.businessId);
            const targetSale = sales.find((s) => s.id === item.payload.id);
            if (targetSale) {
              targetSale.isSynced = true;
              localStorage.setItem('sbos_sales', JSON.stringify(sales));
            }
          }

          storageService.markQueueItemSynced(item.id);
          syncedCount++;
        } catch (err: any) {
          console.error(`Sync error for item ${item.id}:`, err);
          storageService.updateQueueItem(item.id, {
            status: 'failed',
            errorMessage: err?.message || 'Sync verification error',
            retryCount: (item.retryCount || 0) + 1,
          });
          errors++;
        }
      }

      // Auto-save emergency backup snapshot after successful sync
      storageService.saveEmergencySnapshot(businessId);
    } finally {
      this.isSyncing = false;
      this.notifySyncChange();
    }

    return {
      success: errors === 0,
      syncedCount,
      errors,
    };
  }

  public retryItem(itemId: string) {
    storageService.updateQueueItem(itemId, { status: 'pending', errorMessage: undefined });
    this.syncNow();
  }

  public removeItem(itemId: string) {
    storageService.removeQueueItem(itemId);
    this.notifySyncChange();
  }

  public clearSynced() {
    storageService.clearSyncedQueue();
    this.notifySyncChange();
  }
}

export const syncService = new OfflineSyncEngine();
