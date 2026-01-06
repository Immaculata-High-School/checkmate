import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const tests = await prisma.test.findMany({
    where: { teacherId: locals.user!.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          questions: true,
          submissions: true
        }
      }
    }
  });

  return { tests };
};
