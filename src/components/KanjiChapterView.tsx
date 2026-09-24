import React, { useState, useMemo } from 'react';
import { KanjiItem, JLPTLevel } from '../types/kanji';
import { DisplayKanjiItem } from '../types/user';
import { 
  Volume2, 
  Edit3, 
  Trash2, 
  Plus, 
  Sparkles, 
  Search, 
  BookOpen, 
  Star,
  CheckCircle2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { soundEffects } from '../utils/audio';
import { BackButton } from './BackButton';

interface KanjiChapterViewProps {
  chapterNum?: number; // undefined if Extra Kanji
  kanjis: DisplayKanjiItem[];
  onBackToChapters: () => void;
  onOpenAddModal: (chapter?: number) => void;
  onEditItem: (item: KanjiItem) => void;
  onDeleteItem: (id: string) => void;
  onPracticeChapter: (items: KanjiItem[], title: string) => void;
  onToggleFavorite?: (id: string) => Promise<void>;
  onToggleMastered?: (id: string) => Promise<void>;
  onToggleDifficult?: (id: string) => Promise<void>;
  onPersonalizeItem?: (item: DisplayKanjiItem) => void;
}

export const KanjiChapterView: React.FC<KanjiChapterViewProps> = ({
  chapterNum,
  kanjis,
  onBackToChapters,
  onOpenAddModal,
  onEditItem,
  onDeleteItem,
  onPracticeChapter,
  onToggleFavorite,
  onToggleMastered,
  onToggleDifficult,
  onPersonalizeItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJlpt, setSelectedJlpt] = useState<JLPTLevel | 'All'>('All');

  const isExtra = chapterNum === undefined;
  const pageTitle = isExtra ? 'Extra Kanji (その他の漢字)' : `Chapter ${chapterNum} (第${chapterNum}課) Kanji`;

  // Filter for this chapter / deck
  const chapterKanjis = useMemo(() => {
    return kanjis.filter(k => {
      if (isExtra) return k.source === 'Extra';
      return k.source === 'Textbook' && k.chapter === chapterNum;
    });
  }, [kanjis, chapterNum, isExtra]);

  // Search & JLPT filter
  const displayedKanjis = useMemo(() => {
    return chapterKanjis.filter(k => {
      const matchesJlpt = selectedJlpt === 'All' || k.jlpt === selectedJlpt;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term ||
        k.kanji.includes(term) ||
        k.meaning.toLowerCase().includes(term) ||
        k.onyomi?.toLowerCase().includes(term) ||
        k.kunyomi?.toLowerCase().includes(term) ||
        k.romaji?.toLowerCase().includes(term);
      return matchesJlpt && matchesSearch;
    });
  }, [chapterKanjis, searchTerm, selectedJlpt]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop-in space-y-6">
      
      {/* Top Bar: Back Button & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <BackButton onClick={onBackToChapters} label="Back to Kanji Chapters" />

        <div className="flex items-center gap-2">
          {displayedKanjis.length > 0 && (
            <button
              onClick={() => onPracticeChapter(displayedKanjis, pageTitle)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#fff7ed] border border-orange-200 text-[#ea580c] hover:bg-orange-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Practice This Deck ({displayedKanjis.length})</span>
            </button>
          )}

          <button
            onClick={() => onOpenAddModal(chapterNum)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs shadow-orange-200 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Kanji</span>
          </button>
        </div>
      </div>

      {/* Chapter Banner */}
      <div className="bg-white rounded-3xl border border-[#eeece6] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c] bg-[#fff7ed] px-2.5 py-0.5 rounded-full border border-orange-100">
                {isExtra ? 'Extra Deck' : `Textbook Chapter ${chapterNum}`}
              </span>
              <span className="text-xs font-bold text-[#8c8880]">
                {displayedKanjis.length} {displayedKanjis.length === 1 ? 'character' : 'characters'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a1918] font-japanese">
              {pageTitle}
            </h1>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search character, meaning..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#d4d0c8] text-xs focus:border-[#ea580c] outline-hidden"
              />
            </div>

            <select
              value={selectedJlpt}
              onChange={(e) => setSelectedJlpt(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-[#d4d0c8] text-xs font-bold bg-white text-[#1a1918] focus:border-[#ea580c] outline-hidden cursor-pointer"
            >
              <option value="All">All JLPT</option>
              <option value="N5">N5</option>
              <option value="N4">N4</option>
              <option value="N3">N3</option>
              <option value="N2">N2</option>
              <option value="N1">N1</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanji Cards Grid */}
      {displayedKanjis.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#eeece6] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#fff7ed] text-[#ea580c] flex items-center justify-center mx-auto text-xl font-bold font-japanese">
            漢
          </div>
          <h3 className="text-base font-bold text-[#1a1918]">No Kanji available yet.</h3>
          <p className="text-xs text-[#8c8880] max-w-sm mx-auto">
            {searchTerm || selectedJlpt !== 'All' 
              ? 'No characters match your search or filter.' 
              : 'No Kanji characters have been added to this deck yet.'}
          </p>
          <button
            onClick={() => onOpenAddModal(chapterNum)}
            className="mt-2 px-4 py-2 rounded-xl bg-[#ea580c] text-white text-xs font-semibold hover:bg-[#c2410c] transition-colors cursor-pointer"
          >
            + Add First Kanji
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedKanjis.map(item => {
            const accuracy = item.practiceCount > 0 
              ? Math.round((item.correctCount / item.practiceCount) * 100) 
              : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#eeece6] p-5 shadow-xs hover:shadow-md hover:border-orange-200 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top: JLPT badge, Custom Badge & Quick Toggles */}
                  <div className="flex items-center justify-between gap-1 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold bg-[#fff7ed] text-[#ea580c] border border-orange-200 px-2 py-0.5 rounded-md font-mono">
                        {item.jlpt || 'N5'}
                      </span>
                      {item.hasPersonalCustomization && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md">
                          Custom
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => onToggleFavorite?.(item.id)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          item.isFavorite ? 'text-amber-500' : 'text-[#8c8880] hover:text-amber-500'
                        }`}
                        title={item.isFavorite ? 'Starred' : 'Add to favorites'}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-500' : ''}`} />
                      </button>

                      <button
                        onClick={() => onToggleMastered?.(item.id)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          item.isMastered ? 'text-emerald-600' : 'text-[#8c8880] hover:text-emerald-600'
                        }`}
                        title={item.isMastered ? 'Mastered ✓' : 'Mark as mastered'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onToggleDifficult?.(item.id)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          item.isDifficult ? 'text-rose-600' : 'text-[#8c8880] hover:text-rose-600'
                        }`}
                        title={item.isDifficult ? 'Flagged as difficult ⚠' : 'Mark as difficult'}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => soundEffects.speakJapanese(item.kanji)}
                        className="p-1 rounded-md text-neutral-400 hover:text-[#ea580c] transition-colors cursor-pointer"
                        title="Hear Kanji pronunciation"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Character & Primary Meaning */}
                  <div className="text-center py-2 border-b border-[#f2f0ea]">
                    <div className="text-5xl font-bold font-japanese text-[#1a1918] group-hover:scale-105 transition-transform duration-200">
                      {item.kanji}
                    </div>
                    <div className="text-sm font-bold text-[#1a1918] mt-2">
                      {item.effectiveMeaning || item.meaning}
                    </div>
                  </div>

                  {/* Personal Note */}
                  {item.personalNote && (
                    <div className="mt-2.5 p-2 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 italic flex items-start gap-1.5">
                      <span className="shrink-0 font-normal">📝</span>
                      <span>{item.personalNote}</span>
                    </div>
                  )}

                  {/* Global Notes if no personal note */}
                  {!item.personalNote && item.notes && (
                    <p className="text-[11px] text-[#8c8880] mt-2 italic bg-[#faf9f6] p-2 rounded-lg border border-[#f0eee9]">
                      {item.notes}
                    </p>
                  )}

                  {/* On'yomi & Kun'yomi Readings */}
                  <div className="mt-3 space-y-1 text-xs">
                    {item.onyomi && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] uppercase font-bold text-[#8c8880] w-12 shrink-0">On'yomi:</span>
                        <span className="font-japanese font-semibold text-[#1a1918]">{item.onyomi}</span>
                      </div>
                    )}
                    {item.kunyomi && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] uppercase font-bold text-[#8c8880] w-12 shrink-0">Kun'yomi:</span>
                        <span className="font-japanese font-semibold text-[#1a1918]">{item.kunyomi}</span>
                      </div>
                    )}
                    {item.romaji && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] uppercase font-bold text-[#8c8880] w-12 shrink-0">Romaji:</span>
                        <span className="font-mono text-[#6e6b66]">{item.romaji}</span>
                      </div>
                    )}
                  </div>

                  {/* Example Words */}
                  {item.exampleWords && item.exampleWords.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#f2f0ea] space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880] block">
                        Example Words:
                      </span>
                      <div className="space-y-1">
                        {item.exampleWords.slice(0, 2).map((w, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-[#faf9f6] px-2 py-1 rounded-lg">
                            <div className="flex items-baseline gap-1.5 truncate">
                              <span className="font-japanese font-bold text-[#1a1918]">{w.word}</span>
                              {w.reading && <span className="text-[10px] text-[#8c8880] font-japanese">({w.reading})</span>}
                              <span className="text-[11px] text-[#6e6b66] truncate">— {w.meaning}</span>
                            </div>
                            <button
                              onClick={() => soundEffects.speakJapanese(w.word)}
                              className="text-neutral-400 hover:text-[#ea580c] shrink-0 ml-1 cursor-pointer"
                              title="Pronounce word"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom: Performance & Action Buttons */}
                <div className="mt-4 pt-3 border-t border-[#f2f0ea] flex items-center justify-between text-xs">
                  <div>
                    {accuracy === null ? (
                      <span className="text-[11px] text-[#8c8880] font-medium">Unpracticed</span>
                    ) : (
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${
                        accuracy >= 80 ? 'text-emerald-600' : accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {accuracy >= 80 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{accuracy}% ({item.practiceCount} trials)</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Personalize Button */}
                    <button
                      onClick={() => onPersonalizeItem?.(item)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-[#ea580c] hover:bg-orange-50 transition-colors cursor-pointer"
                      title="Personalize meaning or note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Kanji immediately"
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

    </div>
  );
};
