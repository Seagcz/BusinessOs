import { BusinessProfile, StaffUser, Product, Customer, Expense, DebtRecord, Invoice, CustomRole, StaffPermissions, SolanaTransaction } from '../types';

export const SYSTEM_ROLE_PRESETS: Record<
  string,
  {
    roleId: string;
    title: string;
    description: string;
    badgeColor: string;
    permissions: StaffPermissions;
  }
> = {
  owner: {
    roleId: 'owner',
    title: 'Business Owner / Director',
    description: 'Full unrestricted master access to financial profits, staff administration, settings and database backups.',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    permissions: {
      canRecordSales: true,
      canVoidSales: true,
      canDeleteSales: true,
      canApplyDiscounts: true,
      canViewProfit: true,
      canViewCostPrice: true,
      canChangePrices: true,
      canManageInventory: true,
      canDeleteProducts: true,
      canManageExpenses: true,
      canManageDebts: true,
      canManageInvoices: true,
      canViewReports: true,
      canViewFinancialReports: true,
      canExportData: true,
      canManageStaff: true,
      canManageRoles: true,
      canEditSettings: true,
      canManageBackups: true,
      canViewAuditLogs: true,
    },
  },
  manager: {
    roleId: 'manager',
    title: 'Store / Shop Manager',
    description: 'Supervises daily operations, stock management, voids, cashier oversight, and general reports.',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
    permissions: {
      canRecordSales: true,
      canVoidSales: true,
      canDeleteSales: false, // Protected action (Owner privilege)
      canApplyDiscounts: true,
      canViewProfit: true,
      canViewCostPrice: true,
      canChangePrices: true,
      canManageInventory: true,
      canDeleteProducts: false,
      canManageExpenses: true,
      canManageDebts: true,
      canManageInvoices: true,
      canViewReports: true,
      canViewFinancialReports: true,
      canExportData: true,
      canManageStaff: true,
      canManageRoles: false,
      canEditSettings: false,
      canManageBackups: false,
      canViewAuditLogs: true,
    },
  },
  cashier: {
    roleId: 'cashier',
    title: 'Sales Cashier / Counter',
    description: 'Front-counter sales ring, payment collection, and receipts. Sensitive cost prices and profit margins are locked.',
    badgeColor: 'bg-sky-950 text-sky-300 border-sky-800',
    permissions: {
      canRecordSales: true,
      canVoidSales: false, // Requires supervisor/manager
      canDeleteSales: false, // Forbidden
      canApplyDiscounts: false,
      canViewProfit: false, // RESTRICTED: Hidden from cashier
      canViewCostPrice: false, // RESTRICTED: Hidden from cashier
      canChangePrices: false, // RESTRICTED: Locked
      canManageInventory: false,
      canDeleteProducts: false,
      canManageExpenses: false,
      canManageDebts: true, // Can record customer credit / debt collection at register
      canManageInvoices: false,
      canViewReports: false,
      canViewFinancialReports: false,
      canExportData: false,
      canManageStaff: false,
      canManageRoles: false,
      canEditSettings: false,
      canManageBackups: false,
      canViewAuditLogs: false,
    },
  },
  inventory_manager: {
    roleId: 'inventory_manager',
    title: 'Inventory & Stock Manager',
    description: 'Manages products, incoming supplier restocks, purchase cost updates, and low-stock alerts without sales profit access.',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
    permissions: {
      canRecordSales: false,
      canVoidSales: false,
      canDeleteSales: false,
      canApplyDiscounts: false,
      canViewProfit: false, // RESTRICTED: Cannot view retail sales margin/profit
      canViewCostPrice: true, // Needs cost price for restock calculation
      canChangePrices: true, // Can update supplier unit costs & catalog selling prices
      canManageInventory: true,
      canDeleteProducts: true,
      canManageExpenses: false,
      canManageDebts: false,
      canManageInvoices: false,
      canViewReports: true, // Inventory stock valuation reports
      canViewFinancialReports: false,
      canExportData: true, // Stock CSV export
      canManageStaff: false,
      canManageRoles: false,
      canEditSettings: false,
      canManageBackups: false,
      canViewAuditLogs: false,
    },
  },
  accountant: {
    roleId: 'accountant',
    title: 'Financial Accountant / Auditor',
    description: 'Financial ledger oversight, operating expenses, receivables/debt recovery, tax/VAT accounting, and P&L reports.',
    badgeColor: 'bg-teal-950 text-teal-300 border-teal-800',
    permissions: {
      canRecordSales: false,
      canVoidSales: false,
      canDeleteSales: false,
      canApplyDiscounts: false,
      canViewProfit: true, // Essential for P&L analysis
      canViewCostPrice: true,
      canChangePrices: false, // Cannot alter live store prices
      canManageInventory: false,
      canDeleteProducts: false,
      canManageExpenses: true,
      canManageDebts: true,
      canManageInvoices: true,
      canViewReports: true,
      canViewFinancialReports: true,
      canExportData: true,
      canManageStaff: false,
      canManageRoles: false,
      canEditSettings: false,
      canManageBackups: false,
      canViewAuditLogs: true,
    },
  },
};

