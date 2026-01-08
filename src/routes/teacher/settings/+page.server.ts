import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import * as powerSchool from '$lib/server/powerschool';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // Check teacher role
  const membership = locals.orgMemberships.find(m => 
    ['TEACHER', 'TEACHING_ASSISTANT', 'DEPARTMENT_HEAD', 'ORG_ADMIN', 'ORG_OWNER'].includes(m.role)
  );

  if (!membership && locals.user.platformRole !== 'PLATFORM_ADMIN') {
    throw redirect(302, '/dashboard');
  }

  // Get PowerSchool connection status
  const psStatus = await powerSchool.getConnectionStatus(locals.user.id);
  const psConfig = powerSchool.getConfig();

  // Get classes with PowerSchool mappings
  const classes = await prisma.class.findMany({
    where: { teacherId: locals.user.id, archived: false },
    include: {
      powerSchoolMapping: true,
      _count: { select: { members: true } }
    },
    orderBy: { name: 'asc' }
  });

  // Get PowerSchool sections and categories if connected
  let psSections: any[] = [];
  let psCategories: any[] = [];

  if (psStatus.connected) {
    try {
      psSections = await powerSchool.getSections(locals.user.id);
      psCategories = await powerSchool.getCategories(locals.user.id);
    } catch (e) {
      console.warn('Failed to fetch PowerSchool data:', e);
    }
  }

  // Check URL params for status messages
  const psConnected = url.searchParams.get('ps_connected') === 'true';
  const psError = url.searchParams.get('ps_error');

  return {
    powerSchool: {
      configured: psConfig.isConfigured,
      connected: psStatus.connected,
      teacherName: psStatus.teacherName,
      teacherId: psStatus.teacherId,
      sections: psSections,
      categories: psCategories
    },
    classes,
    messages: {
      psConnected,
      psError
    }
  };
};

export const actions: Actions = {
  connectPowerSchool: async ({ locals, cookies, url, request }) => {
    if (!locals.user) {
      throw redirect(302, '/login');
    }

    const config = powerSchool.getConfig();
    if (!config.isConfigured) {
      return { error: 'PowerSchool integration is not configured' };
    }

    // Generate state token
    const state = crypto.randomUUID();
    cookies.set('ps_oauth_state', state, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    });

    // Get the real origin (handles proxies/Codespaces)
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = forwardedHost 
      ? `${forwardedProto}://${forwardedHost}`
      : url.origin;

    const authUrl = powerSchool.getAuthorizationUrl(state, origin);
    throw redirect(302, authUrl);
  },

  disconnectPowerSchool: async ({ locals }) => {
    if (!locals.user) {
      throw redirect(302, '/login');
    }

    await powerSchool.disconnect(locals.user.id);
    return { success: true, message: 'PowerSchool disconnected' };
  },

  saveClassMapping: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(302, '/login');
    }

    const formData = await request.formData();
    const classId = formData.get('classId')?.toString();
    const sectionId = formData.get('sectionId')?.toString();
    const sectionName = formData.get('sectionName')?.toString();
    const categoryId = formData.get('categoryId')?.toString();
    const categoryName = formData.get('categoryName')?.toString();
    const term = formData.get('term')?.toString();

    if (!classId || !sectionId) {
      return { error: 'Class and section are required' };
    }

    // Verify ownership
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: locals.user.id }
    });

    if (!cls) {
      return { error: 'Class not found' };
    }

    await prisma.powerSchoolClassMapping.upsert({
      where: { classId },
      update: {
        sectionId: parseInt(sectionId),
        sectionName,
        defaultCategoryId: categoryId ? parseInt(categoryId) : null,
        defaultCategoryName: categoryName,
        term
      },
      create: {
        classId,
        sectionId: parseInt(sectionId),
        sectionName,
        defaultCategoryId: categoryId ? parseInt(categoryId) : null,
        defaultCategoryName: categoryName,
        term
      }
    });

    return { success: true, message: 'Class mapping saved' };
  },

  removeClassMapping: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(302, '/login');
    }

    const formData = await request.formData();
    const classId = formData.get('classId')?.toString();

    if (!classId) {
      return { error: 'Class ID required' };
    }

    // Verify ownership
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: locals.user.id }
    });

    if (!cls) {
      return { error: 'Class not found' };
    }

    await prisma.powerSchoolClassMapping.delete({
      where: { classId }
    }).catch(() => {});

    return { success: true, message: 'Mapping removed' };
  }
};
