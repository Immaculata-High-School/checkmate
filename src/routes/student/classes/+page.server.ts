import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const memberships = await prisma.classMember.findMany({
    where: { userId: locals.user!.id },
    select: {
      joinedAt: true,
      class: {
        select: {
          id: true,
          name: true,
          description: true,
          joinCode: true,
          theme: true,
          emoji: true,
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
