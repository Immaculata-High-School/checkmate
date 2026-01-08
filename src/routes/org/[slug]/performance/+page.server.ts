import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { organization } = await parent();
  const orgId = organization.id;

  // Get all classes in the org
  const classes = await prisma.class.findMany({
    where: { organizationId: orgId },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true } }
    },
    orderBy: { name: 'asc' }
  });

  // Get all tests from teachers in the org
  const orgTeachers = await prisma.organizationMember.findMany({
    where: { organizationId: orgId, role: { in: ['TEACHER', 'ORG_ADMIN', 'ORG_OWNER'] } },
    select: { userId: true }
  });
  const teacherIds = orgTeachers.map(t => t.userId);

  const tests = await prisma.test.findMany({
    where: { teacherId: { in: teacherIds } },
    include: {
      submissions: {
        where: { status: 'GRADED' },
        select: { score: true, totalPoints: true, bonusPoints: true }
      },
      teacher: { select: { id: true, name: true } },
      _count: { select: { submissions: true, questions: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  // Calculate test statistics
  const testStats = tests.map(test => {
    const gradedSubmissions = test.submissions;
    const avgScore = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + ((s.totalPoints || 0) > 0 ? Math.min(100, ((s.score || 0) + (s.bonusPoints || 0)) / (s.totalPoints || 1) * 100) : 0), 0) / gradedSubmissions.length
      : null;

    return {
      id: test.id,
      title: test.title,
      status: test.status,
      teacher: test.teacher,
      questionCount: test._count.questions,
      submissionCount: test._count.submissions,
      avgScore,
      createdAt: test.createdAt
    };
  });

  // Overall stats
  const [totalStudents, totalTeachers, totalTests, totalSubmissions] = await Promise.all([
    prisma.organizationMember.count({
      where: { organizationId: orgId, role: 'STUDENT', isActive: true }
    }),
    prisma.organizationMember.count({
      where: { organizationId: orgId, role: { in: ['TEACHER', 'ORG_ADMIN', 'ORG_OWNER'] }, isActive: true }
    }),
    prisma.test.count({
      where: { teacherId: { in: teacherIds } }
    }),
    prisma.testSubmission.count({
      where: { test: { teacherId: { in: teacherIds } } }
    })
  ]);

  // Graded submissions stats
  const gradedStats = await prisma.testSubmission.aggregate({
    where: {
      test: { teacherId: { in: teacherIds } },
      status: 'GRADED'
    },
    _avg: { score: true },
    _count: true
  });

  // Recent activity
  const recentSubmissions = await prisma.testSubmission.findMany({
    where: { test: { teacherId: { in: teacherIds } } },
    orderBy: { submittedAt: 'desc' },
    take: 20,
    include: {
      student: { select: { id: true, name: true, email: true } },
      test: { select: { id: true, title: true } }
    }
  });

  // Performance by class
  const classPerformance = await Promise.all(
    classes.slice(0, 10).map(async (cls) => {
      const classTests = await prisma.classTest.findMany({
        where: { classId: cls.id },
        include: {
          test: {
            include: {
              submissions: {
                where: { status: 'GRADED' },
                select: { score: true, totalPoints: true, bonusPoints: true }
              }
            }
          }
        }
      });

      const allSubmissions = classTests.flatMap(ct => ct.test.submissions);
      const avgScore = allSubmissions.length > 0
        ? allSubmissions.reduce((sum, s) => sum + ((s.totalPoints || 0) > 0 ? Math.min(100, ((s.score || 0) + (s.bonusPoints || 0)) / (s.totalPoints || 1) * 100) : 0), 0) / allSubmissions.length
        : null;

      return {
        id: cls.id,
        name: cls.name,
        teacher: cls.teacher,
        studentCount: cls._count.members,
        testCount: classTests.length,
        avgScore
      };
    })
  );

  return {
    stats: {
      totalStudents,
      totalTeachers,
      totalTests,
      totalSubmissions,
      gradedCount: gradedStats._count,
      avgScore: gradedStats._avg.score
    },
    testStats,
    classPerformance,
    recentSubmissions,
    classes
  };
};
