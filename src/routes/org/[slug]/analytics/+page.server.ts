import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

// Fixed pricing: $5.00 per million input tokens, $25.00 per million output tokens
const INPUT_COST_PER_TOKEN = 5.0 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 25.0 / 1_000_000;

function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN);
}

export const load: PageServerLoad = async ({ parent }) => {
  const { organization } = await parent();
  const orgId = organization.id;

  // Get date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Overall stats for this org
  const [totalLogs, totalTokens, totalJobs] = await Promise.all([
    prisma.aIUsageLog.count({ where: { orgId } }),
    prisma.aIUsageLog.aggregate({
      where: { orgId },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        cost: true
      }
    }),
    prisma.aIJob.count({ where: { orgId } })
  ]);

  // Stats for last 30 days
  const last30DaysStats = await prisma.aIUsageLog.aggregate({
    where: { orgId, createdAt: { gte: thirtyDaysAgo } },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      cost: true
    },
    _count: true
  });

  // Stats for last 7 days
  const last7DaysStats = await prisma.aIUsageLog.aggregate({
    where: { orgId, createdAt: { gte: sevenDaysAgo } },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      cost: true
    },
    _count: true
  });

  // Usage by type with token breakdown for cost calculation
  const usageByType = await prisma.aIUsageLog.groupBy({
    by: ['type'],
    where: { orgId },
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
    where: { orgId },
    _count: true
  });

  const jobsByType = await prisma.aIJob.groupBy({
    by: ['type'],
    where: { orgId },
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
    WHERE "orgId" = ${orgId} AND "createdAt" >= ${thirtyDaysAgo}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  // Top users in this org by usage
  const topUsers = await prisma.aIUsageLog.groupBy({
    by: ['userId'],
    where: { orgId },
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
      user
    };
  });

  // Recent usage logs for this org
  const recentLogs = await prisma.aIUsageLog.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  // Recent jobs for this org
  const recentJobs = await prisma.aIJob.findMany({
    where: { orgId },
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

  // Add calculated costs to top users
  const topUsersWithCost = topUsersWithDetails.map(u => ({
    ...u,
    _sum: {
      ...u._sum,
      cost: calculateCost(u._sum.inputTokens || 0, u._sum.outputTokens || 0)
    }
  }));

  // Add calculated costs to recent logs
  const recentLogsWithCost = recentLogs.map(log => ({
    ...log,
    cost: calculateCost(log.inputTokens, log.outputTokens)
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
    topUsers: topUsersWithCost,
    recentLogs: recentLogsWithCost,
    recentJobs
  };
};
