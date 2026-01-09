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

    if (job && job.userId === locals.user!.id && job.status === 'COMPLETED' && job.type === 'WORKSHEET_GENERATION') {
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
    const numberOfItems = parseInt(formData.get('numberOfItems')?.toString() || '10');
    const difficulty = formData.get('difficulty')?.toString() as 'easy' | 'medium' | 'hard';
    const itemTypes = formData.getAll('itemTypes').map(t => t.toString());
    const additionalInstructions = formData.get('additionalInstructions')?.toString().trim() || '';
    
    // File upload content
    const extractedText = formData.get('extractedText')?.toString();
    const useFileContent = formData.get('useFileContent') === 'true';
    const sourceContent = useFileContent && extractedText ? extractedText : undefined;

    if (!topic) {
      return fail(400, { error: 'Topic is required' });
    }

    if (itemTypes.length === 0) {
      return fail(400, { error: 'Select at least one item type' });
    }

    // Get org membership for AI tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user!.id }
    });

    // Create AI job for tracking
    const job = await prisma.aIJob.create({
      data: {
        type: 'WORKSHEET_GENERATION',
        status: 'RUNNING',
        input: { topic, numberOfItems, difficulty, itemTypes, hasSourceContent: !!sourceContent },
        userId: locals.user!.id,
        orgId: membership?.organizationId,
        startedAt: new Date()
      }
    });

    try {
      const items = await shuttleAI.generateWorksheetItems(
        {
          topic,
          subject: topic, // Use topic as subject
          numberOfItems,
          itemTypes,
          difficulty: difficulty || 'medium',
          sourceContent,
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
          output: { items, topic, numberOfItems, difficulty, itemTypes },
          completedAt: new Date()
        }
      });

      // Create notification so user can continue later
      await prisma.notification.create({
        data: {
          type: 'JOB_COMPLETE',
          title: 'Worksheet Generated',
          message: `${items.length} items about "${topic}" are ready to review.`,
          link: `/teacher/worksheets/create?jobId=${job.id}`,
          userId: locals.user!.id,
          jobId: job.id
        }
      });

      return { success: true, items, topic, jobId: job.id };
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

      return fail(500, { error: 'Failed to generate worksheet items. Please try again or create manually.' });
    }
  },

  save: async ({ request, locals }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const itemsJson = formData.get('items')?.toString();
    const classId = formData.get('classId')?.toString();
    const jobId = formData.get('jobId')?.toString();

    if (!title || !itemsJson) {
      return fail(400, { error: 'Title and items are required' });
    }

    if (!classId) {
      return fail(400, { error: 'Please select a class to assign this worksheet to' });
    }

    let items;
    try {
      items = JSON.parse(itemsJson);
    } catch {
      return fail(400, { error: 'Invalid items data' });
    }

    const worksheet = await prisma.worksheet.create({
      data: {
        title,
        description,
        teacherId: locals.user!.id,
        items: {
          create: items.map((item: any, i: number) => ({
            type: item.type,
            content: item.content,
            answer: item.answer,
            order: i
          }))
        },
        assignments: {
          create: {
            classId,
            type: 'WORKSHEET'
          }
        }
      }
    });

    // Update AI job with entity info and create notification
    if (jobId) {
      await prisma.aIJob.update({
        where: { id: jobId },
        data: {
          entityId: worksheet.id,
          entityType: 'WORKSHEET'
        }
      });

      await prisma.notification.create({
        data: {
          type: 'JOB_COMPLETE',
          title: 'Worksheet Created',
          message: `Your worksheet "${title}" has been created with ${items.length} items.`,
          link: `/teacher/worksheets/${worksheet.id}`,
          userId: locals.user!.id,
          jobId
        }
      });
    }

    throw redirect(302, `/teacher/worksheets/${worksheet.id}`);
  },

  saveManual: async ({ request, locals }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const itemsJson = formData.get('items')?.toString();
    const classId = formData.get('classId')?.toString();

    if (!title) {
      return fail(400, { error: 'Title is required' });
    }

    if (!classId) {
      return fail(400, { error: 'Please select a class to assign this worksheet to' });
    }

    let items = [];
    if (itemsJson) {
      try {
        items = JSON.parse(itemsJson);
      } catch {
        return fail(400, { error: 'Invalid items data' });
      }
    }

    const worksheet = await prisma.worksheet.create({
      data: {
        title,
        description,
        teacherId: locals.user!.id,
        items: {
          create: items.map((item: any, i: number) => ({
            type: item.type || 'PROBLEM',
            content: item.content,
            answer: item.answer,
            order: i
          }))
        },
        assignments: {
          create: {
            classId,
            type: 'WORKSHEET'
          }
        }
      }
    });

    throw redirect(302, `/teacher/worksheets/${worksheet.id}`);
  }
};
