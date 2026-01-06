import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import bcrypt from 'bcryptjs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    user: locals.user
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();

    if (!name) {
      return fail(400, { error: 'Name is required' });
    }

    await prisma.user.update({
      where: { id: locals.user!.id },
      data: { name }
    });

    return { success: true, message: 'Profile updated successfully' };
  },

  updatePassword: async ({ request, locals }) => {
    const formData = await request.formData();
    const currentPassword = formData.get('currentPassword')?.toString();
    const newPassword = formData.get('newPassword')?.toString();
    const confirmPassword = formData.get('confirmPassword')?.toString();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return fail(400, { passwordError: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return fail(400, { passwordError: 'New passwords do not match' });
    }

    if (newPassword.length < 8) {
      return fail(400, { passwordError: 'Password must be at least 8 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { id: locals.user!.id }
    });

    if (!user || !user.password) {
      return fail(400, { passwordError: 'Cannot verify current password' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return fail(400, { passwordError: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: locals.user!.id },
      data: { password: hashedPassword }
    });

    return { passwordSuccess: true, message: 'Password updated successfully' };
  }
};
