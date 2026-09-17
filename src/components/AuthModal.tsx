import React, { useState } from 'react';
import {
  X,
  Lock,
  Shield,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { StaffUser, BusinessProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList?: StaffUser[];
  staffUsers?: StaffUser[];
  currentStaff: StaffUser;
  onLogin?: (staff: StaffUser) => void;
  onSelectStaff?: (staff: StaffUser) => void;
  businesses?: BusinessProfile[];
  currentBusiness?: BusinessProfile;
  onSwitchBusiness?: (bizId: string) => void;
  onOpenFirstTimeSetup?: () => void;
  onUpdateStaff?: (staff: StaffUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  staffList,
  staffUsers,
  currentStaff,
  onLogin,
  onSelectStaff,
  businesses = [],
  currentBusiness,
  onSwitchBusiness,
  onOpenFirstTimeSetup,
  onUpdateStaff,
}) => {
  const staffArray = staffList || staffUsers || [currentStaff];
  const handleStaffSelect = onLogin || onSelectStaff || (() => {});

  const [selectedStaff, setSelectedStaff] = useState<StaffUser>(currentStaff);
  const [authMethod, setAuthMethod] = useState<'pin' | 'password'>('pin');
  const [pinInput, setPinInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'staff' | 'business'>('staff');

  // Change PIN flow (for employees with mustChangePinOnNextLogin or on-demand reset)
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [changePinStep, setChangePinStep] = useState<'new' | 'confirm'>('new');

  if (!isOpen) return null;

  const handleKeypadPress = (digit: string) => {
    if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
      try {
        (navigator as any).vibrate(8);
      } catch {}
    }

    if (isChangingPin) {
      if (changePinStep === 'new') {
        if (newPin.length < 4) {
          const next = newPin + digit;
          setNewPin(next);
          setErrorMessage('');
          if (next.length === 4) {
            setTimeout(() => setChangePinStep('confirm'), 200);
          }
        }
      } else {
        if (confirmNewPin.length < 4) {
          const next = confirmNewPin + digit;
          setConfirmNewPin(next);
          setErrorMessage('');
          if (next.length === 4) {
            if (next === newPin) {
              // Successfully set new PIN
              const updated: StaffUser = {
                ...selectedStaff,
                pin: next,
                mustChangePinOnNextLogin: false,
                hasCreatedCredentials: true,
              };
              if (onUpdateStaff) onUpdateStaff(updated);
              handleStaffSelect(updated);
              setIsChangingPin(false);
              setNewPin('');
              setConfirmNewPin('');
              onClose();
            } else {
              setErrorMessage('PINs do not match. Please try again.');
              setTimeout(() => setConfirmNewPin(''), 600);
            }
          }
        }
      }
      return;
    }

    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setErrorMessage('');
      if (nextPin.length === 4) {
        verifyPin(nextPin, selectedStaff);
      }
    }
  };

  const handleDeleteDigit = () => {
    if (isChangingPin) {
      if (changePinStep === 'new') setNewPin((prev) => prev.slice(0, -1));
      else setConfirmNewPin((prev) => prev.slice(0, -1));
      setErrorMessage('');
      return;
    }
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClearPin = () => {
    if (isChangingPin) {
      if (changePinStep === 'new') setNewPin('');
      else setConfirmNewPin('');
      setErrorMessage('');
      return;
    }
    setPinInput('');
    setErrorMessage('');
  };

  const verifyPin = (pin: string, staff: StaffUser) => {
    if (pin === staff.pin) {
      if (staff.mustChangePinOnNextLogin) {
        setIsChangingPin(true);
        setChangePinStep('new');
        setPinInput('');
        return;
      }
      handleStaffSelect(staff);
      setPinInput('');
      onClose();
    } else {
      setErrorMessage('Incorrect PIN. Please try again or use Password.');
      setTimeout(() => {
        setPinInput('');
      }, 700);
    }
  };

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) {
      setErrorMessage('Please enter your password.');
      return;
    }

    // Check staff password or allow owner fallback
    if (selectedStaff.password && selectedStaff.password === passwordInput.trim()) {
      handleStaffSelect(selectedStaff);
      setPasswordInput('');
      onClose();
    } else if (!selectedStaff.password && passwordInput.length >= 4) {
      // If staff has no custom password set, check if PIN matches password input
      if (passwordInput === selectedStaff.pin) {
        handleStaffSelect(selectedStaff);
        setPasswordInput('');
        onClose();
      } else {
        setErrorMessage('Incorrect password. Please verify or use PIN login.');
      }
    } else {
      setErrorMessage('Incorrect password. Please verify or ask Store Admin.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-sm sm:max-w-md shadow-2xl overflow-hidden text-slate-100 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-100">Staff Authentication</h3>
              <p className="text-xs text-slate-400">Quick cashier switch with 4-digit PIN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch if multiple branches exist */}
        {businesses.length > 1 && (
          <div className="flex gap-1.5 my-3 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Staff PIN & Switch
            </button>
            <button
              onClick={() => setActiveTab('business')}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'business'
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Switch Branch ({businesses.length})
            </button>
          </div>
        )}

        {activeTab === 'staff' ? (
          <div>
            {/* Staff list selector */}
            <div className="grid grid-cols-3 gap-2 my-3">
              {staffArray.map((staff) => {
                const isCurrent = selectedStaff.id === staff.id;
                return (
                  <button
                    key={staff.id}
                    onClick={() => {
                      setSelectedStaff(staff);
                      setPinInput('');
                      setPasswordInput('');
                      setErrorMessage('');
                      setIsChangingPin(false);
                    }}
                    className={`flex flex-col items-center p-2.5 rounded-2xl border transition active:scale-95 text-center cursor-pointer ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-950/40 text-slate-100 ring-2 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl ${
                        staff.avatarColor || 'bg-slate-700'
                      } text-white font-bold flex items-center justify-center text-xs shadow-xs mb-1`}
                    >
                      {staff.name.charAt(0)}
                    </div>
                    <span className="text-xs font-bold truncate w-full">{staff.name.split(' ')[0]}</span>
                    <span className="text-[10px] text-slate-400 capitalize truncate w-full">
                      {staff.role.replace('_', ' ')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* If Staff must change PIN */}
            {isChangingPin ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 my-2 text-center">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 text-[10px] font-bold mb-2">
                  <Sparkles className="w-3 h-3" />
                  First-Time PIN Setup Required
                </div>
                <h4 className="text-xs font-bold text-slate-200 mb-1">
                  {changePinStep === 'new' ? 'Create Your Personal 4-Digit PIN' : 'Re-Enter PIN to Confirm'}
                </h4>
                <p className="text-[11px] text-slate-400 mb-3">
                  {changePinStep === 'new'
                    ? 'Enter 4 secret numbers for fast counter register access'
                    : 'Re-enter the exact same 4 numbers'}
                </p>

                {/* PIN Dots */}
                <div className="flex justify-center gap-3 mb-3">
                  {[0, 1, 2, 3].map((idx) => {
                    const val = changePinStep === 'new' ? newPin : confirmNewPin;
                    const hasVal = val.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          hasVal
                            ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-xs'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      />
                    );
                  })}
                </div>

                {errorMessage && (
                  <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-semibold py-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto my-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleKeypadPress(num)}
                      className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-base font-black text-slate-100 transition active:scale-95 flex items-center justify-center border border-slate-700 cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handleClearPin}
                    className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-400 transition flex items-center justify-center border border-slate-800 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handleKeypadPress('0')}
                    className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-base font-black text-slate-100 transition active:scale-95 flex items-center justify-center border border-slate-700 cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    onClick={handleDeleteDigit}
                    className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-400 transition flex items-center justify-center border border-slate-800 cursor-pointer"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            ) : authMethod === 'pin' ? (
              /* PIN Keypad Mode */
              <div>
                <div className="text-center my-2">
                  <p className="text-xs text-slate-400 mb-2 font-medium">
                    Enter 4-digit PIN for <strong className="text-slate-100">{selectedStaff.name}</strong>
                  </p>

                  <div className="flex justify-center gap-3">
                    {[0, 1, 2, 3].map((idx) => {
                      const hasVal = pinInput.length > idx;
                      return (
                        <div
                          key={idx}
                          className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                            hasVal
                              ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-xs'
                              : 'border-slate-700 bg-slate-950'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {errorMessage && (
                    <div className="flex items-center justify-center gap-1.5 mt-2 text-rose-400 text-xs font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Touch Keypad */}
                <div className="grid grid-cols-3 gap-1.5 max-w-[250px] mx-auto my-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleKeypadPress(num)}
                      className="h-10.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-base font-black text-slate-100 transition active:scale-95 flex items-center justify-center border border-slate-700 cursor-pointer shadow-xs"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handleClearPin}
                    className="h-10.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs font-bold text-slate-400 transition active:scale-95 flex items-center justify-center border border-slate-800 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handleKeypadPress('0')}
                    className="h-10.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-base font-black text-slate-100 transition active:scale-95 flex items-center justify-center border border-slate-700 cursor-pointer shadow-xs"
                  >
                    0
                  </button>
                  <button
                    onClick={handleDeleteDigit}
                    className="h-10.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs font-bold text-slate-400 transition active:scale-95 flex items-center justify-center border border-slate-800 cursor-pointer"
                  >
                    ⌫
                  </button>
                </div>

                {/* Bottom Options */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800 text-slate-400">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('password');
                      setErrorMessage('');
                    }}
                    className="hover:text-emerald-400 transition cursor-pointer font-medium"
                  >
                    Use Password instead
                  </button>

                  {onOpenFirstTimeSetup && selectedStaff.role === 'owner' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenFirstTimeSetup();
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-bold transition cursor-pointer"
                    >
                      Configure Master Security →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Password Login Mode */
              <form onSubmit={handlePasswordLogin} className="space-y-3 py-2">
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Enter Password for {selectedStaff.name}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setErrorMessage('');
                      }}
                      placeholder="Account password"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Verify Password & Switch</span>
                </button>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800 text-slate-400">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('pin');
                      setErrorMessage('');
                    }}
                    className="hover:text-emerald-400 transition cursor-pointer font-medium"
                  >
                    ← Switch back to 4-digit PIN
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Multi-branch switch tab */
          <div className="space-y-2 py-2">
            <p className="text-xs text-slate-400 mb-2">Select or switch active store branch:</p>
            {businesses.map((biz) => {
              const isSelected = currentBusiness && biz.id === currentBusiness.id;
              return (
                <button
                  key={biz.id}
                  onClick={() => {
                    if (onSwitchBusiness) onSwitchBusiness(biz.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/40 text-slate-100'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">
                      {biz.logoEmoji || '🏬'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">{biz.name}</h4>
                      <p className="text-xs text-slate-400">
                        {biz.city}, {biz.state}
                      </p>
                    </div>
                  </div>
                  {isSelected && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
