import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

// POST /api/docs/[id]/share-class - Share document with a class
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

  // Only owner can share
  if (document.ownerId !== locals.user.id) {
    throw error(403, 'Only the document owner can share it');
  }

  const body = await request.json();
  const { classId, canEdit = false } = body;

  if (!classId) {
    throw error(400, 'Class ID required');
  }

  // Verify user has access to this class (owner or teacher)
  const classRecord = await prisma.class.findUnique({
    where: { id: classId }
  });

  if (!classRecord || classRecord.teacherId !== locals.user.id) {
    throw error(403, 'You can only share with classes you teach');
  }

  // Create or update class share
  const share = await prisma.documentClassShare.upsert({
    where: {
      documentId_classId: {
        documentId: params.id,
        classId
      }
    },
    update: { canEdit },
    create: {
      documentId: params.id,
      classId,
      canEdit
    },
    include: {
      class: { select: { id: true, name: true, emoji: true } }
    }
  });

  return json({ share }, { status: 201 });
};

// DELETE /api/docs/[id]/share-class - Remove class share
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const document = await prisma.document.findUnique({
    where: { id: params.id }
  });

  if (!document) {
    throw error(404, 'Document not found');
  }

  // Only owner can remove shares
  if (document.ownerId !== locals.user.id) {
    throw error(403, 'Only the document owner can modify sharing');
  }

  const body = await request.json();
  const { classId } = body;

  if (!classId) {
    throw error(400, 'Class ID required');
  }

  await prisma.documentClassShare.deleteMany({
    where: {
      documentId: params.id,
      classId
    }
  });

  return json({ success: true });
};
