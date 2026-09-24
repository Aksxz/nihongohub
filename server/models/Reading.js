import mongoose from 'mongoose';

const readingOptionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D']
    },
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true
    }
  },
  { _id: false }
);

const readingQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    options: {
      type: [readingOptionSchema],
      validate: [
        (val) => Array.isArray(val) && val.length === 4,
        'Each question must have exactly 4 options (A, B, C, D)'
      ]
    },
    correctAnswer: {
      type: String,
      required: [true, 'Correct answer is required'],
      enum: ['A', 'B', 'C', 'D']
    },
    explanation: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: true }
);

const readingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Reading title is required'],
      trim: true
    },
    paragraphNumber: {
      type: Number,
      default: 1
    },
    passage: {
      type: String,
      required: [true, 'Reading passage content is required']
    },
    questions: {
      type: [readingQuestionSchema],
      default: []
    },
    jlptLevel: {
      type: String,
      enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
      default: 'N5'
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

readingSchema.index({ paragraphNumber: 1, order: 1 });
readingSchema.index({ jlptLevel: 1, isActive: 1 });

export const Reading = mongoose.models.Reading || mongoose.model('Reading', readingSchema);
