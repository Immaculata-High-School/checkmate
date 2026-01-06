import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { shuttleAI } from '$lib/server/shuttleai';
import { generateCode } from '$lib/utils';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  // Get teacher's classes for assignment
  const classes = await prisma.class.findMany({
    where: { teacherId: locals.user!.id, archived: false },
    orderBy: { name: 'asc' }
  });

  // Check if we're continuing from a previous job
  const jobId = url.searchParams.get('jobId');
  let savedJob = null;

  if (jobId) {
    const job = await prisma.aIJob.findUnique({
      where: { id: jobId }
    });

    if (job && job.userId === locals.user!.id && job.status === 'COMPLETED' && job.type === 'TEST_GENERATION') {
      savedJob = {
        id: job.id,
        output: job.output as any
      };
    }
  }

  return { classes, savedJob };
};

export const actions: Actions = {
  generate: async ({ request, locals }) => {
    const formData = await request.formData();
    const topic = formData.get('topic')?.toString().trim();
    const numberOfQuestions = parseInt(formData.get('numberOfQuestions')?.toString() || '10');
    const difficulty = formData.get('difficulty')?.toString() as 'easy' | 'medium' | 'hard';
    const questionTypes = formData.getAll('questionTypes').map((t) => t.toString());
    const additionalInstructions = formData.get('additionalInstructions')?.toString();

    if (!topic) {
      return fail(400, { error: 'Topic is required' });
    }

    if (questionTypes.length === 0) {
      return fail(400, { error: 'Select at least one question type' });
    }

    // Get org membership for AI tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user!.id }
    });

    // Create AI job for tracking
    const job = await prisma.aIJob.create({
      data: {
        type: 'TEST_GENERATION',
        status: 'RUNNING',
        input: { topic, numberOfQuestions, difficulty, questionTypes, additionalInstructions },
        userId: locals.user!.id,
        orgId: membership?.organizationId,
        startedAt: new Date()
      }
    });

    try {
      const questions = await shuttleAI.generateTestQuestions(
        {
          topic,
          numberOfQuestions,
          questionTypes,
          difficulty: difficulty || 'medium',
          additionalInstructions
        },
        { userId: locals.user!.id, orgId: membership?.organizationId }
      );

      // Update job as completed with full data for later retrieval
      await prisma.aIJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          output: {
            questions,
            topic,
            numberOfQuestions,
            difficulty,
            questionTypes
          },
          completedAt: new Date()
        }
      });

      // Create notification so user can continue later
      await prisma.notification.create({
        data: {
          type: 'JOB_COMPLETE',
          title: 'Test Questions Generated',
          message: `${questions.length} questions about "${topic}" are ready to review.`,
          link: `/teacher/tests/create?jobId=${job.id}`,
          userId: locals.user!.id,
          jobId: job.id
        }
      });

      return {
        success: true,
        questions,
        topic,
        numberOfQuestions,
        difficulty,
        questionTypes,
        jobId: job.id
      };
    } catch (error) {
      console.error('AI generation error:', error);

      // Update job as failed
      await prisma.aIJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });

      return fail(500, { error: 'Failed to generate questions. Please try again.' });
    }
  },

  save: async ({ request, locals }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const questionsJson = formData.get('questions')?.toString();
    const autoGrade = formData.get('autoGrade') === 'true';
    const status = formData.get('status')?.toString() || 'DRAFT';
    const classId = formData.get('classId')?.toString();
    const jobId = formData.get('jobId')?.toString();

    if (!title || !questionsJson) {
      return fail(400, { error: 'Title and questions are required' });
    }

    if (!classId) {
      return fail(400, { error: 'Please select a class to assign this test to' });
    }

    let questions;
    try {
      questions = JSON.parse(questionsJson);
    } catch {
      return fail(400, { error: 'Invalid questions data' });
    }

    // Create test and assign to class
    const test = await prisma.test.create({
      data: {
        title,
        description,
        accessCode: generateCode(6),
        teacherId: locals.user!.id,
        status: status as 'DRAFT' | 'PUBLISHED',
        autoGrade,
        questions: {
          create: questions.map((q: any, i: number) => ({
            type: q.type,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points || 1,
            order: i,
            aiGenerated: true
          }))
        },
        classes: {
          create: {
            classId
          }
        }
      }
    });

    // Update AI job with entity info and create notification
    if (jobId) {
      await prisma.aIJob.update({
        where: { id: jobId },
        data: {
          entityId: test.id,
          entityType: 'TEST'
        }
      });

      await prisma.notification.create({
        data: {
          type: 'JOB_COMPLETE',
          title: 'Test Created',
          message: `Your test "${title}" has been created with ${questions.length} questions.`,
          link: `/teacher/tests/${test.id}`,
          userId: locals.user!.id,
          jobId
        }
      });
    }

    throw redirect(302, `/teacher/tests/${test.id}?created=true`);
  },

  saveManual: async ({ request, locals }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const questionsJson = formData.get('questions')?.toString();
    const autoGrade = formData.get('autoGrade') === 'true';
    const status = formData.get('status')?.toString() || 'DRAFT';
    const classId = formData.get('classId')?.toString();

    if (!title) {
      return fail(400, { error: 'Title is required' });
    }

    if (!classId) {
      return fail(400, { error: 'Please select a class to assign this test to' });
    }

    let questions = [];
    if (questionsJson) {
      try {
        questions = JSON.parse(questionsJson);
      } catch {
        return fail(400, { error: 'Invalid questions data' });
      }
    }

    // Create test and assign to class
    const test = await prisma.test.create({
      data: {
        title,
        description,
        accessCode: generateCode(6),
        teacherId: locals.user!.id,
        status: status as 'DRAFT' | 'PUBLISHED',
        autoGrade,
        questions: {
          create: questions.map((q: any, i: number) => ({
            type: q.type,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            points: q.points || 1,
            order: i,
            aiGenerated: false
          }))
        },
        classes: {
          create: {
            classId
          }
        }
      }
    });

    throw redirect(302, `/teacher/tests/${test.id}?created=true`);
  }
};
