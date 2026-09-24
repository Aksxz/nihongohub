import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  RotateCcw, 
  HelpCircle, 
  Sparkles,
  Trophy,
  BookOpen,
  Filter,
  Check,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { api } from '../services/api';
import { ReadingItem, ReadingSubmissionResponse } from '../types/reading';

interface ReadingViewProps {
  isDarkMode?: boolean;
  initialReadingId?: string;
}

export const ReadingView: React.FC<ReadingViewProps> = ({ isDarkMode, initialReadingId }) => {
  const [readings, setReadings] = useState<ReadingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selection & Active Reading State
  const [activeReading, setActiveReading] = useState<ReadingItem | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qIndex: number]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<ReadingSubmissionResponse | null>(null);
  
  // Filter & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedJlpt, setSelectedJlpt] = useState<string>('all');
  
  // Reading preferences
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');

  const fetchReadings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.readings.getAll();
      if (res && res.data) {
        setReadings(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load readings:', err);
      setError(err?.message || 'Failed to load reading passages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  useEffect(() => {
    if (initialReadingId && readings.length > 0) {
      const match = readings.find(r => r.id === initialReadingId || (r as any)._id === initialReadingId);
      if (match) {
        setActiveReading(match);
      }
    }
  }, [initialReadingId, readings]);

  const handleSelectReading = (reading: ReadingItem) => {
    setActiveReading(reading);
    setSelectedAnswers({});
    setSubmissionResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setActiveReading(null);
    setSelectedAnswers({});
    setSubmissionResult(null);
    fetchReadings(); // Refresh to ensure updated scores
  };

  const handleSelectOption = (questionIndex: number, optionLabel: string) => {
    if (submissionResult) return; // Prevent changing after submission
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: optionLabel
    }));
  };

  const handleSubmit = async () => {
    if (!activeReading) return;

    const unansweredCount = activeReading.questions.filter((_, idx) => !selectedAnswers[idx]).length;
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.readings.submit(activeReading._id, {
        answers: selectedAnswers
      });
      if (res && res.data) {
        setSubmissionResult(res.data);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to evaluate reading submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmissionResult(null);
  };

  // Filtered readings
  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      const matchesSearch = 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.passage.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `paragraph ${r.paragraphNumber}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesJlpt = selectedJlpt === 'all' || r.jlptLevel === selectedJlpt;
      return matchesSearch && matchesJlpt;
    });
  }, [readings, searchTerm, selectedJlpt]);

  // Overall stats
  const stats = useMemo(() => {
    const total = readings.length;
    const completed = readings.filter(r => r.userProgress).length;
    const totalScore = readings.reduce((acc, curr) => acc + (curr.userProgress?.percentage || 0), 0);
    const avgScore = completed > 0 ? Math.round(totalScore / completed) : 0;
    return { total, completed, avgScore };
  }, [readings]);

  const fontSizeClass = {
    normal: 'text-lg leading-relaxed',
    large: 'text-xl leading-loose',
    xlarge: 'text-2xl leading-loose'
  }[fontSize];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* View 1: Active Reading Mode */}
      {activeReading ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Top Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={handleBackToList}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Passages
            </button>

            {/* Font Size Adjuster */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Text Size:</span>
              <button
                onClick={() => setFontSize('normal')}
                className={`px-2 py-1 rounded font-semibold transition-all ${
                  fontSize === 'normal'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-2 py-1 rounded font-semibold transition-all ${
                  fontSize === 'large'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Large
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className={`px-2 py-1 rounded font-semibold transition-all ${
                  fontSize === 'xlarge'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Extra Large
              </button>
            </div>
          </div>

          {/* Heading */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 sm:p-8 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="bg-emerald-800/60 backdrop-blur-sm text-emerald-100 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Paragraph {activeReading.paragraphNumber}
                </span>
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                  {activeReading.jlptLevel}
                </span>
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                  {activeReading.questions.length} Questions
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
                {activeReading.title}
              </h1>
            </div>
            <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
              <FileText className="w-64 h-64" />
            </div>
          </div>

          {/* Result Banner if submitted */}
          {submissionResult && (
            <div className={`p-6 rounded-2xl border shadow-md animate-fadeIn ${
              submissionResult.percentage >= 80
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                : submissionResult.percentage >= 50
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    submissionResult.percentage >= 80 
                      ? 'bg-emerald-500 text-white' 
                      : submissionResult.percentage >= 50 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-rose-500 text-white'
                  }`}>
                    <Trophy className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      Score: {submissionResult.score} / {submissionResult.totalQuestions} ({submissionResult.percentage}%)
                    </h2>
                    <p className="text-sm opacity-90">
                      {submissionResult.percentage === 100
                        ? '🎉 Perfect score! Outstanding comprehension!'
                        : submissionResult.percentage >= 80
                        ? '👏 Excellent work! Review the explanations below.'
                        : submissionResult.percentage >= 50
                        ? '👍 Good effort! Check the correct answers and explanations below.'
                        : '💪 Keep practicing! Read through the passage once more.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-gray-800 dark:text-gray-200"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Try Again
                  </button>
                  <button
                    onClick={handleBackToList}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-all"
                  >
                    Back to All Passages
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reading Passage Card */}
          <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-900/60 px-6 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                Reading Passage (本文)
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Preserving original Japanese characters & hiragana
              </span>
            </div>
            
            <div className="p-6 sm:p-8">
              <div 
                className={`${fontSizeClass} font-japanese text-gray-900 dark:text-gray-100 whitespace-pre-wrap selection:bg-emerald-200 dark:selection:bg-emerald-900/80`}
                style={{ fontFamily: "'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif" }}
              >
                {activeReading.passage}
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                Comprehension Questions (問題)
              </h2>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {Object.keys(selectedAnswers).length} of {activeReading.questions.length} answered
              </span>
            </div>

            <div className="space-y-6">
              {activeReading.questions.map((q, qIndex) => {
                const evalResult = submissionResult?.results?.find(r => r.questionIndex === qIndex);
                const userAnswer = selectedAnswers[qIndex];
                const isAnswered = !!userAnswer;

                return (
                  <div
                    key={qIndex}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      evalResult
                        ? evalResult.isCorrect
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700/60 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Question {qIndex + 1}
                        </span>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                          {q.question}
                        </h3>
                      </div>

                      {evalResult && (
                        <div className="flex-shrink-0">
                          {evalResult.isCorrect ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              Incorrect
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Options List */}
                    <div className="p-5 sm:p-6 space-y-3">
                      {q.options.map(option => {
                        const isSelected = userAnswer === option.label;
                        const isCorrectOption = evalResult?.correctAnswer === option.label;
                        
                        let optionStyle = 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-gray-800/80';
                        let badgeStyle = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
                        
                        if (evalResult) {
                          if (isCorrectOption) {
                            optionStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20';
                            badgeStyle = 'bg-emerald-500 text-white font-bold';
                          } else if (isSelected && !evalResult.isCorrect) {
                            optionStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-900/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/20';
                            badgeStyle = 'bg-rose-500 text-white font-bold';
                          } else {
                            optionStyle = 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 opacity-60';
                          }
                        } else if (isSelected) {
                          optionStyle = 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30';
                          badgeStyle = 'bg-emerald-600 dark:bg-emerald-500 text-white font-bold';
                        }

                        return (
                          <div
                            key={option.label}
                            onClick={() => !evalResult && handleSelectOption(qIndex, option.label)}
                            className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border text-sm sm:text-base transition-all ${optionStyle} ${
                              evalResult ? 'cursor-default' : 'cursor-pointer'
                            }`}
                          >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${badgeStyle}`}>
                              {option.label}
                            </span>
                            <span className="flex-1 text-gray-800 dark:text-gray-200">
                              {option.text}
                            </span>

                            {evalResult && isCorrectOption && (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 flex-shrink-0">
                                <Check className="w-4 h-4" /> Correct Answer
                              </span>
                            )}
                            {evalResult && isSelected && !evalResult.isCorrect && (
                              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
                                Your Choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation if submitted */}
                    {evalResult && evalResult.explanation && (
                      <div className="bg-gray-50 dark:bg-gray-900/60 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 text-sm">
                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                          Explanation
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                          {evalResult.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            {!submissionResult ? (
              <div className="sticky bottom-6 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Ready to submit?
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Object.keys(selectedAnswers).length} of {activeReading.questions.length} questions completed
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/20 transition-all text-sm sm:text-base"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Submit Answers
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 flex justify-center">
                <button
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to All Passages
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* View 2: Passages List / Catalog */
        <div className="space-y-8 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-4">
                <FileText className="w-3.5 h-3.5" />
                Reading Module • 読解 (Dokkai)
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                Reading Comprehension
              </h1>
              <p className="text-emerald-100 text-base sm:text-lg leading-relaxed">
                Practice authentic Japanese reading passages paragraph by paragraph. Master hiragana, katakana, and kanji context while challenging comprehension with multiple-choice questions.
              </p>
            </div>
            
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-15 pointer-events-none">
              <BookOpen className="w-80 h-80 text-white" />
            </div>
          </div>

          {/* Stats Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Passages</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/60 rounded-xl text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed} / {stats.total}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/60 rounded-xl text-cyan-600 dark:text-cyan-400">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Average Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.completed > 0 ? `${stats.avgScore}%` : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search passages, keywords, paragraph number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">JLPT:</span>
              <select
                value={selectedJlpt}
                onChange={(e) => setSelectedJlpt(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

          {/* Passage Cards Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Loading reading passages...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
              <p className="font-semibold mb-2">{error}</p>
              <button
                onClick={fetchReadings}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-all"
              >
                Retry
              </button>
            </div>
          ) : filteredReadings.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-8">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                No Reading Passages Found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
                {searchTerm || selectedJlpt !== 'all'
                  ? 'No passages match your search and filter criteria. Try clearing them.'
                  : 'No reading passages have been added yet. Passages created by the admin will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredReadings.map((reading) => {
                const isCompleted = !!reading.userProgress;
                const scorePercentage = reading.userProgress?.percentage;

                return (
                  <div
                    key={reading._id}
                    onClick={() => handleSelectReading(reading)}
                    className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Paragraph {reading.paragraphNumber}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {reading.jlptLevel}
                          </span>
                        </div>

                        {isCompleted && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            scorePercentage! >= 80 
                              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' 
                              : scorePercentage! >= 50
                              ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                          }`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {reading.userProgress?.score}/{reading.userProgress?.totalQuestions} ({scorePercentage}%)
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-2">
                        {reading.title}
                      </h3>

                      {/* Snippet */}
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed font-japanese">
                        {reading.passage}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-emerald-500" />
                        {reading.questions.length} Questions
                      </span>

                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                        {isCompleted ? 'Practice Again' : 'Start Reading'}
                        <ChevronRight className="w-4 h-4" />
                      </span>
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
