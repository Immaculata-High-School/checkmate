import { error, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { invalidateUserOrgCache } from '$lib/server/auth';
import { sendPasswordReset } from '$lib/server/email';
import { generateCode } from '$lib/utils';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import bcrypt from 'bcryptjs';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 50;

async function requireOrgAdmin(slug: string, userId: string) {
  const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
  if (!org) throw error(404, 'Organization not found');
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: org.id, role: { in: ['ORG_OWNER', 'ORG_ADMIN'] }, isActive: true }
  });
  if (!membership) throw error(403, 'Not authorized');
  return org;
}

export const load: PageServerLoad = async ({ params, url }) => {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const search = url.searchParams.get('search') || '';

  const organization = await prisma.organization.findUnique({
    where: { slug: params.slug },
    select: { id: true }
  });

  if (!organization) {
    return { students: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 };
  }

  // Build where clause with optional search
  const whereClause = {
    organizationId: organization.id,
    role: 'STUDENT' as const,
    isActive: true,
    ...(search && {
      OR: [
        { user: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { email: { contains: search, mode: 'insensitive' as const } } },
        { studentId: { contains: search, mode: 'insensitive' as const } }
      ]
    })
  };

  // Run count and fetch in parallel
  const [total, students] = await Promise.all([
    prisma.organizationMember.count({ where: whereClause }),
    prisma.organizationMember.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        studentId: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            lastLoginAt: true,
            suspended: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    })
  ]);

  // Get class counts only for current page of students (much faster)
  const studentIds = students.map(s => s.userId);
  const classCounts = studentIds.length > 0 
    ? await prisma.classMember.groupBy({
        by: ['userId'],
        where: {
          userId: { in: studentIds },
          class: { organizationId: organization.id }
        },
        _count: true
      })
    : [];

  const classCountMap = new Map(classCounts.map(c => [c.userId, c._count]));

  const studentsWithCounts = students.map(s => ({
    ...s,
    classCount: classCountMap.get(s.userId) || 0
  }));

  return { 
    students: studentsWithCounts,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    search
  };
};

export const actions: Actions = {
  impersonate: async (event) => {
    const { request, params, cookies, locals } = event;
    if (!locals.user) throw error(401, 'Not authenticated');
    await requireOrgAdmin(params.slug, locals.user.id);

    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

    // Verify the target user is a student in this org
    const org = await prisma.organization.findUnique({ where: { slug: params.slug }, select: { id: true } });
    const targetMember = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: org!.id, role: 'STUDENT' }
    });
    if (!targetMember) return fail(400, { error: 'Student not found in this organization' });

    const sessionId = generateCode(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    const originalSession = cookies.get('auth_session');
    if (originalSession) {
      cookies.set('original_session', originalSession, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 2
      });
      cookies.set('org_admin_return_slug', params.slug, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 2
      });
    }

    await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        expiresAt
      }
    });

    cookies.set('auth_session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 2
    });

    logAudit({ userId: locals.user.id, action: 'ORG_ADMIN_IMPERSONATE_STUDENT', entityType: 'User', entityId: userId, details: { orgSlug: params.slug }, ...getRequestInfo(event) });

    return { impersonating: true, redirect: '/student' };
  },

  resetPassword: async (event) => {
    const { request, params, locals } = event;
    if (!locals.user) throw error(401, 'Not authenticated');
    await requireOrgAdmin(params.slug, locals.user.id);

    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return fail(404, { error: 'User not found' });
    }

    const token = generateCode(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email }
    });

    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt
      }
    });

    await sendPasswordReset(user.email, token);

    logAudit({ userId: locals.user.id, action: 'ORG_ADMIN_PASSWORD_RESET', entityType: 'User', entityId: userId, details: { email: user.email, orgSlug: params.slug }, ...getRequestInfo(event) });

    return { success: true, message: `Password reset email sent to ${user.email}` };
  },

  setTempPassword: async (event) => {
    const { request, params, locals } = event;
    if (!locals.user) throw error(401, 'Not authenticated');
    await requireOrgAdmin(params.slug, locals.user.id);

    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

    const tempPassword = generateCode(12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    logAudit({ userId: locals.user.id, action: 'ORG_ADMIN_TEMP_PASSWORD_SET', entityType: 'User', entityId: userId, details: { orgSlug: params.slug }, ...getRequestInfo(event) });

    return { success: true, tempPassword, message: 'Temporary password set.' };
  },

  toggleSuspend: async (event) => {
    const { request, params, locals } = event;
    if (!locals.user) throw error(401, 'Not authenticated');
    await requireOrgAdmin(params.slug, locals.user.id);

    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { suspended: true }
    });

    if (!user) {
      return fail(404, { error: 'User not found' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { suspended: !user.suspended }
    });

    logAudit({ userId: locals.user.id, action: user.suspended ? 'ORG_ADMIN_STUDENT_UNSUSPENDED' : 'ORG_ADMIN_STUDENT_SUSPENDED', entityType: 'User', entityId: userId, details: { orgSlug: params.slug }, ...getRequestInfo(event) });

    return { success: true, message: user.suspended ? 'Student unsuspended' : 'Student suspended' };
  },

  removeStudent: async (event) => {
    const { request, params, locals } = event;
    if (!locals.user) throw error(401, 'Not authenticated');
    await requireOrgAdmin(params.slug, locals.user.id);

    const formData = await request.formData();
    const memberId = formData.get('memberId')?.toString();

    if (!memberId) {
      return fail(400, { error: 'Member ID required' });
    }

    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return fail(404, { error: 'Member not found' });
    }

    await prisma.organizationMember.delete({
      where: { id: memberId }
    });

    invalidateUserOrgCache(member.userId);

    logAudit({ userId: locals.user.id, action: 'ORG_ADMIN_STUDENT_REMOVED', entityType: 'OrganizationMember', entityId: memberId, details: { removedUserId: member.userId, orgSlug: params.slug }, ...getRequestInfo(event) });

    return { success: true, message: 'Student removed from organization' };
  }
};
