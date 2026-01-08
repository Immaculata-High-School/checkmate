import { lucia, getUserOrgMemberships, getEffectiveRole } from '$lib/server/auth';
import { startQueueProcessor } from '$lib/server/rateLimiter';
import type { Handle } from '@sveltejs/kit';

// Start the grading queue processor when the server starts
startQueueProcessor();

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(lucia.sessionCookieName);

  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
    event.locals.orgMemberships = [];
    event.locals.effectiveRole = 'guest';
    return resolve(event);
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (session && session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });
  }

  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });
  }

  if (user) {
    const orgMemberships = await getUserOrgMemberships(user.id);
    const effectiveRole = getEffectiveRole(user.platformRole, orgMemberships);

    // Check if this is an impersonated session (platform admin)
    const isAdminImpersonating = !!event.cookies.get('admin_original_session');
    // Check if this is an org admin impersonation
    const isOrgAdminImpersonating = !!event.cookies.get('original_session');
    const orgAdminReturnSlug = event.cookies.get('org_admin_return_slug') || null;

    event.locals.user = user;
    event.locals.session = session;
    event.locals.orgMemberships = orgMemberships;
    event.locals.effectiveRole = effectiveRole;
    event.locals.isImpersonating = isAdminImpersonating;
    event.locals.isOrgAdminImpersonating = isOrgAdminImpersonating;
    event.locals.orgAdminReturnSlug = orgAdminReturnSlug;
  } else {
    event.locals.user = null;
    event.locals.session = null;
    event.locals.orgMemberships = [];
    event.locals.effectiveRole = 'guest';
    event.locals.isImpersonating = false;
    event.locals.isOrgAdminImpersonating = false;
    event.locals.orgAdminReturnSlug = null;
  }

  return resolve(event);
};
