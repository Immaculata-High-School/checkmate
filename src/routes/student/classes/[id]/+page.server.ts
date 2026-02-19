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
          documentAssignments: {
            include: {
              document: {
                select: {
                  id: true,
                  title: true,
                  content: true,
                  owner: { select: { name: true } }
                }
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
  const [submissions, studentDocs] = await Promise.all([
    prisma.testSubmission.findMany({
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
    }),
    // Get student's document copies for this class
    prisma.studentDocument.findMany({
      where: {
        studentId: locals.user!.id,
        assignment: {
          classId: params.id
        }
      },
      select: {
        id: true,
        title: true,
        status: true,
        grade: true,
        assignmentId: true
      }
    })
  ]);

  const submissionMap = new Map(submissions.map(s => [s.testId, s]));
  let studentDocMap = new Map(studentDocs.map(sd => [sd.assignmentId, sd]));

  // Create missing StudentDocument records for MAKE_COPY assignments (e.g. student joined after assignment)
  const makeCopyAssignments = membership.class.documentAssignments.filter(
    da => da.type === 'MAKE_COPY' && !studentDocMap.has(da.id)
  );
  if (makeCopyAssignments.length > 0) {
    const newDocs = await Promise.all(
      makeCopyAssignments.map(da =>
        prisma.studentDocument.create({
          data: {
            assignmentId: da.id,
            studentId: locals.user!.id,
            title: da.title || da.document.title,
            content: da.document.content || '',
            status: 'NOT_STARTED'
          },
          select: {
            id: true,
            title: true,
            status: true,
            grade: true,
            assignmentId: true
          }
        })
      )
    );
    for (const sd of newDocs) {
      studentDocMap.set(sd.assignmentId, sd);
    }
  }

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

  // Build document assignments
  const documentAssignments = membership.class.documentAssignments.map(da => {
    const studentDoc = studentDocMap.get(da.id);
    return {
      id: da.id,
      documentId: da.document.id,
      title: da.title || da.document.title,
      type: da.type,
      dueDate: da.dueDate,
      points: da.points,
      teacherName: da.document.owner.name,
      // For MAKE_COPY, use student doc info; for VIEW_ONLY, no status
      studentDocId: studentDoc?.id || null,
      status: studentDoc?.status || null,
      grade: studentDoc?.grade || null,
      href: da.type === 'VIEW_ONLY' 
        ? `/student/docs/${da.document.id}`
        : studentDoc ? `/student/docs/work/${studentDoc.id}` : null
    };
  });

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
    studyGuides,
    documentAssignments
  };
};
