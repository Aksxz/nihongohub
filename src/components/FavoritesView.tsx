import React, { useState, useMemo } from 'react';
import { DisplayVocabularyItem, DisplayKanjiItem } from '../types/user';
import { VocabularyItem } from '../types/vocab';
import { KanjiItem } from '../types/kanji';
import { 
  Star, 
  Sparkles, 
  Volume2, 
  BookOpen, 
  Languages, 
  Search,
  Trash2,
  Edit3
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface FavoritesViewProps {
  vocabularies: DisplayVocabularyItem[];
  kanjis: DisplayKanjiItem[];
  onToggleVocabFavorite: (vocabId: string) => Promise<void>;
  onToggleKanjiFavorite: (kanjiId: string) => Promise<void>;
  onOpenCustomModal: (item: { type: 'vocab'; data: DisplayVocabularyItem } | { type: 'kanji'; data: DisplayKanjiItem }) => void;
  onPracticeVocab: (words: VocabularyItem[], title: string) => void;
  onPracticeKanji: (kanjis: KanjiItem[], title: string) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  vocabularies,
  kanjis,
  onToggleVocabFavorite,
  onToggleKanjiFavorite,
  onOpenCustomModal,
  onPracticeVocab,
  onPracticeKanji
}) => {
  const [tab, setTab] = useState<'all' | 'vocab' | 'kanji'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const favoriteVocabs = useMemo(() => {
    return vocabularies.filter(v => v.isFavorite);
  }, [vocabularies]);

  const favoriteKanjis = useMemo(() => {
    return kanjis.filter(k => k.isFavorite);
  }, [kanjis]);

  const filteredVocab = useMemo(() => {
    if (!searchTerm.trim()) return favoriteVocabs;
    const term = searchTerm.toLowerCase().trim();
    return favoriteVocabs.filter(v => 
      v.japanese.toLowerCase().includes(term) ||
      v.effectiveReading.toLowerCase().includes(term) ||
      v.effectiveMeaning.toLowerCase().includes(term)
    );
  }, [favoriteVocabs, searchTerm]);

  const filteredKanji = useMemo(() => {
    if (!searchTerm.trim()) return favoriteKanjis;
    const term = searchTerm.toLowerCase().trim();
    return favoriteKanjis.filter(k => 
      k.kanji.toLowerCase().includes(term) ||
      k.effectiveMeaning.toLowerCase().includes(term) ||
      k.onyomi?.toLowerCase().includes(term) ||
      k.kunyomi?.toLowerCase().includes(term)
    );
  }, [favoriteKanjis, searchTerm]);

  const totalFavoritesCount = favoriteVocabs.length + favoriteKanjis.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop-in space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-[#eeece6] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center">
                <Star className="w-4 h-4 fill-amber-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Personal Collection
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif-jp text-[#1a1918]">
              Favorites (お気に入り)
            </h1>
            <p className="text-xs text-[#8c8880] mt-1">
              {totalFavoritesCount} starred {totalFavoritesCount === 1 ? 'item' : 'items'} saved for quick access and drill practice
            </p>
          </div>

          {/* Quick Practice Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {favoriteVocabs.length > 0 && (
              <button
                onClick={() => onPracticeVocab(favoriteVocabs, 'Starred Vocabulary Drill')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Practice Vocab ({favoriteVocabs.length})</span>
              </button>
            )}

            {favoriteKanjis.length > 0 && (
              <button
                onClick={() => onPracticeKanji(favoriteKanjis, 'Starred Kanji Drill')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Practice Kanji ({favoriteKanjis.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab switcher */}
        <div className="flex p-1 bg-white rounded-2xl border border-[#eeece6] shadow-xs w-fit">
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'all' ? 'bg-[#1a1918] text-white' : 'text-[#6e6b66] hover:text-[#1a1918]'
            }`}
          >
            All ({totalFavoritesCount})
          </button>
          <button
            onClick={() => setTab('vocab')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'vocab' ? 'bg-[#1a1918] text-white' : 'text-[#6e6b66] hover:text-[#1a1918]'
            }`}
          >
            Vocabulary ({favoriteVocabs.length})
          </button>
          <button
            onClick={() => setTab('kanji')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'kanji' ? 'bg-[#1a1918] text-white' : 'text-[#6e6b66] hover:text-[#1a1918]'
            }`}
          >
            Kanji ({favoriteKanjis.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-[#8c8880] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search favorites..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#eeece6] rounded-xl text-[#1a1918] placeholder-[#8c8880] focus:outline-none focus:ring-2 focus:ring-[#d93829]/20"
          />
        </div>
      </div>

      {/* Content Grid */}
      {totalFavoritesCount === 0 ? (
        <div className="bg-white rounded-3xl border border-[#eeece6] p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-2xl text-amber-500">
            ⭐
          </div>
          <h3 className="text-base font-bold text-[#1a1918]">No favorites yet</h3>
          <p className="text-xs text-[#8c8880] mt-1 max-w-sm mx-auto">
            Click the star icon on any vocabulary word or Kanji card to save it to your personal favorites list.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Vocab Section */}
          {(tab === 'all' || tab === 'vocab') && filteredVocab.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#6e6b66] mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#d93829]" />
                <span>Starred Vocabulary ({filteredVocab.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVocab.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                          {v.jlpt || 'N5'} • {v.type || 'Word'}
                        </span>
                        <button
                          onClick={() => onToggleVocabFavorite(v.id)}
                          className="text-amber-500 hover:text-neutral-300 transition-colors cursor-pointer"
                          title="Remove from favorites"
                        >
                          <Star className="w-4 h-4 fill-amber-500" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <div className="text-2xl font-bold font-japanese text-[#1a1918]">
                            {v.japanese}
                          </div>
                          <div className="text-xs text-[#8c8880] font-mono mt-0.5">
                            {v.effectiveReading}
                          </div>
                        </div>
                        <button
                          onClick={() => soundEffects.speakJapanese(v.japanese)}
                          className="p-2 rounded-xl bg-[#faf9f6] text-[#8c8880] hover:text-[#d93829] transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-sm font-semibold text-[#1a1918] mt-2">
                        {v.effectiveMeaning}
                      </div>

                      {v.personalNote && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-50/60 border border-amber-100 text-[11px] text-amber-900 italic">
                          📝 {v.personalNote}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#f2f0ea] flex items-center justify-between text-xs text-[#8c8880]">
                      <span>{v.chapter ? `Chapter ${v.chapter}` : 'Extra Deck'}</span>
                      <button
                        onClick={() => onOpenCustomModal({ type: 'vocab', data: v })}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                        title="Personalize"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kanji Section */}
          {(tab === 'all' || tab === 'kanji') && filteredKanji.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#6e6b66] mb-3 flex items-center gap-2">
                <Languages className="w-4 h-4 text-[#ea580c]" />
                <span>Starred Kanji ({filteredKanji.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredKanji.map((k) => (
                  <div
                    key={k.id}
                    className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-orange-50 text-[#ea580c] border border-orange-100">
                          {k.jlpt || 'N5'} Kanji
                        </span>
                        <button
                          onClick={() => onToggleKanjiFavorite(k.id)}
                          className="text-amber-500 hover:text-neutral-300 transition-colors cursor-pointer"
                          title="Remove from favorites"
                        >
                          <Star className="w-4 h-4 fill-amber-500" />
                        </button>
                      </div>

                      <div className="text-center py-2 border-b border-[#f2f0ea]">
                        <div className="text-4xl font-bold font-japanese text-[#1a1918]">
                          {k.kanji}
                        </div>
                        <div className="text-sm font-bold text-[#1a1918] mt-1">
                          {k.effectiveMeaning}
                        </div>
                      </div>

                      <div className="mt-2 text-xs space-y-1">
                        {k.onyomi && (
                          <div className="text-[#8c8880]">On: <span className="font-japanese text-[#1a1918] font-semibold">{k.onyomi}</span></div>
                        )}
                        {k.kunyomi && (
                          <div className="text-[#8c8880]">Kun: <span className="font-japanese text-[#1a1918] font-semibold">{k.kunyomi}</span></div>
                        )}
                      </div>

                      {k.personalNote && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-50/60 border border-amber-100 text-[11px] text-amber-900 italic">
                          📝 {k.personalNote}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#f2f0ea] flex items-center justify-between text-xs text-[#8c8880]">
                      <button
                        onClick={() => soundEffects.speakJapanese(k.kanji)}
                        className="p-1 rounded-md hover:text-[#ea580c] transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenCustomModal({ type: 'kanji', data: k })}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                        title="Personalize"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
