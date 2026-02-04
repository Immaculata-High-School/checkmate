import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

// POST /api/docs/[id]/assign - Assign document to a class
export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const document = await prisma.document.findUnique({
    where: { id: params.id }
  });

  if (!document) {
    throw error(404, 'Document not found');
  }

  // Only owner can assign
  if (document.ownerId !== locals.user.id) {
    throw error(403, 'Only the document owner can assign it');
  }

  const body = await request.json();
  const { classId, type = 'VIEW_ONLY', title, instructions, dueDate, points } = body;

  if (!classId) {
    throw error(400, 'Class ID required');
  }

  // Verify user teaches this class
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      members: {
        where: { role: 'STUDENT' },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }
    }
  });

  if (!classRecord || classRecord.teacherId !== locals.user.id) {
    throw error(403, 'You can only assign to classes you teach');
  }

  // Create the assignment
  const assignment = await prisma.documentAssignment.create({
    data: {
      documentId: params.id,
      classId,
      type,
      title: title || document.title,
      instructions,
      dueDate: dueDate ? new Date(dueDate) : null,
      points: points ? parseInt(points) : null
    },
    include: {
      class: { select: { id: true, name: true, emoji: true } }
    }
  });

  // If type is MAKE_COPY, create a copy for each student in the class
  if (type === 'MAKE_COPY') {
    const studentCopies = classRecord.members.map(member => ({
      assignmentId: assignment.id,
      studentId: member.userId,
      title: title || document.title,
      content: document.content,
      status: 'NOT_STARTED' as const
    }));

    if (studentCopies.length > 0) {
      await prisma.studentDocument.createMany({
        data: studentCopies
      });
    }
  }

  // Also create a class share for the original document (for VIEW_ONLY type so students can access it)
  if (type === 'VIEW_ONLY') {
    await prisma.documentClassShare.upsert({
      where: {
        documentId_classId: {
          documentId: params.id,
          classId
        }
      },
      update: { canEdit: false },
      create: {
        documentId: params.id,
        classId,
        canEdit: false
      }
    });
  }

  // Get the assignment with student copies count
  const fullAssignment = await prisma.documentAssignment.findUnique({
    where: { id: assignment.id },
    include: {
      class: { select: { id: true, name: true, emoji: true } },
      studentCopies: {
        include: {
          student: { select: { id: true, name: true, email: true } }
        }
      }
    }
  });

  return json({ assignment: fullAssignment }, { status: 201 });
};

// GET /api/docs/[id]/assign - Get all assignments for a document
export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const document = await prisma.document.findUnique({
    where: { id: params.id }
  });

  if (!document) {
    throw error(404, 'Document not found');
  }

  // Only owner can see assignments
  if (document.ownerId !== locals.user.id) {
    throw error(403, 'Only the document owner can view assignments');
  }

  const assignments = await prisma.documentAssignment.findMany({
    where: { documentId: params.id },
    include: {
      class: { select: { id: true, name: true, emoji: true } },
      studentCopies: {
        include: {
          student: { select: { id: true, name: true, email: true } }
        },
        orderBy: { updatedAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return json({ assignments });
};

// DELETE /api/docs/[id]/assign - Remove an assignment
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const body = await request.json();
  const { assignmentId } = body;

  if (!assignmentId) {
    throw error(400, 'Assignment ID required');
  }

  const assignment = await prisma.documentAssignment.findUnique({
    where: { id: assignmentId },
    include: { document: true }
  });

  if (!assignment) {
    throw error(404, 'Assignment not found');
  }

  // Only document owner can delete assignments
  if (assignment.document.ownerId !== locals.user.id) {
    throw error(403, 'Only the document owner can remove assignments');
  }

  // Delete the assignment (cascades to student copies)
  await prisma.documentAssignment.delete({
    where: { id: assignmentId }
  });

  // Also remove the class share if it exists
  await prisma.documentClassShare.deleteMany({
    where: {
      documentId: params.id,
      classId: assignment.classId
    }
  });

  return json({ success: true });
};
