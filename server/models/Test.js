import mongoose from 'mongoose';

const testQuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mcq', 'true_false', 'fill_blank'],
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: [
    {
      label: { type: String, enum: ['A', 'B', 'C', 'D'] },
      text: { type: String, trim: true }
    }
  ],
  correctAnswer: {
    type: String,
    required: true,
    trim: true
  },
  acceptedAnswers: [
    {
      type: String,
      trim: true
    }
  ],
  explanation: {
    type: String,
    default: '',
    trim: true
  }
});

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    questions: [testQuestionSchema],
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

testSchema.index({ order: 1, createdAt: -1 });

export const Test = mongoose.models.Test || mongoose.model('Test', testSchema);
