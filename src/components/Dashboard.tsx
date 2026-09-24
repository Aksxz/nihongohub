import React from 'react';
import { VocabularyItem, PracticeSession, AppView, StudyNote } from '../types/vocab';
import { KanjiItem, KanjiPracticeSession } from '../types/kanji';
import { ChapterItem } from '../types/chapter';
import { 
  BookOpen, 
  Sparkles, 
  BarChart3, 
  PlusCircle, 
  Flame, 
  CheckCircle2, 
  XCircle, 
  Target, 
  Layers, 
  ArrowRight,
  TrendingUp,
  Volume2,
  AlertCircle,
  Brain,
  BookMarked
} from 'lucide-react';
import { soundEffects } from '../utils/audio';
import { isWeakWord, isHardWord } from '../utils/srs';
import { isWeakKanji } from '../utils/kanjiSrs';

import { JLPTLevel } from '../types/kanji';

interface DashboardProps {
  vocabularies: VocabularyItem[];
  kanjis: KanjiItem[];
  sessions: PracticeSession[];
  kanjiSessions?: KanjiPracticeSession[];
  notes: StudyNote[];
  chapters?: ChapterItem[];
  kanjiChapters?: ChapterItem[];
  currentLevel?: JLPTLevel;
  userName?: string;
  onNavigate: (view: AppView) => void;
  onOpenAddVocabModal: () => void;
  onOpenAddKanjiModal: () => void;
  onStartPracticeWithFilter?: (mode: 'chapter' | 'multi-chapter' | 'weak' | 'hard' | 'new' | 'smart') => void;
  onStartKanjiPractice?: () => void;
  onOpenChapter: (chapterNum: number) => void;
  onOpenKanjiChapter: (chapterNum: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  vocabularies = [],
  kanjis = [],
  sessions = [],
  kanjiSessions = [],
  notes,
  chapters = [],
  kanjiChapters = [],
  currentLevel = 'N5',
  userName,
  onNavigate,
  onOpenAddVocabModal,
  onOpenAddKanjiModal,
  onStartPracticeWithFilter,
  onStartKanjiPractice,
  onOpenChapter,
  onOpenKanjiChapter
}) => {
  // Vocabulary metrics
  const totalVocab = vocabularies.length;
  const masteredVocab = vocabularies.filter(v => v.learningStatus === 'Mastered').length;
  const vocabCorrect = vocabularies.reduce((sum, v) => sum + (v.correctCount || 0), 0);
  const vocabWrong = vocabularies.reduce((sum, v) => sum + (v.wrongCount || 0), 0);
  const vocabAttempts = vocabCorrect + vocabWrong;
  const vocabAccuracy = vocabAttempts > 0 ? Math.round((vocabCorrect / vocabAttempts) * 100) : 0;
  const weakVocabCount = vocabularies.filter(isWeakWord).length;
  const hardVocabCount = vocabularies.filter(isHardWord).length;

  // Kanji metrics
  const totalKanji = kanjis.length;
  const masteredKanji = kanjis.filter(k => k.learningStatus === 'Mastered').length;
  const kanjiCorrect = kanjis.reduce((sum, k) => sum + (k.correctCount || 0), 0);
  const kanjiWrong = kanjis.reduce((sum, k) => sum + (k.wrongCount || 0), 0);
  const kanjiAttempts = kanjiCorrect + kanjiWrong;
  const kanjiAccuracy = kanjiAttempts > 0 ? Math.round((kanjiCorrect / kanjiAttempts) * 100) : 0;
  const weakKanjiCount = kanjis.filter(isWeakKanji).length;

  // Streaks
  const latestSession = sessions.length > 0 ? sessions[0] : null;
  const currentStreak = latestSession?.streak || 0;
  const bestStreak = sessions.reduce((max, s) => Math.max(max, s.streak || 0), currentStreak);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop-in">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-[#fdfbf7] to-[#fff5f5] border border-[#eeece6] p-6 sm:p-8 shadow-xs">
        <div className="absolute right-4 -bottom-6 select-none pointer-events-none opacity-5 text-9xl font-serif-jp text-[#d93829]">
          学
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fef2f2] border border-[#fee2e2] text-[#d93829] text-xs font-semibold uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-[#d93829] animate-pulse"></span>
            <span>Independent Vocabulary & Kanji Studios</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a1918] tracking-tight font-japanese">
            今日も日本語を練習しましょう
          </h1>
          <p className="mt-2 text-base text-[#6e6b66] leading-relaxed">
            Master {chapters.length > 0 ? `${chapters.length} chapters` : 'all chapters'} of Japanese vocabulary and Kanji characters with isolated spaced repetition, recall tests, and offline study notes.
          </p>

          {/* Quick Action CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('practice')}
              className="flex items-center gap-2.5 bg-[#d93829] hover:bg-[#b92a1d] text-white px-5 py-3 rounded-2xl text-sm font-semibold shadow-md shadow-red-200 hover:shadow-lg transition-all transform active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Practice Hub</span>
            </button>

            <button
              onClick={() => onNavigate('vocab-list')}
              className="flex items-center gap-2 bg-white hover:bg-[#faf9f6] text-[#1a1918] border border-[#d4d0c8] px-4 py-3 rounded-2xl text-sm font-semibold shadow-xs hover:border-[#a8a29e] transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#d93829]" />
              <span>Vocabulary ({chapters.length > 0 ? `${chapters.length} Ch` : 'Chapters'})</span>
            </button>

            <button
              onClick={() => onNavigate('kanji-list')}
              className="flex items-center gap-2 bg-white hover:bg-[#faf9f6] text-[#1a1918] border border-[#d4d0c8] px-4 py-3 rounded-2xl text-sm font-semibold shadow-xs hover:border-[#a8a29e] transition-all cursor-pointer"
            >
              <span className="font-japanese font-bold text-[#ea580c]">漢</span>
              <span>Kanji ({kanjiChapters.length > 0 ? `${kanjiChapters.length} Ch` : 'Chapters'})</span>
            </button>

            <button
              onClick={() => onNavigate('notes')}
              className="flex items-center gap-2 bg-[#f7f6f2] hover:bg-[#eeece6] text-[#1a1918] px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer"
            >
              <BookMarked className="w-4 h-4 text-indigo-500" />
              <span>Study Notes ({notes.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dual Core Learning Banks: Vocabulary vs Kanji */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Vocabulary Bank Card */}
        <div className="bg-white rounded-3xl border border-red-200/80 p-6 sm:p-7 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#fffafa] to-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#fef2f2] text-[#d93829] flex items-center justify-center font-bold font-serif-jp text-lg">
                言
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#1a1918]">Vocabulary Learning</h3>
                <p className="text-xs text-[#8c8880]">{chapters.length > 0 ? `${chapters.length} chapters` : 'All chapters'} & extra deck</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('vocab-list')}
              className="text-xs font-semibold text-[#d93829] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Browse Chapters <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="p-3.5 bg-[#faf9f6] rounded-2xl border border-[#eeece6]">
              <span className="text-[11px] font-semibold text-[#8c8880] block">Total Vocab</span>
              <span className="text-2xl font-bold font-mono text-[#d93829]">{totalVocab}</span>
            </div>
            <div className="p-3.5 bg-[#faf9f6] rounded-2xl border border-[#eeece6]">
              <span className="text-[11px] font-semibold text-[#8c8880] block">Mastered</span>
              <span className="text-2xl font-bold font-mono text-emerald-600">{masteredVocab}</span>
            </div>
            <div className="p-3.5 bg-[#faf9f6] rounded-2xl border border-[#eeece6]">
              <span className="text-[11px] font-semibold text-[#8c8880] block">Accuracy</span>
              <span className="text-2xl font-bold font-mono text-[#1a1918]">{vocabAccuracy}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => onStartPracticeWithFilter?.('all')}
              className="flex-1 py-2.5 rounded-xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Practice Vocab</span>
            </button>
            <button
              onClick={onOpenAddVocabModal}
              className="px-4 py-2.5 rounded-xl bg-white border border-[#d4d0c8] text-[#1a1918] hover:bg-[#faf9f6] text-xs font-semibold transition-colors cursor-pointer"
            >
              + Add Word
            </button>
          </div>
        </div>

        {/* 2. Kanji Bank Card */}
        <div className="bg-white rounded-3xl border border-orange-200/80 p-6 sm:p-7 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#fffaf5] to-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#fff7ed] text-[#ea580c] flex items-center justify-center font-bold font-japanese text-xl">
                漢
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#1a1918]">Kanji Learning</h3>
                <p className="text-xs text-[#8c8880]">{kanjiChapters.length > 0 ? `${kanjiChapters.length} chapters` : 'All chapters'}, On'yomi, Kun'yomi & JLPT</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('kanji-list')}
              className="text-xs font-semibold text-[#ea580c] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Browse Kanji <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="p-3.5 bg-[#faf9f6] rounded-2xl border border-[#eeece6]">
              <span className="text-[11px] font-semibold text-[#8c8880] block">Total Kanji</span>
              <span className="text-2xl font-bold font-mono text-[#ea580c]">{totalKanji}</span>
            </div>
            <div className="p-3.5 bg-[#faf9f6] rounded-2xl border border-[#eeece6]">
              <span className="text-[11px] font-semibold text-[#8c8880] block">Mastered</span>
              <span className="text-2xl font-bold font-mono text-emerald-600">{masteredKanji}</span>
            </div>
            <div className="p-3.5 bg-[#faf9f6] rounded-2xl border border-[#eeece6]">
              <span className="text-[11px] font-semibold text-[#8c8880] block">Accuracy</span>
              <span className="text-2xl font-bold font-mono text-[#1a1918]">{kanjiAccuracy}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onStartKanjiPractice}
              className="flex-1 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Practice Kanji</span>
            </button>
            <button
              onClick={onOpenAddKanjiModal}
              className="px-4 py-2.5 rounded-xl bg-white border border-[#d4d0c8] text-[#1a1918] hover:bg-[#faf9f6] text-xs font-semibold transition-colors cursor-pointer"
            >
              + Add Kanji
            </button>
          </div>
        </div>

      </div>

      {/* Chapters Quick Row */}
      <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#d93829]" />
            <h3 className="text-base font-bold text-[#1a1918]">Chapters Overview</h3>
          </div>
          <button
            onClick={() => onNavigate('vocab-list')}
            className="text-xs font-semibold text-[#d93829] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Chapters ({chapters.length > 0 ? chapters.length : 24})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {(chapters.length > 0 ? chapters.slice(0, 6) : [1, 2, 3, 4, 5, 6].map(ch => ({ id: `ch-${ch}`, chapterNumber: ch, title: `Chapter ${ch}`, japaneseTitle: `第${ch}課` }))).map(chItem => {
            const ch = chItem.chapterNumber;
            const vCount = vocabularies.filter(v => (v.source === 'Textbook' || v.source !== 'Extra') && v.chapter === ch).length;

            return (
              <div
                key={ch}
                onClick={() => onOpenChapter(ch)}
                className="p-3.5 rounded-2xl bg-[#faf9f6] border border-[#eeece6] hover:border-[#d93829]/50 hover:bg-white transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold font-mono text-[#d93829] bg-[#fef2f2] px-1.5 py-0.5 rounded">
                    CH {ch}
                  </span>
                  <div className="text-sm font-bold font-japanese text-[#1a1918] group-hover:text-[#d93829] transition-colors mt-2">
                    {chItem.japaneseTitle || `第${ch}課`}
                  </div>
                  {chItem.title && (
                    <div className="text-[11px] text-[#6e6b66] truncate mt-0.5">
                      {chItem.title}
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs text-[#8c8880]">
                  <div>{vCount} words</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auxiliary Row: Weak Words & Study Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Weak Items */}
        <div className="bg-white rounded-2xl border border-[#eeece6] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <h3 className="text-base font-bold text-[#1a1918]">Attention Needed</h3>
            </div>
            <div className="flex items-center gap-2">
              {hardVocabCount > 0 && onStartPracticeWithFilter && (
                <button
                  onClick={() => onStartPracticeWithFilter('hard')}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Hard Words ({hardVocabCount})
                </button>
              )}
              {weakVocabCount > 0 && onStartPracticeWithFilter && (
                <button
                  onClick={() => onStartPracticeWithFilter('weak')}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Weak Words ({weakVocabCount})
                </button>
              )}
            </div>
          </div>

          {weakVocabCount === 0 ? (
            <div className="py-8 text-center text-[#8c8880] text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-medium text-[#1a1918]">No weak words detected!</p>
              <p className="text-xs text-[#8c8880] mt-1">Keep practicing to test your memory retention.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {vocabularies.filter(isWeakWord).slice(0, 4).map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#faf9f6] border border-[#eeece6] hover:border-[#d4d0c8] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundEffects.speakJapanese(item.japanese);
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-[#1a1918] hover:bg-neutral-200/60 transition-colors"
                      title="Pronounce"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-japanese font-bold text-base text-[#1a1918]">{item.japanese}</span>
                        <span className="text-xs text-[#8c8880] font-mono">{item.reading}</span>
                        {item.chapter && (
                          <span className="text-[10px] text-[#d93829] bg-[#fef2f2] px-1 rounded">Ch {item.chapter}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#6e6b66] truncate max-w-[200px] sm:max-w-xs">{item.english}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                      {item.wrongCount} wrong
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Personal Japanese Study Notes */}
        <div className="bg-white rounded-2xl border border-[#eeece6] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold text-[#1a1918]">Study Notes (ノート)</h3>
            </div>
            <button
              onClick={() => onNavigate('notes')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
            >
              Open Notebook ({notes.length})
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="py-8 text-center text-[#8c8880] text-sm">
              <p>No study notes added yet.</p>
              <button
                onClick={() => onNavigate('notes')}
                className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
              >
                + Create your first note
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notes.slice(0, 4).map((note) => (
                <div 
                  key={note.id}
                  onClick={() => onNavigate('notes')}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#faf9f6] border border-[#eeece6] hover:border-[#d4d0c8] transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#fef2f2] text-[#d93829] px-1.5 py-0.5 rounded">
                        {note.category}
                      </span>
                      <span className="text-xs font-bold text-[#1a1918] group-hover:text-indigo-600 transition-colors font-japanese truncate max-w-[200px]">
                        {note.title}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
