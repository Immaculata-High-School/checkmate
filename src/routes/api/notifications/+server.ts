import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { cache } from '$lib/server/cache';
import type { RequestHandler } from './$types';

// Get notifications for the current user
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const unreadOnly = url.searchParams.get('unread') === 'true';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

  // Cache unread count for 10 seconds to reduce DB queries
  const countCacheKey = `notification_unread:${locals.user.id}`;
  let unreadCount = cache.get<number>(countCacheKey);
  
  if (unreadCount === null) {
    unreadCount = await prisma.notification.count({
      where: {
        userId: locals.user.id,
        read: false
      }
    });
    cache.set(countCacheKey, unreadCount, 10000); // 10 second cache
  }

  // Cache full notifications for 5 seconds
  const notificationsCacheKey = `notifications:${locals.user.id}:${unreadOnly}:${limit}`;
  let notifications = cache.get<any[]>(notificationsCacheKey);
  
  if (!notifications) {
    notifications = await prisma.notification.findMany({
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
    cache.set(notificationsCacheKey, notifications, 5000); // 5 second cache
  }

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

  // Invalidate notification cache for this user
  cache.delete(`notification_unread:${locals.user.id}`);
  cache.delete(`notifications:${locals.user.id}:false:20`);
  cache.delete(`notifications:${locals.user.id}:true:20`);
  cache.delete(`notifications:${locals.user.id}:false:10`);
  cache.delete(`notifications:${locals.user.id}:true:10`);

  return json({ success: true });
};
