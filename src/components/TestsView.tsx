import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Search, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  RotateCcw, 
  HelpCircle, 
  Sparkles,
  Trophy,
  Filter,
  Clock,
  ChevronRight,
  BookOpen,
  Award,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { TestItem, TestSubmissionResponse, TestProgressItem, TestQuestion } from '../types/test';

interface TestsViewProps {
  isDarkMode?: boolean;
}

export const TestsView: React.FC<TestsViewProps> = () => {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, TestProgressItem>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Test Execution State
  const [activeTest, setActiveTest] = useState<TestItem | null>(null);
  const [activeLoading, setActiveLoading] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<TestSubmissionResponse | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [testsRes, progressRes] = await Promise.all([
        api.tests.getAll(),
        api.tests.getMyProgress().catch(() => ({ success: false, data: [] }))
      ]);

      if (testsRes && testsRes.data) {
        setTests(testsRes.data);
      }

      if (progressRes && progressRes.data && Array.isArray(progressRes.data)) {
        const pMap: Record<string, TestProgressItem> = {};
        progressRes.data.forEach(p => {
          const tId = String(p.testId);
          if (!pMap[tId] || p.percentage > pMap[tId].percentage) {
            pMap[tId] = p;
          }
        });
        setUserProgress(pMap);
      }
    } catch (err: any) {
      console.error('Failed to load tests:', err);
      setError(err?.message || 'Failed to load tests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartTest = async (testId: string) => {
    try {
      setActiveLoading(true);
      setError(null);
      const res = await api.tests.getById(testId);
      if (res && res.data) {
        setActiveTest(res.data);
        setUserAnswers({});
        setSubmissionResult(null);

        // Start official test attempt on server for authenticated student
        try {
          const attemptRes = await api.tests.startAttempt(testId);
          if (attemptRes && attemptRes.success && attemptRes.attemptId) {
            setActiveAttemptId(attemptRes.attemptId);
          }
        } catch (_) {
          // Anonymous students or offline; backend fallback handles if needed
          setActiveAttemptId(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to load test details:', err);
      setError(err?.message || 'Could not start test. Please try again.');
    } finally {
      setActiveLoading(false);
    }
  };

  const handleSelectAnswer = (qIndex: number, answerVal: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [String(qIndex)]: answerVal
    }));
  };

  const handleSubmit = async () => {
    if (!activeTest) return;

    // Ensure all questions are answered
    const totalQ = activeTest.questions ? activeTest.questions.length : 0;
    const answeredCount = Object.keys(userAnswers).filter(k => userAnswers[k] && userAnswers[k].trim() !== '').length;

    if (answeredCount < totalQ) {
      const confirmSubmit = window.confirm(
        `You have only answered ${answeredCount} of ${totalQ} questions. Submit anyway?`
      );
      if (!confirmSubmit) return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await api.tests.submit(
        activeTest.id || activeTest._id,
        userAnswers,
        activeAttemptId || undefined
      );
      if (res && res.success) {
        setSubmissionResult(res);
        // Refresh progress list
        api.tests.getMyProgress().then(progressRes => {
          if (progressRes && progressRes.data) {
            const pMap: Record<string, TestProgressItem> = {};
            progressRes.data.forEach(p => {
              const tId = String(p.testId);
              if (!pMap[tId] || p.percentage > pMap[tId].percentage) {
                pMap[tId] = p;
              }
            });
            setUserProgress(pMap);
          }
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Error submitting test:', err);
      setError(err?.message || 'Failed to submit test answers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetakeTest = async () => {
    setUserAnswers({});
    setSubmissionResult(null);
    if (activeTest) {
      try {
        const attemptRes = await api.tests.startAttempt(activeTest.id || activeTest._id);
        if (attemptRes && attemptRes.success && attemptRes.attemptId) {
          setActiveAttemptId(attemptRes.attemptId);
        }
      } catch (_) {
        setActiveAttemptId(null);
      }
    }
  };

  const handleBackToCatalog = () => {
    setActiveTest(null);
    setUserAnswers({});
    setSubmissionResult(null);
    setActiveAttemptId(null);
    loadData();
  };

  const filteredTests = useMemo(() => {
    return tests.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [tests, searchTerm]);

  // Loading state
  if (loading && !activeTest) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-stone-500 font-medium text-sm">Loading NihongoHub tests...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW: Active Test Taking & Results
  // ==========================================
  if (activeTest) {
    const questions = activeTest.questions || [];

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Top Bar Navigation */}
        <button
          onClick={handleBackToCatalog}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 mb-6 font-medium text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Tests</span>
        </button>

        {/* Test Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  NihongoHub Test
                </span>
                <span className="text-xs text-stone-400 font-medium">
                  {questions.length} Question{questions.length !== 1 ? 's' : ''}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                {activeTest.title}
              </h1>
              {activeTest.description && (
                <p className="text-stone-600 text-sm mt-2 leading-relaxed">
                  {activeTest.description}
                </p>
              )}
            </div>

            {submissionResult && (
              <div className={`shrink-0 p-4 rounded-2xl border text-center ${
                submissionResult.percentage >= 80 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : submissionResult.percentage >= 60
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="text-2xl font-bold tracking-tight">
                  {submissionResult.score} / {submissionResult.totalQuestions}
                </div>
                <div className="text-xs font-bold uppercase tracking-wider mt-0.5">
                  {submissionResult.percentage}% Score
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Question Cards */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const currentAns = userAnswers[String(idx)] || '';
            const evalResult = submissionResult?.results?.find(r => r.questionIndex === idx);

            return (
              <div 
                key={idx}
                className={`bg-white rounded-3xl p-6 sm:p-7 border shadow-xs transition-all ${
                  evalResult
                    ? evalResult.isCorrect 
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-rose-300 bg-rose-50/20'
                    : 'border-stone-200'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'true_false' ? 'True / False' : 'Fill in the Blank'}
                    </span>
                  </div>

                  {evalResult && (
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      {evalResult.isCorrect ? (
                        <span className="text-emerald-600 flex items-center gap-1 bg-emerald-100/60 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center gap-1 bg-rose-100/60 px-2.5 py-1 rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Question Text */}
                <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-5 leading-snug">
                  {q.question}
                </h3>

                {/* TYPE A: Multiple Choice */}
                {q.type === 'mcq' && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    {q.options.map((opt) => {
                      const isSelected = currentAns.toUpperCase() === opt.label.toUpperCase();
                      const isOptionCorrect = evalResult && evalResult.correctAnswer.toUpperCase() === opt.label.toUpperCase();
                      const isOptionWrongUser = evalResult && !evalResult.isCorrect && isSelected;

                      let btnStyle = 'border-stone-200 hover:border-stone-300 bg-stone-50/60 text-stone-800';
                      if (isSelected && !evalResult) {
                        btnStyle = 'border-amber-500 bg-amber-50 text-amber-900 font-semibold ring-2 ring-amber-400/30';
                      }
                      if (evalResult) {
                        if (isOptionCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold ring-2 ring-emerald-400/40';
                        } else if (isOptionWrongUser) {
                          btnStyle = 'border-rose-400 bg-rose-50 text-rose-900 line-through';
                        } else {
                          btnStyle = 'border-stone-100 bg-white opacity-60 text-stone-400';
                        }
                      }

                      return (
                        <button
                          key={opt.label}
                          type="button"
                          disabled={!!evalResult}
                          onClick={() => handleSelectAnswer(idx, opt.label)}
                          className={`w-full text-left p-3.5 rounded-2xl border text-sm transition-all flex items-start gap-3 cursor-pointer disabled:cursor-default ${btnStyle}`}
                        >
                          <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected && !evalResult ? 'bg-amber-600 text-white' : 'bg-white border border-stone-200 text-stone-700'
                          }`}>
                            {opt.label}
                          </span>
                          <span className="leading-snug pt-0.5">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TYPE B: True / False */}
                {q.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    {['True', 'False'].map((tfVal) => {
                      const isSelected = currentAns.toLowerCase() === tfVal.toLowerCase();
                      const isOptionCorrect = evalResult && evalResult.correctAnswer.toLowerCase() === tfVal.toLowerCase();
                      const isOptionWrongUser = evalResult && !evalResult.isCorrect && isSelected;

                      let btnStyle = 'border-stone-200 hover:border-stone-300 bg-stone-50/60 text-stone-800';
                      if (isSelected && !evalResult) {
                        btnStyle = 'border-amber-500 bg-amber-50 text-amber-900 font-semibold ring-2 ring-amber-400/30';
                      }
                      if (evalResult) {
                        if (isOptionCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold ring-2 ring-emerald-400/40';
                        } else if (isOptionWrongUser) {
                          btnStyle = 'border-rose-400 bg-rose-50 text-rose-900 line-through';
                        } else {
                          btnStyle = 'border-stone-100 bg-white opacity-60 text-stone-400';
                        }
                      }

                      return (
                        <button
                          key={tfVal}
                          type="button"
                          disabled={!!evalResult}
                          onClick={() => handleSelectAnswer(idx, tfVal)}
                          className={`w-full text-center py-3.5 px-4 rounded-2xl border text-sm font-bold transition-all cursor-pointer disabled:cursor-default ${btnStyle}`}
                        >
                          {tfVal === 'True' ? '○ True (正しい)' : '✕ False (誤り)'}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TYPE C: Fill in the Blank */}
                {q.type === 'fill_blank' && (
                  <div className="mb-2">
                    <div className="relative">
                      <input
                        type="text"
                        disabled={!!evalResult}
                        value={currentAns}
                        onChange={(e) => handleSelectAnswer(idx, e.target.value)}
                        placeholder="Type your answer here..."
                        className={`w-full px-4 py-3 rounded-2xl border text-sm transition-all outline-none ${
                          evalResult
                            ? evalResult.isCorrect
                              ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900'
                              : 'border-rose-400 bg-rose-50/50 text-rose-900'
                            : 'border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 bg-stone-50/50 text-stone-900'
                        }`}
                      />
                    </div>

                    {evalResult && !evalResult.isCorrect && (
                      <div className="mt-2 text-xs font-semibold text-rose-700">
                        Expected answer: <span className="font-bold underline">{evalResult.correctAnswer}</span>
                        {evalResult.acceptedAnswers && evalResult.acceptedAnswers.length > 0 && (
                          <span className="text-stone-500 ml-1">
                            (also accepted: {evalResult.acceptedAnswers.join(', ')})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Post-Submit Explanation */}
                {evalResult && evalResult.explanation && (
                  <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-start gap-2.5 text-xs text-stone-600">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-800 mr-1">Explanation:</span>
                      <span>{evalResult.explanation}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-stone-200 shadow-sm">
          <div>
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {submissionResult ? 'Test Completed' : 'Progress'}
            </div>
            <div className="text-sm font-semibold text-stone-900 mt-0.5">
              {submissionResult 
                ? `You scored ${submissionResult.score} / ${submissionResult.totalQuestions} (${submissionResult.percentage}%)`
                : `${Object.keys(userAnswers).filter(k => userAnswers[k] && userAnswers[k].trim()).length} of ${questions.length} questions answered`
              }
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {submissionResult ? (
              <>
                <button
                  onClick={handleRetakeTest}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-sm transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={handleBackToCatalog}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-xs transition-all cursor-pointer"
                >
                  <span>All Tests</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || questions.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Grading Answers...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    <span>Submit Test</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: Tests Catalog List
  // ==========================================
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-md shadow-amber-600/10 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
            <CheckSquare className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
            JLPT Comprehensive Assessment
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          NihongoHub Tests
        </h1>
        <p className="text-amber-100 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          Challenge your Japanese skills across multiple-choice questions, true/false evaluations, and strict fill-in-the-blank grammar and vocabulary exercises.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tests by title or topic..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="text-xs text-stone-500 font-medium">
          Showing <span className="font-bold text-stone-800">{filteredTests.length}</span> tests
        </div>
      </div>

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center max-w-md mx-auto">
          <CheckSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800 mb-1">No Tests Found</h3>
          <p className="text-stone-500 text-xs">
            {searchTerm ? 'No tests match your search query.' : 'There are no active tests available yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTests.map((test) => {
            const progress = userProgress[test.id || test._id];

            return (
              <div
                key={test.id || test._id}
                className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                      {test.questionCount || 0} Questions
                    </span>

                    {progress && (
                      <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        progress.percentage >= 80 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <Trophy className="w-3 h-3" />
                        <span>Best: {progress.percentage}%</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-stone-900 group-hover:text-amber-600 transition-colors line-clamp-1 mb-2">
                    {test.title}
                  </h3>

                  <p className="text-stone-500 text-xs line-clamp-2 leading-relaxed mb-4">
                    {test.description || 'Comprehensive test covering vocabulary, grammar, and sentence structures.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <div className="text-[11px] text-stone-400">
                    {progress ? `Last attempted: ${new Date(progress.attemptedAt).toLocaleDateString()}` : 'Not attempted yet'}
                  </div>

                  <button
                    onClick={() => handleStartTest(test.id || test._id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 group-hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <span>{progress ? 'Retake' : 'Start Test'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
