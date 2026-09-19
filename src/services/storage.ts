import {
  BusinessProfile,
  StaffUser,
  Product,
  Sale,
  SaleItem,
  Customer,
  DebtRecord,
  Expense,
  Invoice,
  InvoicePaymentRecord,
  PaymentMethod,
  AuditLog,
  AppNotification,
  AppDataBackup,
  CustomRole,
  SyncQueueItem,
  OfflineSyncSummary,
  CartDraft,
  SolanaTransaction,
} from '../types';

import {
  INITIAL_BUSINESS_PROFILE,
  INITIAL_STAFF,
  INITIAL_CUSTOM_ROLES,
  SAMPLE_PRODUCTS,
  SAMPLE_CUSTOMERS,
  SAMPLE_DEBTS,
  SAMPLE_EXPENSES,
  SAMPLE_INVOICES,
  SAMPLE_AUDIT_LOGS,
  SAMPLE_SOLANA_TRANSACTIONS,
} from './nigerianData';

const STORAGE_KEYS = {
  CURRENT_BIZ: 'sbos_current_business',
  ALL_BIZ: 'sbos_all_businesses',
  CURRENT_STAFF: 'sbos_current_staff',
  STAFF_USERS: 'sbos_staff_users',
  CUSTOM_ROLES: 'sbos_custom_roles',
  PRODUCTS: 'sbos_products',
  SALES: 'sbos_sales',
  CUSTOMERS: 'sbos_customers',
  DEBTS: 'sbos_debts',
  EXPENSES: 'sbos_expenses',
  INVOICES: 'sbos_invoices',
  SOLANA_TRANSACTIONS: 'sbos_solana_transactions',
  AUDIT_LOGS: 'sbos_audit_logs',
  NOTIFICATIONS: 'sbos_notifications',
  LAST_SYNC: 'sbos_last_sync',
  SYNC_QUEUE: 'sbos_sync_queue',
  PROCESSED_IDEMPOTENCY: 'sbos_processed_idempotency_keys',
  CART_DRAFT: 'sbos_cart_draft_',
  EMERGENCY_SNAPSHOT: 'sbos_emergency_snapshot',
};

// IndexedDB Helper for high-capacity offline persistent mirror on Android
class IndexedDBStore {
  private dbName = 'SmallBusinessOS_DB';
  private dbVersion = 1;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB not supported'));
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('keyval')) {
            db.createObjectStore('keyval');
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  async set(key: string, val: any): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        const req = store.put(val, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback silently if IDB fails
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('keyval', 'readonly');
        const store = tx.objectStore('keyval');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }
}

const idbMirror = new IndexedDBStore();

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Asynchronously mirror to IndexedDB to guarantee persistence against quota drops
    idbMirror.set(key, data).catch(() => {});
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
    // If localStorage quota exceeded on mobile, try writing to IndexedDB directly
    idbMirror.set(key, data).catch(() => {});
  }
}

