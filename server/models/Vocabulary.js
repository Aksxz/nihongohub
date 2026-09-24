import mongoose from 'mongoose';

const vocabularySchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: [true, 'Japanese word is required'],
      trim: true
    },
    kanji: {
      type: String,
      trim: true,
      default: ''
    },
    hiragana: {
      type: String,
      trim: true,
      default: ''
    },
    katakana: {
      type: String,
      trim: true,
      default: ''
    },
    romaji: {
      type: String,
      trim: true,
      default: ''
    },
    meaning: {
      type: String,
      required: [true, 'English meaning is required'],
      trim: true
    },
    partOfSpeech: {
      type: String,
      enum: ['Noun', 'Verb', 'Adjective', 'Adverb', 'Particle', 'Expression', 'Counter', 'Other'],
      default: 'Noun'
    },
    jlptLevel: {
      type: String,
      enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
      required: true,
      default: 'N5'
    },
    chapter: {
      type: Number,
      default: null
    },
    destinationType: {
      type: String,
      enum: ['chapter', 'custom', 'extra'],
      default: 'chapter'
    },
    customChapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomChapter',
      default: null
    },
    wordType: {
      type: String,
      enum: ['textbook', 'custom', 'extra'],
      default: 'textbook'
    },
    source: {
      type: String,
      enum: ['Textbook', 'Extra', 'PDF Import', 'CSV Import', 'Image OCR', 'Minna no Nihongo', 'Genki', 'Custom'],
      default: 'Textbook'
    },
    exampleSentence: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes for high-performance querying per JLPT level and chapter
vocabularySchema.index({ jlptLevel: 1, chapter: 1 });
vocabularySchema.index({ customChapterId: 1 });
vocabularySchema.index({ destinationType: 1 });
vocabularySchema.index({ word: 1 });
vocabularySchema.index({ kanji: 1 });
vocabularySchema.index({ hiragana: 1 });

export const Vocabulary = mongoose.model('Vocabulary', vocabularySchema);
