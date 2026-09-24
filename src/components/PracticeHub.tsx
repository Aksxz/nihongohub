import React, { useState } from 'react';
import { 
  VocabularyItem, 
  PracticeSession, 
  PracticeModeType 
} from '../types/vocab';
import { 
  KanjiItem, 
  KanjiPracticeSession, 
  KanjiPracticeModeType 
} from '../types/kanji';
import { PracticeMode } from './PracticeMode';
import { KanjiPracticeMode } from './KanjiPracticeMode';
import { BookOpen, Sparkles, Brain, CheckCircle2 } from 'lucide-react';
import { ChapterItem } from '../types/chapter';
import { BackButton } from './BackButton';

interface PracticeHubProps {
  initialType?: 'vocab' | 'kanji';
  vocabularies: VocabularyItem[];
  kanjis: KanjiItem[];
  chapters?: ChapterItem[];
  customChapters?: any[];
  kanjiChapters?: ChapterItem[];
  onSaveVocabSession: (session: Omit<PracticeSession, 'id' | 'timestamp'>, results: { vocabId: string; isCorrect: boolean }[]) => Promise<void>;
  onSaveKanjiSession: (session: Omit<KanjiPracticeSession, 'id' | 'timestamp'>, results: { kanjiId: string; isCorrect: boolean }[]) => Promise<void>;
  onBackToDashboard: () => void;
  initialVocabMode?: PracticeModeType;
  initialVocabWords?: VocabularyItem[];
  initialVocabTitle?: string;
  initialVocabSelectedChapters?: number[];
  initialVocabScope?: any;
  initialKanjiMode?: KanjiPracticeModeType;
  initialKanjiItems?: KanjiItem[];
  initialKanjiTitle?: string;
}

export const PracticeHub: React.FC<PracticeHubProps> = ({
  initialType = 'vocab',
  vocabularies,
  kanjis,
  chapters = [],
  customChapters = [],
  kanjiChapters = [],
  onSaveVocabSession,
  onSaveKanjiSession,
  onBackToDashboard,
  initialVocabMode,
  initialVocabWords,
  initialVocabTitle,
  initialVocabSelectedChapters,
  initialVocabScope,
  initialKanjiMode,
  initialKanjiItems,
  initialKanjiTitle
}) => {
  const [activePracticeType, setActivePracticeType] = useState<'vocab' | 'kanji'>(initialType);

  return (
    <div className="space-y-6">
      
      {/* Top Bar Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <BackButton onClick={onBackToDashboard} label="Back to Dashboard" />

        {/* Dual Practice Mode Selector */}
        <div className="inline-flex bg-[#f2f0ea] p-1 rounded-2xl border border-[#eeece6]">
          <button
            type="button"
            onClick={() => setActivePracticeType('vocab')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activePracticeType === 'vocab'
                ? 'bg-white text-[#1a1918] shadow-xs'
                : 'text-[#6e6b66] hover:text-[#1a1918]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#d93829]" />
            <span>Vocabulary Practice</span>
            <span className="text-[10px] bg-red-50 text-[#d93829] px-1.5 py-0.2 rounded-full font-mono">
              {vocabularies.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePracticeType('kanji')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activePracticeType === 'kanji'
                ? 'bg-white text-[#1a1918] shadow-xs'
                : 'text-[#6e6b66] hover:text-[#1a1918]'
            }`}
          >
            <span className="font-japanese font-bold text-sm text-[#ea580c]">漢</span>
            <span>Kanji Practice</span>
            <span className="text-[10px] bg-orange-50 text-[#ea580c] px-1.5 py-0.2 rounded-full font-mono">
              {kanjis.length}
            </span>
          </button>
        </div>
      </div>

      {/* Render Appropriate Practice View */}
      {activePracticeType === 'vocab' ? (
        <PracticeMode
          key={`vocab-practice-${initialVocabMode}-${initialVocabWords?.length || 0}`}
          vocabularies={vocabularies}
          chapters={chapters}
          customChapters={customChapters}
          onSaveSession={onSaveVocabSession}
          onNavigate={() => onBackToDashboard()}
          initialMode={initialVocabMode}
          initialWords={initialVocabWords}
          initialTitle={initialVocabTitle}
          initialSelectedChapters={initialVocabSelectedChapters}
          initialScope={initialVocabScope}
        />
      ) : (
        <KanjiPracticeMode
          key={`kanji-practice-${initialKanjiMode}-${initialKanjiItems?.length || 0}`}
          kanjis={kanjis}
          kanjiChapters={kanjiChapters}
          onSaveSession={onSaveKanjiSession}
          onBack={onBackToDashboard}
          initialMode={initialKanjiMode}
          initialKanjis={initialKanjiItems}
          initialTitle={initialKanjiTitle}
        />
      )}

    </div>
  );
};
