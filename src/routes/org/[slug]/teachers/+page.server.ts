import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { sendOrganizationInvite, sendPasswordReset } from '$lib/server/email';
import { generateCode } from '$lib/utils';
import bcrypt from 'bcryptjs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const organization = await prisma.organization.findUnique({
    where: { slug: params.slug }
  });

  if (!organization) {
    return { teachers: [], invites: [] };
  }

  const teachers = await prisma.organizationMember.findMany({
    where: {
      organizationId: organization.id,
      role: { in: ['ORG_OWNER', 'ORG_ADMIN', 'TEACHER', 'TEACHING_ASSISTANT'] }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          lastLoginAt: true,
          emailVerified: true,
          createdAt: true
        }
      },
      department: {
        select: { name: true }
      }
    },
    orderBy: { joinedAt: 'desc' }
  });

  const invites = await prisma.organizationInvite.findMany({
    where: {
      organizationId: organization.id,
      role: { in: ['TEACHER', 'TEACHING_ASSISTANT'] },
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  return { teachers, invites };
};

export const actions: Actions = {
  invite: async ({ request, params, locals }) => {
    const organization = await prisma.organization.findUnique({
      where: { slug: params.slug }
    });

    if (!organization) {
      return fail(404, { error: 'Organization not found' });
    }

    const formData = await request.formData();
    const email = formData.get('email')?.toString().toLowerCase().trim();
    const role = formData.get('role')?.toString() || 'TEACHER';
    const name = formData.get('name')?.toString().trim();

    if (!email) {
      return fail(400, { error: 'Email is required' });
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
        user: { email }
      }
    });

    if (existingMember) {
      return fail(400, { error: 'This person is already a member of your organization' });
    }

    // Check for existing invite (not expired)
    const existingInvite = await prisma.organizationInvite.findFirst({
      where: {
        organizationId: organization.id,
        email,
        expiresAt: { gt: new Date() }
      }
    });

    if (existingInvite) {
      return fail(400, { error: 'An invite has already been sent to this email' });
    }

    // Delete any expired invites for this email
    await prisma.organizationInvite.deleteMany({
      where: {
        organizationId: organization.id,
        email
      }
    });

    // Create invite
    const token = generateCode(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.organizationInvite.create({
      data: {
        organizationId: organization.id,
        email,
        role: role as any,
        token,
        expiresAt
      }
    });

    // Send invite email
    await sendOrganizationInvite(email, organization.name, role, token, locals.user?.name || undefined);

    return { success: true, message: `Invitation sent to ${email}` };
  },

  bulkInvite: async ({ request, params, locals }) => {
    const organization = await prisma.organization.findUnique({
      where: { slug: params.slug }
    });

    if (!organization) {
      return fail(404, { error: 'Organization not found' });
    }

    const formData = await request.formData();
    const emailsRaw = formData.get('emails')?.toString().trim();
    const role = formData.get('role')?.toString() || 'TEACHER';

    if (!emailsRaw) {
      return fail(400, { error: 'Please enter at least one email address' });
    }

    // Parse emails (comma, semicolon, newline, or space separated)
    const emails = emailsRaw
      .split(/[,;\s\n]+/)
      .map(e => e.toLowerCase().trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      return fail(400, { error: 'No valid email addresses found' });
    }

    if (emails.length > 50) {
      return fail(400, { error: 'Maximum 50 invites at a time' });
    }

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (const email of emails) {
      // Check if already a member
      const existingMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: organization.id,
          user: { email }
        }
      });

      if (existingMember) {
        skipCount++;
        continue;
      }

      // Check for existing invite (not expired)
      const existingInvite = await prisma.organizationInvite.findFirst({
        where: {
          organizationId: organization.id,
          email,
          expiresAt: { gt: new Date() }
        }
      });

      if (existingInvite) {
        skipCount++;
        continue;
      }

      try {
        // Delete any expired invites
        await prisma.organizationInvite.deleteMany({
          where: { organizationId: organization.id, email }
        });

        // Create invite
        const token = generateCode(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.organizationInvite.create({
          data: {
            organizationId: organization.id,
            email,
            role: role as any,
            token,
            expiresAt
          }
        });

        // Send invite email
        await sendOrganizationInvite(email, organization.name, role, token, locals.user?.name || undefined);
        successCount++;
      } catch (err) {
        errors.push(email);
      }
    }

    let message = `Sent ${successCount} invitation(s)`;
    if (skipCount > 0) {
      message += `, skipped ${skipCount} (already member or invited)`;
    }
    if (errors.length > 0) {
      message += `. Failed: ${errors.join(', ')}`;
    }

    return { success: true, message, successCount, skipCount, errorCount: errors.length };
  },

  cancelInvite: async ({ request, params }) => {
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

  resetPassword: async ({ request, params }) => {
    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return fail(404, { error: 'User not found' });
    }

    // Generate reset token
    const token = generateCode(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email }
    });

    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt
      }
    });

    await sendPasswordReset(user.email, token);

    return { success: true, message: `Password reset email sent to ${user.email}` };
  },

  setTempPassword: async ({ request, params }) => {
    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

    // Generate temp password
    const tempPassword = generateCode(12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return { success: true, tempPassword, message: 'Temporary password set. Share this with the teacher securely.' };
  },

  removeTeacher: async ({ request, params }) => {
    const formData = await request.formData();
    const memberId = formData.get('memberId')?.toString();

    if (!memberId) {
      return fail(400, { error: 'Member ID required' });
    }

    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId }
    });

    if (!member || member.role === 'ORG_OWNER') {
      return fail(400, { error: 'Cannot remove this member' });
    }

    await prisma.organizationMember.delete({
      where: { id: memberId }
    });

    return { success: true };
  },

  impersonate: async ({ request, params, cookies }) => {
    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

    // Create impersonation session
    const sessionId = generateCode(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // 2 hour impersonation session

    // Store original session
    const originalSession = cookies.get('auth_session');
    if (originalSession) {
      cookies.set('original_session', originalSession, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 2
      });
    }

    // Create new session for impersonated user
    await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        expiresAt
      }
    });

    cookies.set('auth_session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 2
    });

    return { impersonating: true, redirect: '/teacher' };
  }
};
