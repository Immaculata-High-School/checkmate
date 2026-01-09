import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { invalidateSessionCache } from '$lib/server/cache';
import type { Actions, PageServerLoad } from './$types';

// Handle GET requests - redirect to login
export const load: PageServerLoad = async ({ cookies }) => {
  const sessionId = cookies.get('auth_session');

  if (sessionId) {
    // Invalidate session cache first
    invalidateSessionCache(sessionId);
    
    await prisma.session.delete({
      where: { id: sessionId }
    }).catch(() => {
      // Session might not exist, ignore error
    });
  }

  cookies.delete('auth_session', { path: '/' });
  throw redirect(302, '/login');
};

export const actions: Actions = {
  default: async ({ cookies }) => {
    const sessionId = cookies.get('auth_session');

    if (sessionId) {
      // Invalidate session cache first
      invalidateSessionCache(sessionId);
      
      // Delete session from database
      await prisma.session.delete({
        where: { id: sessionId }
      }).catch(() => {
        // Session might not exist, ignore error
      });
    }

    // Clear session cookie
    cookies.delete('auth_session', { path: '/' });

    throw redirect(302, '/login');
  }
};
