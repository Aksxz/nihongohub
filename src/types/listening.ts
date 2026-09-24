export interface ListeningOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface ListeningQuestion {
  _id?: string;
  question: string;
  options: ListeningOption[];
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

export interface ListeningProgressStats {
  score: number;
  totalQuestions: number;
  percentage: number;
  attemptedAt?: string;
}

export interface ListeningItem {
  _id: string;
  id?: string;
  title: string;
  listeningNumber: number;
  passage?: string; // Hidden from student view; only available for admin or via audio-text endpoint
  questions: ListeningQuestion[];
  jlptLevel: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  userProgress?: ListeningProgressStats | null;
}

export interface ListeningEvalResult {
  questionIndex: number;
  questionId: string;
  questionText: string;
  options: ListeningOption[];
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface ListeningSubmissionResponse {
  success: boolean;
  listeningId: string;
  listeningTitle: string;
  listeningNumber: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  progressId?: string | null;
  results: ListeningEvalResult[];
  data?: any;
}
