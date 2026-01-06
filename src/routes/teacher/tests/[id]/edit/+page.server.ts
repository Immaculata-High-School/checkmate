import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const test = await prisma.test.findUnique({
    where: { id: params.id },
    include: {
      questions: {
        orderBy: { order: 'asc' }
      },
      classes: {
        include: {
          class: {
            select: { id: true, name: true }
          }
        }
      }
    }
  });

  if (!test) {
    throw error(404, 'Test not found');
  }

  if (test.teacherId !== locals.user!.id) {
    throw error(403, 'Not authorized');
  }

  const classes = await prisma.class.findMany({
    where: { teacherId: locals.user!.id, archived: false },
    orderBy: { name: 'asc' }
  });

  return { test, classes };
};

export const actions: Actions = {
  update: async ({ params, request, locals }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const questionsJson = formData.get('questions')?.toString();
    const autoGrade = formData.get('autoGrade') === 'true';

    if (!title) {
      return fail(400, { error: 'Title is required' });
    }

    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    let questions = [];
    if (questionsJson) {
      try {
        questions = JSON.parse(questionsJson);
      } catch {
        return fail(400, { error: 'Invalid questions data' });
      }
    }

    // Update test and questions in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing questions
      await tx.question.deleteMany({
        where: { testId: params.id }
      });

      // Update test with new questions
      await tx.test.update({
        where: { id: params.id },
        data: {
          title,
          description,
          autoGrade,
          questions: {
            create: questions.map((q: any, i: number) => ({
              type: q.type,
              question: q.question,
              options: q.options || [],
              correctAnswer: q.correctAnswer,
              points: q.points || 1,
              order: i,
              aiGenerated: q.aiGenerated || false
            }))
          }
        }
      });
    });

    throw redirect(302, `/teacher/tests/${params.id}`);
  }
};
