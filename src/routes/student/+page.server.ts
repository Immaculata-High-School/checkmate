import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user!.id;

  // Get student's classes
  const classMemberships = await prisma.classMember.findMany({
    where: { userId },
    include: {
      class: true
    }
  });

  const classIds = classMemberships.map((m) => m.classId);

  // Get recent test submissions
  const recentSubmissions = await prisma.testSubmission.findMany({
    where: { studentId: userId },
    take: 5,
    orderBy: { startedAt: 'desc' },
    include: {
      test: { select: { title: true, accessCode: true } }
    }
  });

  // Get upcoming assignments
  const upcomingAssignments = await prisma.classAssignment.findMany({
    where: {
      classId: { in: classIds },
      OR: [{ dueDate: { gte: new Date() } }, { dueDate: null }]
    },
    include: {
      test: true,
      studySet: true,
      class: { select: { name: true, emoji: true } }
    },
    orderBy: { dueDate: 'asc' },
    take: 5
  });

  // Calculate stats
  const totalTests = await prisma.testSubmission.count({
    where: { studentId: userId, status: 'GRADED' }
  });

  const gradedSubmissions = await prisma.testSubmission.findMany({
    where: { studentId: userId, status: 'GRADED', score: { not: null }, totalPoints: { not: null } }
  });

  let averageScore = 0;
  if (gradedSubmissions.length > 0) {
    const totalPercentage = gradedSubmissions.reduce((sum, s) => {
      return sum + ((s.score || 0) / (s.totalPoints || 1)) * 100;
    }, 0);
    averageScore = Math.round(totalPercentage / gradedSubmissions.length);
  }

  // Study sets progress
  const studyProgress = await prisma.studyProgress.count({
    where: { userId }
  });

  return {
    stats: {
      totalClasses: classMemberships.length,
      totalTests,
      averageScore,
      studySets: studyProgress
    },
    recentSubmissions,
    upcomingAssignments
  };
};
