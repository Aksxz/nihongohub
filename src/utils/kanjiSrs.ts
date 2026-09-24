import { KanjiItem, KanjiLearningStatus, KanjiDifficulty } from '../types/kanji';

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

const SRS_INTERVALS_DAYS = [
  0.2, // Level 0 (wrong): 5 hours
  1,   // Level 1: 1 day
  3,   // Level 2: 3 days
  7,   // Level 3: 1 week
  14,  // Level 4: 2 weeks
  30,  // Level 5: 1 month
  90   // Level 6 (Mastered): 3 months
];

export function isWeakKanji(item: KanjiItem): boolean {
  if (item.practiceCount === 0) return false;
  if (item.wrongCount >= 2 && item.correctCount <= item.wrongCount) return true;
  const accuracy = (item.correctCount / item.practiceCount) * 100;
  return item.practiceCount >= 2 && accuracy < 60;
}

export function isKanjiDueForReview(item: KanjiItem): boolean {
  if (!item.nextReview) return true; // never practiced or unassigned
  return Date.now() >= item.nextReview;
}

export function calculateKanjiSRSUpdate(
  item: KanjiItem,
  isCorrect: boolean
): Partial<KanjiItem> {
  const practiceCount = (item.practiceCount || 0) + 1;
  const correctCount = (item.correctCount || 0) + (isCorrect ? 1 : 0);
  const wrongCount = (item.wrongCount || 0) + (isCorrect ? 0 : 1);
  const now = Date.now();

  let consecutiveCorrect = item.consecutiveCorrect || 0;
  if (isCorrect) {
    consecutiveCorrect += 1;
  } else {
    consecutiveCorrect = Math.max(0, consecutiveCorrect - 2);
  }

  // Calculate difficulty
  const accuracy = (correctCount / practiceCount) * 100;
  let difficulty: KanjiDifficulty = 'medium';
  if (practiceCount >= 3) {
    if (accuracy >= 85) difficulty = 'easy';
    else if (accuracy < 60) difficulty = 'hard';
  }

  // Calculate learning status
  let learningStatus: KanjiLearningStatus = 'Learning';
  if (consecutiveCorrect >= 5 && accuracy >= 80) {
    learningStatus = 'Mastered';
  } else if (consecutiveCorrect >= 3) {
    learningStatus = 'Familiar';
  } else if (isWeakKanji({ ...item, practiceCount, correctCount, wrongCount })) {
    learningStatus = 'Difficult';
  } else if (practiceCount === 1 && isCorrect) {
    learningStatus = 'Learning';
  } else {
    learningStatus = 'Learning';
  }

  // Next Review interval
  const intervalIndex = Math.min(consecutiveCorrect, SRS_INTERVALS_DAYS.length - 1);
  const daysToAdd = isCorrect ? SRS_INTERVALS_DAYS[intervalIndex] : 0.2;
  const nextReview = now + Math.round(daysToAdd * ONE_DAY);

  return {
    practiceCount,
    correctCount,
    wrongCount,
    consecutiveCorrect,
    difficulty,
    learningStatus,
    lastPracticed: now,
    nextReview
  };
}

export function getSmartKanjiPracticeQueue(items: KanjiItem[], limit: number = 20): KanjiItem[] {
  const now = Date.now();

  const dueItems: KanjiItem[] = [];
  const weakItems: KanjiItem[] = [];
  const newItems: KanjiItem[] = [];
  const otherItems: KanjiItem[] = [];

  for (const item of items) {
    if ((item.practiceCount || 0) === 0) {
      newItems.push(item);
    } else if (item.nextReview && item.nextReview <= now) {
      dueItems.push(item);
    } else if (isWeakKanji(item)) {
      weakItems.push(item);
    } else {
      otherItems.push(item);
    }
  }

  // Sort due by overdue first
  dueItems.sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
  // Sort weak by lowest accuracy
  weakItems.sort((a, b) => {
    const accA = a.correctCount / (a.practiceCount || 1);
    const accB = b.correctCount / (b.practiceCount || 1);
    return accA - accB;
  });

  const combined = [...dueItems, ...weakItems, ...newItems, ...otherItems];
  return combined.slice(0, limit);
}
