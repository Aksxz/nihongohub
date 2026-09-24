import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { UserSession } from '../../types/user';

interface AdminAuthViewProps {
  onSuccess: (session: UserSession) => void;
  onReturnToApp: () => void;
}

export const AdminAuthView: React.FC<AdminAuthViewProps> = ({ onSuccess, onReturnToApp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both administrator email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await authService.adminLogin(email.trim(), password.trim());
      onSuccess(session);
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError(err.message || 'Administrator authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-4">
      {/* Background Decorative Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-[0.03]">
        <span className="text-[40vw] font-japanese font-black select-none text-[#1a1918]">統</span>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#eeece6] shadow-xl p-8 space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto shadow-md">
              <ShieldCheck className="w-7 h-7 text-[#d93829]" />
            </div>
            
            <div className="inline-block px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold uppercase tracking-wider">
              NihongoHub Staff
            </div>

            <h1 className="text-2xl font-bold font-japanese text-[#1a1918]">
              管理者ポータル
            </h1>
            <p className="text-xs text-[#8c8880]">
              Sign in to manage curriculum, vocabulary, and MongoDB Atlas
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nihongohub.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#eeece6] text-xs text-[#1a1918] focus:outline-none focus:border-[#1a1918] focus:ring-1 focus:ring-[#1a1918] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#eeece6] text-xs text-[#1a1918] focus:outline-none focus:border-[#1a1918] focus:ring-1 focus:ring-[#1a1918] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-[#1a1918] hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Access Admin Panel</span>
                </>
              )}
            </button>
          </form>

          {/* Divider & Return */}
          <div className="pt-2 border-t border-[#eeece6]">
            <button
              type="button"
              onClick={onReturnToApp}
              className="w-full py-2.5 rounded-xl border border-[#eeece6] bg-[#faf9f6] hover:bg-neutral-100 text-neutral-600 text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Student App</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