export const INITIAL_CUSTOM_ROLES: CustomRole[] = [
  {
    id: 'role_supervisor',
    businessId: 'biz_001',
    name: 'Shift Supervisor',
    description: 'Senior cashier with permission to void wrong sales and apply approved discount rates.',
    badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    permissions: {
      canRecordSales: true,
      canVoidSales: true,
      canDeleteSales: false,
      canApplyDiscounts: true,
      canViewProfit: false,
      canViewCostPrice: false,
      canChangePrices: false,
      canManageInventory: true,
      canDeleteProducts: false,
      canManageExpenses: true,
      canManageDebts: true,
      canManageInvoices: true,
      canViewReports: false,
      canViewFinancialReports: false,
      canExportData: false,
      canManageStaff: false,
      canManageRoles: false,
      canEditSettings: false,
      canManageBackups: false,
      canViewAuditLogs: true,
    },
    createdAt: new Date().toISOString(),
  },
];

export const NIGERIAN_BANKS = [
  'Moniepoint Microfinance Bank',
  'OPay Digital Services',
  'PalmPay',
  'Kuda Microfinance Bank',
  'Guaranty Trust Bank (GTBank)',
  'Zenith Bank',
  'Access Bank',
  'First Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Stanbic IBTC Bank',
  'FCMB (First City Monument Bank)',
  'Fidelity Bank',
  'Sterling Bank',
  'Wema Bank / ALAT',
  'Union Bank',
  'Providus Bank',
  'Ecobank Nigeria',
  'Jaiz Bank',
  'Taj Bank',
  'Polaris Bank',
  'Keystone Bank',
  'FairMoney MFB',
  'VFD Microfinance Bank',
];

export const NIGERIAN_STATES = [
  'Lagos', 'Abuja (FCT)', 'Rivers (Port Harcourt)', 'Kano', 'Oyo (Ibadan)', 
  'Anambra (Onitsha/Awka)', 'Enugu', 'Delta (Warri/Asaba)', 'Edo (Benin)', 
  'Ogun (Abeokuta)', 'Kaduna', 'Imo (Owerri)', 'Abia (Aba/Umuahia)', 
  'Akwa Ibom (Uyo)', 'Cross River (Calabar)', 'Plateau (Jos)', 'Kwara (Ilorin)', 
  'Osun (Osogbo)', 'Ondo (Akure)', 'Benue', 'Borno', 'Gombe', 'Nasarawa', 'Niger'
];

export const PRODUCT_CATEGORIES = [
  'Provisions & Groceries',
  'Drinks & Beverages',
  'Electronics & Gadgets',
  'Fashion, Fabrics & Shoes',
  'Beauty, Perfumes & Hair',
  'Pharmacy & Toiletries',
  'Food & Restaurant/Chop',
  'Hardware & Building',
  'Automotive & Spares',
  'Services & Repairs',
  'Stationery & Office',
  'General Merchandise',
];

