import React, { useState, useEffect, useMemo } from 'react';
import { PatternItem, PatternChapterItem } from '../types/pattern';
import { api } from '../services/api';
import { 
  ArrowLeft, 
  BookmarkCheck, 
  Search, 
  Sparkles, 
  Volume2, 
  BookOpen, 
  Layers, 
  HelpCircle,
  FolderKanban,
  ChevronRight,
  Filter,
  RotateCcw
} from 'lucide-react';

interface PatternsViewProps {
  patterns?: PatternItem[];
  chapters?: PatternChapterItem[];
  customChapters?: any[];
  currentLevel?: string;
  isDarkMode?: boolean;
  onRefresh?: () => void;
}

export const PatternsView: React.FC<PatternsViewProps> = ({
  patterns: initialPatterns,
  chapters: initialChapters,
  customChapters: initialCustomChapters,
  currentLevel = 'N5',
  isDarkMode,
  onRefresh
}) => {
  // State initialization — ALWAYS arrays to prevent undefined.filter
  const [patterns, setPatterns] = useState<PatternItem[]>(
    Array.isArray(initialPatterns) ? initialPatterns : []
  );
  const [chapters, setChapters] = useState<any[]>(
    Array.isArray(initialChapters) ? initialChapters : []
  );
  const [customChapters, setCustomChapters] = useState<any[]>(
    Array.isArray(initialCustomChapters) ? initialCustomChapters : []
  );

  const [loading, setLoading] = useState<boolean>(!initialPatterns);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedCustomChapter, setSelectedCustomChapter] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJlpt, setSelectedJlpt] = useState<string>(currentLevel || 'all');

  // Fetch data from API
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [patternsRes, chaptersRes, customRes] = await Promise.all([
        api.patterns.getAll({ limit: 1000 }),
        api.patterns.getChapters(),
        api.customChapters.getAll()
      ]);

      const rawPatterns = patternsRes?.data || (patternsRes as any)?.patterns || [];
      const rawChapters = chaptersRes?.data || [];
      const rawCustom = customRes?.data || [];

      setPatterns(Array.isArray(rawPatterns) ? rawPatterns : []);
      setChapters(Array.isArray(rawChapters) ? rawChapters : []);
      setCustomChapters(Array.isArray(rawCustom) ? rawCustom : []);
    } catch (err: any) {
      console.error('Failed to load grammar patterns:', err);
      setError(err?.message || 'Failed to load grammar patterns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialPatterns) {
      loadData();
    }
  }, [initialPatterns]);

  // Audio speech player
  const playSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  };

  // Safe level patterns
  const levelPatterns = useMemo(() => {
    if (!Array.isArray(patterns)) return [];
    if (selectedJlpt === 'all') return patterns;
    return patterns.filter(p => (p.jlptLevel || 'N5') === selectedJlpt);
  }, [patterns, selectedJlpt]);

  // Aggregate counts per chapter (1 to 24)
  const chapterCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 24; i++) {
      counts[i] = 0;
    }
    if (Array.isArray(levelPatterns)) {
      levelPatterns.forEach(p => {
        if (p.destinationType === 'chapter' && typeof p.chapter === 'number') {
          counts[p.chapter] = (counts[p.chapter] || 0) + 1;
        }
      });
    }
    return counts;
  }, [levelPatterns]);

  // Custom chapters pattern counts
  const customChapterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (Array.isArray(customChapters)) {
      customChapters.forEach(c => {
        counts[c.id || c._id] = 0;
      });
    }
    if (Array.isArray(levelPatterns)) {
      levelPatterns.forEach(p => {
        if (p.destinationType === 'custom' && p.customChapterId) {
          const cId = typeof p.customChapterId === 'object'
            ? (p.customChapterId._id || p.customChapterId.id)
            : p.customChapterId;
          if (cId) {
            counts[cId] = (counts[cId] || 0) + 1;
          }
        }
      });
    }
    return counts;
  }, [levelPatterns, customChapters]);

  // Patterns belonging to currently opened chapter
  const activeChapterPatterns = useMemo(() => {
    if (!Array.isArray(levelPatterns)) return [];

    if (selectedCustomChapter) {
      const targetId = String(selectedCustomChapter._id || selectedCustomChapter.id);
      return levelPatterns.filter(p => {
        if (p.destinationType !== 'custom' || !p.customChapterId) return false;
        const cId = typeof p.customChapterId === 'object'
          ? String(p.customChapterId._id || p.customChapterId.id)
          : String(p.customChapterId);
        return cId === targetId;
      });
    }

    if (selectedChapter !== null) {
      return levelPatterns.filter(p => p.destinationType === 'chapter' && p.chapter === selectedChapter);
    }

    return [];
  }, [levelPatterns, selectedChapter, selectedCustomChapter]);

  // Search filtered patterns
  const filteredPatterns = useMemo(() => {
    if (!Array.isArray(activeChapterPatterns)) return [];
    if (!searchQuery.trim()) return activeChapterPatterns;
    const q = searchQuery.toLowerCase().trim();
    return activeChapterPatterns.filter(p => {
      const pFormula = (p.formula || p.pattern || '').toLowerCase();
      const pTitle = (p.title || '').toLowerCase();
      const pMeaning = (p.meaning || '').toLowerCase();
      const pUsage = (p.usage || '').toLowerCase();
      const hasMatchingExample = Array.isArray(p.examples) && p.examples.some(
        ex => (ex.japanese && ex.japanese.toLowerCase().includes(q)) || 
              (ex.english && ex.english.toLowerCase().includes(q))
      );

      return (
        pTitle.includes(q) ||
        pFormula.includes(q) ||
        pMeaning.includes(q) ||
        pUsage.includes(q) ||
        hasMatchingExample
      );
    });
  }, [activeChapterPatterns, searchQuery]);

  const handleBack = () => {
    setSelectedChapter(null);
    setSelectedCustomChapter(null);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium text-sm">Loading grammar patterns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 text-center bg-rose-50 rounded-3xl border border-rose-200 text-rose-800">
        <BookmarkCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold mb-1">Failed to Load Patterns</h3>
        <p className="text-xs text-rose-600 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  // VIEW 1: Active Chapter View (Detailed Patterns)
  if (selectedChapter !== null || selectedCustomChapter !== null) {
    const chapterTitle = selectedChapter !== null 
      ? `Chapter ${selectedChapter}` 
      : selectedCustomChapter?.name || 'Custom Chapter';

    return (
      <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto px-4 py-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-600" />
            <span>Back to All Chapters</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {chapterTitle}
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {filteredPatterns.length} pattern(s)
            </span>
          </div>
        </div>

        {/* Chapter Title Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white">
                {selectedChapter !== null ? `第${selectedChapter}課` : '特別課'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white">
                JLPT {selectedJlpt.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-japanese tracking-tight">
              {chapterTitle} Grammar Patterns
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100 mt-1 max-w-2xl">
              Study the core grammar rules, structure formulas, and contextual examples for this chapter.
            </p>
          </div>
          <BookmarkCheck className="w-64 h-64 absolute -right-12 -bottom-12 text-white/10 pointer-events-none" />
        </div>

        {/* Search Bar within chapter */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search pattern, formula, meaning, or sentence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-gray-200 bg-white focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>

        {/* Empty State when 0 patterns */}
        {filteredPatterns.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-300 shadow-xs space-y-3">
            <BookmarkCheck className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-800">
              No patterns available for this chapter yet.
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery.trim()
                ? 'No grammar patterns match your search query. Try clearing the search.'
                : 'Patterns for this chapter will appear here once added or imported by the admin.'}
            </p>
            {searchQuery.trim() && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          /* Patterns List */
          <div className="space-y-6">
            {filteredPatterns.map((pattern, index) => {
              const formulaText = pattern.formula || pattern.pattern || '';
              const examplesList = Array.isArray(pattern.examples) ? pattern.examples : [];

              return (
                <div
                  key={pattern._id || pattern.id || index}
                  className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden transition-all hover:border-indigo-300"
                >
                  {/* Pattern Header */}
                  <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-gray-50/50 to-white">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <h2 className="text-xl font-extrabold text-gray-900 font-japanese">
                          {pattern.title || formulaText}
                        </h2>
                      </div>
                      <p className="text-xs font-semibold text-gray-600 pl-8">
                        {pattern.meaning}
                      </p>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                      {pattern.jlptLevel || 'N5'}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-5">
                    {/* Formula Box */}
                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1.5">
                        Grammar Formula (構文)
                      </span>
                      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-3">
                        <BookmarkCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                        <span className="font-mono text-sm sm:text-base font-bold text-indigo-900 break-words font-japanese">
                          {formulaText}
                        </span>
                      </div>
                    </div>

                    {/* Usage Notes if present */}
                    {pattern.usage && (
                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                          Usage Notes & Explanation (解説)
                        </span>
                        <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                          {pattern.usage}
                        </p>
                      </div>
                    )}

                    {/* Example Sentences */}
                    {examplesList.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <span>Example Sentences ({examplesList.length})</span>
                        </div>

                        <div className="space-y-2.5">
                          {examplesList.map((ex, exIdx) => (
                            <div
                              key={exIdx}
                              className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5 group hover:border-indigo-200 transition-colors"
                            >
                              {/* Japanese sentence with speech button */}
                              <div className="flex items-start justify-between gap-3">
                                <span className="font-japanese text-sm sm:text-base font-bold text-gray-900 leading-relaxed">
                                  {ex.japanese}
                                </span>
                                <button
                                  onClick={() => playSpeech(ex.japanese)}
                                  className="p-1.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shrink-0 cursor-pointer shadow-2xs"
                                  title="Listen to Japanese pronunciation"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Reading / Furigana if provided */}
                              {ex.reading && ex.reading !== ex.japanese && (
                                <p className="font-japanese text-xs text-indigo-600">
                                  {ex.reading}
                                </p>
                              )}

                              {/* English translation */}
                              <p className="text-xs text-gray-600 font-medium">
                                {ex.english}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // VIEW 2: Chapter Selection Dashboard (Chapters 1 to 24 + Custom Chapters)
  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-800 rounded-3xl p-8 sm:p-10 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-indigo-100 text-xs font-semibold uppercase tracking-wider mb-4">
            <BookmarkCheck className="w-3.5 h-3.5" />
            Patterns Module • 文法 (Bunpou)
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Grammar Patterns
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
            Master Japanese sentence formulas and grammar rules chapter-by-chapter. Select any chapter to explore pattern breakdowns, usage notes, and authentic example sentences.
          </p>
        </div>

        <BookmarkCheck className="w-80 h-80 absolute -right-16 -bottom-16 text-white/10 pointer-events-none" />
      </div>

      {/* Filters and Stats Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-600 uppercase">JLPT Level:</span>
          <div className="flex items-center gap-1.5">
            {['all', 'N5', 'N4', 'N3'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedJlpt(lvl)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedJlpt === lvl
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {lvl === 'all' ? 'All Levels' : lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500 font-semibold">
          Total Patterns: <span className="font-bold text-indigo-600">{levelPatterns.length}</span>
        </div>
      </div>

      {/* Section 1: Standard Chapters 1 to 24 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Standard Chapters (1–24)
          </h2>
          <span className="text-xs text-gray-500">Minna no Nihongo Syllabus</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {Array.from({ length: 24 }, (_, i) => i + 1).map((ch) => {
            const count = chapterCounts[ch] || 0;
            return (
              <div
                key={ch}
                onClick={() => setSelectedChapter(ch)}
                className="group p-4 bg-white hover:bg-indigo-50/50 rounded-2xl border border-gray-200 hover:border-indigo-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider font-japanese">
                    第{ch}課
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    count > 0 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {count}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                    Chapter {ch}
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {count > 0 ? `${count} pattern(s)` : 'No patterns'}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-end text-gray-400 group-hover:text-indigo-600 transition-colors">
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Custom Chapters */}
      {customChapters.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Custom Chapters
            </h2>
            <span className="text-xs text-gray-500">Custom Category Syllabus</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {customChapters.map((cc) => {
              const cId = cc.id || cc._id;
              const count = customChapterCounts[cId] || 0;
              return (
                <div
                  key={cId}
                  onClick={() => setSelectedCustomChapter(cc)}
                  className="group p-5 bg-white hover:bg-indigo-50/50 rounded-2xl border border-gray-200 hover:border-indigo-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                        Custom
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        count > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {count}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                      {cc.name}
                    </h3>
                    {cc.description && (
                      <p className="text-[11px] text-gray-500 line-clamp-1">
                        {cc.description}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
