import React, { useState } from 'react';
import { UserSession } from '../types/user';
import { JLPTLevel } from '../types/kanji';
import { api } from '../services/api';
import { authService } from '../services/authService';
import { 
  X, 
  User as UserIcon, 
  Mail, 
  Award, 
  Calendar, 
  LogOut, 
  CheckCircle2, 
  Sparkles,
  Shield,
  KeyRound,
  AlertCircle
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession | null;
  currentLevel: JLPTLevel;
  onSelectLevel: (level: JLPTLevel) => void;
  onLogout: () => void;
  onNavigateAdmin?: () => void;
  onUserUpdated?: (user: UserSession) => void;
  totalVocabCount: number;
  totalKanjiCount: number;
  totalSessionsCount: number;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  currentLevel,
  onSelectLevel,
  onLogout,
  onNavigateAdmin,
  onUserUpdated,
  totalVocabCount,
  totalKanjiCount,
  totalSessionsCount
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl border border-[#eeece6] shadow-2xl max-w-md w-full p-6 sm:p-8 z-10 animate-pop-in space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#d93829] flex items-center justify-center text-white text-xl font-bold font-serif-jp shadow-sm">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#1a1918] leading-snug">
                  {user.fullName}
                </h3>
                {user.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d93829] text-white font-mono uppercase">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8c8880] flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span>{user.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8c8880] hover:text-[#1a1918] hover:bg-[#faf9f6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* JLPT Target Level Switcher */}
        <div className="bg-[#faf9f6] rounded-2xl p-4 border border-[#eeece6] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#6e6b66] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#d93829]" />
              <span>Target JLPT Level</span>
            </span>
            <span className="text-[11px] text-[#8c8880] font-normal lowercase">saved to account</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['N5', 'N4', 'N3'] as JLPTLevel[]).map((lvl) => {
              const isSelected = currentLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => onSelectLevel(lvl)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#d93829] text-white border-[#d93829] shadow-xs'
                      : 'bg-white text-[#6e6b66] border-[#eeece6] hover:border-[#d4d0c8]'
                  }`}
                >
                  {lvl} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[#8c8880] italic">
            Switching your target level updates all dashboard chapters, vocabulary lists, and practice tests.
          </p>
        </div>

        {/* Study Statistics Overview */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-[#faf9f6] border border-[#eeece6]">
            <div className="text-base font-bold text-[#1a1918]">{totalVocabCount}</div>
            <div className="text-[10px] text-[#8c8880] uppercase font-semibold mt-0.5">Vocab Words</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#faf9f6] border border-[#eeece6]">
            <div className="text-base font-bold text-[#ea580c]">{totalKanjiCount}</div>
            <div className="text-[10px] text-[#8c8880] uppercase font-semibold mt-0.5">Kanji</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#faf9f6] border border-[#eeece6]">
            <div className="text-base font-bold text-emerald-600">{totalSessionsCount}</div>
            <div className="text-[10px] text-[#8c8880] uppercase font-semibold mt-0.5">Tests Taken</div>
          </div>
        </div>

        {/* Admin Quick Link */}
        {user.role === 'admin' && onNavigateAdmin && (
          <button
            onClick={() => {
              onNavigateAdmin();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span>Open Admin Panel & Atlas Tools</span>
          </button>
        )}

        {/* Account Info Security Note */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-600 text-xs flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
          <span>
            Personal customizations (custom meanings, personal notes, and favorites) are private to your account.
          </span>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#f2f0ea]">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#1a1918] text-white hover:bg-neutral-800 transition-all cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
