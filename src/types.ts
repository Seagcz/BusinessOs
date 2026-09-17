export type UserRole =
  | 'owner'
  | 'manager'
  | 'cashier'
  | 'inventory_manager'
  | 'inventory_clerk'
  | 'accountant'
  | 'custom'
  | string;

export type StaffRole = UserRole;

export interface StaffPermissions {
  // Sales & POS
  canRecordSales: boolean;
  canVoidSales: boolean;
  canDeleteSales: boolean; // SENSITIVE: permanently delete sales
  canApplyDiscounts: boolean;

  // Privacy & Pricing Restrictions
  canViewProfit: boolean; // SENSITIVE: view margins and net profit
  canViewCostPrice: boolean; // SENSITIVE: view wholesale unit cost
  canChangePrices: boolean; // SENSITIVE: edit selling or cost prices

  // Inventory & Stock
  canManageInventory: boolean;
  canDeleteProducts: boolean;

  // Financial & Ledgers
  canManageExpenses: boolean;
  canManageDebts: boolean;
  canManageInvoices: boolean;

  // Reports & Analytics
  canViewReports: boolean;
  canViewFinancialReports: boolean;

  // Admin & Security
  canExportData: boolean;
  canManageStaff: boolean;
  canManageRoles: boolean; // SENSITIVE: create/edit custom roles (Owner privilege)
  canEditSettings: boolean;
  canManageBackups: boolean;
  canViewAuditLogs: boolean;
}

export interface CustomRole {
  id: string;
  businessId: string;
  name: string;
  description: string;
  badgeColor: string;
  permissions: StaffPermissions;
  createdAt: string;
  isSystem?: boolean;
}

export type NavigationTab =
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'debts'
  | 'expenses'
  | 'invoices'
  | 'reports'
  | 'admin';

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

export interface BusinessProfile {
  id: string;
  name: string;
  tagline?: string;
  category?: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  cacNumber?: string;
  tinNumber?: string;
  logoEmoji?: string;
  bankAccounts: BankAccount[];
  currencyCode: 'NGN' | 'USD' | 'GBP' | 'EUR' | 'GHS' | 'KES' | 'RAW' | string;
  currencySymbol: string;
  showCurrencySymbol?: boolean;
  taxRate?: number; // percentage (e.g., 7.5% VAT)
  taxInclusive?: boolean;
  defaultDiscount?: number; // max or default discount %
  creditGracePeriodDays?: number; // e.g. 7 or 14 days
  startingCashFloat?: number; // e.g. 10000
  lowStockGlobalThreshold?: number;
  enableLowStockAlert?: boolean;
  enableOverdueDebtAlert?: boolean;
  enableDailyClosingAlert?: boolean;
  enableWhatsAppReceipt?: boolean;
  receiptFooterMessage?: string;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  businessId?: string;
  name: string;
  role: StaffRole;
  customRoleId?: string;
  customRoleName?: string;
  pin: string; // 4-digit PIN for quick cashier login
  password?: string; // Optional master password for admin / secure portal login
  hasCreatedCredentials?: boolean; // Indicates if user has completed initial PIN/password setup
  mustChangePinOnNextLogin?: boolean; // Force user to set their own PIN upon next login
  email?: string;
  avatarColor?: string;
  phone?: string;
  isActive: boolean;
  
  // Granular Permissions
  canRecordSales?: boolean;
  canVoidSales?: boolean;
  canDeleteSales?: boolean; // SENSITIVE
  canApplyDiscounts?: boolean;
  canViewProfit?: boolean; // SENSITIVE
  canViewCostPrice?: boolean; // SENSITIVE
  canChangePrices?: boolean; // SENSITIVE
  canManageInventory?: boolean;
  canDeleteProducts?: boolean;
  canManageExpenses?: boolean;
  canManageDebts?: boolean;
  canManageInvoices?: boolean;
  canViewReports?: boolean;
  canViewFinancialReports?: boolean;
  canExportData?: boolean;
  canManageStaff?: boolean;
  canManageRoles?: boolean;
  canEditSettings?: boolean;
  canManageBackups?: boolean;
  canViewAuditLogs?: boolean;
  
