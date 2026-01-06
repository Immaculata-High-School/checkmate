import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Get classes the student is enrolled in
  const memberships = await prisma.classMember.findMany({
    where: { userId: locals.user!.id },
    select: { classId: true }
  });

  const classIds = memberships.map(m => m.classId);

  // Get only active (non-archived) classes
  const activeClasses = await prisma.class.findMany({
    where: {
      id: { in: classIds },
      archived: false
    },
    select: { id: true }
  });
  const activeClassIds = activeClasses.map(c => c.id);

  // Get all tests assigned to those active classes
  const classTests = await prisma.classTest.findMany({
    where: {
      classId: { in: activeClassIds },
      test: { status: 'PUBLISHED' }
    },
    include: {
      test: {
        include: {
          questions: { select: { id: true } },
          teacher: { select: { id: true, name: true } }
        }
      },
      class: {
        select: { id: true, name: true, emoji: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get study guides assigned to student's active classes (new model)
  const studyGuideAssignments = await prisma.classAssignment.findMany({
    where: {
      classId: { in: activeClassIds },
      type: 'STUDY_GUIDE',
      studyGuideId: { not: null }
    },
    include: {
      studyGuide: {
        select: {
          id: true,
          title: true,
          description: true
        }
      },
      class: {
        select: { id: true, name: true, emoji: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get student's submissions
  const testIds = classTests.map(ct => ct.test.id);
  const submissions = await prisma.testSubmission.findMany({
    where: {
      studentId: locals.user!.id,
      testId: { in: testIds }
    },
    select: {
      testId: true,
      status: true,
      score: true,
      totalPoints: true,
      startedAt: true,
      submittedAt: true
    }
  });

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

  // Deduplicate study guides (same guide might be assigned to multiple classes)
  const studyGuideMap = new Map<string, typeof studyGuideAssignments[0]>();
  for (const sg of studyGuideAssignments) {
    if (sg.studyGuide && !studyGuideMap.has(sg.studyGuide.id)) {
      studyGuideMap.set(sg.studyGuide.id, sg);
    }
  }
  const studyGuides = Array.from(studyGuideMap.values())
    .filter(sg => sg.studyGuide)
    .map(sg => ({
      id: sg.studyGuide!.id,
      title: sg.studyGuide!.title,
      description: sg.studyGuide!.description,
      class: sg.class
    }));

  // Get worksheets assigned to student's active classes
  const worksheetAssignments = await prisma.classAssignment.findMany({
    where: {
      classId: { in: activeClassIds },
      type: 'WORKSHEET',
      worksheetId: { not: null }
    },
    include: {
      worksheet: {
        include: {
          _count: { select: { items: true } }
        }
      },
      class: {
        select: { id: true, name: true, emoji: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const worksheets = worksheetAssignments
    .filter(a => a.worksheet)
    .map(a => ({
      id: a.worksheet!.id,
      title: a.worksheet!.title,
      description: a.worksheet!.description,
      itemCount: a.worksheet!._count.items,
      class: a.class,
      dueDate: a.dueDate
    }));

  // Get study sets assigned to student's active classes
  const studySetAssignments = await prisma.classAssignment.findMany({
    where: {
      classId: { in: activeClassIds },
      type: 'STUDY_SET',
      studySetId: { not: null }
    },
    include: {
      studySet: {
        include: {
          _count: { select: { cards: true } }
        }
      },
      class: {
        select: { id: true, name: true, emoji: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const studySets = studySetAssignments
    .filter(a => a.studySet)
    .map(a => ({
      id: a.studySet!.id,
      title: a.studySet!.title,
      description: a.studySet!.description,
      cardCount: a.studySet!._count.cards,
      class: a.class,
      dueDate: a.dueDate
    }));

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
