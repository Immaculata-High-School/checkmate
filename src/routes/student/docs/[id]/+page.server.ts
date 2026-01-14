import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const userId = locals.user.id;

  // Get student's class memberships
  const classMemberships = await prisma.classMember.findMany({
    where: { userId },
    select: { classId: true }
  });
  const classIds = classMemberships.map(m => m.classId);

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

  if (!document) {
    throw error(404, 'Document not found');
  }

  // Check access
  const isOwner = document.ownerId === userId;
  const userShare = document.shares.find(s => s.userId === userId);
  const classShare = document.classShares.find(s => classIds.includes(s.classId));

  if (!isOwner && !userShare && !classShare) {
    throw error(403, 'You do not have access to this document');
  }

  const canEdit = isOwner || userShare?.canEdit || false;

  return { 
    document: {
      ...document,
      isOwner,
      canEdit,
      sharedVia: !isOwner && classShare ? classShare.class : null
    }
  };
};
