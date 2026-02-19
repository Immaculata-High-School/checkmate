import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { fetchAvailableModels } from '$lib/server/shuttleai';
import { stopQueueProcessor, startQueueProcessor } from '$lib/server/rateLimiter';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const [config, models, organizations, aiJobStats] = await Promise.all([
    prisma.systemConfig.findUnique({
      where: { id: 'singleton' }
    }),
    fetchAvailableModels(),
    prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    prisma.aIJob.groupBy({
      by: ['status'],
      _count: true
    })
  ]);

  // If orgId is provided, load classes for that org
  const selectedOrgId = url.searchParams.get('orgId');
  const selectedClassId = url.searchParams.get('classId');

  let classes: { id: string; name: string }[] = [];
  let tests: { id: string; title: string }[] = [];

  if (selectedOrgId) {
    classes = await prisma.class.findMany({
      where: { organizationId: selectedOrgId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
  }

  if (selectedClassId) {
    const classTests = await prisma.classTest.findMany({
      where: { classId: selectedClassId },
      select: {
        test: {
          select: { id: true, title: true }
        }
      }
    });
    tests = classTests.map(ct => ct.test);
  }

  const jobCounts = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0
  };
  for (const stat of aiJobStats) {
    const key = stat.status.toLowerCase() as keyof typeof jobCounts;
    if (key in jobCounts) jobCounts[key] = stat._count;
  }

  // Also count grading queue items
  const gradingQueueCounts = await prisma.gradingQueue.groupBy({
    by: ['status'],
    _count: true
  });
  const queueCounts = { queued: 0, processing: 0 };
  for (const stat of gradingQueueCounts) {
    if (stat.status === 'QUEUED') queueCounts.queued = stat._count;
    if (stat.status === 'PROCESSING') queueCounts.processing = stat._count;
  }

  return {
    config: config || {
      aiModel: 'gpt-4o',
      features: {
        aiTestGeneration: true,
        aiGrading: true,
        aiStudyGuides: true,
        aiWorksheets: true
      }
    },
    availableModels: models,
    organizations,
    classes,
    tests,
    selectedOrgId,
    selectedClassId,
    jobCounts,
    queueCounts
  };
};

export const actions: Actions = {
  updateAI: async ({ request }) => {
    const formData = await request.formData();
    const aiModel = formData.get('aiModel')?.toString();

    if (!aiModel) {
      return fail(400, { error: 'AI model is required' });
    }

    await prisma.systemConfig.upsert({
      where: { id: 'singleton' },
      update: { aiModel },
      create: {
        id: 'singleton',
        aiModel
      }
    });

    return { success: true, message: 'AI settings updated successfully' };
  },

  updateFeatures: async ({ request }) => {
    const formData = await request.formData();
    const features = {
      aiTestGeneration: formData.get('aiTestGeneration') === 'on',
      aiGrading: formData.get('aiGrading') === 'on',
      aiStudyGuides: formData.get('aiStudyGuides') === 'on',
      aiWorksheets: formData.get('aiWorksheets') === 'on'
    };

    await prisma.systemConfig.upsert({
      where: { id: 'singleton' },
      update: { features },
      create: {
        id: 'singleton',
        aiModel: 'anthropic/claude-opus-4-1-20250805',
        features
      }
    });

    return { featureSuccess: true, message: 'Feature settings updated successfully' };
  },

  stopAllAIJobs: async () => {
    // Stop the queue processor
    stopQueueProcessor();

    // Cancel all pending/running AI jobs
    const [cancelledJobs, cancelledQueue] = await Promise.all([
      prisma.aIJob.updateMany({
        where: { status: { in: ['PENDING', 'RUNNING'] } },
        data: { status: 'FAILED', error: 'Cancelled by admin', completedAt: new Date() }
      }),
      prisma.gradingQueue.updateMany({
        where: { status: { in: ['QUEUED', 'PROCESSING'] } },
        data: { status: 'FAILED', error: 'Cancelled by admin', completedAt: new Date() }
      })
    ]);

    // Restart the queue processor
    startQueueProcessor();

    return {
      success: true,
      message: `Stopped all AI jobs. Cancelled ${cancelledJobs.count} AI jobs and ${cancelledQueue.count} grading queue items.`
    };
  },

  clearGrades: async ({ request }) => {
    const formData = await request.formData();
    const testId = formData.get('testId')?.toString();

    if (!testId) {
      return fail(400, { error: 'Test ID is required' });
    }

    // Verify the test exists
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { id: true, title: true }
    });

    if (!test) {
      return fail(404, { error: 'Test not found' });
    }

    // Reset grades on answers (clear scores/feedback but keep the answers)
    const updatedAnswers = await prisma.answer.updateMany({
      where: { submission: { testId } },
      data: {
        isCorrect: null,
        pointsAwarded: null,
        feedback: null
      }
    });

    // Reset submission scores but keep the submissions intact
    const updatedSubmissions = await prisma.testSubmission.updateMany({
      where: { testId, status: { in: ['GRADED', 'SUBMITTED'] } },
      data: {
        score: null,
        totalPoints: null,
        percentage: null,
        feedback: null,
        gradedAt: null,
        status: 'SUBMITTED'
      }
    });

    // Clean up any grading queue items for this test
    await prisma.gradingQueue.deleteMany({
      where: { testId }
    });

    return {
      success: true,
      message: `Reset grades for ${updatedSubmissions.count} submissions (${updatedAnswers.count} answers cleared) on test "${test.title}". Submissions were preserved.`
    };
  }
};
