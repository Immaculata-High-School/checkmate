import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const test = await prisma.test.findUnique({
    where: { id: params.id },
    include: {
      studentOverrides: {
        include: {
          student: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      classes: {
        include: {
          class: {
            include: {
              members: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true }
                  }
                }
              }
            }
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

  // Get all students from assigned classes
  const students = test.classes.flatMap(ct =>
    ct.class.members.map(m => m.user)
  ).filter((student, index, self) =>
    index === self.findIndex(s => s.id === student.id)
  );

  // Check if user came here to publish
  const publishIntent = url.searchParams.get('publish') === 'true';

  return { test, students, publishIntent };
};

export const actions: Actions = {
  updateSettings: async ({ params, request, locals }) => {
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    const formData = await request.formData();

    // Parse all settings from form data
    const settings = {
      // Time & Availability
      timeLimit: formData.get('timeLimit') ? parseInt(formData.get('timeLimit') as string) : null,
      startDate: formData.get('startDate') ? new Date(formData.get('startDate') as string) : null,
      endDate: formData.get('endDate') ? new Date(formData.get('endDate') as string) : null,
      autoUnpublishAt: formData.get('autoUnpublishAt') ? new Date(formData.get('autoUnpublishAt') as string) : null,

      // Display
      scrambleQuestions: formData.get('scrambleQuestions') === 'true',
      scrambleOptions: formData.get('scrambleOptions') === 'true',
      showResultsImmediately: formData.get('showResultsImmediately') === 'true',
      showCorrectAnswers: formData.get('showCorrectAnswers') === 'true',

      // AI Grading
      aiOpenEndedGrading: formData.get('aiOpenEndedGrading') === 'true',
      aiPartialCredit: formData.get('aiPartialCredit') === 'true',
      aiGradingHarshness: parseInt(formData.get('aiGradingHarshness') as string) || 50,

      // Retakes
      maxAttempts: parseInt(formData.get('maxAttempts') as string) || 1,
      allowLateSubmission: formData.get('allowLateSubmission') === 'true',
      latePenaltyPercent: parseInt(formData.get('latePenaltyPercent') as string) || 0,

      // Security
      requireFullscreen: formData.get('requireFullscreen') === 'true',
      detectTabSwitch: formData.get('detectTabSwitch') === 'true',
      detectMouseLeave: formData.get('detectMouseLeave') === 'true',
      blockCopyPaste: formData.get('blockCopyPaste') === 'true',
      blockRightClick: formData.get('blockRightClick') === 'true',
      blockKeyboardShortcuts: formData.get('blockKeyboardShortcuts') === 'true',
      maxTabSwitches: parseInt(formData.get('maxTabSwitches') as string) || 3,
      maxMouseLeaves: parseInt(formData.get('maxMouseLeaves') as string) || 5,
      autoSubmitOnViolation: formData.get('autoSubmitOnViolation') === 'true',
      showViolationWarnings: formData.get('showViolationWarnings') === 'true',
      recordViolations: formData.get('recordViolations') === 'true',
      browserLockdown: formData.get('browserLockdown') === 'true'
    };

    await prisma.test.update({
      where: { id: params.id },
      data: settings
    });

    return { success: true };
  },

  addStudentOverride: async ({ params, request, locals }) => {
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    const formData = await request.formData();
    const studentId = formData.get('studentId') as string;
    const extraAttempts = parseInt(formData.get('extraAttempts') as string) || 0;
    const extraTimeMinutes = parseInt(formData.get('extraTimeMinutes') as string) || 0;
    const extendedDeadline = formData.get('extendedDeadline')
      ? new Date(formData.get('extendedDeadline') as string)
      : null;
    const notes = formData.get('notes') as string || null;

    if (!studentId) {
      return fail(400, { error: 'Student is required' });
    }

    // Check if override already exists
    const existing = await prisma.testStudentOverride.findUnique({
      where: {
        testId_studentId: {
          testId: params.id,
          studentId
        }
      }
    });

    if (existing) {
      await prisma.testStudentOverride.update({
        where: { id: existing.id },
        data: { extraAttempts, extraTimeMinutes, extendedDeadline, notes }
      });
    } else {
      await prisma.testStudentOverride.create({
        data: {
          testId: params.id,
          studentId,
          extraAttempts,
          extraTimeMinutes,
          extendedDeadline,
          notes
        }
      });
    }

    return { success: true };
  },

  removeStudentOverride: async ({ params, request, locals }) => {
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    const formData = await request.formData();
    const overrideId = formData.get('overrideId') as string;

    await prisma.testStudentOverride.delete({
      where: { id: overrideId }
    });

    return { success: true };
  },

  publishTest: async ({ params, locals }) => {
    const test = await prisma.test.findUnique({
      where: { id: params.id }
    });

    if (!test || test.teacherId !== locals.user!.id) {
      return fail(403, { error: 'Not authorized' });
    }

    await prisma.test.update({
      where: { id: params.id },
      data: { status: 'PUBLISHED' }
    });

    throw redirect(302, `/teacher/tests/${params.id}`);
  }
};
