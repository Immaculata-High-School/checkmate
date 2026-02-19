import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const test = await prisma.test.findUnique({
    where: { id: params.id },
    include: {
      questions: {
        orderBy: { order: 'asc' }
      },
      submissions: {
        include: {
          student: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { submittedAt: 'desc' }
      },
      classes: {
        include: {
          class: {
            select: { id: true, name: true }
          }
        }
      }
    }
  });

  if (!test) {
    throw error(404, 'Test not found');
  }

  if (test.teacherId !== locals.user!.id) {
    throw error(403, 'Not authorized');
  }

  // Get available classes to assign
  const availableClasses = await prisma.class.findMany({
    where: {
      teacherId: locals.user!.id,
      archived: false
    },
    select: { id: true, name: true }
  });

  return { test, availableClasses };
};

export const actions: Actions = {
  publish: async (event) => {
    const { params, request, locals } = event;
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    const formData = await request.formData();
    const endDateStr = formData.get('endDate')?.toString();

    const updateData: any = { status: 'PUBLISHED' };
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      updateData.endDate = endDate;
      updateData.autoUnpublishAt = endDate; // Auto-close test at end date
    }

    await prisma.test.update({
      where: { id: params.id },
      data: updateData
    });

    logAudit({ userId: locals.user!.id, action: 'TEST_PUBLISHED', entityType: 'Test', entityId: params.id, ...getRequestInfo(event) });

    return { success: true };
  },

  unpublish: async (event) => {
    const { params, locals } = event;
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.test.update({
      where: { id: params.id },
      data: { status: 'DRAFT' }
    });

    logAudit({ userId: locals.user!.id, action: 'TEST_UNPUBLISHED', entityType: 'Test', entityId: params.id, ...getRequestInfo(event) });

    return { success: true };
  },

  delete: async (event) => {
    const { params, locals } = event;
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.test.delete({
      where: { id: params.id }
    });

    logAudit({ userId: locals.user!.id, action: 'TEST_DELETED', entityType: 'Test', entityId: params.id, ...getRequestInfo(event) });

    throw redirect(302, '/teacher/tests');
  },

  assignClass: async (event) => {
    const { params, request, locals } = event;
    const formData = await request.formData();
    const classId = formData.get('classId')?.toString();

    if (!classId) {
      return fail(400, { error: 'Class is required' });
    }

    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    // Check if already assigned
    const existing = await prisma.classTest.findUnique({
      where: {
        classId_testId: {
          classId,
          testId: params.id
        }
      }
    });

    if (existing) {
      return fail(400, { error: 'Test already assigned to this class' });
    }

    await prisma.classTest.create({
      data: {
        classId,
        testId: params.id
      }
    });

    logAudit({ userId: locals.user!.id, action: 'TEST_CLASS_ASSIGNED', entityType: 'Test', entityId: params.id, details: { classId }, ...getRequestInfo(event) });

    return { success: true };
  }
};
