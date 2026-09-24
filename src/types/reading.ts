import { JLPTLevel } from "./kanji";

export type ReadingOptionLabel = "A" | "B" | "C" | "D";

export interface ReadingOption {
  label: ReadingOptionLabel;
  text: string;
}

export interface ReadingQuestion {
  _id?: string;
  id?: string;
  questionIndex?: number;
  question: string;
  options: ReadingOption[];
  correctAnswer?: ReadingOptionLabel;
  explanation?: string;
}

export interface UserReadingStats {
  latestScore: number;
  latestTotal: number;
  latestPercentage: number;
  bestScore: number;
  bestPercentage: number;
  attemptCount: number;
  lastAttemptedAt?: string | number;
}

export interface ReadingItem {
  id: string;
  _id?: string;
  title: string;
  paragraphNumber: number;
  passage: string;
  questions: ReadingQuestion[];
  jlptLevel?: JLPTLevel;
  order?: number;
  isActive?: boolean;
  userProgress?: UserReadingStats | null;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface QuestionEvaluationResult {
  questionIndex: number;
  questionId: string;
  questionText: string;
  options: ReadingOption[];
  userAnswer: string;
  correctAnswer: ReadingOptionLabel;
  isCorrect: boolean;
  explanation?: string;
}

export interface ReadingSubmissionResponse {
  success: boolean;
  readingId: string;
  readingTitle: string;
  paragraphNumber: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  progressId?: string | null;
  results: QuestionEvaluationResult[];
}
