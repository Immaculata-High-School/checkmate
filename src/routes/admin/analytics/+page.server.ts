import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

// Fixed pricing: $5.00 per million input tokens, $25.00 per million output tokens
const INPUT_COST_PER_TOKEN = 5.0 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 25.0 / 1_000_000;

function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN);
}

export const load: PageServerLoad = async () => {
  // Get date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Overall stats
  const [totalLogs, totalTokens, totalJobs] = await Promise.all([
    prisma.aIUsageLog.count(),
    prisma.aIUsageLog.aggregate({
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true
      }
    }),
    prisma.aIJob.count()
  ]);

  // Stats for last 30 days
  const last30DaysStats = await prisma.aIUsageLog.aggregate({
    where: { createdAt: { gte: thirtyDaysAgo } },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true
    },
    _count: true
  });

  // Stats for last 7 days
  const last7DaysStats = await prisma.aIUsageLog.aggregate({
    where: { createdAt: { gte: sevenDaysAgo } },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true
    },
    _count: true
  });

  // Usage by type
  const usageByType = await prisma.aIUsageLog.groupBy({
    by: ['type'],
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true
    },
    _count: true,
    orderBy: { _count: { type: 'desc' } }
  });

  // Job stats
  const jobStats = await prisma.aIJob.groupBy({
    by: ['status'],
    _count: true
  });

  const jobsByType = await prisma.aIJob.groupBy({
    by: ['type'],
    _count: true,
    orderBy: { _count: { type: 'desc' } }
  });

  // Daily usage for last 30 days (for chart)
  const dailyUsage = await prisma.$queryRaw<
    Array<{ date: string; count: number; tokens: number; cost: number }>
  >`
    SELECT
      DATE("createdAt") as date,
      COUNT(*)::int as count,
      COALESCE(SUM("totalTokens"), 0)::int as tokens,
      COALESCE(SUM(cost), 0)::float as cost
    FROM "AIUsageLog"
    WHERE "createdAt" >= ${thirtyDaysAgo}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  // Top users by usage
  const topUsers = await prisma.aIUsageLog.groupBy({
    by: ['userId'],
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true
    },
    _count: true,
    orderBy: { _sum: { totalTokens: 'desc' } },
    take: 10
  });

  // Get user details
  const userIds = topUsers.map((u) => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true }
  });

  const topUsersWithDetails = topUsers.map((u) => {
    const user = users.find((us) => us.id === u.userId);
    return {
      ...u,
      user,
      _sum: {
        ...u._sum,
        cost: calculateCost(u._sum.inputTokens || 0, u._sum.outputTokens || 0)
      }
    };
  });

  // Top organizations by usage
  const topOrgs = await prisma.aIUsageLog.groupBy({
    by: ['orgId'],
    where: { orgId: { not: null } },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true
    },
    _count: true,
    orderBy: { _sum: { totalTokens: 'desc' } },
    take: 10
  });

  // Get org details
  const orgIds = topOrgs.map((o) => o.orgId).filter((id): id is string => id !== null);
  const orgs = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, name: true }
  });

  const topOrgsWithDetails = topOrgs.map((o) => {
    const org = orgs.find((or) => or.id === o.orgId);
    return {
      ...o,
      org,
      _sum: {
        ...o._sum,
        cost: calculateCost(o._sum.inputTokens || 0, o._sum.outputTokens || 0)
      }
    };
  });

  // Recent usage logs
  const recentLogs = await prisma.aIUsageLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: {
        select: { id: true, name: true, email: true }
      },
      organization: {
        select: { id: true, name: true }
      }
    }
  });

  // Add calculated costs to recent logs
  const recentLogsWithCost = recentLogs.map(log => ({
    ...log,
    cost: calculateCost(log.inputTokens, log.outputTokens)
  }));

  // Recent jobs
  const recentJobs = await prisma.aIJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      type: true,
      status: true,
      progress: true,
      error: true,
      createdAt: true,
      completedAt: true,
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  // Calculate costs using fixed pricing
  const totalInputTokens = totalTokens._sum.inputTokens || 0;
  const totalOutputTokens = totalTokens._sum.outputTokens || 0;
  const totalCost = calculateCost(totalInputTokens, totalOutputTokens);

  const last30DaysCost = calculateCost(
    last30DaysStats._sum.inputTokens || 0,
    last30DaysStats._sum.outputTokens || 0
  );

  const last7DaysCost = calculateCost(
    last7DaysStats._sum.inputTokens || 0,
    last7DaysStats._sum.outputTokens || 0
  );

  // Add calculated costs to usage by type
  const usageByTypeWithCost = usageByType.map(u => ({
    ...u,
    _sum: {
      ...u._sum,
      cost: calculateCost(u._sum.inputTokens || 0, u._sum.outputTokens || 0)
    }
  }));

  return {
    stats: {
      totalRequests: totalLogs,
      totalTokens: totalTokens._sum.totalTokens || 0,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      totalJobs,
      last30Days: {
        requests: last30DaysStats._count,
        tokens: last30DaysStats._sum.totalTokens || 0,
        cost: last30DaysCost
      },
      last7Days: {
        requests: last7DaysStats._count,
        tokens: last7DaysStats._sum.totalTokens || 0,
        cost: last7DaysCost
      }
    },
    usageByType: usageByTypeWithCost,
    jobStats: jobStats.reduce(
      (acc, s) => ({ ...acc, [s.status]: s._count }),
      {} as Record<string, number>
    ),
    jobsByType,
    dailyUsage,
    topUsers: topUsersWithDetails,
    topOrgs: topOrgsWithDetails,
    recentLogs: recentLogsWithCost,
    recentJobs
  };
};
