import { User, UserSession } from '../types/user';
import { JLPTLevel } from '../types/kanji';
import { idb } from '../db/idb';
import { api } from './api';

const SESSION_STORAGE_KEY = 'nihongohub_session';
const TOKEN_STORAGE_KEY = 'nihongohub_token';

export class AuthService {
  /**
   * Generates a cryptographically secure 16-byte random hex salt
   */
  public generateSalt(): string {
    const array = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Securely hashes the password with salt using the browser's native Web Crypto API (SHA-256)
   */
  public async hashPassword(password: string, salt: string): Promise<string> {
    const textToHash = password + salt;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(textToHash);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback simple deterministic hash in case subtle crypto is unavailable
    let hash = 0;
    for (let i = 0; i < textToHash.length; i++) {
      hash = (hash << 5) - hash + textToHash.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Initiates signup flow: validates, generates 6-digit OTP, sends to user's email.
   * Does NOT create account in MongoDB until verified.
   */
  public async initiateSignup(
    fullName: string,
    email: string,
    password: string,
    confirmPassword?: string,
    selectedLevel: JLPTLevel = 'N5'
  ): Promise<{ success: boolean; otpPending: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const res = await api.auth.signup({
      name: fullName.trim(),
      email: normalizedEmail,
      password,
      confirmPassword,
      selectedLevel
    });

    if (!res.success) {
      throw new Error((res as any).message || 'Signup initiation failed');
    }

    return res;
  }

  /**
   * Verifies signup 6-digit OTP. On success, creates user account in MongoDB.
   * Does NOT log in automatically.
   */
  public async verifySignupOTP(
    email: string,
    otp: string
  ): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const res = await api.auth.verifySignupOtp({
      email: normalizedEmail,
      otp: otp.trim()
    });

    if (!res.success) {
      throw new Error((res as any).message || 'OTP verification failed');
    }

    return res;
  }

  /**
   * Initiates login flow: validates credentials, verifies single session, sends 6-digit OTP to email.
   * Does NOT authenticate user until OTP is verified.
   */
  public async initiateLogin(
    email: string,
    password: string
  ): Promise<{ success: boolean; otpPending: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const res = await api.auth.login({
      email: normalizedEmail,
      password
    });

    if (!res.success) {
      throw new Error((res as any).message || 'Invalid email or password.');
    }

    return {
      success: true,
      otpPending: true,
      message: res.message || 'Enter the OTP sent to your email.'
    };
  }

  /**
   * Verifies login 6-digit OTP. On success, creates authenticated session and returns UserSession.
   */
  public async verifyLoginOTP(
    email: string,
    otp: string
  ): Promise<UserSession> {
    const normalizedEmail = email.trim().toLowerCase();

    const res = await api.auth.verifyLoginOtp({
      email: normalizedEmail,
      otp: otp.trim()
    });

    if (!res.success || !res.token || !res.user) {
      throw new Error((res as any).message || 'Invalid or expired OTP.');
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, res.token);

    const session: UserSession = {
      userId: res.user.id || res.user._id,
      email: res.user.email,
      fullName: res.user.name,
      selectedLevel: res.user.selectedLevel || 'N5',
      role: res.user.role || 'user',
      token: res.token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    };

    this.saveSession(session);
    return session;
  }

  /**
   * Requests a new 6-digit OTP for signup or login with 60s rate limit
   */
  public async resendOTP(
    email: string,
    purpose: 'signup' | 'login'
  ): Promise<{ success: boolean; message: string; waitSeconds?: number }> {
    const normalizedEmail = email.trim().toLowerCase();

    const res = await api.auth.resendOtp({
      email: normalizedEmail,
      purpose
    });

    if (!res.success) {
      throw new Error((res as any).message || 'Failed to resend OTP.');
    }

    return res;
  }

  /**
   * Legacy Direct Signup fallback
   */
  public async signup(
    fullName: string,
    email: string,
    password: string,
    selectedLevel: JLPTLevel = 'N5'
  ): Promise<UserSession> {
    await this.initiateSignup(fullName, email, password, undefined, selectedLevel);
    throw new Error('Please verify the OTP sent to your email to complete registration.');
  }

  /**
   * Legacy Direct Login fallback
   */
  public async login(email: string, password: string): Promise<UserSession> {
    await this.initiateLogin(email, password);
    throw new Error('Please verify the OTP sent to your email to complete sign in.');
  }

  /**
   * Dedicated Admin Authentication via /api/admin/auth/login
   */
  public async adminLogin(email: string, password: string): Promise<UserSession> {
    const normalizedEmail = email.trim().toLowerCase();

    const res = await api.admin.auth.login({
      email: normalizedEmail,
      password
    });

    if (!res.success || !res.token || !res.user) {
      throw new Error((res as any).message || 'Invalid administrator credentials.');
    }

    if (res.user.role !== 'admin') {
      throw new Error('Access denied. Administrator privileges required.');
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, res.token);

    const session: UserSession = {
      userId: res.user.id || res.user._id,
      email: res.user.email,
      fullName: res.user.name,
      selectedLevel: res.user.selectedLevel || 'N5',
      role: 'admin',
      token: res.token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    };

    this.saveSession(session);
    return session;
  }

  /**
   * Dedicated Admin Logout
   */
  public adminLogout(): void {
    try {
      api.admin.auth.logout().catch(() => {});
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear admin session from localStorage', e);
    }
  }

  /**
   * Retrieves active session strictly if user has admin role
   */
  public getCurrentAdminSession(): UserSession | null {
    const session = this.getCurrentSession();
    if (session && session.role === 'admin') {
      return session;
    }
    return null;
  }

  /**
   * Refreshes user details and permissions from backend API
   */
  public async refreshCurrentUser(): Promise<UserSession | null> {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return this.getCurrentSession();

    try {
      const res = await api.auth.getMe();
      if (res.success && res.user) {
        const current = this.getCurrentSession();
        const updated: UserSession = {
          userId: res.user.id || res.user._id,
          email: res.user.email,
          fullName: res.user.name,
          selectedLevel: res.user.selectedLevel || current?.selectedLevel || 'N5',
          role: res.user.role || 'user',
          token,
          expiresAt: current?.expiresAt || (Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
        this.saveSession(updated);
        return updated;
      }
    } catch (e) {
      console.warn('Could not refresh user session from backend:', e);
    }
    return this.getCurrentSession();
  }

  /**
   * Clears active session
   */
  public logout(): void {
    try {
      const session = this.getCurrentSession();
      api.auth.logout({
        userId: session?.userId,
        email: session?.email
      }).catch(() => {});
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear session from localStorage', e);
    }
  }

  /**
   * Retrieves active session from localStorage
   */
  public getCurrentSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const session: UserSession = JSON.parse(raw);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Persists session to localStorage
   */
  private saveSession(session: UserSession): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save session to localStorage', e);
    }
  }

  /**
   * Updates user's active JLPT level in both database and local session
   */
  public async updateUserLevel(userId: string, level: JLPTLevel): Promise<void> {
    const user = await idb.getUserById(userId);
    if (user) {
      user.selectedLevel = level;
      await idb.updateUser(user);
    }

    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.userId === userId) {
      currentSession.selectedLevel = level;
      this.saveSession(currentSession);
    }
  }

  public async updateSelectedLevel(level: JLPTLevel): Promise<void> {
    const current = this.getCurrentSession();
    if (current) {
      await this.updateUserLevel(current.userId, level);
    }
  }
}

export const authService = new AuthService();
