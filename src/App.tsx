import React, { useState, useEffect, useCallback } from 'react';
import {
  BusinessProfile,
  StaffUser,
  Product,
  Sale,
  DebtRecord,
  Expense,
  Invoice,
  PaymentMethod,
  Customer,
  AppNotification,
  AuditLog,
  NavigationTab,
  NetworkStatus,
  OfflineSyncSummary,
} from './types';
import { storageService } from './services/storage';
import { syncService } from './services/syncService';

// Components
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { InventoryView } from './components/InventoryView';
import { DebtsView } from './components/DebtsView';
import { ExpensesView } from './components/ExpensesView';
import { InvoicesView } from './components/InvoicesView';
import { ReportsView } from './components/ReportsView';
import { AdminView } from './components/AdminView';

// Modals
import { ReceiptModal } from './components/ReceiptModal';
import { AuthModal } from './components/AuthModal';
import { NotificationsModal } from './components/NotificationsModal';
import { SyncStatusModal } from './components/SyncStatusModal';
import { FirstTimeSecuritySetupModal } from './components/FirstTimeSecuritySetupModal';
import { Smartphone, Download, X } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  // Business and Staff
  const [business, setBusiness] = useState<BusinessProfile>(() => storageService.getActiveBusiness());
  const [businessesList, setBusinessesList] = useState<BusinessProfile[]>(() => storageService.getAllBusinesses());
  const [staffList, setStaffList] = useState<StaffUser[]>(() => storageService.getStaff(business.id));
  const [currentStaff, setCurrentStaff] = useState<StaffUser>(() => storageService.getCurrentStaff(business.id));

  // Entity States
  const [products, setProducts] = useState<Product[]>(() => storageService.getProducts(business.id));
  const [sales, setSales] = useState<Sale[]>(() => storageService.getSales(business.id));
  const [debts, setDebts] = useState<DebtRecord[]>(() => storageService.getDebts(business.id));
  const [expenses, setExpenses] = useState<Expense[]>(() => storageService.getExpenses(business.id));
  const [invoices, setInvoices] = useState<Invoice[]>(() => storageService.getInvoices(business.id));
  const [customers, setCustomers] = useState<Customer[]>(() => storageService.getCustomers(business.id));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => storageService.getNotifications(business.id));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => storageService.getAuditLogs(business.id));

  // Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFirstTimeSetupOpen, setIsFirstTimeSetupOpen] = useState<boolean>(() => storageService.isFirstTimeSecuritySetupNeeded(business.id));
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Quick navigation helpers
  const [initialRestockProduct, setInitialRestockProduct] = useState<Product | null>(null);

  // Online & Sync Engine State
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => syncService.getNetworkStatus());
  const [syncSummary, setSyncSummary] = useState<OfflineSyncSummary>(() => storageService.getSyncSummary(business.id));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // PWA Install Prompt State
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<any>(null);
  const [showPwaInstallBanner, setShowPwaInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    const unsubNet = syncService.subscribeNetwork((net) => {
      setNetworkStatus(net);
    });

    const unsubSync = syncService.subscribeSync((sum) => {
      setSyncSummary(sum);
      setIsSyncing(sum.isSyncing);
    });

    // PWA beforeinstallprompt handler for mobile Android install
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPwaPrompt(e);
      setShowPwaInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      unsubNet();
      unsubSync();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPwaPrompt) return;
    deferredPwaPrompt.prompt();
    const { outcome } = await deferredPwaPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPwaInstallBanner(false);
    }
    setDeferredPwaPrompt(null);
  };

  // Reload all state when business changes
  const reloadBusinessData = useCallback((bizId: string) => {
    const currentBiz = storageService.getActiveBusiness();
    setBusiness(currentBiz);
    setBusinessesList(storageService.getAllBusinesses());
    setStaffList(storageService.getStaff(bizId));
    setCurrentStaff(storageService.getCurrentStaff(bizId));
    setProducts(storageService.getProducts(bizId));
    setSales(storageService.getSales(bizId));
    setDebts(storageService.getDebts(bizId));
    setExpenses(storageService.getExpenses(bizId));
    setInvoices(storageService.getInvoices(bizId));
    setCustomers(storageService.getCustomers(bizId));
    setNotifications(storageService.getNotifications(bizId));
    setAuditLogs(storageService.getAuditLogs(bizId));
  }, []);

  // Business Switcher
  const handleSwitchBusiness = (bizId: string) => {
    storageService.setActiveBusinessId(bizId);
    reloadBusinessData(bizId);
  };

  const handleCreateBusiness = (newBiz: BusinessProfile) => {
    storageService.saveBusiness(newBiz);
    storageService.setActiveBusinessId(newBiz.id);
    reloadBusinessData(newBiz.id);
  };

  const handleUpdateBusiness = (updated: BusinessProfile) => {
    storageService.saveBusiness(updated);
    setBusiness(updated);
    setBusinessesList(storageService.getAllBusinesses());
  };

  // Staff Switch / Login
  const handleStaffLogin = (staff: StaffUser) => {
    storageService.setCurrentStaff(staff);
    setCurrentStaff(staff);
    setIsAuthModalOpen(false);
  };

  // First-Time Master Security Setup (PIN & Password)
  const handleCompleteFirstTimeSetup = (updatedOwner: StaffUser) => {
    storageService.setupFirstTimeCredentials(business.id, updatedOwner.id, {
      pin: updatedOwner.pin,
      password: updatedOwner.password,
      name: updatedOwner.name,
      email: updatedOwner.email,
      phone: updatedOwner.phone,
    });
    const freshStaff = storageService.getStaff(business.id);
    setStaffList(freshStaff);
    const updatedCurrent = freshStaff.find((s) => s.id === updatedOwner.id) || updatedOwner;
    setCurrentStaff(updatedCurrent);
    setIsFirstTimeSetupOpen(false);
  };

  const handleSaveStaff = (staff: StaffUser) => {
    storageService.saveStaffUser(staff);
    const updated = storageService.getStaff(business.id);
    setStaffList(updated);
    if (currentStaff.id === staff.id) {
      setCurrentStaff(staff);
    }
  };

  const handleDeleteStaff = (staffId: string) => {
    storageService.deleteStaffUser(staffId);
    setStaffList(storageService.getStaff(business.id));
  };

  // Sales Handler
  const handleCompleteSale = (sale: Sale) => {
    // 1. Save Sale
    storageService.saveSale(sale);
    setSales(storageService.getSales(business.id));

    // 2. Reduce Inventory Stock
    const updatedProds = storageService.deductStockForSale(sale.items);
    setProducts(updatedProds);

    // 3. If credit sale or split payment with credit portion, record debt
    const saleTot = sale.totalAmount ?? sale.total ?? 0;
    const creditPortion = sale.splitPayments?.credit || (sale.isCredit || sale.paymentMethod === 'credit' ? saleTot : 0);

    if (creditPortion > 0 && sale.customerName) {
      const debtRecord: DebtRecord = {
        id: 'debt_' + Date.now(),
        businessId: business.id,
        customerId: sale.customerId,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone || '',
        initialAmount: creditPortion,
        balanceDue: creditPortion,
        receiptNumber: sale.receiptNumber,
        notes: `Credit purchase for sale #${sale.receiptNumber}`,
        status: 'active',
        history: [],
        createdAt: new Date().toISOString(),
      };
      storageService.saveDebt(debtRecord);
      setDebts(storageService.getDebts(business.id));

      storageService.updateCustomerAfterSale(
        business.id,
        sale.customerName,
        sale.customerPhone || '',
        saleTot,
        creditPortion
      );
      setCustomers(storageService.getCustomers(business.id));
    } else if (sale.customerName) {
      storageService.updateCustomerAfterSale(
        business.id,
        sale.customerName,
        sale.customerPhone || '',
        saleTot,
        0
      );
      setCustomers(storageService.getCustomers(business.id));
    }

    // 4. Open Receipt Modal
    setActiveReceiptSale(sale);
    setIsReceiptModalOpen(true);

    // 5. Update notifications if low stock triggered
    setNotifications(storageService.getNotifications(business.id));
  };

  // Void / Cancel Sale Handler with stock restoration
  const handleVoidSale = (saleId: string, reason: string) => {
    const updated = storageService.voidSale(saleId, reason, currentStaff.name);
    if (updated) {
      setSales(storageService.getSales(business.id));
      setProducts(storageService.getProducts(business.id));
      setDebts(storageService.getDebts(business.id));
      setCustomers(storageService.getCustomers(business.id));
    }
  };

  // Inventory Handlers
  const handleSaveProduct = (product: Product) => {
    storageService.saveProduct(product);
    setProducts(storageService.getProducts(business.id));
  };

  const handleDeleteProduct = (productId: string) => {
    storageService.deleteProduct(productId);
    setProducts(storageService.getProducts(business.id));
  };

  const handleRestockProduct = (productId: string, addedQty: number, newCostPrice?: number) => {
    const updated = storageService.restockProduct(productId, addedQty, newCostPrice);
    if (updated) {
      setProducts(storageService.getProducts(business.id));
    }
  };

  // Debts & Customers Handlers
  const handleRecordDebtPayment = (
    debtId: string,
    amount: number,
    method: 'cash' | 'transfer' | 'pos',
    notes?: string
  ) => {
    storageService.recordDebtPayment(debtId, amount, method, currentStaff.name, notes);
    setDebts(storageService.getDebts(business.id));
    setCustomers(storageService.getCustomers(business.id));
  };

  const handleRecordCustomerLumpPayment = (
    customerId: string,
    amount: number,
    method: 'cash' | 'transfer' | 'pos',
    notes?: string
  ) => {
    storageService.recordCustomerLumpPayment(customerId, amount, method, currentStaff.name, notes);
    setDebts(storageService.getDebts(business.id));
    setCustomers(storageService.getCustomers(business.id));
  };

  const handleAddNewDebt = (debt: DebtRecord) => {
    storageService.saveDebt(debt);
    setDebts(storageService.getDebts(business.id));
    setCustomers(storageService.getCustomers(business.id));
  };

  const handleSaveCustomer = (cust: Customer) => {
    storageService.saveCustomer(cust);
    setCustomers(storageService.getCustomers(business.id));
    setDebts(storageService.getDebts(business.id));
  };

  const handleDeleteCustomer = (customerId: string): boolean => {
    const success = storageService.deleteCustomer(customerId);
    if (success) {
      setCustomers(storageService.getCustomers(business.id));
    }
    return success;
  };

  // Expenses Handlers
  const handleSaveExpense = (expense: Expense) => {
    storageService.saveExpense(expense);
    setExpenses(storageService.getExpenses(business.id));
  };

  const handleDeleteExpense = (expenseId: string) => {
    storageService.deleteExpense(expenseId);
    setExpenses(storageService.getExpenses(business.id));
  };

  // Invoices Handlers
  const handleSaveInvoice = (invoice: Invoice) => {
    storageService.saveInvoice(invoice, currentStaff.name);
    setInvoices(storageService.getInvoices(business.id));
    setAuditLogs(storageService.getAuditLogs(business.id));
  };

  const handleRecordInvoicePayment = (
    invoiceId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference?: string,
    notes?: string
  ) => {
    storageService.recordInvoicePayment(
      invoiceId,
      amount,
      paymentMethod,
      currentStaff.name,
      reference,
      notes
    );
    setInvoices(storageService.getInvoices(business.id));
    setAuditLogs(storageService.getAuditLogs(business.id));
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    storageService.deleteInvoice(invoiceId, currentStaff.name);
    setInvoices(storageService.getInvoices(business.id));
    setAuditLogs(storageService.getAuditLogs(business.id));
  };

  // Notifications Handlers
  const handleMarkNotificationRead = (notifId: string) => {
    storageService.markNotificationRead(notifId);
    setNotifications(storageService.getNotifications(business.id));
  };

  const handleClearNotifications = () => {
    storageService.clearNotifications(business.id);
    setNotifications([]);
  };

  const handleSendTestNotification = (notif: AppNotification) => {
    storageService.addNotification(notif);
    setNotifications(storageService.getNotifications(business.id));
  };

  const handleClearAuditLogs = () => {
    storageService.clearAuditLogs(business.id);
    setAuditLogs([]);
  };

  const handleLogActivity = (action: string, details: string, entityType: any) => {
    storageService.logActivity(action, details, entityType, currentStaff.name, business.id);
    setAuditLogs(storageService.getAuditLogs(business.id));
  };

  // Backup handlers
  const handleExportBackup = () => {
    const backupJson = storageService.exportFullBackupJSON();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmallBusinessOS_Backup_${business.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportBackup = (jsonContent: string) => {
    const success = storageService.importFullBackupJSON(jsonContent);
    if (success) {
      alert('Database restored successfully!');
      reloadBusinessData(storageService.getActiveBusinessId());
    } else {
      alert('Invalid backup file format. Please check and try again.');
    }
  };

  const handleResetDemoData = () => {
    storageService.resetToDemoData();
    reloadBusinessData(business.id);
    alert('Store reset to initial demo state.');
  };

  // Quick Restock jump from Dashboard
  const handleQuickRestockJump = (product: Product) => {
    setInitialRestockProduct(product);
    setActiveTab('inventory');
  };

  // Unread notifications count
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-sans text-[#1C1C1C] flex flex-row antialiased selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* Bento Grid Left Sidebar for Desktop */}
      <Sidebar
        business={business}
        currentStaff={currentStaff}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenBusinessModal={() => setActiveTab('admin')}
        unreadNotificationCount={unreadNotifCount}
        overdueDebtCount={debts.filter((d) => d.status === 'overdue' || (d.dueDate && d.dueDate < new Date().toISOString().split('T')[0] && d.balanceDue > 0)).length}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* PWA Install Banner for Mobile Devices */}
        {showPwaInstallBanner && (
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 border-b border-emerald-700/60 px-4 py-2.5 flex items-center justify-between text-xs text-white z-40">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong className="font-bold">Install NaijaBiz POS:</strong> Run offline fast on your Android phone!
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleInstallPwa}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1 cursor-pointer transition shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
              <button
                onClick={() => setShowPwaInstallBanner(false)}
                className="p-1 text-emerald-200 hover:text-white"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Offline Status Top Alert */}
        <OfflineBanner
          isOnline={networkStatus.isOnline}
          networkStatus={networkStatus}
          pendingCount={syncSummary.pendingCount}
          isSyncing={isSyncing}
          onSyncNow={() => syncService.syncNow(business.id)}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
        />

        {/* Top Navbar */}
        <Navbar
          business={business}
          currentStaff={currentStaff}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          unreadNotificationCount={unreadNotifCount}
          isOnline={networkStatus.isOnline}
          pendingSyncCount={syncSummary.pendingCount}
          isSyncing={isSyncing}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          {activeTab === 'dashboard' && (
            <DashboardView
              business={business}
              currentStaff={currentStaff}
              sales={sales}
              expenses={expenses}
              products={products}
              debts={debts}
              onNavigateTab={setActiveTab}
              onQuickRestock={handleQuickRestockJump}
              onSaveExpense={handleSaveExpense}
              onSaveProduct={handleSaveProduct}
              onRestockProduct={handleRestockProduct}
              onOpenReceipt={(sale) => {
                setActiveReceiptSale(sale);
                setIsReceiptModalOpen(true);
              }}
            />
          )}

        {activeTab === 'pos' && (
          <POSView
            business={business}
            currentStaff={currentStaff}
            products={products}
            customers={customers}
            sales={sales}
            onCompleteSale={handleCompleteSale}
            onQuickAddCustomer={handleSaveCustomer}
            onOpenReceipt={(sale) => {
              setActiveReceiptSale(sale);
              setIsReceiptModalOpen(true);
            }}
            onVoidSale={handleVoidSale}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            business={business}
            currentStaff={currentStaff}
            products={products}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onRestockProduct={handleRestockProduct}
            initialRestockProduct={initialRestockProduct}
            onClearInitialRestock={() => setInitialRestockProduct(null)}
          />
        )}

        {activeTab === 'debts' && (
          <DebtsView
            business={business}
            currentStaff={currentStaff}
            debts={debts}
            customers={customers}
            sales={sales}
            onRecordDebtPayment={handleRecordDebtPayment}
            onRecordCustomerLumpPayment={handleRecordCustomerLumpPayment}
            onAddNewDebt={handleAddNewDebt}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView
            business={business}
            currentStaff={currentStaff}
            expenses={expenses}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView
            business={business}
            currentStaff={currentStaff}
            invoices={invoices}
            customers={customers}
            products={products}
            onSaveInvoice={handleSaveInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onSaveCustomer={handleSaveCustomer}
            onRecordPayment={handleRecordInvoicePayment}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            business={business}
            currentStaff={currentStaff}
            sales={sales}
            expenses={expenses}
            products={products}
            debts={debts}
            customers={customers}
            staffList={staffList}
            invoices={invoices}
            onOpenReceipt={(sale) => {
              setActiveReceiptSale(sale);
              setIsReceiptModalOpen(true);
            }}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView
            business={business}
            currentStaff={currentStaff}
            staffList={staffList}
            businessesList={businessesList}
            products={products}
            sales={sales}
            debts={debts}
            expenses={expenses}
            invoices={invoices}
            customers={customers}
            notifications={notifications}
            auditLogs={auditLogs}
            onUpdateBusiness={handleUpdateBusiness}
            onSwitchBusiness={handleSwitchBusiness}
            onCreateBusiness={handleCreateBusiness}
            onSaveStaff={handleSaveStaff}
            onDeleteStaff={handleDeleteStaff}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onResetDemoData={handleResetDemoData}
            onNavigateTab={setActiveTab}
            onClearNotifications={handleClearNotifications}
            onSendTestNotification={handleSendTestNotification}
            onClearAuditLogs={handleClearAuditLogs}
            onLogActivity={handleLogActivity}
          />
        )}
      </main>

      {/* Mobile Bottom Sticky Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentStaff={currentStaff}
        unreadNotificationCount={unreadNotifCount}
      />

      {/* MODALS */}
      {/* 1. Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        sale={activeReceiptSale}
        business={business}
        onNewSale={() => {
          setIsReceiptModalOpen(false);
          setActiveTab('pos');
        }}
      />

      {/* 2. Staff Authentication & Switch Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        staffList={staffList}
        currentStaff={currentStaff}
        onLogin={handleStaffLogin}
        businesses={businessesList}
        currentBusiness={business}
        onSwitchBusiness={handleSwitchBusiness}
        onOpenFirstTimeSetup={() => setIsFirstTimeSetupOpen(true)}
        onUpdateStaff={(updatedStaff) => {
          storageService.saveStaffUser(updatedStaff);
          const fresh = storageService.getStaff(business.id);
          setStaffList(fresh);
          if (currentStaff.id === updatedStaff.id) {
            setCurrentStaff(updatedStaff);
          }
        }}
      />

      {/* 2b. First-Time Security Master PIN & Password Setup Modal */}
      <FirstTimeSecuritySetupModal
        isOpen={isFirstTimeSetupOpen}
        onClose={() => setIsFirstTimeSetupOpen(false)}
        business={business}
        ownerStaff={staffList.find((s) => s.role === 'owner') || staffList[0] || currentStaff}
        onComplete={handleCompleteFirstTimeSetup}
      />

      {/* 3. Notifications Drawer Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationRead}
        onClearAll={handleClearNotifications}
        onAction={(notif) => {
          if (notif.type === 'low_stock') setActiveTab('inventory');
          else if (notif.type === 'debt_overdue') setActiveTab('debts');
          setIsNotificationsOpen(false);
        }}
      />

      {/* 4. Offline Sync & Network Status Dashboard Modal */}
      <SyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        business={business}
        networkStatus={networkStatus}
        syncSummary={syncSummary}
        onTriggerSync={async () => {
          await syncService.syncNow(business.id);
        }}
      />
      </div>
    </div>
  );
};

export default App;
