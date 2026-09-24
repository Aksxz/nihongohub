import { JLPTLevel } from './kanji';
import { VocabularyItem } from './vocab';
import { KanjiItem } from './kanji';

export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  selectedLevel: JLPTLevel; // 'N5' | 'N4' | 'N3'
  role?: 'user' | 'admin';
  createdAt: number;
  lastLoginAt: number;
}

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  selectedLevel: JLPTLevel;
  role?: 'user' | 'admin';
  token: string;
  expiresAt: number;
}

export interface UserVocabData {
  id: string; // `${userId}_${vocabId}`
  userId: string;
  vocabId: string;
  customMeaning?: string;
  customReading?: string;
  personalNote?: string;
  isFavorite?: boolean;
  isLearned?: boolean;
  isDifficult?: boolean;
  isHidden?: boolean;
  status?: 'normal' | 'weak' | 'hard' | 'mastered';
  practiceCount?: number;
  correctCount?: number;
  wrongCount?: number;
  consecutiveCorrect?: number;
  lastPracticed?: number;
  lastIncorrect?: number;
  lastCorrect?: number;
  updatedAt: number;
}

export interface UserKanjiData {
  id: string; // `${userId}_${kanjiId}`
  userId: string;
  kanjiId: string;
  customMeaning?: string;
  personalNote?: string;
  isFavorite?: boolean;
  isMastered?: boolean;
  isDifficult?: boolean;
  updatedAt: number;
}

// Display view models that merge global master items with user-specific overrides
export interface DisplayVocabularyItem extends VocabularyItem {
  effectiveMeaning: string;
  effectiveReading: string;
  personalNote?: string;
  isFavorite: boolean;
  isLearned: boolean;
  isDifficult: boolean;
  isHidden?: boolean;
  hasPersonalCustomization: boolean;
}

export interface DisplayKanjiItem extends KanjiItem {
  effectiveMeaning: string;
  personalNote?: string;
  isFavorite: boolean;
  isMastered: boolean;
  isDifficult: boolean;
  hasPersonalCustomization: boolean;
}
