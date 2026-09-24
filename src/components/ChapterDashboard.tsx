import React from 'react';
import { VocabularyItem } from '../types/vocab';
import { ChapterItem } from '../types/chapter';
import { JLPTLevel } from '../types/kanji';
import { 
  BookOpen, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Layers, 
  Star,
  CheckSquare,
  Edit3,
  Trash2,
  FolderOpen,
  FolderKanban
} from 'lucide-react';
import { isWeakWord } from '../utils/srs';

interface ChapterDashboardProps {
  vocabularies: VocabularyItem[];
  chapters: ChapterItem[];
  customChapters?: any[];
  currentLevel?: JLPTLevel;
  onOpenChapter: (chapterNum: number) => void;
  onOpenCustomChapter?: (customChapter: any) => void;
  onOpenExtraVocab: () => void;
  onOpenAddModal: (defaultChapter?: number) => void;
  onOpenAddChapterModal: () => void;
  onOpenManageChaptersModal: () => void;
  onEditChapter: (chapter: ChapterItem) => void;
  onDeleteChapter: (chapterId: string, chapterNumber: number) => Promise<void>;
  onOpenMultiChapterPractice: () => void;
  onOpenWeakWordsPractice: () => void;
}

export const ChapterDashboard: React.FC<ChapterDashboardProps> = ({
  vocabularies,
  chapters,
  customChapters = [],
  currentLevel = 'N5',
  onOpenChapter,
  onOpenCustomChapter,
  onOpenExtraVocab,
  onOpenAddModal,
  onOpenAddChapterModal,
  onOpenManageChaptersModal,
  onEditChapter,
  onDeleteChapter,
  onOpenMultiChapterPractice,
  onOpenWeakWordsPractice,
}) => {
  // Stats calculation per textbook chapter
  const chapterCounts: Record<number, number> = {};
  const chapterMastered: Record<number, number> = {};

  chapters.forEach(ch => {
    chapterCounts[ch.chapterNumber] = 0;
    chapterMastered[ch.chapterNumber] = 0;
  });

  // Custom chapters stats
  const customChapterCounts: Record<string, number> = {};
  const customChapterMastered: Record<string, number> = {};
  customChapters.forEach(cc => {
    const id = cc._id || cc.id;
    customChapterCounts[id] = 0;
    customChapterMastered[id] = 0;
  });

  let extraCount = 0;
  let extraMastered = 0;
  let totalWeakWords = 0;

  const validChapterNumbers = new Set(chapters.map(c => c.chapterNumber));

  vocabularies.forEach(v => {
    if (isWeakWord(v)) {
      totalWeakWords++;
    }

    const isCustom = Boolean(v.customChapterId);
    const isExtra = v.destinationType === 'extra' || (!isCustom && (v.source === 'Extra' || !v.chapter || v.chapter <= 0));
    const isTextbook = !isCustom && !isExtra && typeof v.chapter === 'number' && validChapterNumbers.has(v.chapter);

    if (isCustom && v.customChapterId) {
      customChapterCounts[v.customChapterId] = (customChapterCounts[v.customChapterId] || 0) + 1;
      if (v.learningStatus === 'Mastered') {
        customChapterMastered[v.customChapterId] = (customChapterMastered[v.customChapterId] || 0) + 1;
      }
    } else if (isTextbook && typeof v.chapter === 'number') {
      chapterCounts[v.chapter] = (chapterCounts[v.chapter] || 0) + 1;
      if (v.learningStatus === 'Mastered') {
        chapterMastered[v.chapter] = (chapterMastered[v.chapter] || 0) + 1;
      }
    } else {
      extraCount++;
      if (v.learningStatus === 'Mastered') {
        extraMastered++;
      }
    }
  });

  const totalTextbookWords = Object.values(chapterCounts).reduce((a, b) => a + b, 0);
  const totalCustomWords = Object.values(customChapterCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop-in space-y-10">
      
      {/* Header & Quick Action CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#eeece6] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a1918] font-japanese">{currentLevel} 日本語の単語</h1>
            <span className="text-xs bg-[#d93829] text-white font-bold px-2.5 py-0.5 rounded-md shadow-xs">
              {currentLevel}
            </span>
            <span className="text-xs bg-[#fef2f2] text-[#d93829] font-bold px-2.5 py-0.5 rounded-full border border-[#fee2e2]">
              {chapters.length} Standard Chapters
            </span>
            {customChapters.length > 0 && (
              <span className="text-xs bg-sky-50 text-sky-700 font-bold px-2.5 py-0.5 rounded-full border border-sky-200">
                {customChapters.length} Custom Decks
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#6e6b66] mt-1">
            Organized curriculum chapters (Chapters 1–24), custom topical decks, and extra supplementary vocabulary.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {totalWeakWords > 0 && (
            <button
              onClick={onOpenWeakWordsPractice}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>Weak Words ({totalWeakWords})</span>
            </button>
          )}

          <button
            onClick={onOpenMultiChapterPractice}
            className="flex items-center gap-1.5 bg-[#faf9f6] hover:bg-[#eeece6] text-[#1a1918] border border-[#d4d0c8] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <CheckSquare className="w-4 h-4 text-indigo-500" />
            <span>Practice Multiple Chapters</span>
          </button>

          <button
            onClick={() => onOpenAddModal()}
            className="flex items-center gap-1.5 bg-[#d93829] hover:bg-[#b92a1d] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs shadow-red-200 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Vocabulary</span>
          </button>
        </div>
      </div>

      {/* 3 DISTINCT SECTIONS */}
      <div className="space-y-10">
        
        {/* ======================================================== */}
        {/* SECTION 1: STANDARD VOCABULARY (CHAPTERS 1–24) */}
        {/* ======================================================== */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-[#1a1918] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#d93829]" />
              <span>Standard Chapters (Chapters 1–{chapters.length > 0 ? Math.max(...chapters.map(c => c.chapterNumber)) : '24'})</span>
              <span className="text-xs font-mono font-normal text-[#8c8880]">({totalTextbookWords} total words)</span>
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAddChapterModal}
                className="flex items-center gap-1.5 bg-white border border-[#d4d0c8] hover:bg-[#faf9f6] text-[#1a1918] px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#d93829]" />
                <span>+ Add Chapter</span>
              </button>
              <button
                onClick={onOpenManageChaptersModal}
                className="flex items-center gap-1.5 bg-[#faf9f6] border border-[#d4d0c8] hover:bg-[#eeece6] text-[#1a1918] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-neutral-600" />
                <span>Manage Chapters</span>
              </button>
            </div>
          </div>

          {chapters.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-[#eeece6] text-xs text-[#8c8880]">
              No chapters found. Click "+ Add Chapter" to create your first chapter.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {chapters.map(ch => {
                const count = chapterCounts[ch.chapterNumber] || 0;
                const mastered = chapterMastered[ch.chapterNumber] || 0;
                const hasWords = count > 0;

                return (
                  <div
                    key={ch.id}
                    onClick={() => onOpenChapter(ch.chapterNumber)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      hasWords
                        ? 'bg-white border-[#eeece6] hover:border-[#d93829]/50 hover:shadow-md'
                        : 'bg-[#faf9f6]/80 border-[#eeece6]/60 hover:border-[#d4d0c8]'
                    }`}
                  >
                    <div>
                      {/* Chapter Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                          hasWords ? 'bg-[#fef2f2] text-[#d93829]' : 'bg-neutral-100 text-[#8c8880]'
                        }`}>
                          CH {ch.chapterNumber}
                        </span>
                        {hasWords && (
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            {mastered > 0 ? `${mastered} mastered` : ''}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[#1a1918] group-hover:text-[#d93829] transition-colors font-japanese">
                        {ch.japaneseTitle || `第${ch.chapterNumber}課`}
                      </h3>
                      <p className="text-[11px] text-[#8c8880] mt-0.5 truncate">{ch.title}</p>
                    </div>

                    {/* Word count */}
                    <div className="mt-3 pt-2 border-t border-[#f2f0ea] flex items-center justify-between">
                      <span className="text-xs font-medium text-[#6e6b66]">
                        {count} {count === 1 ? 'word' : 'words'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-[#d93829] group-hover:translate-x-0.5 transition-all" />
                    </div>

                    {/* Chapter Controls */}
                    <div className="mt-2 pt-2 border-t border-[#f2f0ea]/80 flex items-center justify-between text-xs text-[#8c8880]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditChapter(ch);
                        }}
                        className="flex items-center gap-1 hover:text-[#1a1918] p-1 rounded-md transition-colors cursor-pointer"
                        title="Edit / Rename Chapter"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span className="text-[10px] font-medium">Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChapter(ch.id, ch.chapterNumber);
                        }}
                        className="flex items-center gap-1 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                        title="Delete Chapter"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="text-[10px] font-medium">Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: CUSTOM VOCABULARY DECKS */}
        {/* ======================================================== */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-[#1a1918] flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-sky-600" />
              <span>Custom Vocabulary Decks</span>
              <span className="text-xs font-mono font-normal text-[#8c8880]">({totalCustomWords} words across {customChapters.length} decks)</span>
            </h2>
          </div>

          {customChapters.length === 0 ? (
            <div className="p-6 rounded-3xl bg-[#faf9f6] border border-dashed border-[#eeece6] text-center text-xs text-[#8c8880] space-y-1">
              <div className="font-semibold text-[#1a1918]">No custom decks created yet</div>
              <p>Topical decks (such as Days of the Week, Months, Food & Dining) can be created from the Admin Panel or with "+ Add Chapter".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {customChapters.map(cc => {
                const id = cc._id || cc.id;
                const count = customChapterCounts[id] || cc.wordCount || 0;
                const mastered = customChapterMastered[id] || 0;

                return (
                  <div
                    key={id}
                    onClick={() => onOpenCustomChapter && onOpenCustomChapter(cc)}
                    className="p-5 rounded-2xl bg-white border border-[#eeece6] hover:border-sky-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
                          {cc.jlptLevel || 'N5'} Deck
                        </span>
                        {count > 0 && mastered > 0 && (
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            {mastered} mastered
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#1a1918] group-hover:text-sky-700 transition-colors font-japanese flex items-center gap-1.5">
                        <span>{cc.displayName || cc.name}</span>
                        {cc.japaneseName && (
                          <span className="text-xs text-[#8c8880] font-normal">
                            ({cc.japaneseName})
                          </span>
                        )}
                      </h3>

                      {cc.description && (
                        <p className="text-xs text-[#6e6b66] mt-1 line-clamp-2">
                          {cc.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#f2f0ea] flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#6e6b66]">
                        {count} {count === 1 ? 'word' : 'words'}
                      </span>
                      <span className="text-xs font-bold text-sky-700 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Open Deck <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: EXTRA VOCABULARY DECK */}
        {/* ======================================================== */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1a1918] flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>Extra Vocabulary</span>
              <span className="text-xs font-mono font-normal text-[#8c8880]">({extraCount} words)</span>
            </h2>
          </div>

          <div 
            onClick={onOpenExtraVocab}
            className="p-6 rounded-3xl bg-gradient-to-br from-white via-[#fffdf9] to-[#fff8f0] border border-amber-200/80 shadow-xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#1a1918] group-hover:text-amber-700 transition-colors">
                    Extra Vocabulary Deck (課外・未分類単語)
                  </h3>
                  <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    {extraCount} words
                  </span>
                </div>
                <p className="text-xs text-[#6e6b66] mt-1 max-w-xl">
                  Supplemental vocabulary and words preserved from deleted custom chapters. Isolated from standard curriculum chapters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <span className="text-xs font-semibold text-amber-700 group-hover:underline flex items-center gap-1">
                Browse Extra Vocabulary <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
