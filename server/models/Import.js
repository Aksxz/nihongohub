import mongoose from 'mongoose';

const importedItemSchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
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
    required: true,
    trim: true
  },
  partOfSpeech: {
    type: String,
    default: 'Noun'
  },
  chapter: {
    type: Number,
    required: true,
    default: 1
  },
  jlptLevel: {
    type: String,
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    required: true,
    default: 'N5'
  },
  duplicateStatus: {
    type: String,
    enum: ['NEW', 'POSSIBLE DUPLICATE'],
    default: 'NEW'
  },
  duplicateOf: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
});

const importSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
      required: true,
      default: 'N5'
    },
    chapterRange: {
      start: { type: Number, default: 1 },
      end: { type: Number, default: 24 }
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'approved', 'rejected'],
      default: 'pending'
    },
    extractedCount: {
      type: Number,
      default: 0
    },
    approvedCount: {
      type: Number,
      default: 0
    },
    items: {
      type: [importedItemSchema],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
importSchema.index({ status: 1, createdAt: -1 });

export const Import = mongoose.model('Import', importSchema);
