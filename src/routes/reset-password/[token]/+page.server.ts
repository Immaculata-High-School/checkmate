import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import bcrypt from 'bcryptjs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: params.token }
  });

  if (!resetToken) {
    throw error(404, 'Invalid or expired reset link');
  }

  if (new Date() > resetToken.expiresAt) {
    // Clean up expired token
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    throw error(400, 'This reset link has expired. Please request a new one.');
  }

  return {
    email: resetToken.email
  };
};

export const actions: Actions = {
  default: async (event) => {
    const { params, request } = event;
    const formData = await request.formData();
    const password = formData.get('password')?.toString();
    const confirmPassword = formData.get('confirmPassword')?.toString();

    if (!password || password.length < 8) {
      return fail(400, { error: 'Password must be at least 8 characters' });
    }

    if (password !== confirmPassword) {
      return fail(400, { error: 'Passwords do not match' });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: params.token }
    });

    if (!resetToken || new Date() > resetToken.expiresAt) {
      return fail(400, { error: 'Invalid or expired reset link' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    const updatedUser = await prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword }
    });

    logAudit({ userId: updatedUser.id, action: 'PASSWORD_RESET_COMPLETED', details: { email: resetToken.email }, ...getRequestInfo(event) });

    // Delete the token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    });

    throw redirect(302, '/login?reset=success');
  }
};
