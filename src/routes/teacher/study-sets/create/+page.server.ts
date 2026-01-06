import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { shuttleAI } from '$lib/server/shuttleai';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
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

    if (job && job.userId === locals.user!.id && job.status === 'COMPLETED' && job.type === 'FLASHCARD_GENERATION') {
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
    const numberOfCards = parseInt(formData.get('numberOfCards')?.toString() || '20');

    if (!topic) {
      return fail(400, { error: 'Topic is required' });
    }

    // Get org membership for AI tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user!.id }
    });

    // Create AI job for tracking
    const job = await prisma.aIJob.create({
      data: {
        type: 'FLASHCARD_GENERATION',
        status: 'RUNNING',
        input: { topic, numberOfCards },
        userId: locals.user!.id,
        orgId: membership?.organizationId,
        startedAt: new Date()
      }
    });

    try {
      const cards = await shuttleAI.generateFlashcards(
        { topic, numberOfCards },
        { userId: locals.user!.id, orgId: membership?.organizationId }
      );

      // Update job as completed with full data for later retrieval
      await prisma.aIJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          output: { cards, topic, numberOfCards },
          completedAt: new Date()
        }
      });

      // Create notification so user can continue later
      await prisma.notification.create({
        data: {
          type: 'JOB_COMPLETE',
          title: 'Flashcards Generated',
          message: `${cards.length} flashcards about "${topic}" are ready to review.`,
          link: `/teacher/study-sets/create?jobId=${job.id}`,
          userId: locals.user!.id,
          jobId: job.id
        }
      });

      return { success: true, cards, topic, jobId: job.id };
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

      return fail(500, { error: 'Failed to generate flashcards. Please try again or create manually.' });
    }
  },

  save: async ({ request, locals }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const cardsJson = formData.get('cards')?.toString();
    const classId = formData.get('classId')?.toString();
    const jobId = formData.get('jobId')?.toString();

    if (!title || !cardsJson) {
      return fail(400, { error: 'Title and cards are required' });
    }

    if (!classId) {
      return fail(400, { error: 'Please select a class to assign this study set to' });
    }

    let cards;
    try {
      cards = JSON.parse(cardsJson);
    } catch {
      return fail(400, { error: 'Invalid cards data' });
    }

    const studySet = await prisma.studySet.create({
      data: {
        title,
        description,
        creatorId: locals.user!.id,
        cards: {
          create: cards.map((card: any, i: number) => ({
            front: card.front,
            back: card.back,
            order: i
          }))
        },
        assignments: {
          create: {
            classId,
            type: 'STUDY_SET'
          }
        }
      }
    });

    // Update AI job with entity info and create notification
    if (jobId) {
      await prisma.aIJob.update({
        where: { id: jobId },
        data: {
          entityId: studySet.id,
          entityType: 'STUDY_SET'
        }
      });

      await prisma.notification.create({
        data: {
          type: 'JOB_COMPLETE',
          title: 'Study Set Created',
          message: `Your study set "${title}" has been created with ${cards.length} flashcards.`,
          link: `/teacher/study-sets/${studySet.id}`,
          userId: locals.user!.id,
          jobId
        }
      });
    }

    throw redirect(302, `/teacher/study-sets/${studySet.id}`);
  },

  saveManual: async ({ request, locals }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const cardsJson = formData.get('cards')?.toString();
    const classId = formData.get('classId')?.toString();

    if (!title) {
      return fail(400, { error: 'Title is required' });
    }

    if (!classId) {
      return fail(400, { error: 'Please select a class to assign this study set to' });
    }

    let cards = [];
    if (cardsJson) {
      try {
        cards = JSON.parse(cardsJson);
      } catch {
        return fail(400, { error: 'Invalid cards data' });
      }
    }

    const studySet = await prisma.studySet.create({
      data: {
        title,
        description,
        creatorId: locals.user!.id,
        cards: {
          create: cards.map((card: any, i: number) => ({
            front: card.front,
            back: card.back,
            order: i
          }))
        },
        assignments: {
          create: {
            classId,
            type: 'STUDY_SET'
          }
        }
      }
    });

    throw redirect(302, `/teacher/study-sets/${studySet.id}`);
  }
};
