import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['reading', 'listening'],
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
