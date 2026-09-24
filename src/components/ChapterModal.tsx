import React, { useState, useEffect } from 'react';
import { ChapterItem } from '../types/chapter';
import { X, BookOpen, Layers } from 'lucide-react';

interface ChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chapterData: Omit<ChapterItem, 'id' | 'createdAt'>, existingId?: string, oldChapterNumber?: number) => Promise<void>;
  editChapter?: ChapterItem | null;
  existingChapters: ChapterItem[];
  type?: 'vocab' | 'kanji';
}

export const ChapterModal: React.FC<ChapterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editChapter,
  existingChapters,
  type = 'vocab'
}) => {
  const isEditing = Boolean(editChapter);
  const isKanji = type === 'kanji';

  // Determine next suggested chapter number if adding
  const nextSuggestedNumber = React.useMemo(() => {
    if (existingChapters.length === 0) return 1;
    const maxNum = Math.max(...existingChapters.map(c => c.chapterNumber), 0);
    return maxNum + 1;
  }, [existingChapters]);

  const [chapterNumber, setChapterNumber] = useState<number>(nextSuggestedNumber);
  const [title, setTitle] = useState<string>('');
  const [japaneseTitle, setJapaneseTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editChapter) {
      setChapterNumber(editChapter.chapterNumber);
      setTitle(editChapter.title);
      setJapaneseTitle(editChapter.japaneseTitle || '');
      setDescription(editChapter.description || '');
    } else {
      setChapterNumber(nextSuggestedNumber);
      setTitle(`Chapter ${nextSuggestedNumber}`);
      setJapaneseTitle(`第${nextSuggestedNumber}課`);
      setDescription('');
    }
    setError('');
  }, [editChapter, nextSuggestedNumber, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterNumber || chapterNumber < 1) {
      setError('Please provide a valid chapter number greater than 0.');
      return;
    }
    if (!title.trim()) {
      setError('Chapter Name is required.');
      return;
    }

    // Check duplicate chapter number if adding or changing chapter number
    const isDuplicate = existingChapters.some(c => 
      c.chapterNumber === Number(chapterNumber) && (!editChapter || c.id !== editChapter.id)
    );
    if (isDuplicate) {
      setError(`Chapter ${chapterNumber} already exists. Please choose a different number.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(
        {
          chapterNumber: Number(chapterNumber),
          title: title.trim(),
          japaneseTitle: japaneseTitle.trim() || `第${chapterNumber}課`,
          description: description.trim() || undefined
        },
        editChapter?.id,
        editChapter?.chapterNumber
      );
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save chapter.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-pop-in">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#eeece6] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eeece6] pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isKanji ? 'bg-orange-50 text-[#ea580c]' : 'bg-red-50 text-[#d93829]'
            }`}>
              {isKanji ? (
                <span className="font-japanese font-bold text-base">漢</span>
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a1918]">
                {isEditing ? `Edit ${isKanji ? 'Kanji' : 'Vocabulary'} Chapter` : `Add New ${isKanji ? 'Kanji' : 'Vocabulary'} Chapter`}
              </h2>
              <p className="text-xs text-[#8c8880]">
                {isKanji ? 'Kanji Chapter organization' : 'Vocabulary Chapter organization'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8c8880] hover:text-[#1a1918] hover:bg-[#f7f6f2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1a1918] mb-1">
                Chapter Number *
              </label>
              <input
                type="number"
                min="1"
                value={chapterNumber}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setChapterNumber(val);
                  if (!isEditing) {
                    setTitle(`Chapter ${val}`);
                    setJapaneseTitle(`第${val}課`);
                  }
                }}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] bg-[#faf9f6] text-sm font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#d93829]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1a1918] mb-1">
                Japanese Name
              </label>
              <input
                type="text"
                value={japaneseTitle}
                onChange={(e) => setJapaneseTitle(e.target.value)}
                placeholder="第25課"
                className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] bg-[#faf9f6] text-sm font-japanese focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#d93829]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1918] mb-1">
              Chapter Name / Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 25 or Daily Routines"
              required
              className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] bg-[#faf9f6] text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#d93829]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1918] mb-1">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Grammar points, Verbs & particles"
              className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] bg-[#faf9f6] text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#d93829]"
            />
          </div>

          {/* Card Preview */}
          <div className="pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c8880] block mb-2">
              Preview Card
            </span>
            <div className="p-4 rounded-2xl border border-[#eeece6] bg-white shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                  isKanji ? 'bg-orange-50 text-[#ea580c]' : 'bg-[#fef2f2] text-[#d93829]'
                }`}>
                  CH {chapterNumber || 1}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">0 mastered</span>
              </div>
              <h3 className="text-sm font-bold text-[#1a1918] font-japanese">
                {japaneseTitle || `第${chapterNumber || 1}課`}
              </h3>
              <p className="text-[11px] text-[#8c8880] mt-0.5">{title || `Chapter ${chapterNumber || 1}`}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#eeece6] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#d4d0c8] text-xs font-semibold text-[#6e6b66] hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                isKanji 
                  ? 'bg-[#ea580c] hover:bg-[#c2410c] shadow-orange-200' 
                  : 'bg-[#d93829] hover:bg-[#b92a1d] shadow-red-200'
              }`}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Chapter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
