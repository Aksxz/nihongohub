import mongoose from 'mongoose';

const kanjiSchema = new mongoose.Schema(
  {
    character: {
      type: String,
      required: [true, 'Kanji character is required'],
      unique: true,
      trim: true
    },
    meaning: {
      type: String,
      required: [true, 'English meaning is required'],
      trim: true
    },
    meanings: {
      type: [String],
      default: []
    },
    onyomi: {
      type: String,
      trim: true,
      default: ''
    },
    kunyomi: {
      type: String,
      trim: true,
      default: ''
    },
    readings: {
      type: [String],
      default: []
    },
    exampleWords: {
      type: [String],
      default: []
    },
    strokeCount: {
      type: Number,
      default: 0
    },
    jlptLevel: {
      type: String,
      enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
      required: true,
      default: 'N5'
    },
    chapter: {
      type: Number,
      default: 1
    },
    source: {
      type: String,
      enum: ['Textbook', 'Extra'],
      default: 'Textbook'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
kanjiSchema.index({ jlptLevel: 1 });
kanjiSchema.index({ chapter: 1 });

export const Kanji = mongoose.model('Kanji', kanjiSchema);
