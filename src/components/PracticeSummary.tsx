import React, { useEffect } from 'react';
import { PracticeSession, VocabularyItem, AppView } from '../types/vocab';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Flame, 
  RotateCcw, 
  Home, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Volume2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface PracticeSummaryProps {
  session: PracticeSession;
  onPracticeAgain: () => void;
  onPracticeWrongWords?: (wrongWords: VocabularyItem[]) => void;
  onNavigate: (view: AppView) => void;
  allVocabularies: VocabularyItem[];
}

export const PracticeSummary: React.FC<PracticeSummaryProps> = ({
  session,
  onPracticeAgain,
  onPracticeWrongWords,
  onNavigate,
  allVocabularies
}) => {
  useEffect(() => {
    // Fire celebratory confetti if accuracy >= 60%
    if (session.accuracy >= 60) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Fallback gracefully
      }
    }
    if (session.streak >= 3) {
      soundEffects.playStreakChime();
    }
  }, [session]);

  const wrongResults = session.results.filter(r => !r.isCorrect);
  const correctResults = session.results.filter(r => r.isCorrect);

  // Map wrong results back to VocabularyItem for one-click revision
  const wrongVocabItems = allVocabularies.filter(v => 
    wrongResults.some(wr => wr.vocabId === v.id)
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-pop-in space-y-8">
      
      {/* Celebration Header Card */}
      <div className="bg-white rounded-3xl border border-[#eeece6] p-6 sm:p-8 text-center shadow-md relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 select-none pointer-events-none opacity-5 text-9xl font-serif-jp text-[#d93829]">
          完
        </div>

        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef2f2] text-[#d93829] text-xs font-semibold uppercase tracking-wider mb-2">
          <span>練習完了 • Practice Complete</span>
        </div>

        <h1 className="text-3xl font-extrabold text-[#1a1918] font-japanese">
          お疲れ様でした！
        </h1>
        <p className="text-sm text-[#6e6b66] mt-1">
          Great work on completing this study session. Here is your performance summary:
        </p>

        {/* Score & Accuracy Highlight Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 max-w-lg mx-auto">
          <div className="bg-[#faf9f6] p-4 rounded-2xl border border-[#eeece6]">
            <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider">Score</span>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#1a1918] mt-1">
              {session.correctCount} <span className="text-sm font-normal text-[#8c8880]">/ {session.totalQuestions}</span>
            </div>
          </div>

          <div className="bg-[#faf9f6] p-4 rounded-2xl border border-[#eeece6]">
            <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider">Accuracy</span>
            <div className={`text-2xl sm:text-3xl font-bold font-mono mt-1 ${
              session.accuracy >= 80 ? 'text-emerald-600' : session.accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {session.accuracy}%
            </div>
          </div>

          <div className="bg-[#faf9f6] p-4 rounded-2xl border border-[#eeece6]">
            <span className="text-xs font-semibold text-[#8c8880] uppercase tracking-wider flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> Streak
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-orange-600 mt-1">
              {session.streak}
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {wrongVocabItems.length > 0 && onPracticeWrongWords && (
            <button
              onClick={() => onPracticeWrongWords(wrongVocabItems)}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Revise Missed Words ({wrongVocabItems.length})</span>
            </button>
          )}

          <button
            onClick={onPracticeAgain}
            className="flex items-center gap-2 bg-[#d93829] hover:bg-[#b92a1d] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Practice Again</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 bg-[#faf9f6] hover:bg-[#eeece6] text-[#1a1918] border border-[#d4d0c8] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </button>
        </div>
      </div>

      {/* Words Needing Revision Section */}
      {wrongResults.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#eeece6] pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              <h3 className="text-base font-bold text-[#1a1918]">Words to Revise ({wrongResults.length})</h3>
            </div>
            <span className="text-xs text-[#8c8880]">Review your answers and correct meanings</span>
          </div>

          <div className="space-y-3">
            {wrongResults.map((res, i) => (
              <div 
                key={i} 
                className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <button
                    onClick={() => soundEffects.speakJapanese(res.japanese)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors mt-0.5 sm:mt-0"
                    title="Pronounce"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-japanese font-bold text-lg text-[#1a1918]">{res.japanese}</span>
                      <span className="text-xs text-[#8c8880] font-mono">
                        {res.reading}{res.romaji && res.romaji.trim() ? ` (${res.romaji.trim()})` : ''}
                      </span>
                    </div>
                    <div className="text-xs text-[#6e6b66] mt-0.5">
                      <span className="font-semibold text-neutral-500">Correct:</span> <span className="font-medium text-emerald-700">{res.english}</span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-rose-200/50">
                  <span className="text-[11px] text-[#8c8880] block">You answered:</span>
                  <span className="text-xs font-mono text-rose-600 line-through">
                    {res.userAnswer || '(blank)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correct Words Section */}
      {correctResults.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#eeece6] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#eeece6] pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-[#1a1918]">Correct Words ({correctResults.length})</h3>
            </div>
            <span className="text-xs text-emerald-600 font-semibold">Keep up the great recall!</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {correctResults.map((res, i) => (
              <div 
                key={i} 
                className="p-3 rounded-xl bg-[#faf9f6] border border-[#eeece6] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => soundEffects.speakJapanese(res.japanese)}
                    className="text-neutral-400 hover:text-[#1a1918]"
                    title="Pronounce"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="font-japanese font-bold text-sm text-[#1a1918]">{res.japanese}</div>
                    <div className="text-xs text-[#6e6b66] truncate max-w-[160px]">{res.english}</div>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-4">
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-xs font-semibold text-[#8c8880] hover:text-[#1a1918] flex items-center gap-1 cursor-pointer"
        >
          ← Return to Dashboard
        </button>

        <button
          onClick={() => onNavigate('vocab-list')}
          className="text-xs font-semibold text-[#d93829] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>View Vocabulary List</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

    </div>
  );
};
