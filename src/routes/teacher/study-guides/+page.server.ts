import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const studyGuides = await prisma.studyGuide.findMany({
    where: { teacherId: locals.user!.id },
    include: {
      sourceTest: {
        select: { id: true, title: true }
      },
      assignments: {
        include: {
          class: {
            select: { id: true, name: true, emoji: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return { studyGuides };
};
