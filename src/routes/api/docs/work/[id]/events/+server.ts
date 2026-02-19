import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';
import type { Prisma, DocumentEventType } from '@prisma/client';

interface ActivityEvent {
  eventType: string;
  timestamp: string;
  position: number;
  endPosition?: number;
  content?: string;
  contentLength?: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}

// POST /api/docs/work/[id]/events - Batch submit activity events
export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const studentDoc = await prisma.studentDocument.findUnique({
    where: { id: params.id },
    select: { 
      id: true, 
      studentId: true, 
      monitoringEnabled: true,
      status: true 
    }
  });

  if (!studentDoc) {
    throw error(404, 'Document not found');
  }

  // Verify student owns this document
  if (studentDoc.studentId !== locals.user.id) {
    throw error(403, 'Not authorized');
  }

  // Don't record if monitoring is disabled or document is submitted
  if (!studentDoc.monitoringEnabled) {
    return json({ success: true, recorded: 0 });
  }

  if (['SUBMITTED', 'RESUBMITTED'].includes(studentDoc.status)) {
    return json({ success: true, recorded: 0, message: 'Document already submitted' });
  }

  const body = await request.json();
  const events: ActivityEvent[] = body.events || [];

  if (events.length === 0) {
    return json({ success: true, recorded: 0 });
  }

  // Validate and transform events
  const validEvents: Prisma.DocumentActivityEventCreateManyInput[] = events
    .filter(e => e.eventType && e.timestamp)
    .map(e => ({
      studentDocId: params.id,
      eventType: e.eventType as DocumentEventType,
      timestamp: new Date(e.timestamp),
      position: e.position || 0,
      endPosition: e.endPosition || null,
      content: e.content || null,
      contentLength: e.contentLength || (e.content?.length || 0),
      sessionId: e.sessionId || null,
      metadata: e.metadata ? (e.metadata as Prisma.InputJsonValue) : undefined
    }));

  if (validEvents.length === 0) {
    return json({ success: true, recorded: 0 });
  }

  try {
    // Batch insert events
    await prisma.documentActivityEvent.createMany({
      data: validEvents
    });

    // Update summary statistics asynchronously
    updateActivitySummary(params.id, validEvents).catch(console.error);

    return json({ success: true, recorded: validEvents.length });
  } catch (err) {
    console.error('Failed to record activity events:', err);
    throw error(500, 'Failed to record events');
  }
};

// GET /api/docs/work/[id]/events - Get activity events (for teacher review/replay)
export const GET: RequestHandler = async ({ params, url, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const studentDoc = await prisma.studentDocument.findUnique({
    where: { id: params.id },
    include: {
      assignment: {
        include: {
          document: { select: { ownerId: true } }
        }
      }
    }
  });

  if (!studentDoc) {
    throw error(404, 'Document not found');
  }

  // Only teacher (document owner) or the student themselves can view
  const isTeacher = studentDoc.assignment.document.ownerId === locals.user.id;
  const isStudent = studentDoc.studentId === locals.user.id;

  if (!isTeacher && !isStudent) {
    throw error(403, 'Not authorized');
  }

  // Pagination
  const limit = parseInt(url.searchParams.get('limit') || '1000');
  const cursor = url.searchParams.get('cursor');
  const sessionId = url.searchParams.get('sessionId');

  const whereClause: any = { studentDocId: params.id };
  if (sessionId) {
    whereClause.sessionId = sessionId;
  }

  const events = await prisma.documentActivityEvent.findMany({
    where: whereClause,
    orderBy: { timestamp: 'asc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });

  // Get summary
  const summary = await prisma.documentActivitySummary.findUnique({
    where: { studentDocId: params.id }
  });

  // Get unique sessions
  const sessions = await prisma.documentActivityEvent.findMany({
    where: { studentDocId: params.id, sessionId: { not: null } },
    select: { sessionId: true, timestamp: true },
    distinct: ['sessionId'],
    orderBy: { timestamp: 'asc' }
  });

  return json({
    events,
    summary,
    sessions: sessions.map(s => s.sessionId),
    hasMore: events.length === limit,
    nextCursor: events.length === limit ? events[events.length - 1].id : null
  });
};

// Helper to update activity summary
async function updateActivitySummary(studentDocId: string, newEvents: any[]) {
  const counts = {
    keystrokes: 0,
    pastes: 0,
    pastedChars: 0,
    deletes: 0,
    undos: 0,
    focusLost: 0
  };

  for (const event of newEvents) {
    switch (event.eventType) {
      case 'KEYSTROKE':
        counts.keystrokes += event.contentLength || 1;
        break;
      case 'PASTE':
        counts.pastes++;
        counts.pastedChars += event.contentLength || 0;
        break;
      case 'DELETE':
        counts.deletes++;
        break;
      case 'UNDO':
        counts.undos++;
        break;
      case 'BLUR':
        counts.focusLost++;
        break;
    }
  }

  await prisma.documentActivitySummary.upsert({
    where: { studentDocId },
    create: {
      studentDocId,
      totalKeystrokes: counts.keystrokes,
      totalPastes: counts.pastes,
      totalPastedChars: counts.pastedChars,
      totalDeletes: counts.deletes,
      totalUndos: counts.undos,
      focusLostCount: counts.focusLost
    },
    update: {
      totalKeystrokes: { increment: counts.keystrokes },
      totalPastes: { increment: counts.pastes },
      totalPastedChars: { increment: counts.pastedChars },
      totalDeletes: { increment: counts.deletes },
      totalUndos: { increment: counts.undos },
      focusLostCount: { increment: counts.focusLost }
    }
  });
}
