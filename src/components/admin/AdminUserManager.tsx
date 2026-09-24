import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  User as UserIcon, 
  Mail, 
  Calendar, 
  Award, 
  KeyRound, 
  Check, 
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface PlatformUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  selectedLevel: string;
  createdAt: string;
}

export const AdminUserManager: React.FC = () => {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Admin secret key promo form
  const [promoEmail, setPromoEmail] = useState<string>('');
  const [promoSecret, setPromoSecret] = useState<string>('NihongoHub_Atlas_Admin_Secret_2026');
  const [promoLoading, setPromoLoading] = useState<boolean>(false);
  const [promoResult, setPromoResult] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load user roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRole = async (user: PlatformUser) => {
    const userId = user.id || user._id;
    if (!userId) return;

    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmPrompt = user.role === 'admin'
      ? `Demote ${user.name} (${user.email}) to regular student? They will lose access to this Admin Panel.`
      : `Promote ${user.name} (${user.email}) to Administrator? They will receive full access to Master DB and PDF imports.`;

    if (!window.confirm(confirmPrompt)) return;

    setActionLoadingId(userId);
    try {
      const res = await api.admin.updateUserRole(userId, newRole);
      if (res.success) {
        showToast(res.message);
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update user role.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSecretPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoEmail.trim() || !promoSecret.trim()) return;

    setPromoLoading(true);
    setPromoResult(null);
    try {
      const res = await api.auth.promoteAdmin(promoEmail.trim(), promoSecret.trim());
      if (res.success) {
        setPromoResult(`Success! ${promoEmail} is now an Administrator.`);
        setPromoEmail('');
        fetchUsers();
      }
    } catch (err: any) {
      setPromoResult(`Error: ${err.message}`);
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#1a1918] text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-pop-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              Platform Accounts
            </span>
            <span className="text-xs text-[#8c8880] font-serif-jp">ユーザー管理</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-japanese text-[#1a1918]">
            User Management & Access Roles
          </h2>
          <p className="text-xs text-[#8c8880] mt-0.5">
            View registered learners and assign administrator privileges securely.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#eeece6] hover:bg-[#faf9f6] text-[#1a1918] text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-[#eeece6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-[#eeece6] text-[#6e6b66] font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4 pl-6">User</th>
                <th className="p-4">Email</th>
                <th className="p-4">Target Level</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeece6]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8c8880]">
                    Loading platform users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8c8880]">
                    No registered users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const uId = u.id || u._id;
                  const isUpdating = actionLoadingId === uId;
                  return (
                    <tr key={uId} className="hover:bg-[#faf9f6]/70 transition-colors">
                      
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            u.role === 'admin'
                              ? 'bg-[#d93829] text-white shadow-xs'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-[#1a1918] block">
                              {u.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono text-[#6e6b66]">
                        {u.email}
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-[#faf9f6] border border-[#eeece6] text-[#1a1918]">
                          {u.selectedLevel || 'N5'}
                        </span>
                      </td>

                      <td className="p-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#d93829]/10 text-[#d93829] border border-red-200">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Administrator</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700">
                            <UserIcon className="w-3 h-3" />
                            <span>Student</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-[#8c8880] text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleToggleRole(u)}
                          disabled={isUpdating}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                            u.role === 'admin'
                              ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                              : 'bg-[#1a1918] hover:bg-neutral-800 text-white shadow-xs'
                          }`}
                        >
                          {isUpdating
                            ? 'Updating...'
                            : u.role === 'admin'
                            ? 'Demote to Student'
                            : 'Promote to Admin'}
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secret Key Promotion Card */}
      <div className="bg-[#faf9f6] rounded-3xl border border-[#eeece6] p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1a1918]">
              Emergency Secret Key Promotion Tool
            </h3>
            <p className="text-xs text-[#8c8880]">
              Promote any registered email address to Administrator using the cluster's secure master key.
            </p>
          </div>
        </div>

        <form onSubmit={handleSecretPromotion} className="flex flex-col sm:flex-row gap-3 pt-2">
          <input
            type="email"
            required
            placeholder="Target user email..."
            value={promoEmail}
            onChange={(e) => setPromoEmail(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-white border border-[#eeece6] text-xs font-mono focus:outline-none focus:border-[#1a1918]"
          />
          <input
            type="password"
            required
            placeholder="ADMIN_KEY from .env..."
            value={promoSecret}
            onChange={(e) => setPromoSecret(e.target.value)}
            className="w-full sm:w-64 px-4 py-2.5 rounded-2xl bg-white border border-[#eeece6] text-xs font-mono focus:outline-none focus:border-[#1a1918]"
          />
          <button
            type="submit"
            disabled={promoLoading}
            className="px-5 py-2.5 rounded-2xl bg-[#1a1918] hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {promoLoading ? 'Promoting...' : 'Promote via Secret'}
          </button>
        </form>

        {promoResult && (
          <div className={`p-3 rounded-xl text-xs font-semibold ${
            promoResult.startsWith('Success')
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}>
            {promoResult}
          </div>
        )}
      </div>

    </div>
  );
};
