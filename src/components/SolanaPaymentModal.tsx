import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { BusinessProfile, StaffUser } from '../types';
import { solanaService, DEFAULT_NGN_USDC_RATE } from '../services/solanaService';
import { formatMoney } from '../utils/formatters';

export interface SolanaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessProfile;
  currentStaff?: StaffUser;
  amountNgn: number;
  customerName?: string;
  customerPhone?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  referenceId?: string;
  memoText?: string;
  onPaymentConfirmed: (details: {
    signature: string;
    amountUsdc: number;
    amountNgn: number;
    exchangeRate: number;
    payerAddress?: string;
    recipientAddress: string;
    slot?: number;
    blockTime?: number;
    explorerUrl: string;
  }) => void;
}

export const SolanaPaymentModal: React.FC<SolanaPaymentModalProps> = ({
  isOpen,
  onClose,
  business,
  amountNgn,
  invoiceNumber,
  referenceId,
  onPaymentConfirmed,
}) => {
  const recipientAddress = business.solanaWalletAddress || '';
  const exchangeRate = business.solanaUsdcNgnRate || DEFAULT_NGN_USDC_RATE;
  const amountUsdc = solanaService.convertNgnToUsdc(amountNgn, exchangeRate);

  // States
  const [signatureInput, setSignatureInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState<boolean>(false);
  const [verifiedDetails, setVerifiedDetails] = useState<any>(null);

  // Browser wallet state
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isPayingViaWallet, setIsPayingViaWallet] = useState(false);
  const [connectedPayer, setConnectedPayer] = useState<string | null>(null);
  const [connectedWalletName, setConnectedWalletName] = useState<string>('Solana Wallet');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const solanaPayUrl = solanaService.buildSolanaPayUrl({
    recipient: recipientAddress,
    amountUsdc,
    label: business.name,
    message: invoiceNumber ? `Invoice #${invoiceNumber}` : `Payment to ${business.name}`,
    memo: referenceId || invoiceNumber || `OS_${Date.now()}`,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  const handleConnectBrowserWallet = async () => {
    setIsConnectingWallet(true);
    setVerificationError(null);
    try {
      const res = await solanaService.connectBrowserWallet();
      if (res.success && res.address) {
        setConnectedPayer(res.address);
        if (res.walletName) setConnectedWalletName(res.walletName);
      } else {
        setVerificationError(
          res.errorMessage || 'No Solana wallet extension detected. Please scan the QR code or copy the address.'
        );
      }
    } catch (err: any) {
      setVerificationError(err?.message || 'Wallet connection was cancelled.');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // 1-Click Payment via Connected Browser Wallet (Phantom / Solflare)
  const handlePayWithConnectedWallet = async () => {
    setIsPayingViaWallet(true);
    setVerificationError(null);
    try {
      const memo = invoiceNumber ? `INV-${invoiceNumber}` : `POS-${referenceId || Date.now()}`;
      const payRes = await solanaService.sendUsdcPayment({
        recipientAddress,
        amountUsdc,
        memoText: memo,
      });

      // Verify on-chain immediately via RPC
      const verifyRes = await solanaService.verifyTransaction(payRes.signature, recipientAddress, amountUsdc);

      setVerifiedSuccess(true);
      setVerifiedDetails(verifyRes);
      setSignatureInput(payRes.signature);

      onPaymentConfirmed({
        signature: payRes.signature,
        amountUsdc,
        amountNgn,
        exchangeRate,
        payerAddress: connectedPayer || verifyRes.payer || undefined,
        recipientAddress,
        slot: payRes.slot || verifyRes.slot,
        blockTime: payRes.blockTime || verifyRes.blockTime,
        explorerUrl: solanaService.getExplorerUrl(payRes.signature, 'tx', 'mainnet-beta'),
      });
    } catch (err: any) {
      console.warn('Wallet payment failed:', err);
      setVerificationError(
        err?.message || 'Failed to complete transaction in wallet. Please check your balance and try again.'
      );
    } finally {
      setIsPayingViaWallet(false);
    }
  };

  // Manual on-chain verification of pasted signature
  const handleVerifySignature = async () => {
    if (!signatureInput.trim()) {
      setVerificationError('Please paste the 88-character Solana transaction signature.');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const result = await solanaService.verifyTransaction(
        signatureInput.trim(),
        recipientAddress,
        amountUsdc
      );

      if (result.verified) {
        setVerifiedSuccess(true);
        setVerifiedDetails(result);

        // Notify parent with verified on-chain details
        onPaymentConfirmed({
          signature: signatureInput.trim(),
          amountUsdc,
          amountNgn,
          exchangeRate,
          payerAddress: result.payer || connectedPayer || undefined,
          recipientAddress,
          slot: result.slot,
          blockTime: result.blockTime,
          explorerUrl: solanaService.getExplorerUrl(signatureInput.trim(), 'tx', 'mainnet-beta'),
        });
      } else if (result.status === 'pending') {
        setVerificationError(
          'Transaction was broadcast but is still confirming across Solana Mainnet nodes. Please wait a few seconds and tap Verify again.'
        );
      } else {
        setVerificationError(
          result.error || 'Transaction verification failed on-chain. Please verify the signature and ensure it was sent on Solana Mainnet.'
        );
      }
    } catch (err: any) {
      setVerificationError(err?.message || 'Error communicating with Solana Mainnet RPC node.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="solana-payment-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="solana-payment-modal-card"
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-0.5 shadow-lg shadow-purple-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <span className="text-sm font-black text-white">◎</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Pay via Solana USDC</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Mainnet-Beta
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {invoiceNumber ? `Invoice #${invoiceNumber}` : 'Fast, low-fee on-chain settlement'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Amount Overview Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Invoice / Sale Total</span>
              <p className="text-xl font-black text-slate-100">
                {formatMoney(amountNgn, business)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                <span>USDC Equivalent</span>
              </span>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                {amountUsdc.toFixed(2)} <span className="text-xs font-semibold text-slate-400">USDC</span>
              </p>
              <span className="text-[10px] text-slate-500">
                Rate: 1 USDC = ₦{exchangeRate.toLocaleString()}
              </span>
            </div>
          </div>

          {verifiedSuccess ? (
            /* Success State */
            <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-emerald-300">
                Payment Verified On-Chain!
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Transaction signature successfully confirmed on Solana Mainnet. Record has been reconciled and settled.
              </p>
              {verifiedDetails?.slot && (
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono">
                  Solana Slot: #{verifiedDetails.slot.toLocaleString()} • Finalized
                </div>
              )}
              <div className="pt-2 flex items-center justify-center gap-3">
                <a
                  href={solanaService.getExplorerUrl(signatureInput.trim(), 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition"
                >
                  <span>View in Solana Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950"
                >
                  Done
                </button>
              </div>
            </div>
          ) : !recipientAddress ? (
            <div className="p-6 bg-purple-950/40 border border-purple-800/80 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-purple-200">No Solana Wallet Configured</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                To accept Solana USDC settlements, connect or configure your business Solana receiving address in the Solana Wallet tab.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition"
                >
                  Close & Set Up Wallet
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Connected Browser Wallet 1-Click Pay */}
              <div className="p-3.5 bg-gradient-to-r from-purple-950/40 to-indigo-950/40 rounded-2xl border border-purple-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-200">
                        {connectedPayer
                          ? `${connectedWalletName}: ${solanaService.truncateAddress(connectedPayer, 4)}`
                          : 'Pay with Browser Wallet'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {connectedPayer ? 'Ready to sign on-chain USDC transfer' : 'Phantom, Solflare, or Backpack'}
                      </p>
                    </div>
                  </div>
                  {!connectedPayer ? (
                    <button
                      onClick={handleConnectBrowserWallet}
                      disabled={isConnectingWallet}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      {isConnectingWallet ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Wallet className="w-3 h-3" />
                      )}
                      <span>Connect Wallet</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setConnectedPayer(null)}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                {connectedPayer && (
                  <button
                    onClick={handlePayWithConnectedWallet}
                    disabled={isPayingViaWallet}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 transition cursor-pointer disabled:opacity-50"
                  >
                    {isPayingViaWallet ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Confirming on Solana Mainnet...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Pay ${amountUsdc.toFixed(2)} USDC with {connectedWalletName}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* QR Code & Solana Pay Section */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="p-3 bg-white rounded-2xl shadow-md flex-shrink-0">
                  <QRCodeSVG
                    value={solanaPayUrl || recipientAddress}
                    size={120}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="space-y-2 flex-1 text-center sm:text-left w-full">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-200">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Scan with Mobile Wallet</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Scan with Phantom or Solflare mobile app to transfer USDC directly to the business wallet.
                  </p>
                  <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      onClick={() => copyToClipboard(recipientAddress, 'address')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg flex items-center gap-1 transition cursor-pointer font-mono"
                    >
                      {copiedItem === 'address' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>{solanaService.truncateAddress(recipientAddress, 5)}</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(amountUsdc.toFixed(2), 'amount')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg flex items-center gap-1 transition cursor-pointer font-mono"
                    >
                      {copiedItem === 'amount' ? (
                        <span className="text-emerald-400">Copied</span>
                      ) : (
                        <span>Copy ${amountUsdc.toFixed(2)} USDC</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Verification Section */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Verify On-Chain Transaction Signature</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Solana Mainnet-Beta</span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={signatureInput}
                    onChange={(e) => setSignatureInput(e.target.value)}
                    placeholder="Paste 88-character transaction signature..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  {verificationError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <p className="leading-snug">{verificationError}</p>
                    </div>
                  )}
                  <button
                    onClick={handleVerifySignature}
                    disabled={isVerifying || !signatureInput.trim()}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-950"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying with Solana Mainnet RPC...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Verify & Settle Payment On-Chain</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Solana Mainnet • SPL USDC</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
