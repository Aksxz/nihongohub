import mongoose from 'mongoose';

const userVocabularySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    vocabularyId: {
      type: String, // String ID to flexibly reference MongoDB ObjectId or standard seed ID
      required: true
    },
    customMeaning: {
      type: String,
      trim: true,
      default: ''
    },
    customReading: {
      type: String,
      trim: true,
      default: ''
    },
    personalNote: {
      type: String,
      trim: true,
      default: ''
    },
    favorite: {
      type: Boolean,
      default: false
    },
    learned: {
      type: Boolean,
      default: false
    },
    difficult: {
      type: Boolean,
      default: false
    },
    hidden: {
      type: Boolean,
      default: false
    },
    // Progress & Classification Tracking
    status: {
      type: String,
      enum: ['normal', 'weak', 'hard', 'mastered'],
      default: 'normal'
    },
    practiceCount: {
      type: Number,
      default: 0
    },
    correctCount: {
      type: Number,
      default: 0
    },
    wrongCount: {
      type: Number,
      default: 0
    },
    consecutiveCorrect: {
      type: Number,
      default: 0
    },
    lastPracticed: {
      type: Date,
      default: null
    },
    lastIncorrect: {
      type: Date,
      default: null
    },
    lastCorrect: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring one overlay record per user per vocabulary item
userVocabularySchema.index({ userId: 1, vocabularyId: 1 }, { unique: true });

export const UserVocabulary = mongoose.model('UserVocabulary', userVocabularySchema);
