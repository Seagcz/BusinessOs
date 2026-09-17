import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';

// Official Solana Mainnet-Beta USDC Token Mint (6 decimals)
export const SOLANA_MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Public RPC endpoints with fallbacks for high availability
const SOLANA_MAINNET_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-rpc.publicnode.com',
  'https://rpc.ankr.com/solana',
];

// Default fallback exchange rate (₦1,550 / USDC)
export const DEFAULT_NGN_USDC_RATE = 1550;

export interface SolanaWalletState {
  address: string | null;
  solBalance: number | null;
  usdcBalance: number | null;
  isConnected: boolean;
  walletName?: string;
}

export interface VerificationResult {
  verified: boolean;
  status: 'confirmed' | 'finalized' | 'failed' | 'pending';
  slot?: number;
  blockTime?: number;
  payer?: string;
  recipient?: string;
  amountUsdc?: number;
  feeSol?: number;
  error?: string;
  rawDetails?: any;
}

class SolanaService {
  private rpcIndex = 0;
  private connection: Connection;
  private cachedRate: number = DEFAULT_NGN_USDC_RATE;
  private lastRateFetch: number = 0;

  constructor() {
    this.connection = new Connection(SOLANA_MAINNET_RPCS[0], {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30000,
    });
  }

  // Switch to next RPC endpoint if one is rate limited
  private rotateRpc() {
    this.rpcIndex = (this.rpcIndex + 1) % SOLANA_MAINNET_RPCS.length;
    this.connection = new Connection(SOLANA_MAINNET_RPCS[this.rpcIndex], {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30000,
    });
  }

  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Validates whether a given string is a valid Base58 Solana public key.
   */
  isValidAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    const trimmed = address.trim();
    if (trimmed.length < 32 || trimmed.length > 44) return false;
    try {
      const pubkey = new PublicKey(trimmed);
      return PublicKey.isOnCurve(pubkey.toBuffer());
    } catch {
      return false;
    }
  }

  /**
   * Shortens a Solana public address for display (e.g. 7xKX...gAsU)
   */
  truncateAddress(address: string, chars: number = 4): string {
    if (!address) return '';
    if (address.length <= chars * 2 + 2) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  }

  /**
   * Returns the Solana Explorer URL for an account or transaction signature on mainnet
   */
  getExplorerUrl(
    item: string,
    type: 'tx' | 'address' = 'tx',
    cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta'
  ): string {
    const clusterParam = cluster === 'devnet' ? '?cluster=devnet' : '';
    if (type === 'address') {
      return `https://explorer.solana.com/address/${item}${clusterParam}`;
    }
    return `https://explorer.solana.com/tx/${item}${clusterParam}`;
  }

  /**
   * Fetches native SOL balance for a given address on Solana Mainnet.
   */
  async getSolBalance(address: string): Promise<number> {
    if (!this.isValidAddress(address)) return 0;
    try {
      const pubkey = new PublicKey(address.trim());
      const lamports = await this.connection.getBalance(pubkey);
      return lamports / LAMPORTS_PER_SOL;
    } catch (err) {
      console.warn('Primary RPC getSolBalance failed, retrying with fallback RPC...', err);
      this.rotateRpc();
      try {
        const pubkey = new PublicKey(address.trim());
        const lamports = await this.connection.getBalance(pubkey);
        return lamports / LAMPORTS_PER_SOL;
      } catch {
        return 0;
      }
    }
  }

  /**
   * Fetches the Mainnet USDC SPL token balance for an address.
   */
  async getUsdcBalance(address: string): Promise<number> {
    if (!this.isValidAddress(address)) return 0;
    try {
      const ownerPubkey = new PublicKey(address.trim());
      const mintPubkey = new PublicKey(SOLANA_MAINNET_USDC_MINT);

      const accounts = await this.connection.getParsedTokenAccountsByOwner(ownerPubkey, {
        mint: mintPubkey,
      });

      if (!accounts.value || accounts.value.length === 0) {
        return 0;
      }

      let totalUsdc = 0;
      for (const account of accounts.value) {
        const tokenAmount = account.account.data.parsed?.info?.tokenAmount;
        if (tokenAmount?.uiAmount) {
          totalUsdc += tokenAmount.uiAmount;
        }
      }
      return totalUsdc;
    } catch (err) {
      console.warn('Error fetching USDC balance on mainnet:', err);
      return 0;
    }
  }

  /**
   * Verifies an on-chain Solana transaction by signature.
   * Checks confirmation status on mainnet-beta, slot, blockTime, and transfers.
   */
  async verifyTransaction(
    signature: string,
    expectedRecipient?: string,
    expectedAmountUsdc?: number
  ): Promise<VerificationResult> {
    if (!signature || signature.trim().length < 30) {
      return {
        verified: false,
        status: 'failed',
        error: 'Invalid Solana transaction signature format.',
      };
    }

    const cleanSig = signature.trim();

    try {
      // 1. First check signature status
      const statusRes = await this.connection.getSignatureStatus(cleanSig, {
        searchTransactionHistory: true,
      });

      const statusObj = statusRes.value;

      if (!statusObj) {
        return {
          verified: false,
          status: 'pending',
          error: 'Transaction signature not yet found on Solana Mainnet. It may still be processing or propagating across RPC nodes.',
        };
      }

      if (statusObj.err) {
        return {
          verified: false,
          status: 'failed',
          slot: statusObj.slot,
          error: `Transaction execution failed on-chain: ${JSON.stringify(statusObj.err)}`,
        };
      }

      const confStatus = statusObj.confirmationStatus || 'confirmed';

      // 2. Fetch parsed transaction for complete inspection
      let parsedTx = null;
      try {
        parsedTx = await this.connection.getParsedTransaction(cleanSig, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed',
        });
      } catch (txErr) {
        console.warn('Could not get parsed tx details, using status object:', txErr);
      }

      let payer = '';
      let feeSol = 0;
      let slot = statusObj.slot;
      let blockTime = parsedTx?.blockTime || undefined;

      if (parsedTx) {
        payer = parsedTx.transaction.message.accountKeys[0]?.pubkey?.toBase58() || '';
        if (parsedTx.meta?.fee) {
          feeSol = parsedTx.meta.fee / LAMPORTS_PER_SOL;
        }
        if (parsedTx.slot) {
          slot = parsedTx.slot;
        }
      }

      const isConfirmed = confStatus === 'confirmed' || confStatus === 'finalized';

      return {
        verified: isConfirmed,
        status: isConfirmed ? confStatus : 'pending',
        slot,
        blockTime,
        payer,
        recipient: expectedRecipient,
        amountUsdc: expectedAmountUsdc,
        feeSol,
        rawDetails: {
          slot,
          blockTime,
          confirmationStatus: confStatus,
          payer,
        },
      };
    } catch (err: any) {
      console.warn('Solana RPC verification error:', err);
      return {
        verified: false,
        status: 'pending',
        error: err?.message || 'Failed to communicate with Solana Mainnet RPC node. Check network connection.',
      };
    }
  }

  /**
   * Generates a standard Solana Pay transfer URL
   * Compatible with Phantom, Solflare, and Solana mobile wallets
   */
  buildSolanaPayUrl(params: {
    recipient: string;
    amountUsdc?: number;
    reference?: string;
    label?: string;
    message?: string;
    memo?: string;
  }): string {
    const { recipient, amountUsdc, reference, label, message, memo } = params;
    if (!this.isValidAddress(recipient)) return '';

    const query = new URLSearchParams();
    if (amountUsdc && amountUsdc > 0) {
      // 6 decimals precision for USDC
      query.set('amount', amountUsdc.toFixed(2));
      query.set('spl-token', SOLANA_MAINNET_USDC_MINT);
    }
    if (reference) {
      query.set('reference', reference);
    }
    if (label) {
      query.set('label', label);
    }
    if (message) {
      query.set('message', message);
    }
    if (memo) {
      query.set('memo', memo);
    }

    const queryString = query.toString();
    return `solana:${recipient}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Fetches or calculates NGN / USDC exchange rate
   */
  async getNgnUsdcRate(customBusinessRate?: number): Promise<number> {
    if (customBusinessRate && customBusinessRate > 0) {
      return customBusinessRate;
    }

    // Return cached rate if fetched within last 5 minutes
    const now = Date.now();
    if (now - this.lastRateFetch < 5 * 60 * 1000 && this.cachedRate > 0) {
      return this.cachedRate;
    }

    try {
      // Try CoinGecko public API for USD/NGN
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=ngn',
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        const liveRate = data?.['usd-coin']?.ngn;
        if (liveRate && typeof liveRate === 'number' && liveRate > 500) {
          this.cachedRate = Math.round(liveRate);
          this.lastRateFetch = now;
          return this.cachedRate;
        }
      }
    } catch {
      // Silent fallback
    }

    return DEFAULT_NGN_USDC_RATE;
  }

  /**
   * Converts NGN amount to USDC at given rate
   */
  convertNgnToUsdc(ngnAmount: number, rate: number = DEFAULT_NGN_USDC_RATE): number {
    if (!ngnAmount || ngnAmount <= 0 || !rate || rate <= 0) return 0;
    const usdc = ngnAmount / rate;
    return parseFloat(usdc.toFixed(2));
  }

  /**
   * Converts USDC amount to NGN at given rate
   */
  convertUsdcToNgn(usdcAmount: number, rate: number = DEFAULT_NGN_USDC_RATE): number {
    if (!usdcAmount || usdcAmount <= 0 || !rate || rate <= 0) return 0;
    return Math.round(usdcAmount * rate);
  }

  /**
   * Detects and connects to a browser Solana wallet provider (Phantom, Solflare, Backpack)
   */
  async connectBrowserWallet(): Promise<{ address: string; walletName: string } | null> {
    if (typeof window === 'undefined') return null;

    const win = window as any;
    let provider = null;
    let walletName = 'Solana Wallet';

    if (win.phantom?.solana?.isPhantom) {
      provider = win.phantom.solana;
      walletName = 'Phantom';
    } else if (win.solflare?.isSolflare) {
      provider = win.solflare;
      walletName = 'Solflare';
    } else if (win.backpack) {
      provider = win.backpack;
      walletName = 'Backpack';
    } else if (win.solana) {
      provider = win.solana;
      walletName = provider.isPhantom ? 'Phantom' : 'Solana Wallet';
    }

    if (!provider) {
      return null;
    }

    try {
      const resp = await provider.connect();
      const pubkey = resp.publicKey?.toString() || provider.publicKey?.toString();
      if (pubkey && this.isValidAddress(pubkey)) {
        return {
          address: pubkey,
          walletName,
        };
      }
    } catch (err: any) {
      console.warn('Wallet connection cancelled or rejected by user:', err);
      throw err;
    }

    return null;
  }

  /**
   * Checks if any supported Solana browser extension is installed
   */
  hasBrowserWallet(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as any;
    return !!(win.phantom?.solana || win.solflare || win.backpack || win.solana);
  }
}

export const solanaService = new SolanaService();
