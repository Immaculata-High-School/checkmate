import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { generateCode } from '$lib/utils';
import { sendOrganizationInvite } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const search = url.searchParams.get('search') || '';
  const type = url.searchParams.get('type') || '';
  const status = url.searchParams.get('status') || '';

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (type) {
    where.type = type;
  }

  if (status === 'active') {
    where.isActive = true;
  } else if (status === 'inactive') {
    where.isActive = false;
  }

  const organizations = await prisma.organization.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      isActive: true,
      subscriptionTier: true,
      balance: true,
      billingEnabled: true,
      monthlyUserFee: true,
      createdAt: true,
      _count: {
        select: { members: true, classes: true }
      },
      members: {
        where: { role: 'ORG_OWNER' },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    organizations,
    filters: { search, type, status }
  };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const type = formData.get('type')?.toString() as any;
    const ownerEmail = formData.get('ownerEmail')?.toString();
    const ownerName = formData.get('ownerName')?.toString();
    const subscriptionTier = formData.get('subscriptionTier')?.toString() as any || 'FREE';
    const monthlyUserFee = parseFloat(formData.get('monthlyUserFee')?.toString() || '5');

    if (!name || !type || !ownerEmail || !ownerName) {
      return fail(400, { error: 'All fields are required' });
    }

    if (monthlyUserFee < 0) {
      return fail(400, { error: 'Monthly fee cannot be negative' });
    }

    // Check if organization name already exists
    const existingOrg = await prisma.organization.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existingOrg) {
      return fail(400, { error: 'An organization with this name already exists' });
    }

    // Generate unique slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the organization
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        type,
        subscriptionTier,
        monthlyUserFee
      }
    });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ownerEmail }
    });

    if (existingUser) {
      // User exists - add them directly as org owner
      await prisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: existingUser.id,
          role: 'ORG_OWNER'
        }
      });
    } else {
      // User doesn't exist - create invite link
      const inviteToken = generateCode(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.organizationInvite.create({
        data: {
          organizationId: organization.id,
          email: ownerEmail,
          role: 'ORG_OWNER',
          token: inviteToken,
          expiresAt
        }
      });

      // Send invite email
      await sendOrganizationInvite(ownerEmail, name, 'ORG_OWNER', inviteToken);
    }

    return { success: true, organizationId: organization.id };
  },

  toggleActive: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();

    if (!id) {
      return fail(400, { error: 'Organization ID required' });
    }

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return fail(404, { error: 'Organization not found' });
    }

    await prisma.organization.update({
      where: { id },
      data: { isActive: !org.isActive }
    });

    return { success: true };
  },

  delete: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();

    if (!id) {
      return fail(400, { error: 'Organization ID required' });
    }

    await prisma.organization.delete({ where: { id } });

    return { success: true };
  },

  addBalance: async ({ request, locals }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const amount = parseFloat(formData.get('amount')?.toString() || '0');
    const description = formData.get('description')?.toString() || 'Admin credit';

    if (!id) {
      return fail(400, { error: 'Organization ID required' });
    }

    if (amount <= 0) {
      return fail(400, { error: 'Amount must be greater than 0' });
    }

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return fail(404, { error: 'Organization not found' });
    }

    const newBalance = org.balance + amount;

    await prisma.$transaction([
      prisma.organization.update({
        where: { id },
        data: { 
          balance: newBalance,
          billingEnabled: true // Re-enable if it was disabled
        }
      }),
      prisma.billingTransaction.create({
        data: {
          organizationId: id,
          type: 'CREDIT',
          amount: amount,
          balance: newBalance,
          description,
          createdById: locals.user?.id
        }
      })
    ]);

    return { success: true, balanceAdded: true, amount, newBalance };
  },

  updateMonthlyFee: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const monthlyUserFee = parseFloat(formData.get('monthlyUserFee')?.toString() || '5');

    if (!id) {
      return fail(400, { error: 'Organization ID required' });
    }

    if (monthlyUserFee < 0) {
      return fail(400, { error: 'Monthly fee cannot be negative' });
    }

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return fail(404, { error: 'Organization not found' });
    }

    await prisma.organization.update({
      where: { id },
      data: { monthlyUserFee }
    });

    return { success: true, feeUpdated: true };
  },

  toggleBilling: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();

    if (!id) {
      return fail(400, { error: 'Organization ID required' });
    }

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return fail(404, { error: 'Organization not found' });
    }

    await prisma.organization.update({
      where: { id },
      data: { billingEnabled: !org.billingEnabled }
    });

    return { success: true };
  }
};
