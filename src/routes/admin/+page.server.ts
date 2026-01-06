import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [
    totalUsers,
    totalOrganizations,
    pendingRequests,
    totalTests,
    totalSubmissions,
    recentRequests,
    recentUsers
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.organizationRequest.count({ where: { status: 'PENDING' } }),
    prisma.test.count(),
    prisma.testSubmission.count(),
    prisma.organizationRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        createdAt: true
      }
    })
  ]);

  return {
    stats: {
      totalUsers,
      totalOrganizations,
      pendingRequests,
      totalTests,
      totalSubmissions
    },
    recentRequests,
    recentUsers
  };
};
