import React, { useState, useEffect } from 'react';
import { UserSession } from '../../types/user';
import { AdminDashboard } from './AdminDashboard';
import { AdminVocabManager } from './AdminVocabManager';
import { AdminKanjiManager } from './AdminKanjiManager';
import { AdminPdfImporter } from './AdminPdfImporter';
import { AdminImportReview } from './AdminImportReview';
import { AdminUserManager } from './AdminUserManager';
import { AdminPatternsManager } from './AdminPatternsManager';
import { AdminReadingManager } from './AdminReadingManager';
import { AdminListeningManager } from './AdminListeningManager';
import { AdminTestManager } from './AdminTestManager';
import { AdminTestAttempts } from './AdminTestAttempts';
import { api } from '../../services/api';
import { authService } from '../../services/authService';
import { 
  ShieldAlert, 
  ArrowLeft, 
  LayoutDashboard, 
  BookOpen, 
  Layers, 
  FileUp, 
  Sparkles, 
  Users, 
  ShieldCheck, 
  KeyRound,
  CheckCircle2,
  ExternalLink,
  BookmarkCheck,
  FileText,
  Headphones,
  CheckSquare,
  ClipboardList
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'vocabulary' | 'kanji' | 'patterns' | 'reading' | 'listening' | 'tests' | 'test-attempts' | 'importer' | 'review' | 'users';

interface AdminLayoutProps {
  user: UserSession | null;
  onReturnToApp: () => void;
  onUserPromoted?: (updatedUser: UserSession) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  user, 
  onReturnToApp,
  onUserPromoted 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [targetReviewImportId, setTargetReviewImportId] = useState<string | null>(null);
  const [pendingImportsCount, setPendingImportsCount] = useState<number>(0);

  // Self promotion form for 403 screen
  const [secretKeyInput, setSecretKeyInput] = useState<string>('');
  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Fetch count of pending imports for badge
  const checkPendingImports = async () => {
    try {
      const res = await api.admin.getStatistics();
      if (res.success) {
        setPendingImportsCount(res.data.pendingImports || 0);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      checkPendingImports();
    }
  }, [user?.role, activeTab]);

  const handleNavigateToReview = (importId?: string) => {
    if (importId) {
      setTargetReviewImportId(importId);
    }
    setActiveTab('review');
  };

  const handleSelfPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !secretKeyInput.trim()) return;

    setIsPromoting(true);
    setPromoError(null);
    try {
      const res = await api.auth.promoteAdmin(user.email, secretKeyInput.trim());
      if (res.success) {
        // Refresh session
        const updated = await authService.refreshCurrentUser();
        if (updated && onUserPromoted) {
          onUserPromoted(updated);
        }
      }
    } catch (err: any) {
      setPromoError(err.message || 'Promotion failed. Check admin key.');
    } finally {
      setIsPromoting(false);
    }
  };

  // ACCESS DENIED VIEW (403 Forbidden)
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#eeece6] shadow-xl p-8 text-center space-y-6 animate-pop-in">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#d93829] flex items-center justify-center mx-auto border border-rose-100">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <div className="inline-block px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#d93829] text-[10px] font-bold uppercase tracking-wider">
              403 Forbidden
            </div>
            <h2 className="text-xl font-bold font-japanese text-[#1a1918]">
              Administrator Access Required
            </h2>
            <p className="text-xs text-[#8c8880] leading-relaxed">
              The NihongoHub Admin Panel and MongoDB Atlas management tools are restricted to authorized administrators.
            </p>
          </div>

          {/* Quick promote with Admin Key if logged in */}
          {user && (
            <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1a1918]">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Have an Admin Master Key?</span>
              </div>
              <form onSubmit={handleSelfPromote} className="space-y-2.5">
                <input
                  type="password"
                  value={secretKeyInput}
                  onChange={(e) => setSecretKeyInput(e.target.value)}
                  placeholder="Enter ADMIN_KEY..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#eeece6] text-xs font-mono focus:outline-none focus:border-[#1a1918]"
                />
                <button
                  type="submit"
                  disabled={isPromoting}
                  className="w-full py-2 rounded-xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isPromoting ? 'Promoting...' : `Promote ${user.email} to Admin`}
                </button>
              </form>
              {promoError && (
                <p className="text-[11px] text-rose-600 font-semibold">{promoError}</p>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={onReturnToApp}
              className="w-full py-2.5 rounded-2xl bg-[#1a1918] hover:bg-neutral-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Study Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'vocabulary', label: 'Vocabulary Deck', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'kanji', label: 'Kanji Bank', icon: <Layers className="w-4 h-4" /> },
    { id: 'patterns', label: 'Patterns', icon: <BookmarkCheck className="w-4 h-4" /> },
    { id: 'reading', label: 'Reading', icon: <FileText className="w-4 h-4" /> },
    { id: 'listening', label: 'Listening', icon: <Headphones className="w-4 h-4" /> },
    { id: 'tests', label: 'Tests', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'test-attempts', label: 'Test Attempts', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'importer', label: 'PDF Importer', icon: <FileUp className="w-4 h-4" /> },
    { id: 'review', label: 'Review Staging', icon: <Sparkles className="w-4 h-4" />, badge: pendingImportsCount },
    { id: 'users', label: 'Users & Roles', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1918] flex flex-col font-sans">
      
      {/* Admin Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#eeece6] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand + Return Link */}
            <div className="flex items-center gap-3">
              <button
                onClick={onReturnToApp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#6e6b66] hover:text-[#1a1918] hover:bg-[#faf9f6] border border-[#eeece6] transition-all cursor-pointer"
                title="Return to Student App"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Admin</span>
              </button>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#d93829] flex items-center justify-center text-white font-serif-jp text-sm font-bold shadow-xs">
                  日
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold font-japanese text-sm sm:text-base text-[#1a1918]">
                    NihongoHub
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#d93829] text-white uppercase tracking-wider font-mono">
                    Admin
                  </span>
                </div>
              </div>
            </div>

            {/* Current Admin Identity */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-[#1a1918]">
                  {user.fullName}
                </div>
                <div className="text-[11px] text-[#8c8880] font-mono">
                  {user.email}
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#d93829]/10 border border-red-200 text-[#d93829] font-bold text-xs flex items-center justify-center">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            </div>

          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#1a1918] text-white shadow-xs'
                      : 'text-[#6e6b66] hover:bg-[#f2f0ea] hover:text-[#1a1918]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#d93829] text-white">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <AdminDashboard onNavigateTab={(t) => setActiveTab(t)} />
        )}

        {activeTab === 'vocabulary' && (
          <AdminVocabManager />
        )}

        {activeTab === 'kanji' && (
          <AdminKanjiManager />
        )}

        {activeTab === 'patterns' && (
          <AdminPatternsManager />
        )}

        {activeTab === 'reading' && (
          <AdminReadingManager />
        )}

        {activeTab === 'listening' && (
          <AdminListeningManager />
        )}

        {activeTab === 'tests' && (
          <AdminTestManager />
        )}

        {activeTab === 'test-attempts' && (
          <AdminTestAttempts />
        )}

        {activeTab === 'importer' && (
          <AdminPdfImporter onGoToReview={handleNavigateToReview} />
        )}

        {activeTab === 'review' && (
          <AdminImportReview 
            initialImportId={targetReviewImportId}
            onNavigateImporter={() => setActiveTab('importer')}
          />
        )}

        {activeTab === 'users' && (
          <AdminUserManager />
        )}
      </main>

    </div>
  );
};
