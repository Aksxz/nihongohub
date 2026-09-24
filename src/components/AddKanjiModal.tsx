import React, { useState, useEffect } from 'react';
import { KanjiItem, JLPTLevel, KanjiSource, KanjiExampleWord } from '../types/kanji';
import { X, Check, BookOpen, Star, Volume2 } from 'lucide-react';
import { soundEffects } from '../utils/audio';

import { ChapterItem } from '../types/chapter';

interface AddKanjiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (kanji: Omit<KanjiItem, 'id' | 'createdAt' | 'practiceCount' | 'correctCount' | 'wrongCount' | 'consecutiveCorrect' | 'difficulty' | 'learningStatus'>, existingId?: string) => Promise<void>;
  editItem?: KanjiItem | null;
  defaultChapter?: number;
  kanjiChapters?: ChapterItem[];
}

const JLPT_LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1', 'Other'];

export const AddKanjiModal: React.FC<AddKanjiModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editItem,
  defaultChapter = 1,
  kanjiChapters = []
}) => {
  const [source, setSource] = useState<KanjiSource>('Textbook');
  const [chapter, setChapter] = useState<number>(defaultChapter);
  const [category, setCategory] = useState<string>('General');
  const [kanji, setKanji] = useState('');
  const [meaning, setMeaning] = useState('');
  const [onyomi, setOnyomi] = useState('');
  const [kunyomi, setKunyomi] = useState('');
  const [romaji, setRomaji] = useState('');
  const [exampleWordsRaw, setExampleWordsRaw] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [jlpt, setJlpt] = useState<JLPTLevel>('N5');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prefill when editing
  useEffect(() => {
    if (editItem) {
      setSource(editItem.source || (editItem.chapter ? 'Textbook' : 'Extra'));
      setChapter(editItem.chapter || defaultChapter);
      setCategory(editItem.category || 'General');
      setKanji(editItem.kanji || '');
      setMeaning(editItem.meaning || '');
      setOnyomi(editItem.onyomi || '');
      setKunyomi(editItem.kunyomi || '');
      setRomaji(editItem.romaji || '');
      
      const wordsText = (editItem.exampleWords || [])
        .map(w => `${w.word}${w.reading ? ` — ${w.reading}` : ''} — ${w.meaning}`)
        .join('\n');
      setExampleWordsRaw(wordsText);

      setExampleSentence(editItem.exampleSentence || '');
      setJlpt(editItem.jlpt || 'N5');
      setNotes(editItem.notes || '');
      setError('');
    } else {
      resetForm();
    }
  }, [editItem, isOpen, defaultChapter]);

  const resetForm = () => {
    setSource(defaultChapter ? 'Textbook' : 'Extra');
    setChapter(defaultChapter || 1);
    setCategory('General');
    setKanji('');
    setMeaning('');
    setOnyomi('');
    setKunyomi('');
    setRomaji('');
    setExampleWordsRaw('');
    setExampleSentence('');
    setJlpt('N5');
    setNotes('');
    setError('');
  };

  if (!isOpen) return null;

  const parseExampleWords = (raw: string): KanjiExampleWord[] => {
    if (!raw.trim()) return [];
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const result: KanjiExampleWord[] = [];

    for (const line of lines) {
      // Split by dashes, em-dashes, or commas
      const parts = line.split(/[—–-]/).map(p => p.trim());
      if (parts.length >= 3) {
        result.push({ word: parts[0], reading: parts[1], meaning: parts[2] });
      } else if (parts.length === 2) {
        result.push({ word: parts[0], meaning: parts[1] });
      } else if (parts.length === 1 && parts[0]) {
        result.push({ word: parts[0], meaning: '' });
      }
    }
    return result;
  };

  const handleSubmit = async (andAddAnother: boolean = false) => {
    if (!kanji.trim()) {
      setError('Please enter a Kanji character.');
      return;
    }
    if (!meaning.trim()) {
      setError('Please enter the meaning.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const accepted = meaning
        .split(/[,/、]/)
        .map(m => m.trim().toLowerCase())
        .filter(Boolean);

      const parsedExamples = parseExampleWords(exampleWordsRaw);

      await onSave(
        {
          kanji: kanji.trim(),
          meaning: meaning.trim(),
          acceptedMeanings: accepted.length > 0 ? accepted : [meaning.trim().toLowerCase()],
          onyomi: onyomi.trim() || undefined,
          kunyomi: kunyomi.trim() || undefined,
          romaji: romaji.trim() || undefined,
          exampleWords: parsedExamples.length > 0 ? parsedExamples : undefined,
          exampleSentence: exampleSentence.trim() || undefined,
          jlpt: jlpt || undefined,
          source,
          chapter: source === 'Textbook' ? Number(chapter) : undefined,
          category: source === 'Extra' ? category.trim() : undefined,
          notes: notes.trim() || undefined
        },
        editItem?.id
      );

      if (andAddAnother && !editItem) {
        setKanji('');
        setMeaning('');
        setOnyomi('');
        setKunyomi('');
        setRomaji('');
        setExampleWordsRaw('');
        setExampleSentence('');
        setNotes('');
        setIsSubmitting(false);
      } else {
        setIsSubmitting(false);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Kanji.');
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
            <div className="w-9 h-9 rounded-xl bg-[#fff7ed] text-[#ea580c] flex items-center justify-center font-bold text-lg font-japanese">
              {editItem ? '変' : '漢'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a1918]">
                {editItem ? 'Edit Kanji' : 'Add New Kanji'}
              </h2>
              <p className="text-xs text-[#8c8880]">
                Assign to standard chapter or extra kanji bank
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
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-[#1a1918] cursor-pointer">
                <input
                  type="radio"
                  name="kanjiSource"
                  checked={source === 'Textbook'}
                  onChange={() => setSource('Textbook')}
                  className="accent-[#ea580c]"
                />
                <BookOpen className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>Standard Chapter</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-[#1a1918] cursor-pointer">
                <input
                  type="radio"
                  name="kanjiSource"
                  checked={source === 'Extra'}
                  onChange={() => setSource('Extra')}
                  className="accent-[#ea580c]"
                />
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Extra Kanji</span>
              </label>
            </div>

            {source === 'Textbook' ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-[#6e6b66] shrink-0">Assign to Chapter:</span>
                <select
                  value={chapter}
                  onChange={(e) => setChapter(Number(e.target.value))}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[#d4d0c8] bg-white text-xs font-bold text-[#1a1918] focus:border-[#ea580c] outline-hidden cursor-pointer"
                >
                  {(kanjiChapters.length > 0
                    ? kanjiChapters
                    : Array.from({ length: 24 }, (_, i) => ({ id: `kch_${i+1}`, chapterNumber: i + 1, title: `Chapter ${i + 1}`, japaneseTitle: `第${i + 1}課`, createdAt: 0 }))
                  ).map(ch => (
                    <option key={ch.chapterNumber} value={ch.chapterNumber}>
                      {ch.title} ({ch.japaneseTitle || `第${ch.chapterNumber}課`})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-[#6e6b66] shrink-0">Category / Topic:</span>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Daily Life, Nature, Radicals"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[#d4d0c8] bg-white text-xs text-[#1a1918] focus:border-[#ea580c] outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Kanji Character & Meaning */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
                Kanji <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={kanji}
                onChange={(e) => setKanji(e.target.value)}
                placeholder="e.g. 学"
                maxLength={4}
                autoFocus
                className="w-full px-4 py-2 rounded-xl border border-[#d4d0c8] focus:border-[#ea580c] focus:ring-2 focus:ring-orange-100 outline-hidden font-japanese text-3xl font-bold text-center text-[#1a1918]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
                Meaning <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="e.g. Study, Learning"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d4d0c8] text-sm focus:border-[#ea580c] outline-hidden text-[#1a1918]"
              />
              <p className="text-[11px] text-[#8c8880] mt-1">
                Separate synonyms with commas (e.g. study, learning).
              </p>
            </div>
          </div>

          {/* On'yomi & Kun'yomi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
                On'yomi (音読み) <span className="text-[#8c8880] font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={onyomi}
                onChange={(e) => setOnyomi(e.target.value)}
                placeholder="e.g. ガク, ガッ"
                className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] text-xs font-japanese focus:border-[#ea580c] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
                Kun'yomi (訓読み) <span className="text-[#8c8880] font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={kunyomi}
                onChange={(e) => setKunyomi(e.target.value)}
                placeholder="e.g. まな・ぶ"
                className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] text-xs font-japanese focus:border-[#ea580c] outline-hidden"
              />
            </div>
          </div>

          {/* Romaji & JLPT Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
                Romaji <span className="text-[#8c8880] font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={romaji}
                onChange={(e) => setRomaji(e.target.value)}
                placeholder="e.g. gaku, manabu"
                className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] text-xs font-mono focus:border-[#ea580c] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
                JLPT Level <span className="text-[#8c8880] font-normal normal-case">(optional)</span>
              </label>
              <div className="flex gap-1">
                {JLPT_LEVELS.map(lvl => (
                  <button
                    type="button"
                    key={lvl}
                    onClick={() => setJlpt(lvl)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      jlpt === lvl
                        ? 'bg-[#ea580c] text-white shadow-xs'
                        : 'bg-[#faf9f6] text-[#6e6b66] border border-[#eeece6] hover:border-[#d4d0c8]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Example Words */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
              Example Words <span className="text-[#8c8880] font-normal normal-case">(optional, one per line)</span>
            </label>
            <textarea
              rows={2}
              value={exampleWordsRaw}
              onChange={(e) => setExampleWordsRaw(e.target.value)}
              placeholder="学生 — がくせい — student&#10;学校 — がっこう — school"
              className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] text-xs font-japanese focus:border-[#ea580c] outline-hidden"
            />
            <p className="text-[11px] text-[#8c8880] mt-0.5">
              Format: <code>Word — Reading — Meaning</code>
            </p>
          </div>

          {/* Example Sentence */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
              Example Sentence <span className="text-[#8c8880] font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={exampleSentence}
              onChange={(e) => setExampleSentence(e.target.value)}
              placeholder="e.g. 日本語を学びます。"
              className="w-full px-3.5 py-2 rounded-xl border border-[#d4d0c8] text-xs font-japanese focus:border-[#ea580c] outline-hidden text-[#1a1918]"
            />
          </div>

          {/* Live Preview Card */}
          <div className="bg-[#faf9f6] p-4 rounded-2xl border border-[#eeece6]">
            <div className="flex items-center justify-between text-[11px] text-[#8c8880] font-bold uppercase mb-2">
              <span>Card Preview</span>
              <span className="text-[#ea580c] bg-[#fff7ed] px-2 py-0.5 rounded font-mono">
                {source === 'Textbook' ? `Chapter ${chapter}` : category} • {jlpt}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold font-japanese text-[#1a1918]">
                  {kanji.trim() || '学'}
                </span>
                <div>
                  <div className="text-sm font-bold text-[#1a1918]">
                    {meaning.trim() || 'Study, Learning'}
                  </div>
                  <div className="text-xs text-[#8c8880] font-mono mt-0.5">
                    {[onyomi && `音: ${onyomi}`, kunyomi && `訓: ${kunyomi}`].filter(Boolean).join(' • ') || (romaji ? `(${romaji})` : '')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => soundEffects.speakJapanese(kanji.trim() || '学')}
                className="p-2 rounded-xl bg-white border border-[#eeece6] text-[#6e6b66] hover:text-[#ea580c] cursor-pointer"
                title="Hear pronunciation"
              >
                <Volume2 className="w-4 h-4" />
              </button>
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs shadow-orange-200 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editItem ? 'Update Kanji' : 'Save Kanji'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
