import React, { useState, useMemo, useEffect } from 'react';
import { VocabularyItem, PracticeSession, AppView } from '../types/vocab';
import { KanjiItem, KanjiPracticeSession, JLPTLevel } from '../types/kanji';
import { CustomChapter } from '../types/customChapter';
import { api } from '../services/api';
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  Calendar, 
  Volume2, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowRight,
  Brain,
  Award,
  Star,
  RefreshCw,
  FolderPlus
} from 'lucide-react';
import { soundEffects } from '../utils/audio';
import { isWeakWord, isHardWord } from '../utils/srs';
import { isWeakKanji } from '../utils/kanjiSrs';
import { BackButton } from './BackButton';
import { ChapterItem } from '../types/chapter';

interface StatisticsProps {
  vocabularies: VocabularyItem[];
  sessions: PracticeSession[];
  kanjis?: KanjiItem[];
  kanjiSessions?: KanjiPracticeSession[];
  vocabChapters?: ChapterItem[];
  kanjiChapters?: ChapterItem[];
  customChapters?: CustomChapter[];
  currentLevel?: JLPTLevel;
  favoriteCount?: number;
  difficultCount?: number;
  onNavigate: (view: AppView) => void;
  onPracticeDifficultWords?: (words: VocabularyItem[]) => void;
  onPracticeHardWords?: (words: VocabularyItem[]) => void;
  onPracticeWeakKanjis?: (kanjis: KanjiItem[]) => void;
  onSelectKanjiChapter?: (chapter: number | 'extra') => void;
  onSelectLevel?: (level: JLPTLevel) => void;
}

