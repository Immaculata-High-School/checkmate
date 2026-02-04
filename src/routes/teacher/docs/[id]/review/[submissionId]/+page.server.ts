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

  return {
    submission: studentDoc,
    originalDocument: studentDoc.assignment.document,
    activitySummary: studentDoc.activitySummary,
    pasteEvents,
    sessions: sessions.map(s => ({
      id: s.sessionId,
      startTime: s.timestamp,
      metadata: s.metadata
    })),
    totalEvents: eventCount
  };
};
