import { KanjiItem } from '../types/kanji';

export const INITIAL_KANJI: Omit<KanjiItem, 'id' | 'createdAt' | 'practiceCount' | 'correctCount' | 'wrongCount' | 'consecutiveCorrect' | 'difficulty' | 'learningStatus'>[] = [
  // Chapter 1: Nature & Days
  {
    kanji: '日',
    meaning: 'Sun, Day',
    acceptedMeanings: ['sun', 'day', 'japan'],
    onyomi: 'ニチ, ジツ',
    kunyomi: 'ひ, か',
    romaji: 'nichi, jitsu, hi, ka',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 1,
    exampleWords: [
      { word: '日本', reading: 'にほん', meaning: 'Japan' },
      { word: '日曜日', reading: 'にちようび', meaning: 'Sunday' },
      { word: '毎日', reading: 'まいにち', meaning: 'Every day' }
    ],
    exampleSentence: 'きょうは いい 天気の日です。',
    notes: 'Fundamental radical and character representing the sun and days.'
  },
  {
    kanji: '月',
    meaning: 'Moon, Month',
    acceptedMeanings: ['moon', 'month'],
    onyomi: 'ゲツ, ガツ',
    kunyomi: 'つき',
    romaji: 'getsu, gatsu, tsuki',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 1,
    exampleWords: [
      { word: '月曜日', reading: 'げつようび', meaning: 'Monday' },
      { word: '一月', reading: 'いちがつ', meaning: 'January' },
      { word: '今月', reading: 'こんげつ', meaning: 'This month' }
    ],
    exampleSentence: '今夜は月がとてもきれいです。'
  },
  {
    kanji: '火',
    meaning: 'Fire',
    acceptedMeanings: ['fire'],
    onyomi: 'カ',
    kunyomi: 'ひ, ほ',
    romaji: 'ka, hi',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 1,
    exampleWords: [
      { word: '火曜日', reading: 'かようび', meaning: 'Tuesday' },
      { word: '火', reading: 'ひ', meaning: 'Fire, flame' },
      { word: '火山', reading: 'かざん', meaning: 'Volcano' }
    ]
  },
  {
    kanji: '水',
    meaning: 'Water',
    acceptedMeanings: ['water'],
    onyomi: 'スイ',
    kunyomi: 'みず',
    romaji: 'sui, mizu',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 1,
    exampleWords: [
      { word: '水', reading: 'みず', meaning: 'Water' },
      { word: '水曜日', reading: 'すいようび', meaning: 'Wednesday' },
      { word: '水泳', reading: 'すいえい', meaning: 'Swimming' }
    ],
    exampleSentence: 'つめたい水を飲みます。'
  },
  {
    kanji: '木',
    meaning: 'Tree, Wood',
    acceptedMeanings: ['tree', 'wood'],
    onyomi: 'モク, ボク',
    kunyomi: 'き, こ',
    romaji: 'moku, boku, ki',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 1,
    exampleWords: [
      { word: '木', reading: 'き', meaning: 'Tree' },
      { word: '木曜日', reading: 'もくようび', meaning: 'Thursday' }
    ]
  },
  {
    kanji: '金',
    meaning: 'Gold, Money',
    acceptedMeanings: ['gold', 'money', 'metal'],
    onyomi: 'キン, コン',
    kunyomi: 'かね, かな',
    romaji: 'kin, kane',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 1,
    exampleWords: [
      { word: 'お金', reading: 'おかね', meaning: 'Money' },
      { word: '金曜日', reading: 'きんようび', meaning: 'Friday' }
    ],
    exampleSentence: 'お金を大切にします。'
  },
  {
    kanji: '土',
    meaning: 'Soil, Earth, Ground',
    acceptedMeanings: ['soil', 'earth', 'ground'],
    onyomi: 'ド, ト',
    kunyomi: 'つち',
    romaji: 'do, to, tsuchi',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 1,
    exampleWords: [
      { word: '土曜日', reading: 'どようび', meaning: 'Saturday' },
      { word: '土', reading: 'つち', meaning: 'Soil, earth' },
      { word: '土地', reading: 'とち', meaning: 'Land, estate' }
    ]
  },

  // Chapter 2: Geography & People
  {
    kanji: '山',
    meaning: 'Mountain',
    acceptedMeanings: ['mountain', 'hill'],
    onyomi: 'サン, ザン',
    kunyomi: 'やま',
    romaji: 'san, yama',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 2,
    exampleWords: [
      { word: '山', reading: 'やま', meaning: 'Mountain' },
      { word: '富士山', reading: 'ふじさん', meaning: 'Mt. Fuji' }
    ]
  },
  {
    kanji: '川',
    meaning: 'River',
    acceptedMeanings: ['river', 'stream'],
    onyomi: 'セン',
    kunyomi: 'かわ',
    romaji: 'sen, kawa',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 2,
    exampleWords: [
      { word: '川', reading: 'かわ', meaning: 'River' }
    ]
  },
  {
    kanji: '田',
    meaning: 'Rice field, Paddy',
    acceptedMeanings: ['rice field', 'paddy', 'field'],
    onyomi: 'デン',
    kunyomi: 'た',
    romaji: 'den, ta',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 2,
    exampleWords: [
      { word: '田んぼ', reading: 'たんぼ', meaning: 'Rice field' },
      { word: '田中', reading: 'たなか', meaning: 'Tanaka (surname)' }
    ]
  },
  {
    kanji: '人',
    meaning: 'Person, Human',
    acceptedMeanings: ['person', 'human', 'people'],
    onyomi: 'ジン, ニン',
    kunyomi: 'ひと',
    romaji: 'jin, nin, hito',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 2,
    exampleWords: [
      { word: '日本人', reading: 'にほんじん', meaning: 'Japanese person' },
      { word: '一人', reading: 'ひとり', meaning: 'One person' },
      { word: '二人', reading: 'ふたり', meaning: 'Two people' }
    ]
  },
  {
    kanji: '口',
    meaning: 'Mouth, Opening',
    acceptedMeanings: ['mouth', 'opening', 'entrance'],
    onyomi: 'コウ, ク',
    kunyomi: 'くち',
    romaji: 'kou, ku, kuchi',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 2,
    exampleWords: [
      { word: '口', reading: 'くち', meaning: 'Mouth' },
      { word: '入口', reading: 'いりぐち', meaning: 'Entrance' },
      { word: '出口', reading: 'でぐち', meaning: 'Exit' }
    ]
  },
  {
    kanji: '車',
    meaning: 'Car, Vehicle, Wheel',
    acceptedMeanings: ['car', 'vehicle', 'wheel'],
    onyomi: 'シャ',
    kunyomi: 'くるま',
    romaji: 'sha, kuruma',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 2,
    exampleWords: [
      { word: '車', reading: 'くるま', meaning: 'Car' },
      { word: '電車', reading: 'でんしゃ', meaning: 'Train' },
      { word: '自転車', reading: 'じてんしゃ', meaning: 'Bicycle' }
    ]
  },

  // Chapter 3: Numbers
  {
    kanji: '一',
    meaning: 'One',
    acceptedMeanings: ['one', '1'],
    onyomi: 'イチ, イツ',
    kunyomi: 'ひと, ひとつ',
    romaji: 'ichi, hito, hitotsu',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 3,
    exampleWords: [
      { word: '一つ', reading: 'ひとつ', meaning: 'One item' },
      { word: '一人', reading: 'ひとり', meaning: 'One person' },
      { word: '一日', reading: 'ついたち', meaning: '1st of the month' }
    ]
  },
  {
    kanji: '二',
    meaning: 'Two',
    acceptedMeanings: ['two', '2'],
    onyomi: 'ニ',
    kunyomi: 'ふた, ふたつ',
    romaji: 'ni, futa, futatsu',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 3,
    exampleWords: [
      { word: '二つ', reading: 'ふたつ', meaning: 'Two items' },
      { word: '二月', reading: 'にがつ', meaning: 'February' }
    ]
  },
  {
    kanji: '三',
    meaning: 'Three',
    acceptedMeanings: ['three', '3'],
    onyomi: 'サン',
    kunyomi: 'み, みっつ',
    romaji: 'san, mittsu',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 3,
    exampleWords: [
      { word: '三つ', reading: 'みっつ', meaning: 'Three items' },
      { word: '三月', reading: 'さんがつ', meaning: 'March' }
    ]
  },
  {
    kanji: '四',
    meaning: 'Four',
    acceptedMeanings: ['four', '4'],
    onyomi: 'シ',
    kunyomi: 'よ, よん, よっつ',
    romaji: 'shi, yon, yottsu',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 3,
    exampleWords: [
      { word: '四つ', reading: 'よっつ', meaning: 'Four items' },
      { word: '四月', reading: 'しがつ', meaning: 'April' }
    ]
  },
  {
    kanji: '五',
    meaning: 'Five',
    acceptedMeanings: ['five', '5'],
    onyomi: 'ゴ',
    kunyomi: 'いつ, いつつ',
    romaji: 'go, itsutsu',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 3,
    exampleWords: [
      { word: '五つ', reading: 'いつつ', meaning: 'Five items' },
      { word: '五月', reading: 'ごがつ', meaning: 'May' }
    ]
  },

  // Chapter 4: Time & Money
  {
    kanji: '百',
    meaning: 'Hundred',
    acceptedMeanings: ['hundred', '100'],
    onyomi: 'ヒャク, ビャク',
    kunyomi: 'もも',
    romaji: 'hyaku, byaku',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 4,
    exampleWords: [
      { word: '百', reading: 'ひゃく', meaning: 'One hundred' },
      { word: '三百', reading: 'さんびゃく', meaning: 'Three hundred' }
    ]
  },
  {
    kanji: '千',
    meaning: 'Thousand',
    acceptedMeanings: ['thousand', '1000'],
    onyomi: 'セン',
    kunyomi: 'ち',
    romaji: 'sen, zen, chi',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 4,
    exampleWords: [
      { word: '千', reading: 'せん', meaning: 'One thousand' },
      { word: '三千', reading: 'さんぜん', meaning: 'Three thousand' }
    ]
  },
  {
    kanji: '万',
    meaning: 'Ten Thousand',
    acceptedMeanings: ['ten thousand', '10000'],
    onyomi: 'マン, バン',
    romaji: 'man, ban',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 4,
    exampleWords: [
      { word: '一万', reading: 'いちまん', meaning: 'Ten thousand' }
    ]
  },
  {
    kanji: '円',
    meaning: 'Yen, Circle, Round',
    acceptedMeanings: ['yen', 'circle', 'round'],
    onyomi: 'エン',
    kunyomi: 'まるい',
    romaji: 'en, marui',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 4,
    exampleWords: [
      { word: '百円', reading: 'ひゃくえん', meaning: '100 yen' },
      { word: '円い', reading: 'まるい', meaning: 'Round' }
    ]
  },
  {
    kanji: '年',
    meaning: 'Year',
    acceptedMeanings: ['year'],
    onyomi: 'ネン',
    kunyomi: 'とし',
    romaji: 'nen, toshi',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 4,
    exampleWords: [
      { word: '今年', reading: 'ことし', meaning: 'This year' },
      { word: '来年', reading: 'らいねん', meaning: 'Next year' },
      { word: '去年', reading: 'きょねん', meaning: 'Last year' }
    ]
  },

  // Chapter 5: School & Study
  {
    kanji: '学',
    meaning: 'Study, Learning, School',
    acceptedMeanings: ['study', 'learning', 'school', 'learn'],
    onyomi: 'ガク',
    kunyomi: 'まな・ぶ',
    romaji: 'gaku, manabu',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 5,
    exampleWords: [
      { word: '学生', reading: 'がくせい', meaning: 'Student' },
      { word: '大学', reading: 'だいがく', meaning: 'University' },
      { word: '学校', reading: 'がっこう', meaning: 'School' }
    ],
    exampleSentence: '日本語を学びます。'
  },
  {
    kanji: '校',
    meaning: 'School, Exam',
    acceptedMeanings: ['school'],
    onyomi: 'コウ',
    romaji: 'kou',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 5,
    exampleWords: [
      { word: '学校', reading: 'がっこう', meaning: 'School' },
      { word: '高校', reading: 'こうこう', meaning: 'High school' },
      { word: '校長', reading: 'こうちょう', meaning: 'Principal' }
    ]
  },
  {
    kanji: '先',
    meaning: 'Before, Ahead, Previous',
    acceptedMeanings: ['before', 'ahead', 'previous', 'future'],
    onyomi: 'セン',
    kunyomi: 'さき',
    romaji: 'sen, saki',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 5,
    exampleWords: [
      { word: '先生', reading: 'せんせい', meaning: 'Teacher' },
      { word: '先週', reading: 'せんしゅう', meaning: 'Last week' },
      { word: 'お先に', reading: 'おさきに', meaning: 'Excuse me for leaving first' }
    ]
  },
  {
    kanji: '生',
    meaning: 'Life, Birth, Genuine',
    acceptedMeanings: ['life', 'birth', 'live', 'be born'],
    onyomi: 'セイ, ショウ',
    kunyomi: 'い・きる, う・まれる, なま',
    romaji: 'sei, shou, ikiru, umareru, nama',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 5,
    exampleWords: [
      { word: '先生', reading: 'せんせい', meaning: 'Teacher' },
      { word: '学生', reading: 'がくせい', meaning: 'Student' },
      { word: '誕生日', reading: 'たんじょうび', meaning: 'Birthday' }
    ]
  },
  {
    kanji: '大',
    meaning: 'Big, Large, Great',
    acceptedMeanings: ['big', 'large', 'great'],
    onyomi: 'ダイ, タイ',
    kunyomi: 'おお・きい',
    romaji: 'dai, tai, ookii',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 5,
    exampleWords: [
      { word: '大きい', reading: 'おおきい', meaning: 'Big' },
      { word: '大学', reading: 'だいがく', meaning: 'University' },
      { word: '大人', reading: 'おとな', meaning: 'Adult' }
    ]
  },
  {
    kanji: '小',
    meaning: 'Small, Little',
    acceptedMeanings: ['small', 'little'],
    onyomi: 'ショウ',
    kunyomi: 'ちい・さい, こ, お',
    romaji: 'shou, chiisai, ko',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 5,
    exampleWords: [
      { word: '小さい', reading: 'ちいさい', meaning: 'Small' },
      { word: '小学生', reading: 'しょうがくせい', meaning: 'Elementary pupil' }
    ]
  },
  {
    kanji: '中',
    meaning: 'Middle, Inside, Center',
    acceptedMeanings: ['middle', 'inside', 'center', 'in'],
    onyomi: 'チュウ',
    kunyomi: 'なか',
    romaji: 'chuu, naka',
    jlpt: 'N5',
    source: 'Textbook',
    chapter: 5,
    exampleWords: [
      { word: '中', reading: 'なか', meaning: 'Inside' },
      { word: '一日中', reading: 'いちにちじゅう', meaning: 'All day' },
      { word: '中学校', reading: 'ちゅうがっこう', meaning: 'Junior high school' }
    ]
  },

  // Extra Kanji
  {
    kanji: '本',
    meaning: 'Book, Origin, Root',
    acceptedMeanings: ['book', 'origin', 'root', 'main'],
    onyomi: 'ホン',
    kunyomi: 'もと',
    romaji: 'hon, moto',
    jlpt: 'N5',
    source: 'Extra',
    category: 'Daily Life',
    exampleWords: [
      { word: '本', reading: 'ほん', meaning: 'Book' },
      { word: '日本', reading: 'にほん', meaning: 'Japan' },
      { word: '本当', reading: 'ほんとう', meaning: 'Truth, really' }
    ]
  },
  {
    kanji: '今',
    meaning: 'Now',
    acceptedMeanings: ['now'],
    onyomi: 'コン, キン',
    kunyomi: 'いま',
    romaji: 'kon, ima',
    jlpt: 'N5',
    source: 'Extra',
    category: 'Time',
    exampleWords: [
      { word: '今', reading: 'いま', meaning: 'Now' },
      { word: '今日', reading: 'きょう', meaning: 'Today' },
      { word: '今週', reading: 'こんしゅう', meaning: 'This week' }
    ]
  },
  {
    kanji: '時',
    meaning: 'Time, Hour',
    acceptedMeanings: ['time', 'hour', 'o\'clock'],
    onyomi: 'ジ',
    kunyomi: 'とき',
    romaji: 'ji, toki',
    jlpt: 'N5',
    source: 'Extra',
    category: 'Time',
    exampleWords: [
      { word: '時間', reading: 'じかん', meaning: 'Time' },
      { word: '時計', reading: 'とけい', meaning: 'Watch, clock' },
      { word: '一時', reading: 'いちじ', meaning: '1 o\'clock' }
    ]
  },
  {
    kanji: '友',
    meaning: 'Friend',
    acceptedMeanings: ['friend'],
    onyomi: 'ユウ',
    kunyomi: 'とも',
    romaji: 'yuu, tomo',
    jlpt: 'N5',
    source: 'Extra',
    category: 'People',
    exampleWords: [
      { word: '友達', reading: 'ともだち', meaning: 'Friend' },
      { word: '友人', reading: 'ゆうじん', meaning: 'Friend (formal)' }
    ]
  }
];
