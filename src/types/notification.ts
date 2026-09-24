export type NotificationType = 'reading' | 'listening';

export interface NotificationItem {
  id: string;
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  contentId: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
}
