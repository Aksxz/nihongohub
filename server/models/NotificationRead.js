import mongoose from 'mongoose';

const notificationReadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
      index: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

notificationReadSchema.index({ userId: 1, notificationId: 1 }, { unique: true });

export const NotificationRead = mongoose.models.NotificationRead || mongoose.model('NotificationRead', notificationReadSchema);
