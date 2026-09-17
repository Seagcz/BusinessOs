import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  Calendar,
  DollarSign,
  TrendingDown,
  Tag,
  Zap,
  X,
  Check,
  Fuel,
  Lightbulb,
} from 'lucide-react';
import { Expense, ExpenseCategory, BusinessProfile, StaffUser } from '../types';
import { formatMoney, formatDate, formatShortDate } from '../utils/formatters';
import { EXPENSE_CATEGORIES_CONFIG } from '../services/nigerianData';

interface ExpensesViewProps {
  business: BusinessProfile;
  currentStaff: StaffUser;
  expenses: Expense[];
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  business,
  currentStaff,
  expenses,
  onSaveExpense,
  onDeleteExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Add modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('generator_fuel');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'cash' | 'transfer' | 'pos'>('cash');
  const [formReceiptNote, setFormReceiptNote] = useState('');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.receiptNote && e.receiptNote.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;

      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = e.date.startsWith(todayStr);
      } else if (dateFilter === 'month') {
        matchesDate = e.date.startsWith(thisMonthStr);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        matchesDate = e.date >= weekAgo;
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [expenses, searchQuery, selectedCategory, dateFilter, todayStr, thisMonthStr]);

  // Metrics
  const todayTotal = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(todayStr))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, todayStr]);

  const monthTotal = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(thisMonthStr))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, thisMonthStr]);

  // Quick preset shortcuts
  const applyPreset = (title: string, cat: ExpenseCategory, defaultAmt?: number) => {
    setFormTitle(title);
    setFormCategory(cat);
    if (defaultAmt) setFormAmount(String(defaultAmt));
    setIsAddModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (!formTitle.trim() || isNaN(amt) || amt <= 0) {
      alert('Please enter a valid expense title and amount.');
      return;
    }

    const newExpense: Expense = {
      id: 'exp_' + Date.now(),
      businessId: business.id,
      title: formTitle.trim(),
      category: formCategory,
      amount: amt,
      paymentMethod: formPaymentMethod,
      date: new Date().toISOString(),
      recordedBy: currentStaff.name,
      receiptNote: formReceiptNote.trim() || undefined,
      isSynced: true,
    };

    onSaveExpense(newExpense);
    setIsAddModalOpen(false);
    setFormTitle('');
    setFormAmount('');
    setFormReceiptNote('');
  };

  return (
    <div className="space-y-4 pb-24 text-slate-100">
      {/* Header & Metrics */}
      <div className="bg-slate-900/90 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-400" />
              <h1 className="text-xl font-bold text-white">Expenses & Operating Costs</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Track generator fuel, NEPA electricity, staff daily feeding, shop rent & logistics
            </p>
          </div>

          <button
            id="btn-add-new-expense"
            onClick={() => {
              setFormTitle('');
              setFormAmount('');
              setFormReceiptNote('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-amber-950 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>

        {/* 2 Big Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">Today's Expenses</span>
            <span className="text-base sm:text-lg font-extrabold font-mono text-amber-400 mt-0.5 block">
              {formatMoney(todayTotal, business)}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">This Month's Total</span>
            <span className="text-base sm:text-lg font-extrabold font-mono text-slate-200 mt-0.5 block">
              {formatMoney(monthTotal, business)}
            </span>
          </div>
        </div>

        {/* Quick Nigerian Daily Presets */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">⚡ 1-Tap Quick Presets:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => applyPreset('Generator Fuel (PMS 15 Litres)', 'generator_fuel', 12750)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition"
            >
              ⛽ Gen Fuel 15L
            </button>
            <button
              onClick={() => applyPreset('NEPA / Disco Prepaid Token', 'electricity_nepa', 5000)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition"
            >
              💡 NEPA Token
            </button>
            <button
              onClick={() => applyPreset('Staff Daily Feeding Allowance', 'staff_salaries', 2500)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition"
            >
              👥 Staff Lunch
            </button>
            <button
              onClick={() => applyPreset('Nylon Carrier Bags Bundle', 'packaging', 4500)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition"
            >
              🛍️ Nylon Bags
            </button>
            <button
              onClick={() => applyPreset('Dispatch / Errand Transport Fare', 'transport_dispatch', 2000)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition"
            >
              🛵 Dispatch Fare
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-0.5 text-xs">
            {(['today', 'week', 'month', 'all'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`px-2.5 py-1.5 rounded-xl capitalize font-semibold transition ${
                  dateFilter === d
                    ? 'bg-slate-800 text-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Categories scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === 'All'
                ? 'bg-amber-600 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            All Categories
          </button>
          {Object.entries(EXPENSE_CATEGORIES_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === key
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/50'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{config.iconEmoji}</span>
              <span>{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800/80">
          {filteredExpenses.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No expenses recorded for this selection.
            </div>
          ) : (
            filteredExpenses.map((exp) => {
              const catConfig = EXPENSE_CATEGORIES_CONFIG[exp.category] || {
                label: exp.category,
                iconEmoji: '📦',
              };

              return (
                <div
                  key={exp.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-850/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl p-2 rounded-2xl bg-slate-950 border border-slate-800 flex-shrink-0">
                      {catConfig.iconEmoji}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-100 truncate">{exp.title}</h4>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {exp.paymentMethod}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {catConfig.label} • {formatShortDate(exp.date)} (by {exp.recordedBy})
                      </p>
                      {exp.receiptNote && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5 truncate">
                          "{exp.receiptNote}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm sm:text-base font-extrabold font-mono text-amber-400">
                      -{formatMoney(exp.amount, business)}
                    </span>

                    {currentStaff.canManageExpenses && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete expense: ${exp.title}?`)) {
                            onDeleteExpense(exp.id);
                          }
                        }}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Delete expense entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Record Business Expense</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Expense Description / Title:</label>
              <input
                type="text"
                required
                placeholder="e.g. Generator Fuel 20L or Market Security ticket"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Amount ({business.currencySymbol}):</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 5000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Payment Method:</label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="cash">Cash in Hand</option>
                  <option value="transfer">Bank Transfer</option>
                  <option value="pos">Card / POS</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Category:</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {Object.entries(EXPENSE_CATEGORIES_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.iconEmoji} {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Remark / Receipt Note (Optional):</label>
              <input
                type="text"
                placeholder="e.g. Bought from filling station down the road"
                value={formReceiptNote}
                onChange={(e) => setFormReceiptNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition active:scale-95 shadow-md shadow-amber-950"
            >
              Record Expense Entry
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
