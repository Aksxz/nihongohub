import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  KanjiItem, 
  KanjiPracticeModeType, 
  KanjiTestType, 
  KanjiPracticeSession, 
  KanjiPracticeWordResult,
  JLPTLevel
} from '../types/kanji';
import { 
  Sparkles, 
  Volume2, 
  Flame, 
  BookOpen, 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Brain, 
  RotateCcw,
  Layers,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { checkKanjiAnswer, KanjiCheckResult } from '../utils/kanjiChecker';
import { soundEffects } from '../utils/audio';
import { isWeakKanji, getSmartKanjiPracticeQueue } from '../utils/kanjiSrs';
import { BackButton } from './BackButton';

import { ChapterItem } from '../types/chapter';

interface KanjiPracticeModeProps {
  kanjis: KanjiItem[];
  kanjiChapters?: ChapterItem[];
  onSaveSession: (session: Omit<KanjiPracticeSession, 'id' | 'timestamp'>, results: { kanjiId: string; isCorrect: boolean }[]) => Promise<void>;
  onBack: () => void;
  initialMode?: KanjiPracticeModeType;
  initialKanjis?: KanjiItem[];
  initialTitle?: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const KanjiPracticeMode: React.FC<KanjiPracticeModeProps> = ({
  kanjis,
  kanjiChapters = [],
  onSaveSession,
  onBack,
  initialMode = 'all',
  initialKanjis,
  initialTitle
}) => {
  // Practice Setup State
  const [selectedMode, setSelectedMode] = useState<KanjiPracticeModeType>(initialMode);
  const [selectedTestType, setSelectedTestType] = useState<KanjiTestType>('meaning');
  const [selectedSingleChapter, setSelectedSingleChapter] = useState<number>(1);
  const [selectedMultiChapters, setSelectedMultiChapters] = useState<Set<number>>(new Set([1, 2]));
  const [selectedJlpt, setSelectedJlpt] = useState<JLPTLevel>('N5');
  const [questionCountLimit, setQuestionCountLimit] = useState<number | 'all'>(10);

  const chapterNumbers = useMemo(() => {
    if (kanjiChapters && kanjiChapters.length > 0) {
      return kanjiChapters.map(c => c.chapterNumber);
    }
    const nums = new Set<number>();
    kanjis.forEach(k => {
      if (k.chapter) nums.add(k.chapter);
    });
    return nums.size > 0 ? Array.from(nums).sort((a, b) => a - b) : Array.from({ length: 24 }, (_, i) => i + 1);
  }, [kanjiChapters, kanjis]);

  // Active Quiz State
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false);
  const [quizQueue, setQuizQueue] = useState<KanjiItem[]>([]);
  const [questionTestTypes, setQuestionTestTypes] = useState<('meaning' | 'reading')[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [checkResult, setCheckResult] = useState<KanjiCheckResult | null>(null);

  // Live Performance Tracking
  const [sessionResults, setSessionResults] = useState<KanjiPracticeWordResult[]>([]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);

  // Completed Session State
  const [completedSession, setCompletedSession] = useState<KanjiPracticeSession | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSubmitTimeRef = useRef<number>(0);
  const transitionTimeRef = useRef<number>(0);

  // Synchronous references to avoid stale closure state during rapid completion
  const resultsRef = useRef<KanjiPracticeWordResult[]>([]);
  const preparedCompletedSessionRef = useRef<KanjiPracticeSession | null>(null);
  const isSavingFinalSessionRef = useRef<boolean>(false);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Global window keydown listener for seamless Enter key progression across devices
  useEffect(() => {
    if (!isQuizActive) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (e.target === inputRef.current && !isSubmitted) {
          return;
        }

        if (isSubmitted) {
          e.preventDefault();
          if (Date.now() - lastSubmitTimeRef.current > 200) {
            handleNextWord();
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isQuizActive, isSubmitted, currentIndex, quizQueue.length]);

  // Launch immediately if initialKanjis provided (e.g. from Chapter View)
  useEffect(() => {
    if (initialKanjis && initialKanjis.length > 0) {
      startQuizWithItems(initialKanjis, initialMode, selectedTestType);
    }
  }, [initialKanjis]);

  // Autofocus input
  useEffect(() => {
    if (isQuizActive && !isSubmitted) {
      inputRef.current?.focus();
    }
  }, [isQuizActive, currentIndex, isSubmitted]);

  // Toggle chapter in multi-chapter selection
  const toggleMultiChapter = (ch: number) => {
    const next = new Set(selectedMultiChapters);
    if (next.has(ch)) {
      if (next.size > 1) next.delete(ch);
    } else {
      next.add(ch);
    }
    setSelectedMultiChapters(next);
  };

  // Compute eligible items based on current mode
  const eligibleItems = useMemo(() => {
    switch (selectedMode) {
      case 'chapter':
        return kanjis.filter(k => k.source === 'Textbook' && k.chapter === selectedSingleChapter);

      case 'multi-chapter':
        return kanjis.filter(k => k.source === 'Textbook' && k.chapter && selectedMultiChapters.has(k.chapter));

      case 'extra':
        return kanjis.filter(k => k.source === 'Extra');

      case 'jlpt':
        return kanjis.filter(k => k.jlpt === selectedJlpt);

      case 'weak':
        return kanjis.filter(isWeakKanji);

      case 'new':
        return kanjis.filter(k => (k.practiceCount || 0) === 0);

      case 'smart':
        return getSmartKanjiPracticeQueue(kanjis, 50);

      case 'custom':
        return initialKanjis || [];

      case 'all':
      default:
        return kanjis;
    }
  }, [kanjis, selectedMode, selectedSingleChapter, selectedMultiChapters, selectedJlpt, initialKanjis]);

  const startQuizWithItems = (items: KanjiItem[], mode: KanjiPracticeModeType, testType: KanjiTestType) => {
    if (items.length === 0) return;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    let finalQueue: KanjiItem[];
    if (mode === 'smart') {
      finalQueue = questionCountLimit === 'all' ? items : items.slice(0, Number(questionCountLimit));
    } else {
      const shuffled = shuffleArray(items);
      finalQueue = questionCountLimit === 'all' 
        ? shuffled 
        : shuffled.slice(0, Number(questionCountLimit));
    }

    // Determine test type for each question (if mixed, randomly assign meaning or reading)
    const types: ('meaning' | 'reading')[] = finalQueue.map(() => {
      if (testType === 'mixed') {
        return Math.random() > 0.5 ? 'meaning' : 'reading';
      }
      return testType;
    });

    setQuizQueue(finalQueue);
    setQuestionTestTypes(types);
    setCurrentIndex(0);
    setUserAnswer('');
    setIsSubmitted(false);
    setCheckResult(null);
    setSessionResults([]);
    resultsRef.current = [];
    preparedCompletedSessionRef.current = null;
    isSavingFinalSessionRef.current = false;
    setCurrentStreak(0);
    setBestStreak(0);
    setCompletedSession(null);
    setIsQuizActive(true);
    transitionTimeRef.current = Date.now();
  };

  const handleStartPractice = () => {
    startQuizWithItems(eligibleItems, selectedMode, selectedTestType);
  };

  const handleCheckAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitted || !isQuizActive || !userAnswer.trim() || Date.now() - transitionTimeRef.current < 200) return;

    const currentKanji = quizQueue[currentIndex];
    const currentTestType = questionTestTypes[currentIndex] || 'meaning';
    if (!currentKanji) return;

    lastSubmitTimeRef.current = Date.now();

    const result = checkKanjiAnswer(userAnswer, currentKanji, currentTestType);
    setCheckResult(result);
    setIsSubmitted(true);

    const isCorrect = result.isCorrect;
    const newStreak = isCorrect ? currentStreak + 1 : 0;
    setCurrentStreak(newStreak);
    if (newStreak > bestStreak) {
      setBestStreak(newStreak);
    }

    // Audio Feedback
    if (isCorrect) {
      soundEffects.playCorrectChime();
    } else {
      soundEffects.playWrongTone();
    }

    const wordRes: KanjiPracticeWordResult = {
      kanjiId: currentKanji.id,
      kanji: currentKanji.kanji,
      meaning: currentKanji.meaning,
      onyomi: currentKanji.onyomi,
      kunyomi: currentKanji.kunyomi,
      romaji: currentKanji.romaji,
      testType: currentTestType,
      prompt: currentKanji.kanji,
      userAnswer: userAnswer.trim(),
      isCorrect,
      correctAnswer: result.correctAnswer
    };

    const updatedResults = [...resultsRef.current, wordRes];
    resultsRef.current = updatedResults;
    setSessionResults(updatedResults);

    const isLastQuestion = currentIndex + 1 >= quizQueue.length;

    // When the final question is answered:
    // Immediately persist completed test session and update statistics in background!
    if (isLastQuestion && !isSavingFinalSessionRef.current) {
      isSavingFinalSessionRef.current = true;
      const total = updatedResults.length;
      const correctCount = updatedResults.filter(r => r.isCorrect).length;
      const wrongCount = total - correctCount;
      const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      const finalBestStreak = Math.max(bestStreak, newStreak);

      const sessionPayload: Omit<KanjiPracticeSession, 'id' | 'timestamp'> = {
        mode: selectedMode,
        testType: selectedTestType,
        selectedChapters: selectedMode === 'multi-chapter' ? Array.from(selectedMultiChapters) : selectedMode === 'chapter' ? [selectedSingleChapter] : undefined,
        jlptFilter: selectedMode === 'jlpt' ? selectedJlpt : undefined,
        totalQuestions: total,
        correctCount,
        wrongCount,
        accuracy,
        streak: finalBestStreak,
        results: updatedResults
      };

      const itemUpdates = updatedResults.map(r => ({
        kanjiId: r.kanjiId,
        isCorrect: r.isCorrect
      }));

      preparedCompletedSessionRef.current = {
        ...sessionPayload,
        id: 'kanji_session_' + Date.now(),
        timestamp: Date.now()
      };

      // Background persist: completes while user views feedback
      onSaveSession(sessionPayload, itemUpdates).catch(err => {
        console.error('Failed to save kanji practice session:', err);
      });
    }

    // Fast auto-advance: 1.0s for correct, 1.5s for wrong
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    const delay = isCorrect ? 1000 : 1500;
    autoAdvanceTimerRef.current = setTimeout(() => {
      handleNextWord();
    }, delay);
  };

  const handleNextWord = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    if (currentIndex + 1 < quizQueue.length) {
      transitionTimeRef.current = Date.now();
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setIsSubmitted(false);
      setCheckResult(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    } else {
      // Completed test! Results are already pre-saved and prepared
      if (preparedCompletedSessionRef.current) {
        setCompletedSession(preparedCompletedSessionRef.current);
      } else {
        const total = resultsRef.current.length;
        const correctCount = resultsRef.current.filter(r => r.isCorrect).length;
        const wrongCount = total - correctCount;
        const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
        setCompletedSession({
          id: 'kanji_session_' + Date.now(),
          timestamp: Date.now(),
          mode: selectedMode,
          testType: selectedTestType,
          selectedChapters: selectedMode === 'multi-chapter' ? Array.from(selectedMultiChapters) : selectedMode === 'chapter' ? [selectedSingleChapter] : undefined,
          jlptFilter: selectedMode === 'jlpt' ? selectedJlpt : undefined,
          totalQuestions: total,
          correctCount,
          wrongCount,
          accuracy,
          streak: bestStreak,
          results: resultsRef.current
        });
      }
      setIsQuizActive(false);
    }
  };

  const handleEnterPress = (e?: React.KeyboardEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isQuizActive) return;

    if (!isSubmitted) {
      if (userAnswer.trim()) {
        handleCheckAnswer();
      }
    } else {
      // Guard against double submit on same Enter press
      if (Date.now() - lastSubmitTimeRef.current > 200) {
        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = null;
        }
        handleNextWord();
      }
    }
  };

  const currentKanji = quizQueue[currentIndex];
  const currentTestType = questionTestTypes[currentIndex] || 'meaning';

  // 1. Summary Screen
  if (completedSession) {
    const wrongResults = completedSession.results.filter(r => !r.isCorrect);
    const correctResults = completedSession.results.filter(r => r.isCorrect);

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-pop-in space-y-6">
        <BackButton onClick={onBack} label="Back to Kanji Hub" />

        {/* Results Card */}
        <div className="bg-white rounded-3xl border border-[#eeece6] p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-[#fff7ed] text-[#ea580c] flex items-center justify-center mx-auto text-2xl font-bold font-japanese border border-orange-200">
            漢
          </div>
          <h2 className="text-2xl font-extrabold text-[#1a1918]">Kanji Practice Complete!</h2>
          <p className="text-xs text-[#8c8880]">
            Review your character recall performance.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
            <div className="p-3 bg-[#faf9f6] rounded-2xl border border-[#eeece6]">
              <span className="text-xs font-semibold text-[#8c8880] block">Accuracy</span>
              <span className="text-2xl font-bold font-mono text-[#1a1918]">{completedSession.accuracy}%</span>
            </div>
            <div className="p-3 bg-[#faf9f6] rounded-2xl border border-[#eeece6]">
              <span className="text-xs font-semibold text-emerald-600 block">Correct</span>
              <span className="text-2xl font-bold font-mono text-emerald-700">{completedSession.correctCount}</span>
            </div>
            <div className="p-3 bg-[#faf9f6] rounded-2xl border border-[#eeece6]">
              <span className="text-xs font-semibold text-rose-600 block">Wrong</span>
              <span className="text-2xl font-bold font-mono text-rose-700">{completedSession.wrongCount}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {wrongResults.length > 0 && (
              <button
                onClick={() => {
                  const wrongItems = kanjis.filter(k => wrongResults.some(w => w.kanjiId === k.id));
                  startQuizWithItems(wrongItems, 'weak', selectedTestType);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Practice Wrong Kanji ({wrongResults.length})
              </button>
            )}

            <button
              onClick={handleStartPractice}
              className="px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              Practice Again
            </button>
          </div>
        </div>

        {/* Wrong Kanji Breakdown */}
        {wrongResults.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#eeece6] p-6 space-y-3">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm border-b border-[#eeece6] pb-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Kanji to Review ({wrongResults.length})</span>
            </div>
            <div className="space-y-2">
              {wrongResults.map((res, i) => (
                <div key={i} className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold font-japanese text-[#1a1918]">{res.kanji}</span>
                    <div>
                      <div className="font-bold text-[#1a1918]">{res.meaning}</div>
                      <div className="text-[11px] text-[#8c8880] font-mono">
                        {[res.onyomi && `音: ${res.onyomi}`, res.kunyomi && `訓: ${res.kunyomi}`].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#8c8880] block">You answered:</span>
                    <span className="line-through text-rose-600 font-medium">{res.userAnswer || '(blank)'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Active Quiz Screen
  if (isQuizActive && currentKanji) {
    const correctSoFar = sessionResults.filter(r => r.isCorrect).length;
    const progressPercent = Math.round(((currentIndex) / quizQueue.length) * 100);

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-pop-in space-y-6">
        
        {/* Top Header: Back Button & Streak */}
        <div className="bg-white rounded-2xl border border-[#eeece6] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#1a1918]">
              <BackButton
                onClick={() => {
                  if (confirm('Quit current Kanji practice? Unsaved progress will be lost.')) {
                    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
                    setIsQuizActive(false);
                  }
                }}
                label="Quit"
                className="py-1 px-2.5 text-[11px]"
              />
              <span className="font-mono text-sm text-[#ea580c]">
                Kanji {currentIndex + 1} of {quizQueue.length}
              </span>
              <span className="text-[#8c8880]">•</span>
              <span className="text-emerald-600 font-mono">
                {correctSoFar} Correct
              </span>
            </div>

            <div className="flex items-center gap-2 text-orange-600 font-bold font-mono">
              <Flame className={`w-4 h-4 text-orange-500 fill-orange-500 ${currentStreak > 0 ? 'animate-bounce' : 'opacity-40'}`} />
              <span>Streak {currentStreak}</span>
            </div>
          </div>

          <div className="w-full bg-[#eeece6] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-[#ea580c] h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl border border-[#eeece6] p-8 shadow-md text-center relative overflow-hidden">
          
          {/* 🔊 Speaker Button */}
          <button
            onClick={() => soundEffects.speakJapanese(currentKanji.kanji)}
            className="absolute top-6 right-6 p-2.5 rounded-2xl bg-[#faf9f6] border border-[#eeece6] text-[#6e6b66] hover:text-[#ea580c] hover:bg-[#fff7ed] transition-colors cursor-pointer"
            title="Hear Kanji pronunciation"
          >
            <Volume2 className="w-5 h-5" />
          </button>

          {/* Test Type Badge */}
          <div className="flex justify-center gap-1.5 mb-3">
            <span className="text-[11px] font-bold bg-[#fff7ed] text-[#ea580c] border border-orange-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {currentTestType === 'meaning' ? 'Meaning Practice' : 'Reading Practice'}
            </span>
            {currentKanji.jlpt && (
              <span className="text-[11px] font-semibold bg-[#faf9f6] border border-[#eeece6] text-[#6e6b66] px-2 py-0.5 rounded-full font-mono">
                {currentKanji.jlpt}
              </span>
            )}
          </div>

          {/* Kanji Prompt */}
          <div className="py-4">
            <div className="text-7xl sm:text-8xl font-bold font-japanese text-[#1a1918] tracking-wide select-none">
              {currentKanji.kanji}
            </div>

            <p className="text-xs text-[#8c8880] mt-3">
              {currentTestType === 'meaning' 
                ? 'Type the English meaning of this Kanji:' 
                : 'Type the On\'yomi, Kun\'yomi, or Romaji reading:'}
            </p>
          </div>

          {/* Form Input */}
          <form onSubmit={handleEnterPress} className="mt-4 max-w-md mx-auto space-y-4">
            <div>
              <input
                ref={inputRef}
                type="text"
                readOnly={isSubmitted}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleEnterPress();
                  }
                }}
                placeholder={currentTestType === 'meaning' ? 'e.g. study, learning' : 'e.g. がく or まなぶ'}
                className={`w-full px-5 py-3.5 rounded-2xl border text-center text-base sm:text-lg font-medium outline-hidden transition-all ${
                  isSubmitted
                    ? checkResult?.isCorrect
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                      : 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                    : 'bg-[#fcfbf9] border-[#d4d0c8] focus:border-[#ea580c] focus:ring-4 focus:ring-orange-100 text-[#1a1918]'
                }`}
              />
            </div>

            {!isSubmitted ? (
              <button
                type="submit"
                disabled={!userAnswer.trim()}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all cursor-pointer ${
                  userAnswer.trim()
                    ? 'bg-[#ea580c] hover:bg-[#c2410c] active:scale-98 shadow-orange-200'
                    : 'bg-neutral-300 cursor-not-allowed shadow-none'
                }`}
              >
                <span>Check Answer</span>
                <span className="ml-1.5 opacity-80 text-xs">↵</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNextWord()}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-[#1a1918] hover:bg-black active:scale-98 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>{currentIndex + 1 < quizQueue.length ? 'Next Kanji' : 'View Results'}</span>
                <span className="text-neutral-400 text-xs">Enter ↵</span>
              </button>
            )}
          </form>

          {/* Immediate Feedback Card */}
          {isSubmitted && checkResult && (
            <div className="mt-6 pt-6 border-t border-[#eeece6] animate-pop-in">
              {checkResult.isCorrect ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-lg text-emerald-700">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>✓ Correct</span>
                  </div>
                  <div className="text-xs text-emerald-800">
                    <span className="text-neutral-500">
                      {currentTestType === 'meaning' ? 'Meaning:' : 'Reading:'}
                    </span>{' '}
                    <span className="font-semibold text-emerald-950">{checkResult.correctAnswer}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700/80 pt-1 flex items-center justify-center gap-2">
                    <span>Advancing automatically...</span>
                    <button
                      type="button"
                      onClick={() => handleNextWord()}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-emerald-200 text-emerald-700 font-mono hover:bg-emerald-100 cursor-pointer"
                    >
                      Enter ↵
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 sm:p-6 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-3.5">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-lg text-rose-700">
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>✗ Wrong</span>
                  </div>

                  <div className="bg-white/80 rounded-2xl border border-rose-200/80 p-4 space-y-2.5 max-w-sm mx-auto text-left shadow-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880] block">
                        Kanji:
                      </span>
                      <span className="font-japanese font-bold text-3xl text-[#1a1918]">
                        {currentKanji.kanji}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880] block">
                        Correct Meaning:
                      </span>
                      <span className="font-bold text-emerald-700 text-base">
                        {currentKanji.meaning}
                      </span>
                    </div>

                    {(currentKanji.onyomi || currentKanji.kunyomi) && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880] block">
                          Readings:
                        </span>
                        <div className="text-xs text-[#1a1918] font-japanese font-semibold">
                          {[currentKanji.onyomi && `音: ${currentKanji.onyomi}`, currentKanji.kunyomi && `訓: ${currentKanji.kunyomi}`].filter(Boolean).join(' • ')}
                        </div>
                      </div>
                    )}

                    {currentKanji.romaji && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880] block">
                          Romaji:
                        </span>
                        <span className="font-mono text-xs text-[#6e6b66]">
                          {currentKanji.romaji}
                        </span>
                      </div>
                    )}

                    {userAnswer.trim() && (
                      <div className="pt-1.5 border-t border-rose-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880] block">
                          Your Answer:
                        </span>
                        <span className="line-through text-rose-600 font-medium text-xs">
                          {userAnswer.trim()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-neutral-500 pt-1 flex items-center justify-center gap-2">
                    <span>Auto-advancing to next Kanji...</span>
                    <button
                      type="button"
                      onClick={() => handleNextWord()}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-rose-200 text-rose-700 font-mono font-medium hover:bg-rose-50 cursor-pointer"
                    >
                      Enter ↵ to skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Practice Setup Screen
  const weakCount = kanjis.filter(isWeakKanji).length;
  const newCount = kanjis.filter(k => (k.practiceCount || 0) === 0).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-pop-in space-y-6">
      
      {/* Back Button */}
      <BackButton onClick={onBack} label="Back to Kanji Hub" />

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[#fff7ed] text-[#ea580c] flex items-center justify-center mx-auto mb-2 border border-orange-200 text-xl font-bold font-japanese">
          漢
        </div>
        <h1 className="text-3xl font-extrabold text-[#1a1918] font-japanese">漢字練習・Kanji Practice Setup</h1>
        <p className="text-xs sm:text-sm text-[#6e6b66]">
          Test character recall, On'yomi, Kun'yomi readings, and meanings with spaced repetition.
        </p>
      </div>

      {/* Setup Card */}
      <div className="bg-white rounded-3xl border border-[#eeece6] p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Test Mode Type */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-3">
            1. Test Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSelectedTestType('meaning')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedTestType === 'meaning'
                  ? 'bg-[#fff7ed] border-[#ea580c] shadow-xs'
                  : 'bg-[#faf9f6] border-[#eeece6] hover:border-[#d4d0c8]'
              }`}
            >
              <span className="font-bold text-sm text-[#1a1918] block">Meaning Practice</span>
              <p className="text-xs text-[#6e6b66] mt-1">Show Kanji → Enter English meaning.</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTestType('reading')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedTestType === 'reading'
                  ? 'bg-[#fff7ed] border-[#ea580c] shadow-xs'
                  : 'bg-[#faf9f6] border-[#eeece6] hover:border-[#d4d0c8]'
              }`}
            >
              <span className="font-bold text-sm text-[#1a1918] block">Reading Practice</span>
              <p className="text-xs text-[#6e6b66] mt-1">Show Kanji → Enter Japanese reading.</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTestType('mixed')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedTestType === 'mixed'
                  ? 'bg-[#fff7ed] border-[#ea580c] shadow-xs'
                  : 'bg-[#faf9f6] border-[#eeece6] hover:border-[#d4d0c8]'
              }`}
            >
              <span className="font-bold text-sm text-[#1a1918] block">Mixed Practice</span>
              <p className="text-xs text-[#6e6b66] mt-1">Random mix of meaning and reading.</p>
            </button>
          </div>
        </div>

        {/* Kanji Scope / Category Filter */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-3">
            2. Choose Kanji Scope
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSelectedMode('chapter')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMode === 'chapter' ? 'bg-[#fff7ed] border-[#ea580c]' : 'bg-[#faf9f6] border-[#eeece6]'
              }`}
            >
              <span className="font-bold text-xs text-[#1a1918]">Single Chapter</span>
              <p className="text-[11px] text-[#6e6b66]">Focus on 1 chapter.</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('multi-chapter')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMode === 'multi-chapter' ? 'bg-[#fff7ed] border-[#ea580c]' : 'bg-[#faf9f6] border-[#eeece6]'
              }`}
            >
              <span className="font-bold text-xs text-[#1a1918]">Multiple Chapters</span>
              <p className="text-[11px] text-[#6e6b66]">Combine several chapters.</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('jlpt')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMode === 'jlpt' ? 'bg-[#fff7ed] border-[#ea580c]' : 'bg-[#faf9f6] border-[#eeece6]'
              }`}
            >
              <span className="font-bold text-xs text-[#1a1918]">JLPT Level</span>
              <p className="text-[11px] text-[#6e6b66]">Filter by N5, N4, etc.</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('weak')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMode === 'weak' ? 'bg-[#fff7ed] border-[#ea580c]' : 'bg-[#faf9f6] border-[#eeece6]'
              }`}
            >
              <span className="font-bold text-xs text-rose-600">Weak Kanji ({weakCount})</span>
              <p className="text-[11px] text-[#6e6b66]">Struggling characters.</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('new')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMode === 'new' ? 'bg-[#fff7ed] border-[#ea580c]' : 'bg-[#faf9f6] border-[#eeece6]'
              }`}
            >
              <span className="font-bold text-xs text-blue-600">New Kanji ({newCount})</span>
              <p className="text-[11px] text-[#6e6b66]">0 prior attempts.</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('all')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMode === 'all' ? 'bg-[#fff7ed] border-[#ea580c]' : 'bg-[#faf9f6] border-[#eeece6]'
              }`}
            >
              <span className="font-bold text-xs text-[#1a1918]">All Kanji ({kanjis.length})</span>
              <p className="text-[11px] text-[#6e6b66]">Entire Kanji bank.</p>
            </button>
          </div>
        </div>

        {/* Sub-selector for Chapter */}
        {selectedMode === 'chapter' && (
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-2">
            <span className="text-xs font-bold text-[#1a1918] block">Select Chapter:</span>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {chapterNumbers.map(ch => {
                const count = kanjis.filter(k => k.source === 'Textbook' && k.chapter === ch).length;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setSelectedSingleChapter(ch)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSingleChapter === ch
                        ? 'bg-[#ea580c] text-white shadow-xs'
                        : 'bg-white border border-[#eeece6] text-[#6e6b66] hover:border-[#d4d0c8]'
                    }`}
                  >
                    Ch {ch} <span className="text-[10px] block font-normal opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sub-selector for Multiple Chapters */}
        {selectedMode === 'multi-chapter' && (
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1a1918]">Check Chapters to Include:</span>
              <span className="text-xs text-[#ea580c] font-semibold">
                {selectedMultiChapters.size} chapters selected
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {chapterNumbers.map(ch => {
                const isChecked = selectedMultiChapters.has(ch);
                const count = kanjis.filter(k => k.source === 'Textbook' && k.chapter === ch).length;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleMultiChapter(ch)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-[#1a1918] text-white shadow-xs'
                        : 'bg-white border border-[#eeece6] text-[#6e6b66] hover:border-[#d4d0c8]'
                    }`}
                  >
                    Ch {ch} <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sub-selector for JLPT */}
        {selectedMode === 'jlpt' && (
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-2">
            <span className="text-xs font-bold text-[#1a1918] block">Select JLPT Level:</span>
            <div className="flex gap-2">
              {(['N5', 'N4', 'N3', 'N2', 'N1'] as JLPTLevel[]).map(lvl => {
                const count = kanjis.filter(k => k.jlpt === lvl).length;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedJlpt(lvl)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedJlpt === lvl
                        ? 'bg-[#ea580c] text-white shadow-xs'
                        : 'bg-white border border-[#eeece6] text-[#6e6b66] hover:border-[#d4d0c8]'
                    }`}
                  >
                    {lvl} <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Question Count Limit */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#6e6b66]" />
            <span>3. Number of Questions</span>
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[5, 10, 15, 20, 25, 50, 'all'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setQuestionCountLimit(opt as any)}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  questionCountLimit === opt
                    ? 'bg-[#1a1918] text-white shadow-xs'
                    : 'bg-[#faf9f6] text-[#6e6b66] border border-[#eeece6] hover:border-[#d4d0c8]'
                }`}
              >
                {opt === 'all' ? 'All' : opt}
              </button>
            ))}
          </div>
        </div>

        {/* Launch CTA */}
        <div className="pt-2">
          {eligibleItems.length === 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center">
              No Kanji available for this selection. Try choosing another chapter or add new Kanji!
            </div>
          ) : (
            <button
              onClick={handleStartPractice}
              className="w-full py-4 rounded-2xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-base shadow-lg shadow-orange-200 hover:shadow-xl transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>
                Start Kanji Practice ({Math.min(eligibleItems.length, questionCountLimit === 'all' ? eligibleItems.length : Number(questionCountLimit))} Questions)
              </span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
