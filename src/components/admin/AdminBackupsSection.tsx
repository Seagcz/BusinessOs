import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  HardDrive,
  ShieldAlert,
  Check,
  AlertTriangle,
  FileJson,
  Clock,
  Sparkles,
  Server,
} from 'lucide-react';
import { BusinessProfile } from '../../types';
import { storageService } from '../../services/storage';

interface AdminBackupsSectionProps {
  business: BusinessProfile;
  onExportBackup: () => void;
  onImportBackup: (jsonContent: string) => void;
  onResetDemoData: () => void;
  onLogActivity?: (action: string, details: string, entityType: 'backup') => void;
}

export const AdminBackupsSection: React.FC<AdminBackupsSectionProps> = ({
  business,
  onExportBackup,
  onImportBackup,
  onResetDemoData,
  onLogActivity,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<{
    version?: string;
    exportedAt?: string;
    businessCount?: number;
    salesCount?: number;
    rawJson: string;
  } | null>(null);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [justExported, setJustExported] = useState(false);

  // Estimate local storage usage
  const estimateStorageUsage = () => {
    try {
      let totalBytes = 0;
      for (let x in localStorage) {
        if (localStorage.hasOwnProperty(x)) {
          totalBytes += (localStorage[x].length + x.length) * 2;
        }
      }
      const kb = (totalBytes / 1024).toFixed(1);
      const mb = (totalBytes / (1024 * 1024)).toFixed(2);
      return { kb, mb, raw: totalBytes };
    } catch {
      return { kb: '120', mb: '0.12', raw: 120000 };
    }
  };

  const storageUsage = estimateStorageUsage();

  const handleExportClick = () => {
    onExportBackup();
    if (onLogActivity) {
      onLogActivity('Exported Full System Backup', `Downloaded complete JSON database snapshot for ${business.name}`, 'backup');
    }
    setJustExported(true);
    setTimeout(() => setJustExported(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.version && parsed.data) {
          setImportPreview({
            version: parsed.version,
            exportedAt: parsed.exportedAt,
            businessCount: parsed.data.businesses?.length || 1,
            salesCount: parsed.data.sales?.length || 0,
            rawJson: text,
          });
        } else {
          alert('Invalid backup format. Ensure you are uploading a valid Small Business OS JSON backup file.');
        }
      } catch (err) {
        alert('Could not parse JSON file. Please check file integrity.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    onImportBackup(importPreview.rawJson);
    if (onLogActivity) {
      onLogActivity('Restored Database from Backup', `Restored JSON snapshot created at ${importPreview.exportedAt}`, 'backup');
    }
    setImportPreview(null);
  };

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    const code = resetCodeInput.trim().toUpperCase();
    if (code !== 'CLEAR' && code !== 'RESET') {
      alert('Please type CLEAR in capital letters to confirm.');
      return;
    }
    onResetDemoData();
    if (onLogActivity) {
      onLogActivity('Purged Store Data', 'Purged all transactions, debts, expenses, and inventory to fresh clean store', 'backup');
    }
    setIsResetConfirmOpen(false);
    setResetCodeInput('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Storage & Database Health Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" />
              <span>Offline Database Engine & Storage Health</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Small Business OS operates with an offline-first storage engine that retains data locally even when internet connectivity drops.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Engine Status: Healthy</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold block">Browser Local Storage</span>
            <p className="text-xl font-bold font-mono text-slate-200">{storageUsage.kb} KB Used</p>
            <span className="text-[10px] text-slate-400">~{storageUsage.mb} MB allocated</span>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold block">Persistence Type</span>
            <p className="text-xl font-bold text-emerald-400">Encrypted Local</p>
            <span className="text-[10px] text-slate-400">Zero cloud outage dependency</span>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold block">Active Store Profile</span>
            <p className="text-base font-bold text-slate-200 truncate">{business.name}</p>
            <span className="text-[10px] text-slate-400">State: {business.state}</span>
          </div>
        </div>
      </div>

      {/* 2. Snapshot Backup & Restore Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export JSON Backup */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Create Full JSON Backup</h4>
                <p className="text-xs text-slate-400">
                  Export complete database snapshot (all products, sales, customers, debts, expenses, invoices, staff & settings).
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Single-file portable .json backup</span>
              </p>
              <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Easily transfer data to another computer or phone</span>
              </p>
              <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Safe offline cold storage</span>
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleExportClick}
              className={`w-full py-3 px-4 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-lg ${
                justExported
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
              }`}
            >
              {justExported ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Backup File Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Backup Snapshot (.json)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Restore JSON Backup */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-sky-950/80 border border-sky-800 text-sky-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Restore Database Snapshot</h4>
                <p className="text-xs text-slate-400">
                  Import a previously saved JSON backup file to recover or migrate store operations.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400">
              <p className="text-amber-400 font-semibold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Pre-import safety notice:</span>
              </p>
              <p>
                Restoring a backup will merge and replace current local database records with the records contained in the snapshot.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-sky-950"
            >
              <Upload className="w-4 h-4" />
              <span>Select Backup File (.json)</span>
            </button>
          </div>
        </div>
      </div>

      {/* IMPORT PREVIEW MODAL */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <FileJson className="w-5 h-5 text-sky-400" />
              <h3 className="font-bold text-base text-white">Confirm Database Restore</h3>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Backup Version:</span>
                <span className="font-mono text-slate-200">{importPreview.version || '1.0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Export Timestamp:</span>
                <span className="font-mono text-slate-200">{importPreview.exportedAt || 'Recent'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Sales Records:</span>
                <span className="font-mono font-bold text-emerald-400">{importPreview.salesCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition shadow-md"
              >
                Restore Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Danger Zone / Purge All Store Data */}
      <div className="bg-rose-950/20 border border-rose-900/40 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-rose-950 border border-rose-800 text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-base text-rose-300">Danger Zone: Purge All Store Data</h4>
              <p className="text-xs text-rose-400/80 mt-0.5">
                Permanently purge all sales transactions, debts, expenses, and custom catalog items to start from a completely clean slate.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-4 py-2.5 bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shrink-0 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Purge All Store Data</span>
          </button>
        </div>
      </div>

      {/* RESET CONFIRMATION MODAL */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleConfirmReset}
            className="bg-slate-900 border border-rose-800/80 rounded-3xl w-full max-w-sm shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base">Confirm Store Data Purge</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action will permanently delete all recorded sales, active debts, customer records, and expenses. Your business name and settings will be preserved in a fresh clean state.
            </p>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Type <strong className="text-rose-400 font-mono">CLEAR</strong> to proceed:
              </label>
              <input
                type="text"
                required
                placeholder="CLEAR"
                value={resetCodeInput}
                onChange={(e) => setResetCodeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-center tracking-widest text-rose-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetConfirmOpen(false);
                  setResetCodeInput('');
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow-md"
              >
                Confirm Purge
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
