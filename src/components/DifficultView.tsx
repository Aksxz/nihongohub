import React, { useState, useMemo } from 'react';
import { DisplayVocabularyItem, DisplayKanjiItem } from '../types/user';
import { VocabularyItem } from '../types/vocab';
import { KanjiItem } from '../types/kanji';
import { 
  AlertTriangle, 
  Sparkles, 
  Volume2, 
  BookOpen, 
  Languages, 
  Search,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface DifficultViewProps {
  vocabularies: DisplayVocabularyItem[];
  kanjis: DisplayKanjiItem[];
  onToggleVocabDifficult: (vocabId: string) => Promise<void>;
  onToggleKanjiDifficult: (kanjiId: string) => Promise<void>;
  onOpenCustomModal: (item: { type: 'vocab'; data: DisplayVocabularyItem } | { type: 'kanji'; data: DisplayKanjiItem }) => void;
  onPracticeVocab: (words: VocabularyItem[], title: string) => void;
  onPracticeKanji: (kanjis: KanjiItem[], title: string) => void;
}

export const DifficultView: React.FC<DifficultViewProps> = ({
  vocabularies,
  kanjis,
  onToggleVocabDifficult,
  onToggleKanjiDifficult,
  onOpenCustomModal,
  onPracticeVocab,
  onPracticeKanji
}) => {
  const [tab, setTab] = useState<'all' | 'vocab' | 'kanji'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const difficultVocabs = useMemo(() => {
    return vocabularies.filter(v => v.isDifficult);
  }, [vocabularies]);

  const difficultKanjis = useMemo(() => {
    return kanjis.filter(k => k.isDifficult);
  }, [kanjis]);

  const filteredVocab = useMemo(() => {
    if (!searchTerm.trim()) return difficultVocabs;
    const term = searchTerm.toLowerCase().trim();
    return difficultVocabs.filter(v => 
      v.japanese.toLowerCase().includes(term) ||
      v.effectiveReading.toLowerCase().includes(term) ||
      v.effectiveMeaning.toLowerCase().includes(term)
    );
  }, [difficultVocabs, searchTerm]);

  const filteredKanji = useMemo(() => {
    if (!searchTerm.trim()) return difficultKanjis;
    const term = searchTerm.toLowerCase().trim();
    return difficultKanjis.filter(k => 
      k.kanji.toLowerCase().includes(term) ||
      k.effectiveMeaning.toLowerCase().includes(term) ||
      k.onyomi?.toLowerCase().includes(term) ||
      k.kunyomi?.toLowerCase().includes(term)
    );
  }, [difficultKanjis, searchTerm]);

  const totalDifficultCount = difficultVocabs.length + difficultKanjis.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop-in space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-[#eeece6] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                Targeted Drill List
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif-jp text-[#1a1918]">
              Difficult Words (苦手な言葉)
            </h1>
            <p className="text-xs text-[#8c8880] mt-1">
              {totalDifficultCount} challenging {totalDifficultCount === 1 ? 'item' : 'items'} flagged for extra review and practice
            </p>
          </div>

          {/* Quick Practice Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {difficultVocabs.length > 0 && (
              <button
                onClick={() => onPracticeVocab(difficultVocabs, 'Difficult Words Targeted Drill')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Drill Difficult Vocab ({difficultVocabs.length})</span>
              </button>
            )}

            {difficultKanjis.length > 0 && (
              <button
                onClick={() => onPracticeKanji(difficultKanjis, 'Difficult Kanji Targeted Drill')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Drill Difficult Kanji ({difficultKanjis.length})</span>
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
            All ({totalDifficultCount})
          </button>
          <button
            onClick={() => setTab('vocab')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'vocab' ? 'bg-[#1a1918] text-white' : 'text-[#6e6b66] hover:text-[#1a1918]'
            }`}
          >
            Vocabulary ({difficultVocabs.length})
          </button>
          <button
            onClick={() => setTab('kanji')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'kanji' ? 'bg-[#1a1918] text-white' : 'text-[#6e6b66] hover:text-[#1a1918]'
            }`}
          >
            Kanji ({difficultKanjis.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-[#8c8880] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search difficult items..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#eeece6] rounded-xl text-[#1a1918] placeholder-[#8c8880] focus:outline-none focus:ring-2 focus:ring-[#d93829]/20"
          />
        </div>
      </div>

      {/* Content Grid */}
      {totalDifficultCount === 0 ? (
        <div className="bg-white rounded-3xl border border-[#eeece6] p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-2xl text-emerald-600">
            ✓
          </div>
          <h3 className="text-base font-bold text-[#1a1918]">No difficult words right now!</h3>
          <p className="text-xs text-[#8c8880] mt-1 max-w-sm mx-auto">
            You can mark challenging vocabulary words or Kanji with the ⚠️ button on any card to isolate them for focused practice.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Vocab Section */}
          {(tab === 'all' || tab === 'vocab') && filteredVocab.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#6e6b66] mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#d93829]" />
                <span>Difficult Vocabulary ({filteredVocab.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVocab.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                          {v.jlpt || 'N5'} • Difficult ⚠
                        </span>
                        <button
                          onClick={() => onToggleVocabDifficult(v.id)}
                          className="text-rose-500 hover:text-neutral-400 text-xs font-bold transition-colors cursor-pointer"
                          title="Unmark as difficult"
                        >
                          Clear ✕
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
                        <div className="mt-2 p-2 rounded-lg bg-rose-50/50 border border-rose-100 text-[11px] text-rose-900 italic">
                          📝 {v.personalNote}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#f2f0ea] flex items-center justify-between text-xs text-[#8c8880]">
                      <span>{v.practiceCount > 0 ? `${v.correctCount}/${v.practiceCount} correct` : 'Needs practice'}</span>
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
                <span>Difficult Kanji ({filteredKanji.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredKanji.map((k) => (
                  <div
                    key={k.id}
                    className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                          {k.jlpt || 'N5'} Kanji • ⚠
                        </span>
                        <button
                          onClick={() => onToggleKanjiDifficult(k.id)}
                          className="text-rose-500 hover:text-neutral-400 text-xs font-bold transition-colors cursor-pointer"
                          title="Unmark as difficult"
                        >
                          Clear ✕
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
                        <div className="mt-2 p-2 rounded-lg bg-rose-50/50 border border-rose-100 text-[11px] text-rose-900 italic">
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
