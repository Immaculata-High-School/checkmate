import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const studentDoc = await prisma.studentDocument.findUnique({
    where: { id: params.submissionId },
    include: {
      assignment: {
        include: {
          document: {
            select: { id: true, title: true, content: true, ownerId: true }
          },
          class: {
            select: { id: true, name: true, emoji: true, teacherId: true }
          }
        }
      },
      student: {
        select: { id: true, name: true, email: true }
      },
      activitySummary: true
    }
  });

  if (!studentDoc) {
    throw error(404, 'Submission not found');
  }

  // Verify teacher access
  if (studentDoc.assignment.class.teacherId !== locals.user.id) {
    throw error(403, 'You do not have access to this submission');
  }

  // Get activity events for replay (only paste events initially, full events loaded on demand)
  const pasteEvents = await prisma.documentActivityEvent.findMany({
    where: {
      studentDocId: params.submissionId,
      eventType: 'PASTE'
    },
    select: {
      id: true,
      timestamp: true,
      position: true,
      endPosition: true,
      content: true,
      contentLength: true
    },
    orderBy: { timestamp: 'asc' }
  });

  // Get unique sessions for the session picker
  const sessions = await prisma.documentActivityEvent.findMany({
    where: { 
      studentDocId: params.submissionId,
      eventType: 'SESSION_START'
    },
    select: { 
      sessionId: true, 
      timestamp: true,
      metadata: true 
    },
    orderBy: { timestamp: 'asc' }
  });

  // Count total events
  const eventCount = await prisma.documentActivityEvent.count({
    where: { studentDocId: params.submissionId }
  });

  // Compute writing time and typing speed from events (since the summary doesn't track these)
  let computedWritingTime = 0;
  let computedTypingSpeed = 0;
  if (eventCount > 0) {
    const timeEvents = await prisma.documentActivityEvent.findMany({
      where: {
        studentDocId: params.submissionId,
        eventType: { in: ['KEYSTROKE', 'PASTE', 'DELETE'] }
      },
      select: { timestamp: true, eventType: true, contentLength: true },
      orderBy: { timestamp: 'asc' }
    });

    if (timeEvents.length > 1) {
      // Calculate active writing time (gaps > 2min are idle)
      const MAX_GAP = 2 * 60 * 1000;
      let totalActiveMs = 0;
      let totalTypedChars = 0;
      for (let i = 1; i < timeEvents.length; i++) {
        const gap = new Date(timeEvents[i].timestamp).getTime() - new Date(timeEvents[i - 1].timestamp).getTime();
        if (gap < MAX_GAP) {
          totalActiveMs += gap;
        }
        if (timeEvents[i].eventType === 'KEYSTROKE') {
          totalTypedChars += timeEvents[i].contentLength || 1;
        }
      }
      computedWritingTime = Math.round(totalActiveMs / 1000);
      const activeMinutes = totalActiveMs / 60000;
      computedTypingSpeed = activeMinutes > 0 ? Math.round(totalTypedChars / activeMinutes) : 0;
    }
  }

  // Merge computed values into activity summary
  const activitySummary = studentDoc.activitySummary
    ? {
        ...studentDoc.activitySummary,
        totalWritingTime: studentDoc.activitySummary.totalWritingTime || computedWritingTime,
        avgTypingSpeed: studentDoc.activitySummary.avgTypingSpeed || computedTypingSpeed
      }
    : null;

  return {
    submission: studentDoc,
    originalDocument: studentDoc.assignment.document,
    activitySummary,
    pasteEvents,
    sessions: sessions.map(s => ({
      id: s.sessionId,
      startTime: s.timestamp,
      metadata: s.metadata
    })),
    totalEvents: eventCount
  };
};
