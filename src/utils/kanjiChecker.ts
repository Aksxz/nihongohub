import { KanjiItem } from '../types/kanji';
import { checkAnswer } from './answerChecker';

// Normalize kana and romaji (remove dots, punctuation, spaces)
function normalizeReading(str: string): string {
  return str
    .toLowerCase()
    .replace(/[・\s,\-—~〜/]/g, '')
    .trim();
}

// Convert Katakana to Hiragana for uniform comparison
function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

export interface KanjiCheckResult {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  displayDetails: {
    kanji: string;
    meaning: string;
    onyomi?: string;
    kunyomi?: string;
    romaji?: string;
  };
}

export function checkKanjiAnswer(
  userAnswer: string,
  kanji: KanjiItem,
  testType: 'meaning' | 'reading'
): KanjiCheckResult {
  const trimmed = userAnswer.trim();

  if (testType === 'meaning') {
    const meaningCheck = checkAnswer(trimmed, kanji.meaning, kanji.acceptedMeanings);
    return {
      isCorrect: meaningCheck.isCorrect,
      userAnswer: trimmed,
      correctAnswer: kanji.meaning,
      displayDetails: {
        kanji: kanji.kanji,
        meaning: kanji.meaning,
        onyomi: kanji.onyomi,
        kunyomi: kanji.kunyomi,
        romaji: kanji.romaji
      }
    };
  }

  // Reading Test
  // Build accepted reading variants
  const acceptedReadings = new Set<string>();

  const addReading = (raw?: string) => {
    if (!raw) return;
    const parts = raw.split(/[,/、]/).map(s => s.trim());
    for (const p of parts) {
      const clean = normalizeReading(p);
      if (clean) {
        acceptedReadings.add(clean);
        acceptedReadings.add(katakanaToHiragana(clean));
      }
    }
  };

  addReading(kanji.onyomi);
  addReading(kanji.kunyomi);
  addReading(kanji.romaji);

  // Check user reading
  const userNorm = normalizeReading(trimmed);
  const userHira = katakanaToHiragana(userNorm);

  const isCorrect = acceptedReadings.has(userNorm) || acceptedReadings.has(userHira);

  const primaryReading = [kanji.onyomi, kanji.kunyomi].filter(Boolean).join(' / ') || kanji.romaji || '';

  return {
    isCorrect,
    userAnswer: trimmed,
    correctAnswer: primaryReading,
    displayDetails: {
      kanji: kanji.kanji,
      meaning: kanji.meaning,
      onyomi: kanji.onyomi,
      kunyomi: kanji.kunyomi,
      romaji: kanji.romaji
    }
  };
}
