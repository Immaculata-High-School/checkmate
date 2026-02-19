import { prisma } from '$lib/server/db';
import { error, fail } from '@sveltejs/kit';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: params.slug },
    include: {
      billingTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 50
      },
      members: true
    }
  });

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  // Check if user is an admin of this org
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: locals.user.id,
      organizationId: organization.id,
      role: { in: ['ORG_OWNER', 'ORG_ADMIN'] }
    }
  });

  if (!membership) {
    throw error(403, 'You must be an admin to access billing');
  }

  const userCount = organization.members.length;

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      balance: organization.balance,
      billingEnabled: organization.billingEnabled,
      lastBillingDate: organization.lastBillingDate,
      monthlyUserFee: organization.monthlyUserFee
    },
    userCount,
    transactions: organization.billingTransactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balance: t.balance,
      description: t.description,
      createdAt: t.createdAt
    }))
  };
};

export const actions: Actions = {
  redeemVoucher: async (event) => {
    const { params, request, locals } = event;
    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.slug }
    });

    if (!organization) {
      return fail(404, { error: 'Organization not found' });
    }

    // Check if user is an admin
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: locals.user.id,
        organizationId: organization.id,
        role: { in: ['ORG_OWNER', 'ORG_ADMIN'] }
      }
    });

    if (!membership) {
      return fail(403, { error: 'You must be an admin to redeem vouchers' });
    }

    const formData = await request.formData();
    const code = formData.get('code')?.toString().trim().toUpperCase();

    if (!code) {
      return fail(400, { error: 'Please enter a voucher code' });
    }

    // Find the voucher
    const voucher = await prisma.voucherCode.findUnique({
      where: { code }
    });

    if (!voucher) {
      return fail(400, { error: 'Invalid voucher code' });
    }

    if (!voucher.isActive) {
      return fail(400, { error: 'This voucher code is no longer active' });
    }

    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
      return fail(400, { error: 'This voucher code has expired' });
    }

    if (voucher.maxUses && voucher.usedCount >= voucher.maxUses) {
      return fail(400, { error: 'This voucher code has reached its maximum uses' });
    }

    // Check if org already redeemed this voucher
    const existingRedemption = await prisma.voucherRedemption.findUnique({
      where: {
        voucherId_organizationId: {
          voucherId: voucher.id,
          organizationId: organization.id
        }
      }
    });

    if (existingRedemption) {
      return fail(400, { error: 'Your organization has already redeemed this voucher' });
    }

    // Process the redemption
    const newBalance = organization.balance + voucher.amount;

    await prisma.$transaction([
      // Update org balance
      prisma.organization.update({
        where: { id: organization.id },
        data: {
          balance: newBalance,
          billingEnabled: true // Re-enable if it was disabled
        }
      }),
      // Create transaction record
      prisma.billingTransaction.create({
        data: {
          organizationId: organization.id,
          type: 'VOUCHER',
          amount: voucher.amount,
          balance: newBalance,
          description: `Voucher redeemed: ${voucher.code}`,
          metadata: { voucherId: voucher.id, voucherCode: voucher.code }
        }
      }),
      // Create redemption record
      prisma.voucherRedemption.create({
        data: {
          voucherId: voucher.id,
          organizationId: organization.id,
          redeemedById: locals.user!.id,
          amount: voucher.amount
        }
      }),
      // Increment voucher usage count
      prisma.voucherCode.update({
        where: { id: voucher.id },
        data: { usedCount: { increment: 1 } }
      })
    ]);

    logAudit({ userId: locals.user!.id, organizationId: organization.id, action: 'VOUCHER_REDEEMED', entityType: 'Voucher', entityId: voucher.id, details: { code: voucher.code, amount: voucher.amount, orgSlug: params.slug }, ...getRequestInfo(event) });

    return { success: true, amount: voucher.amount };
  }
};
