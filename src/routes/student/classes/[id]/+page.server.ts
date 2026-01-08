import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const membership = await prisma.classMember.findFirst({
    where: {
      classId: params.id,
      userId: locals.user!.id
    },
    include: {
      class: {
        include: {
          teacher: {
            select: { id: true, name: true, email: true }
          },
          tests: {
            include: {
              test: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  timeLimit: true,
                  description: true,
                  questions: { select: { id: true } }
                }
              }
            }
          },
          assignments: {
            include: {
              worksheet: {
                select: { id: true, title: true, description: true }
              },
              studySet: {
                include: { _count: { select: { cards: true } } }
              },
              studyGuide: {
                select: { id: true, title: true, description: true }
              }
            }
          },
          _count: {
            select: { members: true }
          }
        }
      }
    }
  });

  if (!membership) {
    throw error(404, 'Class not found or not enrolled');
  }

  // Get student's submissions for tests in this class
  const testIds = membership.class.tests.map(t => t.test.id);
  const submissions = await prisma.testSubmission.findMany({
    where: {
      studentId: locals.user!.id,
      testId: { in: testIds }
    },
    select: {
      testId: true,
      status: true,
      score: true,
      bonusPoints: true,
      totalPoints: true
    }
  });

  const submissionMap = new Map(submissions.map(s => [s.testId, s]));

  // Parse assignments
  const worksheets = membership.class.assignments
    .filter(a => a.worksheet)
    .map(a => ({
      id: a.worksheet!.id,
      title: a.worksheet!.title,
      description: a.worksheet!.description,
      dueDate: a.dueDate
    }));

  const studySets = membership.class.assignments
    .filter(a => a.studySet)
    .map(a => ({
      id: a.studySet!.id,
      title: a.studySet!.title,
      cardCount: a.studySet!._count.cards,
      dueDate: a.dueDate
    }));

  const studyGuides = membership.class.assignments
    .filter(a => a.studyGuide)
    .map(a => ({
      id: a.studyGuide!.id,
      title: a.studyGuide!.title,
      description: a.studyGuide!.description
    }));

  return {
    class: membership.class,
    enrolledAt: membership.joinedAt,
    tests: membership.class.tests
      .filter(t => t.test.status === 'PUBLISHED')
      .map(t => ({
        ...t.test,
        questionCount: t.test.questions.length,
        submission: submissionMap.get(t.test.id) || null
      })),
    worksheets,
    studySets,
    studyGuides
  };
};
