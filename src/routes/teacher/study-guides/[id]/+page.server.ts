import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const studyGuide = await prisma.studyGuide.findUnique({
    where: { id: params.id },
    include: {
      sourceTest: {
        select: { id: true, title: true }
      },
      assignments: {
        include: {
          class: {
            select: { id: true, name: true, emoji: true }
          }
        }
      }
    }
  });

  if (!studyGuide) {
    throw error(404, 'Study guide not found');
  }

  if (studyGuide.teacherId !== locals.user.id) {
    throw error(403, 'Not authorized');
  }

  // Get available classes for assignment
  const classes = await prisma.class.findMany({
    where: { teacherId: locals.user.id, archived: false },
    select: { id: true, name: true, emoji: true }
  });

  return { studyGuide, classes };
};

export const actions: Actions = {
  update: async ({ params, request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const content = formData.get('content')?.toString().trim();

    const studyGuide = await prisma.studyGuide.findUnique({
      where: { id: params.id }
    });

    if (!studyGuide || studyGuide.teacherId !== locals.user.id) {
      return fail(403, { error: 'Not authorized' });
    }

    if (!title) {
      return fail(400, { error: 'Title is required' });
    }

    await prisma.studyGuide.update({
      where: { id: params.id },
      data: { title, description, content }
    });

    return { success: true };
  },

  assign: async ({ params, request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const classIds = formData.getAll('classIds').map((id) => id.toString());

    if (classIds.length === 0) {
      return fail(400, { error: 'Select at least one class' });
    }

    const studyGuide = await prisma.studyGuide.findUnique({
      where: { id: params.id }
    });

    if (!studyGuide || studyGuide.teacherId !== locals.user.id) {
      return fail(403, { error: 'Not authorized' });
    }

    // Create assignments for each class (skip if already exists)
    for (const classId of classIds) {
      const existing = await prisma.classAssignment.findFirst({
        where: {
          classId,
          type: 'STUDY_GUIDE',
          studyGuideId: params.id
        }
      });

      if (!existing) {
        await prisma.classAssignment.create({
          data: {
            classId,
            type: 'STUDY_GUIDE',
            studyGuideId: params.id
          }
        });
      }
    }

    // Notify students
    const classMembers = await prisma.classMember.findMany({
      where: {
        classId: { in: classIds },
        role: 'STUDENT'
      },
      select: { userId: true }
    });

    if (classMembers.length > 0) {
      await prisma.notification.createMany({
        data: classMembers.map((member) => ({
          type: 'STUDY_GUIDE',
          title: 'New Study Guide Available',
          message: `A study guide "${studyGuide.title}" is now available.`,
          link: `/student/study-guides/${params.id}`,
          userId: member.userId
        }))
      });
    }

    return { assignSuccess: true, studentsNotified: classMembers.length };
  },

  unassign: async ({ params, request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const classId = formData.get('classId')?.toString();

    if (!classId) {
      return fail(400, { error: 'Class ID is required' });
    }

    const studyGuide = await prisma.studyGuide.findUnique({
      where: { id: params.id }
    });

    if (!studyGuide || studyGuide.teacherId !== locals.user.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.classAssignment.deleteMany({
      where: {
        classId,
        studyGuideId: params.id
      }
    });

    return { unassignSuccess: true };
  },

  delete: async ({ params, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const studyGuide = await prisma.studyGuide.findUnique({
      where: { id: params.id }
    });

    if (!studyGuide || studyGuide.teacherId !== locals.user.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.studyGuide.delete({
      where: { id: params.id }
    });

    throw redirect(302, '/teacher/study-guides');
  }
};
