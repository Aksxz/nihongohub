import React from 'react';
import { AppView } from '../types/vocab';
import { JLPTLevel } from '../types/kanji';
import { UserSession } from '../types/user';
import { 
  LayoutDashboard, 
  BookOpen, 
  Languages, 
  Star, 
  AlertTriangle, 
  StickyNote, 
  BarChart3, 
  User as UserIcon, 
  LogOut, 
  X,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  BookmarkCheck,
  FileText,
  Headphones,
  CheckSquare
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  currentLevel: JLPTLevel;
  user: UserSession | null;
  onNavigate: (view: AppView) => void;
  onSelectLevel: (level: JLPTLevel) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  favoriteCount?: number;
  difficultCount?: number;
  notesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  currentLevel,
  user,
  onNavigate,
  onSelectLevel,
  onOpenProfile,
  onLogout,
  isOpenMobile,
  onCloseMobile,
  favoriteCount = 0,
  difficultCount = 0,
  notesCount = 0
}) => {
  const handleNav = (view: AppView) => {
    onNavigate(view);
    onCloseMobile();
  };

  const handleLevelChange = (lvl: JLPTLevel) => {
    onSelectLevel(lvl);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#eeece6] text-[#1a1918]">
      
      {/* Brand Header */}
      <div className="p-5 border-b border-[#eeece6] flex items-center justify-between">
        <div 
          onClick={() => handleNav('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#d93829] flex items-center justify-center text-white text-lg font-serif-jp shadow-sm group-hover:scale-105 transition-transform">
            日
          </div>
          <div className="shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-serif-jp font-bold text-base leading-tight whitespace-nowrap select-none">日本語ハブ</span>
            </div>
            <span className="text-[11px] font-bold text-[#d93829] tracking-wider block whitespace-nowrap select-none">
              NihongoHub
            </span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-2 rounded-xl text-[#8c8880] hover:text-[#1a1918] hover:bg-[#faf9f6] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6">
        
        {/* 1. DASHBOARD */}
        <div>
          <button
            onClick={() => handleNav('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-[#1a1918] text-white shadow-xs'
                : 'text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* 2. JLPT LEVEL */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880]">
              JLPT Level
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-[#d93829] border border-red-100">
              Active: {currentLevel}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 px-1">
            {(['N5', 'N4', 'N3'] as JLPTLevel[]).map((lvl) => {
              const isSelected = currentLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => handleLevelChange(lvl)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#d93829] text-white border-[#d93829] shadow-xs'
                      : 'bg-[#faf9f6] text-[#6e6b66] border-[#eeece6] hover:border-[#d4d0c8]'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. LEARNING */}
        <div>
          <div className="px-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880]">
              Learning
            </span>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleNav('vocab-list')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'vocab-list'
                  ? 'bg-[#1a1918] text-white shadow-xs'
                  : 'text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918]'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-[#d93829]" />
                <span>Vocabulary</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                currentView === 'vocab-list' ? 'bg-neutral-800 text-white' : 'bg-[#faf9f6] text-[#8c8880]'
              }`}>
                {currentLevel}
              </span>
            </button>

            <button
              onClick={() => handleNav('kanji-list')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'kanji-list'
                  ? 'bg-[#1a1918] text-white shadow-xs'
                  : 'text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Languages className="w-4 h-4 text-orange-500" />
                <span>Kanji</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                currentView === 'kanji-list' ? 'bg-neutral-800 text-white' : 'bg-[#faf9f6] text-[#8c8880]'
              }`}>
                {currentLevel}
              </span>
            </button>

            <button
              onClick={() => handleNav('patterns')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'patterns'
                  ? 'bg-[#1a1918] text-white shadow-xs'
                  : 'text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918]'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookmarkCheck className="w-4 h-4 text-purple-600" />
                <span>Patterns</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                currentView === 'patterns' ? 'bg-neutral-800 text-white' : 'bg-[#faf9f6] text-[#8c8880]'
              }`}>
                {currentLevel}
              </span>
            </button>

            <button
              onClick={() => handleNav('reading')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'reading'
                  ? 'bg-[#1a1918] text-white shadow-xs'
                  : 'text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918]'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Reading</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                currentView === 'reading' ? 'bg-neutral-800 text-white' : 'bg-[#faf9f6] text-[#8c8880]'
              }`}>
                読解
              </span>
            </button>

            <button
              onClick={() => handleNav('listening')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'listening'
                  ? 'bg-[#1a1918] text-white shadow-xs'
                  : 'text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Headphones className="w-4 h-4 text-blue-500" />
                <span>Listening</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                currentView === 'listening' ? 'bg-neutral-800 text-white' : 'bg-[#faf9f6] text-[#8c8880]'
              }`}>
                聴解
              </span>
            </button>

            <button
              onClick={() => handleNav('tests')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'tests'
                  ? 'bg-[#1a1918] text-white shadow-xs'
                  : 'text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918]'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckSquare className="w-4 h-4 text-amber-500" />
                <span>Tests</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                currentView === 'tests' ? 'bg-neutral-800 text-white' : 'bg-[#faf9f6] text-[#8c8880]'
              }`}>
                試験
              </span>
            </button>
          </div>
        </div>

        {/* 4. PERSONAL */}
        <div>
          <div className="px-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880]">
              Personal
            </span>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleNav('favorites')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'favorites'
                  ? 'bg-[#1a1918] text-white shadow-xs'
                  : 'text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span>Favorites</span>
              </div>
              {favoriteCount > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentView === 'favorites' ? 'bg-amber-400 text-black' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {favoriteCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('difficult')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'difficult'
                  ? 'bg-[#1a1918] text-white shadow-xs'
                  : 'text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918]'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Difficult Words</span>
              </div>
              {difficultCount > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentView === 'difficult' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {difficultCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('notes')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'notes'
                  ? 'bg-[#1a1918] text-white shadow-xs'
                  : 'text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918]'
              }`}
            >
              <div className="flex items-center gap-3">
                <StickyNote className="w-4 h-4 text-emerald-500" />
                <span>Notes</span>
              </div>
              {notesCount > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentView === 'notes' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {notesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('statistics')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'statistics'
                  ? 'bg-[#1a1918] text-white shadow-xs'
                  : 'text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918]'
              }`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span>Progress</span>
              </div>
            </button>
          </div>
        </div>

        {/* ADMIN PANEL (for role === 'admin') */}
        {user?.role === 'admin' && (
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#d93829]">
                Admin Control
              </span>
              <span className="text-[9px] font-mono font-bold bg-red-50 text-[#d93829] px-1.5 py-0.5 rounded border border-red-100">
                Atlas
              </span>
            </div>
            <button
              onClick={() => handleNav('admin')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-[#d93829] text-white shadow-xs'
                  : 'text-[#1a1918] bg-[#fef2f2] hover:bg-[#fee2e2]'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-[#d93829]" />
                <span>Admin Panel</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>
        )}

        {/* 5. ACCOUNT */}
        <div>
          <div className="px-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880]">
              Account
            </span>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => {
                onOpenProfile();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold text-[#6e6b66] hover:bg-[#faf9f6] hover:text-[#1a1918] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <UserIcon className="w-4 h-4 text-[#8c8880]" />
                <span>Profile</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#8c8880]" />
            </button>

            <button
              onClick={() => {
                onLogout();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

      </div>

      {/* Footer User Info Card */}
      {user && (
        <div className="p-4 border-t border-[#eeece6] bg-[#faf9f6]/70">
          <div 
            onClick={() => {
              onOpenProfile();
              onCloseMobile();
            }}
            className="flex items-center gap-3 cursor-pointer p-2 rounded-2xl hover:bg-white transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-[#d93829]/10 border border-red-200 text-[#d93829] flex items-center justify-center font-bold text-sm shrink-0">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-[#1a1918] truncate">
                {user.fullName}
              </div>
              <div className="text-[11px] text-[#8c8880] truncate">
                {user.email}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  return (
    <>
      {/* Desktop Sticky Left Sidebar (hidden on small/medium screens) */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
          />

          {/* Drawer panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-pop-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
