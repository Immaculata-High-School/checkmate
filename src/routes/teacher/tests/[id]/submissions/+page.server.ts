import { error, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { shuttleAI } from '$lib/server/shuttleai';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';

  const test = await prisma.test.findUnique({
    where: { id: params.id },
    include: {
      questions: true
    }
  });

  if (!test) {
    throw error(404, 'Test not found');
  }

  if (test.teacherId !== locals.user!.id) {
    throw error(403, 'Not authorized');
  }

  // Build where clause for submissions
  const where: any = {
    testId: params.id
  };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.student = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    };
  }

  const submissions = await prisma.testSubmission.findMany({
    where,
    include: {
      student: {
        select: { id: true, name: true, email: true }
      },
      answers: {
        include: {
          question: true
        }
      }
    },
    orderBy: { submittedAt: 'desc' }
  });

  // Calculate stats
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter(s => s.status === 'GRADED');
  const pendingSubmissions = submissions.filter(s => s.status === 'PENDING' || s.status === 'SUBMITTED');
  const inProgressSubmissions = submissions.filter(s => s.status === 'IN_PROGRESS');

  const averageScore = gradedSubmissions.length > 0
    ? Math.round(
        gradedSubmissions.reduce((sum, s) => sum + ((s.score || 0) / (s.totalPoints || 1)) * 100, 0) / gradedSubmissions.length
      )
    : null;

  return {
    test,
    submissions,
    stats: {
      total: totalSubmissions,
      graded: gradedSubmissions.length,
      pending: pendingSubmissions.length,
      inProgress: inProgressSubmissions.length,
      averageScore
    },
    filters: { status, search }
  };
};

