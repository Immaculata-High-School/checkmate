import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const announcements = await prisma.systemAnnouncement.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  return { announcements, organizations };
};

export const actions: Actions = {
  create: async (event) => {
    const { request, locals } = event;
    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const content = formData.get('content')?.toString().trim();
    const type = formData.get('type')?.toString() || 'info';
    const targetRoles = formData.getAll('targetRoles').map(r => r.toString());
    const targetOrgs = formData.getAll('targetOrgs').map(o => o.toString());
    const startsAt = formData.get('startsAt')?.toString();
    const endsAt = formData.get('endsAt')?.toString();

    if (!title || !content) {
      return fail(400, { error: 'Title and content are required' });
    }

    await prisma.systemAnnouncement.create({
      data: {
        title,
        content,
        type,
        targetRoles,
        targetOrgs,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
        createdById: locals.user!.id
      }
    });

    logAudit({ userId: locals.user?.id, action: 'ADMIN_ANNOUNCEMENT_CREATED', entityType: 'Announcement', details: { title, type }, ...getRequestInfo(event) });

    return { success: true };
  },

  toggle: async (event) => {
    const formData = await event.request.formData();
    const id = formData.get('id')?.toString();

    if (!id) {
      return fail(400, { error: 'Announcement ID required' });
    }

    const announcement = await prisma.systemAnnouncement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return fail(404, { error: 'Announcement not found' });
    }

    await prisma.systemAnnouncement.update({
      where: { id },
      data: { isActive: !announcement.isActive }
    });

    logAudit({ userId: event.locals.user?.id, action: announcement.isActive ? 'ADMIN_ANNOUNCEMENT_DISABLED' : 'ADMIN_ANNOUNCEMENT_ENABLED', entityType: 'Announcement', entityId: id, details: { title: announcement.title }, ...getRequestInfo(event) });

    return { success: true };
  },

  delete: async (event) => {
    const formData = await event.request.formData();
    const id = formData.get('id')?.toString();

    if (!id) {
      return fail(400, { error: 'Announcement ID required' });
    }

    await prisma.systemAnnouncement.delete({
      where: { id }
    });

    logAudit({ userId: event.locals.user?.id, action: 'ADMIN_ANNOUNCEMENT_DELETED', entityType: 'Announcement', entityId: id, ...getRequestInfo(event) });

    return { success: true };
  }
};
