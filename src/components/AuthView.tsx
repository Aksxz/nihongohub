import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { UserSession } from '../types/user';
import { JLPTLevel } from '../types/kanji';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ArrowLeft,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: (session: UserSession) => void;
  initialErrorMessage?: string | null;
}

type AuthMode = 'login' | 'signup' | 'login_otp' | 'signup_otp';

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, initialErrorMessage }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel>('N5');
  const [otp, setOtp] = useState('');
  
  // Timer & Cooldown states
  const [resendCooldown, setResendCooldown] = useState(60);
  const [expirySeconds, setExpirySeconds] = useState(300);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    authService.getAuthMode().then((m) => {
      if (isMounted) setAuthMode(m);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (initialErrorMessage) {
      setErrorMessage(initialErrorMessage);
    }
  }, [initialErrorMessage]);

  // Timer countdown handler for OTP screens
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mode === 'login_otp' || mode === 'signup_otp') {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode]);

  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Submit Handler for Initial Credentials (Signup or Login)
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (authMode === 'otp' && !fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setIsLoading(true);

    if (authMode === 'password') {
      try {
        if (mode === 'signup') {
          const session = await authService.signup(
            fullName.trim() || email.split('@')[0],
            email,
            password,
            confirmPassword,
            selectedLevel
          );
          setSuccessMessage('Account created successfully! Loading your dashboard...');
          setTimeout(() => onAuthSuccess(session), 400);
        } else {
          const session = await authService.login(email, password);
          setSuccessMessage('Welcome back! Loading your dashboard...');
          setTimeout(() => onAuthSuccess(session), 400);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // OTP mode
    try {
      if (mode === 'signup') {
        const res = await authService.initiateSignup(fullName, email, password, confirmPassword, selectedLevel);
        setOtp('');
        setResendCooldown(60);
        setExpirySeconds(300);
        setSuccessMessage(res.message || 'Enter the OTP sent to your email.');
        setMode('signup_otp');
      } else {
        const res = await authService.initiateLogin(email, password);
        setOtp('');
        setResendCooldown(60);
        setExpirySeconds(300);
        setSuccessMessage(res.message || 'Enter the OTP sent to your email.');
        setMode('login_otp');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Handler for 6-Digit OTP Verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Verification code must be exactly 6 digits.');
      return;
    }

    if (expirySeconds <= 0) {
      setErrorMessage('This OTP has expired. Please request a new OTP.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup_otp') {
        await authService.verifySignupOTP(email, cleanOtp);
        // After successful signup verification: redirect user to Login page (DO NOT auto-login)
        setSuccessMessage('Account created and email verified successfully! Please sign in with your credentials.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setOtp('');
      } else if (mode === 'login_otp') {
        const session = await authService.verifyLoginOTP(email, cleanOtp);
        setSuccessMessage('Welcome back! Loading your dashboard...');
        setTimeout(() => {
          onAuthSuccess(session);
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP Handler with Cooldown
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage(null);

    try {
      const purpose = mode === 'signup_otp' ? 'signup' : 'login';
      const res = await authService.resendOTP(email, purpose);
      setResendCooldown(res.waitSeconds || 60);
      setExpirySeconds(300);
      setSuccessMessage('A new verification code has been sent to your email.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to resend verification code. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#1a1918] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="w-16 h-16 rounded-3xl bg-[#d93829] flex items-center justify-center text-white text-3xl font-serif-jp shadow-xl shadow-red-200/50 mx-auto mb-4 border border-red-400/30">
          日
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif-jp text-[#1a1918]">
          日本語ハブ <span className="text-[#d93829] font-sans font-bold text-xl">NihongoHub</span>
        </h1>
        <p className="mt-2 text-sm text-[#8c8880]">
          {mode === 'login' && 'Sign in to access your personalized Japanese study dashboard'}
          {mode === 'signup' && 'Create your account to start personalized Japanese mastery'}
          {mode === 'login_otp' && 'Verify your identity to complete sign-in'}
          {mode === 'signup_otp' && 'Verify your email to activate your account'}
        </p>
      </div>

      {/* Auth Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-stone-200/40 rounded-3xl border border-[#eeece6]">
          
          {/* Mode Switcher Tabs (Only visible when entering credentials) */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex p-1 bg-[#faf9f6] rounded-2xl border border-[#eeece6] mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-[#1a1918] shadow-xs'
                    : 'text-[#8c8880] hover:text-[#1a1918]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-[#1a1918] shadow-xs'
                    : 'text-[#8c8880] hover:text-[#1a1918]'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-pop-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5 animate-pop-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* 1. INITIAL CREDENTIALS FORM (Login or Signup) */}
          {(mode === 'login' || mode === 'signup') && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              
              {/* Full Name (Sign Up only, OTP mode) */}
              {mode === 'signup' && authMode === 'otp' && (
                <div>
                  <label className="block text-xs font-bold text-[#6e6b66] uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c8880]">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Kenji Sato"
                      className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#faf9f6] border border-[#eeece6] rounded-2xl text-[#1a1918] placeholder-[#8c8880] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d93829]/20 focus:border-[#d93829] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[#6e6b66] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c8880]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#faf9f6] border border-[#eeece6] rounded-2xl text-[#1a1918] placeholder-[#8c8880] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d93829]/20 focus:border-[#d93829] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-[#6e6b66] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c8880]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#faf9f6] border border-[#eeece6] rounded-2xl text-[#1a1918] placeholder-[#8c8880] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d93829]/20 focus:border-[#d93829] transition-all"
                  />
                </div>
              </div>

              {/* Confirm Password (Sign Up only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-[#6e6b66] uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c8880]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#faf9f6] border border-[#eeece6] rounded-2xl text-[#1a1918] placeholder-[#8c8880] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d93829]/20 focus:border-[#d93829] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Target JLPT Level (Sign Up only, OTP mode) */}
              {mode === 'signup' && authMode === 'otp' && (
                <div>
                  <label className="block text-xs font-bold text-[#6e6b66] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Target JLPT Level</span>
                    <span className="text-[11px] text-[#8c8880] lowercase font-normal">(can change anytime)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['N5', 'N4', 'N3'] as JLPTLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedLevel(lvl)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          selectedLevel === lvl
                            ? 'bg-[#1a1918] text-white border-[#1a1918] shadow-xs'
                            : 'bg-[#faf9f6] text-[#6e6b66] border-[#eeece6] hover:border-[#d4d0c8]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-sm font-bold shadow-md shadow-red-200 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {authMode === 'password'
                          ? (mode === 'login' ? 'Sign In' : 'Create Account')
                          : (mode === 'login' ? 'Send Login OTP' : 'Send Verification OTP')}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* 2. 6-DIGIT OTP VERIFICATION FORM (Login OTP or Signup OTP) */}
          {(mode === 'login_otp' || mode === 'signup_otp') && (
            <form onSubmit={handleOtpSubmit} className="space-y-5 animate-fade-in">
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-red-50 text-[#d93829] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-red-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#1a1918]">Enter Verification Code</h3>
                <p className="text-xs text-[#8c8880] mt-1">
                  We've sent a 6-digit code to <span className="font-semibold text-[#1a1918]">{email}</span>
                </p>
              </div>

              {/* 6-Digit OTP Input */}
              <div>
                <label className="block text-xs font-bold text-[#6e6b66] uppercase tracking-wider mb-2 text-center">
                  6-Digit OTP
                </label>
                <div className="relative max-w-xs mx-auto">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="block w-full py-3.5 px-4 text-2xl font-mono font-bold tracking-[0.5em] text-center bg-[#faf9f6] border border-[#eeece6] rounded-2xl text-[#1a1918] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d93829]/20 focus:border-[#d93829] transition-all"
                  />
                </div>
              </div>

              {/* Timer Status */}
              <div className="flex items-center justify-between text-xs text-[#8c8880] px-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Expires in: <strong className={expirySeconds <= 60 ? 'text-rose-600' : 'text-[#1a1918]'}>{formatTimer(expirySeconds)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResending}
                  className="font-bold text-[#d93829] hover:underline disabled:text-[#b5b1a8] disabled:no-underline disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                >
                  {isResending ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
                  )}
                </button>
              </div>

              {/* Verify OTP Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading || otp.trim().length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-sm font-bold shadow-md shadow-red-200 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{mode === 'login_otp' ? 'Verify & Sign In' : 'Verify & Create Account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Back to credentials */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login_otp' ? 'login' : 'signup');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setOtp('');
                  }}
                  className="text-xs font-semibold text-[#8c8880] hover:text-[#1a1918] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{mode === 'login_otp' ? 'Back to Sign In' : 'Back to Account Details'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-[#f2f0ea] text-center">
            <p className="text-[11px] text-[#8c8880]">
              {authMode === 'password'
                ? '🔐 Your account is protected with secure password authentication.'
                : '🔐 Protected by One-Time Password verification and single-device session control.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
