import { redirect, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: params.slug },
    include: {
      _count: {
        select: {
          members: true,
          classes: true
        }
      }
    }
  });

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  // Check if user is an owner or admin of this organization
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: locals.user.id,
      organizationId: organization.id,
      role: { in: ['ORG_OWNER', 'ORG_ADMIN'] },
      isActive: true
    }
  });

  if (!membership) {
    throw error(403, 'You do not have permission to access this organization dashboard');
  }

  // Check billing status
  const hasBillingIssue = !organization.billingEnabled || organization.balance <= 0;

  return {
    organization,
    membership,
    user: locals.user,
    hasBillingIssue,
    balance: organization.balance,
    billingEnabled: organization.billingEnabled
  };
};
