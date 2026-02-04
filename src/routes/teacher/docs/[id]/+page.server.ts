import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
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
      },
      assignments: {
        include: {
          class: { 
            select: { 
              id: true, 
              name: true, 
              emoji: true,
              _count: {
                select: { members: { where: { role: 'STUDENT' } } }
              }
            } 
          },
          studentCopies: {
            select: {
              id: true,
              status: true,
              grade: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!document) {
    throw error(404, 'Document not found');
  }

  // Check access
  const isOwner = document.ownerId === locals.user.id;
  const userShare = document.shares.find(s => s.userId === locals.user!.id);
  
  // Check class access (for teachers who own the class)
  const classIds = document.classShares.map(cs => cs.classId);
  const teacherClass = classIds.length > 0 ? await prisma.class.findFirst({
    where: {
      id: { in: classIds },
      teacherId: locals.user.id
    }
  }) : null;

  const canEdit = isOwner || userShare?.canEdit || !!teacherClass;
  
  if (!isOwner && !userShare && !teacherClass) {
    throw error(403, 'You do not have access to this document');
  }

  // Get classes for sharing/assigning (only for owner)
  const classes = isOwner ? await prisma.class.findMany({
    where: { teacherId: locals.user.id, archived: false },
    select: { 
      id: true, 
      name: true, 
      emoji: true,
      _count: {
        select: { members: { where: { role: 'STUDENT' } } }
      }
    },
    orderBy: { name: 'asc' }
  }) : [];

  const showShareModal = url.searchParams.get('share') === 'true';
  const showAssignModal = url.searchParams.get('assign') === 'true';

  // Process assignments to include stats
  const assignmentsWithStats = document.assignments.map(a => {
    const totalStudents = a.class._count.members;
    const copies = a.studentCopies;
    const submitted = copies.filter(c => c.status === 'SUBMITTED' || c.status === 'RESUBMITTED').length;
    const graded = copies.filter(c => c.grade !== null).length;
    
    return {
      ...a,
      stats: {
        totalStudents,
        submitted,
        graded,
        notStarted: copies.filter(c => c.status === 'NOT_STARTED').length,
        inProgress: copies.filter(c => c.status === 'IN_PROGRESS').length,
        returned: copies.filter(c => c.status === 'RETURNED').length
      }
    };
  });

  return { 
    document: {
      ...document,
      assignments: assignmentsWithStats,
      isOwner,
      canEdit
    },
    classes,
    showShareModal,
    showAssignModal
  };
};
