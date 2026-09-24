import mongoose from 'mongoose';

const readingProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    readingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reading',
      required: true,
      index: true
    },
    score: {
      type: Number,
      required: true
    },
    totalQuestions: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      required: true
    },
    answers: [
      {
        questionIndex: Number,
        questionText: String,
        userAnswer: String,
        correctAnswer: String,
        isCorrect: Boolean
      }
    ],
    attemptedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

readingProgressSchema.index({ userId: 1, readingId: 1, attemptedAt: -1 });

export const ReadingProgress = mongoose.models.ReadingProgress || mongoose.model('ReadingProgress', readingProgressSchema);
