import mongoose from 'mongoose';

const testProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
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
        questionType: String,
        userAnswer: String,
        correctAnswer: String,
        isCorrect: Boolean,
        explanation: String
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

testProgressSchema.index({ userId: 1, testId: 1, attemptedAt: -1 });

export const TestProgress = mongoose.models.TestProgress || mongoose.model('TestProgress', testProgressSchema);
