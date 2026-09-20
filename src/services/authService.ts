import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { AuthenticatedUser, AuthProviderType } from '../types';

const AUTH_USER_KEY = 'sbos_authenticated_user';
const LOCAL_ACCOUNTS_KEY = 'sbos_registered_accounts';

interface StoredAccount {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  businessName?: string;
  createdAt: string;
}

// Simple deterministic hash for local offline fallback credentials
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

class AuthService {
  private currentUser: AuthenticatedUser | null = null;
  private listeners: ((user: AuthenticatedUser | null) => void)[] = [];

  constructor() {
    this.currentUser = this.loadUserFromStorage();
  }

  private loadUserFromStorage(): AuthenticatedUser | null {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private saveUserToStorage(user: AuthenticatedUser | null): void {
    try {
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch (e) {
      console.error('Failed to write auth session to localStorage', e);
    }
    this.currentUser = user;
    this.notifyListeners();
  }

  public subscribe(listener: (user: AuthenticatedUser | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentUser);
      } catch (e) {
        console.error('Auth listener error:', e);
      }
    }
  }

  public getAuthenticatedUser(): AuthenticatedUser | null {
    if (!this.currentUser) {
      this.currentUser = this.loadUserFromStorage();
    }
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.getAuthenticatedUser());
  }

  // 1. SIGN IN WITH GOOGLE
  public async signInWithGoogle(): Promise<AuthenticatedUser> {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const fbUser = result.user;
      const token = await fbUser.getIdToken().catch(() => undefined);

      const user: AuthenticatedUser = {
        id: fbUser.uid,
        email: fbUser.email || undefined,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User',
        photoUrl: fbUser.photoURL || undefined,
        provider: 'google',
        role: 'owner',
        token,
        createdAt: new Date().toISOString(),
      };

      this.saveUserToStorage(user);
      this.syncUserToBackend(user);
      return user;
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      // Helpful friendly message if popup blocked or network error
      if (err.code === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked by your browser. Please allow popups or try Email/Wallet.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in was cancelled. Please try again.');
      }
      throw new Error(err.message || 'Google Sign-In failed. Please try Email or Solana Wallet.');
    }
  }

  // 2. SIGN UP WITH EMAIL & PASSWORD
  public async signUpWithEmail(
    email: string,
    pass: string,
    name: string,
    businessName?: string
  ): Promise<AuthenticatedUser> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    const cleanName = name.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanPass) {
      throw new Error('Email and password are required.');
    }
    if (cleanPass.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    let uid = 'usr_' + Date.now();
    let token: string | undefined = undefined;

    // Try Firebase Authentication
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      uid = cred.user.uid;
      token = await cred.user.getIdToken().catch(() => undefined);
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
      }
    } catch (fbErr: any) {
      // If Firebase Auth has email auth disabled or network is offline, gracefully fall back to local registry
      console.warn('Firebase Email Signup fallback activated:', fbErr.message);
      
      // Store in local account registry
      const accounts = this.getLocalAccounts();
      if (accounts.some((a) => a.email === cleanEmail)) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      accounts.push({
        id: uid,
        email: cleanEmail,
        passwordHash: simpleHash(cleanPass),
        name: cleanName,
        businessName,
        createdAt: new Date().toISOString(),
      });
      this.saveLocalAccounts(accounts);
    }

    const user: AuthenticatedUser = {
      id: uid,
      email: cleanEmail,
      name: cleanName,
      provider: 'email',
      role: 'owner',
      token,
      createdAt: new Date().toISOString(),
    };

    this.saveUserToStorage(user);
    this.syncUserToBackend(user);
    return user;
  }

  // 3. SIGN IN WITH EMAIL & PASSWORD
  public async signInWithEmail(email: string, pass: string): Promise<AuthenticatedUser> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      throw new Error('Please enter both email and password.');
    }

    // Try Firebase first
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const token = await cred.user.getIdToken().catch(() => undefined);
      const user: AuthenticatedUser = {
        id: cred.user.uid,
        email: cred.user.email || cleanEmail,
        name: cred.user.displayName || cleanEmail.split('@')[0],
        provider: 'email',
        role: 'owner',
        token,
        createdAt: new Date().toISOString(),
      };
      this.saveUserToStorage(user);
      this.syncUserToBackend(user);
      return user;
    } catch (fbErr: any) {
      // Check local fallback account registry
      const accounts = this.getLocalAccounts();
      const match = accounts.find((a) => a.email === cleanEmail);
      if (match && match.passwordHash === simpleHash(cleanPass)) {
        const user: AuthenticatedUser = {
          id: match.id,
          email: match.email,
          name: match.name,
          provider: 'email',
          role: 'owner',
          createdAt: match.createdAt,
        };
        this.saveUserToStorage(user);
        this.syncUserToBackend(user);
        return user;
      }

      if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please verify your credentials.');
      } else if (fbErr.code === 'auth/user-not-found') {
        throw new Error('No account found for this email. Please sign up first.');
      }
      throw new Error(fbErr.message || 'Invalid email or password.');
    }
  }

  // 4. SIGN IN / UP WITH SOLANA WALLET
  public async signInWithWallet(customAddress?: string): Promise<AuthenticatedUser> {
    let address = customAddress?.trim();

    if (!address) {
      // Attempt browser Web3 wallet detection (Phantom, Solflare, etc.)
      const solana = (window as any).solana || (window as any).phantom?.solana;
      if (solana) {
        try {
          const resp = await solana.connect();
          address = resp.publicKey.toString();
        } catch (walletErr: any) {
          throw new Error(walletErr.message || 'Connection to Solana wallet was declined.');
        }
      } else {
        throw new Error(
          'No Solana browser extension detected (e.g. Phantom or Solflare). Please install a wallet or enter your Solana public key manually.'
        );
      }
    }

    // Validate Base58 address structure (32 to 44 characters)
    if (!address || address.length < 32 || address.length > 44) {
      throw new Error('Invalid Solana wallet address. Please provide a valid Base58 public key.');
    }

    const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
    const user: AuthenticatedUser = {
      id: `sol_${address}`,
      name: `Solana Merchant (${shortAddress})`,
      walletAddress: address,
      provider: 'wallet',
      role: 'owner',
      createdAt: new Date().toISOString(),
    };

    this.saveUserToStorage(user);
    this.syncUserToBackend(user);
    return user;
  }

  // 5. SIGN OUT
  public async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth).catch(() => {});
    } catch {}
    this.saveUserToStorage(null);
  }

  // Helper: Local Accounts Storage for Offline / Non-configured Firebase fallback
  private getLocalAccounts(): StoredAccount[] {
    try {
      const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveLocalAccounts(accounts: StoredAccount[]): void {
    try {
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save local accounts:', e);
    }
  }

  // Helper: Sync with PostgreSQL backend /api/auth/sync
  private async syncUserToBackend(user: AuthenticatedUser): Promise<void> {
    try {
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.id,
          email: user.email || `${user.walletAddress || user.id}@solana.merchant`,
          name: user.name,
        }),
      });
    } catch {
      // Non-blocking fire-and-forget sync
    }
  }
}

export const authService = new AuthService();
