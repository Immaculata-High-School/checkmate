import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const userId = locals.user!.id;

  // First check if this is the user's own study set
  const ownStudySet = await prisma.studySet.findFirst({
    where: {
      id: params.id,
      creatorId: userId,
      classId: null // Personal study sets have no class
    },
    include: {
      cards: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (ownStudySet) {
    // Get student's progress for this set
    const progress = await prisma.studyProgress.findUnique({
      where: {
        userId_studySetId: {
          userId,
          studySetId: params.id
        }
      }
    });

    return {
      studySet: ownStudySet,
      class: null, // Personal study set
      progress,
      isOwner: true
    };
  }

  // Get student's class memberships
  const memberships = await prisma.classMember.findMany({
    where: { userId },
    select: { classId: true }
  });

  const classIds = memberships.map(m => m.classId);

  // Check if this study set is assigned to any of the student's classes
  const assignment = await prisma.classAssignment.findFirst({
    where: {
      studySetId: params.id,
      classId: { in: classIds }
    },
    include: {
      class: {
        select: { id: true, name: true, emoji: true }
      }
    }
  });

  if (!assignment) {
    throw error(403, 'You do not have access to this study set');
  }

  const studySet = await prisma.studySet.findUnique({
    where: { id: params.id },
    include: {
      cards: {
        orderBy: { order: 'asc' }
      },
      creator: {
        select: { id: true, name: true }
      }
    }
  });

  if (!studySet) {
    throw error(404, 'Study set not found');
  }

  // Get student's progress for this set
  const progress = await prisma.studyProgress.findUnique({
    where: {
      userId_studySetId: {
        userId,
        studySetId: params.id
      }
    }
  });

  return {
    studySet,
    class: assignment.class,
    progress,
    isOwner: false
  };
};

export const actions: Actions = {
  delete: async ({ params, locals }) => {
    const userId = locals.user!.id;

    // Verify ownership
    const studySet = await prisma.studySet.findFirst({
      where: {
        id: params.id,
        creatorId: userId,
        classId: null
      }
    });

    if (!studySet) {
      return fail(403, { error: 'You can only delete your own personal study sets' });
    }

    await prisma.studySet.delete({
      where: { id: params.id }
    });

    throw redirect(302, '/student/study-sets');
  }
};
