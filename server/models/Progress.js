import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    level: {
      type: String,
      enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
      default: 'N5'
    },
    chapterProgress: {
      type: [
        {
          chapter: Number,
          percentage: Number,
          learned: Number,
          total: Number
        }
      ],
      default: []
    },
    vocabularyLearned: {
      type: Number,
      default: 0
    },
    vocabularyRemaining: {
      type: Number,
      default: 0
    },
    kanjiLearned: {
      type: Number,
      default: 0
    },
    kanjiRemaining: {
      type: Number,
      default: 0
    },
    overallPercentage: {
      type: Number,
      default: 0
    },
    quizStatistics: {
      totalQuizzes: { type: Number, default: 0 },
      correctAnswers: { type: Number, default: 0 },
      wrongAnswers: { type: Number, default: 0 },
      averageAccuracy: { type: Number, default: 0 }
    },
    studyTime: {
      type: Number, // in minutes
      default: 0
    },
    wordsPracticed: {
      type: Number,
      default: 0
    },
    totalPracticeAttempts: {
      type: Number,
      default: 0
    },
    weakWordsCount: {
      type: Number,
      default: 0
    },
    hardWordsCount: {
      type: Number,
      default: 0
    },
    streak: {
      type: Number,
      default: 0
    },
    lastStudyDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const Progress = mongoose.model('Progress', progressSchema);
