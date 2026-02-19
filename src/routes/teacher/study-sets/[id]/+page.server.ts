import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const studySet = await prisma.studySet.findUnique({
    where: { id: params.id },
    include: {
      cards: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!studySet) {
    throw error(404, 'Study set not found');
  }

  if (studySet.creatorId !== locals.user!.id) {
    throw error(403, 'Not authorized');
  }

  return { studySet };
};

export const actions: Actions = {
  delete: async (event) => {
    const { params, locals } = event;
    const studySet = await prisma.studySet.findUnique({
      where: { id: params.id }
    });

    if (!studySet || studySet.creatorId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.studySet.delete({
      where: { id: params.id }
    });

    throw redirect(302, '/teacher/study-sets');
  }
};
