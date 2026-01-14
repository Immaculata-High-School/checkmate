import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

// Helper to check if user can access document
async function canAccessDocument(documentId: string, userId: string): Promise<{ canAccess: boolean; canEdit: boolean; isOwner: boolean }> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      shares: { where: { userId } },
      classShares: {
        include: {
          class: {
            include: {
              members: { where: { userId } },
              teacher: true
            }
          }
        }
      }
    }
  });

  if (!document) {
    return { canAccess: false, canEdit: false, isOwner: false };
  }

  const isOwner = document.ownerId === userId;
  
  if (isOwner) {
    return { canAccess: true, canEdit: true, isOwner: true };
  }

  // Check direct share
  const userShare = document.shares[0];
  if (userShare) {
    return { canAccess: true, canEdit: userShare.canEdit, isOwner: false };
  }

  // Check class shares
  for (const classShare of document.classShares) {
    const isMember = classShare.class.members.length > 0;
    const isTeacher = classShare.class.teacherId === userId;
    if (isMember || isTeacher) {
      return { canAccess: true, canEdit: classShare.canEdit || isTeacher, isOwner: false };
    }
  }

  return { canAccess: false, canEdit: false, isOwner: false };
}

// GET /api/docs/[id] - Get a specific document
export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const { canAccess, canEdit, isOwner } = await canAccessDocument(params.id, locals.user.id);
  
  if (!canAccess) {
    throw error(404, 'Document not found');
  }

  const document = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      shares: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      },
      classShares: {
        include: {
          class: { select: { id: true, name: true, emoji: true } }
        }
      }
    }
  });

  return json({ 
    document: {
      ...document,
      canEdit,
      isOwner
    }
  });
};

// PATCH /api/docs/[id] - Update a document
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const { canAccess, canEdit } = await canAccessDocument(params.id, locals.user.id);
  
  if (!canAccess) {
    throw error(404, 'Document not found');
  }

  if (!canEdit) {
    throw error(403, 'You do not have permission to edit this document');
  }

  const body = await request.json();
  const { title, content, visibility, isArchived } = body;

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (visibility !== undefined) updateData.visibility = visibility;
  if (isArchived !== undefined) updateData.isArchived = isArchived;

  const document = await prisma.document.update({
    where: { id: params.id },
    data: updateData,
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  return json({ document });
};

// DELETE /api/docs/[id] - Delete a document
export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const document = await prisma.document.findUnique({
    where: { id: params.id }
  });

  if (!document) {
    throw error(404, 'Document not found');
  }

  // Only owner can delete
  if (document.ownerId !== locals.user.id) {
    throw error(403, 'Only the document owner can delete it');
  }

  await prisma.document.delete({
    where: { id: params.id }
  });

  return json({ success: true });
};
