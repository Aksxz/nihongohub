import mongoose from 'mongoose';

const patternExampleSchema = new mongoose.Schema(
  {
    japanese: {
      type: String,
      required: [true, 'Japanese example sentence is required'],
      trim: true
    },
    reading: {
      type: String,
      trim: true,
      default: ''
    },
    english: {
      type: String,
      required: [true, 'English translation is required'],
      trim: true
    }
  },
  { _id: false }
);

const patternSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Pattern title is required'],
      trim: true
    },
    pattern: {
      type: String,
      required: [true, 'Grammar pattern formula is required'],
      trim: true
    },
    meaning: {
      type: String,
      required: [true, 'Pattern meaning is required'],
      trim: true
    },
    usage: {
      type: String,
      trim: true,
      default: ''
    },
    examples: {
      type: [patternExampleSchema],
      default: []
    },
    jlptLevel: {
      type: String,
      enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
      required: true,
      default: 'N5'
    },
    destinationType: {
      type: String,
      enum: ['chapter', 'custom'],
      default: 'chapter'
    },
    chapter: {
      type: Number,
      default: null
    },
    customChapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomChapter',
      default: null
    },
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

patternSchema.index({ jlptLevel: 1, chapter: 1 });
patternSchema.index({ customChapterId: 1 });

export const Pattern = mongoose.models.Pattern || mongoose.model('Pattern', patternSchema);
