import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Store,
  Wallet,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { AuthenticatedUser } from '../../types';
import { BusinessOSLogo } from '../BusinessOSLogo';

interface AuthGateProps {
  onAuthenticated: (user: AuthenticatedUser, storeName?: string) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMethod, setLoadingMethod] = useState<'google' | 'wallet' | 'email' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Wallet manual input modal toggle
  const [showManualWallet, setShowManualWallet] = useState<boolean>(false);
  const [manualWalletAddress, setManualWalletAddress] = useState<string>('');

  // 1. Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setLoadingMethod('google');
    setErrorMessage(null);
    try {
      const user = await authService.signInWithGoogle();
      onAuthenticated(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed. Please try Email or Wallet.');
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
    }
  };

  // 2. Solana Wallet Handler
  const handleWalletSignIn = async (addressToUse?: string) => {
    setIsLoading(true);
    setLoadingMethod('wallet');
    setErrorMessage(null);
    try {
      const user = await authService.signInWithWallet(addressToUse);
      onAuthenticated(user, storeName || undefined);
    } catch (err: any) {
      // If extension not detected, open manual input prompt
      if (err.message?.includes('No Solana browser extension detected') || !addressToUse) {
        setShowManualWallet(true);
      }
      setErrorMessage(err.message || 'Solana wallet authentication failed.');
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
    }
  };

  // Quick helper to generate a merchant wallet address for immediate test/instant onboarding
  const handleGenerateInstantWallet = () => {
    // Generate a valid base58-style test address
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let rand = 'SolPOS_';
    for (let i = 0; i < 36; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setManualWalletAddress(rand);
  };

  // 3. Email & Password Handler
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingMethod('email');
    setErrorMessage(null);

    try {
      if (authMode === 'signup') {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter both email and password.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const user = await authService.signUpWithEmail(email, password, name, storeName);
        onAuthenticated(user, storeName.trim() || undefined);
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter both email and password.');
        }
        const user = await authService.signInWithEmail(email, password);
        onAuthenticated(user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-slate-950">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6 my-auto">
        {/* Branding & Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <BusinessOSLogo variant="full" size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {authMode === 'signin' ? 'Sign In to Your Store' : 'Create Your Business Account'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            {authMode === 'signin'
              ? 'Access your inventory, cash registers, offline sync, and financial records.'
              : 'Start recording sales, tracking inventory, and accepting multi-currency payments.'}
          </p>
        </div>

        {/* Tab Selector: Sign In vs Sign Up */}
        <div className="bg-slate-900/90 p-1 rounded-2xl border border-slate-800 grid grid-cols-2 gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              authMode === 'signin'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              authMode === 'signup'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 shadow-lg animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-left">
              <p className="font-semibold">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-bold ml-1 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Auth Methods Card */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
          {/* Quick 1-Click Providers: Google & Wallet */}
          <div className="space-y-2.5">
            {/* 1. Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl flex items-center justify-center gap-3 transition shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loadingMethod === 'google' ? (
                <RefreshCw className="w-4 h-4 text-slate-900 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* 2. Solana Web3 Wallet Button */}
            <button
              type="button"
              onClick={() => handleWalletSignIn()}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2.5 transition border border-slate-700 shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loadingMethod === 'wallet' ? (
                <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
              ) : (
                <Wallet className="w-4 h-4 text-purple-400" />
              )}
              <span>Sign in with Solana Wallet</span>
            </button>
          </div>

          {/* Manual Wallet Input Drawer */}
          {showManualWallet && (
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-purple-500/30 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Connect Solana Public Key</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowManualWallet(false)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Connect using your Phantom/Solflare address, or generate an instant POS wallet key:
              </p>
              <input
                type="text"
                placeholder="Enter Base58 address (e.g., 7xKXtg...)"
                value={manualWalletAddress}
                onChange={(e) => setManualWalletAddress(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-purple-300 placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleWalletSignIn(manualWalletAddress)}
                  disabled={!manualWalletAddress.trim() || isLoading}
                  className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
                >
                  Authenticate Wallet
                </button>
                <button
                  type="button"
                  onClick={handleGenerateInstantWallet}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] rounded-lg transition"
                >
                  Generate Key
                </button>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 uppercase tracking-widest font-bold">
              or use business email
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* 3. Email & Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aliko Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Store / Business Name
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. Mainland Provisions & Mart"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="merchant@yourbusiness.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loadingMethod === 'email' ? (
                <RefreshCw className="w-4 h-4 text-slate-950 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-950" />
              )}
              <span>{authMode === 'signup' ? 'Create Business & Launch' : 'Sign In with Email'}</span>
            </button>
          </form>
        </div>

        {/* Security and Features Guarantee */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit Encrypted</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cloud SQL Synced</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Web3 Verified</span>
          </span>
        </div>
      </div>
    </div>
  );
};
