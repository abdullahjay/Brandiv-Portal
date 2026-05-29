import { prisma } from "@backend/lib/prisma";

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  message: true,
  read: true,
  createdAt: true,
};

export async function findUserNotifications(userId: string, limit = 30) {
  return prisma.notification.findMany({
    where: { userId },
    select: NOTIFICATION_SELECT,
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function countUnread(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function createNotification(userId: string, type: string, message: string) {
  return prisma.notification.create({
    data: { userId, type, message },
    select: NOTIFICATION_SELECT,
  });
}

export async function markOneRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function deleteOne(id: string, userId: string) {
  return prisma.notification.deleteMany({ where: { id, userId } });
}