export const actions: Actions = {
  grade: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const submissionId = formData.get('submissionId')?.toString();
    const feedback = formData.get('feedback')?.toString() || null;

    if (!submissionId) {
      return fail(400, { error: 'Submission ID required' });
    }

    const submission = await prisma.testSubmission.findUnique({
      where: { id: submissionId },
      include: {
        test: true,
        answers: {
          include: { question: true }
        }
      }
    });

    if (!submission) {
      return fail(404, { error: 'Submission not found' });
    }

    if (submission.test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
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
        answers: {
          include: { question: true }
        }
      }
    });

    if (!submission) {
      return fail(404, { error: 'Submission not found' });
    }

    if (submission.test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    // Get org membership for AI tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user!.id }
    });

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

      return { aiSuccess: true, message: 'AI grading completed successfully' };
    } catch (err) {
      console.error('AI grading error:', err);
      return fail(500, { error: 'AI grading failed. Please try manual grading.' });
    }
  },

  aiGradeAll: async ({ params, locals }) => {
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    // Get all pending submissions
    const submissions = await prisma.testSubmission.findMany({
      where: {
        testId: params.id,
        status: { in: ['SUBMITTED', 'PENDING'] }
      },
      include: {
        answers: {
          include: { question: true }
        }
      }
    });

    if (submissions.length === 0) {
      return fail(400, { error: 'No submissions pending grading' });
    }

    // Get org membership for AI tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user!.id }
    });

    let successCount = 0;
    let errorCount = 0;

    for (const submission of submissions) {
      try {
        const result = await shuttleAI.gradeTestComprehensive({
          testTitle: test.title,
          answers: submission.answers.map(a => ({
            id: a.id,
            question: a.question.question,
            correctAnswer: a.question.correctAnswer || '',
            studentAnswer: a.answer || '',
            questionType: a.question.type,
            points: a.question.points
          })),
          allowPartialCredit: (test as any).aiPartialCredit ?? true,
          gradingHarshness: (test as any).aiGradingHarshness ?? 50
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
          where: { id: submission.id },
          data: {
            status: 'GRADED',
            score: result.totalScore,
            totalPoints: result.totalPoints,
            feedback: result.overallFeedback,
            gradedAt: new Date()
          }
        });

        successCount++;
      } catch (err) {
        console.error(`Failed to grade submission ${submission.id}:`, err);
        errorCount++;
      }
    }

    if (errorCount > 0) {
      return { 
        aiSuccess: true, 
        message: `Graded ${successCount} submissions. ${errorCount} failed.` 
      };
    }

    return { 
      aiSuccess: true, 
      message: `Successfully graded ${successCount} submissions with AI` 
    };
  },

  generateClassFeedback: async ({ params, locals }) => {
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    const submissions = await prisma.testSubmission.findMany({
      where: {
        testId: params.id,
        status: 'GRADED'
      },
      include: {
        student: { select: { name: true } },
        answers: {
          include: { question: true }
        }
      }
    });

    if (submissions.length === 0) {
      return fail(400, { error: 'No graded submissions to analyze' });
    }

    // Get org membership for AI tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user!.id }
    });

    try {
      // Analyze class performance
      const scores = submissions.map(s => ({
        score: s.score || 0,
        totalPoints: s.totalPoints || 0,
        percentage: s.totalPoints ? Math.round((s.score || 0) / s.totalPoints * 100) : 0
      }));

      const avgScore = Math.round(scores.reduce((sum, s) => sum + s.percentage, 0) / scores.length);

      // Find common mistakes by question
      const questionAnalysis: Record<string, { total: number; correct: number; question: string }> = {};
      for (const submission of submissions) {
        for (const answer of submission.answers) {
          if (!questionAnalysis[answer.questionId]) {
            questionAnalysis[answer.questionId] = {
              total: 0,
              correct: 0,
              question: answer.question.question
            };
          }
          questionAnalysis[answer.questionId].total++;
          if (answer.isCorrect) {
            questionAnalysis[answer.questionId].correct++;
          }
        }
      }

      // Find questions with lowest success rates
      const troubleQuestions = Object.entries(questionAnalysis)
        .map(([id, data]) => ({
          id,
          question: data.question,
          successRate: Math.round((data.correct / data.total) * 100)
        }))
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, 5);

      return {
        feedbackSuccess: true,
        classFeedback: {
          totalSubmissions: submissions.length,
          averageScore: avgScore,
          highestScore: Math.max(...scores.map(s => s.percentage)),
          lowestScore: Math.min(...scores.map(s => s.percentage)),
          troubleQuestions,
          distribution: {
            a: scores.filter(s => s.percentage >= 90).length,
            b: scores.filter(s => s.percentage >= 80 && s.percentage < 90).length,
            c: scores.filter(s => s.percentage >= 70 && s.percentage < 80).length,
            d: scores.filter(s => s.percentage >= 60 && s.percentage < 70).length,
            f: scores.filter(s => s.percentage < 60).length
          }
        }
      };
    } catch (err) {
      console.error('Generate class feedback error:', err);
      return fail(500, { error: 'Failed to generate class feedback' });
    }
  },

  deleteSubmission: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const submissionId = formData.get('submissionId')?.toString();

    if (!submissionId) {
      return fail(400, { error: 'Submission ID required' });
    }

    const submission = await prisma.testSubmission.findUnique({
      where: { id: submissionId },
      include: { test: true }
    });

    if (!submission) {
      return fail(404, { error: 'Submission not found' });
    }

    if (submission.test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    // Delete all answers first (foreign key constraint)
    await prisma.answer.deleteMany({
      where: { submissionId: submissionId }
    });

    // Delete the submission
    await prisma.testSubmission.delete({
      where: { id: submissionId }
    });

    return { deleteSuccess: true, message: 'Submission deleted successfully' };
  },

  deleteSelected: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const submissionIds = formData.getAll('submissionIds').map(id => id.toString());

    if (submissionIds.length === 0) {
      return fail(400, { error: 'No submissions selected' });
    }

    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    // Verify all submissions belong to this test
    const submissions = await prisma.testSubmission.findMany({
      where: {
        id: { in: submissionIds },
        testId: params.id
      }
    });

    if (submissions.length !== submissionIds.length) {
      return fail(400, { error: 'Some submissions not found or unauthorized' });
    }

    // Delete all answers first
    await prisma.answer.deleteMany({
      where: { submissionId: { in: submissionIds } }
    });

    // Delete all selected submissions
    await prisma.testSubmission.deleteMany({
      where: { id: { in: submissionIds } }
    });

    return { deleteSuccess: true, message: `Deleted ${submissionIds.length} submission(s)` };
  }
};
