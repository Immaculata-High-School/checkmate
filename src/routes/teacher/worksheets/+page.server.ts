import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const worksheets = await prisma.worksheet.findMany({
    where: { teacherId: locals.user!.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { items: true }
      }
    }
  });

  return { worksheets };
};
