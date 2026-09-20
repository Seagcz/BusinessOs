import { storageService } from './storage';
import { BusinessProfile } from '../types';

export interface CloudDbStatus {
  connected: boolean;
  engine: string;
  region: string;
  database: string;
  counts: {
    products: number;
    customers: number;
    sales: number;
    debts: number;
    expenses: number;
  };
}

export interface SupabaseConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  isLinked?: boolean;
}

const SUPABASE_CONFIG_KEY = 'bos_supabase_config';

export class CloudDbService {
  static getSupabaseConfig(): SupabaseConfig {
    try {
      const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  static saveSupabaseConfig(config: SupabaseConfig): void {
    try {
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to save Supabase config:', err);
    }
  }

  static async getStatus(): Promise<CloudDbStatus> {
    try {
      const res = await fetch('/api/db/status');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch cloud db status:', err);
      return {
        connected: false,
        engine: 'PostgreSQL (Cloud SQL / Supabase compatible)',
        region: 'europe-west2',
        database: 'unreachable',
        counts: { products: 0, customers: 0, sales: 0, debts: 0, expenses: 0 },
      };
    }
  }

  static async syncPush(business: BusinessProfile): Promise<{ success: boolean; error?: string }> {
    try {
      const products = storageService.getProducts(business.id);
      const customers = storageService.getCustomers(business.id);
      const sales = storageService.getSales(business.id);
      const debts = storageService.getDebts(business.id);
      const expenses = storageService.getExpenses(business.id);

      const payload = {
        business,
        products,
        customers,
        sales,
        debts,
        expenses,
      };

      const res = await fetch('/api/db/sync-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      // Mark offline queue as clean
      storageService.clearSyncedQueue();
      return { success: true };
    } catch (err: any) {
      console.error('Error pushing data to cloud database:', err);
      return { success: false, error: err.message || 'Push sync failed' };
    }
  }

  static async syncPull(businessId: string): Promise<{ success: boolean; pulledCounts?: any; error?: string }> {
    try {
      const res = await fetch(`/api/db/sync-pull?businessId=${encodeURIComponent(businessId)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return {
        success: true,
        pulledCounts: {
          products: data.products?.length || 0,
          customers: data.customers?.length || 0,
          sales: data.sales?.length || 0,
          debts: data.debts?.length || 0,
          expenses: data.expenses?.length || 0,
        },
      };
    } catch (err: any) {
      console.error('Error pulling data from cloud database:', err);
      return { success: false, error: err.message || 'Pull sync failed' };
    }
  }
}

export const cloudDbService = CloudDbService;
