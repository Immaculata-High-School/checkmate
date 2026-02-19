import { prisma } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import bcrypt from 'bcryptjs';
import { generateCode } from '$lib/utils';
import { sendPasswordReset } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const search = url.searchParams.get('search') || '';
  const role = url.searchParams.get('role') || '';
  const status = url.searchParams.get('status') || '';

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (role) {
    where.platformRole = role;
  }

  if (status === 'active') {
    where.suspended = false;
  } else if (status === 'suspended') {
    where.suspended = true;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      platformRole: true,
      suspended: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      orgMemberships: {
        include: {
          organization: {
            select: { id: true, name: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    users,
    filters: { search, role, status }
  };
};

export const actions: Actions = {
  create: async (event) => {
    const formData = await event.request.formData();
    const email = formData.get('email')?.toString();
    const name = formData.get('name')?.toString();
    const platformRole = formData.get('platformRole')?.toString() as any || 'USER';
    const sendInvite = formData.get('sendCredentials') === 'true';

    if (!email || !name) {
      return fail(400, { error: 'Email and name are required' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return fail(400, { error: 'A user with this email already exists' });
    }

    // Generate a random password (user will reset via link)
    const tempPassword = generateCode(16);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        platformRole,
        emailVerified: true
      }
    });

    logAudit({ userId: event.locals.user?.id, action: 'ADMIN_USER_CREATED', entityType: 'User', entityId: newUser.id, details: { email, name, platformRole }, ...getRequestInfo(event) });

    if (sendInvite) {
      // Create password reset token and send email
      const resetToken = generateCode(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.passwordResetToken.create({
        data: {
          email,
          token: resetToken,
          expiresAt
        }
      });

      await sendPasswordReset(email, resetToken);
      return { success: true, inviteSent: true };
    }

    return { success: true, tempPassword };
  },

  updateRole: async (event) => {
    const formData = await event.request.formData();
    const userId = formData.get('userId')?.toString();
    const platformRole = formData.get('platformRole')?.toString() as any;

    if (!userId || !platformRole) {
      return fail(400, { error: 'User ID and role are required' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { platformRole }
    });

    logAudit({ userId: event.locals.user?.id, action: 'ADMIN_ROLE_CHANGED', entityType: 'User', entityId: userId, details: { newRole: platformRole }, ...getRequestInfo(event) });

    return { success: true };
  },

  toggleSuspend: async (event) => {
    const formData = await event.request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return fail(404, { error: 'User not found' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { suspended: !user.suspended }
    });

    logAudit({ userId: event.locals.user?.id, action: user.suspended ? 'ADMIN_USER_UNSUSPENDED' : 'ADMIN_USER_SUSPENDED', entityType: 'User', entityId: userId, details: { email: user.email }, ...getRequestInfo(event) });

    return { success: true };
  },

  resetPassword: async (event) => {
    const formData = await event.request.formData();
    const userId = formData.get('userId')?.toString();
    const sendResetEmail = formData.get('sendEmail') === 'true';

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return fail(404, { error: 'User not found' });
    }

    if (sendResetEmail) {
      // Create password reset token and send email
      const resetToken = generateCode(32);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token: resetToken,
          expiresAt
        }
      });

      await sendPasswordReset(user.email, resetToken);
      logAudit({ userId: event.locals.user?.id, action: 'ADMIN_PASSWORD_RESET_EMAIL', entityType: 'User', entityId: userId, details: { email: user.email }, ...getRequestInfo(event) });
      return { success: true, passwordReset: true, emailSent: true };
    }

    // If not sending email, generate a new temp password to show
    const tempPassword = generateCode(12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    logAudit({ userId: event.locals.user?.id, action: 'ADMIN_PASSWORD_RESET_MANUAL', entityType: 'User', entityId: userId, details: { email: user.email }, ...getRequestInfo(event) });

    return { success: true, tempPassword };
  },

  delete: async (event) => {
    const formData = await event.request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    logAudit({ userId: event.locals.user?.id, action: 'ADMIN_USER_DELETED', entityType: 'User', entityId: userId, details: { email: user?.email, name: user?.name }, ...getRequestInfo(event) });

    await prisma.user.delete({ where: { id: userId } });

    return { success: true };
  },

  impersonate: async (event) => {
    const { cookies, locals } = event;
    const formData = await event.request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

    // Verify admin permission
    if (locals.user?.platformRole !== 'PLATFORM_ADMIN') {
      return fail(403, { error: 'Not authorized' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return fail(404, { error: 'User not found' });
    }

    // Store original admin session ID in a cookie for "return to admin" functionality
    const currentSessionId = cookies.get(lucia.sessionCookieName);
    if (currentSessionId) {
      cookies.set('admin_original_session', currentSessionId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 24 hours
      });
    }

    // Create new session for target user
    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });

    logAudit({ userId: locals.user?.id, action: 'ADMIN_IMPERSONATE', entityType: 'User', entityId: userId, details: { targetEmail: targetUser.email, targetName: targetUser.name }, ...getRequestInfo(event) });

    throw redirect(302, '/dashboard');
  }
};
