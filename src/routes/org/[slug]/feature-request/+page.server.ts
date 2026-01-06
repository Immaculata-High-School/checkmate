import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
  const { organization } = await parent();

  // Get user's feature requests
  const requests = await prisma.featureRequest.findMany({
    where: {
      userId: locals.user!.id
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    requests,
    organization
  };
};

export const actions: Actions = {
  submit: async ({ request, locals, params }) => {
    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    // Get organization and membership directly instead of using parent()
    const organization = await prisma.organization.findUnique({
      where: { slug: params.slug }
    });

    if (!organization) {
      return fail(404, { error: 'Organization not found' });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: locals.user.id,
        organizationId: organization.id,
        isActive: true
      }
    });

    if (!membership) {
      return fail(403, { error: 'Not a member of this organization' });
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

    await prisma.featureRequest.create({
      data: {
        title,
        description,
        category,
        priority,
        userId: locals.user.id,
        userEmail: locals.user.email,
        userName: locals.user.name,
        orgId: organization.id,
        orgName: organization.name,
        userRole: membership.role
      }
    });

    return { success: true };
  }
};
