export interface CheckResult {
  isCorrect: boolean;
  isCloseMatch: boolean;
  matchedMeaning?: string;
  normalizedUserAnswer: string;
  allAcceptedMeanings: string[];
}

/**
 * Normalizes a meaning string for comparison:
 * - lowercase
 * - trim whitespace & collapse multi-spaces
 * - strip leading/trailing punctuation
 * - strip leading articles (a, an, the)
 * - strip leading "to " for verbs (e.g. "to eat" -> "eat")
 */
export function normalizeMeaning(str: string): string {
  if (!str) return '';

  let norm = str.toLowerCase().trim();

  // Strip punctuation from ends
  norm = norm.replace(/^[.,!?;:'"]+|[.,!?;:'"]+$/g, '');

  // Strip parentheses and their contents or test both with & without
  norm = norm.replace(/\s*\([^)]*\)\s*/g, ' ').trim();

  // Collapse consecutive spaces
  norm = norm.replace(/\s+/g, ' ');

  // Strip leading articles
  norm = norm.replace(/^(a|an|the)\s+/, '');

  // Strip leading infinitive "to "
  norm = norm.replace(/^to\s+/, '');

  return norm.trim();
}

/**
 * Extract all accepted meanings from an English definition string and acceptedMeanings array.
 * E.g. "To eat, eat / consume" -> ["to eat", "eat", "consume"]
 */
export function extractAcceptedMeanings(english: string, acceptedMeanings: string[] = []): string[] {
  const set = new Set<string>();

  // Add items from acceptedMeanings array
  acceptedMeanings.forEach((m) => {
    if (m && m.trim()) {
      set.add(m.trim());
      const norm = normalizeMeaning(m);
      if (norm) set.add(norm);
    }
  });

  // Split english string by comma, slash, semicolon, or " / "
  if (english) {
    const parts = english.split(/[,;/]|\bor\b/i);
    parts.forEach((p) => {
      const clean = p.trim();
      if (clean) {
        set.add(clean);
        const norm = normalizeMeaning(clean);
        if (norm) set.add(norm);
      }
    });
  }

  return Array.from(set);
}

/**
 * Simple Levenshtein distance for fuzzy typo matching.
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Validates a user's answer against the stored vocabulary definitions.
 */
export function checkAnswer(userAnswer: string, english: string, acceptedMeanings: string[] = []): CheckResult {
  const allMeanings = extractAcceptedMeanings(english, acceptedMeanings);
  const normalizedUser = normalizeMeaning(userAnswer);

  if (!normalizedUser) {
    return {
      isCorrect: false,
      isCloseMatch: false,
      normalizedUserAnswer: '',
      allAcceptedMeanings: allMeanings
    };
  }

  // 1. Direct exact or normalized match
  for (const meaning of allMeanings) {
    const normMeaning = normalizeMeaning(meaning);
    if (normalizedUser === normMeaning || userAnswer.toLowerCase().trim() === meaning.toLowerCase().trim()) {
      return {
        isCorrect: true,
        isCloseMatch: false,
        matchedMeaning: meaning,
        normalizedUserAnswer: normalizedUser,
        allAcceptedMeanings: allMeanings
      };
    }
  }

  // 2. Check for slight typo (Levenshtein distance <= 1 for words length >= 4)
  let isClose = false;
  let closeMatchTarget = '';
  for (const meaning of allMeanings) {
    const normMeaning = normalizeMeaning(meaning);
    if (normMeaning.length >= 4 && Math.abs(normalizedUser.length - normMeaning.length) <= 1) {
      const dist = levenshtein(normalizedUser, normMeaning);
      if (dist === 1) {
        isClose = true;
        closeMatchTarget = meaning;
        break;
      }
    }
  }

  return {
    isCorrect: false,
    isCloseMatch: isClose,
    matchedMeaning: closeMatchTarget || undefined,
    normalizedUserAnswer: normalizedUser,
    allAcceptedMeanings: allMeanings
  };
}
