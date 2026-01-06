import { redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const originalSessionId = cookies.get('admin_original_session');

  if (!originalSessionId) {
    throw redirect(302, '/dashboard');
  }

  // Validate the original session is still valid
  const { session } = await lucia.validateSession(originalSessionId);

  if (!session) {
    // Original session expired, clear the cookie and redirect to login
    cookies.delete('admin_original_session', { path: '/' });
    throw redirect(302, '/login');
  }

  // Restore the original admin session
  const sessionCookie = lucia.createSessionCookie(originalSessionId);
  cookies.set(sessionCookie.name, sessionCookie.value, {
    path: '.',
    ...sessionCookie.attributes
  });

  // Clear the original session cookie
  cookies.delete('admin_original_session', { path: '/' });

  throw redirect(302, '/admin/users');
};
