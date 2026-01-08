import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { shuttleAI } from '$lib/server/shuttleai';
import { gradeOrQueue, queueGrading } from '$lib/server/rateLimiter';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const userId = locals.user!.id;

  // Get the test
  const test = await prisma.test.findUnique({
    where: { id: params.id },
    include: {
      questions: {
        orderBy: { order: 'asc' }
      },
      teacher: {
        select: { id: true, name: true }
      },
      classes: {
        include: {
          class: {
            include: {
              members: {
                where: { userId }
              }
            }
          }
        }
      }
    }
  });

  if (!test) {
    throw error(404, 'Test not found');
  }

  // Check if student is enrolled in any class with this test
  const isEnrolled = test.classes.some(ct => ct.class.members.length > 0);
  if (!isEnrolled) {
    throw error(403, 'You are not enrolled in a class with this test');
  }

  if (test.status !== 'PUBLISHED') {
    throw error(403, 'This test is not available');
  }

  // Get or create submission - find the latest in-progress or most recent submission
  let submission = await prisma.testSubmission.findFirst({
    where: {
      testId: params.id,
      studentId: userId
    },
    orderBy: { attemptNumber: 'desc' },
    include: {
      answers: true
    }
  });

  // Get student override if exists
  const studentOverride = await prisma.testStudentOverride.findUnique({
    where: {
      testId_studentId: {
        testId: params.id,
        studentId: userId
      }
    }
  });

  // Calculate max allowed attempts for this student
  const maxAttempts = test.maxAttempts === 0
    ? Infinity
    : test.maxAttempts + (studentOverride?.extraAttempts || 0);

  // Count previous attempts
  const attemptCount = await prisma.testSubmission.count({
    where: {
      testId: params.id,
      studentId: userId,
      status: { not: 'IN_PROGRESS' }
    }
  });

  // If already submitted and no retakes available, show results
  if (submission && submission.status !== 'IN_PROGRESS') {
    if (attemptCount >= maxAttempts) {
      throw redirect(302, `/student/assignments/${params.id}/results`);
    }
  }

  // Create new submission if needed (new attempt)
  if (!submission || submission.status !== 'IN_PROGRESS') {
    submission = await prisma.testSubmission.create({
      data: {
        testId: params.id,
        studentId: userId,
        status: 'IN_PROGRESS',
        attemptNumber: attemptCount + 1
      },
      include: {
        answers: true
      }
    });
  }

  // Build answer map
  const answerMap = new Map(submission.answers.map(a => [a.questionId, a.answer]));

  // Prepare questions (hide correct answers)
  const questions = test.questions.map(q => ({
    id: q.id,
    type: q.type,
    question: q.question,
    options: q.options,
    points: q.points,
    order: q.order,
    currentAnswer: answerMap.get(q.id) || null
  }));

  // Scramble if enabled
  if (test.scrambleQuestions) {
    questions.sort(() => Math.random() - 0.5);
  }

  // Calculate effective time limit (including student override)
  const effectiveTimeLimit = test.timeLimit
    ? test.timeLimit + (studentOverride?.extraTimeMinutes || 0)
    : null;

  return {
    test: {
      id: test.id,
      title: test.title,
      description: test.description,
      timeLimit: effectiveTimeLimit,
      showResultsImmediately: test.showResultsImmediately,
      // Security settings
      requireFullscreen: test.requireFullscreen,
      detectTabSwitch: test.detectTabSwitch,
      detectMouseLeave: test.detectMouseLeave,
      blockCopyPaste: test.blockCopyPaste,
      blockRightClick: test.blockRightClick,
      blockKeyboardShortcuts: test.blockKeyboardShortcuts,
      maxTabSwitches: test.maxTabSwitches,
      maxMouseLeaves: test.maxMouseLeaves,
      autoSubmitOnViolation: test.autoSubmitOnViolation,
      showViolationWarnings: test.showViolationWarnings,
      recordViolations: test.recordViolations,
      browserLockdown: test.browserLockdown
    },
    questions,
    submission: {
      id: submission.id,
      startedAt: submission.startedAt,
      status: submission.status,
      attemptNumber: submission.attemptNumber,
      tabSwitchCount: submission.tabSwitchCount,
      mouseLeaveCount: submission.mouseLeaveCount
    },
    totalPoints: test.questions.reduce((sum, q) => sum + q.points, 0),
    attemptInfo: {
      current: submission.attemptNumber,
      max: maxAttempts === Infinity ? 0 : maxAttempts
    }
  };
};

