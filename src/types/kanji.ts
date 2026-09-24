export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'Other';

export type KanjiSource = 'Textbook' | 'Extra';

export type KanjiLearningStatus = 'New' | 'Learning' | 'Difficult' | 'Familiar' | 'Mastered';

export type KanjiDifficulty = 'easy' | 'medium' | 'hard';

export interface KanjiExampleWord {
  word: string;
  reading?: string;
  meaning: string;
}

export interface KanjiItem {
  id: string;
  kanji: string;
  meaning: string; // primary meaning(s)
  acceptedMeanings: string[];
  onyomi?: string; // e.g. "ガク" or "がく"
  kunyomi?: string; // e.g. "まな・ぶ" or "まなぶ"
  romaji?: string; // e.g. "gaku, manabu"
  exampleWords?: KanjiExampleWord[];
  exampleSentence?: string;
  jlpt?: JLPTLevel;
  source: KanjiSource;
  chapter?: number; // 1 to 24 (if source === 'Textbook')
  category?: string; // for Extra Kanji grouping
  notes?: string;
  createdAt: number;

  // Practice & SRS statistics
  practiceCount: number;
  correctCount: number;
  wrongCount: number;
  consecutiveCorrect: number;
  difficulty: KanjiDifficulty;
  learningStatus: KanjiLearningStatus;
  lastPracticed?: number;
  nextReview?: number; // timestamp for SRS due date
}

export type KanjiPracticeModeType = 
  | 'all' 
  | 'chapter' 
  | 'multi-chapter' 
  | 'extra'
  | 'jlpt'
  | 'weak' 
  | 'new' 
  | 'smart'
  | 'custom';

export type KanjiTestType = 'meaning' | 'reading' | 'mixed';

export interface KanjiPracticeWordResult {
  kanjiId: string;
  kanji: string;
  meaning: string;
  onyomi?: string;
  kunyomi?: string;
  romaji?: string;
  testType: 'meaning' | 'reading';
  prompt: string;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
}

export interface KanjiPracticeSession {
  id: string;
  timestamp: number;
  mode: KanjiPracticeModeType;
  testType: KanjiTestType;
  selectedChapters?: number[];
  jlptFilter?: JLPTLevel;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  streak: number;
  results: KanjiPracticeWordResult[];
}

export interface KanjiOverallStats {
  totalKanji: number;
  kanjiPracticed: number;
  totalPracticedAttempts: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;
  currentStreak: number;
  bestStreak: number;
  weakKanjiCount: number;
  masteredCount: number;
  dueSRSCount: number;
}
