import mongoose from 'mongoose';

const userKanjiSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    kanjiId: {
      type: String, // String ID to flexibly reference MongoDB ObjectId or standard seed ID
      required: true
    },
    customMeaning: {
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
    mastered: {
      type: Boolean,
      default: false
    },
    difficult: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring one overlay record per user per kanji item
userKanjiSchema.index({ userId: 1, kanjiId: 1 }, { unique: true });

export const UserKanji = mongoose.model('UserKanji', userKanjiSchema);
