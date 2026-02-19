import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { invalidateUserOrgCache } from '$lib/server/auth';
import { sendPasswordReset } from '$lib/server/email';
import { generateCode } from '$lib/utils';
import bcrypt from 'bcryptjs';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 50; // Load 50 students at a time

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
  impersonate: async ({ request, params, cookies }) => {
    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID required' });
    }

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

    return { impersonating: true, redirect: '/student' };
  },

  resetPassword: async ({ request }) => {
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

    return { success: true, message: `Password reset email sent to ${user.email}` };
  },

  setTempPassword: async ({ request }) => {
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

    return { success: true, tempPassword, message: 'Temporary password set.' };
  },

  toggleSuspend: async ({ request }) => {
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

    return { success: true, message: user.suspended ? 'Student unsuspended' : 'Student suspended' };
  },

  removeStudent: async ({ request }) => {
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

    return { success: true, message: 'Student removed from organization' };
  }
};
