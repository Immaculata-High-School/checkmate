import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import type { RequestHandler } from './$types';

// POST /api/docs/[id]/share - Share document with users
export const POST: RequestHandler = async (event) => {
  const { params, request, locals } = event;
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
  const { userEmail, userId, canEdit = false } = body;

  let targetUserId = userId;

  // Find user by email if userId not provided
  if (!targetUserId && userEmail) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail.toLowerCase().trim() }
    });
    if (!user) {
      throw error(404, 'User not found with that email');
    }
    targetUserId = user.id;
  }

  if (!targetUserId) {
    throw error(400, 'User email or ID required');
  }

  // Can't share with yourself
  if (targetUserId === locals.user.id) {
    throw error(400, 'Cannot share document with yourself');
  }

  // Create or update share
  const share = await prisma.documentShare.upsert({
    where: {
      documentId_userId: {
        documentId: params.id,
        userId: targetUserId
      }
    },
    update: { canEdit },
    create: {
      documentId: params.id,
      userId: targetUserId,
      canEdit
    },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  });

  logAudit({ userId: locals.user.id, action: 'DOCUMENT_SHARED', entityType: 'Document', entityId: params.id, details: { targetUserId, canEdit }, ...getRequestInfo(event) });

  return json({ share }, { status: 201 });
};

// DELETE /api/docs/[id]/share - Remove user share
export const DELETE: RequestHandler = async (event) => {
  const { params, request, locals } = event;
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
  const { userId } = body;

  if (!userId) {
    throw error(400, 'User ID required');
  }

  await prisma.documentShare.deleteMany({
    where: {
      documentId: params.id,
      userId
    }
  });

  logAudit({ userId: locals.user.id, action: 'DOCUMENT_UNSHARED', entityType: 'Document', entityId: params.id, details: { removedUserId: userId }, ...getRequestInfo(event) });

  return json({ success: true });
};
