import { ChapterItem } from '../types/chapter';
import { VocabularyItem } from '../types/vocab';
import { KanjiItem } from '../types/kanji';

export const INITIAL_N4_VOCAB_CHAPTERS: ChapterItem[] = [
  {
    id: 'vocab_n4_ch_1',
    chapterNumber: 1,
    title: 'Travel & Commuting',
    japaneseTitle: '旅行と通勤',
    description: 'N4 Vocabulary related to trains, flights, stations, and directions.',
    jlpt: 'N4',
    createdAt: Date.now() - 500000
  },
  {
    id: 'vocab_n4_ch_2',
    chapterNumber: 2,
    title: 'Work & Everyday Office',
    japaneseTitle: '職場と仕事',
    description: 'N4 Expressions for business meetings, schedules, and colleagues.',
    jlpt: 'N4',
    createdAt: Date.now() - 400000
  },
  {
    id: 'vocab_n4_ch_3',
    chapterNumber: 3,
    title: 'Giving, Receiving & Favors',
    japaneseTitle: 'やりもらい・親切',
    description: 'N4 Verbs of giving and receiving (あげる, くれる, もらう).',
    jlpt: 'N4',
    createdAt: Date.now() - 300000
  },
  {
    id: 'vocab_n4_ch_4',
    chapterNumber: 4,
    title: 'Health & Appointments',
    japaneseTitle: '健康と病院',
    description: 'N4 Healthcare vocabulary, symptoms, clinics, and medicine.',
    jlpt: 'N4',
    createdAt: Date.now() - 200000
  }
];

export const INITIAL_N3_VOCAB_CHAPTERS: ChapterItem[] = [
  {
    id: 'vocab_n3_ch_1',
    chapterNumber: 1,
    title: 'Society & Media',
    japaneseTitle: '社会とニュース',
    description: 'Intermediate N3 terms for news, culture, and social affairs.',
    jlpt: 'N3',
    createdAt: Date.now() - 500000
  },
  {
    id: 'vocab_n3_ch_2',
    chapterNumber: 2,
    title: 'Business & Formal Japanese',
    japaneseTitle: 'ビジネスと敬語',
    description: 'N3 Keigo, professional correspondence, and corporate duties.',
    jlpt: 'N3',
    createdAt: Date.now() - 400000
  },
  {
    id: 'vocab_n3_ch_3',
    chapterNumber: 3,
    title: 'Environment & Technology',
    japaneseTitle: '環境と科学技術',
    description: 'N3 Modern technology, environmental challenges, and ecology.',
    jlpt: 'N3',
    createdAt: Date.now() - 300000
  }
];

export const INITIAL_N4_VOCABULARY: Omit<VocabularyItem, 'id' | 'createdAt'>[] = [
  {
    japanese: '案内する',
    reading: 'あんないする',
    romaji: 'annai suru',
    english: 'to guide, to show around',
    type: 'Verb',
    source: 'Textbook',
    chapter: 1,
    jlpt: 'N4',
    acceptedMeanings: ['to guide', 'to show around', 'guide'],
    categories: ['N4', 'Travel', 'Chapter 1'],
    notes: 'Compound suru-verb for guiding visitors.',
    practiceCount: 0,
    correctCount: 0,
    wrongCount: 0,
    consecutiveCorrect: 0,
    difficulty: 'medium',
    learningStatus: 'New'
  },
  {
    japanese: '乗り換える',
    reading: 'のりかえる',
    romaji: 'norikaeru',
    english: 'to transfer (trains/buses)',
    type: 'Verb',
    source: 'Textbook',
    chapter: 1,
    jlpt: 'N4',
    acceptedMeanings: ['to transfer', 'transfer trains', 'change trains'],
    categories: ['N4', 'Travel', 'Chapter 1'],
    notes: 'Essential for Tokyo train navigation.',
    practiceCount: 0,
    correctCount: 0,
    wrongCount: 0,
    consecutiveCorrect: 0,
    difficulty: 'medium',
    learningStatus: 'New'
  },
  {
    japanese: '連絡する',
    reading: 'れんらくする',
    romaji: 'renraku suru',
    english: 'to contact, to get in touch',
    type: 'Verb',
    source: 'Textbook',
    chapter: 2,
    jlpt: 'N4',
    acceptedMeanings: ['to contact', 'to get in touch', 'contact'],
    categories: ['N4', 'Work', 'Chapter 2'],
    notes: 'One of the HORENSO business principles.',
    practiceCount: 0,
    correctCount: 0,
    wrongCount: 0,
    consecutiveCorrect: 0,
    difficulty: 'easy',
    learningStatus: 'New'
  },
  {
    japanese: '遠慮する',
    reading: 'えんりょする',
    romaji: 'enryo suru',
    english: 'to hesitate, to refrain',
    type: 'Verb',
    source: 'Textbook',
    chapter: 3,
    jlpt: 'N4',
    acceptedMeanings: ['to hesitate', 'to refrain', 'hesitate'],
    categories: ['N4', 'Etiquette', 'Chapter 3'],
    notes: '遠慮しないでください = Please do not hesitate.',
    practiceCount: 0,
    correctCount: 0,
    wrongCount: 0,
    consecutiveCorrect: 0,
    difficulty: 'medium',
    learningStatus: 'New'
  }
];

