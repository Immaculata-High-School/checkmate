import { fail, redirect } from '@sveltejs/kit';
import { lucia, invalidateUserOrgCache } from '$lib/server/auth';
import { prisma } from '$lib/server/db';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import bcrypt from 'bcryptjs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const { token } = params;

  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: { organization: true }
  });

  if (!invite) {
    return { error: 'Invalid or expired invitation link.' };
  }

  if (invite.expiresAt < new Date()) {
    return { error: 'This invitation has expired. Please ask your administrator for a new one.' };
  }

  // If user is already logged in
  if (locals.user) {
    // Check if already a member
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: locals.user.id
        }
      }
    });

    // If already a member, check if they need a role upgrade
    if (existingMembership) {
      const higherRoles = ['ORG_OWNER', 'ORG_ADMIN', 'DEPARTMENT_HEAD', 'TEACHER', 'TEACHING_ASSISTANT'];
      const inviteRoleIndex = higherRoles.indexOf(invite.role);
      const currentRoleIndex = higherRoles.indexOf(existingMembership.role);
      
      // If invite role is higher (lower index means higher role), show upgrade option
      if (inviteRoleIndex !== -1 && (currentRoleIndex === -1 || inviteRoleIndex < currentRoleIndex)) {
        return {
          invite: {
            email: invite.email,
            role: invite.role,
            organizationName: invite.organization.name
          },
          isLoggedIn: true,
          userEmail: locals.user.email,
          existingRole: existingMembership.role,
          isRoleUpgrade: true
        };
      }
      
      // Already a member with same or higher role
      throw redirect(302, '/dashboard');
    }

    return {
      invite: {
        email: invite.email,
        role: invite.role,
        organizationName: invite.organization.name
      },
      isLoggedIn: true,
      userEmail: locals.user.email
    };
  }

  return {
    invite: {
      email: invite.email,
      role: invite.role,
      organizationName: invite.organization.name
    },
    isLoggedIn: false
  };
};

export const actions: Actions = {
  accept: async (event) => {
    const { params, cookies, locals } = event;
    const { token } = params;

    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
      include: { organization: true }
    });

    if (!invite || invite.expiresAt < new Date()) {
      return fail(400, { error: 'Invalid or expired invitation.' });
    }

    if (!locals.user) {
      return fail(400, { error: 'You must be logged in to accept this invitation.' });
    }

    // Check if already a member (for role upgrade case)
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: locals.user.id
        }
      }
    });

    if (existingMembership) {
      // Update existing membership with new role
      await prisma.organizationMember.update({
        where: { id: existingMembership.id },
        data: { role: invite.role }
      });
    } else {
      // Add user to organization
      await prisma.organizationMember.create({
        data: {
          userId: locals.user.id,
          organizationId: invite.organizationId,
          role: invite.role
        }
      });
    };

    // Invalidate org membership cache so role takes effect immediately
    invalidateUserOrgCache(locals.user.id);

    // Delete the invite
    await prisma.organizationInvite.delete({
      where: { id: invite.id }
    });

    logAudit({ userId: locals.user.id, action: 'INVITE_ACCEPTED', entityType: 'Organization', entityId: invite.organizationId, organizationId: invite.organizationId, details: { role: invite.role, orgName: invite.organization.name }, ...getRequestInfo(event) });

    throw redirect(302, '/dashboard');
  },

  register: async (event) => {
    const { request, params, cookies } = event;
    const { token } = params;
    const formData = await request.formData();

    const name = formData.get('name')?.toString().trim();
    const password = formData.get('password')?.toString();

    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
      include: { organization: true }
    });

    if (!invite || invite.expiresAt < new Date()) {
      return fail(400, { error: 'Invalid or expired invitation.' });
    }

    if (!name || !password) {
      return fail(400, { error: 'Name and password are required.' });
    }

    if (password.length < 8) {
      return fail(400, { error: 'Password must be at least 8 characters.' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email }
    });

    if (existingUser) {
      return fail(400, { error: 'An account with this email already exists. Please sign in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: invite.email,
        password: hashedPassword,
        platformRole: 'USER',
        emailVerified: true // Email is verified via invitation
      }
    });

    // Add to organization
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role
      }
    });

    // Delete the invite
    await prisma.organizationInvite.delete({
      where: { id: invite.id }
    });

    // Create session
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });

    logAudit({ userId: user.id, action: 'INVITE_REGISTERED', entityType: 'Organization', entityId: invite.organizationId, organizationId: invite.organizationId, details: { role: invite.role, orgName: invite.organization.name, email: invite.email }, ...getRequestInfo(event) });

    throw redirect(302, '/dashboard');
  }
};
