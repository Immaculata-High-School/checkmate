import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const studentDoc = await prisma.studentDocument.findUnique({
    where: { id: params.id },
    include: {
      assignment: {
        include: {
          document: {
            select: { id: true, title: true, content: true }
          },
          class: {
            select: { id: true, name: true, emoji: true }
          }
        }
      },
      student: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!studentDoc) {
    throw error(404, 'Document not found');
  }

  // Verify student access
  if (studentDoc.studentId !== locals.user.id) {
    throw error(403, 'You do not have access to this document');
  }

  // Update status if not started
  if (studentDoc.status === 'NOT_STARTED') {
    await prisma.studentDocument.update({
      where: { id: params.id },
      data: { status: 'IN_PROGRESS' }
    });
    studentDoc.status = 'IN_PROGRESS';
  }

  // Determine if editable
  const canEdit = ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED'].includes(studentDoc.status);

  return {
    document: {
      ...studentDoc,
      canEdit
    },
    originalContent: studentDoc.assignment.document.content
  };
};
