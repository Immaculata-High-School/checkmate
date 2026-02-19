import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import type { RequestHandler } from './$types';

// GET /api/student-docs/[id] - Get a student document
export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const studentDoc = await prisma.studentDocument.findUnique({
    where: { id: params.id },
    include: {
      assignment: {
        include: {
          document: {
            select: { id: true, title: true }
          },
          class: {
            select: { id: true, name: true, emoji: true, teacherId: true }
          }
        }
      },
      student: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!studentDoc) {
    throw error(404, 'Document not found');
  }

  // Check access - student owner or teacher of the class
  const isStudent = studentDoc.studentId === locals.user.id;
  const isTeacher = studentDoc.assignment.class.teacherId === locals.user.id;

  if (!isStudent && !isTeacher) {
    throw error(403, 'You do not have access to this document');
  }

  // Update status if student is viewing for first time
  if (isStudent && studentDoc.status === 'NOT_STARTED') {
    await prisma.studentDocument.update({
      where: { id: params.id },
      data: { status: 'IN_PROGRESS' }
    });
    studentDoc.status = 'IN_PROGRESS';
  }

  return json({ 
    document: {
      ...studentDoc,
      canEdit: isStudent && (studentDoc.status === 'NOT_STARTED' || studentDoc.status === 'IN_PROGRESS' || studentDoc.status === 'RETURNED'),
      isStudent,
      isTeacher
    }
  });
};

// PATCH /api/student-docs/[id] - Update student document (save work)
export const PATCH: RequestHandler = async (event) => {
  const { params, request, locals } = event;
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const studentDoc = await prisma.studentDocument.findUnique({
    where: { id: params.id },
    include: {
      assignment: {
        include: {
          class: { select: { teacherId: true } }
        }
      }
    }
  });

  if (!studentDoc) {
    throw error(404, 'Document not found');
  }

  const isStudent = studentDoc.studentId === locals.user.id;
  const isTeacher = studentDoc.assignment.class.teacherId === locals.user.id;

  if (!isStudent && !isTeacher) {
    throw error(403, 'You do not have access to this document');
  }

  const body = await request.json();

  // Student can update content if not submitted
  if (isStudent) {
    const canEditStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED'];
    if (!canEditStatuses.includes(studentDoc.status)) {
      throw error(403, 'Cannot edit a submitted document');
    }

    const { title, content } = body;
    
    const updated = await prisma.studentDocument.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        status: 'IN_PROGRESS'
      }
    });

    logAudit({ userId: locals.user.id, action: 'STUDENT_DOC_UPDATED', entityType: 'StudentDocument', entityId: params.id, ...getRequestInfo(event) });

    return json({ document: updated });
  }

  // Teacher can update grade and feedback
  if (isTeacher) {
    const { grade, feedback, returnToStudent } = body;
    
    const updateData: any = {};
    if (grade !== undefined) updateData.grade = grade;
    if (feedback !== undefined) updateData.feedback = feedback;
    
    if (returnToStudent) {
      updateData.status = 'RETURNED';
      updateData.returnedAt = new Date();
    }

    const updated = await prisma.studentDocument.update({
      where: { id: params.id },
      data: updateData
    });

    logAudit({ userId: locals.user.id, action: returnToStudent ? 'STUDENT_DOC_RETURNED' : 'STUDENT_DOC_GRADED', entityType: 'StudentDocument', entityId: params.id, details: { grade, returnToStudent }, ...getRequestInfo(event) });

    return json({ document: updated });
  }

  throw error(400, 'Invalid request');
};

// POST /api/student-docs/[id]/submit - Submit work
export const POST: RequestHandler = async (event) => {
  const { params, locals } = event;
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const studentDoc = await prisma.studentDocument.findUnique({
    where: { id: params.id }
  });

  if (!studentDoc) {
    throw error(404, 'Document not found');
  }

  if (studentDoc.studentId !== locals.user.id) {
    throw error(403, 'You can only submit your own documents');
  }

  // Can only submit if in progress or returned
  const canSubmitStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED'];
  if (!canSubmitStatuses.includes(studentDoc.status)) {
    throw error(400, 'Document is already submitted');
  }

  const newStatus = studentDoc.status === 'RETURNED' ? 'RESUBMITTED' : 'SUBMITTED';

  const updated = await prisma.studentDocument.update({
    where: { id: params.id },
    data: {
      status: newStatus,
      submittedAt: new Date()
    }
  });

  logAudit({ userId: locals.user.id, action: 'STUDENT_DOC_SUBMITTED', entityType: 'StudentDocument', entityId: params.id, details: { status: newStatus }, ...getRequestInfo(event) });

  return json({ document: updated });
};
