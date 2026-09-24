import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Users, 
  BookOpen, 
  Layers, 
  FileUp, 
  HardDrive, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookmarkCheck,
  FileText,
  Headphones,
  CheckSquare
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateTab: (tab: 'dashboard' | 'vocabulary' | 'kanji' | 'patterns' | 'reading' | 'listening' | 'tests' | 'importer' | 'review' | 'users') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.getStatistics();
      if (res.success) {
        setStats(res.data);
      } else {
        setError('Failed to load system statistics.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not connect to admin backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#1a1918] to-[#2d2a27] text-white p-6 sm:p-8 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-[#d93829] px-2.5 py-1 rounded-full text-white">
              MongoDB Atlas Core
            </span>
            <span className="text-xs text-neutral-300 font-serif-jp">管理者ダッシュボード</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-japanese tracking-tight">
            NihongoHub Admin Panel
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-xl">
            Centralized management system for master vocabulary decks (Chapters 1–24), Kanji archives, PDF vocabulary extraction, and platform accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer border border-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchStats}
            className="text-xs font-bold underline hover:no-underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Cluster Status Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#eeece6] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${stats?.database?.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1a1918]">MongoDB Atlas Cluster:</span>
              <span className="text-xs font-mono font-bold text-[#d93829]">NihongoHub</span>
            </div>
            <span className="text-[11px] text-[#8c8880]">
              State: {stats?.database?.status === 'connected' ? 'Connected & Healthy (Mongoose ODM)' : (loading ? 'Querying...' : 'Cluster Initializing')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-[#6e6b66]">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-[#8c8880]" />
            <span>Collections: 9 active models</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zero-Master-Overwrite</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Users */}
        <div 
          onClick={() => onNavigateTab('users')}
          className="p-5 rounded-2xl bg-white border border-[#eeece6] shadow-xs hover:border-[#1a1918] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8c8880] uppercase tracking-wider">Users</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1a1918]">
            {loading ? '...' : (stats?.totalUsers ?? 0)}
          </div>
          <div className="text-[11px] text-[#8c8880] mt-1 flex items-center justify-between">
            <span>Registered accounts</span>
            <ArrowRight className="w-3 h-3 text-[#8c8880] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Master Vocabulary */}
        <div 
          onClick={() => onNavigateTab('vocabulary')}
          className="p-5 rounded-2xl bg-white border border-[#eeece6] shadow-xs hover:border-[#1a1918] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8c8880] uppercase tracking-wider">Vocabulary</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#d93829] flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1a1918]">
            {loading ? '...' : (stats?.vocabulary?.total ?? 0)}
          </div>
          <div className="text-[11px] text-[#8c8880] mt-1 flex items-center justify-between">
            <span>N5: {stats?.vocabulary?.n5 ?? 0} | N4: {stats?.vocabulary?.n4 ?? 0} | N3: {stats?.vocabulary?.n3 ?? 0}</span>
            <ArrowRight className="w-3 h-3 text-[#8c8880] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Master Kanji */}
        <div 
          onClick={() => onNavigateTab('kanji')}
          className="p-5 rounded-2xl bg-white border border-[#eeece6] shadow-xs hover:border-[#1a1918] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8c8880] uppercase tracking-wider">Kanji Bank</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ea580c] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1a1918]">
            {loading ? '...' : (stats?.kanji?.total ?? 0)}
          </div>
          <div className="text-[11px] text-[#8c8880] mt-1 flex items-center justify-between">
            <span>N5: {stats?.kanji?.n5 ?? 0} | N4: {stats?.kanji?.n4 ?? 0} | N3: {stats?.kanji?.n3 ?? 0}</span>
            <ArrowRight className="w-3 h-3 text-[#8c8880] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Pending PDF Staging Imports */}
        <div 
          onClick={() => onNavigateTab('review')}
          className="p-5 rounded-2xl bg-white border border-[#eeece6] shadow-xs hover:border-[#1a1918] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8c8880] uppercase tracking-wider">Staged Imports</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1a1918] flex items-center gap-2">
            <span>{loading ? '...' : (stats?.pendingImports ?? 0)}</span>
            {(stats?.pendingImports ?? 0) > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Action Needed
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#8c8880] mt-1 flex items-center justify-between">
            <span>Awaiting Admin approval</span>
            <ArrowRight className="w-3 h-3 text-[#8c8880] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Grammar Patterns */}
        <div 
          onClick={() => onNavigateTab('patterns')}
          className="p-5 rounded-2xl bg-white border border-[#eeece6] shadow-xs hover:border-[#1a1918] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8c8880] uppercase tracking-wider">Grammar Patterns</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookmarkCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1a1918]">
            {loading ? '...' : (stats?.totalPatterns ?? 0)}
          </div>
          <div className="text-[11px] text-[#8c8880] mt-1 flex items-center justify-between">
            <span>Chapter formulas & notes</span>
            <ArrowRight className="w-3 h-3 text-[#8c8880] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Reading Comprehension */}
        <div 
          onClick={() => onNavigateTab('reading')}
          className="p-5 rounded-2xl bg-white border border-[#eeece6] shadow-xs hover:border-[#1a1918] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8c8880] uppercase tracking-wider">Reading Passages</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1a1918]">
            {loading ? '...' : (stats?.totalReadings ?? 0)}
          </div>
          <div className="text-[11px] text-[#8c8880] mt-1 flex items-center justify-between">
            <span>Paragraphs & 5-MCQ tests</span>
            <ArrowRight className="w-3 h-3 text-[#8c8880] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Listening Practice */}
        <div 
          onClick={() => onNavigateTab('listening')}
          className="p-5 rounded-2xl bg-white border border-[#eeece6] shadow-xs hover:border-[#1a1918] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8c8880] uppercase tracking-wider">Listening Exercises</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Headphones className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1a1918]">
            {loading ? '...' : (stats?.totalListenings ?? 0)}
          </div>
          <div className="text-[11px] text-[#8c8880] mt-1 flex items-center justify-between">
            <span>Audio speech & 5-MCQ tests</span>
            <ArrowRight className="w-3 h-3 text-[#8c8880] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Assessment Tests */}
        <div 
          onClick={() => onNavigateTab('tests')}
          className="p-5 rounded-2xl bg-white border border-[#eeece6] shadow-xs hover:border-[#1a1918] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8c8880] uppercase tracking-wider">Assessment Tests</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1a1918]">
            {loading ? '...' : (stats?.totalTests ?? 0)}
          </div>
          <div className="text-[11px] text-[#8c8880] mt-1 flex items-center justify-between">
            <span>MCQ, T/F & Fill-in-Blank</span>
            <ArrowRight className="w-3 h-3 text-[#8c8880] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* PDF Vocabulary Importer Action Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#faf9f6] to-[#f4f2eb] border border-[#eeece6] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-[#d93829] flex items-center justify-center">
              <FileUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#1a1918]">
              PDF Vocabulary Importer
            </h3>
            <p className="text-xs text-[#6e6b66] leading-relaxed">
              Upload Japanese learning PDFs to extract vocabulary, readings, and meanings with automatic chapter recognition (Chapters 1–24).
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('importer')}
            className="w-full py-2.5 px-4 rounded-xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Upload New PDF</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Staging Review Action Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#faf9f6] to-[#f4f2eb] border border-[#eeece6] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#1a1918]">
              Staging & Duplicate Review
            </h3>
            <p className="text-xs text-[#6e6b66] leading-relaxed">
              Verify parsed candidate words before publishing. Detect existing duplicate entries in MongoDB, perform inline edits, and batch approve.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('review')}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1a1918] hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Review Staged Words</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Master Vocabulary CRUD Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#faf9f6] to-[#f4f2eb] border border-[#eeece6] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#1a1918]">
              Master Vocabulary Deck
            </h3>
            <p className="text-xs text-[#6e6b66] leading-relaxed">
              Directly curate, search, edit, or delete master words across JLPT N5, N4, and N3. Maintains zero-master-overwrite integrity for user overlays.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('vocabulary')}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-50 text-[#1a1918] border border-[#d4d0c8] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Manage Master Deck</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
