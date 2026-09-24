import React, { useState, useMemo } from 'react';
import { VocabularyItem } from '../types/vocab';
import { 
  Search, 
  Filter, 
  Volume2, 
  Edit3, 
  Trash2, 
  Plus, 
  Sparkles, 
  LayoutGrid, 
  Table as TableIcon,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface VocabListProps {
  vocabularies: VocabularyItem[];
  onOpenAddModal: () => void;
  onEditItem: (item: VocabularyItem) => void;
  onDeleteItem: (id: string) => Promise<void>;
  onStartPracticeWithWords?: (words: VocabularyItem[]) => void;
}

type SortOption = 'newest' | 'oldest' | 'accuracy-asc' | 'accuracy-desc' | 'practiced-desc' | 'alpha-jp';

export const VocabList: React.FC<VocabListProps> = ({
  vocabularies,
  onOpenAddModal,
  onEditItem,
  onDeleteItem,
  onStartPracticeWithWords
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Extract all unique categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    vocabularies.forEach(v => v.categories?.forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [vocabularies]);

  // Filter & Sort
  const filteredVocab = useMemo(() => {
    return vocabularies
      .filter((item) => {
        // Category filter
        if (selectedCategory !== 'all' && !item.categories?.includes(selectedCategory)) {
          return false;
        }

        // Search term
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase().trim();
        const matchJp = item.japanese.toLowerCase().includes(term);
        const matchReading = item.reading?.toLowerCase().includes(term);
        const matchEng = item.english.toLowerCase().includes(term);
        const matchCat = item.categories?.some(c => c.toLowerCase().includes(term));
        return matchJp || matchReading || matchEng || matchCat;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'newest':
            return b.createdAt - a.createdAt;
          case 'oldest':
            return a.createdAt - b.createdAt;
          case 'accuracy-asc': {
            const accA = a.timesPracticed > 0 ? a.timesCorrect / a.timesPracticed : 1;
            const accB = b.timesPracticed > 0 ? b.timesCorrect / b.timesPracticed : 1;
            return accA - accB;
          }
          case 'accuracy-desc': {
            const accA = a.timesPracticed > 0 ? a.timesCorrect / a.timesPracticed : 0;
            const accB = b.timesPracticed > 0 ? b.timesCorrect / b.timesPracticed : 0;
            return accB - accA;
          }
          case 'practiced-desc':
            return (b.timesPracticed || 0) - (a.timesPracticed || 0);
          case 'alpha-jp':
            return a.japanese.localeCompare(b.japanese, 'ja');
          default:
            return 0;
        }
      });
  }, [vocabularies, searchTerm, selectedCategory, sortOption]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop-in">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#1a1918] font-japanese">単語一覧</h1>
            <span className="text-xs bg-[#fef2f2] text-[#d93829] font-bold px-2 py-0.5 rounded-full border border-[#fee2e2]">
              {filteredVocab.length} {filteredVocab.length === 1 ? 'word' : 'words'}
            </span>
          </div>
          <p className="text-xs text-[#8c8880] mt-0.5">Manage, search, and hear pronunciation of your vocabulary bank.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Practice Filtered Button */}
          {filteredVocab.length > 0 && onStartPracticeWithWords && (
            <button
              onClick={() => onStartPracticeWithWords(filteredVocab)}
              className="flex items-center gap-1.5 bg-[#fef2f2] hover:bg-[#fee2e2] text-[#d93829] border border-[#fee2e2] px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Practice Filtered ({filteredVocab.length})</span>
            </button>
          )}

          {/* Add Word Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-[#d93829] hover:bg-[#b92a1d] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs shadow-red-200 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Vocabulary</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#f7f6f2] p-1 rounded-xl border border-[#eeece6]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#8c8880]'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#8c8880]'
              }`}
              title="Dense Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-[#eeece6] p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Japanese, reading, or English meaning..."
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

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ArrowUpDown className="w-4 h-4 text-[#8c8880] shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full sm:w-auto text-xs py-2 px-3 rounded-xl border border-[#d4d0c8] bg-white text-[#1a1918] focus:border-[#d93829] outline-hidden cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="accuracy-asc">Needs Revision (Lowest Accuracy)</option>
              <option value="accuracy-desc">Mastered (Highest Accuracy)</option>
              <option value="practiced-desc">Most Practiced</option>
              <option value="alpha-jp">Japanese Alphabetical (Kana)</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <span className="text-[11px] font-semibold text-[#8c8880] flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3" /> Category:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#1a1918] text-white'
                : 'bg-[#faf9f6] text-[#6e6b66] border border-[#eeece6] hover:border-[#d4d0c8]'
            }`}
          >
            All ({vocabularies.length})
          </button>
          {allCategories.map((cat) => {
            const count = vocabularies.filter(v => v.categories?.includes(cat)).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#d93829] text-white'
                    : 'bg-[#faf9f6] text-[#6e6b66] border border-[#eeece6] hover:border-[#d4d0c8]'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Vocabulary Results */}
      {filteredVocab.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#eeece6] p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#faf9f6] border border-[#eeece6] flex items-center justify-center mx-auto mb-4 text-2xl font-serif-jp text-[#8c8880]">
            無
          </div>
          <h3 className="text-base font-bold text-[#1a1918]">No vocabulary words found</h3>
          <p className="text-xs text-[#8c8880] mt-1 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try changing your search term or selecting a different category filter.'
              : 'Start by adding your first Japanese word to your personal word bank.'}
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#d93829] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vocabulary</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVocab.map((item) => {
            const accuracy = item.timesPracticed > 0
              ? Math.round((item.timesCorrect / item.timesPracticed) * 100)
              : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#eeece6] p-5 shadow-xs hover:shadow-md hover:border-[#d4d0c8] transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top bar: Category + Audio */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap gap-1">
                      {item.categories?.slice(0, 2).map((cat) => (
                        <span key={cat} className="text-[10px] font-semibold bg-[#faf9f6] border border-[#eeece6] text-[#6e6b66] px-2 py-0.5 rounded-md">
                          {cat}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => soundEffects.speakJapanese(item.japanese)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-[#d93829] hover:bg-[#fef2f2] transition-colors cursor-pointer"
                      title="Hear Japanese pronunciation"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Japanese Word & Reading */}
                  <div className="mb-2">
                    <div className="text-2xl sm:text-3xl font-bold font-japanese text-[#1a1918] group-hover:text-[#d93829] transition-colors">
                      {item.japanese}
                    </div>
                    {item.reading && (
                      <div className="text-xs text-[#8c8880] font-mono mt-0.5">
                        {(item as any).effectiveReading || item.reading}{item.romaji && item.romaji.trim() ? ` (${item.romaji.trim()})` : ''}
                      </div>
                    )}
                  </div>

                  {/* English Meanings (Effective Personal Meaning) */}
                  <div className="text-sm font-medium text-[#262524] mt-2 leading-snug">
                    {(item as any).effectiveMeaning || item.english}
                  </div>

                  {/* Personal Note */}
                  {(item as any).personalNote && (
                    <div className="mt-2.5 p-2 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 italic flex items-start gap-1.5">
                      <span className="shrink-0 font-normal">📝</span>
                      <span>{(item as any).personalNote}</span>
                    </div>
                  )}

                  {/* Notes / Example */}
                  {!(item as any).personalNote && item.notes && (
                    <p className="text-[11px] text-[#8c8880] mt-2 italic bg-[#faf9f6] p-2 rounded-lg border border-[#f0eee9]">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Card Bottom: Practice Stats & Actions */}
                <div className="mt-4 pt-3 border-t border-[#f2f0ea] flex items-center justify-between">
                  {/* Accuracy status */}
                  <div>
                    {accuracy === null ? (
                      <span className="text-[11px] text-[#8c8880] flex items-center gap-1 font-medium">
                        <HelpCircle className="w-3.5 h-3.5 text-neutral-300" />
                        <span>Unpracticed</span>
                      </span>
                    ) : (
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${
                        accuracy >= 80 ? 'text-emerald-600' : accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {accuracy >= 80 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{accuracy}% Acc ({item.timesPracticed} trials)</span>
                      </span>
                    )}
                  </div>

                  {/* Edit & Delete Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditItem(item)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                      title="Edit word"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
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
      ) : (
        /* Dense Table View */
        <div className="bg-white rounded-2xl border border-[#eeece6] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf9f6] border-b border-[#eeece6] text-[#8c8880] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Japanese Word</th>
                  <th className="py-3 px-4">Reading / Romaji</th>
                  <th className="py-3 px-4">English Meaning</th>
                  <th className="py-3 px-4">Categories</th>
                  <th className="py-3 px-4">Performance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeece6]">
                {filteredVocab.map((item) => {
                  const accuracy = item.timesPracticed > 0
                    ? Math.round((item.timesCorrect / item.timesPracticed) * 100)
                    : null;

                  return (
                    <tr key={item.id} className="hover:bg-[#faf9f6]/80 transition-colors">
                      <td className="py-3 px-4 font-japanese text-base font-bold text-[#1a1918] flex items-center gap-2">
                        <span>{item.japanese}</span>
                        <button
                          onClick={() => soundEffects.speakJapanese(item.japanese)}
                          className="text-neutral-400 hover:text-[#d93829] cursor-pointer"
                          title="Pronounce"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#8c8880]">
                        {(item as any).effectiveReading || item.reading || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#1a1918]">
                        {(item as any).effectiveMeaning || item.english}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {item.categories?.map((cat) => (
                            <span key={cat} className="text-[10px] bg-[#f7f6f2] text-[#6e6b66] px-1.5 py-0.5 rounded">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {accuracy === null ? (
                          <span className="text-[#8c8880]">Unpracticed</span>
                        ) : (
                          <span className={`font-bold ${
                            accuracy >= 80 ? 'text-emerald-600' : accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {accuracy}% ({item.timesPracticed} trials)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditItem(item)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteItem(item.id);
                            }}
                            className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete immediately"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
