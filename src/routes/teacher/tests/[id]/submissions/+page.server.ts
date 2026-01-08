import { error, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { shuttleAI } from '$lib/server/shuttleai';
import { canMakeRequest, recordRequest, getRateLimitStatus } from '$lib/server/rateLimiter';
import * as powerSchool from '$lib/server/powerschool';
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
      },
      powerSchoolRelease: true
    },
    orderBy: { submittedAt: 'desc' }
  });

  // Calculate stats
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter(s => s.status === 'GRADED');
  const pendingSubmissions = submissions.filter(s => s.status === 'PENDING' || s.status === 'SUBMITTED');
  const inProgressSubmissions = submissions.filter(s => s.status === 'IN_PROGRESS');
  const releasedToPowerSchool = submissions.filter(s => s.powerSchoolRelease?.success).length;

  // Calculate average including bonus points but capped at 100%
  const averageScore = gradedSubmissions.length > 0
    ? Math.round(
        gradedSubmissions.reduce((sum, s) => {
          const bonus = (s as any).bonusPoints || 0;
          const finalScore = Math.min((s.totalPoints || 0), (s.score || 0) + bonus);
          return sum + (finalScore / (s.totalPoints || 1)) * 100;
        }, 0) / gradedSubmissions.length
      )
    : null;

  // Get PowerSchool connection status and class mappings
  const psConnected = await powerSchool.isConnected(locals.user!.id);
  let psCategories: any[] = [];
  let linkedClasses: any[] = [];

  if (psConnected) {
    // Get classes that have this test assigned and are linked to PowerSchool
    const testClasses = await prisma.classTest.findMany({
      where: { testId: params.id },
      include: {
        class: {
          include: {
            powerSchoolMapping: true
          }
        }
      }
    });

    linkedClasses = testClasses
      .filter(tc => tc.class.powerSchoolMapping)
      .map(tc => ({
        id: tc.class.id,
        name: tc.class.name,
        psSection: tc.class.powerSchoolMapping!.sectionName,
        psSectionId: tc.class.powerSchoolMapping!.sectionId,
        psCategory: tc.class.powerSchoolMapping!.defaultCategoryName,
        psCategoryId: tc.class.powerSchoolMapping!.defaultCategoryId
      }));

    // Get categories
    try {
      psCategories = await powerSchool.getCategories(locals.user!.id);
    } catch (e) {
      console.warn('Failed to fetch PowerSchool categories:', e);
    }
  }

  return {
    test,
    submissions,
    stats: {
      total: totalSubmissions,
      graded: gradedSubmissions.length,
      pending: pendingSubmissions.length,
      inProgress: inProgressSubmissions.length,
      averageScore,
      releasedToPowerSchool
    },
    filters: { status, search },
    powerSchool: {
      configured: powerSchool.getConfig().isConfigured,
      connected: psConnected,
      linkedClasses,
      categories: psCategories
    }
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

    if (submission.test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
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
    } catch (err) {
      console.error('AI grading error:', err);
      
      // Update job as failed
      await prisma.aIJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: err instanceof Error ? err.message : 'AI grading failed',
          completedAt: new Date()
        }
      });
      
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
    let rateLimitedCount = 0;

    for (const submission of submissions) {
      // Check rate limit before each submission
      if (!canMakeRequest()) {
        const status = getRateLimitStatus();
        // If we hit rate limit, wait for next slot or skip remaining
        if (status.nextSlotAvailableIn !== null && status.nextSlotAvailableIn < 10000) {
          // Wait if less than 10 seconds
          await new Promise(resolve => setTimeout(resolve, status.nextSlotAvailableIn! + 100));
        } else {
          // Skip remaining submissions if wait is too long
          rateLimitedCount = submissions.length - successCount - errorCount;
          break;
        }
      }

      // Record this request (one per submission)
      recordRequest();

      try {
        // Grade this submission - each call logs usage to AIUsageLog
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

    // Build response message
    let message = `Successfully graded ${successCount} submission${successCount !== 1 ? 's' : ''} with AI`;
    if (errorCount > 0) {
      message = `Graded ${successCount} submissions. ${errorCount} failed.`;
    }
    if (rateLimitedCount > 0) {
      message += ` ${rateLimitedCount} remaining due to rate limit - please try again in a minute.`;
    }

    return { 
      aiSuccess: true, 
      message,
      successCount,
      errorCount,
      rateLimitedCount
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
        score: (s.score || 0) + (s.bonusPoints || 0),
        totalPoints: s.totalPoints || 0,
        percentage: s.totalPoints ? Math.round(Math.min(100, ((s.score || 0) + (s.bonusPoints || 0)) / s.totalPoints * 100)) : 0
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
  },

  addBonusPoints: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bonusAmount = parseFloat(formData.get('bonusAmount')?.toString() || '0');
    const target = formData.get('target')?.toString() || 'selected'; // 'all', 'selected', or 'single'
    const submissionId = formData.get('submissionId')?.toString();
    const submissionIds = formData.getAll('submissionIds').map(id => id.toString());

    if (isNaN(bonusAmount)) {
      return fail(400, { error: 'Invalid bonus amount' });
    }

    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    let affectedCount = 0;

    if (target === 'single' && submissionId) {
      // Single submission bonus
      const submission = await prisma.testSubmission.findUnique({
        where: { id: submissionId }
      });

      if (!submission || submission.testId !== params.id) {
        return fail(404, { error: 'Submission not found' });
      }

      // Calculate new bonus (capped so total doesn't exceed totalPoints)
      const currentBonus = (submission as any).bonusPoints || 0;
      const newBonus = Math.max(0, currentBonus + bonusAmount);
      
      await prisma.testSubmission.update({
        where: { id: submissionId },
        data: { bonusPoints: newBonus }
      });

      affectedCount = 1;
    } else if (target === 'selected' && submissionIds.length > 0) {
      // Selected submissions bonus
      for (const id of submissionIds) {
        const submission = await prisma.testSubmission.findUnique({
          where: { id }
        });

        if (submission && submission.testId === params.id) {
          const currentBonus = (submission as any).bonusPoints || 0;
          const newBonus = Math.max(0, currentBonus + bonusAmount);
          
          await prisma.testSubmission.update({
            where: { id },
            data: { bonusPoints: newBonus }
          });
          affectedCount++;
        }
      }
    } else if (target === 'all') {
      // All graded submissions bonus
      const submissions = await prisma.testSubmission.findMany({
        where: {
          testId: params.id,
          status: 'GRADED'
        }
      });

      for (const submission of submissions) {
        const currentBonus = (submission as any).bonusPoints || 0;
        const newBonus = Math.max(0, currentBonus + bonusAmount);
        
        await prisma.testSubmission.update({
          where: { id: submission.id },
          data: { bonusPoints: newBonus }
        });
        affectedCount++;
      }
    }

    const action = bonusAmount >= 0 ? 'Added' : 'Removed';
    const points = Math.abs(bonusAmount);
    
    return { 
      bonusSuccess: true, 
      message: `${action} ${points} bonus point${points !== 1 ? 's' : ''} ${bonusAmount >= 0 ? 'to' : 'from'} ${affectedCount} submission${affectedCount !== 1 ? 's' : ''}` 
    };
  },

  releaseToPowerSchool: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const classId = formData.get('classId')?.toString();
    const assignmentName = formData.get('assignmentName')?.toString();
    const categoryId = formData.get('categoryId')?.toString();
    const dueDate = formData.get('dueDate')?.toString();
    const submissionIds = formData.getAll('submissionIds').map(id => id.toString());
    const forceRerelease = formData.get('forceRerelease') === 'true';
    const markMissing = formData.get('markMissing') === 'true';

    if (!classId) {
      return fail(400, { error: 'Class selection required' });
    }

    if (!categoryId) {
      return fail(400, { error: 'Category selection required' });
    }

    // Verify teacher owns the test
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    // Get org membership for tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user!.id }
    });

    // Create a background job for PowerSchool sync
    const job = await prisma.aIJob.create({
      data: {
        type: 'POWERSCHOOL_SYNC',
        status: 'RUNNING',
        progress: 10,
        userId: locals.user!.id,
        orgId: membership?.organizationId || null,
        input: {
          testId: params.id,
          testTitle: test.title,
          classId,
          assignmentName: assignmentName || test.title,
          categoryId: categoryId ? parseInt(categoryId) : undefined,
          dueDate: dueDate || undefined,
          submissionIds: submissionIds.length > 0 ? submissionIds : undefined,
          forceRerelease,
          markMissing
        },
        startedAt: new Date()
      }
    });

    // Run the PowerSchool sync in the background (fire and forget)
    (async () => {
      try {
        const result = await powerSchool.releaseGradesToPowerSchool(
          locals.user!.id,
          params.id,
          classId,
          {
            assignmentName: assignmentName || test.title,
            categoryId: categoryId ? parseInt(categoryId) : undefined,
            dueDate: dueDate || undefined,
            submissionIds: submissionIds.length > 0 ? submissionIds : undefined,
            forceRerelease,
            markMissing
          }
        );

        // Build result message
        let message = `${forceRerelease ? 'Updated' : 'Released'} ${result.released} grade${result.released !== 1 ? 's' : ''} to PowerSchool`;
        if (result.markedMissing && result.markedMissing > 0) {
          message += ` and marked ${result.markedMissing} student${result.markedMissing !== 1 ? 's' : ''} as missing`;
        }

        if (result.success && result.released > 0) {
          // Success - update job as completed
          await prisma.aIJob.update({
            where: { id: job.id },
            data: {
              status: 'COMPLETED',
              progress: 100,
              completedAt: new Date(),
              output: {
                released: result.released,
                failed: result.failed,
                markedMissing: result.markedMissing,
                message
              },
              entityId: params.id,
              entityType: 'TEST'
            }
          });

          // Create success notification
          await prisma.notification.create({
            data: {
              type: 'JOB_COMPLETE',
              title: 'Grades Synced to PowerSchool',
              message,
              userId: locals.user!.id,
              jobId: job.id,
              link: `/teacher/tests/${params.id}/submissions`
            }
          });
        } else if (result.released > 0) {
          // Partial success
          await prisma.aIJob.update({
            where: { id: job.id },
            data: {
              status: 'COMPLETED',
              progress: 100,
              completedAt: new Date(),
              output: {
                released: result.released,
                failed: result.failed,
                errors: result.errors,
                message: `Partially synced: ${result.released} of ${result.totalAttempted} grades`
              },
              entityId: params.id,
              entityType: 'TEST'
            }
          });

          await prisma.notification.create({
            data: {
              type: 'JOB_COMPLETE',
              title: 'Grades Partially Synced',
              message: `${result.released} of ${result.totalAttempted} grades synced. Some students may need mapping.`,
              userId: locals.user!.id,
              jobId: job.id,
              link: `/teacher/tests/${params.id}/submissions`
            }
          });
        } else {
          // Failed - no grades released
          await prisma.aIJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              progress: 100,
              completedAt: new Date(),
              error: result.errors.length > 0 
                ? result.errors[0] 
                : 'No grades could be released. Students may not match the PowerSchool class.',
              output: {
                errors: result.errors,
                unmatchedStudents: result.unmatchedStudents
              }
            }
          });

          await prisma.notification.create({
            data: {
              type: 'JOB_FAILED',
              title: 'PowerSchool Sync Failed',
              message: result.errors[0] || 'Students may need to be mapped to PowerSchool.',
              userId: locals.user!.id,
              jobId: job.id,
              link: `/teacher/tests/${params.id}/submissions`
            }
          });
        }
      } catch (err) {
        console.error('PowerSchool sync job error:', err);
        await prisma.aIJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            progress: 100,
            completedAt: new Date(),
            error: err instanceof Error ? err.message : 'Failed to sync grades'
          }
        });

        await prisma.notification.create({
          data: {
            type: 'JOB_FAILED',
            title: 'PowerSchool Sync Failed',
            message: err instanceof Error ? err.message : 'An error occurred',
            userId: locals.user!.id,
            jobId: job.id,
            link: `/teacher/tests/${params.id}/submissions`
          }
        });
      }
    })();

    // Return immediately - user doesn't need to wait
    return {
      psJobStarted: true,
      jobId: job.id,
      message: "We're syncing your grades to PowerSchool! Check back later or view Compute Jobs for progress."
    };
  },

  saveStudentMappings: async ({ request, locals }) => {
    const formData = await request.formData();
    const classId = formData.get('classId')?.toString();
    const mappingsJson = formData.get('mappings')?.toString();

    if (!classId || !mappingsJson) {
      return fail(400, { error: 'Class ID and mappings required' });
    }

    try {
      const mappings = JSON.parse(mappingsJson) as Array<{
        studentId: string;
        psStudentId: number;
        psStudentName?: string;
      }>;

      const result = await powerSchool.saveStudentMappings(
        locals.user!.id,
        classId,
        mappings
      );

      return {
        mappingSaved: true,
        message: `Saved ${result.saved} student mapping${result.saved !== 1 ? 's' : ''}. You can now retry releasing grades.`
      };
    } catch (err) {
      console.error('Save mappings error:', err);
      return fail(500, {
        error: err instanceof Error ? err.message : 'Failed to save mappings'
      });
    }
  }
};
