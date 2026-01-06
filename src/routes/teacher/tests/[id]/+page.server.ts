import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const test = await prisma.test.findUnique({
    where: { id: params.id },
    include: {
      questions: {
        orderBy: { order: 'asc' }
      },
      submissions: {
        include: {
          student: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { submittedAt: 'desc' }
      },
      classes: {
        include: {
          class: {
            select: { id: true, name: true }
          }
        }
      }
    }
  });

  if (!test) {
    throw error(404, 'Test not found');
  }

  if (test.teacherId !== locals.user!.id) {
    throw error(403, 'Not authorized');
  }

  // Get available classes to assign
  const availableClasses = await prisma.class.findMany({
    where: {
      teacherId: locals.user!.id,
      archived: false
    },
    select: { id: true, name: true }
  });

  return { test, availableClasses };
};

export const actions: Actions = {
  publish: async ({ params, locals }) => {
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    // Redirect to settings page with publish intent
    throw redirect(302, `/teacher/tests/${params.id}/settings?publish=true`);
  },

  unpublish: async ({ params, locals }) => {
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.test.update({
      where: { id: params.id },
      data: { status: 'DRAFT' }
    });

    return { success: true };
  },

  delete: async ({ params, locals }) => {
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.test.delete({
      where: { id: params.id }
    });

    throw redirect(302, '/teacher/tests');
  },

  assignClass: async ({ params, request, locals }) => {
    const formData = await request.formData();
    const classId = formData.get('classId')?.toString();

    if (!classId) {
      return fail(400, { error: 'Class is required' });
    }

    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    // Check if already assigned
    const existing = await prisma.classTest.findUnique({
      where: {
        classId_testId: {
          classId,
          testId: params.id
        }
      }
    });

    if (existing) {
      return fail(400, { error: 'Test already assigned to this class' });
    }

    await prisma.classTest.create({
      data: {
        classId,
        testId: params.id
      }
    });

    return { success: true };
  }
};
