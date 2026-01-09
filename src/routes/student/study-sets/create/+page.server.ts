import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Nothing to load for manual creation
  return {};
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const cardsJson = formData.get('cards')?.toString();

    if (!title) {
      return fail(400, { error: 'Title is required' });
    }

    let cards: { front: string; back: string }[] = [];
    if (cardsJson) {
      try {
        cards = JSON.parse(cardsJson);
      } catch {
        return fail(400, { error: 'Invalid cards data' });
      }
    }

    // Filter out empty cards
    cards = cards.filter(c => c.front.trim() && c.back.trim());

    if (cards.length === 0) {
      return fail(400, { error: 'At least one card is required' });
    }

    // Create personal study set (no class assignment)
    const studySet = await prisma.studySet.create({
      data: {
        title,
        description,
        creatorId: locals.user!.id,
        // No classId - this is a personal study set
        cards: {
          create: cards.map((card, i) => ({
            front: card.front,
            back: card.back,
            order: i
          }))
        }
      }
    });

    throw redirect(302, `/student/study-sets/${studySet.id}`);
  }
};
