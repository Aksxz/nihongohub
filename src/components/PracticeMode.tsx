import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  VocabularyItem, 
  PracticeModeType, 
  PracticeSession, 
  PracticeWordResult, 
  AppView 
} from '../types/vocab';
import { 
  Sparkles, 
  Volume2, 
  Flame, 
  Check, 
  X, 
  ArrowRight, 
  RotateCcw, 
  BookOpen, 
  CheckSquare, 
  Square,
  AlertCircle, 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Brain,
  Layers,
  Sparkle
} from 'lucide-react';
import { checkAnswer, CheckResult } from '../utils/answerChecker';
import { soundEffects } from '../utils/audio';
import { isWeakWord, isHardWord, isDueForReview, getSmartPracticeQueue } from '../utils/srs';
import { PracticeSummary } from './PracticeSummary';

import { ChapterItem } from '../types/chapter';

interface PracticeScope {
  mode: PracticeModeType;
  singleChapter?: number;
  multiChapters?: number[];
  smartChapters?: string[];
  customChapterId?: string;
  isExtra?: boolean;
  initialItems?: VocabularyItem[];
  questionLimit: number | 'all';
}

interface PracticeModeProps {
  vocabularies: VocabularyItem[];
  chapters?: ChapterItem[];
  customChapters?: any[];
  onSaveSession: (session: Omit<PracticeSession, 'id' | 'timestamp'>, results: { vocabId: string; isCorrect: boolean }[]) => Promise<void>;
  onNavigate: (view: AppView) => void;
  initialMode?: PracticeModeType;
  initialWords?: VocabularyItem[];
  initialTitle?: string;
  initialSelectedChapters?: number[];
  initialScope?: any;
}

