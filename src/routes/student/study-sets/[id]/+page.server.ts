import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  // Get student's class memberships
  const memberships = await prisma.classMember.findMany({
    where: { userId: locals.user!.id },
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
        userId: locals.user!.id,
        studySetId: params.id
      }
    }
  });

  return {
    studySet,
    class: assignment.class,
    progress
  };
};
