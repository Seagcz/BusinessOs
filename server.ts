import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import { businesses, customers, debts, expenses, products, sales, users } from './src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { getOrCreateUser } from './src/db/users.ts';

const PORT = 3000;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 2. Database connection status
  app.get('/api/db/status', async (req, res) => {
    try {
      const isSqlConfigured = Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME);
      let counts = { products: 0, customers: 0, sales: 0, debts: 0, expenses: 0 };
      
      if (isSqlConfigured) {
        try {
          const [pCount, cCount, sCount, dCount, eCount] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(products),
            db.select({ count: sql<number>`count(*)` }).from(customers),
            db.select({ count: sql<number>`count(*)` }).from(sales),
            db.select({ count: sql<number>`count(*)` }).from(debts),
            db.select({ count: sql<number>`count(*)` }).from(expenses),
          ]);
          counts = {
            products: Number(pCount[0]?.count || 0),
            customers: Number(cCount[0]?.count || 0),
            sales: Number(sCount[0]?.count || 0),
            debts: Number(dCount[0]?.count || 0),
            expenses: Number(eCount[0]?.count || 0),
          };
        } catch (queryErr) {
          console.error('Error counting DB records:', queryErr);
        }
      }

      res.json({
        connected: isSqlConfigured,
        engine: 'PostgreSQL (Cloud SQL / Supabase compatible)',
        region: 'europe-west2',
        database: process.env.SQL_DB_NAME || 'postgres',
        counts,
      });
    } catch (err: any) {
      console.error('Failed to get db status:', err);
      res.status(500).json({ error: err.message || 'Failed to check database status' });
    }
  });

  // 3. Sync Push: Client pushes records to PostgreSQL
  app.post('/api/db/sync-push', async (req, res) => {
    try {
      const { business, products: prodList, customers: custList, sales: saleList, debts: debtList, expenses: expList } = req.body;

      if (business && business.id) {
        await db.insert(businesses)
          .values({
            id: business.id,
            name: business.name || 'Store',
            phone: business.phone || '',
            email: business.email || '',
            address: business.address || '',
            city: business.city || '',
            state: business.state || '',
            privateAccountNumber: business.privateAccountNumber || '',
            privateAccountBank: business.privateAccountBank || '',
            privateAccountName: business.privateAccountName || '',
            solanaWalletAddress: business.solanaWalletAddress || '',
            solanaUsdcNgnRate: business.solanaUsdcNgnRate || 1550,
            currencyCode: business.currencyCode || 'NGN',
            currencySymbol: business.currencySymbol || '₦',
            taxRate: business.taxRate || 0,
          })
          .onConflictDoUpdate({
            target: businesses.id,
            set: {
              name: business.name || 'Store',
              phone: business.phone || '',
              email: business.email || '',
              address: business.address || '',
              city: business.city || '',
              state: business.state || '',
              privateAccountNumber: business.privateAccountNumber || '',
              privateAccountBank: business.privateAccountBank || '',
              privateAccountName: business.privateAccountName || '',
              solanaWalletAddress: business.solanaWalletAddress || '',
              solanaUsdcNgnRate: business.solanaUsdcNgnRate || 1550,
              currencyCode: business.currencyCode || 'NGN',
              currencySymbol: business.currencySymbol || '₦',
              taxRate: business.taxRate || 0,
            },
          });
      }

      // Upsert Products
      if (Array.isArray(prodList) && prodList.length > 0) {
        for (const p of prodList) {
          await db.insert(products)
            .values({
              id: p.id,
              businessId: p.businessId || business?.id,
              name: p.name,
              category: p.category || 'General',
              sku: p.sku || p.id,
              barcode: p.barcode || '',
              costPrice: Math.round(Number(p.costPrice) || 0),
              sellingPrice: Math.round(Number(p.sellingPrice) || 0),
              stockQuantity: Math.round(Number(p.stockQuantity) || 0),
              minStockThreshold: Math.round(Number(p.minStockThreshold) || 5),
              unit: p.unit || 'pcs',
              isActive: p.isActive !== false,
            })
            .onConflictDoUpdate({
              target: products.id,
              set: {
                name: p.name,
                category: p.category || 'General',
                costPrice: Math.round(Number(p.costPrice) || 0),
                sellingPrice: Math.round(Number(p.sellingPrice) || 0),
                stockQuantity: Math.round(Number(p.stockQuantity) || 0),
                minStockThreshold: Math.round(Number(p.minStockThreshold) || 5),
                unit: p.unit || 'pcs',
                isActive: p.isActive !== false,
                updatedAt: new Date(),
              },
            });
        }
      }

      // Upsert Customers
      if (Array.isArray(custList) && custList.length > 0) {
        for (const c of custList) {
          await db.insert(customers)
            .values({
              id: c.id,
              businessId: c.businessId || business?.id,
              name: c.name,
              phone: c.phone || '',
              email: c.email || '',
              address: c.address || '',
              totalPurchases: Math.round(Number(c.totalPurchases) || 0),
              currentDebt: Math.round(Number(c.currentDebt) || 0),
              notes: c.notes || '',
            })
            .onConflictDoUpdate({
              target: customers.id,
              set: {
                name: c.name,
                phone: c.phone || '',
                email: c.email || '',
                address: c.address || '',
                totalPurchases: Math.round(Number(c.totalPurchases) || 0),
                currentDebt: Math.round(Number(c.currentDebt) || 0),
                notes: c.notes || '',
              },
            });
        }
      }

      // Upsert Sales
      if (Array.isArray(saleList) && saleList.length > 0) {
        for (const s of saleList) {
          await db.insert(sales)
            .values({
              id: s.id,
              receiptNumber: s.receiptNumber || s.id,
              businessId: s.businessId || business?.id,
              staffId: s.staffId || '',
              staffName: s.staffName || '',
              customerId: s.customerId || '',
              customerName: s.customerName || '',
              customerPhone: s.customerPhone || '',
              itemsJson: JSON.stringify(s.items || []),
              subtotal: Math.round(Number(s.subtotal) || 0),
              discountAmount: Math.round(Number(s.discountAmount) || 0),
              taxAmount: Math.round(Number(s.taxAmount) || 0),
              totalAmount: Math.round(Number(s.totalAmount || s.total) || 0),
              totalCost: Math.round(Number(s.totalCost || s.costTotal) || 0),
              profit: Math.round(Number(s.profit) || 0),
              paymentMethod: s.paymentMethod || 'cash',
              solanaSignature: s.solanaSignature || '',
              bankTransferReference: s.bankTransferReference || '',
              isCredit: Boolean(s.isCredit),
              debtDueDate: s.debtDueDate || '',
              status: s.status || 'completed',
            })
            .onConflictDoUpdate({
              target: sales.id,
              set: {
                status: s.status || 'completed',
                solanaSignature: s.solanaSignature || '',
                bankTransferReference: s.bankTransferReference || '',
              },
            });
        }
      }

      // Upsert Debts
      if (Array.isArray(debtList) && debtList.length > 0) {
        for (const d of debtList) {
          await db.insert(debts)
            .values({
              id: d.id,
              businessId: d.businessId || business?.id,
              saleId: d.saleId || '',
              receiptNumber: d.receiptNumber || '',
              customerId: d.customerId || '',
              customerName: d.customerName || 'Customer',
              customerPhone: d.customerPhone || '',
              totalDebtAmount: Math.round(Number(d.totalDebtAmount) || 0),
              amountPaid: Math.round(Number(d.amountPaid) || 0),
              balanceDue: Math.round(Number(d.balanceDue) || 0),
              status: d.status || 'pending',
              dueDate: d.dueDate || '',
            })
            .onConflictDoUpdate({
              target: debts.id,
              set: {
                amountPaid: Math.round(Number(d.amountPaid) || 0),
                balanceDue: Math.round(Number(d.balanceDue) || 0),
                status: d.status || 'pending',
              },
            });
        }
      }

      // Upsert Expenses
      if (Array.isArray(expList) && expList.length > 0) {
        for (const e of expList) {
          await db.insert(expenses)
            .values({
              id: e.id,
              businessId: e.businessId || business?.id,
              category: e.category || 'General',
              amount: Math.round(Number(e.amount) || 0),
              description: e.description || '',
              paymentMethod: e.paymentMethod || 'cash',
              receiptReference: e.receiptReference || '',
              recordedBy: e.recordedBy || '',
              date: e.date || new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: expenses.id,
              set: {
                category: e.category || 'General',
                amount: Math.round(Number(e.amount) || 0),
                description: e.description || '',
                paymentMethod: e.paymentMethod || 'cash',
                date: e.date || new Date().toISOString(),
              },
            });
        }
      }

      res.json({ success: true, syncedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error('Error during sync-push:', err);
      res.status(500).json({ error: err.message || 'Sync failed' });
    }
  });

  // 4. Sync Pull: Client downloads fresh state from PostgreSQL
  app.get('/api/db/sync-pull', async (req, res) => {
    try {
      const businessId = req.query.businessId as string;
      if (!businessId) {
        return res.status(400).json({ error: 'businessId query param required' });
      }

      const [bizRecords, prodRecords, custRecords, saleRecords, debtRecords, expRecords] = await Promise.all([
        db.select().from(businesses).where(eq(businesses.id, businessId)),
        db.select().from(products).where(eq(products.businessId, businessId)),
        db.select().from(customers).where(eq(customers.businessId, businessId)),
        db.select().from(sales).where(eq(sales.businessId, businessId)),
        db.select().from(debts).where(eq(debts.businessId, businessId)),
        db.select().from(expenses).where(eq(expenses.businessId, businessId)),
      ]);

      const formattedSales = saleRecords.map((s) => {
        let parsedItems = [];
        try {
          parsedItems = JSON.parse(s.itemsJson || '[]');
        } catch {}
        return {
          ...s,
          items: parsedItems,
        };
      });

      res.json({
        business: bizRecords[0] || null,
        products: prodRecords,
        customers: custRecords,
        sales: formattedSales,
        debts: debtRecords,
        expenses: expRecords,
        pulledAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error during sync-pull:', err);
      res.status(500).json({ error: err.message || 'Pull failed' });
    }
  });

  // 5. User Sync with Auth
  app.post('/api/auth/sync', async (req, res) => {
    try {
      const { uid, email, name } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: 'uid and email are required' });
      }
      const user = await getOrCreateUser(uid, email, name);
      res.json({ success: true, user });
    } catch (err: any) {
      console.error('Error in user auth sync:', err);
      res.status(500).json({ error: err.message || 'User sync failed' });
    }
  });

  // Vite middleware for development / static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
