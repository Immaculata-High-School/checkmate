import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/student-docs - Get all student's document assignments
export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const userId = locals.user.id;

  // Get student's class memberships
  const classMemberships = await prisma.classMember.findMany({
    where: { userId },
    select: { classId: true }
  });
  const classIds = classMemberships.map(m => m.classId);

  // Get VIEW_ONLY assignments (student sees the original doc)
  const viewOnlyAssignments = await prisma.documentAssignment.findMany({
    where: {
      classId: { in: classIds },
      type: 'VIEW_ONLY'
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          content: true,
          updatedAt: true,
          owner: { select: { id: true, name: true, email: true } }
        }
      },
      class: { select: { id: true, name: true, emoji: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get student's MAKE_COPY documents
  const studentDocs = await prisma.studentDocument.findMany({
    where: { studentId: userId },
    include: {
      assignment: {
        include: {
          document: {
            select: {
              id: true,
              title: true,
              owner: { select: { id: true, name: true, email: true } }
            }
          },
          class: { select: { id: true, name: true, emoji: true } }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return json({
    viewOnlyAssignments: viewOnlyAssignments.map(a => ({
      ...a,
      assignmentType: 'VIEW_ONLY' as const
    })),
    studentDocuments: studentDocs.map(d => ({
      ...d,
      assignmentType: 'MAKE_COPY' as const
    }))
  });
};
