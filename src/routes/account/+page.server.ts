import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import bcrypt from 'bcryptjs';
import { sendEmailVerification } from '$lib/server/email';
import { generateCode } from '$lib/utils';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: locals.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      platformRole: true,
      emailVerified: true,
      birthdate: true,
      timezone: true,
      locale: true,
      dashboardPinEnabled: true,
      createdAt: true,
      lastLoginAt: true,
      orgMemberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true }
          }
        }
      }
    }
  });

  if (!user) {
    throw redirect(302, '/login');
  }

  return { user };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const timezone = formData.get('timezone')?.toString() || 'America/New_York';
    const locale = formData.get('locale')?.toString() || 'en-US';
    const birthdate = formData.get('birthdate')?.toString();

    if (!name) {
      return fail(400, { profileError: 'Name is required' });
    }

    await prisma.user.update({
      where: { id: locals.user.id },
      data: {
        name,
        timezone,
        locale,
        birthdate: birthdate ? new Date(birthdate) : null
      }
    });

    return { profileSuccess: true };
  },

  updateEmail: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const newEmail = formData.get('newEmail')?.toString().toLowerCase().trim();
    const password = formData.get('password')?.toString();

    if (!newEmail || !password) {
      return fail(400, { emailError: 'Email and password are required' });
    }

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: locals.user.id }
    });

    if (!user?.password) {
      return fail(400, { emailError: 'Cannot change email for this account' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return fail(400, { emailError: 'Incorrect password' });
    }

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail }
    });

    if (existingUser && existingUser.id !== locals.user.id) {
      return fail(400, { emailError: 'Email is already in use' });
    }

    // Generate verification token
    const token = generateCode(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Delete any existing tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { email: newEmail }
    });

    // Create verification token
    await prisma.emailVerificationToken.create({
      data: {
        email: newEmail,
        token,
        expiresAt
      }
    });

    // Send verification email
    await sendEmailVerification(newEmail, token);

    // Update email (mark as unverified until they verify)
    await prisma.user.update({
      where: { id: locals.user.id },
      data: {
        email: newEmail,
        emailVerified: false
      }
    });

    return { emailSuccess: true, message: 'Verification email sent to your new address' };
  },

  updatePassword: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const currentPassword = formData.get('currentPassword')?.toString();
    const newPassword = formData.get('newPassword')?.toString();
    const confirmPassword = formData.get('confirmPassword')?.toString();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return fail(400, { passwordError: 'All fields are required' });
    }

    if (newPassword.length < 8) {
      return fail(400, { passwordError: 'Password must be at least 8 characters' });
    }

    if (newPassword !== confirmPassword) {
      return fail(400, { passwordError: 'Passwords do not match' });
    }

    const user = await prisma.user.findUnique({
      where: { id: locals.user.id }
    });

    if (!user?.password) {
      return fail(400, { passwordError: 'Cannot change password for this account' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return fail(400, { passwordError: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: locals.user.id },
      data: { password: hashedPassword }
    });

    return { passwordSuccess: true };
  },

  deleteAccount: async ({ request, locals, cookies }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const password = formData.get('password')?.toString();
    const confirmation = formData.get('confirmation')?.toString();

    if (confirmation !== 'DELETE') {
      return fail(400, { deleteError: 'Please type DELETE to confirm' });
    }

    const user = await prisma.user.findUnique({
      where: { id: locals.user.id }
    });

    if (!user?.password) {
      return fail(400, { deleteError: 'Cannot delete this account' });
    }

    const validPassword = await bcrypt.compare(password || '', user.password);
    if (!validPassword) {
      return fail(400, { deleteError: 'Incorrect password' });
    }

    // Delete all sessions
    await prisma.session.deleteMany({
      where: { userId: locals.user.id }
    });

    // Delete user (cascade will handle related data)
    await prisma.user.delete({
      where: { id: locals.user.id }
    });

    // Clear session cookie
    cookies.delete('auth_session', { path: '/' });

    throw redirect(302, '/');
  },

  updateDashboardPin: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const pin = formData.get('pin')?.toString();
    const enabled = formData.get('enabled') === 'true';

    if (enabled && (!pin || !/^\d{6}$/.test(pin))) {
      return fail(400, { pinError: 'PIN must be exactly 6 digits' });
    }

    const data: any = { dashboardPinEnabled: enabled };
    if (pin && enabled) {
      data.dashboardPin = await bcrypt.hash(pin, 10);
    }
    if (!enabled) {
      data.dashboardPin = null;
      data.dashboardPinEnabled = false;
    }

    await prisma.user.update({
      where: { id: locals.user.id },
      data
    });

    return { pinSuccess: true };
  },

  resendVerification: async ({ locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: locals.user.id }
    });

    if (!user) {
      return fail(404, { error: 'User not found' });
    }

    if (user.emailVerified) {
      return fail(400, { error: 'Email is already verified' });
    }

    // Generate new verification token
    const token = generateCode(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Delete any existing tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { email: user.email }
    });

    // Create verification token
    await prisma.emailVerificationToken.create({
      data: {
        email: user.email,
        token,
        expiresAt
      }
    });

    // Send verification email
    await sendEmailVerification(user.email, token);

    return { verificationSent: true };
  }
};
