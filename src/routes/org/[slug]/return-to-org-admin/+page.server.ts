import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export const load = async ({ cookies, params }: RequestEvent) => {
  const originalSessionId = cookies.get('original_session');
  const slug = params.slug as string;

  // Clear impersonation cookies FIRST (before any redirect)
  cookies.delete('original_session', { path: '/' });
  cookies.delete('org_admin_return_slug', { path: '/' });

  if (!originalSessionId) {
    // No original session found, redirect to org page
    throw redirect(302, `/org/${slug}`);
  }

  // Restore the original session
  cookies.set('auth_session', originalSessionId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });

  // Redirect back to org teachers page
  throw redirect(302, `/org/${slug}/teachers`);
};
