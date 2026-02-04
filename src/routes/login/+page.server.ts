import { fail, redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';
import { prisma } from '$lib/server/db';
import bcrypt from 'bcryptjs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (locals.user) {
    const redirectTo = url.searchParams.get('redirect');
    // Only allow redirects to local paths starting with /
    if (redirectTo && redirectTo.startsWith('/')) {
      throw redirect(302, redirectTo);
    }
    throw redirect(302, '/dashboard');
  }
  return {
    redirect: url.searchParams.get('redirect') || null
  };
};

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString().toLowerCase().trim();
    const password = formData.get('password')?.toString();
    const redirectTo = url.searchParams.get('redirect');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required', email });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return fail(400, { error: 'Invalid email or password', email });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return fail(400, { error: 'Invalid email or password', email });
    }

    if (user.suspended) {
      return fail(403, { error: 'Your account has been suspended', email });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Create session
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });

    // Redirect to specified path or dashboard
    if (redirectTo && redirectTo.startsWith('/')) {
      throw redirect(302, redirectTo);
    }
    throw redirect(302, '/dashboard');
  }
};
