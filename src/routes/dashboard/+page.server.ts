import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // Redirect based on effective role
  if (locals.effectiveRole === 'admin' || locals.effectiveRole === 'support') {
    throw redirect(302, '/admin');
  }

  // Check if user is an org owner/admin - redirect them to their org dashboard
  const orgOwnership = locals.orgMemberships?.find(
    (m: any) => m.role === 'ORG_OWNER' || m.role === 'ORG_ADMIN'
  );

  if (orgOwnership && orgOwnership.orgSlug) {
    throw redirect(302, `/org/${orgOwnership.orgSlug}`);
  }

  if (locals.effectiveRole === 'teacher') {
    throw redirect(302, '/teacher');
  }

  // Default to student dashboard
  throw redirect(302, '/student');
};
