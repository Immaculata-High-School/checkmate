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

  // Get existing content for "from content" option
  const tests = await prisma.test.findMany({
    where: {
      assignments: {
        some: {
          class: {
            teacherId: locals.user!.id
          }
        }
      }
    },
    select: {
      id: true,
      title: true,
      questions: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const worksheets = await prisma.worksheet.findMany({
    where: {
      teacherId: locals.user!.id
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: {
        select: { items: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const studyGuides = await prisma.studyGuide.findMany({
    where: {
      teacherId: locals.user!.id
    },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return { 
    classes, 
    savedJob,
    existingContent: {
      tests: tests.map(t => ({
        id: t.id,
        title: t.title,
        type: 'test' as const,
        questionCount: Array.isArray(t.questions) ? t.questions.length : 0,
        createdAt: t.createdAt
      })),
      worksheets: worksheets.map(w => ({
        id: w.id,
        title: w.title,
        type: 'worksheet' as const,
        itemCount: w._count.items,
        createdAt: w.createdAt
      })),
      studyGuides: studyGuides.map(sg => ({
        id: sg.id,
        title: sg.title,
        type: 'study_guide' as const,
        hasContent: !!sg.content,
        createdAt: sg.createdAt
      }))
    }
  };
};

export const actions: Actions = {
  generate: async ({ request, locals }) => {
    const formData = await request.formData();
    const topic = formData.get('topic')?.toString().trim();
    const numberOfCards = parseInt(formData.get('numberOfCards')?.toString() || '20');
    const additionalInstructions = formData.get('additionalInstructions')?.toString().trim() || '';
    const extractedText = formData.get('extractedText')?.toString().trim() || '';
    const useFileContent = formData.get('useFileContent') === 'true';

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
        input: { topic, numberOfCards, hasFileContent: useFileContent && !!extractedText },
        userId: locals.user!.id,
        orgId: membership?.organizationId,
        startedAt: new Date()
      }
    });

    try {
      // If using file content, generate from the extracted text
      const cards = useFileContent && extractedText 
        ? await shuttleAI.generateFlashcardsFromContent(
            { sourceContent: extractedText, sourceName: topic, numberOfCards, additionalInstructions },
            { userId: locals.user!.id, orgId: membership?.organizationId }
          )
        : await shuttleAI.generateFlashcards(
            { topic, numberOfCards, additionalInstructions },
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

  generateFromContent: async ({ request, locals }) => {
    const formData = await request.formData();
    const contentType = formData.get('contentType')?.toString() as 'test' | 'worksheet' | 'study_guide';
    const contentId = formData.get('contentId')?.toString();
    const numberOfCards = parseInt(formData.get('numberOfCards')?.toString() || '20');

    if (!contentType || !contentId) {
      return fail(400, { error: 'Please select content to generate from' });
    }

    // Get the content based on type
    let sourceContent = '';
    let sourceName = '';

    if (contentType === 'test') {
      const test = await prisma.test.findUnique({
        where: { id: contentId },
        select: { title: true, description: true, questions: true }
      });
      if (!test) {
        return fail(404, { error: 'Test not found' });
      }
      sourceName = test.title;
      const questions = test.questions as any[];
      sourceContent = questions.map((q, i) => `Question ${i + 1}: ${q.question}\nAnswer: ${q.correctAnswer}`).join('\n\n');
    } else if (contentType === 'worksheet') {
      const worksheet = await prisma.worksheet.findUnique({
        where: { id: contentId },
        select: { 
          title: true, 
          description: true, 
          items: {
            select: { content: true, answer: true },
            orderBy: { order: 'asc' }
          }
        }
      });
      if (!worksheet) {
        return fail(404, { error: 'Worksheet not found' });
      }
      sourceName = worksheet.title;
      sourceContent = worksheet.items.map((item, i) => `Item ${i + 1}: ${item.content}\nAnswer: ${item.answer || 'N/A'}`).join('\n\n');
    } else if (contentType === 'study_guide') {
      const studyGuide = await prisma.studyGuide.findUnique({
        where: { id: contentId },
        select: { title: true, content: true }
      });
      if (!studyGuide) {
        return fail(404, { error: 'Study guide not found' });
      }
      sourceName = studyGuide.title;
      // Strip HTML tags for plain text content
      sourceContent = studyGuide.content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
    }

    if (!sourceContent) {
      return fail(400, { error: 'No content found in the selected item' });
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
        input: { sourceType: contentType, sourceId: contentId, sourceName, numberOfCards },
        userId: locals.user!.id,
        orgId: membership?.organizationId,
        startedAt: new Date()
      }
    });

    try {
      const cards = await shuttleAI.generateFlashcardsFromContent(
        { sourceContent, sourceName, numberOfCards },
        { userId: locals.user!.id, orgId: membership?.organizationId }
      );

      // Update job as completed
      await prisma.aIJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          output: { cards, topic: sourceName, numberOfCards },
          completedAt: new Date()
        }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          type: 'JOB_COMPLETE',
          title: 'Flashcards Generated',
          message: `${cards.length} flashcards from "${sourceName}" are ready to review.`,
          link: `/teacher/study-sets/create?jobId=${job.id}`,
          userId: locals.user!.id,
          jobId: job.id
        }
      });

      return { success: true, cards, topic: sourceName, jobId: job.id };
    } catch (error) {
      console.error('AI generation error:', error);

      await prisma.aIJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });

      return fail(500, { error: 'Failed to generate flashcards from content. Please try again.' });
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
