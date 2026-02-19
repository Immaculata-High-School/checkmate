import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const [submissions, docSubmissions] = await Promise.all([
    prisma.testSubmission.findMany({
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
    }),
    prisma.studentDocument.findMany({
      where: {
        studentId: locals.user!.id,
        grade: { not: null }
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            points: true,
            document: {
              select: { title: true }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    })
  ]);

  // Calculate overall stats including both tests and docs
  const testScore = submissions.reduce((sum, s) => sum + (s.score || 0) + (s.bonusPoints || 0), 0);
  const testPoints = submissions.reduce((sum, s) => sum + (s.totalPoints || 0), 0);
  const docScore = docSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0);
  const docPoints = docSubmissions.reduce((sum, s) => sum + (s.assignment.points || 0), 0);
  const totalScore = testScore + docScore;
  const totalPoints = testPoints + docPoints;
  const overallPercentage = totalPoints > 0 ? Math.round(Math.min(100, (totalScore / totalPoints) * 100)) : null;

  return {
    submissions,
    docSubmissions,
    stats: {
      totalTests: submissions.length,
      totalDocs: docSubmissions.length,
      totalScore,
      totalPoints,
      overallPercentage
    }
  };
};
