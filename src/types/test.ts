export type TestQuestionType = 'mcq' | 'true_false' | 'fill_blank';

export interface TestOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface TestQuestion {
  _id?: string;
  id?: string;
  type: TestQuestionType;
  question: string;
  options?: TestOption[];
  correctAnswer?: string;
  acceptedAnswers?: string[];
  explanation?: string;
}

export interface TestItem {
  _id: string;
  id: string;
  title: string;
  description?: string;
  questionCount?: number;
  questions?: TestQuestion[];
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestEvalResult {
  questionIndex: number;
  questionId: string;
  questionText: string;
  questionType: TestQuestionType;
  options?: TestOption[];
  userAnswer: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
  isCorrect: boolean;
  explanation?: string;
}

export interface TestSubmissionResponse {
  success: boolean;
  message: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  savedProgressId?: string | null;
  attemptId?: string | null;
  results: TestEvalResult[];
}

export interface TestProgressItem {
  _id: string;
  userId: string;
  testId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: {
    questionIndex: number;
    questionText: string;
    questionType: TestQuestionType;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation?: string;
  }[];
  attemptedAt: string;
}

export interface TestAttemptAnswer {
  questionIndex?: number;
  questionId?: string;
  questionText?: string;
  questionType?: TestQuestionType;
  options?: TestOption[];
  userAnswer: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
  isCorrect: boolean;
  explanation?: string;
}

export interface TestAttemptItem {
  id: string;
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  testId: string;
  testTitle: string;
  startedAt: string;
  submittedAt?: string | null;
  status: 'started' | 'submitted';
  score: number;
  totalMarks: number;
  percentage: number;
  durationSeconds?: number | null;
  questionCount?: number;
  answers?: TestAttemptAnswer[];
  createdAt: string;
  updatedAt: string;
}

export interface TestAttemptsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  data: TestAttemptItem[];
  attempts?: TestAttemptItem[];
}
