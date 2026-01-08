import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { shuttleAI } from '$lib/server/shuttleai';
import { canMakeRequest, recordRequest, getRateLimitStatus } from '$lib/server/rateLimiter';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const status = url.searchParams.get('status') || '';
  const testId = url.searchParams.get('test') || '';

  const where: any = {
    test: { teacherId: locals.user!.id }
  };

  if (status) {
    where.status = status;
  }

  if (testId) {
    where.testId = testId;
  }

  const submissions = await prisma.testSubmission.findMany({
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
  });

  // Get tests for filter
  const tests = await prisma.test.findMany({
    where: { teacherId: locals.user!.id },
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' }
  });

  return {
    submissions,
    tests,
    filters: { status, testId }
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

    // Check rate limit
    if (!canMakeRequest()) {
      const status = getRateLimitStatus();
      const waitTime = status.nextSlotAvailableIn ? Math.ceil(status.nextSlotAvailableIn / 1000) : 60;
      return fail(429, { error: `Rate limited. Please try again in ${waitTime} seconds.` });
    }

    const submission = await prisma.testSubmission.findUnique({
      where: { id: submissionId },
      include: {
        test: true,
        answers: {
          include: { question: true }
        },
        student: true
      }
    });

    if (!submission) {
      return fail(404, { error: 'Submission not found' });
    }

    // Get org membership for AI tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user!.id }
    });

    // Create AI job for tracking
    const job = await prisma.aIJob.create({
      data: {
        type: 'TEST_GRADING',
        status: 'RUNNING',
        input: {
          testTitle: submission.test.title,
          submissionId: submission.id,
          studentId: submission.studentId,
          studentName: submission.student.name,
          questionCount: submission.answers.length
        },
        entityId: submission.test.id,
        entityType: 'TEST',
        userId: locals.user!.id,
        orgId: membership?.organizationId,
        startedAt: new Date()
      }
    });

    // Record this request for rate limiting
    recordRequest();

    try {
      // Use AI to grade the entire test with test-specific settings
      const result = await shuttleAI.gradeTestComprehensive({
        testTitle: submission.test.title,
        answers: submission.answers.map(a => ({
          id: a.id,
          question: a.question.question,
          correctAnswer: a.question.correctAnswer || '',
          studentAnswer: a.answer || '',
          questionType: a.question.type,
          points: a.question.points
        })),
        allowPartialCredit: (submission.test as any).aiPartialCredit ?? true,
        gradingHarshness: (submission.test as any).aiGradingHarshness ?? 50
      }, { userId: locals.user!.id, orgId: membership?.organizationId });

      // Update each answer with AI grading
      for (const gradedAnswer of result.gradedAnswers) {
        await prisma.answer.update({
          where: { id: gradedAnswer.id },
          data: {
            pointsAwarded: gradedAnswer.pointsAwarded,
            isCorrect: gradedAnswer.isCorrect,
            feedback: gradedAnswer.feedback
          }
        });
      }

      // Update submission with total score
      await prisma.testSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'GRADED',
          score: result.totalScore,
          totalPoints: result.totalPoints,
          feedback: result.overallFeedback,
          gradedAt: new Date()
        }
      });

      // Update job as completed
      await prisma.aIJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          output: {
            totalScore: result.totalScore,
            totalPoints: result.totalPoints,
            gradedAnswersCount: result.gradedAnswers.length,
            overallFeedback: result.overallFeedback
          },
          completedAt: new Date()
        }
      });

      return { aiSuccess: true, message: 'AI grading completed successfully' };
    } catch (error) {
      console.error('AI grading error:', error);
      
      // Update job as failed
      await prisma.aIJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'AI grading failed',
          completedAt: new Date()
        }
      });
      
      return fail(500, { error: 'AI grading failed. Please try manual grading.' });
    }
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
