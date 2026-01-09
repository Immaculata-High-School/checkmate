import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user!.id;

  // Get student's own study sets (they created)
  const myStudySets = await prisma.studySet.findMany({
    where: {
      creatorId: userId,
      classId: null // Personal study sets have no class
    },
    include: {
      cards: {
        select: { id: true }
      },
      progress: {
        where: { userId },
        select: { mastery: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Get assigned study sets from classes
  const classMemberships = await prisma.classMember.findMany({
    where: { userId },
    select: { classId: true }
  });

  const classIds = classMemberships.map(m => m.classId);

  const assignedStudySets = classIds.length > 0 
    ? await prisma.studySet.findMany({
        where: {
          assignments: {
            some: {
              classId: { in: classIds }
            }
          }
        },
        include: {
          cards: {
            select: { id: true }
          },
          creator: {
            select: { name: true }
          },
          class: {
            select: { name: true, emoji: true }
          },
          progress: {
            where: { userId },
            select: { mastery: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    : [];

  return {
    myStudySets: myStudySets.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      cardCount: s.cards.length,
      mastery: s.progress.length > 0 
        ? Math.round(s.progress.reduce((sum, p) => sum + p.mastery, 0) / s.progress.length * 100)
        : 0,
      updatedAt: s.updatedAt
    })),
    assignedStudySets: assignedStudySets.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      cardCount: s.cards.length,
      creatorName: s.creator.name,
      className: s.class?.name,
      classEmoji: s.class?.emoji,
      mastery: s.progress.length > 0
        ? Math.round(s.progress.reduce((sum, p) => sum + p.mastery, 0) / s.progress.length * 100)
        : 0
    }))
  };
};
