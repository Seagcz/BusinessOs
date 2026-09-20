import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users table (linked to Firebase Auth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('owner'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Businesses table
export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  privateAccountNumber: text('private_account_number'),
  privateAccountBank: text('private_account_bank'),
  privateAccountName: text('private_account_name'),
  solanaWalletAddress: text('solana_wallet_address'),
  solanaUsdcNgnRate: integer('solana_usdc_ngn_rate').default(1550),
  currencyCode: text('currency_code').default('NGN'),
  currencySymbol: text('currency_symbol').default('₦'),
  taxRate: integer('tax_rate').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Products table
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id),
  name: text('name').notNull(),
  category: text('category').notNull(),
  sku: text('sku').notNull(),
  barcode: text('barcode'),
  costPrice: integer('cost_price').notNull().default(0),
  sellingPrice: integer('selling_price').notNull().default(0),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  minStockThreshold: integer('min_stock_threshold').notNull().default(5),
  unit: text('unit').default('pcs'),
  isActive: boolean('is_active').default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 4. Customers table
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  address: text('address'),
  totalPurchases: integer('total_purchases').default(0),
  currentDebt: integer('current_debt').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Sales table
export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull(),
  businessId: text('business_id').references(() => businesses.id),
  staffId: text('staff_id'),
  staffName: text('staff_name'),
  customerId: text('customer_id'),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  itemsJson: text('items_json').notNull(),
  subtotal: integer('subtotal').notNull().default(0),
  discountAmount: integer('discount_amount').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  totalCost: integer('total_cost').notNull().default(0),
  profit: integer('profit').notNull().default(0),
  paymentMethod: text('payment_method').notNull().default('cash'),
  solanaSignature: text('solana_signature'),
  bankTransferReference: text('bank_transfer_reference'),
  isCredit: boolean('is_credit').default(false),
  debtDueDate: text('debt_due_date'),
  status: text('status').notNull().default('completed'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Debts table
export const debts = pgTable('debts', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id),
  saleId: text('sale_id'),
  receiptNumber: text('receipt_number'),
  customerId: text('customer_id'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  totalDebtAmount: integer('total_debt_amount').notNull(),
  amountPaid: integer('amount_paid').notNull().default(0),
  balanceDue: integer('balance_due').notNull(),
  status: text('status').notNull().default('pending'),
  dueDate: text('due_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Expenses table
export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id),
  category: text('category').notNull(),
  amount: integer('amount').notNull(),
  description: text('description').notNull(),
  paymentMethod: text('payment_method').default('cash'),
  receiptReference: text('receipt_reference'),
  recordedBy: text('recorded_by'),
  date: text('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, {
    fields: [businesses.userId],
    references: [users.id],
  }),
  products: many(products),
  customers: many(customers),
  sales: many(sales),
  debts: many(debts),
  expenses: many(expenses),
}));

export const productsRelations = relations(products, ({ one }) => ({
  business: one(businesses, {
    fields: [products.businessId],
    references: [businesses.id],
  }),
}));

export const customersRelations = relations(customers, ({ one }) => ({
  business: one(businesses, {
    fields: [customers.businessId],
    references: [businesses.id],
  }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  business: one(businesses, {
    fields: [sales.businessId],
    references: [businesses.id],
  }),
}));

export const debtsRelations = relations(debts, ({ one }) => ({
  business: one(businesses, {
    fields: [debts.businessId],
    references: [businesses.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  business: one(businesses, {
    fields: [expenses.businessId],
    references: [businesses.id],
  }),
}));
