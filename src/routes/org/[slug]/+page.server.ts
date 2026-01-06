import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const organization = await prisma.organization.findUnique({
    where: { slug: params.slug }
  });

  if (!organization) {
    return { stats: null, recentActivity: [] };
  }

  // Get statistics
  const [
    totalTeachers,
    totalStudents,
    totalClasses,
    activeClasses,
    totalTests,
    totalSubmissions
  ] = await Promise.all([
    prisma.organizationMember.count({
      where: {
        organizationId: organization.id,
        role: { in: ['TEACHER', 'TEACHING_ASSISTANT'] },
        isActive: true
      }
    }),
    prisma.organizationMember.count({
      where: {
        organizationId: organization.id,
        role: 'STUDENT',
        isActive: true
      }
    }),
    prisma.class.count({
      where: { organizationId: organization.id }
    }),
    prisma.class.count({
      where: { organizationId: organization.id, archived: false }
    }),
    prisma.test.count({
      where: {
        teacher: {
          orgMemberships: {
            some: { organizationId: organization.id }
          }
        }
      }
    }),
    prisma.testSubmission.count({
      where: {
        test: {
          teacher: {
            orgMemberships: {
              some: { organizationId: organization.id }
            }
          }
        }
      }
    })
  ]);

  // Get recent teachers
  const recentTeachers = await prisma.organizationMember.findMany({
    where: {
      organizationId: organization.id,
      role: { in: ['TEACHER', 'TEACHING_ASSISTANT'] }
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, lastLoginAt: true }
      }
    },
    orderBy: { joinedAt: 'desc' },
    take: 5
  });

  // Get recent classes
  const recentClasses = await prisma.class.findMany({
    where: { organizationId: organization.id },
    include: {
      teacher: {
        select: { name: true }
      },
      _count: {
        select: { members: true, tests: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return {
    stats: {
      totalTeachers,
      totalStudents,
      totalClasses,
      activeClasses,
      totalTests,
      totalSubmissions
    },
    recentTeachers,
    recentClasses
  };
};
