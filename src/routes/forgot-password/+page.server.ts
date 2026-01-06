import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { generateCode } from '$lib/utils';
import { sendPasswordReset } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    return { redirect: '/dashboard' };
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString()?.toLowerCase().trim();

    if (!email) {
      return fail(400, { error: 'Email is required', email });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true };
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email }
    });

    // Create new token
    const token = generateCode(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt
      }
    });

    // Send email
    await sendPasswordReset(email, token);

    return { success: true };
  }
};
