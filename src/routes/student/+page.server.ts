import { prisma } from '$lib/server/db';
import { cache } from '$lib/server/cache';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user!.id;

  // Run all queries in parallel for better performance
  const [classMemberships, recentSubmissions, recentDocSubmissions, stats] = await Promise.all([
    // Get student's classes
    prisma.classMember.findMany({
      where: { userId },
      select: {
        classId: true,
        class: {
          select: { id: true, name: true, emoji: true }
        }
      }
    }),
    
    // Get recent test submissions with minimal data
    prisma.testSubmission.findMany({
      where: { studentId: userId },
      take: 5,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        status: true,
        score: true,
        bonusPoints: true,
        totalPoints: true,
        startedAt: true,
        submittedAt: true,
        test: { select: { title: true, accessCode: true } }
      }
    }),

    // Get recent graded document submissions
    prisma.studentDocument.findMany({
      where: { studentId: userId, grade: { not: null } },
      take: 5,
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        status: true,
        grade: true,
        submittedAt: true,
        assignment: {
          select: {
            title: true,
            points: true,
            document: { select: { title: true } }
          }
        }
      }
    }),

    // Get aggregated stats in a single query
    prisma.$queryRaw<[{ total_tests: bigint; avg_score: number | null }]>`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'GRADED') as total_tests,
        AVG(CASE WHEN status = 'GRADED' AND score IS NOT NULL AND "totalPoints" > 0 
            THEN LEAST((score::float + COALESCE("bonusPoints"::float, 0)) / "totalPoints"::float * 100, 100)
            ELSE NULL END) as avg_score
      FROM "TestSubmission"
      WHERE "studentId" = ${userId}
    `
  ]);

  const classIds = classMemberships.map((m) => m.classId);

  // Get upcoming assignments only if user has classes
  const upcomingAssignments = classIds.length > 0 
    ? await prisma.classAssignment.findMany({
        where: {
          classId: { in: classIds },
          OR: [{ dueDate: { gte: new Date() } }, { dueDate: null }]
        },
        select: {
          id: true,
          type: true,
          title: true,
          dueDate: true,
          test: { select: { id: true, title: true, accessCode: true, status: true } },
          studySet: { select: { id: true, title: true } },
          class: { select: { name: true, emoji: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      })
    : [];

  // Get study sets count (both personal and assigned)
  const [ownStudySetsCount, assignedStudySetsCount] = await Promise.all([
    prisma.studySet.count({
      where: { creatorId: userId, classId: null }
    }),
    prisma.classAssignment.count({
      where: {
        classId: { in: classIds },
        type: 'STUDY_SET',
        studySetId: { not: null }
      }
    })
  ]);

  const statsResult = stats[0];

  return {
    stats: {
      totalClasses: classMemberships.length,
      totalTests: Number(statsResult?.total_tests || 0),
      averageScore: Math.round(statsResult?.avg_score || 0),
      studySets: ownStudySetsCount + assignedStudySetsCount
    },
    recentSubmissions,
    recentDocSubmissions,
    upcomingAssignments
  };
};