export const INITIAL_N3_VOCABULARY: Omit<VocabularyItem, 'id' | 'createdAt'>[] = [
  {
    japanese: '影響',
    reading: 'えいきょう',
    romaji: 'eikyou',
    english: 'influence, effect, impact',
    type: 'Noun',
    source: 'Textbook',
    chapter: 1,
    jlpt: 'N3',
    acceptedMeanings: ['influence', 'effect', 'impact'],
    categories: ['N3', 'Society', 'Chapter 1'],
    notes: '影響を与える = to have an influence on.',
    practiceCount: 0,
    correctCount: 0,
    wrongCount: 0,
    consecutiveCorrect: 0,
    difficulty: 'medium',
    learningStatus: 'New'
  },
  {
    japanese: '担当する',
    reading: 'たんとうする',
    romaji: 'tantou suru',
    english: 'to be in charge of',
    type: 'Verb',
    source: 'Textbook',
    chapter: 2,
    jlpt: 'N3',
    acceptedMeanings: ['to be in charge of', 'in charge of', 'be responsible for'],
    categories: ['N3', 'Business', 'Chapter 2'],
    notes: '担当者 = person in charge.',
    practiceCount: 0,
    correctCount: 0,
    wrongCount: 0,
    consecutiveCorrect: 0,
    difficulty: 'medium',
    learningStatus: 'New'
  },
  {
    japanese: '改善する',
    reading: 'かいぜんする',
    romaji: 'kaizen suru',
    english: 'to improve, to reform (kaizen)',
    type: 'Verb',
    source: 'Textbook',
    chapter: 3,
    jlpt: 'N3',
    acceptedMeanings: ['to improve', 'improve', 'betterment'],
    categories: ['N3', 'Business', 'Chapter 3'],
    notes: 'Famous concept of continuous improvement.',
    practiceCount: 0,
    correctCount: 0,
    wrongCount: 0,
    consecutiveCorrect: 0,
    difficulty: 'easy',
    learningStatus: 'New'
  }
];

export const INITIAL_N4_KANJI: Omit<KanjiItem, 'id' | 'createdAt' | 'practiceCount' | 'correctCount' | 'wrongCount' | 'consecutiveCorrect' | 'difficulty' | 'learningStatus'>[] = [
  {
    kanji: '会',
    meaning: 'Meet, Association',
    acceptedMeanings: ['meet', 'meeting', 'association', 'society'],
    onyomi: 'カイ, エ',
    kunyomi: 'あ・う',
    romaji: 'kai, au',
    jlpt: 'N4',
    source: 'Textbook',
    chapter: 1,
    exampleWords: [
      { word: '会社', reading: 'かいしゃ', meaning: 'Company' },
      { word: '会話', reading: 'かいわ', meaning: 'Conversation' }
    ],
    exampleSentence: '明日、友達と会います。',
    notes: 'Common N4 kanji for meetings and company.'
  },
  {
    kanji: '社',
    meaning: 'Company, Shinto Shrine',
    acceptedMeanings: ['company', 'shrine', 'society'],
    onyomi: 'シャ',
    kunyomi: 'やしろ',
    romaji: 'sha, yashiro',
    jlpt: 'N4',
    source: 'Textbook',
    chapter: 1,
    exampleWords: [
      { word: '社会', reading: 'しゃかい', meaning: 'Society' },
      { word: '神社', reading: 'じんじゃ', meaning: 'Shinto shrine' }
    ]
  },
  {
    kanji: '電',
    meaning: 'Electricity',
    acceptedMeanings: ['electricity', 'electric'],
    onyomi: 'デン',
    romaji: 'den',
    jlpt: 'N4',
    source: 'Textbook',
    chapter: 2,
    exampleWords: [
      { word: '電車', reading: 'でんしゃ', meaning: 'Electric train' },
      { word: '電話', reading: 'でんわ', meaning: 'Telephone' }
    ]
  }
];

export const INITIAL_N3_KANJI: Omit<KanjiItem, 'id' | 'createdAt' | 'practiceCount' | 'correctCount' | 'wrongCount' | 'consecutiveCorrect' | 'difficulty' | 'learningStatus'>[] = [
  {
    kanji: '政',
    meaning: 'Politics, Government',
    acceptedMeanings: ['politics', 'government'],
    onyomi: 'セイ, ショウ',
    kunyomi: 'まつりごと',
    romaji: 'sei, matsuri',
    jlpt: 'N3',
    source: 'Textbook',
    chapter: 1,
    exampleWords: [
      { word: '政治', reading: 'せいじ', meaning: 'Politics' },
      { word: '政府', reading: 'せいふ', meaning: 'Government' }
    ],
    exampleSentence: '政治に関するニュースを見ます。'
  },
  {
    kanji: '経',
    meaning: 'Pass through, Manage, Economy',
    acceptedMeanings: ['pass through', 'manage', 'economy'],
    onyomi: 'ケイ, キョウ',
    kunyomi: 'へ・る',
    romaji: 'kei, heru',
    jlpt: 'N3',
    source: 'Textbook',
    chapter: 2,
    exampleWords: [
      { word: '経済', reading: 'けいざい', meaning: 'Economy' },
      { word: '経験', reading: 'けいけん', meaning: 'Experience' }
    ]
  }
];
