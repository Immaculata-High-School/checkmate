import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user!.id;

  // Get student's class memberships
  const classMemberships = await prisma.classMember.findMany({
    where: { userId },
    select: { classId: true }
  });
  const classIds = classMemberships.map(m => m.classId);

  // Get documents: own documents + shared with user + shared with user's classes
  const documents = await prisma.document.findMany({
    where: {
      OR: [
        // Own documents
        { ownerId: userId },
        // Directly shared
        {
          shares: {
            some: { userId }
          }
        },
        // Shared with classes the student is in
        ...(classIds.length > 0 ? [{
          classShares: {
            some: { classId: { in: classIds } }
          }
        }] : [])
      ],
      isArchived: false
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      shares: {
        where: { userId },
        select: { canEdit: true }
      },
      classShares: {
        where: classIds.length > 0 ? { classId: { in: classIds } } : { classId: 'none' },
        include: {
          class: { select: { id: true, name: true, emoji: true } }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Add permissions to each document
  const docsWithPermissions = documents.map(doc => {
    const isOwner = doc.ownerId === userId;
    const userShare = doc.shares[0];
    const classShare = doc.classShares[0];
    const canEdit = isOwner || userShare?.canEdit || false;
    
    return {
      ...doc,
      isOwner,
      canEdit,
      sharedVia: isOwner ? null : (classShare ? classShare.class : null)
    };
  });

  return { documents: docsWithPermissions };
};
