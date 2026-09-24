import React, { useState, useMemo } from 'react';
import { VocabularyItem, WordType, LearningStatus } from '../types/vocab';
import { DisplayVocabularyItem } from '../types/user';
import { 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  Volume2, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Flame,
  Star,
  UserCheck
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface ChapterVocabViewProps {
  chapterNum?: number; // if undefined, represents Extra Vocabulary
  customChapter?: {
    _id?: string;
    id?: string;
    name: string;
    displayName: string;
    japaneseName?: string;
    description?: string;
    jlptLevel?: string;
  };
  vocabularies: DisplayVocabularyItem[];
  onBackToChapters: () => void;
  onOpenAddModal: (preselectedChapter?: number) => void;
  onEditItem: (item: VocabularyItem) => void;
  onDeleteItem: (id: string) => Promise<void>;
  onPracticeWords: (words: VocabularyItem[], title: string, scope?: any) => void;
  onToggleFavorite?: (id: string) => Promise<void>;
  onToggleLearned?: (id: string) => Promise<void>;
  onToggleDifficult?: (id: string) => Promise<void>;
  onPersonalizeItem?: (item: DisplayVocabularyItem) => void;
}

const WORD_TYPES: (WordType | 'All')[] = [
  'All',
  'Noun',
  'Verb',
  'Adjective',
  'Adverb',
  'Particle',
  'Expression',
  'Counter',
  'Other'
];

export const ChapterVocabView: React.FC<ChapterVocabViewProps> = ({
  chapterNum,
  customChapter,
  vocabularies,
  onBackToChapters,
  onOpenAddModal,
  onEditItem,
  onDeleteItem,
  onPracticeWords,
  onToggleFavorite,
  onToggleLearned,
  onToggleDifficult,
  onPersonalizeItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<WordType | 'All'>('All');
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());

  const isExtra = chapterNum === undefined && !customChapter;

  // Filter words strictly belonging to this textbook chapter, custom chapter, or extra
  const chapterWords = useMemo(() => {
    if (customChapter) {
      const targetId = (customChapter._id || customChapter.id || '').toString();
      return vocabularies.filter(v => (v.customChapterId && v.customChapterId.toString() === targetId) || (v.destinationType === 'custom' && v.customChapterId && v.customChapterId.toString() === targetId));
    }
    if (isExtra) {
      return vocabularies.filter(v => v.destinationType === 'extra' || (!v.customChapterId && (v.source === 'Extra' || !v.chapter || v.chapter <= 0)));
    }
    return vocabularies.filter(v => (!v.destinationType || v.destinationType === 'chapter') && !v.customChapterId && v.source !== 'Extra' && v.chapter === chapterNum);
  }, [vocabularies, chapterNum, isExtra, customChapter]);

  // Apply search & type filter
  const filteredWords = useMemo(() => {
    return chapterWords.filter(v => {
      if (selectedType !== 'All' && v.type !== selectedType) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const matchJp = v.japanese.toLowerCase().includes(term);
      const matchReading = v.reading.toLowerCase().includes(term);
      const matchRomaji = v.romaji?.toLowerCase().includes(term);
      const matchEng = v.english.toLowerCase().includes(term);
      return matchJp || matchReading || matchRomaji || matchEng;
    });
  }, [chapterWords, selectedType, searchTerm]);

  // Checkbox selection helpers
  const toggleSelectWord = (id: string) => {
    const next = new Set(selectedWordIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedWordIds(next);
  };

  const handleSelectAll = () => {
    if (selectedWordIds.size === filteredWords.length) {
      setSelectedWordIds(new Set());
    } else {
      setSelectedWordIds(new Set(filteredWords.map(w => w.id)));
    }
  };

  const handlePracticeSelected = () => {
    const selectedItems = filteredWords.filter(w => selectedWordIds.has(w.id));
    if (selectedItems.length > 0) {
      onPracticeWords(selectedItems, `Custom Selection (${selectedItems.length} words)`, {
        mode: 'custom',
        initialItems: selectedItems
      });
    }
  };

  const handlePracticeEntireChapter = () => {
    if (chapterWords.length > 0) {
      const title = customChapter ? (customChapter.displayName || customChapter.name) : (isExtra ? 'Extra Vocabulary' : `Chapter ${chapterNum}`);
      const scope = customChapter
        ? { mode: 'custom', customChapterId: customChapter.id || (customChapter as any)._id }
        : isExtra
        ? { mode: 'custom', isExtra: true }
        : { mode: 'chapter', chapter: chapterNum };
      onPracticeWords(chapterWords, title, scope);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop-in space-y-6">
      
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eeece6] pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToChapters}
            className="p-2 rounded-xl bg-white border border-[#eeece6] hover:bg-[#faf9f6] text-[#6e6b66] hover:text-[#1a1918] transition-colors cursor-pointer"
            title="Back to Chapters Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            {customChapter ? (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-sky-50 text-sky-700 font-bold px-2.5 py-0.5 rounded-full border border-sky-200">
                    {customChapter.jlptLevel || 'N5'} Custom Deck
                  </span>
                  <h1 className="text-2xl font-extrabold text-[#1a1918] font-japanese">
                    {customChapter.displayName || customChapter.name}
                  </h1>
                  {customChapter.japaneseName && (
                    <span className="text-sm font-japanese text-[#8c8880]">
                      ({customChapter.japaneseName})
                    </span>
                  )}
                  <span className="text-xs bg-[#fef2f2] text-[#d93829] font-bold px-2.5 py-0.5 rounded-full border border-[#fee2e2]">
                    {chapterWords.length} {chapterWords.length === 1 ? 'word' : 'words'}
                  </span>
                </div>
                <p className="text-xs text-[#8c8880] mt-0.5">
                  {customChapter.description || `Vocabulary assigned to custom deck "${customChapter.displayName || customChapter.name}"`}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-[#1a1918] font-japanese">
                    {isExtra ? '課外単語・Extra Vocabulary' : `第${chapterNum}課・Chapter ${chapterNum}`}
                  </h1>
                  <span className="text-xs bg-[#fef2f2] text-[#d93829] font-bold px-2.5 py-0.5 rounded-full border border-[#fee2e2]">
                    {chapterWords.length} {chapterWords.length === 1 ? 'word' : 'words'}
                  </span>
                </div>
                <p className="text-xs text-[#8c8880] mt-0.5">
                  {isExtra 
                    ? 'Vocabulary outside your standard curriculum' 
                    : `All vocabulary assigned to Chapter ${chapterNum}`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Practice Chapter CTA */}
          {chapterWords.length > 0 && (
            <button
              onClick={handlePracticeEntireChapter}
              className="flex items-center gap-2 bg-[#d93829] hover:bg-[#b92a1d] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs shadow-red-200 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Practice This {customChapter ? 'Deck' : (isExtra ? 'Deck' : 'Chapter')}</span>
            </button>
          )}

          {/* Add Word to this chapter */}
          <button
            onClick={() => onOpenAddModal(chapterNum)}
            className="flex items-center gap-1.5 bg-white hover:bg-[#faf9f6] text-[#1a1918] border border-[#d4d0c8] px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#d93829]" />
            <span>+ Add Word</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-[#eeece6] p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Japanese, Romaji, or English..."
              className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl border border-[#d4d0c8] focus:border-[#d93829] focus:ring-2 focus:ring-red-100 outline-hidden transition-all text-[#1a1918]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Select All Toggle */}
          {filteredWords.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#eeece6] bg-[#faf9f6] text-xs font-medium text-[#6e6b66] hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
            >
              {selectedWordIds.size === filteredWords.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-[#d93829]" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  <span>Select All ({filteredWords.length})</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Word Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <span className="text-[11px] font-semibold text-[#8c8880] flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3" /> Type:
          </span>
          {WORD_TYPES.map(type => {
            const count = type === 'All' 
              ? chapterWords.length 
              : chapterWords.filter(w => w.type === type).length;
            if (type !== 'All' && count === 0) return null; // Only show types with words
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  selectedType === type
                    ? 'bg-[#1a1918] text-white'
                    : 'bg-[#faf9f6] text-[#6e6b66] border border-[#eeece6] hover:border-[#d4d0c8]'
                }`}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Vocabulary Words Grid */}
      {filteredWords.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#eeece6] p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#faf9f6] border border-[#eeece6] flex items-center justify-center mx-auto mb-4 text-2xl font-serif-jp text-[#8c8880]">
            無
          </div>
          <h3 className="text-base font-bold text-[#1a1918]">No vocabulary words found</h3>
          <p className="text-xs text-[#8c8880] mt-1 max-w-sm mx-auto">
            {searchTerm || selectedType !== 'All'
              ? 'No words match your filter criteria.'
              : `This ${isExtra ? 'deck' : `Chapter ${chapterNum}`} doesn't have any words yet.`}
          </p>
          <button
            onClick={() => onOpenAddModal(chapterNum)}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#d93829] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vocabulary Word</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map(item => {
            const isSelected = selectedWordIds.has(item.id);

            // Status styling
            let statusBadge = {
              text: item.learningStatus,
              className: 'bg-neutral-100 text-neutral-600'
            };
            if (item.learningStatus === 'Mastered') {
              statusBadge = { text: 'Mastered ✓', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
            } else if (item.learningStatus === 'Familiar') {
              statusBadge = { text: 'Familiar', className: 'bg-blue-50 text-blue-700 border border-blue-200' };
            } else if (item.learningStatus === 'Difficult') {
              statusBadge = { text: 'Weak Word ⚠', className: 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' };
            } else if (item.learningStatus === 'Learning') {
              statusBadge = { text: 'Learning', className: 'bg-amber-50 text-amber-700 border border-amber-200' };
            }

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between group ${
                  isSelected ? 'border-[#d93829] ring-2 ring-red-100' : 'border-[#eeece6] hover:border-[#d4d0c8]'
                }`}
              >
                <div>
                  {/* Top Bar: Checkbox + Level + Type + Custom Badge + Quick Toggles */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleSelectWord(item.id)}
                        className="text-[#8c8880] hover:text-[#d93829] transition-colors cursor-pointer"
                        title={isSelected ? 'Deselect word' : 'Select word for custom test'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#d93829]" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <span className="text-[10px] font-bold uppercase tracking-wider bg-red-50 text-[#d93829] border border-red-100 px-1.5 py-0.5 rounded-md">
                        {item.jlpt || 'N5'}
                      </span>

                      {item.type && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#faf9f6] border border-[#eeece6] text-[#6e6b66] px-2 py-0.5 rounded-md">
                          {item.type}
                        </span>
                      )}

                      {item.hasPersonalCustomization && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md" title="You have personal custom edits on this word">
                          Customized
                        </span>
                      )}
                    </div>

                    {/* Quick Toggles: Star, Learned, Difficult */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => onToggleFavorite?.(item.id)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          item.isFavorite ? 'text-amber-500' : 'text-[#8c8880] hover:text-amber-500'
                        }`}
                        title={item.isFavorite ? 'Starred (in favorites)' : 'Star (add to favorites)'}
                      >
                        <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-500' : ''}`} />
                      </button>

                      <button
                        onClick={() => onToggleLearned?.(item.id)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          item.isLearned ? 'text-emerald-600' : 'text-[#8c8880] hover:text-emerald-600'
                        }`}
                        title={item.isLearned ? 'Learned ✓' : 'Mark as learned'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onToggleDifficult?.(item.id)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          item.isDifficult ? 'text-rose-600' : 'text-[#8c8880] hover:text-rose-600'
                        }`}
                        title={item.isDifficult ? 'Flagged as difficult ⚠' : 'Mark as difficult'}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Japanese Word & 🔊 Speaker Button */}
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold font-japanese text-[#1a1918]">
                        {item.japanese}
                      </div>
                      <div className="text-xs text-[#8c8880] font-mono mt-0.5">
                        {item.effectiveReading || item.reading}{item.romaji && item.romaji.trim() ? ` (${item.romaji.trim()})` : ''}
                      </div>
                    </div>

                    {/* 🔊 Pronunciation Button */}
                    <button
                      onClick={() => soundEffects.speakJapanese(item.japanese)}
                      className="p-2.5 rounded-xl bg-[#faf9f6] border border-[#eeece6] text-[#6e6b66] hover:text-[#d93829] hover:bg-[#fef2f2] transition-colors cursor-pointer shrink-0"
                      title="Pronounce Japanese word"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* English Meaning (Effective Personal Meaning) */}
                  <div className="text-sm font-semibold text-[#262524] mt-2 leading-snug">
                    {item.effectiveMeaning || item.english}
                  </div>

                  {/* Personal Note */}
                  {item.personalNote && (
                    <div className="mt-2.5 p-2 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 italic flex items-start gap-1.5">
                      <span className="shrink-0 font-normal">📝</span>
                      <span>{item.personalNote}</span>
                    </div>
                  )}

                  {/* Global Notes / Example if no personal note */}
                  {!item.personalNote && item.notes && (
                    <p className="text-[11px] text-[#8c8880] mt-2 italic bg-[#faf9f6] p-2 rounded-lg border border-[#f0eee9]">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Bottom Footer: Stats + Actions */}
                <div className="mt-4 pt-3 border-t border-[#f2f0ea] flex items-center justify-between text-xs text-[#8c8880]">
                  <div className="flex items-center gap-1.5">
                    {item.practiceCount > 0 ? (
                      <span>{item.correctCount}/{item.practiceCount} correct</span>
                    ) : (
                      <span>Unpracticed</span>
                    )}
                    {item.consecutiveCorrect >= 3 && (
                      <span className="flex items-center text-orange-500 font-bold" title="Consecutive streak">
                        🔥 {item.consecutiveCorrect}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Personalize Button */}
                    <button
                      onClick={() => onPersonalizeItem?.(item)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-[#d93829] hover:bg-red-50 transition-colors cursor-pointer"
                      title="Personalize meaning, reading, or study note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Item */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete immediately"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Bar for Custom Selection */}
      {selectedWordIds.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 max-w-lg mx-auto px-4 animate-pop-in">
          <div className="bg-[#1a1918] text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-neutral-700">
            <div className="text-xs font-semibold flex items-center gap-2 pl-2">
              <span className="w-2 h-2 rounded-full bg-[#d93829] animate-pulse"></span>
              <span>{selectedWordIds.size} {selectedWordIds.size === 1 ? 'word' : 'words'} selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedWordIds(new Set())}
                className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={handlePracticeSelected}
                className="flex items-center gap-1.5 bg-[#d93829] hover:bg-[#b92a1d] text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Practice Selected ({selectedWordIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
