import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Vocabulary } from '../models/Vocabulary.js';
import { Kanji } from '../models/Kanji.js';

// Predefined master vocabulary & kanji data
import { INITIAL_VOCABULARY } from '../../src/db/seedData.ts';
import { INITIAL_KANJI } from '../../src/db/seedKanji.ts';
import { INITIAL_N4_VOCABULARY, INITIAL_N3_VOCABULARY, INITIAL_N4_KANJI, INITIAL_N3_KANJI } from '../../src/db/seedN4N3.ts';

dotenv.config();

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing in .env');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas successfully.');

    const vocabCount = await Vocabulary.countDocuments();
    const kanjiCount = await Kanji.countDocuments();

    console.log(`Current Database State: ${vocabCount} Vocabularies, ${kanjiCount} Kanji.`);

    if (vocabCount === 0 || process.argv.includes('--force')) {
      if (process.argv.includes('--force')) {
        console.log('Clearing existing vocabulary...');
        await Vocabulary.deleteMany({});
      }

      console.log('Seeding Master Vocabulary (N5 Chapters 1-24, N4, N3)...');

      // Prepare N5 Vocab
      const n5Docs = INITIAL_VOCABULARY.map(v => ({
        word: v.japanese,
        kanji: v.reading !== v.japanese ? v.japanese : '',
        hiragana: v.reading || v.japanese,
        katakana: '',
        romaji: v.romaji || '',
        meaning: v.english,
        partOfSpeech: v.type || 'Noun',
        jlptLevel: v.jlpt || 'N5',
        chapter: v.chapter || 1,
        source: v.source || (v.chapter ? 'Textbook' : 'Extra'),
        exampleSentence: v.notes || ''
      }));

      // Prepare N4 Vocab
      const n4Docs = INITIAL_N4_VOCABULARY.map(v => ({
        word: v.japanese,
        kanji: v.reading !== v.japanese ? v.japanese : '',
        hiragana: v.reading || v.japanese,
        katakana: '',
        romaji: v.romaji || '',
        meaning: v.english,
        partOfSpeech: v.type || 'Noun',
        jlptLevel: 'N4',
        chapter: v.chapter || 1,
        source: 'Textbook',
        exampleSentence: v.notes || ''
      }));

      // Prepare N3 Vocab
      const n3Docs = INITIAL_N3_VOCABULARY.map(v => ({
        word: v.japanese,
        kanji: v.reading !== v.japanese ? v.japanese : '',
        hiragana: v.reading || v.japanese,
        katakana: '',
        romaji: v.romaji || '',
        meaning: v.english,
        partOfSpeech: v.type || 'Noun',
        jlptLevel: 'N3',
        chapter: v.chapter || 1,
        source: 'Textbook',
        exampleSentence: v.notes || ''
      }));

      const allVocab = [...n5Docs, ...n4Docs, ...n3Docs];
      await Vocabulary.insertMany(allVocab);
      console.log(`✅ Seeded ${allVocab.length} Master Vocabulary items into MongoDB Atlas!`);
    } else {
      console.log('ℹ️  Master Vocabulary collection already contains data. Use --force to re-seed.');
    }

    if (kanjiCount === 0 || process.argv.includes('--force')) {
      if (process.argv.includes('--force')) {
        console.log('Clearing existing kanji...');
        await Kanji.deleteMany({});
      }

      console.log('Seeding Master Kanji (N5, N4, N3)...');

      // Prepare N5 Kanji
      const n5KanjiDocs = INITIAL_KANJI.map(k => ({
        character: k.kanji,
        meaning: k.meaning,
        meanings: [k.meaning],
        onyomi: k.onyomi || '',
        kunyomi: k.kunyomi || '',
        readings: [k.onyomi, k.kunyomi].filter(Boolean),
        exampleWords: (k.exampleWords || []).map(e => `${e.word} (${e.reading}) - ${e.meaning}`),
        strokeCount: 4,
        jlptLevel: k.jlpt || 'N5',
        chapter: k.chapter || 1,
        source: k.source || 'Textbook'
      }));

      // Prepare N4 Kanji
      const n4KanjiDocs = INITIAL_N4_KANJI.map(k => ({
        character: k.kanji,
        meaning: k.meaning,
        meanings: [k.meaning],
        onyomi: k.onyomi || '',
        kunyomi: k.kunyomi || '',
        readings: [k.onyomi, k.kunyomi].filter(Boolean),
        exampleWords: (k.exampleWords || []).map(e => `${e.word} (${e.reading}) - ${e.meaning}`),
        strokeCount: 4,
        jlptLevel: 'N4',
        chapter: k.chapter || 1,
        source: 'Textbook'
      }));

      // Prepare N3 Kanji
      const n3KanjiDocs = INITIAL_N3_KANJI.map(k => ({
        character: k.kanji,
        meaning: k.meaning,
        meanings: [k.meaning],
        onyomi: k.onyomi || '',
        kunyomi: k.kunyomi || '',
        readings: [k.onyomi, k.kunyomi].filter(Boolean),
        exampleWords: (k.exampleWords || []).map(e => `${e.word} (${e.reading}) - ${e.meaning}`),
        strokeCount: 4,
        jlptLevel: 'N3',
        chapter: k.chapter || 1,
        source: 'Textbook'
      }));

      const allKanji = [...n5KanjiDocs, ...n4KanjiDocs, ...n3KanjiDocs];
      await Kanji.insertMany(allKanji);
      console.log(`✅ Seeded ${allKanji.length} Master Kanji items into MongoDB Atlas!`);
    } else {
      console.log('ℹ️  Master Kanji collection already contains data. Use --force to re-seed.');
    }

    console.log('Database seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seed();