const isCustomVocab = (v: VocabularyItem) => v.destinationType === 'custom' || Boolean(v.customChapterId);
const isExtraVocab = (v: VocabularyItem) => v.destinationType === 'extra' || (!isCustomVocab(v) && (v.source === 'Extra' || !v.chapter || v.chapter <= 0));
const isStandardChapterVocab = (v: VocabularyItem, ch: number) => !isCustomVocab(v) && !isExtraVocab(v) && v.chapter === ch;

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  vocabularies,
  chapters = [],
  customChapters = [],
  onSaveSession,
  onNavigate,
  initialMode = 'all',
  initialWords,
  initialTitle,
  initialSelectedChapters = [],
  initialScope
}) => {
  // Practice Mode Setup
  const [selectedMode, setSelectedMode] = useState<PracticeModeType>(initialMode);
  const [selectedSingleChapter, setSelectedSingleChapter] = useState<number>(1);
  const [selectedMultiChapters, setSelectedMultiChapters] = useState<Set<number>>(
    new Set(initialSelectedChapters.length > 0 ? initialSelectedChapters : [1, 2])
  );
  const [questionCountLimit, setQuestionCountLimit] = useState<number | 'all'>(10);

  const chapterNumbers = useMemo(() => {
    if (chapters && chapters.length > 0) {
      return chapters.map(c => c.chapterNumber).sort((a, b) => a - b);
    }
    const nums = new Set<number>();
    vocabularies.forEach(v => {
      if (!isCustomVocab(v) && !isExtraVocab(v) && typeof v.chapter === 'number' && v.chapter > 0) {
        nums.add(v.chapter);
      }
    });
    return nums.size > 0 ? Array.from(nums).sort((a, b) => a - b) : Array.from({ length: 24 }, (_, i) => i + 1);
  }, [chapters, vocabularies]);

  const extraVocabCount = useMemo(() => {
    return vocabularies.filter(isExtraVocab).length;
  }, [vocabularies]);

  // All valid keys for Smart Practice selection
  const allSmartKeys = useMemo(() => {
    const keys: string[] = [];
    chapterNumbers.forEach(ch => keys.push(`ch_${ch}`));
    (customChapters || []).forEach((c: any) => keys.push(`custom_${c.id || c._id}`));
    if (extraVocabCount > 0) keys.push('extra');
    return keys;
  }, [chapterNumbers, customChapters, extraVocabCount]);

  // Smart Practice chapter selection state
  const [smartSelectedChapters, setSmartSelectedChapters] = useState<Set<string>>(() => {
    if (initialScope?.smartChapters && Array.isArray(initialScope.smartChapters) && initialScope.smartChapters.length > 0) {
      return new Set(initialScope.smartChapters);
    }
    const initialSet = new Set<string>();
    chapterNumbers.forEach(ch => initialSet.add(`ch_${ch}`));
    (customChapters || []).forEach((c: any) => initialSet.add(`custom_${c.id || c._id}`));
    if (extraVocabCount > 0) initialSet.add('extra');
    return initialSet;
  });

  const handleSelectAllSmart = () => {
    setSmartSelectedChapters(new Set(allSmartKeys));
  };

  const handleClearAllSmart = () => {
    setSmartSelectedChapters(new Set());
  };

  const toggleSmartChapter = (key: string) => {
    setSmartSelectedChapters(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Active Quiz State
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false);
  const [quizQueue, setQuizQueue] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Live Performance Tracking
  const [sessionResults, setSessionResults] = useState<PracticeWordResult[]>([]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);

  // Completed Session
  const [completedSession, setCompletedSession] = useState<PracticeSession | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSubmitTimeRef = useRef<number>(0);
  const transitionTimeRef = useRef<number>(0);

  // Synchronous references to avoid stale closure state during rapid completion
  const resultsRef = useRef<PracticeWordResult[]>([]);
  const preparedCompletedSessionRef = useRef<PracticeSession | null>(null);
  const isSavingFinalSessionRef = useRef<boolean>(false);

  // Clear any active timer on unmount
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
        // If user is currently typing in input and hasn't submitted yet, let form submit evaluate answer
        if (e.target === inputRef.current && !isSubmitted) {
          return;
        }

        // When submitted (showing feedback & Next/View Results), Enter advances immediately
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

  const activeScopeRef = useRef<PracticeScope | null>(null);

  // Start immediately if initialWords are provided (e.g. Chapter View or Custom Selection)
  useEffect(() => {
    if (initialWords && initialWords.length > 0) {
      const scope: PracticeScope = {
        mode: initialScope?.mode || initialMode || 'custom',
        singleChapter: initialScope?.chapter,
        multiChapters: initialScope?.multiChapters,
        smartChapters: initialScope?.smartChapters,
        customChapterId: initialScope?.customChapterId,
        isExtra: initialScope?.isExtra,
        initialItems: initialWords,
        questionLimit: 'all'
      };
      activeScopeRef.current = scope;
      startQuizWithItems(initialWords, scope.mode);
    }
  }, [initialWords]);

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
        return vocabularies.filter(v => isStandardChapterVocab(v, selectedSingleChapter));

      case 'multi-chapter':
        return vocabularies.filter(v => !isCustomVocab(v) && !isExtraVocab(v) && v.chapter && selectedMultiChapters.has(v.chapter));

      case 'weak':
        return vocabularies.filter(isWeakWord);

      case 'hard':
        return vocabularies.filter(isHardWord);

      case 'new':
        return vocabularies.filter(v => (v.practiceCount || 0) === 0);

      case 'smart': {
        const pool = vocabularies.filter(v => {
          if (isCustomVocab(v)) {
            const cid = v.customChapterId;
            return cid ? smartSelectedChapters.has(`custom_${cid}`) : false;
          }
          if (isExtraVocab(v)) {
            return smartSelectedChapters.has('extra');
          }
          if (v.chapter) {
            return smartSelectedChapters.has(`ch_${v.chapter}`);
          }
          return false;
        });
        const limit = questionCountLimit === 'all' ? pool.length : Number(questionCountLimit);
        return getSmartPracticeQueue(pool, limit);
      }

      case 'custom':
        return initialWords || [];

      case 'all':
      default:
        return vocabularies;
    }
  }, [vocabularies, selectedMode, selectedSingleChapter, selectedMultiChapters, smartSelectedChapters, questionCountLimit, initialWords]);

  const startQuizWithItems = (items: VocabularyItem[], mode: PracticeModeType) => {
    if (items.length === 0) return;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    let finalQueue: VocabularyItem[];
    if (mode === 'smart') {
      finalQueue = questionCountLimit === 'all' ? items : items.slice(0, Number(questionCountLimit));
    } else {
      const shuffled = shuffleArray(items);
      finalQueue = questionCountLimit === 'all' 
        ? shuffled 
        : shuffled.slice(0, Number(questionCountLimit));
    }

    setQuizQueue(finalQueue);
    setCurrentIndex(0);
    setUserAnswer('');
    setIsSubmitted(false);
    setCheckResult(null);
    setShowHint(false);
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
    if (selectedMode === 'smart' && smartSelectedChapters.size === 0) {
      return;
    }

    const scope: PracticeScope = {
      mode: selectedMode,
      singleChapter: selectedSingleChapter,
      multiChapters: Array.from(selectedMultiChapters),
      smartChapters: Array.from(smartSelectedChapters),
      questionLimit: questionCountLimit
    };
    activeScopeRef.current = scope;

    startQuizWithItems(eligibleItems, selectedMode);
  };

  const handlePracticeAgain = () => {
    const scope = activeScopeRef.current;
    if (!scope) {
      handleStartPractice();
      return;
    }

    if (scope.mode === 'smart') {
      const selectedSet = new Set(scope.smartChapters || []);
      const pool = vocabularies.filter(v => {
        if (isCustomVocab(v)) {
          const cid = v.customChapterId;
          return cid ? selectedSet.has(`custom_${cid}`) : false;
        }
        if (isExtraVocab(v)) {
          return selectedSet.has('extra');
        }
        if (v.chapter) {
          return selectedSet.has(`ch_${v.chapter}`);
        }
        return false;
      });
      const limit = scope.questionLimit === 'all' ? pool.length : Number(scope.questionLimit);
      const queue = getSmartPracticeQueue(pool, limit);
      startQuizWithItems(queue, 'smart');
      return;
    }

    let pool: VocabularyItem[] = [];
    if (scope.mode === 'chapter' && scope.singleChapter !== undefined) {
      pool = vocabularies.filter(v => isStandardChapterVocab(v, scope.singleChapter!));
    } else if (scope.mode === 'multi-chapter' && scope.multiChapters) {
      const set = new Set(scope.multiChapters);
      pool = vocabularies.filter(v => !isCustomVocab(v) && !isExtraVocab(v) && v.chapter && set.has(v.chapter));
    } else if (scope.customChapterId) {
      pool = vocabularies.filter(v => v.customChapterId === scope.customChapterId);
    } else if (scope.isExtra) {
      pool = vocabularies.filter(isExtraVocab);
    } else if (scope.mode === 'weak') {
      pool = vocabularies.filter(isWeakWord);
    } else if (scope.mode === 'hard') {
      pool = vocabularies.filter(isHardWord);
    } else if (scope.mode === 'new') {
      pool = vocabularies.filter(v => (v.practiceCount || 0) === 0);
    } else if (scope.initialItems && scope.initialItems.length > 0) {
      const idMap = new Map(vocabularies.map(v => [v.id, v]));
      pool = scope.initialItems.map(item => idMap.get(item.id) || item);
    } else {
      pool = vocabularies;
    }

    if (pool.length === 0) pool = vocabularies;

    const shuffled = shuffleArray(pool);
    const finalQueue = scope.questionLimit === 'all' ? shuffled : shuffled.slice(0, Number(scope.questionLimit));
    startQuizWithItems(finalQueue, scope.mode);
  };

  const handleCheckAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Temporarily disable answer submission during feedback delay or right after transition
    if (isSubmitted || !isQuizActive || !userAnswer.trim() || Date.now() - transitionTimeRef.current < 200) return;

    const currentWord = quizQueue[currentIndex];
    if (!currentWord) return;

    lastSubmitTimeRef.current = Date.now();

    const result = checkAnswer(userAnswer, currentWord.english, currentWord.acceptedMeanings);
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

    const wordRes: PracticeWordResult = {
      vocabId: currentWord.id,
      japanese: currentWord.japanese,
      reading: currentWord.reading,
      romaji: currentWord.romaji,
      english: currentWord.english,
      userAnswer: userAnswer.trim(),
      isCorrect,
      acceptedMeanings: result.allAcceptedMeanings
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

      const sessionPayload: Omit<PracticeSession, 'id' | 'timestamp'> = {
        mode: selectedMode,
        selectedChapters: selectedMode === 'multi-chapter' ? Array.from(selectedMultiChapters) : selectedMode === 'chapter' ? [selectedSingleChapter] : undefined,
        totalQuestions: total,
        correctCount,
        wrongCount,
        accuracy,
        streak: finalBestStreak,
        results: updatedResults
      };

      const itemUpdates = updatedResults.map(r => ({
        vocabId: r.vocabId,
        isCorrect: r.isCorrect
      }));

      preparedCompletedSessionRef.current = {
        ...sessionPayload,
        id: 'session_' + Date.now(),
        timestamp: Date.now()
      };

      // Background persist: completes while user views feedback
      onSaveSession(sessionPayload, itemUpdates).catch(err => {
        console.error('Failed to save practice session:', err);
      });
    }

    // Automatic transition timer
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
      setShowHint(false);
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
          id: 'session_' + Date.now(),
          timestamp: Date.now(),
          mode: selectedMode,
          selectedChapters: selectedMode === 'multi-chapter' ? Array.from(selectedMultiChapters) : selectedMode === 'chapter' ? [selectedSingleChapter] : undefined,
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

  // Dedicated Enter handler that captures Enter for current answer and skips delay if pressed again
  const handleEnterPress = (e?: React.KeyboardEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isQuizActive) return;

    if (!isSubmitted) {
      if (userAnswer.trim()) {
        handleCheckAnswer();
      }
    } else {
      // Guard against double submit on the same Enter press that submitted the answer
      if (Date.now() - lastSubmitTimeRef.current > 200) {
        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = null;
        }
        handleNextWord();
      }
    }
  };

  const currentWord = quizQueue[currentIndex];

  // 1. Render Summary Screen
  if (completedSession) {
    return (
      <PracticeSummary
        session={completedSession}
        onPracticeAgain={handlePracticeAgain}
        onPracticeWrongWords={(wrongItems) => {
          activeScopeRef.current = {
            mode: 'weak',
            initialItems: wrongItems,
            questionLimit: 'all'
          };
          startQuizWithItems(wrongItems, 'weak');
        }}
        onNavigate={onNavigate}
        allVocabularies={vocabularies}
      />
    );
  }

  // 2. Render Active Quiz Screen
  if (isQuizActive && currentWord) {
    const correctSoFar = sessionResults.filter(r => r.isCorrect).length;
    const progressPercent = Math.round(((currentIndex) / quizQueue.length) * 100);

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-pop-in space-y-6">
        
        {/* Top Header: Progress & Streak */}
        <div className="bg-white rounded-2xl border border-[#eeece6] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#1a1918]">
              <span className="font-mono text-sm text-[#d93829]">
                Question {currentIndex + 1} of {quizQueue.length}
              </span>
              <span className="text-[#8c8880]">•</span>
              <span className="text-emerald-600 font-mono">
                {correctSoFar} Correct
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-orange-600 font-bold font-mono">
                <Flame className={`w-4 h-4 text-orange-500 fill-orange-500 ${currentStreak > 0 ? 'animate-bounce' : 'opacity-40'}`} />
                <span>Streak {currentStreak}</span>
              </div>

              <button
                onClick={() => {
                  if (confirm('Quit current practice session? Unsaved progress will be lost.')) {
                    if (autoAdvanceTimerRef.current) {
                      clearTimeout(autoAdvanceTimerRef.current);
                      autoAdvanceTimerRef.current = null;
                    }
                    setIsQuizActive(false);
                  }
                }}
                className="text-[11px] text-[#8c8880] hover:text-rose-600 font-medium ml-2 cursor-pointer"
              >
                Quit
              </button>
            </div>
          </div>

          <div className="w-full bg-[#eeece6] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-[#d93829] h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl border border-[#eeece6] p-8 shadow-md text-center relative overflow-hidden">
          
          {/* 🔊 Pronunciation Button */}
          <button
            onClick={() => soundEffects.speakJapanese(currentWord.japanese)}
            className="absolute top-6 right-6 p-2.5 rounded-2xl bg-[#faf9f6] border border-[#eeece6] text-[#6e6b66] hover:text-[#d93829] hover:bg-[#fef2f2] transition-colors cursor-pointer"
            title="Hear Japanese pronunciation"
          >
            <Volume2 className="w-5 h-5" />
          </button>

          {/* Chapter & Type Badges */}
          <div className="flex justify-center gap-1.5 mb-4">
            {currentWord.chapter && (
              <span className="text-[11px] font-bold bg-[#fef2f2] text-[#d93829] border border-[#fee2e2] px-2.5 py-0.5 rounded-full">
                Chapter {currentWord.chapter}
              </span>
            )}
            {currentWord.type && (
              <span className="text-[11px] font-semibold bg-[#faf9f6] border border-[#eeece6] text-[#6e6b66] px-2.5 py-0.5 rounded-full">
                {currentWord.type}
              </span>
            )}
          </div>

          {/* Japanese Word Prompt */}
          <div className="py-4">
            <div className="text-4xl sm:text-6xl font-bold font-japanese text-[#1a1918] tracking-wide select-none">
              {currentWord.japanese}
            </div>

            {/* Reading Hint or Revealed Reading */}
            <div className="mt-3 min-h-[28px]">
              {showHint || isSubmitted ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#faf9f6] border border-[#eeece6] text-xs font-mono text-[#6e6b66] animate-pop-in">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>{currentWord.reading}{currentWord.romaji && currentWord.romaji.trim() ? ` (${currentWord.romaji.trim()})` : ''}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-xs text-[#8c8880] hover:text-[#1a1918] inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Show Reading Hint</span>
                </button>
              )}
            </div>
          </div>

          {/* Form Input */}
          <form onSubmit={handleEnterPress} className="mt-6 max-w-md mx-auto space-y-4">
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
                placeholder="Enter English meaning..."
                className={`w-full px-5 py-3.5 rounded-2xl border text-center text-base sm:text-lg font-medium outline-hidden transition-all ${
                  isSubmitted
                    ? checkResult?.isCorrect
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                      : 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                    : 'bg-[#fcfbf9] border-[#d4d0c8] focus:border-[#d93829] focus:ring-4 focus:ring-red-100 text-[#1a1918]'
                }`}
              />
            </div>

            {!isSubmitted ? (
              <button
                type="submit"
                disabled={!userAnswer.trim()}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all cursor-pointer ${
                  userAnswer.trim()
                    ? 'bg-[#d93829] hover:bg-[#b92a1d] active:scale-98 shadow-red-200'
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
                <span>{currentIndex + 1 < quizQueue.length ? 'Next Word' : 'View Results'}</span>
                <span className="text-neutral-400 text-xs">Enter ↵</span>
              </button>
            )}
          </form>

          {/* Immediate Feedback Notice */}
          {isSubmitted && checkResult && (
            <div className="mt-6 pt-6 border-t border-[#eeece6] animate-pop-in">
              {checkResult.isCorrect ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-lg text-emerald-700">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>✓ Correct</span>
                  </div>
                  <div className="text-xs text-emerald-800">
                    <span className="text-neutral-500">Meaning:</span>{' '}
                    <span className="font-semibold text-emerald-950">{currentWord.english}</span>
                    {currentWord.romaji && currentWord.romaji.trim() && (
                      <span className="ml-2 font-mono text-[#6e6b66]">({currentWord.romaji.trim()})</span>
                    )}
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
                        Japanese Word:
                      </span>
                      <span className="font-japanese font-bold text-2xl text-[#1a1918]">
                        {currentWord.japanese}
                      </span>
                    </div>

                    {currentWord.romaji && currentWord.romaji.trim() && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880] block">
                          Romaji:
                        </span>
                        <span className="font-mono text-sm font-semibold text-[#1a1918]">
                          {currentWord.romaji.trim()}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880] block">
                        Correct Meaning:
                      </span>
                      <span className="font-bold text-emerald-700 text-base">
                        {currentWord.english}
                      </span>
                    </div>

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
                    <span>Auto-advancing to next word...</span>
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

  // 3. Render Practice Center / Mode Setup Screen
  const weakCount = vocabularies.filter(isWeakWord).length;
  const hardCount = vocabularies.filter(isHardWord).length;
  const newCount = vocabularies.filter(v => (v.practiceCount || 0) === 0).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-pop-in space-y-8">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[#fff7ed] text-[#ea580c] flex items-center justify-center mx-auto mb-2 border border-orange-200">
          <Sparkles className="w-6 h-6 text-amber-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-[#1a1918] font-japanese">練習センター・Practice Center</h1>
        <p className="text-xs sm:text-sm text-[#6e6b66]">
          Choose your practice mode, select chapters, and test yourself with spaced repetition recall.
        </p>
      </div>

      {/* Main Practice Setup Card */}
      <div className="bg-white rounded-3xl border border-[#eeece6] p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Practice Modes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-3">
            1. Select Practice Mode
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            
            {/* Chapter Practice */}
            <button
              type="button"
              onClick={() => setSelectedMode('chapter')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedMode === 'chapter'
                  ? 'bg-[#fef2f2] border-[#d93829] shadow-xs'
                  : 'bg-[#faf9f6] border-[#eeece6] hover:border-[#d4d0c8]'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm text-[#1a1918]">
                <span>Chapter Practice</span>
                <BookOpen className="w-4 h-4 text-[#d93829]" />
              </div>
              <p className="text-xs text-[#6e6b66] mt-1">Focus strictly on 1 chapter.</p>
            </button>

            {/* Multiple Chapter Practice */}
            <button
              type="button"
              onClick={() => setSelectedMode('multi-chapter')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedMode === 'multi-chapter'
                  ? 'bg-[#fef2f2] border-[#d93829] shadow-xs'
                  : 'bg-[#faf9f6] border-[#eeece6] hover:border-[#d4d0c8]'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm text-[#1a1918]">
                <span>Multiple Chapters</span>
                <CheckSquare className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-xs text-[#6e6b66] mt-1">Combine several chapters together.</p>
            </button>

            {/* Smart Practice (SRS) */}
            <button
              type="button"
              onClick={() => setSelectedMode('smart')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedMode === 'smart'
                  ? 'bg-[#fef2f2] border-[#d93829] shadow-xs'
                  : 'bg-[#faf9f6] border-[#eeece6] hover:border-[#d4d0c8]'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm text-[#1a1918]">
                <span>Smart Practice</span>
                <Brain className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs text-[#6e6b66] mt-1">Spaced repetition: prioritizes due & struggling words.</p>
            </button>

            {/* Weak Words */}
            <button
              type="button"
              onClick={() => setSelectedMode('weak')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedMode === 'weak'
                  ? 'bg-[#fef2f2] border-[#d93829] shadow-xs'
                  : 'bg-[#faf9f6] border-[#eeece6] hover:border-[#d4d0c8]'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm text-[#1a1918]">
                <span>Weak Words</span>
                <span className="text-xs font-bold text-rose-600">({weakCount})</span>
              </div>
              <p className="text-xs text-[#6e6b66] mt-1">Practice words you frequently miss.</p>
            </button>

            {/* Hard Words */}
            <button
              type="button"
              onClick={() => setSelectedMode('hard')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedMode === 'hard'
                  ? 'bg-[#fef2f2] border-[#d93829] shadow-xs'
                  : 'bg-[#faf9f6] border-[#eeece6] hover:border-[#d4d0c8]'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm text-[#1a1918]">
                <span>Hard Words</span>
                <span className="text-xs font-bold text-amber-600">({hardCount})</span>
              </div>
              <p className="text-xs text-[#6e6b66] mt-1">Repeated mistakes requiring extra focus.</p>
            </button>

            {/* New Words */}
            <button
              type="button"
              onClick={() => setSelectedMode('new')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedMode === 'new'
                  ? 'bg-[#fef2f2] border-[#d93829] shadow-xs'
                  : 'bg-[#faf9f6] border-[#eeece6] hover:border-[#d4d0c8]'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm text-[#1a1918]">
                <span>New Words</span>
                <span className="text-xs font-bold text-blue-600">({newCount})</span>
              </div>
              <p className="text-xs text-[#6e6b66] mt-1">Drill words with 0 prior attempts.</p>
            </button>

            {/* All Words */}
            <button
              type="button"
              onClick={() => setSelectedMode('all')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedMode === 'all'
                  ? 'bg-[#fef2f2] border-[#d93829] shadow-xs'
                  : 'bg-[#faf9f6] border-[#eeece6] hover:border-[#d4d0c8]'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm text-[#1a1918]">
                <span>All Words</span>
                <span className="text-xs text-[#8c8880]">({vocabularies.length})</span>
              </div>
              <p className="text-xs text-[#6e6b66] mt-1">Randomized mix across your entire bank.</p>
            </button>

          </div>
        </div>

        {/* Sub-config: Single Chapter Selector */}
        {selectedMode === 'chapter' && (
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-2">
            <span className="text-xs font-bold text-[#1a1918] block">Select Chapter to Practice:</span>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {chapterNumbers.map(ch => {
                const count = vocabularies.filter(v => isStandardChapterVocab(v, ch)).length;
                return (
                  <button
                    type="button"
                    key={ch}
                    onClick={() => setSelectedSingleChapter(ch)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSingleChapter === ch
                        ? 'bg-[#d93829] text-white shadow-xs'
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

        {/* Sub-config: Multiple Chapter Selector */}
        {selectedMode === 'multi-chapter' && (
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1a1918]">Check Chapters to Include:</span>
              <span className="text-xs text-[#d93829] font-semibold">
                {selectedMultiChapters.size} chapters selected
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {chapterNumbers.map(ch => {
                const isChecked = selectedMultiChapters.has(ch);
                const count = vocabularies.filter(v => isStandardChapterVocab(v, ch)).length;
                return (
                  <button
                    type="button"
                    key={ch}
                    onClick={() => toggleMultiChapter(ch)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isChecked
                        ? 'bg-[#1a1918] text-white shadow-xs'
                        : 'bg-white border border-[#eeece6] text-[#6e6b66] hover:border-[#d4d0c8]'
                    }`}
                  >
                    <span>Ch {ch}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sub-config: Smart Practice Chapter Selector */}
        {selectedMode === 'smart' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#eeece6] pb-3">
              <div>
                <span className="text-xs font-bold text-[#1a1918] block">Select Chapters for Smart Practice:</span>
                <span className="text-[11px] text-[#6e6b66]">
                  SRS prioritizes overdue, struggling, and new words within selected chapters.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllSmart}
                  className="px-2.5 py-1 text-xs font-bold text-[#d93829] bg-white border border-[#eeece6] rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAllSmart}
                  className="px-2.5 py-1 text-xs font-bold text-[#6e6b66] bg-white border border-[#eeece6] rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
                <span className="text-xs font-mono font-bold text-[#d93829] ml-1">
                  {smartSelectedChapters.size} selected
                </span>
              </div>
            </div>

            {/* Validation Message if 0 chapters selected */}
            {smartSelectedChapters.size === 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-pop-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-semibold">Please select at least one chapter.</span>
              </div>
            )}

            {/* Standard Chapters */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#8c8880] uppercase tracking-wider block">
                Standard Chapters (1–{chapterNumbers.length})
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {chapterNumbers.map(ch => {
                  const key = `ch_${ch}`;
                  const isChecked = smartSelectedChapters.has(key);
                  const count = vocabularies.filter(v => isStandardChapterVocab(v, ch)).length;
                  return (
                    <button
                      type="button"
                      key={`smart-ch-${ch}`}
                      onClick={() => toggleSmartChapter(key)}
                      className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isChecked
                          ? 'bg-[#1a1918] text-white shadow-xs'
                          : 'bg-white border border-[#eeece6] text-[#6e6b66] hover:border-[#d4d0c8]'
                      }`}
                    >
                      <span>Ch {ch}</span>
                      <span className="text-[10px] opacity-75 font-normal">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Chapters (if any) */}
            {customChapters && customChapters.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#eeece6]">
                <span className="text-[11px] font-bold text-[#8c8880] uppercase tracking-wider block">
                  Custom Chapters
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {customChapters.map((cc: any) => {
                    const key = `custom_${cc.id || cc._id}`;
                    const isChecked = smartSelectedChapters.has(key);
                    const count = vocabularies.filter(v => v.customChapterId === (cc.id || cc._id)).length;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => toggleSmartChapter(key)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-left flex items-center justify-between ${
                          isChecked
                            ? 'bg-[#1a1918] text-white shadow-xs'
                            : 'bg-white border border-[#eeece6] text-[#6e6b66] hover:border-[#d4d0c8]'
                        }`}
                      >
                        <span className="truncate pr-1">{cc.displayName || cc.name}</span>
                        <span className="text-[10px] opacity-75 font-mono shrink-0">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extra Vocabulary (if any extra words exist) */}
            {extraVocabCount > 0 && (
              <div className="pt-2 border-t border-[#eeece6]">
                <button
                  type="button"
                  onClick={() => toggleSmartChapter('extra')}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                    smartSelectedChapters.has('extra')
                      ? 'bg-[#1a1918] text-white shadow-xs'
                      : 'bg-white border border-[#eeece6] text-[#6e6b66] hover:border-[#d4d0c8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className={`w-3.5 h-3.5 ${smartSelectedChapters.has('extra') ? 'text-white' : 'text-[#8c8880]'}`} />
                    <span>Extra Vocabulary</span>
                  </div>
                  <span className="text-[10px] opacity-75 font-mono">({extraVocabCount} words)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Question Count Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#6e6b66]" />
            <span>2. Number of Questions</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[5, 10, 15, 20, 'all'].map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => setQuestionCountLimit(opt as any)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  questionCountLimit === opt
                    ? 'bg-[#1a1918] text-white shadow-xs'
                    : 'bg-[#faf9f6] text-[#6e6b66] border border-[#eeece6] hover:border-[#d4d0c8]'
                }`}
              >
                {opt === 'all' ? 'All' : `${opt} Words`}
              </button>
            ))}
          </div>
        </div>

        {/* Launch Practice CTA */}
        <div className="pt-2">
          {selectedMode === 'smart' && smartSelectedChapters.size === 0 ? (
            <button
              type="button"
              disabled
              className="w-full py-4 rounded-2xl bg-neutral-200 text-neutral-400 font-bold text-base cursor-not-allowed flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-5 h-5 text-neutral-400" />
              <span>Please select at least one chapter</span>
            </button>
          ) : eligibleItems.length === 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center">
              No words available for this mode. Try selecting another chapter or adding words!
            </div>
          ) : (
            <button
              onClick={handleStartPractice}
              className="w-full py-4 rounded-2xl bg-[#d93829] hover:bg-[#b92a1d] text-white font-bold text-base shadow-lg shadow-red-200 hover:shadow-xl transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>
                {selectedMode === 'smart' ? 'Start Smart Practice' : 'Start Practice'} ({Math.min(eligibleItems.length, questionCountLimit === 'all' ? eligibleItems.length : Number(questionCountLimit))} Questions)
              </span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
