import { redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
  const originalSessionId = cookies.get('admin_original_session');
  const returnOrg = cookies.get('admin_return_org');

  if (!originalSessionId) {
    throw redirect(302, '/dashboard');
  }

  // Validate the original session is still valid
  const { session } = await lucia.validateSession(originalSessionId);

  if (!session) {
    // Original session expired, clear the cookies and redirect to login
    cookies.delete('admin_original_session', { path: '/' });
    cookies.delete('admin_return_org', { path: '/' });
    throw redirect(302, '/login');
  }

  // Restore the original admin session
  const sessionCookie = lucia.createSessionCookie(originalSessionId);
  cookies.set(sessionCookie.name, sessionCookie.value, {
    path: '.',
    ...sessionCookie.attributes
  });

  // Clear the impersonation cookies
  cookies.delete('admin_original_session', { path: '/' });
  cookies.delete('admin_return_org', { path: '/' });

  // Redirect to the appropriate page
  if (returnOrg) {
    // Org admin - return to their org's teachers page
    throw redirect(302, `/org/${returnOrg}/teachers`);
  }

  // Platform admin - return to admin users page
  throw redirect(302, '/admin/users');
};
