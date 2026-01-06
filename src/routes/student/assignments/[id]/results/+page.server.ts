import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const userId = locals.user!.id;

  const submission = await prisma.testSubmission.findFirst({
    where: {
      testId: params.id,
      studentId: userId,
      status: { not: 'IN_PROGRESS' }
    },
    orderBy: { attemptNumber: 'desc' },
    include: {
      test: {
        include: {
          teacher: { select: { id: true, name: true } },
          questions: { orderBy: { order: 'asc' } }
        }
      },
      answers: {
        include: {
          question: true
        }
      }
    }
  });

  if (!submission) {
    throw error(404, 'Submission not found');
  }

  if (submission.status === 'IN_PROGRESS') {
    throw error(400, 'Test not submitted yet');
  }

  // Get student override if exists for retake info
  const studentOverride = await prisma.testStudentOverride.findUnique({
    where: {
      testId_studentId: {
        testId: params.id,
        studentId: userId
      }
    }
  });

  // Calculate max allowed attempts for this student
  const maxAttempts = submission.test.maxAttempts === 0
    ? Infinity
    : submission.test.maxAttempts + (studentOverride?.extraAttempts || 0);

  // Count completed attempts
  const attemptCount = await prisma.testSubmission.count({
    where: {
      testId: params.id,
      studentId: userId,
      status: { not: 'IN_PROGRESS' }
    }
  });

  const canRetake = attemptCount < maxAttempts && submission.test.status === 'PUBLISHED';

  // Build results
  const answerMap = new Map(submission.answers.map(a => [a.questionId, a]));

  // Only show correct answers if both settings allow it
  const shouldShowCorrectAnswers = submission.test.showResultsImmediately && submission.test.showCorrectAnswers;

  const questions = submission.test.questions.map(q => {
    const answer = answerMap.get(q.id);
    return {
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      points: q.points,
      correctAnswer: shouldShowCorrectAnswers ? q.correctAnswer : null,
      studentAnswer: answer?.answer || null,
      isCorrect: answer?.isCorrect || null,
      pointsAwarded: answer?.pointsAwarded || 0,
      feedback: answer?.feedback || null
    };
  });

  const percentage = submission.totalPoints ? Math.round((submission.score! / submission.totalPoints) * 100) : 0;

  return {
    test: {
      id: submission.test.id,
      title: submission.test.title,
      description: submission.test.description,
      teacher: submission.test.teacher,
      showResultsImmediately: submission.test.showResultsImmediately,
      showCorrectAnswers: submission.test.showCorrectAnswers
    },
    submission: {
      status: submission.status,
      score: submission.score,
      totalPoints: submission.totalPoints,
      percentage,
      feedback: submission.feedback,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
      attemptNumber: submission.attemptNumber
    },
    questions,
    retakeInfo: {
      canRetake,
      attemptsUsed: attemptCount,
      maxAttempts: maxAttempts === Infinity ? 0 : maxAttempts
    }
  };
};
