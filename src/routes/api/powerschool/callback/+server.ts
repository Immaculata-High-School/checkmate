/**
 * PowerSchool OAuth Callback Handler
 */
import { redirect, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import * as powerSchool from '$lib/server/powerschool';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies, request }) => {
  if (!locals.user) {
    throw redirect(302, '/login?redirect=/teacher/settings');
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  // Verify state
  const savedState = cookies.get('ps_oauth_state');
  cookies.delete('ps_oauth_state', { path: '/' });

  if (errorParam) {
    console.error('PowerSchool OAuth error:', errorParam);
    throw redirect(302, '/teacher/settings?ps_error=' + encodeURIComponent(errorParam));
  }

  if (!code) {
    throw redirect(302, '/teacher/settings?ps_error=no_code');
  }

  if (!savedState || state !== savedState) {
    throw redirect(302, '/teacher/settings?ps_error=invalid_state');
  }

  try {
    // Get the real origin (handles proxies/Codespaces)
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = forwardedHost 
      ? `${forwardedProto}://${forwardedHost}`
      : url.origin;

    console.log('PowerSchool callback - Origin:', origin, 'Redirect URI:', `${origin}/api/powerschool/callback`);

    // Exchange code for tokens
    const tokens = await powerSchool.exchangeCodeForTokens(code, origin);
    console.log('PowerSchool tokens received successfully');

    // Store tokens
    await prisma.powerSchoolToken.upsert({
      where: { userId: locals.user.id },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope
      },
      create: {
        userId: locals.user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope
      }
    });

    // Try to get teacher profile
    try {
      const profile = await powerSchool.getTeacherProfile(locals.user.id);
      
      await prisma.powerSchoolToken.update({
        where: { userId: locals.user.id },
        data: {
          teacherName: profile.name,
          teacherId: profile.id
        }
      });
    } catch (e) {
      console.warn('Failed to fetch teacher profile:', e);
    }

    throw redirect(302, '/teacher/settings?ps_connected=true');
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('PowerSchool token exchange failed:', err);
    throw redirect(302, '/teacher/settings?ps_error=' + encodeURIComponent(err instanceof Error ? err.message : 'Token exchange failed'));
  }
};
