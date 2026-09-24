import React, { useState } from 'react';
import { KanjiItem, JLPTLevel } from '../types/kanji';
import { ChapterItem } from '../types/chapter';
import { 
  BookOpen, 
  PlusCircle, 
  Plus,
  Sparkles, 
  AlertCircle, 
  Star, 
  ChevronRight, 
  Search,
  Brain,
  Layers,
  Edit3,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { isWeakKanji } from '../utils/kanjiSrs';
import { BackButton } from './BackButton';

interface KanjiDashboardProps {
  kanjis: KanjiItem[];
  kanjiChapters: ChapterItem[];
  currentLevel?: JLPTLevel;
  onOpenChapter: (chapter: number) => void;
  onOpenExtraKanji: () => void;
  onOpenAddModal: (chapter?: number) => void;
  onOpenAddChapterModal: () => void;
  onOpenManageChaptersModal: () => void;
  onEditChapter: (chapter: ChapterItem) => void;
  onDeleteChapter: (chapterId: string, chapterNumber: number) => Promise<void>;
  onOpenPractice: () => void;
  onOpenWeakKanjiPractice: () => void;
  onBackToDashboard: () => void;
}

const JLPT_FILTERS: (JLPTLevel | 'All')[] = ['All', 'N5', 'N4', 'N3', 'N2', 'N1'];

export const KanjiDashboard: React.FC<KanjiDashboardProps> = ({
  kanjis,
  kanjiChapters,
  currentLevel,
  onOpenChapter,
  onOpenExtraKanji,
  onOpenAddModal,
  onOpenAddChapterModal,
  onOpenManageChaptersModal,
  onEditChapter,
  onDeleteChapter,
  onOpenPractice,
  onOpenWeakKanjiPractice,
  onBackToDashboard
}) => {
  const [selectedJlpt, setSelectedJlpt] = useState<JLPTLevel | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered counts
  const filteredKanjis = kanjis.filter(k => {
    const matchesJlpt = selectedJlpt === 'All' || k.jlpt === selectedJlpt;
    const matchesSearch = !searchTerm.trim() || 
      k.kanji.includes(searchTerm.trim()) || 
      k.meaning.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.onyomi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.kunyomi?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesJlpt && matchesSearch;
  });

  const validChapterNumbers = new Set(kanjiChapters.map(c => c.chapterNumber));

  const getChapterCount = (ch: number) => {
    return filteredKanjis.filter(k => k.source === 'Textbook' && k.chapter === ch).length;
  };

  const getChapterMastered = (ch: number) => {
    return filteredKanjis.filter(k => k.source === 'Textbook' && k.chapter === ch && k.learningStatus === 'Mastered').length;
  };

  const extraCount = filteredKanjis.filter(k => k.source === 'Extra' || !k.chapter || !validChapterNumbers.has(k.chapter)).length;
  const weakCount = kanjis.filter(isWeakKanji).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop-in space-y-6">
      
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <BackButton onClick={onBackToDashboard} label="Back to Dashboard" />

        <div className="flex items-center gap-2">
          {weakCount > 0 && (
            <button
              onClick={onOpenWeakKanjiPractice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Practice Weak Kanji ({weakCount})</span>
            </button>
          )}

          <button
            onClick={onOpenPractice}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#fff7ed] border border-orange-200 text-[#ea580c] hover:bg-orange-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Practice Kanji</span>
          </button>

          <button
            onClick={() => onOpenAddModal()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs shadow-orange-200 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Kanji</span>
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-200/60 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#ea580c] text-white flex items-center justify-center font-bold font-japanese text-base">
                漢
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a1918] font-japanese">
                漢字学習・Kanji Chapters
              </h1>
              {currentLevel && (
                <span className="text-xs bg-[#ea580c] text-white font-bold px-2.5 py-0.5 rounded-md shadow-xs">
                  {currentLevel}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#6e6b66] mt-1.5 max-w-2xl">
              Organized into chapters and extra decks. Study On'yomi, Kun'yomi, JLPT levels, and example words with dedicated recall practice.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-orange-100 shrink-0">
            <div className="text-center px-2">
              <span className="block text-2xl font-bold font-mono text-[#ea580c]">{kanjis.length}</span>
              <span className="text-[11px] font-semibold text-[#8c8880] uppercase">Total Kanji</span>
            </div>
            <div className="w-px h-8 bg-neutral-200" />
            <div className="text-center px-2">
              <span className="block text-2xl font-bold font-mono text-emerald-600">
                {kanjis.filter(k => k.learningStatus === 'Mastered').length}
              </span>
              <span className="text-[11px] font-semibold text-[#8c8880] uppercase">Mastered</span>
            </div>
            <div className="w-px h-8 bg-neutral-200" />
            <div className="text-center px-2">
              <span className="block text-2xl font-bold font-mono text-rose-600">{weakCount}</span>
              <span className="text-[11px] font-semibold text-[#8c8880] uppercase">Weak</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-6 pt-4 border-t border-orange-200/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* JLPT Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-[#6e6b66] mr-1 shrink-0">JLPT:</span>
            {JLPT_FILTERS.map(lvl => (
              <button
                key={lvl}
                onClick={() => setSelectedJlpt(lvl)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedJlpt === lvl
                    ? 'bg-[#ea580c] text-white shadow-xs'
                    : 'bg-white text-[#6e6b66] hover:bg-orange-50 border border-neutral-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Kanji, readings, meanings..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-hidden focus:ring-2 focus:ring-[#ea580c]"
            />
          </div>
        </div>
      </div>

      {/* Empty State Banner if no Kanji in database */}
      {kanjis.length === 0 && (
        <div className="p-8 text-center bg-white rounded-3xl border border-orange-200/80 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#fff7ed] text-[#ea580c] flex items-center justify-center mx-auto text-xl font-bold font-japanese">
            漢
          </div>
          <h3 className="text-base font-bold text-[#1a1918]">No Kanji available yet.</h3>
          <p className="text-xs text-[#8c8880] max-w-sm mx-auto">
            Your Kanji collection is currently empty. Add Kanji characters to start learning.
          </p>
          <button
            onClick={() => onOpenAddModal()}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ea580c] text-white text-xs font-semibold hover:bg-[#c2410c] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add First Kanji</span>
          </button>
        </div>
      )}

      {/* Chapters Header with Management Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <h2 className="text-base font-bold text-[#1a1918] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#ea580c]" />
          <span>Kanji Chapters ({kanjiChapters.length > 0 ? `1–${Math.max(...kanjiChapters.map(c => c.chapterNumber))}` : '0'})</span>
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddChapterModal}
            className="flex items-center gap-1.5 bg-white border border-[#d4d0c8] hover:bg-[#faf9f6] text-[#1a1918] px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#ea580c]" />
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

      {/* Chapters Grid */}
      {kanjiChapters.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-[#eeece6] text-xs text-[#8c8880]">
          No Kanji chapters found. Click "+ Add Chapter" above to create one.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {kanjiChapters.map(ch => {
            const count = getChapterCount(ch.chapterNumber);
            const mastered = getChapterMastered(ch.chapterNumber);
            const chapterChars = filteredKanjis
              .filter(k => k.source === 'Textbook' && k.chapter === ch.chapterNumber)
              .map(k => k.kanji);

            return (
              <div
                key={ch.id}
                onClick={() => onOpenChapter(ch.chapterNumber)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  count > 0 
                    ? 'bg-white border-[#eeece6] hover:border-orange-300 hover:shadow-md' 
                    : 'bg-[#faf9f6]/70 border-[#eeece6]/60 hover:border-[#d4d0c8]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold font-mono text-[#ea580c] bg-orange-50 px-2 py-0.5 rounded-md">
                      CH {ch.chapterNumber}
                    </span>
                    {mastered > 0 && (
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        {mastered} mastered
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#1a1918] group-hover:text-[#ea580c] transition-colors font-japanese">
                    {ch.japaneseTitle || `第${ch.chapterNumber}課`}
                  </h3>
                  <p className="text-[11px] text-[#8c8880] truncate">{ch.title}</p>

                  {/* Character preview */}
                  <div className="mt-2 flex flex-wrap gap-1 min-h-[22px]">
                    {chapterChars.slice(0, 4).map((char, i) => (
                      <span key={i} className="text-sm font-japanese font-bold text-[#1a1918]">
                        {char}
                      </span>
                    ))}
                    {chapterChars.length > 4 && (
                      <span className="text-[10px] text-[#8c8880] self-center">+{chapterChars.length - 4}</span>
                    )}
                  </div>
                </div>

                <div>
                  {/* Bottom: Count */}
                  <div className="mt-3 pt-2 border-t border-[#f2f0ea] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#6e6b66]">
                      {count} {count === 1 ? 'kanji' : 'kanji'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-[#ea580c] group-hover:translate-x-0.5 transition-all" />
                  </div>

                  {/* Subtle Chapter Controls */}
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
                      title="Delete Chapter (one-click)"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="text-[10px] font-medium">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extra / Unassigned Kanji Deck */}
      <div 
        onClick={onOpenExtraKanji}
        className="p-6 rounded-3xl bg-gradient-to-br from-white via-[#fffaf5] to-[#fff7ed] border border-orange-200/80 shadow-xs hover:shadow-md hover:border-orange-400 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
      >
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100/70 border border-orange-200 text-[#ea580c] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Star className="w-6 h-6 fill-orange-500 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#1a1918] group-hover:text-[#ea580c] transition-colors">
                Extra / Unassigned Kanji Deck (課外・未分類漢字)
              </h3>
              <span className="text-[11px] font-semibold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                {extraCount} kanji
              </span>
            </div>
            <p className="text-xs text-[#6e6b66] mt-1 max-w-xl">
              Supplemental characters, custom additions, and Kanji preserved from deleted chapters. Not bound to any specific chapter.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs font-semibold text-[#ea580c] group-hover:underline flex items-center gap-1">
            Browse Extra Kanji <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>

    </div>
  );
};
