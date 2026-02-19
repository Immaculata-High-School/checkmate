import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 50;
  const skip = (page - 1) * limit;

  const action = url.searchParams.get('action') || '';
  const userId = url.searchParams.get('userId') || '';
  const orgId = url.searchParams.get('orgId') || '';
  const entityType = url.searchParams.get('entityType') || '';
  const search = url.searchParams.get('search') || '';
  const dateFrom = url.searchParams.get('dateFrom') || '';
  const dateTo = url.searchParams.get('dateTo') || '';

  const where: any = {};

  if (action) {
    where.action = { contains: action, mode: 'insensitive' };
  }
  if (userId) {
    where.userId = userId;
  }
  if (orgId) {
    where.organizationId = orgId;
  }
  if (entityType) {
    where.entityType = entityType;
  }
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { entityType: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } }
    ];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  const [logs, total, actions, entityTypes, organizations] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true, slug: true }
        }
      }
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 20
    }),
    prisma.auditLog.groupBy({
      by: ['entityType'],
      where: { entityType: { not: null } },
      _count: true,
      orderBy: { _count: { entityType: 'desc' } }
    }),
    prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    filters: { action, userId, orgId, entityType, search, dateFrom, dateTo },
    filterOptions: {
      actions: actions.map(a => a.action),
      entityTypes: entityTypes.map(e => e.entityType).filter(Boolean) as string[],
      organizations
    }
  };
};
