import { lucia, getUserOrgMemberships, getEffectiveRole } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

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

    // Check if this is an impersonated session
    const isImpersonating = !!event.cookies.get('admin_original_session');

    event.locals.user = user;
    event.locals.session = session;
    event.locals.orgMemberships = orgMemberships;
    event.locals.effectiveRole = effectiveRole;
    event.locals.isImpersonating = isImpersonating;
  } else {
    event.locals.user = null;
    event.locals.session = null;
    event.locals.orgMemberships = [];
    event.locals.effectiveRole = 'guest';
    event.locals.isImpersonating = false;
  }

  return resolve(event);
};
