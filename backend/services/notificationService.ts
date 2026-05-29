import {
  findUserNotifications,
  countUnread,
  createNotification,
  markOneRead,
  markAllRead,
  deleteOne,
} from "@backend/repositories/notificationRepository";

export async function getNotifications(userId: string) {
  const [items, unreadCount] = await Promise.all([
    findUserNotifications(userId),
    countUnread(userId),
  ]);
  return { items, unreadCount };
}

export async function sendNotification(userId: string, type: string, message: string) {
  return createNotification(userId, type, message);
}

export async function markNotificationRead(id: string, userId: string) {
  await markOneRead(id, userId);
}

export async function markAllNotificationsRead(userId: string) {
  await markAllRead(userId);
}

export async function dismissNotification(id: string, userId: string) {
  await deleteOne(id, userId);
}
