import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const memberships = await prisma.classMember.findMany({
    where: { userId: locals.user!.id },
    include: {
      class: {
        include: {
          teacher: {
            select: { id: true, name: true }
          },
          _count: {
            select: { members: true }
          }
        }
      }
    }
  });

  return {
    classes: memberships.map(m => ({
      ...m.class,
      enrolledAt: m.joinedAt
    }))
  };
};