export class BusinessStorageService {
  static initialize() {
    const existingBiz = getStored<any>(STORAGE_KEYS.CURRENT_BIZ, null);
    const existingNotifs = getStored<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const existingSales = getStored<any[]>(STORAGE_KEYS.SALES, []);

    // Detect legacy demo artifacts and automatically purge them
    const hasDemoArtifacts =
      existingBiz?.name === 'Ade & Sons Superstores' ||
      existingBiz?.solanaWalletAddress === '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' ||
      existingNotifs?.some((n) => n.id === 'notif_1' || n.title?.includes('Dangote Sugar')) ||
      existingSales?.some((s) => s.id === 'sale_demo_1');

    if (!existingBiz || hasDemoArtifacts) {
      setStored(STORAGE_KEYS.CURRENT_BIZ, INITIAL_BUSINESS_PROFILE);
      setStored(STORAGE_KEYS.ALL_BIZ, [INITIAL_BUSINESS_PROFILE]);
      setStored(STORAGE_KEYS.STAFF_USERS, INITIAL_STAFF);
      setStored(STORAGE_KEYS.CURRENT_STAFF, INITIAL_STAFF[0]);
      setStored(STORAGE_KEYS.CUSTOM_ROLES, INITIAL_CUSTOM_ROLES);
      setStored(STORAGE_KEYS.PRODUCTS, SAMPLE_PRODUCTS);
      setStored(STORAGE_KEYS.CUSTOMERS, SAMPLE_CUSTOMERS);
      setStored(STORAGE_KEYS.DEBTS, SAMPLE_DEBTS);
      setStored(STORAGE_KEYS.EXPENSES, SAMPLE_EXPENSES);
      setStored(STORAGE_KEYS.INVOICES, SAMPLE_INVOICES);
      setStored(STORAGE_KEYS.SOLANA_TRANSACTIONS, SAMPLE_SOLANA_TRANSACTIONS);
      setStored(STORAGE_KEYS.SALES, []);
      setStored(STORAGE_KEYS.NOTIFICATIONS, []);
      setStored(STORAGE_KEYS.AUDIT_LOGS, SAMPLE_AUDIT_LOGS);
      setStored(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    }
  }

  // Business Profiles
  static getActiveBusiness(): BusinessProfile {
    this.initialize();
    return getStored(STORAGE_KEYS.CURRENT_BIZ, INITIAL_BUSINESS_PROFILE);
  }

  static getBusiness(): BusinessProfile {
    return this.getActiveBusiness();
  }

  static getActiveBusinessId(): string {
    return this.getActiveBusiness().id;
  }

  static getAllBusinesses(): BusinessProfile[] {
    this.initialize();
    return getStored(STORAGE_KEYS.ALL_BIZ, [INITIAL_BUSINESS_PROFILE]);
  }

  static saveBusiness(biz: BusinessProfile): void {
    setStored(STORAGE_KEYS.CURRENT_BIZ, biz);
    const all = this.getAllBusinesses();
    const updated = all.map((b) => (b.id === biz.id ? biz : b));
    if (!updated.some((b) => b.id === biz.id)) {
      updated.push(biz);
    }
    setStored(STORAGE_KEYS.ALL_BIZ, updated);
  }

  static setActiveBusinessId(bizId: string): void {
    const all = this.getAllBusinesses();
    const found = all.find((b) => b.id === bizId);
    if (found) {
      setStored(STORAGE_KEYS.CURRENT_BIZ, found);
    }
  }

  // Staff & Login
  static getStaff(businessId?: string): StaffUser[] {
    this.initialize();
    const staff = getStored(STORAGE_KEYS.STAFF_USERS, INITIAL_STAFF);
    if (businessId) {
      return staff.filter((s) => !s.businessId || s.businessId === businessId);
    }
    return staff;
  }

  static getStaffUsers(): StaffUser[] {
    return this.getStaff();
  }

  static getCurrentStaff(businessId?: string): StaffUser {
    this.initialize();
    const staff = getStored(STORAGE_KEYS.CURRENT_STAFF, INITIAL_STAFF[0]);
    return staff;
  }

  static setCurrentStaff(staff: StaffUser): void {
    setStored(STORAGE_KEYS.CURRENT_STAFF, staff);
  }

  // First-Time Security & PIN / Password Provisioning
  static isFirstTimeSecuritySetupNeeded(businessId?: string): boolean {
    this.initialize();
    const staffList = this.getStaff(businessId);
    const owner = staffList.find((s) => s.role === 'owner') || staffList[0];
    if (!owner) return false;
    return owner.hasCreatedCredentials !== true;
  }

  static setupFirstTimeCredentials(
    businessId: string,
    staffId: string,
    data: { pin: string; password?: string; name?: string; email?: string; phone?: string }
  ): { success: boolean; staff: StaffUser } {
    const staffList = this.getStaff();
    const targetIdx = staffList.findIndex((s) => s.id === staffId);
    if (targetIdx < 0) {
      throw new Error('Staff record not found');
    }

    const updatedStaff: StaffUser = {
      ...staffList[targetIdx],
      pin: data.pin.trim(),
      password: data.password ? data.password.trim() : staffList[targetIdx].password,
      name: data.name ? data.name.trim() : staffList[targetIdx].name,
      email: data.email ? data.email.trim() : staffList[targetIdx].email,
      phone: data.phone ? data.phone.trim() : staffList[targetIdx].phone,
      hasCreatedCredentials: true,
      mustChangePinOnNextLogin: false,
    };

    staffList[targetIdx] = updatedStaff;
    setStored(STORAGE_KEYS.STAFF_USERS, staffList);

    const current = this.getCurrentStaff();
    if (current.id === staffId) {
      this.setCurrentStaff(updatedStaff);
    }

    this.logActivity(
      'Security Setup Completed',
      `Master 4-digit PIN & security password configured for "${updatedStaff.name}".`,
      'staff',
      updatedStaff.name
    );

    return { success: true, staff: updatedStaff };
  }

  // Admin-Only PIN & Credential Provisioning for Employees
  static adminProvisionEmployeePin(
    adminStaff: StaffUser,
    employeeId: string,
    newPin: string,
    newPassword?: string,
    mustChangeOnLogin: boolean = false
  ): { success: boolean; message: string; employee?: StaffUser } {
    const isAuthorized = adminStaff.role === 'owner' || adminStaff.canManageStaff;
    if (!isAuthorized) {
      return {
        success: false,
        message: 'Security Restriction: Only Store Owners and Authorized Administrators can create or reset employee PINs.',
      };
    }

    if (!newPin || newPin.length < 4) {
      return {
        success: false,
        message: 'Invalid PIN: Employee PIN must be at least 4 numeric digits.',
      };
    }

    const staffList = this.getStaff();
    const targetIdx = staffList.findIndex((s) => s.id === employeeId);
    if (targetIdx < 0) {
      return { success: false, message: 'Employee record not found.' };
    }

    const targetStaff = staffList[targetIdx];

    // Prevent non-owners from editing owner's PIN
    if (targetStaff.role === 'owner' && adminStaff.role !== 'owner' && adminStaff.id !== targetStaff.id) {
      return {
        success: false,
        message: 'Privilege Restriction: Only the Store Owner can modify the Owner Master PIN.',
      };
    }

    const updatedEmployee: StaffUser = {
      ...targetStaff,
      pin: newPin.trim(),
      password: newPassword ? newPassword.trim() : targetStaff.password,
      mustChangePinOnNextLogin: mustChangeOnLogin,
      hasCreatedCredentials: true,
    };

    staffList[targetIdx] = updatedEmployee;
    setStored(STORAGE_KEYS.STAFF_USERS, staffList);

    // If active logged-in staff is updated, update current session too
    const current = this.getCurrentStaff();
    if (current.id === employeeId) {
      this.setCurrentStaff(updatedEmployee);
    }

    this.logActivity(
      'Employee PIN Provisioned',
      `Admin "${adminStaff.name}" provisioned new access PIN for employee "${targetStaff.name}" (${targetStaff.role}).`,
      'staff',
      adminStaff.name
    );

    return {
      success: true,
      message: `Successfully provisioned dedicated PIN for ${targetStaff.name}.`,
      employee: updatedEmployee,
    };
  }

  // Custom Roles (Owner privileges)
  static getCustomRoles(businessId?: string): CustomRole[] {
    this.initialize();
    const roles = getStored<CustomRole[]>(STORAGE_KEYS.CUSTOM_ROLES, INITIAL_CUSTOM_ROLES);
    if (businessId) {
      return roles.filter((r) => !r.businessId || r.businessId === businessId);
    }
    return roles;
  }

  static saveCustomRole(role: CustomRole, staffName: string = 'Owner'): void {
    const roles = this.getCustomRoles();
    const idx = roles.findIndex((r) => r.id === role.id);
    const isNew = idx < 0;
    if (idx >= 0) {
      roles[idx] = role;
    } else {
      roles.push(role);
    }
    setStored(STORAGE_KEYS.CUSTOM_ROLES, roles);
    this.logActivity(
      isNew ? 'Custom Role Created' : 'Custom Role Updated',
      `Custom role "${role.name}" was ${isNew ? 'created' : 'modified'} with customized permissions.`,
      'staff',
      staffName
    );
  }

  static deleteCustomRole(roleId: string, staffName: string = 'Owner', businessId?: string): void {
    const roles = this.getCustomRoles();
    const target = roles.find((r) => r.id === roleId);
    const remaining = roles.filter((r) => r.id !== roleId);
    setStored(STORAGE_KEYS.CUSTOM_ROLES, remaining);
    if (target) {
      this.logActivity(
        'Custom Role Deleted',
        `Custom role "${target.name}" was permanently removed.`,
        'staff',
        staffName
      );
    }
  }

  static saveStaffUser(staff: StaffUser, actorName: string = 'Admin'): void {
    const list = this.getStaff();
    const idx = list.findIndex((s) => s.id === staff.id);
    const isNew = idx < 0;
    if (idx >= 0) {
      list[idx] = staff;
    } else {
      list.push(staff);
    }
    setStored(STORAGE_KEYS.STAFF_USERS, list);
    this.logActivity(
      isNew ? 'Staff Account Created' : 'Staff Permissions Updated',
      `Staff user "${staff.name}" (${staff.role}) was ${isNew ? 'added to system' : 'updated with permissions'}.`,
      'staff',
      actorName
    );
  }

  static deleteStaffUser(staffId: string, actorName: string = 'Admin'): void {
    const target = this.getStaff().find((s) => s.id === staffId);
    const list = this.getStaff().filter((s) => s.id !== staffId);
    setStored(STORAGE_KEYS.STAFF_USERS, list);
    if (target) {
      this.logActivity(
        'Staff Account Deleted',
        `Staff member "${target.name}" (${target.role}) was removed from store registry.`,
        'staff',
        actorName
      );
    }
  }

  // Products
  static getProducts(businessId?: string): Product[] {
    this.initialize();
    const prods = getStored(STORAGE_KEYS.PRODUCTS, SAMPLE_PRODUCTS);
    if (businessId) {
      return prods.filter((p) => !p.businessId || p.businessId === businessId);
    }
    return prods;
  }

  static saveProduct(product: Product, actorName: string = 'Staff'): void {
    const prods = this.getProducts();
    const idx = prods.findIndex((p) => p.id === product.id);
    const existing = idx >= 0 ? prods[idx] : null;
    const isNew = !existing;

    if (idx >= 0) {
      prods[idx] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      prods.unshift({ ...product, updatedAt: new Date().toISOString() });
    }
    setStored(STORAGE_KEYS.PRODUCTS, prods);

    if (isNew) {
      this.logActivity(
        'Product Added',
        `New product "${product.name}" added at ₦${product.sellingPrice.toLocaleString()} (Cost: ₦${product.costPrice.toLocaleString()}).`,
        'product',
        actorName
      );
    } else if (existing && (existing.sellingPrice !== product.sellingPrice || existing.costPrice !== product.costPrice)) {
      this.logActivity(
        'Product Price Changed',
        `Price updated for "${product.name}": Selling ₦${existing.sellingPrice} → ₦${product.sellingPrice}, Cost ₦${existing.costPrice} → ₦${product.costPrice}.`,
        'product',
        actorName
      );
    }
  }

  static deleteProduct(productId: string, actorName: string = 'Staff'): void {
    const prods = this.getProducts();
    const target = prods.find((p) => p.id === productId);
    const remaining = prods.filter((p) => p.id !== productId);
    setStored(STORAGE_KEYS.PRODUCTS, remaining);
    if (target) {
      this.logActivity(
        'Product Deleted',
        `Product "${target.name}" (SKU: ${target.sku}) was deleted from inventory.`,
        'product',
        actorName
      );
    }
  }

  static restockProduct(productId: string, addedQty: number, newCostPrice?: number, actorName: string = 'Staff'): Product[] {
    const prods = this.getProducts();
    const item = prods.find((p) => p.id === productId);
    if (item) {
      const prevQty = item.stockQuantity;
      item.stockQuantity += addedQty;
      if (newCostPrice && newCostPrice > 0) {
        item.costPrice = newCostPrice;
      }
      item.updatedAt = new Date().toISOString();
      setStored(STORAGE_KEYS.PRODUCTS, prods);

      this.logActivity(
        'Stock Restocked',
        `Restocked +${addedQty} ${item.unit} for "${item.name}" (Stock: ${prevQty} → ${item.stockQuantity}).`,
        'product',
        actorName
      );
    }
    return prods;
  }

  static deductStockForSale(items: SaleItem[]): Product[] {
    const prods = this.getProducts();
    items.forEach((item) => {
      const prod = prods.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
        prod.updatedAt = new Date().toISOString();
      }
    });
    setStored(STORAGE_KEYS.PRODUCTS, prods);
    return prods;
  }

