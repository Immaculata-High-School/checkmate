import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const classes = await prisma.class.findMany({
    where: { teacherId: locals.user!.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          members: true,
          tests: true
        }
      }
    }
  });

  return { classes };
};
