import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const status = url.searchParams.get('status') || 'PENDING';

  const requests = await prisma.organizationRequest.findMany({
    where: status === 'ALL' ? {} : { status: status as any },
    orderBy: { createdAt: 'desc' }
  });

  const counts = await prisma.organizationRequest.groupBy({
    by: ['status'],
    _count: true
  });

  return {
    requests,
    counts: {
      PENDING: counts.find(c => c.status === 'PENDING')?._count || 0,
      APPROVED: counts.find(c => c.status === 'APPROVED')?._count || 0,
      REJECTED: counts.find(c => c.status === 'REJECTED')?._count || 0,
      ALL: counts.reduce((sum, c) => sum + c._count, 0)
    },
    currentStatus: status
  };
};