export const Statistics: React.FC<StatisticsProps> = ({
  vocabularies,
  sessions,
  kanjis = [],
  kanjiSessions = [],
  vocabChapters = [],
  kanjiChapters = [],
  customChapters = [],
  currentLevel = 'N5',
  favoriteCount = 0,
  difficultCount = 0,
  onNavigate,
  onPracticeDifficultWords,
  onPracticeHardWords,
  onPracticeWeakKanjis,
  onSelectKanjiChapter,
  onSelectLevel
}) => {
  const [activeTab, setActiveTab] = useState<'vocab' | 'kanji'>('vocab');
  const [serverProgress, setServerProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchProgress = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const res = await api.progress.get();
      if (res.success && res.data) {
        setServerProgress(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load server progress, falling back to client dataset:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [currentLevel]);

  // Helpers for user-marked learned items
  const isWordLearned = (v: VocabularyItem) => {
    return !!((v as any).isLearned || v.learningStatus === 'Mastered');
  };

  const isKanjiMastered = (k: KanjiItem) => {
    return !!((k as any).isMastered || k.learningStatus === 'Mastered');
  };

  // ==========================================
  // VOCABULARY METRICS
  // ==========================================
  const totalWords = serverProgress?.totalVocabulary ?? vocabularies.length;
  const wordsPracticed = serverProgress?.wordsPracticed ?? vocabularies.filter(v => (v.practiceCount || 0) > 0).length;
  const wordsLearned = serverProgress?.wordsLearned ?? serverProgress?.vocabularyLearned ?? vocabularies.filter(isWordLearned).length;
  const totalPracticeAttempts = serverProgress?.totalPracticeAttempts ?? 
    (((serverProgress?.quizStatistics?.correctAnswers || 0) + (serverProgress?.quizStatistics?.wrongAnswers || 0)) ||
    vocabularies.reduce((sum, v) => sum + (v.correctCount || 0) + (v.wrongCount || 0), 0));
  const totalVocabSessions = serverProgress?.quizStatistics?.totalQuizzes ?? sessions.length;

  const totalVocabCorrect = serverProgress?.quizStatistics?.correctAnswers ?? 
    vocabularies.reduce((sum, v) => sum + (v.correctCount || 0), 0);
  const totalVocabWrong = serverProgress?.quizStatistics?.wrongAnswers ?? 
    vocabularies.reduce((sum, v) => sum + (v.wrongCount || 0), 0);
  const totalVocabAttempts = totalPracticeAttempts;
  const overallVocabAccuracy = serverProgress?.overallAccuracy ?? serverProgress?.quizStatistics?.averageAccuracy ?? 
    (totalVocabAttempts > 0 ? Math.round((totalVocabCorrect / totalVocabAttempts) * 100) : 0);

  const bestVocabStreak = serverProgress?.bestStreak || serverProgress?.streak || sessions.reduce((max, s) => Math.max(max, s.streak || 0), 0);

  // Weak Words and Hard Words lists
  const weakWordsList: any[] = useMemo(() => {
    if (serverProgress?.weakWords && Array.isArray(serverProgress.weakWords)) {
      return serverProgress.weakWords;
    }
    return vocabularies.filter(isWeakWord);
  }, [serverProgress?.weakWords, vocabularies]);

  const hardWordsList: any[] = useMemo(() => {
    if (serverProgress?.hardWords && Array.isArray(serverProgress.hardWords)) {
      return serverProgress.hardWords;
    }
    return vocabularies.filter(isHardWord);
  }, [serverProgress?.hardWords, vocabularies]);

  const weakWordsCount = serverProgress?.weakWordsCount ?? weakWordsList.length;
  const hardWordsCount = serverProgress?.hardWordsCount ?? hardWordsList.length;

  const masteredWords = vocabularies.filter(v => isWordLearned(v) || ((v.practiceCount || 0) >= 3 && ((v.correctCount || 0) / v.practiceCount) >= 0.8));
  const familiarWords = vocabularies.filter(v => (v.learningStatus === 'Familiar' || ((v.practiceCount || 0) >= 1 && ((v.correctCount || 0) / v.practiceCount) >= 0.5)) && !isWordLearned(v));
  const strugglingWords = vocabularies.filter(v => isWeakWord(v) || isHardWord(v) || v.learningStatus === 'Difficult');
  const unstudiedWords = vocabularies.filter(v => !isWordLearned(v) && !(v.practiceCount || 0));

  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; correct: number; attempts: number }> = {};
    vocabularies.forEach(v => {
      const cats = v.categories && v.categories.length > 0 ? v.categories : [v.category || 'General'];
      cats.forEach(cat => {
        if (!map[cat]) map[cat] = { total: 0, correct: 0, attempts: 0 };
        map[cat].total += 1;
        map[cat].correct += v.correctCount || 0;
        map[cat].attempts += (v.correctCount || 0) + (v.wrongCount || 0);
      });
    });
    return Object.entries(map)
      .map(([cat, data]) => ({
        category: cat,
        total: data.total,
        accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
        attempts: data.attempts
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [vocabularies]);

  const recentVocabSessions = [...sessions].slice(0, 10).reverse();

  // ==========================================
  // KANJI METRICS
  // ==========================================
  const totalKanji = serverProgress?.totalKanji ?? kanjis.length;
  const totalKanjiSessions = kanjiSessions.length;

  const kanjiPracticedList = kanjis.filter(k => (k.practiceCount || 0) > 0);
  const practicedKanjiCount = kanjiPracticedList.length;

  const totalKanjiCorrect = kanjis.reduce((sum, k) => sum + (k.correctCount || 0), 0);
  const totalKanjiWrong = kanjis.reduce((sum, k) => sum + (k.wrongCount || 0), 0);
  const totalKanjiAttempts = totalKanjiCorrect + totalKanjiWrong;
  const overallKanjiAccuracy = totalKanjiAttempts > 0 ? Math.round((totalKanjiCorrect / totalKanjiAttempts) * 100) : 0;

  const bestKanjiStreak = kanjiSessions.reduce((max, s) => Math.max(max, s.streak || 0), 0);

  const masteredKanji = kanjis.filter(isKanjiMastered);
  const familiarKanji = kanjis.filter(k => k.learningStatus === 'Familiar' && !isKanjiMastered(k));
  const strugglingKanji = kanjis.filter(k => (k.learningStatus === 'Difficult' || isWeakKanji(k)) && !isKanjiMastered(k));
  const unstudiedKanji = kanjis.filter(k => !isKanjiMastered(k) && (k.learningStatus === 'New' || !(k.practiceCount || 0)));

  const weakKanjiList = kanjis
    .filter(isWeakKanji)
    .sort((a, b) => {
      const accA = (a.practiceCount || 0) > 0 ? (a.correctCount || 0) / a.practiceCount : 1;
      const accB = (b.practiceCount || 0) > 0 ? (b.correctCount || 0) / b.practiceCount : 1;
      return accA - accB;
    });

  // Chapter-wise Kanji Progress
  const kanjiChapterStats = useMemo(() => {
    const chList = kanjiChapters && kanjiChapters.length > 0
      ? kanjiChapters
      : Array.from({ length: 24 }, (_, i) => ({
          id: `kch_${i+1}`,
          chapterNumber: i + 1,
          title: `Chapter ${i + 1}`,
          japaneseTitle: `第${i + 1}課`,
          createdAt: 0
        }));

    return chList.map(chItem => {
      const ch = chItem.chapterNumber;
      const chKanjis = kanjis.filter(k => k.source === 'Textbook' && k.chapter === ch);
      const total = chKanjis.length;
      const mastered = chKanjis.filter(isKanjiMastered).length;
      const practiced = chKanjis.filter(k => (k.practiceCount || 0) > 0).length;
      const chCorrect = chKanjis.reduce((s, k) => s + (k.correctCount || 0), 0);
      const chAttempts = chKanjis.reduce((s, k) => s + (k.correctCount || 0) + (k.wrongCount || 0), 0);
      const accuracy = chAttempts > 0 ? Math.round((chCorrect / chAttempts) * 100) : 0;

      return {
        chapter: ch,
        title: chItem.title,
        japaneseTitle: chItem.japaneseTitle,
        total,
        mastered,
        practiced,
        accuracy,
        kanjiChars: chKanjis.map(k => k.kanji || (k as any).character || '')
      };
    });
  }, [kanjis, kanjiChapters]);

  // Extra Kanji Stats
  const extraKanjiStats = useMemo(() => {
    const extraKanjis = kanjis.filter(k => k.source === 'Extra');
    const total = extraKanjis.length;
    const mastered = extraKanjis.filter(isKanjiMastered).length;
    const practiced = extraKanjis.filter(k => (k.practiceCount || 0) > 0).length;
    const chCorrect = extraKanjis.reduce((s, k) => s + (k.correctCount || 0), 0);
    const chAttempts = extraKanjis.reduce((s, k) => s + (k.correctCount || 0) + (k.wrongCount || 0), 0);
    const accuracy = chAttempts > 0 ? Math.round((chCorrect / chAttempts) * 100) : 0;

    return {
      total,
      mastered,
      practiced,
      accuracy,
      kanjiChars: extraKanjis.map(k => k.kanji || (k as any).character || '')
    };
  }, [kanjis]);

  // JLPT Level breakdown
  const jlptStats = useMemo(() => {
    const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
    return levels.map(lvl => {
      const lvlKanjis = kanjis.filter(k => k.jlpt === lvl);
      const total = lvlKanjis.length;
      const mastered = lvlKanjis.filter(isKanjiMastered).length;
      const correct = lvlKanjis.reduce((s, k) => s + (k.correctCount || 0), 0);
      const attempts = lvlKanjis.reduce((s, k) => s + (k.correctCount || 0) + (k.wrongCount || 0), 0);
      const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

      return { level: lvl, total, mastered, accuracy };
    }).filter(s => s.total > 0);
  }, [kanjis]);

  const recentKanjiSessions = [...kanjiSessions].slice(0, 10).reverse();

  // ==========================================
  // SECTION 13: LEVEL & CHAPTER PROGRESS METRICS
  // ==========================================
  const totalLevelVocab = totalWords;
  const vocabLearnedCount = wordsLearned;
  const vocabRemainingCount = Math.max(0, totalLevelVocab - vocabLearnedCount);
  const wordsPracticedPct = totalLevelVocab > 0 ? Math.round((wordsPracticed / totalLevelVocab) * 100) : 0;
  const wordsLearnedPct = totalLevelVocab > 0 ? Math.round((vocabLearnedCount / totalLevelVocab) * 100) : 0;

  const totalLevelKanji = serverProgress?.totalKanji ?? kanjis.length;
  const kanjiMasteredCount = serverProgress?.kanjiLearned ?? kanjis.filter(isKanjiMastered).length;
  const kanjiRemainingCount = serverProgress?.kanjiRemaining ?? Math.max(0, totalLevelKanji - kanjiMasteredCount);

  const totalItems = totalLevelVocab + totalLevelKanji;
  const totalLearnedItems = vocabLearnedCount + kanjiMasteredCount;
  const overallProgressPercentage = serverProgress?.overallProgressPercent ?? serverProgress?.overallPercentage ?? 
    (totalLevelVocab > 0 ? Math.round((wordsPracticed / totalLevelVocab) * 100) : 0);

  // 1. Textbook Chapters Progress (1–24 for N5, 25–50 for N4)
  const chapterProgressList = useMemo(() => {
    if (serverProgress?.chapterProgress && Array.isArray(serverProgress.chapterProgress) && serverProgress.chapterProgress.length > 0) {
      return serverProgress.chapterProgress;
    }
    const chDefs = vocabChapters.length > 0 
      ? vocabChapters 
      : Array.from({ length: 24 }, (_, i) => ({
          id: `vch_${i+1}`,
          chapterNumber: i + 1,
          title: `Chapter ${i + 1}`,
          japaneseTitle: `第${i + 1}課`,
          createdAt: 0
        }));

    return chDefs.map(ch => {
      const chWords = vocabularies.filter(
        v => v.chapter === ch.chapterNumber && v.destinationType !== 'extra' && !v.customChapterId && v.source !== 'Extra'
      );
      const chPracticed = chWords.filter(v => (v.practiceCount || 0) > 0).length;
      const chLearned = chWords.filter(isWordLearned).length;
      const pct = chWords.length > 0 ? Math.round((chPracticed / chWords.length) * 100) : 0;
      return {
        chapterNumber: ch.chapterNumber,
        title: ch.title || `Chapter ${ch.chapterNumber}`,
        japaneseTitle: ch.japaneseTitle || `第${ch.chapterNumber}課`,
        total: chWords.length,
        practiced: chPracticed,
        learned: chLearned,
        percentage: pct,
        empty: chWords.length === 0
      };
    });
  }, [serverProgress?.chapterProgress, vocabChapters, vocabularies]);

  // 2. Custom Chapters Progress
  const customChapterProgressList = useMemo(() => {
    if (serverProgress?.customChapterProgress && Array.isArray(serverProgress.customChapterProgress)) {
      return serverProgress.customChapterProgress;
    }
    const levelCustomChapters = customChapters.filter(cc => (cc.jlptLevel || 'N5') === currentLevel);
    return levelCustomChapters.map(cc => {
      const ccWords = vocabularies.filter(
        v => v.customChapterId && (v.customChapterId === cc.id || v.customChapterId === (cc as any)._id)
      );
      const chPracticed = ccWords.filter(v => (v.practiceCount || 0) > 0).length;
      const learned = ccWords.filter(isWordLearned).length;
      const total = ccWords.length;
      const pct = total > 0 ? Math.round((chPracticed / total) * 100) : 0;
      return {
        id: cc.id,
        name: cc.name,
        displayName: cc.displayName || cc.name,
        japaneseName: cc.japaneseName || '',
        description: cc.description || '',
        total,
        practiced: chPracticed,
        learned,
        percentage: pct,
        empty: total === 0
      };
    });
  }, [serverProgress?.customChapterProgress, customChapters, vocabularies, currentLevel]);

  // 3. Extra Vocabulary Progress
  const extraVocabProgress = useMemo(() => {
    if (serverProgress?.extraVocabularyProgress) {
      return serverProgress.extraVocabularyProgress;
    }
    const extraWords = vocabularies.filter(
      v => v.destinationType === 'extra' || (!v.customChapterId && (v.source === 'Extra' || !v.chapter || v.chapter <= 0))
    );
    const chPracticed = extraWords.filter(v => (v.practiceCount || 0) > 0).length;
    const learned = extraWords.filter(isWordLearned).length;
    const total = extraWords.length;
    const pct = total > 0 ? Math.round((chPracticed / total) * 100) : 0;
    return {
      total,
      practiced: chPracticed,
      learned,
      percentage: pct,
      empty: total === 0
    };
  }, [serverProgress?.extraVocabularyProgress, vocabularies]);

  // Brand new user flag
  const isBrandNewUser = vocabLearnedCount === 0 && totalVocabSessions === 0 && totalVocabAttempts === 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop-in">
      
      {/* Universal Back Button */}
      <div>
        <BackButton onClick={() => onNavigate('dashboard')} label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eeece6] pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1a1918] font-japanese">学習統計・進捗</h1>
          <p className="text-xs sm:text-sm text-[#6e6b66] mt-1">
            Track your Vocabulary and Kanji mastery curves, streaks, and chapter progress independently.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchProgress}
            disabled={isLoading}
            title="Refresh progress data"
            className="p-2 rounded-2xl bg-[#f2f0ea] border border-[#eeece6] text-[#6e6b66] hover:text-[#1a1918] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#d93829]' : ''}`} />
          </button>

          {/* Dual Tab Switcher */}
          <div className="inline-flex bg-[#f2f0ea] p-1 rounded-2xl border border-[#eeece6]">
            <button
              onClick={() => setActiveTab('vocab')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'vocab'
                  ? 'bg-white text-[#1a1918] shadow-xs'
                  : 'text-[#6e6b66] hover:text-[#1a1918]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#d93829]" />
              <span>Vocabulary Progress</span>
              <span className="text-[10px] bg-red-50 text-[#d93829] px-1.5 py-0.2 rounded-full font-mono">
                {vocabularies.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('kanji')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'kanji'
                  ? 'bg-white text-[#1a1918] shadow-xs'
                  : 'text-[#6e6b66] hover:text-[#1a1918]'
              }`}
            >
              <span className="font-japanese font-bold text-sm text-[#ea580c]">漢</span>
              <span>Kanji Progress</span>
              <span className="text-[10px] bg-orange-50 text-[#ea580c] px-1.5 py-0.2 rounded-full font-mono">
                {kanjis.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Brand New User Empty State Banner */}
      {isBrandNewUser && (
        <div className="p-6 rounded-3xl bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100/80 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#1a1918] text-sm sm:text-base">Start learning to see your progress here!</h4>
              <p className="text-xs text-[#6e6b66] mt-0.5">
                You currently have 0% progress and 0 words learned. Complete practice quizzes or browse vocabulary chapters to build your learning statistics.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 rounded-xl bg-white border border-[#eeece6] text-xs font-semibold text-[#1a1918] hover:bg-neutral-50 transition-colors cursor-pointer shadow-xs"
            >
              Browse Chapters
            </button>
            <button
              onClick={() => onNavigate('practice')}
              className="px-4 py-2 rounded-xl bg-[#d93829] text-white text-xs font-semibold hover:bg-[#b82e21] transition-colors cursor-pointer shadow-xs"
            >
              Start Quiz
            </button>
          </div>
        </div>
      )}

      {/* Section 13: Overall JLPT Progress Card */}
      <div className="bg-white rounded-3xl border border-[#eeece6] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f2f0ea] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#d93829] bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full">
                {currentLevel} Progress
              </span>
              <span className="text-xs text-[#8c8880]">• Overall Completion {overallProgressPercentage}%</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-jp text-[#1a1918]">
              {currentLevel} Mastery & Chapter Progress
            </h2>
          </div>

          {onSelectLevel && (
            <div className="flex items-center gap-1.5 p-1 bg-[#faf9f6] rounded-2xl border border-[#eeece6]">
              {(['N5', 'N4', 'N3'] as JLPTLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => onSelectLevel(lvl)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentLevel === lvl
                      ? 'bg-[#1a1918] text-white shadow-xs'
                      : 'text-[#6e6b66] hover:text-[#1a1918]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4 Stat Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6]">
            <span className="text-[10px] uppercase font-bold text-[#8c8880] tracking-wider block">Words Practiced</span>
            <div className="text-xl sm:text-2xl font-bold text-[#1a1918] mt-1">
              {wordsPracticed} <span className="text-xs text-[#8c8880] font-normal">/ {totalLevelVocab}</span>
            </div>
            <p className="text-[11px] text-[#8c8880] mt-0.5">{wordsPracticedPct}% practiced</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6]">
            <span className="text-[10px] uppercase font-bold text-[#8c8880] tracking-wider block">Words Learned</span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
              {vocabLearnedCount} <span className="text-xs text-[#8c8880] font-normal">/ {totalLevelVocab}</span>
            </div>
            <p className="text-[11px] text-[#8c8880] mt-0.5">{wordsLearnedPct}% learned</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6]">
            <span className="text-[10px] uppercase font-bold text-[#8c8880] tracking-wider block">Overall Accuracy</span>
            <div className="text-xl sm:text-2xl font-bold text-[#d93829] mt-1">
              {overallVocabAccuracy}%
            </div>
            <p className="text-[11px] text-[#8c8880] mt-0.5">{totalPracticeAttempts} practice attempts</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6]">
            <span className="text-[10px] uppercase font-bold text-[#8c8880] tracking-wider block">Attention Needed</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>{weakWordsCount} Weak</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>{hardWordsCount} Hard</span>
              </span>
            </div>
            <p className="text-[10px] text-[#8c8880] mt-1">Mistake classification</p>
          </div>
        </div>

        {/* Section A: Chapter-by-Chapter Progress Bars (Textbook Chapters 1–24) */}
        {chapterProgressList.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6e6b66] flex items-center justify-between">
              <span>Chapters (1–24)</span>
              <span className="text-[11px] text-[#8c8880] font-normal lowercase">{chapterProgressList.length} chapters</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
              {chapterProgressList.map(ch => (
                <div key={ch.chapterNumber} className="p-3 rounded-xl bg-[#faf9f6] border border-[#eeece6] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1a1918]">Chapter {ch.chapterNumber}</span>
                    <span className="font-bold text-[#d93829]">{ch.total > 0 ? `${ch.percentage}%` : '0%'}</span>
                  </div>
                  <div className="w-full bg-[#eeece6] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        ch.total === 0 ? 'bg-neutral-300' : ch.percentage === 100 ? 'bg-emerald-500' : ch.percentage >= 50 ? 'bg-amber-500' : 'bg-[#d93829]'
                      }`}
                      style={{ width: `${ch.total > 0 ? ch.percentage : 0}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#8c8880] flex justify-between items-center">
                    {ch.total === 0 ? (
                      <span className="text-neutral-400 italic">0 / 0 — No vocabulary yet</span>
                    ) : (
                      <>
                        <span>{ch.practiced ?? ch.learned ?? 0} / {ch.total} practiced</span>
                        <span className="font-medium text-[#1a1918]">
                          {ch.total - (ch.practiced ?? ch.learned ?? 0) === 0 ? 'Done ✓' : `${ch.total - (ch.practiced ?? ch.learned ?? 0)} left`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section B: Custom Chapters Progress Bars */}
        {customChapterProgressList.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-[#f2f0ea]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6e6b66] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FolderPlus className="w-3.5 h-3.5 text-purple-600" />
                <span>Custom Decks Progress</span>
              </span>
              <span className="text-[11px] text-[#8c8880] font-normal lowercase">{customChapterProgressList.length} custom decks</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {customChapterProgressList.map(cc => (
                <div key={cc.id || cc.name} className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1a1918] truncate">{cc.displayName || cc.name}</span>
                    <span className="font-bold text-purple-700">{cc.total > 0 ? `${cc.percentage}%` : '0%'}</span>
                  </div>
                  {cc.japaneseName && (
                    <div className="text-[10px] text-purple-600/80 font-japanese font-semibold">{cc.japaneseName}</div>
                  )}
                  <div className="w-full bg-purple-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        cc.total === 0 ? 'bg-neutral-300' : cc.percentage === 100 ? 'bg-emerald-500' : cc.percentage >= 50 ? 'bg-amber-500' : 'bg-purple-600'
                      }`}
                      style={{ width: `${cc.total > 0 ? cc.percentage : 0}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#8c8880] flex justify-between items-center">
                    {cc.total === 0 ? (
                      <span className="text-neutral-400 italic">0 / 0 — No vocabulary yet</span>
                    ) : (
                      <>
                        <span>{cc.practiced ?? cc.learned ?? 0} / {cc.total} practiced</span>
                        <span className="font-medium text-purple-900">
                          {cc.total - (cc.practiced ?? cc.learned ?? 0) === 0 ? 'Done ✓' : `${cc.total - (cc.practiced ?? cc.learned ?? 0)} left`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section C: Extra Vocabulary Progress */}
        <div className="pt-3 border-t border-[#f2f0ea]">
          <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Extra Vocabulary
                </span>
                <span className="text-xs font-bold text-[#1a1918]">Unassigned & Supplementary Words</span>
              </div>
              <p className="text-[11px] text-[#8c8880] mt-0.5">
                {extraVocabProgress.total === 0 ? (
                  <span className="text-neutral-400 italic">0 / 0 — No vocabulary yet</span>
                ) : (
                  `${extraVocabProgress.practiced ?? extraVocabProgress.learned ?? 0} of ${extraVocabProgress.total} words practiced (${extraVocabProgress.percentage}%)`
                )}
              </p>
            </div>
            <div className="w-full sm:w-48 bg-amber-100 h-2 rounded-full overflow-hidden shrink-0">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  extraVocabProgress.total === 0 ? 'bg-neutral-300' : extraVocabProgress.percentage === 100 ? 'bg-emerald-500' : 'bg-amber-600'
                }`}
                style={{ width: `${extraVocabProgress.total > 0 ? extraVocabProgress.percentage : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. VOCABULARY TAB */}
      {/* ======================================================== */}
      {activeTab === 'vocab' && (
        <div className="space-y-8 animate-pop-in">
          {/* Top 5 Vocabulary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#eeece6] shadow-xs">
              <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider">Total Words</span>
              <div className="text-3xl font-bold font-mono text-[#1a1918] mt-2">{totalWords}</div>
              <p className="text-[11px] text-[#8c8880] mt-1">{currentLevel} Vocabulary Bank</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#eeece6] shadow-xs">
              <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider">Words Practiced</span>
              <div className="text-3xl font-bold font-mono text-indigo-600 mt-2">
                {wordsPracticed} <span className="text-sm font-normal text-[#8c8880]">/ {totalWords}</span>
              </div>
              <p className="text-[11px] text-[#8c8880] mt-1">{wordsPracticedPct}% of library explored</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#eeece6] shadow-xs">
              <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider">Overall Accuracy</span>
              <div className={`text-3xl font-bold font-mono mt-2 ${
                overallVocabAccuracy >= 80 ? 'text-emerald-600' : overallVocabAccuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {overallVocabAccuracy}%
              </div>
              <p className="text-[11px] text-[#8c8880] mt-1">{totalPracticeAttempts} total trials</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#eeece6] shadow-xs">
              <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider">Correct / Wrong</span>
              <div className="text-2xl font-bold font-mono text-[#1a1918] mt-2 flex items-baseline gap-1.5">
                <span className="text-emerald-600">{totalVocabCorrect}</span>
                <span className="text-[#8c8880] text-sm">/</span>
                <span className="text-rose-600">{totalVocabWrong}</span>
              </div>
              <p className="text-[11px] text-[#8c8880] mt-1">Recalled vs Missed</p>
            </div>

            <div className="bg-gradient-to-br from-white to-[#fff8f5] p-5 rounded-2xl border border-[#fed7aa] shadow-xs">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> Best Streak
              </span>
              <div className="text-3xl font-bold font-mono text-orange-600 mt-2">{bestVocabStreak}</div>
              <p className="text-[11px] text-orange-700/80 mt-1">Highest unbroken run</p>
            </div>
          </div>

          {/* Mastery Breakdown Bar */}
          <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1a1918]">Vocabulary Mastery Distribution</h2>
              <span className="text-xs text-[#8c8880]">{totalWords} words total</span>
            </div>

            <div className="h-4 w-full rounded-full bg-[#eeece6] overflow-hidden flex">
              <div 
                style={{ width: `${totalWords > 0 ? (masteredWords.length / totalWords) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Mastered: ${masteredWords.length}`}
              />
              <div 
                style={{ width: `${totalWords > 0 ? (familiarWords.length / totalWords) * 100 : 0}%` }}
                className="bg-blue-400 h-full transition-all"
                title={`Familiar: ${familiarWords.length}`}
              />
              <div 
                style={{ width: `${totalWords > 0 ? (strugglingWords.length / totalWords) * 100 : 0}%` }}
                className="bg-rose-400 h-full transition-all"
                title={`Needs Revision: ${strugglingWords.length}`}
              />
              <div 
                style={{ width: `${totalWords > 0 ? (unstudiedWords.length / totalWords) * 100 : 0}%` }}
                className="bg-neutral-300 h-full transition-all"
                title={`Unstudied: ${unstudiedWords.length}`}
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                <div>
                  <span className="font-semibold text-[#1a1918]">Mastered ({masteredWords.length})</span>
                  <p className="text-[10px] text-[#8c8880]">≥ 80% accuracy, 3+ trials</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-400 shrink-0"></span>
                <div>
                  <span className="font-semibold text-[#1a1918]">Familiar ({familiarWords.length})</span>
                  <p className="text-[10px] text-[#8c8880]">50% - 79% accuracy</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400 shrink-0"></span>
                <div>
                  <span className="font-semibold text-[#1a1918]">Needs Review ({strugglingWords.length})</span>
                  <p className="text-[10px] text-[#8c8880]">&lt; 50% accuracy or wrong</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-neutral-300 shrink-0"></span>
                <div>
                  <span className="font-semibold text-[#1a1918]">Unstudied ({unstudiedWords.length})</span>
                  <p className="text-[10px] text-[#8c8880]">0 practice sessions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Session Trend */}
            <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs">
              <h3 className="text-base font-bold text-[#1a1918] mb-1">Recent Quiz Accuracy Trend</h3>
              <p className="text-xs text-[#8c8880] mb-6">Performance across your last {recentVocabSessions.length} sessions</p>

              {recentVocabSessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8c8880]">
                  Complete your first vocabulary practice session to see trend analytics!
                </div>
              ) : (
                <div className="h-44 flex items-end gap-2 sm:gap-3 pt-6 border-b border-[#eeece6] px-2">
                  {recentVocabSessions.map((s, idx) => (
                    <div key={s.id || idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a1918] text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap pointer-events-none z-10 shadow-xs">
                        {s.accuracy}% ({s.correctCount}/{s.totalQuestions})
                      </div>
                      <div className="w-full bg-[#f7f6f2] rounded-t-lg flex items-end h-32 overflow-hidden">
                        <div
                          style={{ height: `${Math.max(10, s.accuracy)}%` }}
                          className={`w-full rounded-t-lg transition-all ${
                            s.accuracy >= 80 ? 'bg-emerald-500' : s.accuracy >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[#8c8880]">#{idx + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Performance */}
            <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs">
              <h3 className="text-base font-bold text-[#1a1918] mb-1">Category Accuracy</h3>
              <p className="text-xs text-[#8c8880] mb-4">Mastery breakdown by topic and grammatical category</p>

              <div className="space-y-3">
                {categoryStats.map(cat => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-[#1a1918]">{cat.category} ({cat.total} words)</span>
                      <span className="font-mono text-[#6e6b66]">{cat.accuracy}% Acc</span>
                    </div>
                    <div className="w-full bg-[#f7f6f2] h-2 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${cat.accuracy}%` }}
                        className="bg-[#d93829] h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 1. Weak Vocabulary Words */}
          <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#eeece6] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <h3 className="text-base font-bold text-[#1a1918]">Weak Words (復習対象)</h3>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    {weakWordsCount}
                  </span>
                </div>
                <p className="text-xs text-[#8c8880] mt-0.5">
                  Words marked after 1 mistake. A correct answer will return them to normal status.
                </p>
              </div>
              {weakWordsList.length > 0 && onPracticeDifficultWords && (
                <button
                  onClick={() => onPracticeDifficultWords(weakWordsList)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                >
                  Practice Weak Words ({weakWordsList.length})
                </button>
              )}
            </div>

            {weakWordsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8c8880]">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-[#1a1918]">No weak words detected!</p>
                <p className="mt-0.5">Keep practicing to test your vocabulary retention.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#8c8880] uppercase tracking-wider font-semibold border-b border-[#eeece6]">
                    <tr>
                      <th className="py-2.5 px-3">Japanese</th>
                      <th className="py-2.5 px-3">Reading</th>
                      <th className="py-2.5 px-3">English Meaning</th>
                      <th className="py-2.5 px-3">Origin</th>
                      <th className="py-2.5 px-3">Trials</th>
                      <th className="py-2.5 px-3">Accuracy</th>
                      <th className="py-2.5 px-3 text-right">Audio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eeece6]">
                    {weakWordsList.slice(0, 15).map((w: any) => {
                      const pCount = w.practiceCount || 0;
                      const cCount = w.correctCount || 0;
                      const wCount = w.wrongCount || 0;
                      const acc = w.accuracy !== undefined 
                        ? w.accuracy 
                        : (pCount > 0 ? Math.round((cCount / pCount) * 100) : 0);
                      return (
                        <tr key={w.id || w._id} className="hover:bg-[#faf9f6]">
                          <td className="py-2.5 px-3 font-japanese font-bold text-base text-[#1a1918]">{w.japanese}</td>
                          <td className="py-2.5 px-3 font-mono text-[#8c8880]">{w.reading}</td>
                          <td className="py-2.5 px-3 font-medium text-[#1a1918]">{w.english}</td>
                          <td className="py-2.5 px-3 text-[#8c8880]">
                            {w.chapter ? `Ch ${w.chapter}` : w.source || 'Extra'}
                          </td>
                          <td className="py-2.5 px-3 text-[#6e6b66]">{pCount} ({wCount} wrong)</td>
                          <td className="py-2.5 px-3 font-bold text-rose-600">{acc}%</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => soundEffects.speakJapanese(w.japanese)}
                              className="p-1 rounded text-neutral-400 hover:text-[#d93829]"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2. Hard Vocabulary Words */}
          <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#eeece6] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="text-base font-bold text-[#1a1918]">Hard Words (難問)</h3>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {hardWordsCount}
                  </span>
                </div>
                <p className="text-xs text-[#8c8880] mt-0.5">
                  Words with repeated mistakes requiring focused practice and extra recall drills.
                </p>
              </div>
              {hardWordsList.length > 0 && onPracticeHardWords && (
                <button
                  onClick={() => onPracticeHardWords(hardWordsList)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 rounded-xl transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                >
                  Practice Hard Words ({hardWordsList.length})
                </button>
              )}
            </div>

            {hardWordsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8c8880]">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-[#1a1918]">No hard words detected!</p>
                <p className="mt-0.5">You have mastered your challenging vocabulary terms.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#8c8880] uppercase tracking-wider font-semibold border-b border-[#eeece6]">
                    <tr>
                      <th className="py-2.5 px-3">Japanese</th>
                      <th className="py-2.5 px-3">Reading</th>
                      <th className="py-2.5 px-3">English Meaning</th>
                      <th className="py-2.5 px-3">Origin</th>
                      <th className="py-2.5 px-3">Trials</th>
                      <th className="py-2.5 px-3">Accuracy</th>
                      <th className="py-2.5 px-3 text-right">Audio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eeece6]">
                    {hardWordsList.slice(0, 15).map((w: any) => {
                      const pCount = w.practiceCount || 0;
                      const cCount = w.correctCount || 0;
                      const wCount = w.wrongCount || 0;
                      const acc = w.accuracy !== undefined 
                        ? w.accuracy 
                        : (pCount > 0 ? Math.round((cCount / pCount) * 100) : 0);
                      return (
                        <tr key={w.id || w._id} className="hover:bg-[#faf9f6]">
                          <td className="py-2.5 px-3 font-japanese font-bold text-base text-[#1a1918]">{w.japanese}</td>
                          <td className="py-2.5 px-3 font-mono text-[#8c8880]">{w.reading}</td>
                          <td className="py-2.5 px-3 font-medium text-[#1a1918]">{w.english}</td>
                          <td className="py-2.5 px-3 text-[#8c8880]">
                            {w.chapter ? `Ch ${w.chapter}` : w.source || 'Extra'}
                          </td>
                          <td className="py-2.5 px-3 text-[#6e6b66]">{pCount} ({wCount} wrong)</td>
                          <td className="py-2.5 px-3 font-bold text-amber-600">{acc}%</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => soundEffects.speakJapanese(w.japanese)}
                              className="p-1 rounded text-neutral-400 hover:text-[#d93829]"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Practice Session History Log */}
          <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#eeece6] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-[#1a1918]">Vocabulary Practice History</h3>
              </div>
              <span className="text-xs text-[#8c8880]">{sessions.length} sessions recorded</span>
            </div>

            {sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8c8880]">
                No practice sessions recorded yet. Start practicing to see your history!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#8c8880] uppercase tracking-wider font-semibold border-b border-[#eeece6]">
                    <tr>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Questions</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Accuracy</th>
                      <th className="py-2.5 px-3">Max Streak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eeece6]">
                    {sessions.slice(0, 15).map(s => {
                      const date = new Date(s.timestamp);
                      const formattedDate = date.toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });
                      return (
                        <tr key={s.id} className="hover:bg-[#faf9f6]">
                          <td className="py-2.5 px-3 font-mono text-[#8c8880]">{formattedDate}</td>
                          <td className="py-2.5 px-3 capitalize font-semibold text-[#1a1918]">
                            {s.mode} {s.categoryFilter ? `(${s.categoryFilter})` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-[#6e6b66]">{s.totalQuestions} words</td>
                          <td className="py-2.5 px-3 font-mono font-medium text-[#1a1918]">
                            {s.correctCount} / {s.totalQuestions}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`font-bold ${
                              s.accuracy >= 80 ? 'text-emerald-600' : s.accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {s.accuracy}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-orange-600 font-bold">
                            🔥 {s.streak}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. KANJI TAB */}
      {/* ======================================================== */}
      {activeTab === 'kanji' && (
        <div className="space-y-8 animate-pop-in">
          
          {/* Top 6 Kanji Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-xs">
              <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider">Total Kanji</span>
              <div className="text-3xl font-bold font-mono text-[#ea580c] mt-2">{totalKanji}</div>
              <p className="text-[11px] text-[#8c8880] mt-1">Characters saved</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#eeece6] shadow-xs">
              <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider">Practiced</span>
              <div className="text-3xl font-bold font-mono text-indigo-600 mt-2">{practicedKanjiCount}</div>
              <p className="text-[11px] text-[#8c8880] mt-1">{totalKanji > 0 ? Math.round((practicedKanjiCount / totalKanji) * 100) : 0}% active</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#eeece6] shadow-xs">
              <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider">Mastered</span>
              <div className="text-3xl font-bold font-mono text-emerald-600 mt-2">{masteredKanji.length}</div>
              <p className="text-[11px] text-[#8c8880] mt-1">≥ 80% accuracy</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#eeece6] shadow-xs">
              <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider">Weak Kanji</span>
              <div className={`text-3xl font-bold font-mono mt-2 ${weakKanjiList.length > 0 ? 'text-rose-600' : 'text-[#8c8880]'}`}>
                {weakKanjiList.length}
              </div>
              <p className="text-[11px] text-[#8c8880] mt-1">Need SRS revision</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#eeece6] shadow-xs">
              <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider">Kanji Accuracy</span>
              <div className={`text-3xl font-bold font-mono mt-2 ${
                overallKanjiAccuracy >= 80 ? 'text-emerald-600' : overallKanjiAccuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {overallKanjiAccuracy}%
              </div>
              <p className="text-[11px] text-[#8c8880] mt-1">{totalKanjiAttempts} attempts</p>
            </div>

            <div className="bg-gradient-to-br from-white to-[#fff8f5] p-5 rounded-2xl border border-[#fed7aa] shadow-xs">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> Best Streak
              </span>
              <div className="text-3xl font-bold font-mono text-orange-600 mt-2">{bestKanjiStreak}</div>
              <p className="text-[11px] text-orange-700/80 mt-1">In Kanji quizzes</p>
            </div>

          </div>

          {/* Kanji Mastery Breakdown Bar */}
          <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#ea580c]" />
                <h2 className="text-base font-bold text-[#1a1918]">Kanji Mastery Distribution</h2>
              </div>
              <span className="text-xs text-[#8c8880]">{totalKanji} Kanji characters</span>
            </div>

            <div className="h-4 w-full rounded-full bg-[#eeece6] overflow-hidden flex">
              <div 
                style={{ width: `${totalKanji > 0 ? (masteredKanji.length / totalKanji) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Mastered: ${masteredKanji.length}`}
              />
              <div 
                style={{ width: `${totalKanji > 0 ? (familiarKanji.length / totalKanji) * 100 : 0}%` }}
                className="bg-blue-400 h-full transition-all"
                title={`Familiar: ${familiarKanji.length}`}
              />
              <div 
                style={{ width: `${totalKanji > 0 ? (strugglingKanji.length / totalKanji) * 100 : 0}%` }}
                className="bg-rose-400 h-full transition-all"
                title={`Difficult: ${strugglingKanji.length}`}
              />
              <div 
                style={{ width: `${totalKanji > 0 ? (unstudiedKanji.length / totalKanji) * 100 : 0}%` }}
                className="bg-neutral-300 h-full transition-all"
                title={`New / Unstudied: ${unstudiedKanji.length}`}
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                <div>
                  <span className="font-semibold text-[#1a1918]">Mastered ({masteredKanji.length})</span>
                  <p className="text-[10px] text-[#8c8880]">≥ 80% accuracy, 3+ correct</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-400 shrink-0"></span>
                <div>
                  <span className="font-semibold text-[#1a1918]">Familiar ({familiarKanji.length})</span>
                  <p className="text-[10px] text-[#8c8880]">50% - 79% accuracy</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400 shrink-0"></span>
                <div>
                  <span className="font-semibold text-[#1a1918]">Needs Review ({strugglingKanji.length})</span>
                  <p className="text-[10px] text-[#8c8880]">&lt; 50% accuracy or wrong &gt; 0</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-neutral-300 shrink-0"></span>
                <div>
                  <span className="font-semibold text-[#1a1918]">New ({unstudiedKanji.length})</span>
                  <p className="text-[10px] text-[#8c8880]">0 practice sessions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chapter-wise Kanji Progress (24 Chapters + Extra) */}
          <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#eeece6] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1a1918]">Chapter-wise Kanji Mastery</h3>
                <p className="text-xs text-[#8c8880] mt-0.5">24 chapters mastery tracking</p>
              </div>
              <button
                onClick={() => onNavigate('kanji-list')}
                className="text-xs font-semibold text-[#ea580c] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Kanji Library</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {kanjiChapterStats.map(stat => {
                const percent = stat.total > 0 ? Math.round((stat.mastered / stat.total) * 100) : 0;
                return (
                  <div
                    key={stat.chapter}
                    onClick={() => onSelectKanjiChapter?.(stat.chapter)}
                    className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] hover:border-[#ea580c]/50 hover:bg-white transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold font-mono text-[#ea580c] bg-orange-50 px-1.5 py-0.5 rounded">
                          CH {stat.chapter}
                        </span>
                        <span className="text-xs font-bold font-mono text-[#6e6b66]">
                          {stat.mastered}/{stat.total} Mastered
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="font-japanese font-bold text-sm text-[#1a1918]">第{stat.chapter}課 漢字</span>
                        <span className={`text-xs font-bold font-mono ${percent === 100 ? 'text-emerald-600' : 'text-[#8c8880]'}`}>
                          {percent}%
                        </span>
                      </div>

                      {/* Character preview preview */}
                      <div className="mt-2 flex flex-wrap gap-1 min-h-[22px]">
                        {stat.kanjiChars.length > 0 ? (
                          stat.kanjiChars.map((char, i) => (
                            <span key={i} className="text-sm font-japanese font-bold text-[#1a1918]">
                              {char}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#b4b0a8] italic">No kanji assigned yet</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`h-full rounded-full transition-all ${
                          percent === 100 ? 'bg-emerald-500' : 'bg-[#ea580c]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Extra Kanji Summary */}
            {extraKanjiStats.total > 0 && (
              <div 
                onClick={() => onSelectKanjiChapter?.('extra')}
                className="mt-2 p-4 rounded-2xl bg-orange-50/50 border border-orange-200 hover:bg-orange-50 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono uppercase bg-orange-200 text-orange-800 px-2 py-0.5 rounded-md">
                      Extra Kanji Deck
                    </span>
                    <span className="text-xs font-bold text-[#1a1918]">Extra & Custom Kanji</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-sm font-japanese font-bold text-[#ea580c]">
                    {extraKanjiStats.kanjiChars.slice(0, 10).join(' ')}
                    {extraKanjiStats.kanjiChars.length > 10 && ' ...'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-[#ea580c]">
                    {extraKanjiStats.mastered}/{extraKanjiStats.total} Mastered
                  </span>
                  <p className="text-[10px] text-[#8c8880]">{extraKanjiStats.accuracy}% accuracy</p>
                </div>
              </div>
            )}
          </div>

          {/* JLPT Breakdown */}
          {jlptStats.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#1a1918]">JLPT Level Distribution</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {jlptStats.map(s => (
                  <div key={s.level} className="p-3.5 bg-[#faf9f6] rounded-2xl border border-[#eeece6]">
                    <span className="text-xs font-bold text-[#ea580c]">{s.level}</span>
                    <div className="text-xl font-bold font-mono text-[#1a1918] mt-1">{s.total} Kanji</div>
                    <div className="text-[11px] text-[#8c8880] mt-1 flex justify-between">
                      <span>{s.mastered} Mastered</span>
                      <span className="font-semibold text-emerald-600">{s.accuracy}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weak Kanji Needing Review */}
          <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#eeece6] pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="text-base font-bold text-[#1a1918]">Weak Kanji Needing Review</h3>
                  <p className="text-xs text-[#8c8880]">Kanji with wrong attempts or low accuracy</p>
                </div>
              </div>
              {weakKanjiList.length > 0 && onPracticeWeakKanjis && (
                <button
                  onClick={() => onPracticeWeakKanjis(weakKanjiList)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Practice Weak Kanji ({weakKanjiList.length})
                </button>
              )}
            </div>

            {weakKanjiList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8c8880]">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-medium text-[#1a1918]">No weak Kanji detected!</p>
                <p className="text-xs text-[#8c8880] mt-1">All practiced characters currently meet high retention rates.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#8c8880] uppercase tracking-wider font-semibold border-b border-[#eeece6]">
                    <tr>
                      <th className="py-2.5 px-3">Kanji</th>
                      <th className="py-2.5 px-3">Meaning</th>
                      <th className="py-2.5 px-3">On / Kun Readings</th>
                      <th className="py-2.5 px-3">Chapter</th>
                      <th className="py-2.5 px-3">Trials</th>
                      <th className="py-2.5 px-3">Accuracy</th>
                      <th className="py-2.5 px-3 text-right">Audio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eeece6]">
                    {weakKanjiList.map(k => {
                      const acc = k.practiceCount > 0 
                        ? Math.round((k.correctCount / k.practiceCount) * 100) 
                        : 0;
                      return (
                        <tr key={k.id} className="hover:bg-[#faf9f6]">
                          <td className="py-2.5 px-3 font-japanese font-bold text-2xl text-[#ea580c]">{k.kanji}</td>
                          <td className="py-2.5 px-3 font-medium text-[#1a1918]">{k.meaning}</td>
                          <td className="py-2.5 px-3 font-mono text-[#6e6b66]">
                            {k.onyomi && <div>音: {k.onyomi}</div>}
                            {k.kunyomi && <div>訓: {k.kunyomi}</div>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] font-bold font-mono text-[#ea580c] bg-orange-50 px-1.5 py-0.5 rounded">
                              {k.chapter ? `CH ${k.chapter}` : 'Extra'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#6e6b66]">{k.practiceCount} ({k.wrongCount} wrong)</td>
                          <td className="py-2.5 px-3 font-bold text-rose-600">{acc}%</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => soundEffects.speakJapanese(k.onyomi || k.kunyomi || k.kanji)}
                              className="p-1 rounded text-neutral-400 hover:text-[#ea580c]"
                              title="Listen"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Kanji Practice Session History Log */}
          <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#eeece6] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-bold text-[#1a1918]">Kanji Practice History</h3>
              </div>
              <span className="text-xs text-[#8c8880]">{kanjiSessions.length} sessions recorded</span>
            </div>

            {kanjiSessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8c8880]">
                No Kanji practice sessions recorded yet. Start practicing Kanji to see your history!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#8c8880] uppercase tracking-wider font-semibold border-b border-[#eeece6]">
                    <tr>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Test Type</th>
                      <th className="py-2.5 px-3">Questions</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Accuracy</th>
                      <th className="py-2.5 px-3">Max Streak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eeece6]">
                    {kanjiSessions.slice(0, 15).map(s => {
                      const date = new Date(s.timestamp);
                      const formattedDate = date.toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });
                      return (
                        <tr key={s.id} className="hover:bg-[#faf9f6]">
                          <td className="py-2.5 px-3 font-mono text-[#8c8880]">{formattedDate}</td>
                          <td className="py-2.5 px-3 capitalize font-semibold text-[#1a1918]">
                            {s.mode}
                          </td>
                          <td className="py-2.5 px-3 capitalize text-[#ea580c] font-medium">
                            {s.testType}
                          </td>
                          <td className="py-2.5 px-3 text-[#6e6b66]">{s.totalQuestions} kanji</td>
                          <td className="py-2.5 px-3 font-mono font-medium text-[#1a1918]">
                            {s.correctCount} / {s.totalQuestions}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`font-bold ${
                              s.accuracy >= 80 ? 'text-emerald-600' : s.accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {s.accuracy}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-orange-600 font-bold">
                            🔥 {s.streak}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
