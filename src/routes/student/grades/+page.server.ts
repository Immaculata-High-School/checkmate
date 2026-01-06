import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const submissions = await prisma.testSubmission.findMany({
    where: {
      studentId: locals.user!.id,
      status: 'GRADED'
    },
    include: {
      test: {
        select: {
          id: true,
          title: true,
          description: true
        }
      }
    },
    orderBy: { submittedAt: 'desc' }
  });

  // Calculate overall stats
  const totalScore = submissions.reduce((sum, s) => sum + (s.score || 0), 0);
  const totalPoints = submissions.reduce((sum, s) => sum + (s.totalPoints || 0), 0);
  const overallPercentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : null;

  return {
    submissions,
    stats: {
      totalTests: submissions.length,
      totalScore,
      totalPoints,
      overallPercentage
    }
  };
};
