import React, { useState, useEffect } from 'react';
import { DisplayVocabularyItem, DisplayKanjiItem, UserVocabData, UserKanjiData } from '../types/user';
import { 
  X, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Star, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3, 
  BookOpen,
  Info
} from 'lucide-react';

interface PersonalCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { type: 'vocab'; data: DisplayVocabularyItem } | { type: 'kanji'; data: DisplayKanjiItem } | null;
  onSaveVocab: (vocabId: string, updates: Partial<UserVocabData>) => Promise<void>;
  onSaveKanji: (kanjiId: string, updates: Partial<UserKanjiData>) => Promise<void>;
  onResetVocab: (vocabId: string) => Promise<void>;
  onResetKanji: (kanjiId: string) => Promise<void>;
}

export const PersonalCustomizationModal: React.FC<PersonalCustomizationModalProps> = ({
  isOpen,
  onClose,
  item,
  onSaveVocab,
  onSaveKanji,
  onResetVocab,
  onResetKanji
}) => {
  const [customMeaning, setCustomMeaning] = useState('');
  const [customReading, setCustomReading] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLearned, setIsLearned] = useState(false);
  const [isDifficult, setIsDifficult] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsSaved(false);
    setErrorMessage(null);
    setIsSaving(false);
    if (item) {
      if (item.type === 'vocab') {
        setCustomMeaning(item.data.hasPersonalCustomization && item.data.effectiveMeaning !== item.data.english ? item.data.effectiveMeaning : '');
        setCustomReading(item.data.hasPersonalCustomization && item.data.effectiveReading !== item.data.reading ? item.data.effectiveReading : '');
        setPersonalNote(item.data.personalNote && item.data.personalNote !== item.data.notes ? item.data.personalNote : '');
        setIsFavorite(item.data.isFavorite);
        setIsLearned(item.data.isLearned);
        setIsDifficult(item.data.isDifficult);
      } else {
        setCustomMeaning(item.data.hasPersonalCustomization && item.data.effectiveMeaning !== item.data.meaning ? item.data.effectiveMeaning : '');
        setCustomReading('');
        setPersonalNote(item.data.personalNote && item.data.personalNote !== item.data.notes ? item.data.personalNote : '');
        setIsFavorite(item.data.isFavorite);
        setIsLearned(item.data.isMastered);
        setIsDifficult(item.data.isDifficult);
      }
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const isVocab = item.type === 'vocab';
  const defaultTitle = isVocab ? (item.data as DisplayVocabularyItem).japanese : (item.data as DisplayKanjiItem).kanji;
  const defaultSub = isVocab ? (item.data as DisplayVocabularyItem).reading : ((item.data as DisplayKanjiItem).onyomi || (item.data as DisplayKanjiItem).kunyomi || '');
  const defaultOriginalMeaning = isVocab ? (item.data as DisplayVocabularyItem).english : (item.data as DisplayKanjiItem).meaning;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isVocab) {
        await onSaveVocab(item.data.id, {
          customMeaning: customMeaning.trim() || undefined,
          customReading: customReading.trim() || undefined,
          personalNote: personalNote.trim() || undefined,
          isFavorite,
          isLearned,
          isDifficult
        });
      } else {
        await onSaveKanji(item.data.id, {
          customMeaning: customMeaning.trim() || undefined,
          personalNote: personalNote.trim() || undefined,
          isFavorite,
          isMastered: isLearned,
          isDifficult
        });
      }
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => {
        onClose();
      }, 650);
    } catch (err: any) {
      console.error('Failed to save personal customization:', err);
      setIsSaving(false);
      setErrorMessage(err?.message || 'Unable to save customization. Please try again.');
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isVocab) {
        await onResetVocab(item.data.id);
      } else {
        await onResetKanji(item.data.id);
      }
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to reset customization:', err);
      setIsSaving(false);
      setErrorMessage(err?.message || 'Unable to reset customization. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl border border-[#eeece6] shadow-2xl max-w-lg w-full p-6 sm:p-8 z-10 animate-pop-in space-y-6">
        
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#faf9f6] border border-[#eeece6] flex items-center justify-center text-2xl font-bold font-japanese text-[#1a1918]">
              {defaultTitle}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1a1918]">
                  Personal Customization
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#d93829] border border-red-100">
                  Private to You
                </span>
              </div>
              <p className="text-xs text-[#8c8880] mt-0.5">
                {defaultSub ? `${defaultSub} • ` : ''}Default: <span className="font-semibold text-[#1a1918]">{defaultOriginalMeaning}</span>
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

        {/* Informational Banner */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-800 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Edits made here modify <strong>only your personal view</strong>. The master global dictionary is never changed.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Status Quick Toggles */}
          <div>
            <label className="block text-xs font-bold text-[#6e6b66] uppercase tracking-wider mb-2">
              Status Flags
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isFavorite
                    ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-100'
                    : 'bg-[#faf9f6] text-[#6e6b66] border-[#eeece6] hover:border-[#d4d0c8]'
                }`}
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-[#8c8880]'}`} />
                <span>Favorite</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLearned(!isLearned)}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isLearned
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-100'
                    : 'bg-[#faf9f6] text-[#6e6b66] border-[#eeece6] hover:border-[#d4d0c8]'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${isLearned ? 'text-emerald-600' : 'text-[#8c8880]'}`} />
                <span>{isVocab ? 'Learned' : 'Mastered'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDifficult(!isDifficult)}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isDifficult
                    ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-100'
                    : 'bg-[#faf9f6] text-[#6e6b66] border-[#eeece6] hover:border-[#d4d0c8]'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 ${isDifficult ? 'text-rose-600' : 'text-[#8c8880]'}`} />
                <span>Difficult</span>
              </button>
            </div>
          </div>

          {/* Custom Meaning */}
          <div>
            <label className="block text-xs font-bold text-[#6e6b66] uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Personal Meaning</span>
              <span className="text-[11px] text-[#8c8880] lowercase font-normal">(leave blank for default)</span>
            </label>
            <input
              type="text"
              value={customMeaning}
              onChange={(e) => setCustomMeaning(e.target.value)}
              placeholder={defaultOriginalMeaning}
              className="block w-full px-3.5 py-2.5 text-sm bg-[#faf9f6] border border-[#eeece6] rounded-2xl text-[#1a1918] placeholder-[#8c8880] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d93829]/20 focus:border-[#d93829] transition-all"
            />
          </div>

          {/* Custom Reading (Vocab only) */}
          {isVocab && (
            <div>
              <label className="block text-xs font-bold text-[#6e6b66] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Personal Reading (Kana)</span>
                <span className="text-[11px] text-[#8c8880] lowercase font-normal">(optional override)</span>
              </label>
              <input
                type="text"
                value={customReading}
                onChange={(e) => setCustomReading(e.target.value)}
                placeholder={(item.data as DisplayVocabularyItem).reading}
                className="block w-full px-3.5 py-2.5 text-sm bg-[#faf9f6] border border-[#eeece6] rounded-2xl text-[#1a1918] placeholder-[#8c8880] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d93829]/20 focus:border-[#d93829] transition-all"
              />
            </div>
          )}

          {/* Personal Study Note */}
          <div>
            <label className="block text-xs font-bold text-[#6e6b66] uppercase tracking-wider mb-1.5">
              Personal Study Note / Mnemonic
            </label>
            <textarea
              rows={3}
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="e.g. Remember: Used when receiving from an elder or superior..."
              className="block w-full px-3.5 py-2.5 text-sm bg-[#faf9f6] border border-[#eeece6] rounded-2xl text-[#1a1918] placeholder-[#8c8880] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d93829]/20 focus:border-[#d93829] transition-all resize-none"
            />
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Confirmation */}
          {isSaved && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">✓ Customization saved successfully.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-[#f2f0ea]">
            {item.data.hasPersonalCustomization ? (
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving || isSaved}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
                title="Remove personal custom edits and restore global master"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6e6b66] hover:bg-[#faf9f6] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isSaved}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-75 ${
                  isSaved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#d93829] hover:bg-[#b92a1d] text-white'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isSaved ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Saved ✓</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Customization</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
