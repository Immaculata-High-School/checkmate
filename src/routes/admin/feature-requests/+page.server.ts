import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { sendFeatureRequestResponse } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const status = url.searchParams.get('status') || '';
  const category = url.searchParams.get('category') || '';
  const search = url.searchParams.get('search') || '';

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { userName: { contains: search, mode: 'insensitive' } },
      { userEmail: { contains: search, mode: 'insensitive' } }
    ];
  }

  const requests = await prisma.featureRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      respondedBy: {
        select: { name: true }
      }
    }
  });

  // Get counts by status
  const statusCounts = await prisma.featureRequest.groupBy({
    by: ['status'],
    _count: { id: true }
  });

  const counts = {
    total: 0,
    pending: 0,
    'in-review': 0,
    planned: 0,
    'in-progress': 0,
    completed: 0,
    rejected: 0
  };

  statusCounts.forEach(s => {
    counts[s.status as keyof typeof counts] = s._count.id;
    counts.total += s._count.id;
  });

  return {
    requests,
    counts,
    filters: { status, category, search }
  };
};

export const actions: Actions = {
  respond: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const status = formData.get('status')?.toString();
    const adminResponse = formData.get('adminResponse')?.toString();

    if (!id || !status || !adminResponse) {
      return fail(400, { error: 'All fields are required' });
    }

    const featureRequest = await prisma.featureRequest.findUnique({
      where: { id }
    });

    if (!featureRequest) {
      return fail(404, { error: 'Feature request not found' });
    }

    // Update the request
    await prisma.featureRequest.update({
      where: { id },
      data: {
        status,
        adminResponse,
        respondedById: locals.user.id,
        respondedAt: new Date()
      }
    });

    // Send email notification
    await sendFeatureRequestResponse(
      featureRequest.userEmail,
      featureRequest.title,
      status,
      adminResponse,
      locals.user.name || undefined
    );

    return { success: true };
  },

  updateStatus: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const status = formData.get('status')?.toString();

    if (!id || !status) {
      return fail(400, { error: 'ID and status are required' });
    }

    await prisma.featureRequest.update({
      where: { id },
      data: { status }
    });

    return { success: true };
  },

  delete: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();

    if (!id) {
      return fail(400, { error: 'ID is required' });
    }

    await prisma.featureRequest.delete({
      where: { id }
    });

    return { success: true };
  }
};
