import mongoose from 'mongoose';

const listeningOptionSchema = new mongoose.Schema(
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

const listeningQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    options: {
      type: [listeningOptionSchema],
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

const listeningSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Listening exercise title is required'],
      trim: true
    },
    listeningNumber: {
      type: Number,
      default: 1
    },
    passage: {
      type: String,
      required: [true, 'Japanese listening paragraph is required'],
      trim: true
    },
    questions: {
      type: [listeningQuestionSchema],
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

listeningSchema.index({ listeningNumber: 1, order: 1 });
listeningSchema.index({ jlptLevel: 1, isActive: 1 });

export const Listening = mongoose.models.Listening || mongoose.model('Listening', listeningSchema);
