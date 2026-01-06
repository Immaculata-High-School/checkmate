import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const organization = await prisma.organization.findUnique({
    where: { slug: params.slug }
  });

  if (!organization) {
    return { classes: [] };
  }

  const classes = await prisma.class.findMany({
    where: { organizationId: organization.id },
    include: {
      teacher: {
        select: { id: true, name: true, email: true }
      },
      _count: {
        select: { members: true, tests: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return { classes };
};

async function requireOrgAdminAccess(slug: string, userId: string) {
  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true }
  });

  if (!organization) {
    return { organization: null, membership: null };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId: organization.id,
      role: { in: ['ORG_OWNER', 'ORG_ADMIN'] },
      isActive: true
    },
    select: { id: true }
  });

  return { organization, membership };
}

export const actions: Actions = {
  update: async ({ request, locals, params }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const classId = formData.get('classId')?.toString();
    const name = formData.get('name')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const emoji = formData.get('emoji')?.toString().trim();
    const archived = formData.get('archived') === 'on';

    if (!classId) {
      return fail(400, { error: 'Class ID is required' });
    }

    if (!name) {
      return fail(400, { error: 'Class name is required' });
    }

    const { organization, membership } = await requireOrgAdminAccess(params.slug, locals.user.id);
    if (!organization || !membership) {
      return fail(403, { error: 'Not authorized' });
    }

    const cls = await prisma.class.findFirst({
      where: {
        id: classId,
        organizationId: organization.id
      },
      select: { id: true }
    });

    if (!cls) {
      return fail(404, { error: 'Class not found' });
    }

    await prisma.class.update({
      where: { id: classId },
      data: {
        name,
        description: description || null,
        emoji: emoji || null,
        archived
      }
    });

    return { success: true };
  },

  delete: async ({ request, locals, params }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const classId = formData.get('classId')?.toString();
    if (!classId) {
      return fail(400, { error: 'Class ID is required' });
    }

    const { organization, membership } = await requireOrgAdminAccess(params.slug, locals.user.id);
    if (!organization || !membership) {
      return fail(403, { error: 'Not authorized' });
    }

    const cls = await prisma.class.findFirst({
      where: {
        id: classId,
        organizationId: organization.id
      },
      select: { id: true }
    });

    if (!cls) {
      return fail(404, { error: 'Class not found' });
    }

    await prisma.class.delete({
      where: { id: classId }
    });

    return { success: true };
  }
};
