import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const documents = await prisma.document.findMany({
    where: { 
      ownerId: locals.user!.id,
      isArchived: false
    },
    include: {
      shares: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      },
      classShares: {
        include: {
          class: { select: { id: true, name: true, emoji: true } }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Get classes for sharing
  const classes = await prisma.class.findMany({
    where: { teacherId: locals.user!.id, archived: false },
    select: { id: true, name: true, emoji: true },
    orderBy: { name: 'asc' }
  });

  return { documents, classes };
};
