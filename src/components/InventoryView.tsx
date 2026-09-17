import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  TrendingUp,
  RefreshCw,
  Barcode,
  X,
  Check,
  Filter,
  DollarSign,
  ArrowUpRight,
  Lock,
} from 'lucide-react';
import { Product, BusinessProfile, StaffUser } from '../types';
import { formatMoney } from '../utils/formatters';
import { PRODUCT_CATEGORIES } from '../services/nigerianData';

interface InventoryViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  products: Product[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onRestockProduct: (productId: string, addedQty: number, newCostPrice?: number) => void;
  initialRestockProduct?: Product | null;
  onClearInitialRestock?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  business,
  currentStaff,
  products,
  onSaveProduct,
  onDeleteProduct,
  onRestockProduct,
  initialRestockProduct,
  onClearInitialRestock,
}) => {
  // Permission checks
  const canViewProfit = currentStaff.role === 'owner' || currentStaff.role === 'accountant' || currentStaff.canViewProfit === true;
  const canManageInventory = currentStaff.role === 'owner' || currentStaff.role === 'manager' || currentStaff.role === 'inventory_manager' || currentStaff.canManageInventory === true;
  const canChangePrices = currentStaff.role === 'owner' || currentStaff.role === 'manager' || currentStaff.canChangePrices === true;
  const canDeleteProducts = currentStaff.role === 'owner' || currentStaff.canDeleteProducts === true;
  const canRestock = currentStaff.role === 'owner' || currentStaff.role === 'manager' || currentStaff.role === 'inventory_manager' || currentStaff.canRestock === true;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockTargetProduct, setRestockTargetProduct] = useState<Product | null>(initialRestockProduct || null);
  const [restockQty, setRestockQty] = useState<string>('10');
  const [restockNewCost, setRestockNewCost] = useState<string>('');

  // Auto-open restock modal if triggered from Dashboard
  React.useEffect(() => {
    if (initialRestockProduct) {
      setRestockTargetProduct(initialRestockProduct);
      setRestockNewCost(String(initialRestockProduct.costPrice));
      setIsRestockModalOpen(true);
      if (onClearInitialRestock) onClearInitialRestock();
    }
  }, [initialRestockProduct, onClearInitialRestock]);

  // Form fields for Add/Edit
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formStockQty, setFormStockQty] = useState('');
  const [formMinThreshold, setFormMinThreshold] = useState('5');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formEmoji, setFormEmoji] = useState('📦');

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesLowStock = !filterLowStockOnly || p.stockQuantity <= p.minStockThreshold;
      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [products, searchQuery, selectedCategory, filterLowStockOnly]);

  // Inventory valuation
  const totalCostValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + p.costPrice * p.stockQuantity, 0);
  }, [products]);

  const totalRetailValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + p.sellingPrice * p.stockQuantity, 0);
  }, [products]);

  const totalPotentialProfit = totalRetailValuation - totalCostValuation;

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= p.minStockThreshold).length;
  }, [products]);

  // Open modal for new product
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(PRODUCT_CATEGORIES[0]);
    setFormSku(`SKU-${Math.floor(100 + Math.random() * 900)}`);
    setFormBarcode(`615${Math.floor(100000000 + Math.random() * 900000000)}`);
    setFormCostPrice('');
    setFormSellingPrice('');
    setFormStockQty('20');
    setFormMinThreshold(String(business.lowStockGlobalThreshold || 5));
    setFormUnit('pcs');
    setFormEmoji('📦');
    setIsEditModalOpen(true);
  };

  // Open modal for edit product
  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormCostPrice(String(p.costPrice));
    setFormSellingPrice(String(p.sellingPrice));
    setFormStockQty(String(p.stockQuantity));
    setFormMinThreshold(String(p.minStockThreshold));
    setFormUnit(p.unit);
    setFormEmoji(p.imageEmoji || '📦');
    setIsEditModalOpen(true);
  };

  // Save product submit
  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(formCostPrice) || 0;
    const sell = parseFloat(formSellingPrice) || 0;
    const stock = parseInt(formStockQty) || 0;
    const minThreshold = parseInt(formMinThreshold) || 5;

    if (!formName.trim() || sell <= 0) {
      alert('Please provide a valid product name and selling price.');
      return;
    }

    const productObj: Product = {
      id: editingProduct ? editingProduct.id : 'prod_' + Date.now(),
      businessId: business.id,
      name: formName.trim(),
      category: formCategory,
      sku: formSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: formBarcode.trim() || undefined,
      costPrice: cost,
      sellingPrice: sell,
      stockQuantity: stock,
      minStockThreshold: minThreshold,
      unit: formUnit,
      imageEmoji: formEmoji || '📦',
      isActive: true,
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(productObj);
    setIsEditModalOpen(false);
  };

  // Restock submit
  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTargetProduct) return;
    const qty = parseInt(restockQty) || 0;
    const newCost = restockNewCost ? parseFloat(restockNewCost) : undefined;
    if (qty <= 0) return;

    onRestockProduct(restockTargetProduct.id, qty, newCost);
    setIsRestockModalOpen(false);
    setRestockTargetProduct(null);
  };

  // Margin preview calculation
  const previewCost = parseFloat(formCostPrice) || 0;
  const previewSell = parseFloat(formSellingPrice) || 0;
  const previewProfit = previewSell - previewCost;
  const previewMargin = previewSell > 0 ? ((previewProfit / previewSell) * 100).toFixed(1) : '0';

  const unitsList = ['pcs', 'carton', 'pack', 'tin', 'keg', 'bottle', 'kg', 'bag', 'roll', 'pair', 'yards', 'plate'];
  const emojisList = ['🍝', '🥛', '☕', '🛢️', '🍜', '🍚', '💧', '🥤', '🔌', '🧴', '👗', '👟', '📦', '🍞', '🥫', '🍫', '🧼'];

  return (
    <div className="space-y-4 pb-24 text-slate-100">
      {/* Top Header & Valuation Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Stock & Inventory</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {products.length} products listed • {lowStockCount} items need restocking
          </p>
        </div>

        {canManageInventory && (
          <button
            id="btn-add-new-product"
            onClick={handleOpenNewProduct}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Valuation Metrics Bar */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">Total Cost Stock</span>
            {!canViewProfit && <Lock className="w-3 h-3 text-slate-500" />}
          </div>
          {canViewProfit ? (
            <span className="text-sm sm:text-base font-bold font-mono text-slate-100 mt-0.5 block">
              {formatMoney(totalCostValuation, business)}
            </span>
          ) : (
            <span className="text-xs font-mono text-slate-500 mt-0.5 block">🔒 Restricted</span>
          )}
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-400 block truncate">Total Retail Value</span>
          <span className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-0.5 block">
            {formatMoney(totalRetailValuation, business)}
          </span>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">Potential Profit</span>
            {!canViewProfit && <Lock className="w-3 h-3 text-slate-500" />}
          </div>
          {canViewProfit ? (
            <span className="text-sm sm:text-base font-bold font-mono text-teal-400 mt-0.5 block">
              {formatMoney(totalPotentialProfit, business)}
            </span>
          ) : (
            <span className="text-xs font-mono text-slate-500 mt-0.5 block">🔒 Restricted</span>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold border transition ${
              filterLowStockOnly
                ? 'bg-amber-950/80 text-amber-300 border-amber-800 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Low Stock ({lowStockCount})</span>
          </button>
        </div>

        {/* Categories scroll row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {['All', ...PRODUCT_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table / Cards */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800/80">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No inventory products found matching your search.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isLowStock = p.stockQuantity <= p.minStockThreshold;
              const isOutOfStock = p.stockQuantity <= 0;
              const profitPerItem = p.sellingPrice - p.costPrice;
              const margin = p.sellingPrice > 0 ? ((profitPerItem / p.sellingPrice) * 100).toFixed(0) : 0;

              return (
                <div
                  key={p.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/50 transition"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="text-2xl p-2 rounded-2xl bg-slate-950 border border-slate-800 flex-shrink-0">
                      {p.imageEmoji || '📦'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-100 truncate">{p.name}</h3>
                        {isOutOfStock ? (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                            Out of stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                            Low Stock
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                        <span>Category: <strong className="text-slate-300">{p.category}</strong></span>
                        <span>SKU: <strong className="text-slate-300 font-mono">{p.sku}</strong></span>
                        {p.barcode && <span>Barcode: <strong className="text-slate-300 font-mono">{p.barcode}</strong></span>}
                      </div>
                    </div>
                  </div>

                  {/* Stock count, prices & actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    {/* Price & Margin block */}
                    <div className="text-left sm:text-right">
                      {canViewProfit ? (
                        <>
                          <span className="text-xs text-slate-400 block">
                            Cost: {formatMoney(p.costPrice, business)} • <strong className="text-emerald-400 font-mono text-sm">{formatMoney(p.sellingPrice, business)}</strong>
                          </span>
                          <span className="text-[10px] text-teal-300">
                            Profit: +{formatMoney(profitPerItem, business)} ({margin}% margin)
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-300 block font-mono">
                          Price: <strong className="text-emerald-400 text-sm font-bold">{formatMoney(p.sellingPrice, business)}</strong>
                        </span>
                      )}
                    </div>

                    {/* Stock level pill */}
                    <div className="text-center min-w-[70px]">
                      <span
                        className={`text-xs font-bold font-mono px-2.5 py-1 rounded-xl block ${
                          isOutOfStock
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : isLowStock
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {p.stockQuantity} {p.unit}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {canRestock && (
                        <button
                          onClick={() => {
                            setRestockTargetProduct(p);
                            setRestockNewCost(String(p.costPrice));
                            setRestockQty('10');
                            setIsRestockModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
                          title="Restock this item"
                        >
                          + Restock
                        </button>
                      )}

                      {canManageInventory && (
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                          title="Edit product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {canDeleteProducts && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${p.name}? This administrative action will be recorded in the audit log.`)) {
                              onDeleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                          title="🚨 Delete product (Owner/Admin action)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <form
            onSubmit={handleSaveProductSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">
                {editingProduct ? 'Edit Inventory Item' : 'Add New Inventory Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Emoji Icon Picker */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Product Icon:</label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 rounded-2xl border border-slate-800">
                {emojisList.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setFormEmoji(em)}
                    className={`w-8 h-8 text-base rounded-xl transition ${
                      formEmoji === em
                        ? 'bg-emerald-600 scale-110 shadow-md'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Name */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Product Title / Name:</label>
              <input
                type="text"
                required
                placeholder="e.g. Peak Evaporated Milk (150g)"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Category:</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Unit of Measurement:</label>
                <select
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {unitsList.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing Section (Cost Price, Selling Price, Margin Preview) */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {canViewProfit ? (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Cost Price ({business.currencySymbol}):</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 650"
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Cost Price:
                    </label>
                    <div className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-xs font-mono text-slate-500">
                      [Restricted]
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-emerald-400 font-semibold block mb-1 flex items-center justify-between">
                    <span>Selling Price ({business.currencySymbol}):</span>
                    {!canChangePrices && editingProduct && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    disabled={!canChangePrices && Boolean(editingProduct)}
                    placeholder="e.g. 850"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none ${
                      !canChangePrices && editingProduct
                        ? 'bg-slate-900/60 border border-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-900 border border-emerald-600/70 text-emerald-400 focus:border-emerald-500'
                    }`}
                  />
                  {!canChangePrices && editingProduct && (
                    <p className="text-[10px] text-amber-400 mt-1">
                      Price modification restricted to Store Manager / Owner.
                    </p>
                  )}
                </div>
              </div>

              {canViewProfit && previewSell > 0 && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Profit Margin:</span>
                  <span className="font-bold text-emerald-400">
                    +{formatMoney(previewProfit, business)} ({previewMargin}%)
                  </span>
                </div>
              )}
            </div>

            {/* Stock Quantities */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Initial Stock Qty ({formUnit}):</label>
                <input
                  type="number"
                  min="0"
                  value={formStockQty}
                  onChange={(e) => setFormStockQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Low Stock Alert Threshold:</label>
                <input
                  type="number"
                  min="1"
                  value={formMinThreshold}
                  onChange={(e) => setFormMinThreshold(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* SKU & Barcode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">SKU / Item Code:</label>
                <input
                  type="text"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Barcode (Optional):</label>
                <input
                  type="text"
                  placeholder="Scan or type barcode"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition active:scale-95 shadow-md shadow-emerald-950"
              >
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QUICK RESTOCK MODAL */}
      {isRestockModalOpen && restockTargetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleRestockSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white">Restock Product</h3>
                <p className="text-xs text-slate-400">{restockTargetProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRestockModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Stock:</span>
              <span className="font-bold font-mono text-amber-400">
                {restockTargetProduct.stockQuantity} {restockTargetProduct.unit}
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Additional Quantity to Add ({restockTargetProduct.unit}):
              </label>
              <input
                type="number"
                required
                min="1"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                New Cost Price per {restockTargetProduct.unit} ({business.currencySymbol}) (Optional):
              </label>
              <input
                type="number"
                min="0"
                placeholder={String(restockTargetProduct.costPrice)}
                value={restockNewCost}
                onChange={(e) => setRestockNewCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Leave as is if wholesale buying price did not change.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition active:scale-95 shadow-md"
            >
              Confirm Restock (+{restockQty} {restockTargetProduct.unit})
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
