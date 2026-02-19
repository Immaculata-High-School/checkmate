import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { shuttleAI } from '$lib/server/shuttleai';
import { canMakeRequest, recordRequest, queueGrading, getSubmissionsGradingQueue } from '$lib/server/rateLimiter';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const status = url.searchParams.get('status') || '';
  const testId = url.searchParams.get('test') || '';
  const type = url.searchParams.get('type') || '';

  const where: any = {
    test: { teacherId: locals.user!.id }
  };

  if (status) {
    where.status = status;
  }

  if (testId) {
    where.testId = testId;
  }

  const [submissions, tests, docSubmissions, documents] = await Promise.all([
    // Only fetch test submissions if not filtering to documents only
    type !== 'document' ? prisma.testSubmission.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, email: true }
        },
        test: {
          select: { id: true, title: true }
        },
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    }) : Promise.resolve([]),

    // Get tests for filter
    prisma.test.findMany({
      where: { teacherId: locals.user!.id },
      select: { id: true, title: true },
      orderBy: { createdAt: 'desc' }
    }),

    // Get doc submissions if not filtering to tests only
    // Default: show submitted & graded docs. Map test status filters to doc equivalents.
    type !== 'test' ? prisma.studentDocument.findMany({
      where: {
        assignment: {
          document: { ownerId: locals.user!.id }
        },
        ...(status === 'GRADED' 
          ? { grade: { not: null } } 
          : status === 'SUBMITTED' || status === 'PENDING'
            ? { status: { in: ['SUBMITTED', 'RESUBMITTED'] }, grade: null } 
            : status === 'IN_PROGRESS' 
              ? { status: 'IN_PROGRESS' } 
              : { OR: [{ status: 'SUBMITTED' }, { status: 'RESUBMITTED' }, { grade: { not: null } }] }
        )
      },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        },
        assignment: {
          select: {
            id: true,
            title: true,
            points: true,
            document: {
              select: { id: true, title: true }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    }) : Promise.resolve([]),

    // Get documents for filter
    prisma.document.findMany({
      where: {
        ownerId: locals.user!.id,
        assignments: { some: {} }
      },
      select: { id: true, title: true },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  // Get grading queue status for these submissions
  const gradingQueue = await getSubmissionsGradingQueue(submissions.map(s => s.id));

  return {
    submissions,
    tests,
    docSubmissions,
    documents,
    filters: { status, testId, type },
    gradingQueue
  };
};

export const actions: Actions = {
  grade: async ({ request }) => {
    const formData = await request.formData();
    const submissionId = formData.get('submissionId')?.toString();
    const feedback = formData.get('feedback')?.toString() || null;

    if (!submissionId) {
      return fail(400, { error: 'Submission ID required' });
    }

    const submission = await prisma.testSubmission.findUnique({
      where: { id: submissionId },
      include: {
        answers: {
          include: { question: true }
        }
      }
    });

    if (!submission) {
      return fail(404, { error: 'Submission not found' });
    }

    // Process answer grades from form
    let totalScore = 0;
    for (const answer of submission.answers) {
      const points = parseFloat(formData.get(`points_${answer.id}`)?.toString() || '0');
      const answerFeedback = formData.get(`feedback_${answer.id}`)?.toString() || null;

      await prisma.answer.update({
        where: { id: answer.id },
        data: {
          pointsAwarded: points,
          isCorrect: points >= answer.question.points,
          feedback: answerFeedback
        }
      });

      totalScore += points;
    }

    // Calculate total possible points
    const totalPoints = submission.answers.reduce((sum, a) => sum + a.question.points, 0);

    // Update submission
    await prisma.testSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'GRADED',
        score: totalScore,
        totalPoints,
        feedback,
        gradedAt: new Date()
      }
    });

    return { success: true };
  },

  aiGrade: async ({ request, locals }) => {
    const formData = await request.formData();
    const submissionId = formData.get('submissionId')?.toString();

    if (!submissionId) {
      return fail(400, { error: 'Submission ID required' });
    }

    const submission = await prisma.testSubmission.findUnique({
      where: { id: submissionId },
      include: {
        test: true,
        student: true
      }
    });

    if (!submission) {
      return fail(404, { error: 'Submission not found' });
    }

    // Queue the submission for grading (processed sequentially with retries)
    await queueGrading({
      submissionId: submission.id,
      testId: submission.testId,
      studentId: submission.studentId,
      priority: 2 // Higher priority for teacher-initiated grading
    });

    return { aiQueued: true, message: 'Submission queued for AI grading.' };
  },

  aiGradeAnswer: async ({ request, locals }) => {
    const formData = await request.formData();
    const answerId = formData.get('answerId')?.toString();

    if (!answerId) {
      return fail(400, { error: 'Answer ID required' });
    }

    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: { question: true }
    });

    if (!answer) {
      return fail(404, { error: 'Answer not found' });
    }

    // Get org membership for AI tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user!.id }
    });

    // Check rate limit before single-answer grading
    if (!canMakeRequest()) {
      return fail(429, { error: 'Rate limited. Please wait a moment and try again.' });
    }

    recordRequest();

    try {
      const result = await shuttleAI.gradeAnswer({
        question: answer.question.question,
        correctAnswer: answer.question.correctAnswer || '',
        studentAnswer: answer.answer || '',
        questionType: answer.question.type,
        points: answer.question.points
      }, { userId: locals.user!.id, orgId: membership?.organizationId });

      await prisma.answer.update({
        where: { id: answerId },
        data: {
          pointsAwarded: result.pointsAwarded,
          isCorrect: result.isCorrect,
          feedback: result.feedback
        }
      });

      return { answerGraded: true, result };
    } catch (error) {
      console.error('AI grading error:', error);
      return fail(500, { error: 'AI grading failed for this answer.' });
    }
  }
};
