import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  Building2,
  Banknote,
  BookOpen,
  ArrowRight,
  Sparkles,
  Calculator,
  X,
  Check,
  AlertCircle,
  Tag,
  Clock,
  Layers,
  PauseCircle,
  Play,
  RotateCcw,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  History,
  Store,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  QrCode,
  Copy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Product,
  Sale,
  SaleItem,
  Customer,
  BusinessProfile,
  StaffUser,
  PaymentMethod,
  SplitPaymentDetail,
} from '../types';
import { formatMoney, generateReceiptNumber } from '../utils/formatters';
import { SalesHistoryView } from './SalesHistoryView';
import { storageService } from '../services/storage';
import { SolanaPaymentModal } from './SolanaPaymentModal';
import { PrivateSettlementModal } from './PrivateSettlementModal';

interface ParkedCart {
  id: string;
  label: string;
  items: SaleItem[];
  customerId: string;
  discountAmount: number;
  applyTax: boolean;
  notes: string;
  createdAt: string;
}

interface POSViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  onCompleteSale: (sale: Sale) => void;
  onQuickAddCustomer: (customer: Customer) => void;
  onOpenReceipt: (sale: Sale) => void;
  onVoidSale?: (saleId: string, reason: string) => void;
  onUpdateBusiness?: (updated: BusinessProfile) => void;
  initialSubTab?: 'register' | 'history' | 'parked';
}

