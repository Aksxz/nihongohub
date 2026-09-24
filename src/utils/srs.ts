import { VocabularyItem, LearningStatus, WordDifficulty } from '../types/vocab';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Review intervals based on consecutive correct count
const INTERVALS_MS = [
  4 * HOUR,     // 0: 4 hours (missed / reset)
  1 * DAY,      // 1: 1 day
  3 * DAY,      // 2: 3 days
  7 * DAY,      // 3: 7 days (Familiar)
  14 * DAY,     // 4: 14 days
  30 * DAY,     // 5+: 30 days (Mastered)
];

/**
 * Calculates updated SRS metadata after answering a question.
 */
export function calculateSRSUpdate(item: VocabularyItem, isCorrect: boolean): {
  practiceCount: number;
  correctCount: number;
  wrongCount: number;
  consecutiveCorrect: number;
  difficulty: WordDifficulty;
  learningStatus: LearningStatus;
  lastPracticed: number;
  nextReview: number;
} {
  const now = Date.now();
  const practiceCount = (item.practiceCount || 0) + 1;
  const correctCount = isCorrect ? (item.correctCount || 0) + 1 : (item.correctCount || 0);
  const wrongCount = !isCorrect ? (item.wrongCount || 0) + 1 : (item.wrongCount || 0);
  const consecutiveCorrect = isCorrect ? (item.consecutiveCorrect || 0) + 1 : 0;

  // Determine Learning Status
  let learningStatus: LearningStatus;
  if (!isCorrect) {
    learningStatus = 'Difficult'; // Immediately marked as Weak Word
  } else if (consecutiveCorrect >= 5 && correctCount / practiceCount >= 0.8) {
    learningStatus = 'Mastered';
  } else if (consecutiveCorrect >= 3) {
    learningStatus = 'Familiar';
  } else {
    learningStatus = 'Learning';
  }

  // Determine Difficulty
  let difficulty: WordDifficulty;
  const total = correctCount + wrongCount;
  const accuracy = total > 0 ? correctCount / total : 0;
  if (wrongCount >= 2 || accuracy < 0.5) {
    difficulty = 'hard';
  } else if (consecutiveCorrect >= 3 && accuracy >= 0.8) {
    difficulty = 'easy';
  } else {
    difficulty = 'medium';
  }

  // Determine Next Review Timestamp
  const intervalIndex = Math.min(consecutiveCorrect, INTERVALS_MS.length - 1);
  const intervalMs = isCorrect ? INTERVALS_MS[intervalIndex] : INTERVALS_MS[0];
  const nextReview = now + intervalMs;

  return {
    practiceCount,
    correctCount,
    wrongCount,
    consecutiveCorrect,
    difficulty,
    learningStatus,
    lastPracticed: now,
    nextReview,
  };
}

/**
 * Checks if a word is categorized as a Weak Word.
 */
export function isWeakWord(item: VocabularyItem): boolean {
  if (item.status === 'weak') return true;
  if (item.status === 'hard') return false; // Hard is its own tier
  if (item.status === 'normal' || item.status === 'mastered') return false;
  if (!item.practiceCount) return false;
  return (
    item.learningStatus === 'Difficult' ||
    (item.wrongCount > 0 && item.wrongCount >= item.correctCount)
  );
}

/**
 * Checks if a word is categorized as a Hard Word.
 */
export function isHardWord(item: VocabularyItem): boolean {
  if (item.status === 'hard') return true;
  if (item.status === 'normal' || item.status === 'weak' || item.status === 'mastered') return false;
  return item.difficulty === 'hard' && (item.wrongCount || 0) >= 2;
}

/**
 * Checks if a word is due for SRS review.
 */
export function isDueForReview(item: VocabularyItem): boolean {
  if (!item.nextReview) return false;
  return item.nextReview <= Date.now();
}

/**
 * Generates an optimized Smart Practice queue prioritizing:
 * 1. Overdue SRS words
 * 2. Weak / Difficult words
 * 3. Learning words
 * 4. New / unpracticed words
 */
export function getSmartPracticeQueue(items: VocabularyItem[], limit: number = 15): VocabularyItem[] {
  const now = Date.now();

  const overdue: VocabularyItem[] = [];
  const weak: VocabularyItem[] = [];
  const learning: VocabularyItem[] = [];
  const newWords: VocabularyItem[] = [];
  const others: VocabularyItem[] = [];

  items.forEach((item) => {
    if (item.nextReview && item.nextReview <= now) {
      overdue.push(item);
    } else if (isWeakWord(item)) {
      weak.push(item);
    } else if (item.learningStatus === 'Learning') {
      learning.push(item);
    } else if (item.learningStatus === 'New' || item.practiceCount === 0) {
      newWords.push(item);
    } else {
      others.push(item);
    }
  });

  // Shuffle individual buckets for randomness
  const shuffle = <T>(arr: T[]) => arr.sort(() => Math.random() - 0.5);

  const combined = [
    ...shuffle(overdue),
    ...shuffle(weak),
    ...shuffle(learning),
    ...shuffle(newWords),
    ...shuffle(others),
  ];

  return combined.slice(0, limit);
}
