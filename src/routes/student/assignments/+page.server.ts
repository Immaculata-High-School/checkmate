import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Get active classes the student is enrolled in (single optimized query)
  const memberships = await prisma.classMember.findMany({
    where: {
      userId: locals.user!.id,
      class: { archived: false }
    },
    select: { classId: true }
  });

  const activeClassIds = memberships.map(m => m.classId);

  if (activeClassIds.length === 0) {
    return {
      available: [],
      inProgress: [],
      completed: [],
      studyGuides: [],
      worksheets: [],
      studySets: [],
      totalTests: 0
    };
  }

  // Run all independent queries in parallel
  const [classTests, allAssignments, submissions] = await Promise.all([
    // Get all tests assigned to active classes
    prisma.classTest.findMany({
      where: {
        classId: { in: activeClassIds },
        test: { status: 'PUBLISHED' }
      },
      select: {
        test: {
          select: {
            id: true,
            title: true,
            description: true,
            timeLimit: true,
            maxAttempts: true,
            questions: { select: { id: true } },
            teacher: { select: { id: true, name: true } }
          }
        },
        class: { select: { id: true, name: true, emoji: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // Get ALL assignments in a single query (study guides, worksheets, study sets)
    prisma.classAssignment.findMany({
      where: {
        classId: { in: activeClassIds },
        type: { in: ['STUDY_GUIDE', 'WORKSHEET', 'STUDY_SET'] }
      },
      select: {
        type: true,
        dueDate: true,
        studyGuide: { select: { id: true, title: true, description: true } },
        worksheet: {
          select: {
            id: true,
            title: true,
            description: true,
            _count: { select: { items: true } }
          }
        },
        studySet: {
          select: {
            id: true,
            title: true,
            description: true,
            _count: { select: { cards: true } }
          }
        },
        class: { select: { id: true, name: true, emoji: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // Get student's submissions for all tests they're enrolled in
    prisma.testSubmission.findMany({
      where: {
        studentId: locals.user!.id,
        test: {
          classes: { some: { classId: { in: activeClassIds } } }
        }
      },
      select: {
        testId: true,
        status: true,
        score: true,
        bonusPoints: true,
        totalPoints: true,
        startedAt: true,
        submittedAt: true
      }
    })
  ]);

  const submissionMap = new Map(submissions.map(s => [s.testId, s]));

  // Organize tests by status
  const tests = classTests.map(ct => ({
    id: ct.test.id,
    title: ct.test.title,
    description: ct.test.description,
    timeLimit: ct.test.timeLimit,
    questionCount: ct.test.questions.length,
    maxAttempts: ct.test.maxAttempts,
    teacher: ct.test.teacher,
    class: ct.class,
    submission: submissionMap.get(ct.test.id) || null
  }));

  // Process assignments by type (filter in memory - faster than 3 queries)
  const studyGuideMap = new Map<string, { id: string; title: string; description: string | null; class: { id: string; name: string; emoji: string | null } }>();
  const worksheets: { id: string; title: string; description: string | null; itemCount: number; class: { id: string; name: string; emoji: string | null }; dueDate: Date | null }[] = [];
  const studySets: { id: string; title: string; description: string | null; cardCount: number; class: { id: string; name: string; emoji: string | null }; dueDate: Date | null }[] = [];

  for (const a of allAssignments) {
    if (a.type === 'STUDY_GUIDE' && a.studyGuide && !studyGuideMap.has(a.studyGuide.id)) {
      studyGuideMap.set(a.studyGuide.id, {
        id: a.studyGuide.id,
        title: a.studyGuide.title,
        description: a.studyGuide.description,
        class: a.class
      });
    } else if (a.type === 'WORKSHEET' && a.worksheet) {
      worksheets.push({
        id: a.worksheet.id,
        title: a.worksheet.title,
        description: a.worksheet.description,
        itemCount: a.worksheet._count.items,
        class: a.class,
        dueDate: a.dueDate
      });
    } else if (a.type === 'STUDY_SET' && a.studySet) {
      studySets.push({
        id: a.studySet.id,
        title: a.studySet.title,
        description: a.studySet.description,
        cardCount: a.studySet._count.cards,
        class: a.class,
        dueDate: a.dueDate
      });
    }
  }

  const studyGuides = Array.from(studyGuideMap.values());

  const available = tests.filter(t => !t.submission || (t.submission.status === 'IN_PROGRESS'));
  const inProgress = tests.filter(t => t.submission?.status === 'IN_PROGRESS');
  const completed = tests.filter(t => t.submission && ['SUBMITTED', 'PENDING', 'GRADED'].includes(t.submission.status));

  return {
    available,
    inProgress,
    completed,
    studyGuides,
    worksheets,
    studySets,
    totalTests: tests.length
  };
};
