import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const worksheet = await prisma.worksheet.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!worksheet) {
    throw error(404, 'Worksheet not found');
  }

  if (worksheet.teacherId !== locals.user!.id) {
    throw error(403, 'Not authorized');
  }

  return { worksheet };
};

export const actions: Actions = {
  delete: async ({ params, locals }) => {
    const worksheet = await prisma.worksheet.findUnique({
      where: { id: params.id }
    });

    if (!worksheet || worksheet.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.worksheet.delete({
      where: { id: params.id }
    });

    throw redirect(302, '/teacher/worksheets');
  }
};
