import { prisma } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This endpoint is called to charge monthly user fees and AI usage for all organizations
// Should be called by a cron job at the beginning of each month
// Example: Call with Authorization header containing BILLING_SECRET env var

// Minimum days between billing cycles to prevent double-charging
const MIN_DAYS_BETWEEN_BILLING = 25;

export const POST: RequestHandler = async ({ request }) => {
  // Verify authorization
  const authHeader = request.headers.get('Authorization');
  const billingSecret = process.env.BILLING_SECRET;
  
  // If BILLING_SECRET is set, require it for authorization
  if (billingSecret && authHeader !== `Bearer ${billingSecret}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const minBillingDate = new Date(now);
  minBillingDate.setDate(minBillingDate.getDate() - MIN_DAYS_BETWEEN_BILLING);

  try {
    // Find all organizations that need to be charged
    // - billingEnabled is true
    // - Either never been charged (lastBillingDate is null) OR last charged more than MIN_DAYS_BETWEEN_BILLING days ago
    const organizations = await prisma.organization.findMany({
      where: {
        billingEnabled: true,
        OR: [
          { lastBillingDate: null },
          { lastBillingDate: { lt: minBillingDate } }
        ]
      },
      include: {
        members: {
          where: { isActive: true }
        }
      }
    });

    const results = {
      processed: 0,
      charged: 0,
      skipped: 0,
      disabled: 0,
      totalUserFees: 0,
      totalAiUsage: 0,
      totalAmount: 0,
      errors: [] as string[]
    };

    for (const org of organizations) {
      try {
        // Double-check: ensure at least MIN_DAYS_BETWEEN_BILLING days have passed
        if (org.lastBillingDate) {
          const daysSinceLastBilling = Math.floor(
            (now.getTime() - org.lastBillingDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastBilling < MIN_DAYS_BETWEEN_BILLING) {
            results.skipped++;
            results.errors.push(`Skipped ${org.name}: Only ${daysSinceLastBilling} days since last billing`);
            continue;
          }
        }

        const userCount = org.members.length;
        const userFeeAmount = userCount * org.monthlyUserFee;

        // Calculate AI usage costs since last billing date
        const aiUsageWhere: any = {
          orgId: org.id
        };
        
        if (org.lastBillingDate) {
          aiUsageWhere.createdAt = {
            gt: org.lastBillingDate
          };
        }

        const aiUsageResult = await prisma.aIUsageLog.aggregate({
          where: aiUsageWhere,
          _sum: {
            cost: true
          }
        });

        const aiUsageAmount = aiUsageResult._sum.cost || 0;
        const totalChargeAmount = userFeeAmount + aiUsageAmount;

        if (totalChargeAmount === 0 && userCount === 0) {
          // No charge needed (free plan, no users, no AI usage)
          await prisma.organization.update({
            where: { id: org.id },
            data: { lastBillingDate: now }
          });
          results.processed++;
          continue;
        }

        let newBalance = org.balance;
        const transactions: any[] = [];

        // Create user fee transaction if applicable
        if (userFeeAmount > 0) {
          newBalance -= userFeeAmount;
          transactions.push(
            prisma.billingTransaction.create({
              data: {
                organizationId: org.id,
                type: 'USER_FEE',
                amount: -userFeeAmount,
                balance: newBalance,
                description: `Monthly user fee: ${userCount} users × $${org.monthlyUserFee.toFixed(2)}`
              }
            })
          );
          results.totalUserFees += userFeeAmount;
        }

        // Create AI usage transaction if applicable
        if (aiUsageAmount > 0) {
          newBalance -= aiUsageAmount;
          transactions.push(
            prisma.billingTransaction.create({
              data: {
                organizationId: org.id,
                type: 'AI_USAGE',
                amount: -aiUsageAmount,
                balance: newBalance,
                description: `AI usage charges for billing period`
              }
            })
          );
          results.totalAiUsage += aiUsageAmount;
        }

        // Update organization balance
        transactions.unshift(
          prisma.organization.update({
            where: { id: org.id },
            data: {
              balance: newBalance,
              lastBillingDate: now,
              // Disable billing if balance goes to 0 or below
              billingEnabled: newBalance > 0
            }
          })
        );

        // Execute all transactions
        await prisma.$transaction(transactions);

        results.processed++;
        if (totalChargeAmount > 0) {
          results.charged++;
          results.totalAmount += totalChargeAmount;
        }

        if (newBalance <= 0) {
          results.disabled++;
        }
      } catch (error) {
        results.errors.push(`Failed to process org ${org.id} (${org.name}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return json({
      success: true,
      message: `Processed ${results.processed} organizations, charged ${results.charged}`,
      results
    });
  } catch (error) {
    console.error('Monthly billing error:', error);
    return json({ 
      error: 'Failed to process monthly billing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// GET endpoint to check billing status (for debugging/monitoring)
export const GET: RequestHandler = async ({ request }) => {
  const authHeader = request.headers.get('Authorization');
  const billingSecret = process.env.BILLING_SECRET;
  
  if (billingSecret && authHeader !== `Bearer ${billingSecret}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const minBillingDate = new Date(now);
  minBillingDate.setDate(minBillingDate.getDate() - MIN_DAYS_BETWEEN_BILLING);

  const pendingOrgs = await prisma.organization.findMany({
    where: {
      billingEnabled: true,
      OR: [
        { lastBillingDate: null },
        { lastBillingDate: { lt: minBillingDate } }
      ]
    },
    select: {
      id: true,
      name: true,
      balance: true,
      monthlyUserFee: true,
      lastBillingDate: true,
      _count: {
        select: { members: true }
      }
    }
  });

  // Get AI usage for each pending org
  const summaryPromises = pendingOrgs.map(async (org) => {
    const aiUsageWhere: any = { orgId: org.id };
    if (org.lastBillingDate) {
      aiUsageWhere.createdAt = { gt: org.lastBillingDate };
    }
    
    const aiUsage = await prisma.aIUsageLog.aggregate({
      where: aiUsageWhere,
      _sum: { cost: true }
    });

    const userFee = org._count.members * org.monthlyUserFee;
    const aiUsageCost = aiUsage._sum.cost || 0;

    return {
      id: org.id,
      name: org.name,
      balance: org.balance,
      monthlyUserFee: org.monthlyUserFee,
      userCount: org._count.members,
      userFee,
      aiUsageCost,
      totalEstimatedCharge: userFee + aiUsageCost,
      lastBillingDate: org.lastBillingDate,
      daysSinceLastBilling: org.lastBillingDate 
        ? Math.floor((now.getTime() - org.lastBillingDate.getTime()) / (1000 * 60 * 60 * 24))
        : null
    };
  });

  const summary = await Promise.all(summaryPromises);

  return json({
    pendingCount: pendingOrgs.length,
    minDaysBetweenBilling: MIN_DAYS_BETWEEN_BILLING,
    organizations: summary,
    totals: {
      userFees: summary.reduce((sum, org) => sum + org.userFee, 0),
      aiUsage: summary.reduce((sum, org) => sum + org.aiUsageCost, 0),
      total: summary.reduce((sum, org) => sum + org.totalEstimatedCharge, 0)
    }
  });
};
