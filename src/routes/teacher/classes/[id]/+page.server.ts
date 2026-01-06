import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const cls = await prisma.class.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      tests: {
        include: {
          test: {
            select: {
              id: true,
              title: true,
              status: true,
              _count: {
                select: { questions: true }
              }
            }
          }
        }
      },
      assignments: {
        include: {
          worksheet: {
            select: { id: true, title: true }
          },
          studySet: {
            select: { id: true, title: true }
          },
          studyGuide: {
            select: { id: true, title: true }
          }
        }
      }
    }
  });

  if (!cls) {
    throw error(404, 'Class not found');
  }

  if (cls.teacherId !== locals.user!.id) {
    throw error(403, 'Not authorized');
  }

  return { class: cls };
};

export const actions: Actions = {
  update: async ({ params, request, locals }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const description = formData.get('description')?.toString().trim();

    const cls = await prisma.class.findUnique({
      where: { id: params.id }
    });

    if (!cls || cls.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    if (!name) {
      return fail(400, { error: 'Class name is required' });
    }

    await prisma.class.update({
      where: { id: params.id },
      data: { name, description }
    });

    return { success: true };
  },

  archive: async ({ params, locals }) => {
    const cls = await prisma.class.findUnique({
      where: { id: params.id }
    });

    if (!cls || cls.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.class.update({
      where: { id: params.id },
      data: { archived: true }
    });

    throw redirect(302, '/teacher/classes');
  },

  unarchive: async ({ params, locals }) => {
    const cls = await prisma.class.findUnique({
      where: { id: params.id }
    });

    if (!cls || cls.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.class.update({
      where: { id: params.id },
      data: { archived: false }
    });

    return { success: true };
  },

  removeStudent: async ({ params, request, locals }) => {
    const formData = await request.formData();
    const studentId = formData.get('studentId')?.toString();

    if (!studentId) {
      return fail(400, { error: 'Student ID is required' });
    }

    const cls = await prisma.class.findUnique({
      where: { id: params.id }
    });

    if (!cls || cls.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.classMember.delete({
      where: {
        classId_userId: {
          classId: params.id,
          userId: studentId
        }
      }
    });

    return { success: true };
  },

  delete: async ({ params, locals }) => {
    const cls = await prisma.class.findUnique({
      where: { id: params.id }
    });

    if (!cls || cls.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.class.delete({
      where: { id: params.id }
    });

    throw redirect(302, '/teacher/classes');
  }
};
