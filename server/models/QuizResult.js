import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['vocab', 'kanji', 'vocabulary'],
      required: true
    },
    mode: {
      type: String,
      default: 'all'
    },
    level: {
      type: String,
      default: 'N5'
    },
    chapter: {
      type: Number,
      default: 1
    },
    score: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    },
    accuracy: {
      type: Number,
      default: 0
    },
    answers: {
      type: [
        {
          itemId: String,
          question: String,
          userAnswer: String,
          correctAnswer: String,
          isCorrect: Boolean
        }
      ],
      default: []
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index
quizResultSchema.index({ userId: 1, timestamp: -1 });

export const QuizResult = mongoose.model('QuizResult', quizResultSchema);
