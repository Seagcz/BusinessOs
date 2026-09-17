import React from 'react';

interface BusinessOSLogoProps {
  variant?: 'full' | 'header' | 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSubtitle?: boolean;
}

export const BusinessOSLogo: React.FC<BusinessOSLogoProps> = ({
  variant = 'header',
  size = 'md',
  className = '',
  showSubtitle = true,
}) => {
  // Icon-only variant
  if (variant === 'icon') {
    const sizeClasses = {
      sm: 'w-7 h-7 rounded-lg',
      md: 'w-9 h-9 rounded-xl',
      lg: 'w-12 h-12 rounded-2xl',
      xl: 'w-16 h-16 rounded-3xl',
    }[size];

    return (
      <div
        className={`relative overflow-hidden flex-shrink-0 bg-slate-900 border border-cyan-500/30 shadow-md shadow-cyan-950/50 ${sizeClasses} ${className}`}
      >
        <img
          src="/logo.jpg"
          alt="Business OS Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to SVG emblem if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        {/* Subtle glowing ring overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-inherit ring-1 ring-inset ring-white/15" />
      </div>
    );
  }

  // Header variant (compact for Sidebar & Navbar)
  if (variant === 'header') {
    const iconSize = {
      sm: 'w-7 h-7 rounded-lg',
      md: 'w-10 h-10 rounded-xl',
      lg: 'w-12 h-12 rounded-2xl',
      xl: 'w-14 h-14 rounded-2xl',
    }[size];

    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {/* Logo Icon with glowing cyan/purple edge */}
        <div
          className={`relative overflow-hidden flex-shrink-0 bg-slate-900 border border-cyan-500/40 shadow-lg shadow-cyan-900/30 ${iconSize}`}
        >
          <img
            src="/logo.jpg"
            alt="Business OS"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover scale-105"
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cyan-400/20" />
        </div>

        {/* Wordmark */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-base font-black tracking-tight text-white flex items-center">
              Business
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5 mb-2 animate-pulse" />
            </span>
            <span className="text-base font-black bg-gradient-to-r from-cyan-400 via-teal-300 to-fuchsia-400 bg-clip-text text-transparent">
              OS
            </span>
          </div>

          {showSubtitle && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                Onchain
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-400">
                {/* Solana mini 3-bar logo */}
                <svg className="w-2.5 h-2.5" viewBox="0 0 397 311" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h313.7c6.3 0 9.5 7.6 5.1 12l-55.5 55.6c-2.4 2.4-5.7 3.8-9.2 3.8H9.2c-6.3 0-9.5-7.6-5.1-12l60.5-55.6z" fill="url(#sol_g1)"/>
                  <path d="M64.6 3.8C67 1.4 70.3 0 73.8 0h313.7c6.3 0 9.5 7.6 5.1 12L337.1 67.6c-2.4 2.4-5.7 3.8-9.2 3.8H14.2c-6.3 0-9.5-7.6-5.1-12L64.6 3.8z" fill="url(#sol_g2)"/>
                  <path d="M332.6 120.8c-2.4-2.4-5.7-3.8-9.2-3.8H9.7c-6.3 0-9.5 7.6-5.1 12l55.5 55.6c2.4 2.4 5.7 3.8 9.2 3.8h313.7c6.3 0 9.5-7.6 5.1-12l-50.5-55.6z" fill="url(#sol_g3)"/>
                  <defs>
                    <linearGradient id="sol_g1" x1="397" y1="234.1" x2="0" y2="309.4" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#00FFA3"/>
                      <stop offset="1" stopColor="#DC1FFF"/>
                    </linearGradient>
                    <linearGradient id="sol_g2" x1="397" y1="0" x2="0" y2="75.3" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#00FFA3"/>
                      <stop offset="1" stopColor="#DC1FFF"/>
                    </linearGradient>
                    <linearGradient id="sol_g3" x1="0" y1="120.8" x2="397" y2="196.1" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#00FFA3"/>
                      <stop offset="1" stopColor="#DC1FFF"/>
                    </linearGradient>
                  </defs>
                </svg>
                <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Solana
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full banner / hero badge variant (matches user's uploaded image exactly)
  return (
    <div
      className={`relative rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-cyan-500/30 p-4 text-center shadow-xl shadow-cyan-950/40 overflow-hidden ${className}`}
    >
      {/* Background radial glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Main Logo Artwork */}
      <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-cyan-400/40 shadow-2xl shadow-cyan-500/20 mb-3 bg-slate-950">
        <img
          src="/logo.jpg"
          alt="Business OS — Simpler Business Onchain Powered by Solana"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Typography */}
      <div className="relative">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1">
          <span>Business</span>
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-fuchsia-400 bg-clip-text text-transparent">
            OS
          </span>
        </h2>
        <p className="text-[11px] font-extrabold tracking-widest text-slate-300 uppercase mt-1">
          SIMPLER BUSINESS • ONCHAIN
        </p>

        {/* Powered by Solana pill */}
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 text-[10px] font-bold text-cyan-300">
          <svg className="w-3 h-3" viewBox="0 0 397 311" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h313.7c6.3 0 9.5 7.6 5.1 12l-55.5 55.6c-2.4 2.4-5.7 3.8-9.2 3.8H9.2c-6.3 0-9.5-7.6-5.1-12l60.5-55.6z" fill="url(#sol_g1_full)"/>
            <path d="M64.6 3.8C67 1.4 70.3 0 73.8 0h313.7c6.3 0 9.5 7.6 5.1 12L337.1 67.6c-2.4 2.4-5.7 3.8-9.2 3.8H14.2c-6.3 0-9.5-7.6-5.1-12L64.6 3.8z" fill="url(#sol_g2_full)"/>
            <path d="M332.6 120.8c-2.4-2.4-5.7-3.8-9.2-3.8H9.7c-6.3 0-9.5 7.6-5.1 12l55.5 55.6c2.4 2.4 5.7 3.8 9.2 3.8h313.7c6.3 0 9.5-7.6 5.1-12l-50.5-55.6z" fill="url(#sol_g3_full)"/>
            <defs>
              <linearGradient id="sol_g1_full" x1="397" y1="234.1" x2="0" y2="309.4" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00FFA3"/>
                <stop offset="1" stopColor="#DC1FFF"/>
              </linearGradient>
              <linearGradient id="sol_g2_full" x1="397" y1="0" x2="0" y2="75.3" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00FFA3"/>
                <stop offset="1" stopColor="#DC1FFF"/>
              </linearGradient>
              <linearGradient id="sol_g3_full" x1="0" y1="120.8" x2="397" y2="196.1" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00FFA3"/>
                <stop offset="1" stopColor="#DC1FFF"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="tracking-wide">POWERED BY SOLANA</span>
        </div>
      </div>
    </div>
  );
};
