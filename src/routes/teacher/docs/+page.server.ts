import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const documents = await prisma.document.findMany({
    where: { 
      ownerId: locals.user!.id,
      isArchived: false
    },
    include: {
      shares: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      },
      classShares: {
        include: {
          class: { select: { id: true, name: true, emoji: true } }
        }
      },
      assignments: {
        include: {
          class: { select: { id: true, name: true, emoji: true } },
          studentCopies: {
            select: { id: true, status: true, grade: true }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Process documents to include assignment stats
  const documentsWithStats = documents.map(doc => {
    const assignmentStats = doc.assignments.map(a => {
      const submitted = a.studentCopies.filter(
        sc => sc.status === 'SUBMITTED' || sc.status === 'RESUBMITTED'
      ).length;
      const graded = a.studentCopies.filter(sc => sc.grade !== null).length;
      return {
        ...a,
        stats: { submitted, graded, total: a.studentCopies.length }
      };
    });
    
    return {
      ...doc,
      assignments: assignmentStats,
      totalSubmissions: assignmentStats.reduce((sum, a) => sum + a.stats.submitted, 0)
    };
  });

  // Get classes for sharing
  const classes = await prisma.class.findMany({
    where: { teacherId: locals.user!.id, archived: false },
    select: { id: true, name: true, emoji: true },
    orderBy: { name: 'asc' }
  });

  return { documents: documentsWithStats, classes };
};
