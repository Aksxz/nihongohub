import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    purpose: {
      type: String,
      enum: ['signup', 'login'],
      required: true
    },
    otpHash: {
      type: String,
      required: true
    },
    signupData: {
      name: { type: String },
      passwordHash: { type: String },
      selectedLevel: { type: String, default: 'N5' }
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    lastResentAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // MongoDB TTL index automatically deletes expired documents
    }
  },
  {
    timestamps: true
  }
);

// Compound index on email and purpose for fast lookup
otpSchema.index({ email: 1, purpose: 1 });

export const OTP = mongoose.model('OTP', otpSchema);
