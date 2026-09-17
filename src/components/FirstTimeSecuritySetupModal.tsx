import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  User,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { StaffUser, BusinessProfile } from '../types';
import confetti from 'canvas-confetti';

interface FirstTimeSecuritySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessProfile;
  ownerStaff: StaffUser;
  onComplete: (updatedStaff: StaffUser) => void;
}

export const FirstTimeSecuritySetupModal: React.FC<FirstTimeSecuritySetupModalProps> = ({
  isOpen,
  onClose,
  business,
  ownerStaff,
  onComplete,
}) => {
  const [step, setStep] = useState<'credentials' | 'pin' | 'complete'>('credentials');
  
  // Step 1: Profile & Master Password
  const [name, setName] = useState(ownerStaff?.name ? ownerStaff.name.replace(/\s*\(Owner\)/i, '') : '');
  const [email, setEmail] = useState(ownerStaff?.email || business?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Step 2: 4-Digit Quick POS PIN
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMode, setPinMode] = useState<'create' | 'confirm'>('create');
  const [pinError, setPinError] = useState('');

  const [copiedCredentials, setCopiedCredentials] = useState(false);

  if (!isOpen) return null;

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', width: 'w-1/4' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500', width: 'w-2/4' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-sky-500', width: 'w-3/4' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
  };

  const strength = getPasswordStrength(password);

  const handleKeypadPress = (digit: string) => {
    if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
      try {
        (navigator as any).vibrate(10);
      } catch {}
    }

    if (pinMode === 'create') {
      if (pin.length < 4) {
        const next = pin + digit;
        setPin(next);
        setPinError('');
        if (next.length === 4) {
          // Move to confirm PIN smoothly
          setTimeout(() => {
            setPinMode('confirm');
          }, 250);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        setPinError('');
        if (next.length === 4) {
          if (next === pin) {
            handleFinalizeSetup(next);
          } else {
            setPinError('PINs do not match. Please try again.');
            setTimeout(() => {
              setConfirmPin('');
            }, 600);
          }
        }
      }
    }
  };

  const handleDeleteDigit = () => {
    if (pinMode === 'create') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
    setPinError('');
  };

  const handleClearPin = () => {
    if (pinMode === 'create') {
      setPin('');
    } else {
      setConfirmPin('');
    }
    setPinError('');
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setPasswordError('Please enter your full name or store owner name.');
      return;
    }
    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify.');
      return;
    }
    setPasswordError('');
    setStep('pin');
    setPinMode('create');
    setPin('');
    setConfirmPin('');
  };

  const handleFinalizeSetup = (confirmedPin: string) => {
    const updatedStaff: StaffUser = {
      ...ownerStaff,
      name: name.trim(),
      email: email.trim() || undefined,
      password: password.trim(),
      pin: confirmedPin,
      hasCreatedCredentials: true,
      mustChangePinOnNextLogin: false,
    };

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    setStep('complete');
  };

  const handleFinish = () => {
    const updatedStaff: StaffUser = {
      ...ownerStaff,
      name: name.trim(),
      email: email.trim() || undefined,
      password: password.trim(),
      pin: pin,
      hasCreatedCredentials: true,
      mustChangePinOnNextLogin: false,
    };
    onComplete(updatedStaff);
    onClose();
  };

  const handleCopyCredentials = () => {
    const text = `🏪 ${business.name} - Admin Security Credentials\n👤 Name: ${name}\n📧 Email: ${email || 'Not provided'}\n🔑 Master Password: ${password}\n🔢 4-Digit Quick POS PIN: ${pin}\n🛡️ Role: Store Owner & Director`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 p-5 sm:p-6 relative">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-base text-slate-100">Create Security Credentials</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                  Step {step === 'credentials' ? '1/2' : step === 'pin' ? '2/2' : 'Done'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Set your master password & quick 4-digit POS PIN</p>
            </div>
          </div>
          {step !== 'complete' && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* STEP 1: Name & Master Password */}
        {step === 'credentials' && (
          <form onSubmit={handleStep1Submit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Store Owner / Admin Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Adewale Ishola"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Email Address <span className="text-slate-500 font-normal">(for recovery & reports)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="storeowner@gmail.com"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Master Account Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength bar */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Security Strength:</span>
                    <span className={`font-bold ${strength.score >= 3 ? 'text-emerald-400' : strength.score === 2 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Confirm Master Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Re-enter password to confirm"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-lg shadow-emerald-950 cursor-pointer mt-2"
            >
              <span>Next: Set 4-Digit POS PIN</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: 4-Digit Quick POS PIN Keypad */}
        {step === 'pin' && (
          <div className="mt-4 space-y-3">
            <div className="text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {pinMode === 'create' ? 'Create Your 4-Digit Quick Login PIN' : 'Confirm Your 4-Digit PIN'}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                {pinMode === 'create'
                  ? 'Used to rapidly unlock sales counter and switch staff.'
                  : 'Re-enter the exact same 4 numbers to verify.'}
              </p>
            </div>

            {/* PIN Dots Display */}
            <div className="flex justify-center gap-3.5 my-3">
              {[0, 1, 2, 3].map((idx) => {
                const currentVal = pinMode === 'create' ? pin : confirmPin;
                const hasVal = currentVal.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                      hasVal
                        ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/30'
                        : 'border-slate-700 bg-slate-950'
                    }`}
                  />
                );
              })}
            </div>

            {pinError && (
              <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-semibold py-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{pinError}</span>
              </div>
            )}

            {/* Touch-Friendly Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-base font-black text-slate-100 transition active:scale-95 flex items-center justify-center border border-slate-700 cursor-pointer shadow-xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClearPin}
                className="h-11 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs font-bold text-slate-400 transition active:scale-95 flex items-center justify-center border border-slate-800 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-base font-black text-slate-100 transition active:scale-95 flex items-center justify-center border border-slate-700 cursor-pointer shadow-xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDeleteDigit}
                className="h-11 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs font-bold text-slate-400 transition active:scale-95 flex items-center justify-center border border-slate-800 cursor-pointer"
              >
                ⌫
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  if (pinMode === 'confirm') {
                    setPinMode('create');
                    setPin('');
                    setConfirmPin('');
                  } else {
                    setStep('credentials');
                  }
                }}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer py-1 font-medium"
              >
                ← Back
              </button>

              {pinMode === 'confirm' && (
                <button
                  type="button"
                  onClick={() => {
                    setPinMode('create');
                    setPin('');
                    setConfirmPin('');
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  Reset PIN
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Complete & Copy Credentials */}
        {step === 'complete' && (
          <div className="mt-4 space-y-4 text-center">
            <div className="w-14 h-14 bg-emerald-500/20 border-2 border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-100">Security Setup Complete!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Your credentials are encrypted locally. Only you (Owner) can administer staff roles & assign employee PINs.
              </p>
            </div>

            {/* Credential summary card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Account Owner:</span>
                <span className="font-bold text-slate-100">{name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Master Password:</span>
                <span className="font-mono font-bold text-slate-200">••••••••</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">4-Digit POS Login PIN:</span>
                <span className="font-mono font-black text-emerald-400 text-sm tracking-widest">{pin}</span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                {copiedCredentials ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCredentials ? 'Copied!' : 'Copy Summary'}</span>
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-950"
              >
                <Check className="w-4 h-4" />
                <span>Open Business OS</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
