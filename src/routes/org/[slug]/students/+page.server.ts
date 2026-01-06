import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const organization = await prisma.organization.findUnique({
    where: { slug: params.slug }
  });

  if (!organization) {
    return { students: [] };
  }

  const students = await prisma.organizationMember.findMany({
    where: {
      organizationId: organization.id,
      role: 'STUDENT',
      isActive: true
    },
    select: {
      id: true,
      userId: true,
      studentId: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          lastLoginAt: true,
          createdAt: true
        }
      }
    },
    orderBy: { joinedAt: 'desc' }
  });

  // Get class counts for each student
  const studentIds = students.map(s => s.userId);
  const classCounts = await prisma.classMember.groupBy({
    by: ['userId'],
    where: {
      userId: { in: studentIds },
      class: { organizationId: organization.id }
    },
    _count: true
  });

  const classCountMap = new Map(classCounts.map(c => [c.userId, c._count]));

  const studentsWithCounts = students.map(s => ({
    ...s,
    classCount: classCountMap.get(s.userId) || 0
  }));

  return { students: studentsWithCounts };
};