export const POSView: React.FC<POSViewProps> = ({
  business,
  currentStaff,
  products,
  customers,
  sales,
  onCompleteSale,
  onQuickAddCustomer,
  onOpenReceipt,
  onVoidSale,
  onUpdateBusiness,
  initialSubTab = 'register',
}) => {
  // Main subview state: Register | Sales History | Parked Carts
  const [activeSubTab, setActiveSubTab] = useState<'register' | 'history' | 'parked'>(initialSubTab);

  // POS Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Cart state with crash recovery draft support
  const [cart, setCart] = useState<SaleItem[]>(() => {
    const draft = storageService.getCartDraft(business.id);
    return draft?.items || [];
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    const draft = storageService.getCartDraft(business.id);
    return draft?.customerId || '';
  });
  const [discountAmount, setDiscountAmount] = useState<number>(() => {
    const draft = storageService.getCartDraft(business.id);
    return draft?.discountAmount || 0;
  });
  const [applyTax, setApplyTax] = useState<boolean>(() => {
    const draft = storageService.getCartDraft(business.id);
    return draft?.applyTax || false;
  });
  const [saleNotes, setSaleNotes] = useState<string>(() => {
    const draft = storageService.getCartDraft(business.id);
    return draft?.notes || '';
  });

  // Auto-persist cart draft on any change for crash recovery
  useEffect(() => {
    if (cart.length > 0) {
      storageService.saveCartDraft({
        businessId: business.id,
        items: cart,
        customerId: selectedCustomerId,
        discountAmount,
        applyTax,
        notes: saleNotes,
        updatedAt: new Date().toISOString(),
      });
    } else {
      storageService.clearCartDraft(business.id);
    }
  }, [cart, selectedCustomerId, discountAmount, applyTax, saleNotes, business.id]);

  // Parked Carts Persistence
  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>(() => {
    try {
      const saved = localStorage.getItem(`sme_pos_parked_carts_${business.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [parkCartLabel, setParkCartLabel] = useState('');
  const [isParkModalOpen, setIsParkModalOpen] = useState(false);

  // Sync parked carts
  useEffect(() => {
    try {
      localStorage.setItem(`sme_pos_parked_carts_${business.id}`, JSON.stringify(parkedCarts));
    } catch (e) {
      console.error('Error saving parked carts', e);
    }
  }, [parkedCarts, business.id]);

  // Modals inside POS
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isCartMobileOpen, setIsCartMobileOpen] = useState(false);

  // Double-tap lock protection for mobile checkout
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Custom quick item form
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customCost, setCustomCost] = useState('');

  // New customer quick form
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Stock limit notification toast
  const [stockToastMessage, setStockToastMessage] = useState<string | null>(null);

  // Checkout payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [transferRef, setTransferRef] = useState<string>('');
  const [creditDueDate, setCreditDueDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  
  // Solana USDC POS state
  const [solanaSignature, setSolanaSignature] = useState<string>('');
  const [isSolanaModalOpen, setIsSolanaModalOpen] = useState<boolean>(false);
  const [solanaCopied, setSolanaCopied] = useState<boolean>(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false);
  const [accountCopied, setAccountCopied] = useState<boolean>(false);

  // Split payment state
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitTransfer, setSplitTransfer] = useState<string>('');
  const [splitPos, setSplitPos] = useState<string>('');
  const [splitCredit, setSplitCredit] = useState<string>('');

  // Extract categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered products for catalog
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart Financial Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    if (!applyTax || business.taxRate <= 0) return 0;
    return (cartSubtotal - discountAmount) * (business.taxRate / 100);
  }, [cartSubtotal, discountAmount, applyTax, business.taxRate]);

  const totalAmount = useMemo(() => {
    const total = cartSubtotal - discountAmount + taxAmount;
    return Math.max(0, total);
  }, [cartSubtotal, discountAmount, taxAmount]);

  const totalCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  }, [cart]);

  const estimatedProfit = useMemo(() => {
    return totalAmount - totalCost;
  }, [totalAmount, totalCost]);

  const profitMarginPercent = useMemo(() => {
    if (totalAmount <= 0) return 0;
    return (estimatedProfit / totalAmount) * 100;
  }, [totalAmount, estimatedProfit]);

  // Split payment totals
  const splitTotalPaid = useMemo(() => {
    const c = parseFloat(splitCash) || 0;
    const t = parseFloat(splitTransfer) || 0;
    const p = parseFloat(splitPos) || 0;
    const cr = parseFloat(splitCredit) || 0;
    return c + t + p + cr;
  }, [splitCash, splitTransfer, splitPos, splitCredit]);

  const splitRemaining = totalAmount - splitTotalPaid;

  // Add product to cart with Inventory stock validation
  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.productId === product.id);
    const currentCartQty = existing ? existing.quantity : 0;

    // Haptic feedback on mobile tap
    if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
      try {
        (navigator as any).vibrate(15);
      } catch {}
    }

    // Check if adding exceeds available stock
    if (product.stockQuantity <= 0) {
      setStockToastMessage(`⚠️ "${product.name}" is OUT OF STOCK (0 left in inventory).`);
      setTimeout(() => setStockToastMessage(null), 3000);
    } else if (currentCartQty + 1 > product.stockQuantity) {
      setStockToastMessage(`⚠️ Maximum inventory reached! Only ${product.stockQuantity} available.`);
      setTimeout(() => setStockToastMessage(null), 3000);
    }

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.productId === product.id);
      if (idx >= 0) {
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            unitPrice: product.sellingPrice,
            costPrice: product.costPrice,
            quantity: 1,
            subtotal: product.sellingPrice,
            unit: product.unit,
          },
        ];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const targetProduct = products.find((p) => p.id === productId);

    if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
      try {
        (navigator as any).vibrate(10);
      } catch {}
    }

    setCart((prev) => {
      const item = prev.find((i) => i.productId === productId);
      if (!item) return prev;

      const newQty = item.quantity + delta;

      // Check stock limit on increase
      if (delta > 0 && targetProduct && newQty > targetProduct.stockQuantity) {
        setStockToastMessage(`⚠️ Cannot add more than ${targetProduct.stockQuantity} in stock.`);
        setTimeout(() => setStockToastMessage(null), 2500);
      }

      return prev
        .map((it) => {
          if (it.productId === productId) {
            return newQty > 0
              ? { ...it, quantity: newQty, subtotal: newQty * it.unitPrice }
              : null;
          }
          return it;
        })
        .filter(Boolean) as SaleItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setSelectedCustomerId('');
    setSaleNotes('');
    setCashTendered('');
    setSplitCash('');
    setSplitTransfer('');
    setSplitPos('');
    setSplitCredit('');
  };

  // Hold / Park the current Cart
  const handleParkCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const selectedCust = customers.find((c) => c.id === selectedCustomerId);
    const label = parkCartLabel.trim() || selectedCust?.name || `Order #${parkedCarts.length + 1}`;

    const newParkedCart: ParkedCart = {
      id: 'park_' + Date.now(),
      label,
      items: cart,
      customerId: selectedCustomerId,
      discountAmount,
      applyTax,
      notes: saleNotes,
      createdAt: new Date().toISOString(),
    };

    setParkedCarts((prev) => [newParkedCart, ...prev]);
    clearCart();
    setParkCartLabel('');
    setIsParkModalOpen(false);
  };

  // Resume a Parked Cart
  const handleResumeParkedCart = (pCart: ParkedCart) => {
    setCart(pCart.items);
    setSelectedCustomerId(pCart.customerId);
    setDiscountAmount(pCart.discountAmount);
    setApplyTax(pCart.applyTax);
    setSaleNotes(pCart.notes);
    setParkedCarts((prev) => prev.filter((c) => c.id !== pCart.id));
    setActiveSubTab('register');
  };

  // Delete a Parked Cart
  const handleDeleteParkedCart = (pCartId: string) => {
    setParkedCarts((prev) => prev.filter((c) => c.id !== pCartId));
  };

  // Add custom unlisted item to cart
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(customPrice);
    const qty = parseInt(customQty) || 1;
    const cost = parseFloat(customCost) || price * 0.75;
    if (!customName.trim() || isNaN(price) || price <= 0) return;

    const customItem: SaleItem = {
      productId: 'custom_' + Date.now(),
      productName: customName.trim(),
      unitPrice: price,
      costPrice: cost,
      quantity: qty,
      subtotal: price * qty,
      unit: 'item',
    };

    setCart((prev) => [...prev, customItem]);
    setCustomName('');
    setCustomPrice('');
    setCustomCost('');
    setCustomQty('1');
    setIsCustomItemOpen(false);
  };

  // Quick add customer
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    const newCustomer: Customer = {
      id: 'cust_' + Date.now(),
      businessId: business.id,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      totalPurchases: 0,
      currentDebt: 0,
      createdAt: new Date().toISOString(),
    };

    onQuickAddCustomer(newCustomer);
    setSelectedCustomerId(newCustomer.id);
    setNewCustName('');
    setNewCustPhone('');
    setIsNewCustomerOpen(false);
  };

  // Handle Solana USDC Payment confirmation from Modal
  const handleSolanaPosConfirmed = (details: {
    signature: string;
    amountUsdc: number;
    amountNgn: number;
    exchangeRate: number;
    payerAddress?: string;
    recipientAddress: string;
    slot?: number;
    blockTime?: number;
    explorerUrl: string;
  }) => {
    setSolanaSignature(details.signature);
    setIsSolanaModalOpen(false);

    const selectedCust = customers.find((c) => c.id === selectedCustomerId);
    const receiptNum = generateReceiptNumber();

    const newSale: Sale = {
      id: 'sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      receiptNumber: receiptNum,
      businessId: business.id,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      customerId: selectedCust?.id,
      customerName: selectedCust?.name || (selectedCustomerId ? 'Registered Customer' : 'Walk-in Customer'),
      customerPhone: selectedCust?.phone,
      items: cart,
      subtotal: cartSubtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      totalCost,
      profit: estimatedProfit,
      paymentMethod: 'solana',
      isCredit: false,
      notes: `Settled via Solana Mainnet: ${details.amountUsdc} USDC (Tx: ${details.signature.slice(0, 16)}...)`,
      status: 'completed',
      createdAt: new Date().toISOString(),
      isSynced: typeof navigator !== 'undefined' ? navigator.onLine : false,
      solanaSignature: details.signature,
    };

    storageService.saveSolanaTransaction(
      {
        id: 'sol_pos_' + Date.now(),
        businessId: business.id,
        signature: details.signature,
        type: 'pos_sale',
        status: 'confirmed',
        amountUsdc: details.amountUsdc,
        amountNgn: details.amountNgn,
        exchangeRate: details.exchangeRate,
        recipientAddress: details.recipientAddress,
        payerAddress: details.payerAddress,
        customerName: newSale.customerName,
        timestamp: new Date().toISOString(),
        slot: details.slot,
        blockTime: details.blockTime,
        confirmationStatus: 'finalized',
        explorerUrl: details.explorerUrl,
        notes: `POS Sale #${receiptNum} settled in USDC on Solana Mainnet`,
        verifiedAt: new Date().toISOString(),
      },
      currentStaff.name
    );

    try {
      confetti({
        particleCount: 85,
        spread: 70,
        origin: { y: 0.7 },
      });
    } catch {}

    onCompleteSale(newSale);
    storageService.clearCartDraft(business.id);
    clearCart();
    setIsCheckoutOpen(false);
    setIsCartMobileOpen(false);
  };

  // Process and finalize Sale
  const handleFinalizeSale = () => {
    if (isSubmittingSale) return; // Prevent double-tap on touchscreens
    if (cart.length === 0) return;

    // If Solana is selected but not yet verified, open modal
    if (paymentMethod === 'solana' && !solanaSignature) {
      setIsSolanaModalOpen(true);
      return;
    }

    const selectedCust = customers.find((c) => c.id === selectedCustomerId);
    const isCredit = paymentMethod === 'credit';

    if (isCredit && !selectedCust) {
      alert('Please select or create a Customer profile to process a Credit/Debt sale.');
      return;
    }

    if (paymentMethod === 'split' && Math.abs(splitRemaining) > 1) {
      alert(`Split payment must equal total amount! Remaining balance: ${formatMoney(splitRemaining, business)}`);
      return;
    }

    setIsSubmittingSale(true);

    try {
      const splitDetailObj: SplitPaymentDetail | undefined =
        paymentMethod === 'split'
          ? {
              cash: parseFloat(splitCash) || 0,
              transfer: parseFloat(splitTransfer) || 0,
              pos: parseFloat(splitPos) || 0,
              credit: parseFloat(splitCredit) || 0,
            }
          : undefined;

      const newSale: Sale = {
        id: 'sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        receiptNumber: generateReceiptNumber(),
        businessId: business.id,
        staffId: currentStaff.id,
        staffName: currentStaff.name,
        customerId: selectedCust?.id,
        customerName: selectedCust?.name || (selectedCustomerId ? 'Registered Customer' : 'Walk-in Customer'),
        customerPhone: selectedCust?.phone,
        items: cart,
        subtotal: cartSubtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        totalCost,
        profit: estimatedProfit,
        paymentMethod,
        splitPayments: splitDetailObj,
        bankTransferReference: paymentMethod === 'transfer' ? transferRef : undefined,
        solanaSignature: paymentMethod === 'solana' ? (solanaSignature || undefined) : undefined,
        isCredit: isCredit || (paymentMethod === 'split' && (splitDetailObj?.credit || 0) > 0),
        debtDueDate: isCredit ? creditDueDate : undefined,
        notes: saleNotes || undefined,
        status: 'completed',
        createdAt: new Date().toISOString(),
        isSynced: typeof navigator !== 'undefined' ? navigator.onLine : false,
      };

      // Confetti effect
      try {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}

      onCompleteSale(newSale);
      storageService.clearCartDraft(business.id);
      clearCart();
      setIsCheckoutOpen(false);
      setIsCartMobileOpen(false);
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);
  const defaultBank = business.bankAccounts.find((b) => b.isDefault) || business.bankAccounts[0];

  // Cash change calculation
  const tenderedNum = parseFloat(cashTendered) || 0;
  const cashChange = Math.max(0, tenderedNum - totalAmount);

  return (
    <div className="space-y-4 pb-24 text-slate-100">
      {/* Stock Toast Notification */}
      {stockToastMessage && (
        <div className="fixed top-18 right-4 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-bounce border border-amber-300">
          <AlertTriangle className="w-4 h-4 text-slate-950 flex-shrink-0" />
          <span>{stockToastMessage}</span>
        </div>
      )}

      {/* POS Top Subtab Navigation Bar */}
      <div className="bg-slate-900/90 p-2.5 sm:p-3 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            id="tab-pos-register"
            onClick={() => setActiveSubTab('register')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition active:scale-95 whitespace-nowrap ${
              activeSubTab === 'register'
                ? 'bg-emerald-600 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Cashier Terminal</span>
            {cart.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-slate-950 text-emerald-400 text-[11px] font-black flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>

          <button
            id="tab-pos-history"
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition active:scale-95 whitespace-nowrap ${
              activeSubTab === 'history'
                ? 'bg-emerald-600 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Sales History & Receipts</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] text-slate-300">
              {sales.length}
            </span>
          </button>

          <button
            id="tab-pos-parked"
            onClick={() => setActiveSubTab('parked')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition active:scale-95 whitespace-nowrap ${
              activeSubTab === 'parked'
                ? 'bg-emerald-600 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <PauseCircle className="w-4 h-4" />
            <span>Parked Carts</span>
            {parkedCarts.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black flex items-center justify-center">
                {parkedCarts.length}
              </span>
            )}
          </button>
        </div>

        {/* Quick Cart Status on Right */}
        {activeSubTab === 'register' && cart.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 pr-2">
            <span className="text-xs text-slate-400">Total:</span>
            <span className="font-mono font-black text-sm text-emerald-400">
              {formatMoney(totalAmount, business)}
            </span>
          </div>
        )}
      </div>

      {/* VIEW 1: SALES HISTORY & RECEIPTS TAB */}
      {activeSubTab === 'history' && (
        <SalesHistoryView
          business={business}
          currentStaff={currentStaff}
          sales={sales}
          onOpenReceipt={onOpenReceipt}
          onVoidSale={onVoidSale}
          onSwitchToRegister={() => setActiveSubTab('register')}
        />
      )}

      {/* VIEW 2: PARKED CARTS ON-HOLD TAB */}
      {activeSubTab === 'parked' && (
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-400" />
                <span>On-Hold & Parked Carts</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Resume paused customer transactions without losing ringing progress
              </p>
            </div>
            <button
              onClick={() => setActiveSubTab('register')}
              className="px-3 py-1.5 bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl"
            >
              + Back to Register
            </button>
          </div>

          {parkedCarts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <PauseCircle className="w-12 h-12 mx-auto text-slate-600 opacity-40" />
              <p className="text-sm font-semibold text-slate-300">No parked carts right now</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                While ringing up a sale in the Register, tap "Hold / Park Cart" to serve another customer and resume later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {parkedCarts.map((pCart) => {
                const pCartSubtotal = pCart.items.reduce((s, i) => s + i.subtotal, 0);
                const pCartTotal = Math.max(0, pCartSubtotal - pCart.discountAmount);
                const pCust = customers.find((c) => c.id === pCart.customerId);

                return (
                  <div
                    key={pCart.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-col justify-between gap-3 shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-amber-300">{pCart.label}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(pCart.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {pCust && (
                        <p className="text-xs text-slate-300 mt-0.5">
                          Customer: <strong>{pCust.name}</strong> ({pCust.phone})
                        </p>
                      )}
                      <div className="mt-2 text-xs text-slate-400 space-y-1">
                        {pCart.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="truncate pr-2">{it.quantity}x {it.productName}</span>
                            <span className="font-mono text-slate-300">{formatMoney(it.subtotal, business, true)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Total Payable</span>
                        <span className="font-mono font-black text-sm text-emerald-400">
                          {formatMoney(pCartTotal, business)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteParkedCart(pCart.id)}
                          className="p-2 rounded-xl bg-slate-850 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
                          title="Discard Parked Cart"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleResumeParkedCart(pCart)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow transition active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Resume Cart</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: CASHIER TERMINAL (DEFAULT) */}
      {activeSubTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT / CENTER: Products Catalog & Search (7 cols on desktop) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Search & Custom Item Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="pos-search-input"
                  type="text"
                  placeholder="Search product name, SKU or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick Custom Item Button */}
              <button
                id="btn-pos-custom-item"
                onClick={() => setIsCustomItemOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs sm:text-sm rounded-2xl border border-slate-700 transition active:scale-95 flex-shrink-0"
                title="Add unlisted custom price item"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Custom Item</span>
                <span className="sm:hidden">Custom</span>
              </button>
            </div>

            {/* Categories scrollable pill row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Touch Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-slate-900/60 rounded-3xl border border-slate-800/80 p-6">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-40" />
                  <p className="text-sm font-semibold text-slate-300">No matching products found</p>
                  <p className="text-xs text-slate-500 mt-1">Try another search or tap "Custom Item" to enter any price directly.</p>
                  <button
                    onClick={() => setIsCustomItemOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-slate-950 font-black rounded-xl text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Custom Price Item</span>
                  </button>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const inCartItem = cart.find((i) => i.productId === product.id);
                  const isOutOfStock = product.stockQuantity <= 0;
                  const isLowStock = product.stockQuantity <= product.minStockThreshold && !isOutOfStock;

                  return (
                    <button
                      key={product.id}
                      id={`pos-product-${product.id}`}
                      disabled={isOutOfStock}
                      onClick={() => addToCart(product)}
                      className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between active:scale-95 group ${
                        isOutOfStock
                          ? 'bg-slate-950/60 border-slate-800/50 opacity-50 cursor-not-allowed'
                          : inCartItem
                          ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/50 shadow-md'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      {/* Top info */}
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <span className="text-xl">{product.imageEmoji || '📦'}</span>
                          {isOutOfStock ? (
                            <span className="text-[9px] font-bold uppercase bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800">
                              Out of stock
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[9px] font-bold uppercase bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800">
                              {product.stockQuantity} left
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              {product.stockQuantity} {product.unit}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-100 line-clamp-2 leading-tight">
                          {product.name}
                        </h4>
                      </div>

                      {/* Bottom price */}
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="font-extrabold text-xs sm:text-sm font-mono text-emerald-400">
                          {formatMoney(product.sellingPrice, business)}
                        </span>
                        {inCartItem ? (
                          <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black flex items-center justify-center shadow">
                            {inCartItem.quantity}
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-emerald-600 group-hover:text-slate-950 text-slate-400 text-xs flex items-center justify-center transition">
                            +
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Cart & Checkout Panel (5 cols on desktop) */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col h-full">
              {/* Cart Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">Active Register Cart</h3>
                    <p className="text-[10px] text-slate-400">{cart.length} line item{cart.length === 1 ? '' : 's'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <>
                      <button
                        onClick={() => setIsParkModalOpen(true)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition px-2 py-1 bg-amber-950/40 rounded-xl border border-amber-900/60"
                        title="Hold this cart to serve someone else"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>Hold Cart</span>
                      </button>

                      <button
                        onClick={clearCart}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Customer Attachment Picker */}
              <div className="my-3 p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <select
                    id="pos-customer-select"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="bg-transparent text-xs text-slate-200 focus:outline-none w-full truncate"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Walk-in Customer (Default)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                        {c.name} {c.currentDebt > 0 ? `(Owes ${formatMoney(c.currentDebt, business)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setIsNewCustomerOpen(true)}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 px-2 py-1 bg-slate-800 rounded-xl transition flex-shrink-0"
                >
                  + New
                </button>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto space-y-2 min-h-[160px] max-h-[260px] sm:max-h-[300px] pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-700 opacity-60" />
                    <p className="text-xs font-semibold text-slate-400">Cart is empty</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Tap products on the left or use Custom Item.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.productId}
                      className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <h5 className="font-semibold text-xs text-slate-100 truncate">{item.productName}</h5>
                        <p className="text-[10px] text-slate-400">
                          {formatMoney(item.unitPrice, business)} each
                        </p>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition active:scale-95"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold font-mono text-slate-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right min-w-[60px]">
                        <span className="text-xs font-bold font-mono text-emerald-400">
                          {formatMoney(item.subtotal, business)}
                        </span>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Discount & Tax & Profit Estimate Options Row */}
              {cart.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  {/* Profit Preview Badge */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-teal-950/40 border border-teal-900/60 text-[11px]">
                    <span className="text-teal-300 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Est. Gross Profit:
                    </span>
                    <span className="font-mono font-bold text-teal-300">
                      {formatMoney(estimatedProfit, business, true)} ({profitMarginPercent.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Discount:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">{business.currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={discountAmount || ''}
                        onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-right font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {business.taxRate > 0 && (
                    <div className="flex items-center justify-between text-slate-400">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyTax}
                          onChange={(e) => setApplyTax(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                        />
                        <span>Include VAT ({business.taxRate}%)</span>
                      </label>
                      {applyTax && <span>+{formatMoney(taxAmount, business)}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Cart Summary & Checkout Trigger */}
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400">Total Due:</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                    {formatMoney(totalAmount, business)}
                  </span>
                </div>

                <button
                  id="btn-pos-charge-checkout"
                  disabled={cart.length === 0}
                  onClick={() => {
                    setCashTendered(String(totalAmount));
                    setIsCheckoutOpen(true);
                  }}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
                    cart.length > 0
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/60 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Charge {formatMoney(totalAmount, business)}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL (Payment Channels: Cash, Transfer, POS, Credit, Split) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 p-5 max-h-[90vh] flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-black text-lg text-white">Payment Method</h3>
                <p className="text-xs text-slate-400">
                  Total Due: <strong className="text-emerald-400 font-mono">{formatMoney(totalAmount, business)}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 space-y-4">
              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { id: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote },
                  { id: 'transfer' as PaymentMethod, label: 'Transfer', icon: Building2 },
                  { id: 'pos' as PaymentMethod, label: 'POS Card', icon: CreditCard },
                  { id: 'credit' as PaymentMethod, label: 'Credit', icon: BookOpen },
                  { id: 'split' as PaymentMethod, label: 'Split', icon: Layers },
                  { id: 'solana' as PaymentMethod, label: 'USDC Pay', icon: ShieldCheck },
                ].map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      id={`pos-pm-${pm.id}`}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition active:scale-95 text-center ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 ring-1 ring-emerald-500 font-black'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-[11px] whitespace-nowrap">{pm.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mode 1: CASH WITH INSTANT CHANGE CALCULATOR */}
              {paymentMethod === 'cash' && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Customer Tendered:</span>
                    <span className="text-xs text-slate-400">
                      Change: <strong className="text-emerald-400 font-mono">{formatMoney(cashChange, business)}</strong>
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      {business.currencySymbol}
                    </span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={String(totalAmount)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-lg font-bold font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Fast Naira / Currency Denomination Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCashTendered(String(totalAmount))}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-emerald-400"
                    >
                      Exact Amount
                    </button>
                    {[1000, 2000, 5000, 10000, 20000, 50000].map((preset) => {
                      if (preset < totalAmount && preset * 2 < totalAmount) return null;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCashTendered(String(preset))}
                          className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 rounded-lg text-xs font-mono text-slate-300 border border-slate-800"
                        >
                          {formatMoney(preset, business, true)}
                        </button>
                      );
                    })}
                  </div>

                  {tenderedNum > 0 && tenderedNum >= totalAmount && (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-emerald-200">Return Customer Change:</span>
                      <span className="text-base font-black font-mono text-emerald-400">
                        {formatMoney(cashChange, business)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: BANK TRANSFER (Private Account Settlement) */}
              {paymentMethod === 'transfer' && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  {business.privateAccountNumber || defaultBank?.accountNumber ? (
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-medium">Private Settlement Account:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const acc = business.privateAccountNumber || defaultBank?.accountNumber || '';
                            navigator.clipboard.writeText(acc);
                            setAccountCopied(true);
                            setTimeout(() => setAccountCopied(false), 2000);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{accountCopied ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="font-bold text-sm text-slate-100">
                        {business.privateAccountBank || defaultBank?.bankName || 'Bank Transfer'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black font-mono text-emerald-400 tracking-wider">
                          {business.privateAccountNumber || defaultBank?.accountNumber}
                        </span>
                        <span className="text-[11px] text-slate-300 font-medium">
                          ({business.privateAccountName || defaultBank?.accountName || business.name})
                        </span>
                      </div>
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setIsSettlementModalOpen(true)}
                          className="text-[10px] text-slate-400 hover:text-emerald-400 underline"
                        >
                          Change Settlement Account
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-300 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-bold">No Private Bank Account Configured</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Add your private Nigerian bank account (NUBAN) so cashiers can display payment details to customers.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsSettlementModalOpen(true)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        Set Up Private Account
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Transfer Reference / Narration (Optional):</label>
                    <input
                      type="text"
                      placeholder="e.g. MNP-TRF-9102 or Sender Name"
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Mode 3: CARD POS TERMINAL */}
              {paymentMethod === 'pos' && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <p className="font-semibold text-slate-200">POS Terminal Transaction</p>
                  <p className="text-slate-400">
                    Charge customer card on your POS machine for <strong>{formatMoney(totalAmount, business)}</strong>.
                  </p>
                  <input
                    type="text"
                    placeholder="Terminal Auth Code / Ref (Optional)"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Mode 4: CREDIT / DEBT BOOK (Gbese) */}
              {paymentMethod === 'credit' && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-rose-900/50 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Customer Credit / Debt Book Sale</span>
                  </div>

                  {!selectedCustomerObj ? (
                    <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-200">
                      ⚠️ You must select or create a customer profile to track credit sales.
                      <button
                        type="button"
                        onClick={() => setIsNewCustomerOpen(true)}
                        className="mt-2 block font-bold underline text-white"
                      >
                        + Create Customer Now
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-300">
                      Debtor: <strong className="text-white">{selectedCustomerObj.name}</strong> ({selectedCustomerObj.phone})
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Repayment Due Date:</label>
                    <input
                      type="date"
                      value={creditDueDate}
                      onChange={(e) => setCreditDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Mode 5: SPLIT PAYMENT */}
              {paymentMethod === 'split' && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-300">Allocate Split Channels</span>
                    <span className={`font-mono font-bold ${splitRemaining === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      Remaining: {formatMoney(splitRemaining, business)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">💵 Cash Portion:</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-slate-100 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">📱 Transfer Portion:</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={splitTransfer}
                        onChange={(e) => setSplitTransfer(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-slate-100 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">💳 POS Card Portion:</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={splitPos}
                        onChange={(e) => setSplitPos(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-slate-100 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">📝 Credit / Debt Portion:</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={splitCredit}
                        onChange={(e) => setSplitCredit(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 6: SOLANA USDC SETTLEMENT */}
              {paymentMethod === 'solana' && (
                <div className="bg-gradient-to-b from-slate-950 to-slate-900 p-4 rounded-2xl border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-emerald-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                        ◎
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <span>Solana USDC Settlement</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                            SPL Token
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400">Instant Finality (~400ms) • Solana Mainnet</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Total in USDC</p>
                      <p className="text-sm sm:text-base font-black font-mono text-emerald-400">
                        {(totalAmount / (business.solanaUsdcNgnRate || 1550)).toFixed(2)} USDC
                      </p>
                    </div>
                  </div>

                  {business.solanaWalletAddress ? (
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Private Solana Wallet Address:</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(business.solanaWalletAddress);
                            setSolanaCopied(true);
                            setTimeout(() => setSolanaCopied(false), 2000);
                          }}
                          className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{solanaCopied ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-slate-300 break-all bg-slate-900 p-2 rounded-lg border border-slate-800">
                        {business.solanaWalletAddress}
                      </p>

                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                        <span>Rate: 1 USDC = ₦{(business.solanaUsdcNgnRate || 1550).toLocaleString()}</span>
                        <span>Network Fee: &lt; ₦0.50</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-purple-950/40 border border-purple-800/80 rounded-xl text-xs text-purple-300 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="font-bold">No Private Solana Wallet Linked</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Paste your existing Solana address or generate a brand new private keypair in 1 click to accept USDC.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsSettlementModalOpen(true)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        Configure Private Wallet
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={!business.solanaWalletAddress}
                      onClick={() => setIsSolanaModalOpen(true)}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition disabled:opacity-50"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Show Solana Pay QR & Live Blockchain Verifier</span>
                    </button>

                    {solanaSignature ? (
                      <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Tx Verified: <strong className="font-mono">{solanaSignature.slice(0, 16)}...</strong></span>
                        </div>
                        <a
                          href={`https://explorer.solana.com/tx/${solanaSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-400 underline flex items-center gap-0.5"
                        >
                          <span>Explorer</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          Or enter verified Solana Transaction Signature:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 5K6F9mN..."
                          value={solanaSignature}
                          onChange={(e) => setSolanaSignature(e.target.value.trim())}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sale Notes */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Receipt Remark / Note (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Delivered to shop, discount applied"
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Modal Bottom Finalize Button */}
            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm rounded-xl transition"
              >
                Back
              </button>

              <button
                type="button"
                id="btn-confirm-complete-sale"
                onClick={handleFinalizeSale}
                disabled={isSubmittingSale}
                className={`flex-1 py-3 font-black text-sm sm:text-base rounded-xl transition active:scale-95 shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer ${
                  isSubmittingSale
                    ? 'bg-emerald-700 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {isSubmittingSale ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Processing Sale...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Confirm & Generate Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING MOBILE CART BAR (Visible on small screens when register has items) */}
      {activeSubTab === 'register' && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-18 left-3 right-3 z-30 animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/60 p-2.5 sm:p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-2 text-slate-100">
            <button
              onClick={() => setIsCartMobileOpen(true)}
              className="flex items-center gap-2.5 pl-1.5 min-w-0 text-left cursor-pointer"
            >
              <div className="relative p-2 bg-emerald-950/80 border border-emerald-800/80 rounded-xl flex-shrink-0">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">Tap to View Cart</span>
                <span className="font-mono font-black text-sm text-emerald-400 truncate block">
                  {formatMoney(totalAmount, business)}
                </span>
              </div>
            </button>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer flex-shrink-0"
            >
              <span>Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PARK CART POPUP */}
      {isParkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleParkCart}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-amber-400" />
                <span>Hold / Park Current Cart</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsParkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Cart Label / Identifier:</label>
              <input
                type="text"
                placeholder="e.g. Customer in Red Cap or Table 2"
                value={parkCartLabel}
                onChange={(e) => setParkCartLabel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <p className="text-[11px] text-slate-400">
              This temporarily stores the {cart.length} items so you can start ringing up the next customer immediately.
            </p>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition"
            >
              Save & Hold Cart
            </button>
          </form>
        </div>
      )}

      {/* CUSTOM SALE ITEM POPUP */}
      {isCustomItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleAddCustomItem}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100">Add Quick Custom Item</h3>
              <button
                type="button"
                onClick={() => setIsCustomItemOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Item Title / Description:</label>
              <input
                type="text"
                required
                placeholder="e.g. Special Fabric or Service"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Selling Price ({business.currencySymbol}):</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 5000"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Quantity:</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Cost Price (Optional - for Profit Calc):</label>
              <input
                type="number"
                placeholder="Estimated wholesale cost"
                value={customCost}
                onChange={(e) => setCustomCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
            >
              Add to Cart
            </button>
          </form>
        </div>
      )}

      {/* QUICK NEW CUSTOMER POPUP */}
      {isNewCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleCreateCustomer}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100">Quick Add Customer</h3>
              <button
                type="button"
                onClick={() => setIsNewCustomerOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Customer Full Name:</label>
              <input
                type="text"
                required
                placeholder="e.g. Alhaji Sani or Mama Chidi"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Phone Number (WhatsApp):</label>
              <input
                type="tel"
                required
                placeholder="e.g. 0803 123 4567"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
            >
              Save & Attach to Sale
            </button>
          </form>
        </div>
      )}

      {/* Solana Payment Modal */}
      {isSolanaModalOpen && (
        <SolanaPaymentModal
          isOpen={isSolanaModalOpen}
          onClose={() => setIsSolanaModalOpen(false)}
          business={business}
          amountNgn={totalAmount}
          customerName={customers.find((c) => c.id === selectedCustomerId)?.name || (selectedCustomerId ? 'Customer' : 'Walk-in')}
          customerPhone={customers.find((c) => c.id === selectedCustomerId)?.phone}
          onPaymentConfirmed={handleSolanaPosConfirmed}
        />
      )}

      {/* Private Settlement Modal */}
      {isSettlementModalOpen && onUpdateBusiness && (
        <PrivateSettlementModal
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          business={business}
          onUpdateBusiness={onUpdateBusiness}
        />
      )}
    </div>
  );
};
