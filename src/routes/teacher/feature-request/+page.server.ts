import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    return { requests: [] };
  }

  // Get user's feature requests
  const requests = await prisma.featureRequest.findMany({
    where: {
      userId: locals.user.id
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get user's org info if available
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: locals.user.id,
      role: { in: ['TEACHER', 'TEACHING_ASSISTANT'] }
    },
    include: {
      organization: {
        select: { id: true, name: true }
      }
    }
  });

  return {
    requests,
    organization: membership?.organization || null,
    userRole: membership?.role || 'TEACHER'
  };
};

export const actions: Actions = {
  submit: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString();
    const description = formData.get('description')?.toString();
    const category = formData.get('category')?.toString() || 'general';
    const priority = formData.get('priority')?.toString() || 'medium';

    if (!title || !description) {
      return fail(400, { error: 'Title and description are required' });
    }

    if (title.length < 5) {
      return fail(400, { error: 'Title must be at least 5 characters' });
    }

    if (description.length < 20) {
      return fail(400, { error: 'Description must be at least 20 characters' });
    }

    // Get user's org info if available
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: locals.user.id,
        role: { in: ['TEACHER', 'TEACHING_ASSISTANT'] }
      },
      include: {
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    await prisma.featureRequest.create({
      data: {
        title,
        description,
        category,
        priority,
        userId: locals.user.id,
        userEmail: locals.user.email,
        userName: locals.user.name,
        orgId: membership?.organization?.id,
        orgName: membership?.organization?.name,
        userRole: membership?.role || 'TEACHER'
      }
    });

    return { success: true };
  }
};
