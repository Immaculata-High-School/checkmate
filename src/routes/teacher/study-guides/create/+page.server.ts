import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { shuttleAI } from '$lib/server/shuttleai';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  // Get available tests to generate from
  const tests = await prisma.test.findMany({
    where: { teacherId: locals.user!.id },
    include: {
      questions: { select: { id: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get available classes for assignment
  const classes = await prisma.class.findMany({
    where: { teacherId: locals.user!.id, archived: false },
    orderBy: { name: 'asc' }
  });

  // Check if coming from a test
  const fromTestId = url.searchParams.get('testId');

  return { tests, classes, fromTestId };
};

export const actions: Actions = {
  generate: async ({ request, locals }) => {
    const formData = await request.formData();
    const testId = formData.get('testId')?.toString();
    const title = formData.get('title')?.toString().trim();
    const additionalInstructions = formData.get('additionalInstructions')?.toString().trim() || '';

    if (!testId) {
      return fail(400, { error: 'Please select a test to generate from' });
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: { orderBy: { order: 'asc' } }
      }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    if (test.questions.length === 0) {
      return fail(400, { error: 'This test has no questions to generate from' });
    }

    // Get org membership for AI tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user!.id }
    });

    // Create AI job for tracking
    const job = await prisma.aIJob.create({
      data: {
        type: 'STUDY_GUIDE',
        status: 'RUNNING',
        input: { testId: test.id, testTitle: test.title, questionCount: test.questions.length },
        userId: locals.user!.id,
        orgId: membership?.organizationId,
        startedAt: new Date()
      }
    });

    try {
      const content = await shuttleAI.generateStudyGuide(
        {
          testTitle: test.title,
          testDescription: test.description || '',
          questions: test.questions.map((q) => ({
            question: q.question,
            type: q.type,
            correctAnswer: q.correctAnswer || '',
            points: q.points
          })),
          additionalInstructions
        },
        {
          userId: locals.user!.id,
          orgId: membership?.organizationId
        }
      );

      // Create the study guide
      const studyGuide = await prisma.studyGuide.create({
        data: {
          title: title || `Study Guide: ${test.title}`,
          content,
          sourceTestId: test.id,
          teacherId: locals.user!.id
        }
      });

      // Update job as completed
      await prisma.aIJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          entityId: studyGuide.id,
          entityType: 'STUDY_GUIDE',
          completedAt: new Date()
        }
      });

      throw redirect(302, `/teacher/study-guides/${studyGuide.id}`);
    } catch (err) {
      if (isRedirect(err)) throw err; // Re-throw redirect

      console.error('Study guide generation error:', err);

      await prisma.aIJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: err instanceof Error ? err.message : 'Unknown error',
          completedAt: new Date()
        }
      });

      return fail(500, { error: 'Failed to generate study guide. Please try again.' });
    }
  },

  create: async ({ request, locals }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const content = formData.get('content')?.toString().trim();

    if (!title) {
      return fail(400, { error: 'Title is required' });
    }

    if (!content) {
      return fail(400, { error: 'Content is required' });
    }

    const studyGuide = await prisma.studyGuide.create({
      data: {
        title,
        content,
        teacherId: locals.user!.id
      }
    });

    throw redirect(302, `/teacher/study-guides/${studyGuide.id}`);
  }
};
