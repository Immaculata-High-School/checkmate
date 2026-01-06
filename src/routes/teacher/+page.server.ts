import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user!.id;

  // Get counts
  const [totalClasses, totalStudents, totalTests, pendingSubmissions] = await Promise.all([
    prisma.class.count({
      where: { teacherId: userId, archived: false }
    }),
    prisma.classMember.count({
      where: {
        class: { teacherId: userId },
        role: 'STUDENT'
      }
    }),
    prisma.test.count({
      where: { teacherId: userId }
    }),
    prisma.testSubmission.count({
      where: {
        test: { teacherId: userId },
        status: 'SUBMITTED'
      }
    })
  ]);

  // Get recent submissions for grading
  const recentSubmissions = await prisma.testSubmission.findMany({
    where: {
      test: { teacherId: userId },
      status: { in: ['SUBMITTED', 'GRADED'] }
    },
    take: 5,
    orderBy: { submittedAt: 'desc' },
    include: {
      student: { select: { name: true, email: true } },
      test: { select: { title: true } }
    }
  });

  // Get recent activity
  const recentTests = await prisma.test.findMany({
    where: { teacherId: userId },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true, submissions: true } }
    }
  });

  return {
    stats: {
      totalClasses,
      totalStudents,
      totalTests,
      pendingSubmissions
    },
    recentSubmissions,
    recentTests
  };
};
