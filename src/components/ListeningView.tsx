import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Headphones, 
  Search, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  RotateCcw, 
  HelpCircle, 
  Sparkles,
  Trophy,
  Filter,
  Play,
  Square,
  Volume2,
  VolumeX,
  Clock,
  ChevronRight,
  Sliders
} from 'lucide-react';
import { api } from '../services/api';
import { ListeningItem, ListeningSubmissionResponse } from '../types/listening';

interface ListeningViewProps {
  isDarkMode?: boolean;
  initialListeningId?: string;
}

export const ListeningView: React.FC<ListeningViewProps> = ({ isDarkMode, initialListeningId }) => {
  const [listenings, setListenings] = useState<ListeningItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Exercise State
  const [activeListening, setActiveListening] = useState<ListeningItem | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qIndex: number]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<ListeningSubmissionResponse | null>(null);

  // Audio & Speech Synthesis State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(0.85); // Default 0.85x as required
  const [audioLoading, setAudioLoading] = useState<boolean>(false);
  const audioTextCache = useRef<{ [id: string]: string }>({});
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedJlpt, setSelectedJlpt] = useState<string>('all');

  // Load available browser voices (handling async voiceschanged)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Fetch student listening list
  const fetchListenings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.listening.getAll();
      if (res && res.data) {
        setListenings(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load listening exercises:', err);
      setError(err?.message || 'Failed to load listening exercises.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListenings();
  }, []);

  useEffect(() => {
    if (initialListeningId && listenings.length > 0) {
      const match = listenings.find(l => l.id === initialListeningId || (l as any)._id === initialListeningId);
      if (match) {
        handleSelectExercise(match);
      }
    }
  }, [initialListeningId, listenings]);

  // Stop active speech when unmounting or changing exercise
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeListening]);

  const handleSelectExercise = (item: ListeningItem) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveListening(item);
    setSelectedAnswers({});
    setSubmissionResult(null);
    setIsPlaying(false);
    setHasPlayedOnce(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveListening(null);
    setSelectedAnswers({});
    setSubmissionResult(null);
    setIsPlaying(false);
    setHasPlayedOnce(false);
    fetchListenings(); // Refresh user progress scores
  };

  // Audio Playback Handler
  const handlePlayAudio = async () => {
    if (!activeListening) return;

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Speech Synthesis is not supported in this browser.');
      return;
    }

    // Cancel any active speech first
    window.speechSynthesis.cancel();
    setIsPlaying(false);

    try {
      setAudioLoading(true);

      // Fetch audio text from secure endpoint if not in memory cache
      let text = audioTextCache.current[activeListening._id];
      if (!text) {
        const res = await api.listening.getAudioText(activeListening._id);
        if (res && res.audioText) {
          text = res.audioText;
          audioTextCache.current[activeListening._id] = text;
        } else {
          throw new Error('Failed to load audio for this exercise.');
        }
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = speechRate; // Default 0.85

      // Select Japanese voice if available
      const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
      const jaVoice = voices.find(v => v.lang === 'ja-JP' || v.lang.startsWith('ja') || v.name.toLowerCase().includes('japan'));
      if (jaVoice) {
        utterance.voice = jaVoice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        setAudioLoading(false);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setHasPlayedOnce(true);
      };

      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsPlaying(false);
        setAudioLoading(false);
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err: any) {
      setAudioLoading(false);
      setIsPlaying(false);
      alert(err.message || 'Unable to play Japanese audio.');
    }
  };

  const handleStopAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const handleSelectOption = (questionIndex: number, optionLabel: string) => {
    if (submissionResult) return; // Prevent changing after submission
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: optionLabel
    }));
  };

  const handleSubmit = async () => {
    if (!activeListening) return;

    const unansweredCount = activeListening.questions.filter((_, idx) => !selectedAnswers[idx]).length;
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.listening.submit(activeListening._id, {
        answers: selectedAnswers
      });

      if (res && (res.results || res.score !== undefined)) {
        setSubmissionResult(res);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to submit listening answers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmissionResult(null);
  };

  // Filtered exercises
  const filteredListenings = useMemo(() => {
    return listenings.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `listening ${item.listeningNumber}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesJlpt = selectedJlpt === 'all' || item.jlptLevel === selectedJlpt;
      return matchesSearch && matchesJlpt;
    });
  }, [listenings, searchTerm, selectedJlpt]);

  // Overall Stats
  const stats = useMemo(() => {
    const total = listenings.length;
    const completed = listenings.filter(l => l.userProgress).length;
    const totalScore = listenings.reduce((acc, curr) => acc + (curr.userProgress?.percentage || 0), 0);
    const avgScore = completed > 0 ? Math.round(totalScore / completed) : 0;
    return { total, completed, avgScore };
  }, [listenings]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* View 1: Active Exercise Mode */}
      {activeListening ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Top Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToList}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#6e6b66] hover:text-[#1a1918] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Listening List</span>
            </button>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {activeListening.jlptLevel}
            </span>
          </div>

          {/* Audio Player Card (Passage is 100% HIDDEN from DOM) */}
          <div className="bg-gradient-to-br from-[#1a1918] to-[#2d2a27] text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-[#33312e] relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#d93829] text-white uppercase tracking-wider">
                      Listening {activeListening.listeningNumber}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {activeListening.questions.length} Questions
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold font-japanese tracking-tight">
                    {activeListening.title}
                  </h1>
                </div>

                {/* Speed Selector */}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 text-xs">
                  <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-neutral-400 text-[11px] font-semibold">Speed:</span>
                  {[0.75, 0.85, 1.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setSpeechRate(rate)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        speechRate === rate
                          ? 'bg-white text-[#1a1918] shadow-xs'
                          : 'text-neutral-300 hover:text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions & Audio Controls */}
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                    <Headphones className="w-4 h-4 text-blue-400" />
                    <span>Listen carefully and answer the questions below.</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    The paragraph audio is spoken in natural Japanese. Play as many times as needed.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {isPlaying ? (
                    <button
                      onClick={handleStopAudio}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Stop Audio</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePlayAudio}
                      disabled={audioLoading}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>
                        {audioLoading ? 'Loading Audio...' : hasPlayedOnce ? 'Play Again' : 'Play Audio'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Playing Status Indicator */}
              {isPlaying && (
                <div className="flex items-center gap-2 text-xs text-blue-300 font-semibold animate-pulse">
                  <Volume2 className="w-4 h-4" />
                  <span>Playing Japanese audio at {speechRate}x speed...</span>
                </div>
              )}
            </div>

            <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
              <Headphones className="w-64 h-64" />
            </div>
          </div>

          {/* Result Banner if submitted */}
          {submissionResult && (
            <div className={`p-6 rounded-3xl border shadow-sm animate-fadeIn ${
              submissionResult.percentage >= 80
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : submissionResult.percentage >= 50
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${
                    submissionResult.percentage >= 80 
                      ? 'bg-emerald-600 text-white' 
                      : submissionResult.percentage >= 50 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-rose-600 text-white'
                  }`}>
                    <Trophy className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      Score: {submissionResult.score} / {submissionResult.totalQuestions} ({submissionResult.percentage}%)
                    </h2>
                    <p className="text-xs opacity-90 mt-0.5">
                      {submissionResult.percentage === 100
                        ? '🎉 Perfect score! Outstanding comprehension!'
                        : submissionResult.percentage >= 80
                        ? '👏 Excellent work! Review the questions below.'
                        : submissionResult.percentage >= 50
                        ? '👍 Good effort! Review the correct answers below.'
                        : '💪 Keep practicing! Listen to the passage once more.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white border border-[#eeece6] shadow-xs hover:bg-[#faf9f6] text-[#1a1918] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                  <button
                    onClick={handleBackToList}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#1a1918] hover:bg-[#33312e] text-white shadow-xs cursor-pointer"
                  >
                    <span>All Exercises</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Questions Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1a1918] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span>Comprehension Questions (問題)</span>
              </h2>
              <span className="text-xs font-semibold text-[#8c8880]">
                {Object.keys(selectedAnswers).length} of {activeListening.questions.length} answered
              </span>
            </div>

            <div className="space-y-5">
              {activeListening.questions.map((q, qIndex) => {
                const evalResult = submissionResult?.results?.find(r => r.questionIndex === qIndex);
                const userAnswer = selectedAnswers[qIndex];

                return (
                  <div
                    key={qIndex}
                    className={`p-6 rounded-3xl border transition-all ${
                      evalResult
                        ? evalResult.isCorrect
                          ? 'bg-emerald-50/40 border-emerald-300'
                          : 'bg-rose-50/40 border-rose-300'
                        : 'bg-white border-[#eeece6] shadow-xs'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                          Question {qIndex + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-[#1a1918] font-japanese mt-1">
                          {q.question}
                        </h3>
                      </div>

                      {evalResult && (
                        <div>
                          {evalResult.isCorrect ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Correct</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Incorrect</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Options A, B, C, D */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt) => {
                        const isSelected = userAnswer === opt.label;
                        const isCorrectOpt = evalResult && evalResult.correctAnswer === opt.label;
                        const isWrongSelected = evalResult && isSelected && !evalResult.isCorrect;

                        let optClasses = 'border-[#eeece6] bg-[#faf9f6] text-[#1a1918] hover:border-blue-400';
                        if (isSelected && !evalResult) {
                          optClasses = 'border-blue-500 bg-blue-50 text-blue-900 font-bold shadow-xs';
                        } else if (evalResult) {
                          if (isCorrectOpt) {
                            optClasses = 'border-emerald-500 bg-emerald-100 text-emerald-950 font-bold';
                          } else if (isWrongSelected) {
                            optClasses = 'border-rose-400 bg-rose-100 text-rose-950 font-semibold line-through';
                          } else {
                            optClasses = 'border-[#eeece6] bg-[#faf9f6]/60 text-[#8c8880] opacity-60';
                          }
                        }

                        return (
                          <button
                            key={opt.label}
                            type="button"
                            disabled={!!submissionResult}
                            onClick={() => handleSelectOption(qIndex, opt.label)}
                            className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left text-xs transition-all cursor-pointer ${optClasses} disabled:cursor-default`}
                          >
                            <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected && !evalResult
                                ? 'bg-blue-600 text-white'
                                : isCorrectOpt
                                ? 'bg-emerald-600 text-white'
                                : isWrongSelected
                                ? 'bg-rose-600 text-white'
                                : 'bg-white border border-[#eeece6] text-[#6e6b66]'
                            }`}>
                              {opt.label}
                            </span>
                            <span className="font-japanese leading-relaxed">
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation if submitted */}
                    {evalResult && (
                      <div className="mt-4 pt-3 border-t border-[#eeece6]/80 text-xs">
                        <div className="font-bold text-[#1a1918] flex items-center gap-1.5">
                          <span>Correct Answer:</span>
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-extrabold">
                            Option {evalResult.correctAnswer}
                          </span>
                        </div>
                        {evalResult.explanation && (
                          <p className="text-[#6e6b66] mt-1 text-[11px] leading-relaxed">
                            {evalResult.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Submit Action */}
            {!submissionResult && (
              <div className="flex items-center justify-end pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Evaluating...' : 'Submit Answers'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* View 2: Exercise Catalog */
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#eeece6] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Headphones className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-bold font-japanese text-[#1a1918]">
                  Listening Practice (聴解練習)
                </h1>
              </div>
              <p className="text-xs text-[#8c8880] max-w-xl">
                Improve your Japanese auditory comprehension. Listen to native speech with adjustable playback rate and complete multiple-choice evaluations.
              </p>
            </div>

            {/* Summary Badges */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-[#faf9f6] border border-[#eeece6] text-center">
                <span className="text-[10px] font-bold text-[#8c8880] uppercase tracking-wider block">Completed</span>
                <span className="text-sm font-extrabold text-[#1a1918]">{stats.completed} / {stats.total}</span>
              </div>
              {stats.completed > 0 && (
                <div className="px-4 py-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Avg Score</span>
                  <span className="text-sm font-extrabold text-blue-900">{stats.avgScore}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-[#eeece6] shadow-xs">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c8880]" />
              <input
                type="text"
                placeholder="Search listening exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8c8880] font-semibold">JLPT:</span>
              <select
                value={selectedJlpt}
                onChange={(e) => setSelectedJlpt(e.target.value)}
                className="flex-1 py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="all">All Levels</option>
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
              </select>
            </div>
          </div>

          {/* Listening Cards Grid */}
          {loading ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-[#eeece6]">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3" />
              <p className="text-xs text-[#8c8880] font-medium">Loading listening exercises from MongoDB Atlas...</p>
            </div>
          ) : filteredListenings.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-[#eeece6] px-4">
              <Headphones className="w-12 h-12 text-[#8c8880]/30 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#1a1918]">No listening exercises found</h3>
              <p className="text-xs text-[#8c8880] mt-1 max-w-sm mx-auto">
                No exercises match your search or filter criteria. Check back soon or switch filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredListenings.map((item) => {
                const userProgress = item.userProgress;
                return (
                  <div
                    key={item._id}
                    onClick={() => handleSelectExercise(item)}
                    className="p-6 rounded-3xl bg-white border border-[#eeece6] shadow-xs hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl text-xs border border-blue-200">
                          Listening {item.listeningNumber}
                        </span>
                        <span className="text-[11px] font-bold text-[#8c8880] bg-[#faf9f6] px-2.5 py-1 rounded-lg">
                          {item.jlptLevel}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#1a1918] group-hover:text-blue-600 transition-colors font-japanese">
                        {item.title}
                      </h3>

                      <p className="text-xs text-[#8c8880]">
                        Audio exercise with {item.questions?.length || 0} comprehension questions.
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#eeece6] flex items-center justify-between">
                      {userProgress ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-700">
                            Score: {userProgress.score}/{userProgress.totalQuestions} ({userProgress.percentage}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#8c8880] font-medium">
                          Not attempted yet
                        </span>
                      )}

                      <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                        <span>Start Listening</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
