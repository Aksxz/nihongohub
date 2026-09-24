import mongoose from 'mongoose';

const listeningProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    listeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listening',
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

listeningProgressSchema.index({ userId: 1, listeningId: 1, attemptedAt: -1 });

export const ListeningProgress = mongoose.models.ListeningProgress || mongoose.model('ListeningProgress', listeningProgressSchema);
