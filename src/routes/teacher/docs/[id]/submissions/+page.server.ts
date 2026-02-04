import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const classId = url.searchParams.get('classId');

  const document = await prisma.document.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      ownerId: true,
      content: true
    }
  });

  if (!document) {
    throw error(404, 'Document not found');
  }

  // Only owner can see submissions
  if (document.ownerId !== locals.user.id) {
    throw error(403, 'Only the document owner can view submissions');
  }

  // Get assignments for this document
  const whereClause: any = { documentId: params.id };
  if (classId) {
    whereClause.classId = classId;
  }

  const assignments = await prisma.documentAssignment.findMany({
    where: whereClause,
    include: {
      class: { 
        select: { 
          id: true, 
          name: true, 
          emoji: true,
          members: {
            where: { role: 'STUDENT' },
            include: {
              user: { select: { id: true, name: true, email: true } }
            }
          }
        } 
      },
      studentCopies: {
        include: {
          student: { select: { id: true, name: true, email: true } }
        },
        orderBy: [
          { status: 'asc' },
          { submittedAt: 'desc' }
        ]
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Process assignments with stats
  const assignmentsWithStats = assignments.map(assignment => {
    const totalStudents = assignment.class.members.length;
    const submitted = assignment.studentCopies.filter(
      sc => sc.status === 'SUBMITTED' || sc.status === 'RESUBMITTED'
    ).length;
    const returned = assignment.studentCopies.filter(sc => sc.status === 'RETURNED').length;
    const graded = assignment.studentCopies.filter(sc => sc.grade !== null).length;
    const notStarted = assignment.studentCopies.filter(sc => sc.status === 'NOT_STARTED').length;
    const inProgress = assignment.studentCopies.filter(sc => sc.status === 'IN_PROGRESS').length;

    return {
      ...assignment,
      stats: {
        totalStudents,
        submitted,
        returned,
        graded,
        notStarted,
        inProgress
      }
    };
  });

  // Get available classes for filter dropdown
  const classes = await prisma.documentAssignment.findMany({
    where: { documentId: params.id },
    select: {
      class: { select: { id: true, name: true, emoji: true } }
    },
    distinct: ['classId']
  });

  return {
    document,
    assignments: assignmentsWithStats,
    classes: classes.map(c => c.class),
    selectedClassId: classId
  };
};
