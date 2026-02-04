import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import bcrypt from 'bcryptjs';
import { generateCode } from '$lib/utils';
import { sendOrganizationInvite } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const organization = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true, lastLoginAt: true }
          },
          department: {
            select: { id: true, name: true }
          }
        },
        orderBy: [{ role: 'asc' }, { joinedAt: 'desc' }]
      },
      departments: {
        include: {
          _count: { select: { members: true } }
        }
      },
      subjects: true,
      terms: {
        orderBy: { startDate: 'desc' }
      },
      invites: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: { members: true, classes: true }
      }
    }
  });

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  return { organization };
};

export const actions: Actions = {
  update: async ({ params, request }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const type = formData.get('type')?.toString() as any;
    const email = formData.get('email')?.toString() || null;
    const phone = formData.get('phone')?.toString() || null;
    const website = formData.get('website')?.toString() || null;
    const address = formData.get('address')?.toString() || null;
    const city = formData.get('city')?.toString() || null;
    const state = formData.get('state')?.toString() || null;
    const zipCode = formData.get('zipCode')?.toString() || null;
    const country = formData.get('country')?.toString() || 'US';
    const timezone = formData.get('timezone')?.toString() || 'America/New_York';
    const subscriptionTier = formData.get('subscriptionTier')?.toString() as any;
    const maxStudents = parseInt(formData.get('maxStudents')?.toString() || '999999');
    const maxTeachers = parseInt(formData.get('maxTeachers')?.toString() || '999999');

    if (!name || !type) {
      return fail(400, { error: 'Name and type are required' });
    }

    await prisma.organization.update({
      where: { id: params.id },
      data: {
        name,
        type,
        email,
        phone,
        website,
        address,
        city,
        state,
        zipCode,
        country,
        timezone,
        subscriptionTier,
        maxStudents,
        maxTeachers
      }
    });

    return { success: true };
  },

  inviteMember: async ({ params, request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const role = formData.get('role')?.toString() as any;

    if (!email || !role) {
      return fail(400, { error: 'Email and role are required' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: params.id }
    });

    if (!org) {
      return fail(404, { error: 'Organization not found' });
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: params.id,
        user: { email }
      }
    });

    if (existingMember) {
      return fail(400, { error: 'User is already a member of this organization' });
    }

    // Create invite token
    const token = generateCode(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.organizationInvite.create({
      data: {
        organizationId: params.id,
        email,
        role,
        token,
        expiresAt
      }
    });

    // Send invite email
    await sendOrganizationInvite(email, org.name, role, token, locals.user?.name || undefined);

    return { success: true, invited: email };
  },

  removeMember: async ({ params, request }) => {
    const formData = await request.formData();
    const memberId = formData.get('memberId')?.toString();

    if (!memberId) {
      return fail(400, { error: 'Member ID required' });
    }

    await prisma.organizationMember.delete({
      where: { id: memberId }
    });

    return { success: true };
  },

  updateMemberRole: async ({ request }) => {
    const formData = await request.formData();
    const memberId = formData.get('memberId')?.toString();
    const role = formData.get('role')?.toString() as any;

    if (!memberId || !role) {
      return fail(400, { error: 'Member ID and role required' });
    }

    await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role }
    });

    return { success: true };
  },

  cancelInvite: async ({ request }) => {
    const formData = await request.formData();
    const inviteId = formData.get('inviteId')?.toString();

    if (!inviteId) {
      return fail(400, { error: 'Invite ID required' });
    }

    await prisma.organizationInvite.delete({
      where: { id: inviteId }
    });

    return { success: true };
  },

  createDepartment: async ({ params, request }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const description = formData.get('description')?.toString() || null;

    if (!name) {
      return fail(400, { error: 'Department name is required' });
    }

    await prisma.department.create({
      data: {
        organizationId: params.id,
        name,
        description
      }
    });

    return { success: true };
  },

  deleteDepartment: async ({ request }) => {
    const formData = await request.formData();
    const departmentId = formData.get('departmentId')?.toString();

    if (!departmentId) {
      return fail(400, { error: 'Department ID required' });
    }

    await prisma.department.delete({
      where: { id: departmentId }
    });

    return { success: true };
  },

  createSubject: async ({ params, request }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const code = formData.get('code')?.toString() || null;
    const departmentId = formData.get('departmentId')?.toString() || null;

    if (!name) {
      return fail(400, { error: 'Subject name is required' });
    }

    await prisma.subject.create({
      data: {
        organizationId: params.id,
        name,
        code,
        departmentId
      }
    });

    return { success: true };
  },

  deleteSubject: async ({ request }) => {
    const formData = await request.formData();
    const subjectId = formData.get('subjectId')?.toString();

    if (!subjectId) {
      return fail(400, { error: 'Subject ID required' });
    }

    await prisma.subject.delete({
      where: { id: subjectId }
    });

    return { success: true };
  },

  createTerm: async ({ params, request }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const startDate = formData.get('startDate')?.toString();
    const endDate = formData.get('endDate')?.toString();
    const isCurrent = formData.get('isCurrent') === 'true';

    if (!name || !startDate || !endDate) {
      return fail(400, { error: 'All term fields are required' });
    }

    // If setting as current, unset others
    if (isCurrent) {
      await prisma.academicTerm.updateMany({
        where: { organizationId: params.id },
        data: { isCurrent: false }
      });
    }

    await prisma.academicTerm.create({
      data: {
        organizationId: params.id,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent
      }
    });

    return { success: true };
  },

  deleteTerm: async ({ request }) => {
    const formData = await request.formData();
    const termId = formData.get('termId')?.toString();

    if (!termId) {
      return fail(400, { error: 'Term ID required' });
    }

    await prisma.academicTerm.delete({
      where: { id: termId }
    });

    return { success: true };
  },

  togglePowerSchool: async ({ params }) => {
    const org = await prisma.organization.findUnique({
      where: { id: params.id },
      select: { powerSchoolEnabled: true }
    });

    if (!org) {
      return fail(404, { error: 'Organization not found' });
    }

    await prisma.organization.update({
      where: { id: params.id },
      data: { powerSchoolEnabled: !org.powerSchoolEnabled }
    });

    return { success: true };
  }
};
