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

  // Check if this study guide is assigned to any of the student's classes
  const assignment = await prisma.classAssignment.findFirst({
    where: {
      studyGuideId: params.id,
      classId: { in: classIds }
    },
    include: {
      class: {
        select: { id: true, name: true, emoji: true }
      }
    }
  });

  if (!assignment) {
    throw error(403, 'You do not have access to this study guide');
  }

  const studyGuide = await prisma.studyGuide.findUnique({
    where: { id: params.id },
    include: {
      teacher: {
        select: { id: true, name: true }
      }
    }
  });

  if (!studyGuide) {
    throw error(404, 'Study guide not found');
  }

  return { studyGuide, class: assignment.class };
};
