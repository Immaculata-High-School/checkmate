import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

function generateVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, 1, I
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const load: PageServerLoad = async () => {
  const vouchers = await prisma.voucherCode.findMany({
    orderBy: { createdAt: 'desc' }
  });

  // Get redemptions separately with organization info
  const voucherIds = vouchers.map(v => v.id);
  const redemptions = await prisma.voucherRedemption.findMany({
    where: { voucherId: { in: voucherIds } }
  });

  // Get organizations for redemptions
  const orgIds = [...new Set(redemptions.map(r => r.organizationId))];
  const orgs = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, name: true, slug: true }
  });
  const orgsById = new Map(orgs.map(o => [o.id, o]));

  // Group redemptions by voucher ID
  const redemptionsByVoucher = redemptions.reduce((acc, r) => {
    if (!acc[r.voucherId]) acc[r.voucherId] = [];
    const org = orgsById.get(r.organizationId);
    acc[r.voucherId].push({
      organizationName: org?.name || 'Unknown',
      organizationSlug: org?.slug || '',
      redeemedAt: 'createdAt' in r ? (r as any).createdAt : new Date()
    });
    return acc;
  }, {} as Record<string, Array<{ organizationName: string; organizationSlug: string; redeemedAt: Date }>>);

  return {
    vouchers: vouchers.map(v => ({
      id: v.id,
      code: v.code,
      amount: v.amount,
      maxUses: v.maxUses,
      usedCount: v.usedCount,
      isActive: v.isActive,
      expiresAt: v.expiresAt,
      createdAt: v.createdAt,
      redemptions: redemptionsByVoucher[v.id] || []
    }))
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const formData = await request.formData();
    const amount = parseFloat(formData.get('amount')?.toString() || '0');
    const maxUsesStr = formData.get('maxUses')?.toString();
    const expiresAt = formData.get('expiresAt')?.toString();
    const customCode = formData.get('customCode')?.toString().trim().toUpperCase();

    if (amount <= 0) {
      return fail(400, { error: 'Amount must be greater than 0' });
    }

    let code = customCode || generateVoucherCode();

    // Check if custom code already exists
    if (customCode) {
      const existing = await prisma.voucherCode.findUnique({
        where: { code }
      });
      if (existing) {
        return fail(400, { error: 'A voucher with this code already exists' });
      }
    }

    await prisma.voucherCode.create({
      data: {
        code,
        amount,
        maxUses: maxUsesStr ? parseInt(maxUsesStr) : 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: locals.user?.id || 'system'
      }
    });

    return { success: true, code };
  },

  toggle: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();

    if (!id) {
      return fail(400, { error: 'Voucher ID required' });
    }

    const voucher = await prisma.voucherCode.findUnique({
      where: { id }
    });

    if (!voucher) {
      return fail(404, { error: 'Voucher not found' });
    }

    await prisma.voucherCode.update({
      where: { id },
      data: { isActive: !voucher.isActive }
    });

    return { success: true };
  },

  delete: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();

    if (!id) {
      return fail(400, { error: 'Voucher ID required' });
    }

    // Delete redemptions first, then voucher
    await prisma.$transaction([
      prisma.voucherRedemption.deleteMany({
        where: { voucherId: id }
      }),
      prisma.voucherCode.delete({
        where: { id }
      })
    ]);

    return { success: true };
  }
};
