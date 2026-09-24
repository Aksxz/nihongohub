import mongoose from 'mongoose';

const testAttemptSchema = new mongoose.Schema(
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
    testTitle: {
      type: String,
      required: true,
      trim: true
    },
    userName: {
      type: String,
      required: true,
      trim: true
    },
    userEmail: {
      type: String,
      required: true,
      trim: true
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    submittedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['started', 'submitted'],
      default: 'started',
      index: true
    },
    score: {
      type: Number,
      default: 0
    },
    totalMarks: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    answers: [
      {
        questionIndex: { type: Number },
        questionId: { type: String },
        questionText: { type: String },
        questionType: { type: String },
        options: [
          {
            label: { type: String },
            text: { type: String }
          }
        ],
        userAnswer: { type: String, default: '' },
        correctAnswer: { type: String, default: '' },
        acceptedAnswers: [{ type: String }],
        isCorrect: { type: Boolean, default: false },
        explanation: { type: String, default: '' }
      }
    ]
  },
  {
    timestamps: true
  }
);

testAttemptSchema.index({ userId: 1, testId: 1, createdAt: -1 });
testAttemptSchema.index({ createdAt: -1 });
testAttemptSchema.index({ userName: 1 });
testAttemptSchema.index({ userEmail: 1 });
testAttemptSchema.index({ testTitle: 1 });

export const TestAttempt = mongoose.models.TestAttempt || mongoose.model('TestAttempt', testAttemptSchema);