  lastLogin?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  category: string;
  sku: string;
  barcode?: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockThreshold: number;
  unit: string; // pcs, carton, pack, kg, litre, roll, plate, bottle, pair
  imageEmoji?: string;
  description?: string;
  isActive: boolean;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
  unit?: string;
}

export type PaymentMethod = 'cash' | 'transfer' | 'pos' | 'credit' | 'split';

export interface SplitPaymentDetail {
  cash?: number;
  transfer?: number;
  pos?: number;
  credit?: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  businessId: string;
  staffId: string;
  staffName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  total?: number; // alias
  totalCost: number;
  costTotal?: number; // alias
  profit: number;
  paymentMethod: PaymentMethod;
  splitPayments?: SplitPaymentDetail;
  bankTransferReference?: string;
  isCredit: boolean;
  debtDueDate?: string;
  notes?: string;
  status: 'completed' | 'voided' | 'refunded';
  voidReason?: string;
  createdAt: string;
  date?: string; // alias for createdAt
  isSynced: boolean;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  currentDebt: number;
  lastPurchaseDate?: string;
  notes?: string;
  createdAt: string;
}

export interface DebtPaymentHistory {
  id: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'pos';
  date: string;
  receivedByStaff: string;
  notes?: string;
}

export interface DebtRecord {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  saleId?: string;
  receiptNumber?: string;
  initialAmount: number;
  balanceDue: number;
  dueDate?: string;
  notes?: string;
  status: 'active' | 'partially_paid' | 'settled' | 'overdue';
  history: DebtPaymentHistory[];
  createdAt: string;
}

export type ExpenseCategory =
  | 'generator_fuel'
  | 'electricity_nepa'
  | 'rent'
  | 'staff_salaries'
  | 'transport_dispatch'
  | 'packaging'
  | 'maintenance'
  | 'supplies'
  | 'tax_levies'
  | 'marketing'
  | 'personal_drawings'
  | 'other';

export interface Expense {
  id: string;
  businessId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'pos';
  date: string;
  recordedBy: string;
  receiptNote?: string;
  isRecurring?: boolean;
  isSynced: boolean;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountPercent?: number;
  amount: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type InvoiceDocumentType = 'invoice' | 'proforma' | 'quotation' | 'receipt';

export interface InvoicePaymentRecord {
  id: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  receivedByStaff: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  documentType?: InvoiceDocumentType; // 'invoice' | 'proforma' | 'quotation' | 'receipt'
  businessId: string;
  customerId?: string;
  customerName: string;
  customerCompany?: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  shippingFee?: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  paymentHistory?: InvoicePaymentRecord[];
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  notes?: string;
  terms?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  staffName: string;
  timestamp: string;
  entityType:
    | 'sale'
    | 'product'
    | 'expense'
    | 'debt'
    | 'invoice'
    | 'business'
    | 'staff'
    | 'financial'
    | 'backup'
    | 'system';
}

export interface AppNotification {
  id: string;
  businessId?: string;
  type: 'low_stock' | 'debt_overdue' | 'daily_closing' | 'backup_reminder' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead?: boolean;
  read?: boolean;
  linkTab?: NavigationTab;
  linkId?: string;
}

export interface AppDataBackup {
  version: string;
  exportDate: string;
  business: BusinessProfile;
  businessesList: BusinessProfile[];
  staffUsers: StaffUser[];
  customRoles?: CustomRole[];
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  debts: DebtRecord[];
  expenses: Expense[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
}

export interface SyncQueueItem {
  id: string;
  idempotencyKey: string;
  businessId: string;
  entityType: 'sale' | 'product' | 'debt' | 'expense' | 'invoice' | 'customer';
  action: 'create' | 'update' | 'delete' | 'payment' | 'restock' | 'void';
  payload: any;
  summary: string;
  timestamp: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  errorMessage?: string;
  retryCount: number;
}

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'offline';
  downlink?: number; // Mb/s
  rtt?: number; // ms latency
  saveData?: boolean;
}

export interface OfflineSyncSummary {
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  lastSyncedAt: string | null;
  isSyncing: boolean;
}

export interface CartDraft {
  businessId: string;
  items: SaleItem[];
  customerId: string;
  discountAmount: number;
  applyTax: boolean;
  notes: string;
  updatedAt: string;
}
