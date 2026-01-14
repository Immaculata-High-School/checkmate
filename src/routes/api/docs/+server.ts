import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/docs - List all documents for current user
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const includeShared = url.searchParams.get('shared') !== 'false';
  const archived = url.searchParams.get('archived') === 'true';

  // Get user's classes for shared documents
  const classMemberships = await prisma.classMember.findMany({
    where: { userId: locals.user.id },
    select: { classId: true }
  });
  const classIds = classMemberships.map(m => m.classId);

  // Get user's owned classes (for teachers)
  const ownedClasses = await prisma.class.findMany({
    where: { teacherId: locals.user.id },
    select: { id: true }
  });
  const allClassIds = [...classIds, ...ownedClasses.map(c => c.id)];

  // Build query conditions
  const conditions: any[] = [
    // User's own documents
    { ownerId: locals.user.id }
  ];

  if (includeShared) {
    // Documents shared directly with user
    conditions.push({
      shares: {
        some: { userId: locals.user.id }
      }
    });

    // Documents shared with user's classes
    if (allClassIds.length > 0) {
      conditions.push({
        classShares: {
          some: { classId: { in: allClassIds } }
        }
      });
    }
  }

  const documents = await prisma.document.findMany({
    where: {
      OR: conditions,
      isArchived: archived
    },
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
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Add isOwner and canEdit flags
  const docsWithPermissions = documents.map(doc => {
    const isOwner = doc.ownerId === locals.user!.id;
    const userShare = doc.shares.find(s => s.userId === locals.user!.id);
    const classShare = doc.classShares.find(s => allClassIds.includes(s.classId));
    const canEdit = isOwner || userShare?.canEdit || classShare?.canEdit || false;
    
    return {
      ...doc,
      isOwner,
      canEdit
    };
  });

  return json({ documents: docsWithPermissions });
};

// POST /api/docs - Create a new document
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const body = await request.json();
  const { title = 'Untitled Document', content = '' } = body;

  // Get user's organization
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: locals.user.id, isActive: true }
  });

  const document = await prisma.document.create({
    data: {
      title,
      content,
      ownerId: locals.user.id,
      organizationId: membership?.organizationId
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  return json({ document }, { status: 201 });
};
