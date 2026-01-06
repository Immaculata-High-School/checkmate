import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // Run independent queries in parallel
  const [studentMembership, classMemberships] = await Promise.all([
    // Check if user belongs to an organization and if billing is enabled
    prisma.organizationMember.findFirst({
      where: { userId: locals.user.id },
      select: {
        organization: {
          select: {
            id: true,
            name: true,
            billingEnabled: true,
            balance: true
          }
        }
      }
    }),
    // Get student's classes
    prisma.classMember.findMany({
      where: { userId: locals.user.id },
      select: {
        class: {
          select: {
            id: true,
            name: true,
            description: true,
            joinCode: true,
            theme: true,
            emoji: true,
            archived: true,
            teacher: { select: { name: true } }
          }
        }
      }
    })
  ]);

  // If student is in an org with disabled billing OR zero/negative balance, show the disabled page
  let orgDisabled = false;
  let disabledOrgName = '';
  if (studentMembership?.organization) {
    const org = studentMembership.organization;
    if (!org.billingEnabled || org.balance <= 0) {
      orgDisabled = true;
      disabledOrgName = org.name;
    }
  }

  const classes = classMemberships.map((m) => m.class);
  const classIds = classes.map((c) => c.id);

  // Get pending assignments (depends on class IDs from above)
  const assignments = classIds.length > 0 ? await prisma.classAssignment.findMany({
    where: {
      classId: { in: classIds },
      OR: [{ dueDate: { gte: new Date() } }, { dueDate: null }]
    },
    select: {
      id: true,
      type: true,
      title: true,
      dueDate: true,
      test: { select: { id: true, title: true } },
      studySet: { select: { id: true, title: true } },
      class: { select: { id: true, name: true } }
    },
    orderBy: { dueDate: 'asc' },
    take: 10
  }) : [];

  return {
    classes,
    assignments,
    orgDisabled,
    disabledOrgName
  };
};
