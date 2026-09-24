import express from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';
import { NotificationRead } from '../models/NotificationRead.js';
import { User } from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Fetch notifications for current user with read states.
 *          Only notifications created ON or AFTER user.createdAt are returned.
 * @access  Protected
 */
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const userCreatedAt = user.createdAt || new Date(0);

    // Only fetch notifications created on or after user registration
    const notifications = await Notification.find({
      createdAt: { $gte: userCreatedAt }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    if (notifications.length === 0) {
      return res.json({
        success: true,
        notifications: [],
        unreadCount: 0
      });
    }

    const notifIds = notifications.map(n => n._id);
    const readDocs = await NotificationRead.find({
      userId: user._id,
      notificationId: { $in: notifIds }
    }).lean();

    const readSet = new Set(readDocs.map(r => r.notificationId.toString()));

    const result = notifications.map(n => ({
      id: n._id.toString(),
      _id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      contentId: n.contentId ? n.contentId.toString() : null,
      createdAt: n.createdAt,
      read: readSet.has(n._id.toString())
    }));

    const unreadCount = result.filter(n => !n.read).length;

    return res.json({
      success: true,
      notifications: result,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Server error loading notifications' });
  }
});

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a single notification as read for current user
 * @access  Protected
 */
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const userId = req.user.id || req.user._id;

    await NotificationRead.updateOne(
      { userId, notificationId: id },
      { $set: { readAt: new Date() } },
      { upsert: true }
    );

    return res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ success: false, message: 'Server error marking notification as read' });
  }
});

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all visible notifications as read for current user
 * @access  Protected
 */
router.patch('/read-all', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const userCreatedAt = user.createdAt || new Date(0);

    const notifications = await Notification.find({
      createdAt: { $gte: userCreatedAt }
    }).select('_id').lean();

    if (notifications.length > 0) {
      const ops = notifications.map(n => ({
        updateOne: {
          filter: { userId: user._id, notificationId: n._id },
          update: { $set: { readAt: new Date() } },
          upsert: true
        }
      }));

      await NotificationRead.bulkWrite(ops);
    }

    return res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ success: false, message: 'Server error marking all notifications as read' });
  }
});

export default router;