  static restoreStockForSale(items: SaleItem[]): Product[] {
    const prods = this.getProducts();
    items.forEach((item) => {
      const prod = prods.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQuantity += item.quantity;
        prod.updatedAt = new Date().toISOString();
      }
    });
    setStored(STORAGE_KEYS.PRODUCTS, prods);
    return prods;
  }

  // Sales
  static getSales(businessId?: string): Sale[] {
    this.initialize();
    const sales = getStored(STORAGE_KEYS.SALES, []);
    const normalized = sales.map((s) => ({
      ...s,
      total: s.total ?? s.totalAmount,
      totalAmount: s.totalAmount ?? s.total ?? 0,
      totalCost: s.totalCost ?? s.costTotal ?? 0,
      costTotal: s.costTotal ?? s.totalCost ?? 0,
      date: s.date ?? s.createdAt,
      createdAt: s.createdAt ?? s.date ?? new Date().toISOString(),
      profit: s.profit !== undefined ? s.profit : (s.totalAmount ?? s.total ?? 0) - (s.totalCost ?? s.costTotal ?? 0),
    }));
    if (businessId) {
      return normalized.filter((s) => !s.businessId || s.businessId === businessId);
    }
    return normalized;
  }

  static saveSale(sale: Sale): boolean {
    const saleId = sale.id;
    if (this.isIdempotencyProcessed(saleId)) {
      console.warn(`[Duplicate Prevention] Sale ID ${saleId} was already processed. Skipping duplicate insertion.`);
      return false;
    }
    this.markIdempotencyProcessed(saleId);

    const sales = this.getSales();
    const standardized: Sale = {
      ...sale,
      total: sale.totalAmount,
      totalAmount: sale.totalAmount,
      totalCost: sale.totalCost,
      costTotal: sale.totalCost,
      profit: sale.profit,
      date: sale.createdAt,
      createdAt: sale.createdAt,
      isSynced: typeof navigator !== 'undefined' ? navigator.onLine : false,
    };
    sales.unshift(standardized);
    setStored(STORAGE_KEYS.SALES, sales);

    // Automatically enqueue to offline sync ledger
    this.enqueueSync({
      businessId: sale.businessId,
      entityType: 'sale',
      action: 'create',
      payload: standardized,
      summary: `Sale #${sale.receiptNumber} (₦${(sale.totalAmount || 0).toLocaleString()}) by ${sale.staffName || 'Cashier'}`,
      idempotencyKey: sale.id,
    });

    this.logActivity(
      'Sale Completed',
      `Receipt #${sale.receiptNumber} completed by ${sale.staffName || 'Cashier'} for ₦${(sale.totalAmount || 0).toLocaleString()} (${sale.paymentMethod}).`,
      'sales',
      sale.staffName
    );

    // Auto-save emergency recovery snapshot
    this.saveEmergencySnapshot(sale.businessId);
    return true;
  }

  static voidSale(saleId: string, reason: string, staffName: string = 'Authorized Staff'): { sales: Sale[]; products: Product[] } {
    const sales = this.getSales();
    const sale = sales.find((s) => s.id === saleId);
    let prods = this.getProducts();
    if (sale && sale.status !== 'voided') {
      sale.status = 'voided';
      sale.voidReason = `${reason} (Voided by ${staffName} on ${new Date().toLocaleDateString()})`;
      setStored(STORAGE_KEYS.SALES, sales);

      // Restore inventory stock automatically
      prods = this.restoreStockForSale(sale.items);

      // If it was credit sale or split payment with credit portion, update or mark debt record
      const creditPortion = sale.splitPayments?.credit || (sale.isCredit || sale.paymentMethod === 'credit' ? sale.totalAmount : 0);
      if (creditPortion > 0 || sale.isCredit) {
        const debts = this.getDebts();
        const debt = debts.find((d) => d.receiptNumber === sale.receiptNumber || (d as any).saleId === sale.id);
        if (debt) {
          debt.balanceDue = 0;
          debt.status = 'settled';
          debt.notes = (debt.notes || '') + ` [VOIDED: ${reason}]`;
          setStored(STORAGE_KEYS.DEBTS, debts);
        }
      }

      // Adjust customer totals and reconcile
      if (sale.customerName || sale.customerId) {
        const custs = this.getCustomers();
        const cust = custs.find(
          (c) => (sale.customerId && c.id === sale.customerId) || (sale.customerPhone && c.phone === sale.customerPhone) || (sale.customerName && c.name.toLowerCase() === sale.customerName.toLowerCase())
        );
        if (cust) {
          cust.totalPurchases = Math.max(0, cust.totalPurchases - (sale.totalAmount || 0));
          setStored(STORAGE_KEYS.CUSTOMERS, custs);
        }
        this.reconcileCustomerBalances(sale.businessId);
      }

      // Enqueue sync for void action
      this.enqueueSync({
        businessId: sale.businessId,
        entityType: 'sale',
        action: 'update',
        payload: sale,
        summary: `Sale #${sale.receiptNumber} Voided by ${staffName}`,
        idempotencyKey: `void_${sale.id}`,
      });

      this.logActivity(
        'Sale Voided',
        `Receipt #${sale.receiptNumber} (₦${(sale.totalAmount || 0).toLocaleString()}) voided. Reason: "${reason}". Stock restored.`,
        'sales',
        staffName
      );

      this.saveEmergencySnapshot(sale.businessId);
    }
    return { sales, products: prods };
  }

  static deleteSale(saleId: string, staffName: string = 'Owner'): void {
    const sales = this.getSales();
    const target = sales.find((s) => s.id === saleId);
    const remaining = sales.filter((s) => s.id !== saleId);
    setStored(STORAGE_KEYS.SALES, remaining);
    if (target) {
      this.logActivity(
        'Sale Permanently Deleted',
        `Receipt #${target.receiptNumber} (₦${(target.totalAmount || 0).toLocaleString()}) was permanently removed from history.`,
        'sales',
        staffName
      );
    }
  }

  // Debts
  static getDebts(businessId?: string): DebtRecord[] {
    this.initialize();
    const debts = getStored<DebtRecord[]>(STORAGE_KEYS.DEBTS, SAMPLE_DEBTS);
    if (businessId) {
      return debts.filter((d) => !d.businessId || d.businessId === businessId);
    }
    return debts;
  }

  static saveDebt(debt: DebtRecord): void {
    const debts = this.getDebts();
    const idx = debts.findIndex((d) => d.id === debt.id);
    if (idx >= 0) {
      debts[idx] = debt;
    } else {
      debts.unshift(debt);
    }
    setStored(STORAGE_KEYS.DEBTS, debts);
    this.reconcileCustomerBalances(debt.businessId);
  }

  static deleteDebt(debtId: string): void {
    const debts = this.getDebts();
    const debt = debts.find((d) => d.id === debtId);
    const updated = debts.filter((d) => d.id !== debtId);
    setStored(STORAGE_KEYS.DEBTS, updated);
    if (debt) {
      this.reconcileCustomerBalances(debt.businessId);
    }
  }

  static recordDebtPayment(
    debtId: string,
    amount: number,
    paymentMethod: 'cash' | 'transfer' | 'pos',
    staffName: string,
    notes?: string
  ): void {
    const debts = this.getDebts();
    const debt = debts.find((d) => d.id === debtId);
    if (debt) {
      const payAmt = Math.min(amount, debt.balanceDue);
      debt.history.unshift({
        id: 'pay_' + Date.now(),
        amount: payAmt,
        paymentMethod,
        date: new Date().toISOString(),
        receivedByStaff: staffName,
        notes,
      });
      debt.balanceDue = Math.max(0, debt.balanceDue - payAmt);
      debt.status = debt.balanceDue === 0 ? 'settled' : 'partially_paid';
      setStored(STORAGE_KEYS.DEBTS, debts);

      // Reconcile customer balance immediately to guarantee consistency
      this.reconcileCustomerBalances(debt.businessId);
    }
  }

  static recordCustomerLumpPayment(
    customerId: string,
    amount: number,
    paymentMethod: 'cash' | 'transfer' | 'pos',
    staffName: string,
    notes?: string
  ): void {
    const debts = this.getDebts();
    // Find active debts for this customer, sorted by oldest first
    const custDebts = debts
      .filter((d) => (d.customerId === customerId || d.customerName === customerId) && d.balanceDue > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let remainingToPay = amount;
    const nowIso = new Date().toISOString();

    for (const debt of custDebts) {
      if (remainingToPay <= 0) break;
      const allocated = Math.min(remainingToPay, debt.balanceDue);
      debt.history.unshift({
        id: 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        amount: allocated,
        paymentMethod,
        date: nowIso,
        receivedByStaff: staffName,
        notes: notes ? `${notes} (Lump Settlement Allocation)` : 'Lump Settlement Allocation',
      });
      debt.balanceDue = Math.max(0, debt.balanceDue - allocated);
      debt.status = debt.balanceDue === 0 ? 'settled' : 'partially_paid';
      remainingToPay -= allocated;
    }

    setStored(STORAGE_KEYS.DEBTS, debts);

    // Update customer records and reconcile
    const custs = this.getCustomers();
    const customer = custs.find((c) => c.id === customerId);
    if (customer) {
      this.reconcileCustomerBalances(customer.businessId);
    }
  }

  // Customers
  static getCustomers(businessId?: string): Customer[] {
    this.initialize();
    const custs = getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, SAMPLE_CUSTOMERS);
    if (businessId) {
      return custs.filter((c) => !c.businessId || c.businessId === businessId);
    }
    return custs;
  }

  static saveCustomer(customer: Customer): void {
    const custs = this.getCustomers();
    const idx = custs.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      custs[idx] = customer;
    } else {
      custs.unshift(customer);
    }
    setStored(STORAGE_KEYS.CUSTOMERS, custs);
    this.reconcileCustomerBalances(customer.businessId);
  }

  static deleteCustomer(customerId: string): boolean {
    const debts = this.getDebts();
    const hasActiveDebt = debts.some((d) => d.customerId === customerId && d.balanceDue > 0);
    if (hasActiveDebt) {
      return false; // Prevent deleting customer with unpaid debt
    }
    const custs = this.getCustomers().filter((c) => c.id !== customerId);
    setStored(STORAGE_KEYS.CUSTOMERS, custs);
    return true;
  }

  // CRITICAL: Guaranteed Financial Consistency Reconciliation
  static reconcileCustomerBalances(businessId?: string): void {
    const custs = this.getCustomers();
    const debts = this.getDebts();

    let changed = false;
    for (const cust of custs) {
      if (businessId && cust.businessId && cust.businessId !== businessId) continue;
      
      // Calculate exact sum of all active unpaid debts for this customer
      const activeDebts = debts.filter(
        (d) => (d.customerId === cust.id || d.customerPhone === cust.phone) && d.balanceDue > 0
      );
      const computedDebt = activeDebts.reduce((sum, d) => sum + d.balanceDue, 0);

      if (cust.currentDebt !== computedDebt) {
        cust.currentDebt = computedDebt;
        changed = true;
      }
    }

    if (changed) {
      setStored(STORAGE_KEYS.CUSTOMERS, custs);
    }
  }

  static updateCustomerAfterSale(
    businessId: string,
    name: string,
    phone: string,
    saleAmount: number,
    debtAmount: number
  ): void {
    const custs = this.getCustomers();
    let cust = custs.find((c) => (phone && c.phone === phone) || c.name.toLowerCase() === name.toLowerCase());
    if (cust) {
      cust.totalPurchases += saleAmount;
      cust.currentDebt += debtAmount;
      cust.lastPurchaseDate = new Date().toISOString();
    } else {
      cust = {
        id: 'cust_' + Date.now(),
        businessId,
        name,
        phone,
        totalPurchases: saleAmount,
        currentDebt: debtAmount,
        lastPurchaseDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      custs.unshift(cust);
    }
    setStored(STORAGE_KEYS.CUSTOMERS, custs);
    this.reconcileCustomerBalances(businessId);
  }

  // Expenses
  static getExpenses(businessId?: string): Expense[] {
    this.initialize();
    const exps = getStored(STORAGE_KEYS.EXPENSES, SAMPLE_EXPENSES);
    if (businessId) {
      return exps.filter((e) => !e.businessId || e.businessId === businessId);
    }
    return exps;
  }

  static saveExpense(expense: Expense): void {
    const exps = this.getExpenses();
    const idx = exps.findIndex((e) => e.id === expense.id);
    if (idx >= 0) {
      exps[idx] = expense;
    } else {
      exps.unshift(expense);
    }
    setStored(STORAGE_KEYS.EXPENSES, exps);
  }

  static deleteExpense(expenseId: string): void {
    const exps = this.getExpenses().filter((e) => e.id !== expenseId);
    setStored(STORAGE_KEYS.EXPENSES, exps);
  }

  // Invoices
  static getInvoices(businessId?: string): Invoice[] {
    this.initialize();
    const invs = getStored(STORAGE_KEYS.INVOICES, SAMPLE_INVOICES);
    if (businessId) {
      return invs.filter((i) => !i.businessId || i.businessId === businessId);
    }
    return invs;
  }

  static saveInvoice(invoice: Invoice, staffName: string = 'Staff'): void {
    const invs = this.getInvoices();
    const idx = invs.findIndex((i) => i.id === invoice.id);
    const isNew = idx < 0;
    if (idx >= 0) {
      invs[idx] = invoice;
    } else {
      invs.unshift(invoice);
    }
    setStored(STORAGE_KEYS.INVOICES, invs);
    this.logActivity(
      isNew ? 'Invoice Generated' : 'Invoice Updated',
      `${invoice.documentType ? invoice.documentType.toUpperCase() : 'Invoice'} #${invoice.invoiceNumber} for ${invoice.customerName} (Total: ₦${(invoice.totalAmount || 0).toLocaleString()}, Bal: ₦${(invoice.balanceDue || 0).toLocaleString()}).`,
      'invoice',
      staffName
    );
  }

  static recordInvoicePayment(
    invoiceId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    staffName: string,
    reference?: string,
    notes?: string
  ): Invoice | null {
    const invs = this.getInvoices();
    const inv = invs.find((i) => i.id === invoiceId);
    if (!inv) return null;

    if (!inv.paymentHistory) {
      inv.paymentHistory = [];
    }

    const paymentRecord: InvoicePaymentRecord = {
      id: 'inv_pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      amount,
      date: new Date().toISOString(),
      paymentMethod,
      reference,
      notes,
      receivedByStaff: staffName,
    };

    inv.paymentHistory.unshift(paymentRecord);
    inv.amountPaid = (inv.amountPaid || 0) + amount;
    inv.balanceDue = Math.max(0, inv.totalAmount - inv.amountPaid);
    inv.status = inv.balanceDue === 0 ? 'paid' : 'partial';

    setStored(STORAGE_KEYS.INVOICES, invs);
    this.logActivity(
      'Invoice Payment Received',
      `Payment of ₦${amount.toLocaleString()} received for Invoice #${inv.invoiceNumber} (${inv.customerName}) via ${paymentMethod}. New Bal: ₦${inv.balanceDue.toLocaleString()}.`,
      'invoice',
      staffName
    );
    return inv;
  }

  static deleteInvoice(invoiceId: string, staffName: string = 'Staff'): void {
    const invs = this.getInvoices();
    const target = invs.find((i) => i.id === invoiceId);
    const updated = invs.filter((i) => i.id !== invoiceId);
    setStored(STORAGE_KEYS.INVOICES, updated);
    if (target) {
      this.logActivity(
        'Invoice Deleted',
        `Invoice #${target.invoiceNumber} for ${target.customerName} was deleted.`,
        'invoice',
        staffName
      );
    }
  }

  // Solana Blockchain Transactions & Records
  static getSolanaTransactions(businessId?: string): SolanaTransaction[] {
    this.initialize();
    const txs = getStored(STORAGE_KEYS.SOLANA_TRANSACTIONS, SAMPLE_SOLANA_TRANSACTIONS);
    if (businessId) {
      return txs.filter((t: SolanaTransaction) => !t.businessId || t.businessId === businessId);
    }
    return txs;
  }

  static saveSolanaTransaction(tx: SolanaTransaction, staffName: string = 'Staff'): void {
    const txs = this.getSolanaTransactions();
    const idx = txs.findIndex(
      (t) => t.id === tx.id || (tx.signature && tx.signature.length > 20 && t.signature === tx.signature)
    );
    const isNew = idx < 0;
    if (idx >= 0) {
      txs[idx] = { ...txs[idx], ...tx };
    } else {
      txs.unshift(tx);
    }
    setStored(STORAGE_KEYS.SOLANA_TRANSACTIONS, txs);
    this.logActivity(
      isNew ? 'Solana Payment Recorded' : 'Solana Tx Updated',
      `${tx.type.toUpperCase()} on-chain record ${tx.signature ? tx.signature.slice(0, 8) + '...' : ''} status: ${tx.status.toUpperCase()} (${tx.amountUsdc} USDC ≈ ₦${(tx.amountNgn || 0).toLocaleString()})`,
      'financial',
      staffName
    );
  }

  static updateSolanaTransaction(id: string, updates: Partial<SolanaTransaction>): void {
    const txs = this.getSolanaTransactions();
    const idx = txs.findIndex((t) => t.id === id);
    if (idx >= 0) {
      txs[idx] = { ...txs[idx], ...updates };
      setStored(STORAGE_KEYS.SOLANA_TRANSACTIONS, txs);
    }
  }

  static deleteSolanaTransaction(id: string, staffName: string = 'Staff'): void {
    const txs = this.getSolanaTransactions();
    const target = txs.find((t) => t.id === id);
    const updated = txs.filter((t) => t.id !== id);
    setStored(STORAGE_KEYS.SOLANA_TRANSACTIONS, updated);
    if (target) {
      this.logActivity(
        'Solana Tx Removed',
        `On-chain record for ${target.amountUsdc} USDC (${target.signature.slice(0, 8)}...) removed.`,
        'financial',
        staffName
      );
    }
  }

  // Notifications
  static getNotifications(businessId?: string): AppNotification[] {
    this.initialize();
    const notifs = getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const filtered = businessId ? notifs.filter((n) => !n.businessId || n.businessId === businessId) : notifs;
    return filtered.map((n) => ({
      ...n,
      read: n.read ?? n.isRead ?? false,
    }));
  }

  static addNotification(notif: AppNotification, businessId?: string): void {
    const notifs = getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    notifs.unshift({
      ...notif,
      businessId: businessId || notif.businessId,
      read: false,
      isRead: false,
    });
    if (notifs.length > 100) notifs.length = 100;
    setStored(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  static markNotificationRead(notifId: string): void {
    const notifs = getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const item = notifs.find((n) => n.id === notifId);
    if (item) {
      item.read = true;
      item.isRead = true;
      setStored(STORAGE_KEYS.NOTIFICATIONS, notifs);
    }
  }

  static clearNotifications(businessId?: string): void {
    if (businessId) {
      const notifs = getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
      const remaining = notifs.filter((n) => n.businessId && n.businessId !== businessId);
      setStored(STORAGE_KEYS.NOTIFICATIONS, remaining);
    } else {
      setStored(STORAGE_KEYS.NOTIFICATIONS, []);
    }
  }

  // Audit Logs & Activity Tracker
  static getAuditLogs(businessId?: string): AuditLog[] {
    this.initialize();
    return getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, SAMPLE_AUDIT_LOGS);
  }

  static logActivity(
    action: string,
    details: string,
    entityType: AuditLog['entityType'] | string = 'system',
    staffName?: string,
    businessId?: string
  ): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      action,
      details,
      staffName: staffName || 'System Admin',
      timestamp: new Date().toISOString(),
      entityType: (entityType as AuditLog['entityType']) || 'system',
    };
    logs.unshift(newLog);
    // Keep max 250 logs for smooth storage performance
    if (logs.length > 250) {
      logs.length = 250;
    }
    setStored(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  static clearAuditLogs(businessId?: string): void {
    setStored(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  // Data Export Utilities (CSV)
  static exportSalesCSV(businessId?: string): string {
    const sales = this.getSales(businessId);
    const headers = [
      'Receipt #',
      'Date & Time',
      'Cashier',
      'Customer',
      'Items Count',
      'Items Summary',
      'Payment Method',
      'Subtotal',
      'Discount',
      'Tax',
      'Total Amount',
      'Profit',
      'Status',
    ];

    const rows = sales.map((s) => {
      const itemsSummary = (s.items || [])
        .map((i) => `${i.productName} (x${i.quantity})`)
        .join('; ');
      return [
        s.receiptNumber,
        s.createdAt || s.date || '',
        `"${s.staffName}"`,
        `"${s.customerName || 'Walk-in'}"`,
        (s.items || []).length,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        s.paymentMethod,
        s.subtotal || 0,
        s.discountAmount || 0,
        s.taxAmount || 0,
        s.totalAmount || s.total || 0,
        s.profit || 0,
        s.status,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  static exportProductsCSV(businessId?: string): string {
    const products = this.getProducts(businessId);
    const headers = [
      'Product ID',
      'SKU',
      'Barcode',
      'Name',
      'Category',
      'Cost Price (NGN)',
      'Selling Price (NGN)',
      'Profit Margin (NGN)',
      'Markup (%)',
      'Stock Quantity',
      'Unit',
      'Min Stock Threshold',
      'Status',
      'Total Stock Value (Cost)',
      'Total Stock Value (Retail)',
    ];

    const rows = products.map((p) => {
      const margin = p.sellingPrice - p.costPrice;
      const markupPct = p.costPrice > 0 ? Math.round((margin / p.costPrice) * 100) : 0;
      const totalCostVal = p.stockQuantity * p.costPrice;
      const totalRetailVal = p.stockQuantity * p.sellingPrice;

      return [
        p.id,
        `"${p.sku || ''}"`,
        `"${p.barcode || ''}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category.replace(/"/g, '""')}"`,
        p.costPrice,
        p.sellingPrice,
        margin,
        `${markupPct}%`,
        p.stockQuantity,
        p.unit || 'pcs',
        p.minStockThreshold,
        p.isActive ? 'Active' : 'Archived',
        totalCostVal,
        totalRetailVal,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  static exportDebtsCSV(businessId?: string): string {
    const debts = this.getDebts(businessId);
    const headers = [
      'Debt ID',
      'Customer Name',
      'Customer Phone',
      'Initial Amount (NGN)',
      'Balance Due (NGN)',
      'Due Date',
      'Status',
      'Receipt #',
      'Created Date',
      'Notes',
    ];

    const rows = debts.map((d) => [
      d.id,
      `"${d.customerName.replace(/"/g, '""')}"`,
      `"${d.customerPhone || ''}"`,
      d.initialAmount,
      d.balanceDue,
      d.dueDate || '',
      d.status,
      `"${d.receiptNumber || ''}"`,
      d.createdAt || '',
      `"${(d.notes || '').replace(/"/g, '""')}"`,
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  static exportCustomersCSV(businessId?: string): string {
    const customers = this.getCustomers(businessId);
    const headers = [
      'Customer ID',
      'Name',
      'Phone Number',
      'Email',
      'Address',
      'Total Lifetime Purchases (NGN)',
      'Current Outstanding Debt (NGN)',
      'Last Purchase Date',
      'Notes',
    ];

    const rows = customers.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.totalPurchases || 0,
      c.currentDebt || 0,
      c.lastPurchaseDate || '',
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  static exportExpensesCSV(businessId?: string): string {
    const expenses = this.getExpenses(businessId);
    const headers = [
      'Expense ID',
      'Date & Time',
      'Category',
      'Description / Title',
      'Amount (NGN)',
      'Payment Method',
      'Recorded By',
      'Receipt Notes',
    ];

    const rows = expenses.map((e) => [
      e.id,
      e.date,
      e.category,
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount,
      e.paymentMethod,
      `"${e.recordedBy}"`,
      `"${(e.receiptNote || '').replace(/"/g, '""')}"`,
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  static exportInvoicesCSV(businessId?: string): string {
    const invoices = this.getInvoices(businessId);
    const headers = [
      'Invoice #',
      'Customer Name',
      'Customer Phone',
      'Issue Date',
      'Due Date',
      'Subtotal (NGN)',
      'Discount (NGN)',
      'Tax (NGN)',
      'Total Amount (NGN)',
      'Amount Paid (NGN)',
      'Balance Due (NGN)',
      'Status',
    ];

    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      `"${inv.customerName.replace(/"/g, '""')}"`,
      `"${inv.customerPhone}"`,
      inv.issueDate,
      inv.dueDate,
      inv.subtotal,
      inv.discountAmount || 0,
      inv.taxAmount || 0,
      inv.totalAmount,
      inv.amountPaid,
      inv.balanceDue,
      inv.status,
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  static exportAuditLogsCSV(businessId?: string): string {
    const logs = this.getAuditLogs(businessId);
    const headers = ['Log ID', 'Timestamp', 'Staff Member', 'Action', 'Category', 'Details'];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.staffName}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      l.entityType,
      `"${l.details.replace(/"/g, '""')}"`,
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  static downloadCSVFile(arg1: string, arg2: string): void {
    // Robust argument order detection (handles (filename, csvContent) or (csvContent, filename))
    const isArg1Filename = arg1.toLowerCase().endsWith('.csv');
    const filename = isArg1Filename ? arg1 : arg2;
    const csvContent = isArg1Filename ? arg2 : arg1;

    // Add UTF-8 BOM so Excel opens Nigerian Naira and special characters properly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Backup and Restore
  static exportFullBackupJSON(): string {
    const backup: AppDataBackup = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      business: this.getActiveBusiness(),
      businessesList: this.getAllBusinesses(),
      staffUsers: this.getStaff(),
      customRoles: this.getCustomRoles(),
      products: this.getProducts(),
      sales: this.getSales(),
      customers: this.getCustomers(),
      debts: this.getDebts(),
      expenses: this.getExpenses(),
      invoices: this.getInvoices(),
      solanaTransactions: this.getSolanaTransactions(),
      auditLogs: this.getAuditLogs(),
    };
    return JSON.stringify(backup, null, 2);
  }

  static importFullBackupJSON(jsonString: string): boolean {
    try {
      const parsed: AppDataBackup = JSON.parse(jsonString);
      if (!parsed.business || !parsed.products) return false;
      setStored(STORAGE_KEYS.CURRENT_BIZ, parsed.business);
      if (parsed.businessesList) setStored(STORAGE_KEYS.ALL_BIZ, parsed.businessesList);
      if (parsed.staffUsers) setStored(STORAGE_KEYS.STAFF_USERS, parsed.staffUsers);
      if (parsed.customRoles) setStored(STORAGE_KEYS.CUSTOM_ROLES, parsed.customRoles);
      if (parsed.products) setStored(STORAGE_KEYS.PRODUCTS, parsed.products);
      if (parsed.sales) setStored(STORAGE_KEYS.SALES, parsed.sales);
      if (parsed.customers) setStored(STORAGE_KEYS.CUSTOMERS, parsed.customers);
      if (parsed.debts) setStored(STORAGE_KEYS.DEBTS, parsed.debts);
      if (parsed.expenses) setStored(STORAGE_KEYS.EXPENSES, parsed.expenses);
      if (parsed.invoices) setStored(STORAGE_KEYS.INVOICES, parsed.invoices);
      if (parsed.solanaTransactions) setStored(STORAGE_KEYS.SOLANA_TRANSACTIONS, parsed.solanaTransactions);
      if (parsed.auditLogs) setStored(STORAGE_KEYS.AUDIT_LOGS, parsed.auditLogs);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears all database records and returns store to a pristine, clean-slate state with no demo data.
   */
  static clearAllStoreData(): void {
    localStorage.clear();
    this.initialize();
  }

  static resetToDemoData(): void {
    this.clearAllStoreData();
  }

  // --- OFFLINE SYNC QUEUE & IDEMPOTENCY ENGINE ---

  static isIdempotencyProcessed(key: string): boolean {
    if (!key) return false;
    const list = getStored<string[]>(STORAGE_KEYS.PROCESSED_IDEMPOTENCY, []);
    return list.includes(key);
  }

  static markIdempotencyProcessed(key: string): void {
    if (!key) return;
    const list = getStored<string[]>(STORAGE_KEYS.PROCESSED_IDEMPOTENCY, []);
    if (!list.includes(key)) {
      list.push(key);
      if (list.length > 1000) {
        list.splice(0, list.length - 1000);
      }
      setStored(STORAGE_KEYS.PROCESSED_IDEMPOTENCY, list);
    }
  }

  static getSyncQueue(businessId?: string): SyncQueueItem[] {
    const queue = getStored<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
    if (businessId) {
      return queue.filter((item) => !item.businessId || item.businessId === businessId);
    }
    return queue;
  }

  static enqueueSync(item: {
    businessId: string;
    entityType: SyncQueueItem['entityType'];
    action: SyncQueueItem['action'];
    payload: any;
    summary: string;
    idempotencyKey?: string;
  }): SyncQueueItem {
    const queue = getStored<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
    const queueItem: SyncQueueItem = {
      id: 'sq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      idempotencyKey: item.idempotencyKey || ('idem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
      businessId: item.businessId,
      entityType: item.entityType,
      action: item.action,
      payload: item.payload,
      summary: item.summary,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };
    queue.push(queueItem);
    setStored(STORAGE_KEYS.SYNC_QUEUE, queue);
    return queueItem;
  }

  static updateQueueItem(id: string, updates: Partial<SyncQueueItem>): void {
    const queue = getStored<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
    const idx = queue.findIndex((q) => q.id === id);
    if (idx >= 0) {
      queue[idx] = { ...queue[idx], ...updates };
      setStored(STORAGE_KEYS.SYNC_QUEUE, queue);
    }
  }

  static removeQueueItem(id: string): void {
    const queue = getStored<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
    const updated = queue.filter((q) => q.id !== id);
    setStored(STORAGE_KEYS.SYNC_QUEUE, updated);
  }

  static markQueueItemSynced(id: string): void {
    this.updateQueueItem(id, { status: 'synced' });
    setStored(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  static clearSyncedQueue(): void {
    const queue = getStored<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
    const remaining = queue.filter((q) => q.status !== 'synced');
    setStored(STORAGE_KEYS.SYNC_QUEUE, remaining);
  }

  static getSyncSummary(businessId?: string): OfflineSyncSummary {
    const queue = this.getSyncQueue(businessId);
    const pendingCount = queue.filter((q) => q.status === 'pending' || q.status === 'syncing').length;
    const syncedCount = queue.filter((q) => q.status === 'synced').length;
    const failedCount = queue.filter((q) => q.status === 'failed').length;
    const lastSyncedAt = getStored<string | null>(STORAGE_KEYS.LAST_SYNC, null);

    return {
      pendingCount,
      syncedCount,
      failedCount,
      lastSyncedAt,
      isSyncing: false,
    };
  }

  // --- POS CART DRAFT PERSISTENCE & CRASH RECOVERY ---

  static saveCartDraft(draft: CartDraft): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.CART_DRAFT}${draft.businessId}`, JSON.stringify(draft));
    } catch (e) {
      console.error('Error saving cart draft:', e);
    }
  }

  static getCartDraft(businessId: string): CartDraft | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEYS.CART_DRAFT}${businessId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static clearCartDraft(businessId: string): void {
    try {
      localStorage.removeItem(`${STORAGE_KEYS.CART_DRAFT}${businessId}`);
    } catch {}
  }

  // --- EMERGENCY AUTO-SNAPSHOT STORAGE ---

  static saveEmergencySnapshot(businessId?: string): void {
    try {
      const snapshot = this.exportFullBackupJSON();
      localStorage.setItem(STORAGE_KEYS.EMERGENCY_SNAPSHOT, snapshot);
      idbMirror.set(STORAGE_KEYS.EMERGENCY_SNAPSHOT, snapshot).catch(() => {});
    } catch {}
  }

  static getEmergencySnapshot(): AppDataBackup | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EMERGENCY_SNAPSHOT);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

export const storageService = BusinessStorageService;

