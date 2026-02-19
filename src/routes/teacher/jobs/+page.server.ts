import { prisma } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  const jobs = await prisma.aIJob.findMany({
    where: { userId: locals.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      type: true,
      status: true,
      progress: true,
      error: true,
      input: true,
      output: true,
      entityId: true,
      entityType: true,
      createdAt: true,
      startedAt: true,
      completedAt: true
    }
  });

  // Get summary stats
  const stats = {
    total: jobs.length,
    completed: jobs.filter((j) => j.status === 'COMPLETED').length,
    running: jobs.filter((j) => j.status === 'RUNNING').length,
    pending: jobs.filter((j) => j.status === 'PENDING').length,
    failed: jobs.filter((j) => j.status === 'FAILED').length
  };

  return { jobs, stats };
};

export const actions: Actions = {
  stopAll: async ({ locals }) => {
    const userId = locals.user?.id;
    if (!userId) return fail(401, { error: 'Unauthorized' });

    // Stop all PENDING and RUNNING jobs for this user
    // Already-made API requests are still billed
    const result = await prisma.aIJob.updateMany({
      where: {
        userId,
        status: { in: ['PENDING', 'RUNNING'] }
      },
      data: {
        status: 'FAILED',
        error: 'Stopped by user',
        completedAt: new Date()
      }
    });

    return { stopped: result.count };
  }
};
