import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) throw error(401, 'Not authenticated');

  const organization = await prisma.organization.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      powerSchoolEnabled: true,
      name: true
    }
  });

  if (!organization) throw error(404, 'Organization not found');

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: locals.user.id,
      organizationId: organization.id,
      role: { in: ['ORG_OWNER', 'ORG_ADMIN'] },
      isActive: true
    }
  });

  if (!membership) throw error(403, 'Not authorized');

  return {
    powerSchoolEnabled: organization.powerSchoolEnabled
  };
};