export const EXPENSE_CATEGORIES_CONFIG: Record<string, { label: string; iconEmoji: string; defaultDescription: string }> = {
  generator_fuel: { label: 'Generator Fuel / Petrol', iconEmoji: '⛽', defaultDescription: 'Fuel for shop generator (PMS)' },
  electricity_nepa: { label: 'Electricity / NEPA / Disco Token', iconEmoji: '💡', defaultDescription: 'Prepaid meter electricity recharge' },
  rent: { label: 'Shop Rent & Space', iconEmoji: '🏪', defaultDescription: 'Monthly/Quarterly shop rent contribution' },
  staff_salaries: { label: 'Staff Wages & Daily Allowance', iconEmoji: '👥', defaultDescription: 'Sales girl / boy daily stipend & salary' },
  transport_dispatch: { label: 'Transport & Dispatch Logistics', iconEmoji: '🛵', defaultDescription: 'Market errand fare & dispatch delivery' },
  packaging: { label: 'Nylon Bags & Packaging', iconEmoji: '🛍️', defaultDescription: 'Branded nylon bags & takeaway packs' },
  maintenance: { label: 'Repairs & Generator Servicing', iconEmoji: '🔧', defaultDescription: 'Generator oil change / AC fixing' },
  supplies: { label: 'Shop Supplies & Cleaning', iconEmoji: '🧹', defaultDescription: 'Detergents, receipt paper roll & bulbs' },
  tax_levies: { label: 'Market Dues, LGA & Security Levy', iconEmoji: '📑', defaultDescription: 'Market association & LGA tickets' },
  marketing: { label: 'Adverts & Broadcast Promotion', iconEmoji: '📢', defaultDescription: 'WhatsApp status promos & banners' },
  personal_drawings: { label: 'Owner Withdrawal / Chop Money', iconEmoji: '💼', defaultDescription: 'Owner daily upkeep cash withdrawal' },
  other: { label: 'Miscellaneous / Other', iconEmoji: '📦', defaultDescription: 'General unexpected expenses' },
};

export const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  id: 'biz_001',
  name: 'My Store',
  tagline: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: 'Lagos',
  cacNumber: '',
  logoEmoji: '🏪',
  privateAccountNumber: '',
  privateAccountBank: 'Moniepoint Microfinance Bank',
  privateAccountName: '',
  bankAccounts: [],
  currencyCode: 'NGN',
  currencySymbol: '₦',
  showCurrencySymbol: true, // Configurable optional currency display
  taxRate: 0, // No VAT by default for micro retailers
  defaultDiscount: 0,
  lowStockGlobalThreshold: 5,
  receiptFooterMessage: 'Thank you for your patronage! Goods sold in good condition cannot be returned after 48 hours.',
  // Solana Settlement Configuration (Linked with Private Account)
  solanaWalletAddress: '',
  solanaUsdcEnabled: true,
  solanaUsdcNgnRate: 1550,
  solanaCluster: 'mainnet-beta',
  isConfigured: false,
  createdAt: new Date().toISOString(),
};

export const INITIAL_STAFF: StaffUser[] = [
  {
    id: 'staff_1',
    name: 'Business Owner',
    role: 'owner',
    pin: '1234',
    avatarColor: 'bg-emerald-600',
    phone: '',
    isActive: true,
    ...SYSTEM_ROLE_PRESETS.owner.permissions,
    createdAt: new Date().toISOString(),
  },
];

export const SAMPLE_PRODUCTS: Product[] = [];

export const SAMPLE_CUSTOMERS: Customer[] = [];

export const SAMPLE_DEBTS: DebtRecord[] = [];

export const SAMPLE_EXPENSES: Expense[] = [];

export const SAMPLE_INVOICES: Invoice[] = [];

export const SAMPLE_AUDIT_LOGS = [
  {
    id: 'log_init',
    action: 'System Initialized',
    details: 'Fresh business operations workspace initialized. Ready for real business operations.',
    staffName: 'Business Owner',
    timestamp: new Date().toISOString(),
    entityType: 'staff' as const,
  },
];

export const SAMPLE_SOLANA_TRANSACTIONS: SolanaTransaction[] = [];
