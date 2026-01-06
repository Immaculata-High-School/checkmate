import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
  const userId = locals.user!.id;

  // Get the test with security settings
  const test = await prisma.test.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      requireFullscreen: true,
      detectTabSwitch: true,
      detectMouseLeave: true,
      blockCopyPaste: true,
      blockRightClick: true,
      blockKeyboardShortcuts: true,
      maxTabSwitches: true,
      maxMouseLeaves: true,
      autoSubmitOnViolation: true,
      showViolationWarnings: true,
      recordViolations: true,
      browserLockdown: true,
      classes: {
        include: {
          class: {
            include: {
              members: {
                where: { userId }
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

  // Check if student is enrolled
  const isEnrolled = test.classes.some(ct => ct.class.members.length > 0);
  if (!isEnrolled) {
    throw error(403, 'You are not enrolled in a class with this test');
  }

  return {
    testSecurity: {
      id: test.id,
      title: test.title,
      requireFullscreen: test.requireFullscreen,
      detectTabSwitch: test.detectTabSwitch,
      detectMouseLeave: test.detectMouseLeave,
      blockCopyPaste: test.blockCopyPaste,
      blockRightClick: test.blockRightClick,
      blockKeyboardShortcuts: test.blockKeyboardShortcuts,
      maxTabSwitches: test.maxTabSwitches,
      maxMouseLeaves: test.maxMouseLeaves,
      autoSubmitOnViolation: test.autoSubmitOnViolation,
      showViolationWarnings: test.showViolationWarnings,
      recordViolations: test.recordViolations,
      browserLockdown: test.browserLockdown
    }
  };
};
