import { JLPTLevel } from './kanji';

export type WordType = 
  | 'Noun' 
  | 'Verb' 
  | 'Adjective' 
  | 'Adverb' 
  | 'Particle' 
  | 'Expression' 
  | 'Counter' 
  | 'Other';

export type VocabSource = 'Textbook' | 'Extra';

export type LearningStatus = 'New' | 'Learning' | 'Difficult' | 'Familiar' | 'Mastered';

export type WordDifficulty = 'easy' | 'medium' | 'hard';

export interface VocabularyItem {
  id: string;
  japanese: string;
  reading: string; // kana
  romaji?: string;
  english: string;
  type: WordType;
  source: VocabSource;
  chapter?: number; // 1 to 24 (if source === 'Textbook')
  destinationType?: 'chapter' | 'custom' | 'extra';
  customChapterId?: string;
  wordType?: 'textbook' | 'custom' | 'extra';
  jlpt?: JLPTLevel;
  category?: string; // especially for Extra vocabulary
  categories: string[];
  acceptedMeanings: string[];
  notes?: string;
  createdAt: number;
  
  // Practice & SRS statistics
  practiceCount: number;
  correctCount: number;
  wrongCount: number;
  consecutiveCorrect: number;
  difficulty: WordDifficulty;
  learningStatus: LearningStatus;
  status?: 'normal' | 'weak' | 'hard' | 'mastered';
  lastPracticed?: number;
  nextReview?: number; // timestamp for SRS due date
}

export type PracticeModeType = 
  | 'all' 
  | 'chapter' 
  | 'multi-chapter' 
  | 'custom' 
  | 'weak' 
  | 'hard' 
  | 'new' 
  | 'smart';

export interface PracticeWordResult {
  vocabId: string;
  japanese: string;
  reading: string;
  romaji?: string;
  english: string;
  userAnswer: string;
  isCorrect: boolean;
  acceptedMeanings: string[];
}

export interface PracticeSession {
  id: string;
  timestamp: number;
  mode: PracticeModeType;
  selectedChapters?: number[];
  categoryFilter?: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  streak: number;
  results: PracticeWordResult[];
}

export interface OverallStats {
  totalWords: number;
  wordsPracticed: number;
  totalPracticedAttempts: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;
  currentStreak: number;
  bestStreak: number;
  categoryCounts: Record<string, number>;
  weakWordCount: number;
  masteredCount: number;
  dueSRSCount: number;
}

export interface AppSettings {
  soundEnabled: boolean;
  speechEnabled: boolean;
  speechRate: number;
  showRomajiHintDefault: boolean;
  targetDailyWords: number;
}

export interface StudyNote {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export type NoteCategory = 
  | 'Adjectives'
  | 'Verbs'
  | 'Particles'
  | 'Grammar'
  | 'Sentence Patterns'
  | 'Kanji'
  | 'Hiragana'
  | 'Katakana'
  | 'JLPT N5'
  | 'JLPT N4'
  | 'Other'
  | string;

export type AppView = 'dashboard' | 'vocab-list' | 'kanji-list' | 'patterns' | 'reading' | 'listening' | 'tests' | 'practice' | 'notes' | 'statistics' | 'favorites' | 'difficult' | 'admin';
