import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // Check if user belongs to an organization and if billing is enabled
  const studentMembership = await prisma.organizationMember.findFirst({
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

  // If student is in an org with disabled billing OR zero/negative balance, show the disabled page
  let orgDisabled = false;
  let disabledOrgName = '';
  if (studentMembership?.organization) {
    const org = studentMembership.organization;
    // Org is disabled if billingEnabled is false OR balance is depleted (<=0)
    if (!org.billingEnabled || org.balance <= 0) {
      orgDisabled = true;
      disabledOrgName = org.name;
    }
  }

  // Get student's classes
  const classMemberships = await prisma.classMember.findMany({
    where: { userId: locals.user.id },
    include: {
      class: {
        include: {
          teacher: { select: { name: true } }
        }
      }
    }
  });

  const classes = classMemberships.map((m) => m.class);

  // Get pending assignments
  const assignments = await prisma.classAssignment.findMany({
    where: {
      classId: { in: classes.map((c) => c.id) },
      OR: [{ dueDate: { gte: new Date() } }, { dueDate: null }]
    },
    include: {
      test: true,
      studySet: true,
      class: true
    },
    orderBy: { dueDate: 'asc' },
    take: 10
  });

  return {
    classes,
    assignments,
    orgDisabled,
    disabledOrgName
  };
};
