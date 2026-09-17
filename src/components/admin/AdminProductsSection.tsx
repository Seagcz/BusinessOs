import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Percent,
  AlertTriangle,
  Check,
  X,
  Sparkles,
  Archive,
  RefreshCw,
  DollarSign,
  ArrowUpDown,
} from 'lucide-react';
import { Product, BusinessProfile } from '../../types';
import { PRODUCT_CATEGORIES } from '../../services/nigerianData';

interface AdminProductsSectionProps {
  business: BusinessProfile;
  products: Product[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onLogActivity?: (action: string, details: string, entityType: 'product') => void;
}

export const AdminProductsSection: React.FC<AdminProductsSectionProps> = ({
  business,
  products,
  onSaveProduct,
  onDeleteProduct,
  onLogActivity,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'low_stock'>('all');

  // Product Add / Edit Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(10);
  const [minThreshold, setMinThreshold] = useState(5);
  const [unit, setUnit] = useState('pcs');
  const [imageEmoji, setImageEmoji] = useState('📦');
  const [isActive, setIsActive] = useState(true);

  // Batch Pricing Modal State
  const [isBatchPriceModalOpen, setIsBatchPriceModalOpen] = useState(false);
  const [batchCategory, setBatchCategory] = useState('all');
  const [batchTarget, setBatchTarget] = useState<'selling' | 'cost'>('selling');
  const [batchType, setBatchType] = useState<'percent' | 'fixed'>('percent');
  const [batchValue, setBatchValue] = useState<number>(10);
  const [batchDirection, setBatchDirection] = useState<'increase' | 'decrease'>('increase');
  const [batchSuccessMessage, setBatchSuccessMessage] = useState('');

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;

      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = p.isActive !== false;
      if (statusFilter === 'archived') matchStatus = p.isActive === false;
      if (statusFilter === 'low_stock') matchStatus = p.stockQuantity <= p.minStockThreshold;

      return matchSearch && matchCat && matchStatus;
    });
  }, [products, searchQuery, selectedCategory, statusFilter]);

  // Overall Inventory Stats
  const stats = useMemo(() => {
    const totalCount = products.length;
    const activeCount = products.filter((p) => p.isActive !== false).length;
    const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockThreshold).length;
    const totalCostValue = products.reduce((sum, p) => sum + p.costPrice * p.stockQuantity, 0);
    const totalRetailValue = products.reduce((sum, p) => sum + p.sellingPrice * p.stockQuantity, 0);
    const potentialProfit = totalRetailValue - totalCostValue;

    return { totalCount, activeCount, lowStockCount, totalCostValue, totalRetailValue, potentialProfit };
  }, [products]);

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setName('');
    setCategory(PRODUCT_CATEGORIES[0]);
    setSku('SKU-' + Math.floor(1000 + Math.random() * 9000));
    setBarcode('');
    setCostPrice(1000);
    setSellingPrice(1300);
    setStockQuantity(10);
    setMinThreshold(5);
    setUnit('pcs');
    setImageEmoji('📦');
    setIsActive(true);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setSku(p.sku || '');
    setBarcode(p.barcode || '');
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setStockQuantity(p.stockQuantity);
    setMinThreshold(p.minStockThreshold);
    setUnit(p.unit || 'pcs');
    setImageEmoji(p.imageEmoji || '📦');
    setIsActive(p.isActive !== false);
    setIsProductModalOpen(true);
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const prodObj: Product = {
      id: editingProduct ? editingProduct.id : 'prod_' + Date.now(),
      businessId: business.id,
      name: name.trim(),
      category,
      sku: sku.trim() || 'SKU-' + Date.now().toString().slice(-4),
      barcode: barcode.trim() || undefined,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      stockQuantity: Number(stockQuantity) || 0,
      minStockThreshold: Number(minThreshold) || 5,
      unit: unit.trim() || 'pcs',
      imageEmoji: imageEmoji || '📦',
      isActive,
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(prodObj);
    if (onLogActivity) {
      onLogActivity(
        editingProduct ? 'Updated Product Details' : 'Created New Product',
        `${prodObj.name} (Cost: ₦${prodObj.costPrice.toLocaleString()}, Selling: ₦${prodObj.sellingPrice.toLocaleString()})`,
        'product'
      );
    }
    setIsProductModalOpen(false);
  };

  const handleApplyBatchPricing = (e: React.FormEvent) => {
    e.preventDefault();
    const multiplier = batchDirection === 'increase' ? 1 : -1;
    let modifiedCount = 0;

    products.forEach((p) => {
      if (batchCategory !== 'all' && p.category !== batchCategory) return;

      let newSelling = p.sellingPrice;
      let newCost = p.costPrice;

      if (batchTarget === 'selling') {
        if (batchType === 'percent') {
          const delta = (p.sellingPrice * batchValue) / 100;
          newSelling = Math.max(1, Math.round(p.sellingPrice + multiplier * delta));
        } else {
          newSelling = Math.max(1, p.sellingPrice + multiplier * batchValue);
        }
      } else {
        if (batchType === 'percent') {
          const delta = (p.costPrice * batchValue) / 100;
          newCost = Math.max(0, Math.round(p.costPrice + multiplier * delta));
        } else {
          newCost = Math.max(0, p.costPrice + multiplier * batchValue);
        }
      }

      const updated = {
        ...p,
        sellingPrice: newSelling,
        costPrice: newCost,
        updatedAt: new Date().toISOString(),
      };
      onSaveProduct(updated);
      modifiedCount++;
    });

    if (onLogActivity) {
      onLogActivity(
        'Batch Price Adjustment Applied',
        `Adjusted ${batchTarget} price by ${batchDirection === 'increase' ? '+' : '-'}${batchValue}${
          batchType === 'percent' ? '%' : ' NGN'
        } for ${modifiedCount} products in ${batchCategory === 'all' ? 'All Categories' : batchCategory}`,
        'product'
      );
    }

    setBatchSuccessMessage(`Successfully updated ${modifiedCount} products!`);
    setTimeout(() => {
      setBatchSuccessMessage('');
      setIsBatchPriceModalOpen(false);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Inventory Valuation Header Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold block">Total Catalog Items</span>
          <p className="text-xl sm:text-2xl font-black text-white">{stats.totalCount}</p>
          <span className="text-[10px] text-emerald-400 font-bold">{stats.activeCount} Active in Store</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold block">Total Stock Valuation (Cost)</span>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-200">
            {business.currencySymbol || '₦'}{stats.totalCostValue.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Total purchase inventory cost</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold block">Expected Retail Revenue</span>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {business.currencySymbol || '₦'}{stats.totalRetailValue.toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-300/80 font-bold">
            +{business.currencySymbol || '₦'}{stats.potentialProfit.toLocaleString()} gross profit
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold block">Low Stock Alerts</span>
          <p
            className={`text-xl sm:text-2xl font-black ${
              stats.lowStockCount > 0 ? 'text-amber-400' : 'text-slate-200'
            }`}
          >
            {stats.lowStockCount}
          </p>
          <span className="text-[10px] text-slate-400">Below minimum threshold</span>
        </div>
      </div>

      {/* Product Management Console */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              <span>Products & Catalog Management ({filteredProducts.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure cost pricing, markup margins, barcodes, units, and apply batch price adjustments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBatchPriceModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800 text-xs font-bold rounded-xl transition active:scale-95"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Batch Price Tool</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddProduct}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search product, SKU or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Categories ({products.length})</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Product Statuses</option>
              <option value="active">Active Only</option>
              <option value="low_stock">⚠️ Low Stock Threshold</option>
              <option value="archived">Archived / Inactive</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3.5">Product & SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-right">Margin / Markup</th>
                <th className="py-3 px-3 text-center">Stock Qty</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const margin = p.sellingPrice - p.costPrice;
                  const markupPct = p.costPrice > 0 ? Math.round((margin / p.costPrice) * 100) : 0;
                  const isLow = p.stockQuantity <= p.minStockThreshold;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-800/40 transition ${
                        p.isActive === false ? 'opacity-50 bg-slate-950/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{p.imageEmoji || '📦'}</span>
                          <div>
                            <p className="font-bold text-slate-100">{p.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              SKU: {p.sku || 'N/A'} {p.barcode ? `• Barcode: ${p.barcode}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-400 text-[11px]">{p.category}</td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-300">
                        {business.currencySymbol || '₦'}{p.costPrice.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {business.currencySymbol || '₦'}{p.sellingPrice.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="font-mono text-emerald-300 font-bold">
                          +{business.currencySymbol || '₦'}{margin.toLocaleString()}
                        </span>
                        <span className="block text-[10px] text-slate-400">({markupPct}%)</span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono font-black px-2 py-0.5 rounded-lg ${
                            isLow
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-slate-950 text-slate-200 border border-slate-800'
                          }`}
                        >
                          {p.stockQuantity} {p.unit || 'pcs'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.isActive !== false
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.isActive !== false ? 'Active' : 'Archived'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(p)}
                            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete product ${p.name}?`)) {
                                onDeleteProduct(p.id);
                                if (onLogActivity) {
                                  onLogActivity('Deleted Product', `Removed ${p.name}`, 'product');
                                }
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveProductSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">
                  {editingProduct ? 'Edit Catalog Product' : 'Add New Product'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Product Name <span className="text-rose-400">*</span>:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Golden Penny Spaghetti 500g"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Category:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Unit of Measurement:</label>
                <input
                  type="text"
                  placeholder="e.g. pcs, pack, carton, roll, kg, tin"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Cost Price (NGN):</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Selling Price (NGN):</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Profit Margin Preview Callout */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Calculated Gross Profit:</span>
              <div className="text-right">
                <span className="font-mono font-bold text-emerald-400">
                  +{business.currencySymbol || '₦'}{(sellingPrice - costPrice).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">
                  ({costPrice > 0 ? Math.round(((sellingPrice - costPrice) / costPrice) * 100) : 0}% Markup)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Stock Quantity in Store:</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Low Stock Alert Threshold:</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">SKU Code:</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Barcode (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. 615110001020"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-800 focus:ring-0"
                />
                <span>Active Product (Available for sale at POS)</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-950 active:scale-95"
              >
                {editingProduct ? 'Save Product Changes' : 'Add to Store Catalog'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BATCH PRICING TOOL MODAL */}
      {isBatchPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleApplyBatchPricing}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Batch Price Adjustment</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchPriceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {batchSuccessMessage ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-emerald-300">{batchSuccessMessage}</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Target Products Category:</label>
                  <select
                    value={batchCategory}
                    onChange={(e) => setBatchCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">All Store Products ({products.length} items)</option>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Price Field:</label>
                    <select
                      value={batchTarget}
                      onChange={(e) => setBatchTarget(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    >
                      <option value="selling">Selling Price</option>
                      <option value="cost">Cost / Buy Price</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Adjustment Mode:</label>
                    <select
                      value={batchDirection}
                      onChange={(e) => setBatchDirection(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    >
                      <option value="increase">Increase (+)</option>
                      <option value="decrease">Decrease (-)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Type:</label>
                    <select
                      value={batchType}
                      onChange={(e) => setBatchType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed Naira (₦)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Value Amount:</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={batchValue}
                      onChange={(e) => setBatchValue(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl text-xs text-purple-300">
                  This will {batchDirection} {batchTarget} prices by {batchValue}
                  {batchType === 'percent' ? '%' : ' NGN'} across {batchCategory === 'all' ? 'all' : batchCategory}{' '}
                  products.
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-purple-950 active:scale-95"
                  >
                    Apply Batch Price Changes
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
