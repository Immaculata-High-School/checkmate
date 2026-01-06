import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

// Get notifications for the current user
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const unreadOnly = url.searchParams.get('unread') === 'true';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

  const notifications = await prisma.notification.findMany({
    where: {
      userId: locals.user.id,
      ...(unreadOnly ? { read: false } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      read: true,
      link: true,
      createdAt: true,
      job: {
        select: {
          id: true,
          type: true,
          status: true
        }
      }
    }
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId: locals.user.id,
      read: false
    }
  });

  return json({ notifications, unreadCount });
};

// Mark notifications as read
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { notificationIds, markAllRead } = body;

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: {
        userId: locals.user.id,
        read: false
      },
      data: { read: true }
    });
  } else if (notificationIds && Array.isArray(notificationIds)) {
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: locals.user.id
      },
      data: { read: true }
    });
  }

  return json({ success: true });
};
