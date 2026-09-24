import React, { useState, useEffect } from 'react';
import { VocabularyItem, WordType, VocabSource } from '../types/vocab';
import { X, Check, BookOpen, Star, Tag } from 'lucide-react';
import { extractAcceptedMeanings } from '../utils/answerChecker';

import { ChapterItem } from '../types/chapter';

interface AddVocabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vocab: Omit<VocabularyItem, 'id' | 'createdAt' | 'practiceCount' | 'correctCount' | 'wrongCount' | 'consecutiveCorrect' | 'difficulty' | 'learningStatus'>, existingId?: string) => Promise<void>;
  editItem?: VocabularyItem | null;
  defaultChapter?: number;
  chapters?: ChapterItem[];
}

const WORD_TYPES: WordType[] = [
  'Noun',
  'Verb',
  'Adjective',
  'Adverb',
  'Particle',
  'Expression',
  'Counter',
  'Other'
];

const EXTRA_CATEGORIES = [
  'Daily Life',
  'Conversation',
  'Travel',
  'General',
  'Custom'
];

export const AddVocabModal: React.FC<AddVocabModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editItem,
  defaultChapter = 1,
  chapters = []
}) => {
  const [source, setSource] = useState<VocabSource>('Textbook');
  const [chapter, setChapter] = useState<number>(defaultChapter);
  const [extraCategory, setExtraCategory] = useState<string>('Daily Life');
  const [type, setType] = useState<WordType>('Noun');
  const [japanese, setJapanese] = useState('');
  const [reading, setReading] = useState('');
  const [romaji, setRomaji] = useState('');
  const [english, setEnglish] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prefill when editing
  useEffect(() => {
    if (editItem) {
      setSource(editItem.source || (editItem.chapter ? 'Textbook' : 'Extra'));
      setChapter(editItem.chapter || defaultChapter);
      setExtraCategory(editItem.category || 'Daily Life');
      setType(editItem.type || 'Noun');
      setJapanese(editItem.japanese || '');
      setReading(editItem.reading || '');
      setRomaji(editItem.romaji || '');
      setEnglish(editItem.english || '');
      setNotes(editItem.notes || '');
      setError('');
    } else {
      resetForm();
    }
  }, [editItem, isOpen, defaultChapter]);

  const resetForm = () => {
    setSource(defaultChapter ? 'Textbook' : 'Extra');
    setChapter(defaultChapter || 1);
    setExtraCategory('Daily Life');
    setType('Noun');
    setJapanese('');
    setReading('');
    setRomaji('');
    setEnglish('');
    setNotes('');
    setError('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (andAddAnother: boolean = false) => {
    if (!japanese.trim()) {
      setError('Please enter a Japanese word or phrase.');
      return;
    }
    if (!english.trim()) {
      setError('Please enter the English meaning.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const accepted = extractAcceptedMeanings(english);
      const categoryTag = source === 'Textbook' ? `Chapter ${chapter}` : extraCategory;
      const categories = [categoryTag, type];

      await onSave(
        {
          japanese: japanese.trim(),
          reading: reading.trim() || japanese.trim(),
          romaji: romaji.trim() || undefined,
          english: english.trim(),
          type,
          source,
          chapter: source === 'Textbook' ? Number(chapter) : undefined,
          category: source === 'Extra' ? extraCategory : undefined,
          acceptedMeanings: accepted,
          categories,
          notes: notes.trim() || undefined
        },
        editItem?.id
      );

      if (andAddAnother && !editItem) {
        setJapanese('');
        setReading('');
        setRomaji('');
        setEnglish('');
        setNotes('');
        setIsSubmitting(false);
      } else {
        setIsSubmitting(false);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save vocabulary.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-pop-in">
      <div 
        className="bg-white rounded-3xl border border-[#eeece6] shadow-xl max-w-xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#eeece6]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#fef2f2] text-[#d93829] flex items-center justify-center font-bold">
              {editItem ? '変' : '新'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a1918]">
                {editItem ? 'Edit Vocabulary Word' : 'Add Vocabulary Word'}
              </h2>
              <p className="text-xs text-[#8c8880]">
                {editItem ? 'Update details in your local database' : 'Assign to standard chapter or extra deck'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Source & Chapter Selection */}
          <div className="p-3.5 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-[#1a1918] cursor-pointer">
                <input
                  type="radio"
                  name="vocabSource"
                  checked={source === 'Textbook'}
                  onChange={() => setSource('Textbook')}
                  className="accent-[#d93829]"
                />
                <BookOpen className="w-3.5 h-3.5 text-[#d93829]" />
                <span>Standard Chapter</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-[#1a1918] cursor-pointer">
                <input
                  type="radio"
                  name="vocabSource"
                  checked={source === 'Extra'}
                  onChange={() => setSource('Extra')}
                  className="accent-[#d93829]"
                />
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Extra Vocabulary</span>
              </label>
            </div>

            {source === 'Textbook' ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-[#6e6b66] shrink-0">Select Chapter:</span>
                <select
                  value={chapter}
                  onChange={(e) => setChapter(Number(e.target.value))}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[#d4d0c8] bg-white text-xs font-bold text-[#1a1918] focus:border-[#d93829] outline-hidden cursor-pointer"
                >
                  {(chapters.length > 0
                    ? chapters
                    : Array.from({ length: 24 }, (_, i) => ({ id: `ch_${i+1}`, chapterNumber: i + 1, title: `Chapter ${i + 1}`, japaneseTitle: `第${i + 1}課`, createdAt: 0 }))
                  ).map(ch => (
                    <option key={ch.chapterNumber} value={ch.chapterNumber}>
                      {ch.title} ({ch.japaneseTitle || `第${ch.chapterNumber}課`})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-[#6e6b66] shrink-0">Category:</span>
                <select
                  value={extraCategory}
                  onChange={(e) => setExtraCategory(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[#d4d0c8] bg-white text-xs font-bold text-[#1a1918] focus:border-[#d93829] outline-hidden cursor-pointer"
                >
                  {EXTRA_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Word Type Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1.5">
              Category / Word Type <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {WORD_TYPES.map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    type === t
                      ? 'bg-[#d93829] text-white shadow-xs'
                      : 'bg-[#faf9f6] text-[#6e6b66] border border-[#eeece6] hover:border-[#d4d0c8]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Japanese Word */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
              Japanese Word / Phrase <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={japanese}
              onChange={(e) => setJapanese(e.target.value)}
              placeholder="e.g. おおきい, たべます, ねこ"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-[#d4d0c8] focus:border-[#d93829] focus:ring-2 focus:ring-red-100 outline-hidden font-japanese text-xl text-[#1a1918] placeholder:text-neutral-300"
            />
          </div>

          {/* Reading (Kana) & Romaji */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
                Reading (Kana)
              </label>
              <input
                type="text"
                value={reading}
                onChange={(e) => setReading(e.target.value)}
                placeholder="e.g. おおきい, たべる"
                className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] text-xs focus:border-[#d93829] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
                Romaji <span className="text-[#8c8880] font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={romaji}
                onChange={(e) => setRomaji(e.target.value)}
                placeholder="e.g. ookii (optional)"
                className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] text-xs font-mono focus:border-[#d93829] outline-hidden"
              />
            </div>
          </div>

          {/* English Meaning */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
              English Meaning(s) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="e.g. Big, large (separate multiple with commas)"
              className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] text-xs focus:border-[#d93829] outline-hidden text-[#1a1918]"
            />
            <p className="text-[11px] text-[#8c8880] mt-1">
              Flexible evaluation accepts synonyms or verb forms during quizzes.
            </p>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
              Notes or Example <span className="text-[#8c8880] font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. I-adjective. Negative: 大きくない"
              className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] text-xs focus:border-[#d93829] outline-hidden text-[#1a1918]"
            />
          </div>

          {/* Live Preview Card */}
          <div className="bg-[#faf9f6] p-4 rounded-2xl border border-[#eeece6]">
            <div className="flex items-center justify-between text-[11px] text-[#8c8880] font-bold uppercase mb-2">
              <span>Preview Card</span>
              <span className="text-[#d93829] bg-[#fef2f2] px-2 py-0.5 rounded">
                {source === 'Textbook' ? `Chapter ${chapter}` : extraCategory} • {type}
              </span>
            </div>
            <div className="text-xl font-bold font-japanese text-[#1a1918]">
              {japanese.trim() || 'おおきい'}
            </div>
            <div className="text-xs text-[#8c8880] font-mono mt-0.5">
              {reading.trim() || japanese.trim() || 'おおきい'}{romaji.trim() ? ` (${romaji.trim()})` : ''}
            </div>
            <div className="text-sm font-semibold text-[#1a1918] mt-1">
              {english.trim() || 'Big, large'}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-[#eeece6] bg-[#faf9f6] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#d4d0c8] text-xs font-semibold text-[#6e6b66] hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!editItem && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 rounded-xl bg-white border border-[#d4d0c8] text-xs font-semibold text-[#1a1918] hover:bg-neutral-50 shadow-xs transition-colors cursor-pointer"
              >
                Save & Add Another
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-semibold shadow-xs shadow-red-200 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editItem ? 'Update Word' : 'Save Vocabulary'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
