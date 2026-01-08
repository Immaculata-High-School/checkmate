import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50; // Load 50 students at a time

export const load: PageServerLoad = async ({ params, url }) => {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const search = url.searchParams.get('search') || '';

  const organization = await prisma.organization.findUnique({
    where: { slug: params.slug },
    select: { id: true }
  });

  if (!organization) {
    return { students: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 };
  }

  // Build where clause with optional search
  const whereClause = {
    organizationId: organization.id,
    role: 'STUDENT' as const,
    isActive: true,
    ...(search && {
      OR: [
        { user: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { email: { contains: search, mode: 'insensitive' as const } } },
        { studentId: { contains: search, mode: 'insensitive' as const } }
      ]
    })
  };

  // Run count and fetch in parallel
  const [total, students] = await Promise.all([
    prisma.organizationMember.count({ where: whereClause }),
    prisma.organizationMember.findMany({
      where: whereClause,
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
            lastLoginAt: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    })
  ]);

  // Get class counts only for current page of students (much faster)
  const studentIds = students.map(s => s.userId);
  const classCounts = studentIds.length > 0 
    ? await prisma.classMember.groupBy({
        by: ['userId'],
        where: {
          userId: { in: studentIds },
          class: { organizationId: organization.id }
        },
        _count: true
      })
    : [];

  const classCountMap = new Map(classCounts.map(c => [c.userId, c._count]));

  const studentsWithCounts = students.map(s => ({
    ...s,
    classCount: classCountMap.get(s.userId) || 0
  }));

  return { 
    students: studentsWithCounts,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    search
  };
};
