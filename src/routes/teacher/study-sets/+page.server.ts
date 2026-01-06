import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const studySets = await prisma.studySet.findMany({
    where: { creatorId: locals.user!.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { cards: true }
      }
    }
  });

  return { studySets };
};
