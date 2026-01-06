import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  if (locals.effectiveRole !== 'teacher' && locals.effectiveRole !== 'admin') {
    throw redirect(302, '/student');
  }

  // Check if user is an org owner/admin - redirect them to their org dashboard
  const orgOwnership = locals.orgMemberships?.find(
    (m: any) => m.role === 'ORG_OWNER' || m.role === 'ORG_ADMIN'
  );

  if (orgOwnership && orgOwnership.orgSlug) {
    throw redirect(302, `/org/${orgOwnership.orgSlug}`);
  }

  // Check if user belongs to an organization and if billing is enabled
  const teacherMembership = await prisma.organizationMember.findFirst({
    where: { userId: locals.user.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          billingEnabled: true,
          balance: true
        }
      }
    }
  });

  // If teacher is in an org with disabled billing OR zero/negative balance, show the disabled page
  let orgDisabled = false;
  let disabledOrgName = '';
  if (teacherMembership?.organization) {
    const org = teacherMembership.organization;
    // Org is disabled if billingEnabled is false OR balance is depleted (<=0)
    if (!org.billingEnabled || org.balance <= 0) {
      orgDisabled = true;
      disabledOrgName = org.name;
    }
  }

  // Get teacher's classes
  const classes = await prisma.class.findMany({
    where: {
      teacherId: locals.user.id,
      archived: false
    },
    include: {
      _count: {
        select: { members: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get recent tests
  const tests = await prisma.test.findMany({
    where: { teacherId: locals.user.id },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { submissions: true, questions: true }
      }
    }
  });

  // Get count of running/pending AI jobs
  const runningJobsCount = await prisma.aIJob.count({
    where: {
      userId: locals.user.id,
      status: { in: ['RUNNING', 'PENDING'] }
    }
  });

  return {
    classes,
    tests,
    runningJobsCount,
    orgDisabled,
    disabledOrgName
  };
};