export const actions: Actions = {
  saveAnswer: async ({ params, request, locals }) => {
    const formData = await request.formData();
    const questionId = formData.get('questionId')?.toString();
    const answer = formData.get('answer')?.toString() || '';

    if (!questionId) {
      return fail(400, { error: 'Question ID required' });
    }

    const submission = await prisma.testSubmission.findFirst({
      where: {
        testId: params.id,
        studentId: locals.user!.id,
        status: 'IN_PROGRESS'
      }
    });

    if (!submission) {
      return fail(400, { error: 'No active submission' });
    }

    // Upsert the answer
    await prisma.answer.upsert({
      where: {
        submissionId_questionId: {
          submissionId: submission.id,
          questionId
        }
      },
      create: {
        submissionId: submission.id,
        questionId,
        answer
      },
      update: {
        answer
      }
    });

    return { success: true };
  },

  recordViolation: async ({ params, request, locals }) => {
    const formData = await request.formData();
    const violationType = formData.get('type')?.toString() as string;

    const submission = await prisma.testSubmission.findFirst({
      where: {
        testId: params.id,
        studentId: locals.user!.id,
        status: 'IN_PROGRESS'
      }
    });

    if (!submission) {
      return fail(400, { error: 'No active submission' });
    }

    // Update violation counts
    const updateData: Record<string, number> = {};

    switch (violationType) {
      case 'tabSwitch':
        updateData.tabSwitchCount = submission.tabSwitchCount + 1;
        break;
      case 'mouseLeave':
        updateData.mouseLeaveCount = submission.mouseLeaveCount + 1;
        break;
      case 'copyPaste':
        updateData.copyPasteAttempts = submission.copyPasteAttempts + 1;
        break;
      case 'rightClick':
        updateData.rightClickAttempts = submission.rightClickAttempts + 1;
        break;
      case 'fullscreenExit':
        updateData.fullscreenExits = submission.fullscreenExits + 1;
        break;
    }

    // Add to violation log
    const existingViolations = (submission.violations as any[]) || [];
    const newViolations = [
      ...existingViolations,
      {
        type: violationType,
        timestamp: new Date().toISOString()
      }
    ];

    await prisma.testSubmission.update({
      where: { id: submission.id },
      data: {
        ...updateData,
        violations: newViolations
      }
    });

    return {
      success: true,
      counts: {
        tabSwitchCount: updateData.tabSwitchCount ?? submission.tabSwitchCount,
        mouseLeaveCount: updateData.mouseLeaveCount ?? submission.mouseLeaveCount
      }
    };
  },

  submit: async ({ params, locals }) => {
    const submission = await prisma.testSubmission.findFirst({
      where: {
        testId: params.id,
        studentId: locals.user!.id,
        status: 'IN_PROGRESS'
      },
      include: {
        answers: {
          include: {
            question: true
          }
        },
        test: {
          include: {
            questions: true,
            teacher: true
          }
        }
      }
    });

    if (!submission || submission.status !== 'IN_PROGRESS') {
      return fail(400, { error: 'No active submission' });
    }

    // Collect all answers for potential AI grading
    let totalPoints = 0;
    let needsManualGrading = false;
    const allAnswers: {
      id: string;
      question: string;
      correctAnswer: string;
      studentAnswer: string;
      questionType: string;
      points: number;
    }[] = [];

    for (const question of submission.test.questions) {
      totalPoints += question.points;
      const answer = submission.answers.find(a => a.questionId === question.id);

      if (!answer) continue;

      // Collect for AI grading
      allAnswers.push({
        id: answer.id,
        question: question.question,
        correctAnswer: question.correctAnswer || '',
        studentAnswer: answer.answer || '',
        questionType: question.type,
        points: question.points
      });

      // Mark if manual grading would be needed (for fallback)
      if (!['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_BLANK', 'SHORT_ANSWER'].includes(question.type)) {
        needsManualGrading = true;
      }
    }

    // If AI grading is enabled, use AI for all questions to get comprehensive feedback
    if (submission.test.aiOpenEndedGrading && allAnswers.length > 0) {
      try {
        // Get teacher's org membership for AI tracking
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: submission.test.teacherId }
        });

        // Create AI job for tracking
        const job = await prisma.aIJob.create({
          data: {
            type: 'TEST_GRADING',
            status: 'RUNNING',
            input: {
              testTitle: submission.test.title,
              submissionId: submission.id,
              studentId: locals.user!.id,
              questionCount: allAnswers.length
            },
            entityId: submission.test.id,
            entityType: 'TEST',
            userId: submission.test.teacherId,
            orgId: membership?.organizationId,
            startedAt: new Date()
          }
        });

        // Use the rate-limited queue system for grading
        const gradeResult = await gradeOrQueue({
          submissionId: submission.id,
          testId: submission.test.id,
          testTitle: submission.test.title,
          studentId: locals.user!.id,
          answers: allAnswers.map(a => ({
            id: a.id,
            question: a.question,
            correctAnswer: a.correctAnswer,
            studentAnswer: a.studentAnswer,
            questionType: a.questionType,
            points: a.points
          })),
          allowPartialCredit: (submission.test as any).aiPartialCredit ?? true,
          gradingHarshness: (submission.test as any).aiGradingHarshness ?? 50,
          context: { userId: submission.test.teacherId, orgId: membership?.organizationId }
        });

        if (gradeResult.immediate) {
          // Grading was done immediately
          const result = gradeResult.result;

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

          // Update submission with AI grades
          await prisma.testSubmission.update({
            where: { id: submission.id },
            data: {
              status: 'GRADED',
              score: result.totalScore,
              totalPoints: result.totalPoints,
              feedback: result.overallFeedback,
              submittedAt: new Date(),
              gradedAt: new Date()
            }
          });

          // Redirect with grading flag for student modal
          throw redirect(302, `/student/assignments/${params.id}/results?aiGraded=true`);
        } else {
          // Grading was queued - update job and submission status
          await prisma.aIJob.update({
            where: { id: job.id },
            data: {
              status: 'PENDING',
              progress: 0,
              output: {
                queued: true,
                position: gradeResult.position,
                estimatedWaitSeconds: gradeResult.estimatedWaitSeconds
              }
            }
          });

          // Mark submission as pending (queued for AI grading)
          await prisma.testSubmission.update({
            where: { id: submission.id },
            data: {
              status: 'PENDING',
              submittedAt: new Date()
            }
          });

          // Redirect to results page with queued status
          throw redirect(302, `/student/assignments/${params.id}/results?queued=true&position=${gradeResult.position}`);
        }
      } catch (err) {
        // If AI grading fails, fall back to manual grading
        if (err instanceof Response) throw err; // Re-throw redirects
        console.error('AI grading failed during submission:', err);
        
        // Try to update job as failed if it exists
        try {
          const failedJob = await prisma.aIJob.findFirst({
            where: {
              entityId: submission.test.id,
              entityType: 'TEST',
              type: 'TEST_GRADING',
              status: 'RUNNING'
            },
            orderBy: { createdAt: 'desc' }
          });
          if (failedJob) {
            await prisma.aIJob.update({
              where: { id: failedJob.id },
              data: {
                status: 'FAILED',
                error: err instanceof Error ? err.message : 'AI grading failed',
                completedAt: new Date()
              }
            });
          }
        } catch {}
      }
    }

    // Fallback: manually grade objective questions when AI is not enabled or failed
    let fallbackScore = 0;
    for (const question of submission.test.questions) {
      const answer = submission.answers.find(a => a.questionId === question.id);
      if (!answer) continue;

      // Check if already graded by AI
      const existingAnswer = await prisma.answer.findUnique({ where: { id: answer.id } });
      if (existingAnswer?.feedback) {
        // Already graded by AI, add to score
        fallbackScore += existingAnswer.pointsAwarded || 0;
        continue;
      }

      // Auto-grade objective questions
      if (['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(question.type)) {
        const isCorrect = answer.answer?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            isCorrect,
            pointsAwarded: isCorrect ? question.points : 0
          }
        });
        if (isCorrect) fallbackScore += question.points;
      } else if (question.type === 'FILL_IN_BLANK' || question.type === 'SHORT_ANSWER') {
        const correctAnswers = question.correctAnswer?.split('|').map(a => a.toLowerCase().trim()) || [];
        const isCorrect = correctAnswers.includes(answer.answer?.toLowerCase().trim() || '');
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            isCorrect,
            pointsAwarded: isCorrect ? question.points : 0
          }
        });
        if (isCorrect) fallbackScore += question.points;
      }
      // Essay/Long answer will be left ungraded for manual review
    }

    // Update submission (fallback or no AI grading)
    await prisma.testSubmission.update({
      where: { id: submission.id },
      data: {
        status: needsManualGrading ? 'PENDING' : 'GRADED',
        score: fallbackScore,
        totalPoints,
        submittedAt: new Date(),
        gradedAt: needsManualGrading ? null : new Date()
      }
    });

    throw redirect(302, `/student/assignments/${params.id}/results`);
  }
};
