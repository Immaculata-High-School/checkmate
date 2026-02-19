import { error, redirect, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import * as powerSchool from '$lib/server/powerschool';
import type { PageServerLoad, Actions } from './$types';

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
          student: { select: { id: true, name: true, email: true } },
          activitySummary: {
            select: {
              totalKeystrokes: true,
              totalPastedChars: true,
              totalPastes: true,
              focusLostCount: true,
              avgTypingSpeed: true
            }
          },
          powerSchoolRelease: true
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

  // PowerSchool connection status
  const psConnected = await powerSchool.isConnected(locals.user.id);
  let linkedClasses: any[] = [];

  if (psConnected) {
    // Get classes that have this doc assigned and are linked to PowerSchool
    const docClasses = assignments.map(a => a.classId);
    const classMappings = await prisma.powerSchoolClassMapping.findMany({
      where: { classId: { in: docClasses } },
      include: {
        class: {
          include: {
            powerSchoolStudentMappings: true,
            _count: { select: { members: true } }
          }
        }
      }
    });

    linkedClasses = classMappings.map(cm => ({
      id: cm.classId,
      name: cm.class.name,
      psSection: cm.sectionName,
      psSectionId: cm.sectionId,
      psCategory: cm.defaultCategoryName,
      psCategoryId: cm.defaultCategoryId,
      rosterSynced: cm.class.powerSchoolStudentMappings.length > 0,
      mappedStudents: cm.class.powerSchoolStudentMappings.length,
      totalStudents: cm.class._count.members
    }));
  }

  return {
    document,
    assignments: assignmentsWithStats,
    classes: classes.map(c => c.class),
    selectedClassId: classId,
    powerSchool: {
      configured: powerSchool.getConfig().isConfigured,
      connected: psConnected,
      linkedClasses
    }
  };
};

export const actions: Actions = {
  releaseToPowerSchool: async ({ request, params, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const classId = formData.get('classId')?.toString();
    const assignmentName = formData.get('assignmentName')?.toString();
    const categoryId = formData.get('categoryId')?.toString();
    const dueDate = formData.get('dueDate')?.toString();
    const term = formData.get('term')?.toString();
    const forceRerelease = formData.get('forceRerelease') === 'true';
    const markMissing = formData.get('markMissing') === 'true';
    const totalPoints = formData.get('totalPoints')?.toString();

    if (!classId) {
      return fail(400, { error: 'Class selection required' });
    }

    if (!categoryId) {
      return fail(400, { error: 'Category selection required' });
    }

    // Verify ownership
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: { ownerId: true, title: true }
    });

    if (!document || document.ownerId !== locals.user.id) {
      return fail(403, { error: 'Not authorized' });
    }

    // Get org membership for tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user.id }
    });

    // Create background job
    const job = await prisma.aIJob.create({
      data: {
        type: 'POWERSCHOOL_SYNC',
        status: 'RUNNING',
        progress: 10,
        userId: locals.user.id,
        orgId: membership?.organizationId || null,
        input: {
          documentId: params.id,
          documentTitle: document.title,
          classId,
          assignmentName: assignmentName || document.title,
          categoryId: categoryId ? parseInt(categoryId) : undefined,
          dueDate: dueDate || undefined,
          term: term || undefined,
          forceRerelease,
          markMissing,
          totalPoints: totalPoints ? parseInt(totalPoints) : undefined
        },
        startedAt: new Date()
      }
    });

    // Fire and forget
    (async () => {
      try {
        const result = await powerSchool.releaseDocGradesToPowerSchool(
          locals.user!.id,
          params.id,
          classId,
          {
            assignmentName: assignmentName || document.title,
            categoryId: categoryId ? parseInt(categoryId) : undefined,
            dueDate: dueDate || undefined,
            term: term || undefined,
            forceRerelease,
            markMissing,
            totalPoints: totalPoints ? parseInt(totalPoints) : undefined
          }
        );

        let message = `${forceRerelease ? 'Updated' : 'Released'} ${result.released} grade${result.released !== 1 ? 's' : ''} to PowerSchool`;
        if (result.markedMissing && result.markedMissing > 0) {
          message += ` and marked ${result.markedMissing} student${result.markedMissing !== 1 ? 's' : ''} as missing`;
        }

        if (result.success && result.released > 0) {
          await prisma.aIJob.update({
            where: { id: job.id },
            data: {
              status: 'COMPLETED',
              progress: 100,
              completedAt: new Date(),
              output: { released: result.released, failed: result.failed, markedMissing: result.markedMissing, message },
              entityId: params.id,
              entityType: 'DOCUMENT'
            }
          });
          await prisma.notification.create({
            data: {
              type: 'JOB_COMPLETE',
              title: 'Document Grades Synced to PowerSchool',
              message,
              userId: locals.user!.id,
              jobId: job.id,
              link: `/teacher/docs/${params.id}/submissions`
            }
          });
        } else if (result.released > 0) {
          await prisma.aIJob.update({
            where: { id: job.id },
            data: {
              status: 'COMPLETED',
              progress: 100,
              completedAt: new Date(),
              output: { released: result.released, failed: result.failed, errors: result.errors, message: `Partially synced: ${result.released} of ${result.totalAttempted} grades` },
              entityId: params.id,
              entityType: 'DOCUMENT'
            }
          });
        } else {
          await prisma.aIJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              progress: 100,
              completedAt: new Date(),
              error: result.errors[0] || 'No grades could be released.',
              output: { errors: result.errors, unmatchedStudents: result.unmatchedStudents }
            }
          });
          await prisma.notification.create({
            data: {
              type: 'JOB_FAILED',
              title: 'PowerSchool Sync Failed',
              message: result.errors[0] || 'Students may need to be mapped.',
              userId: locals.user!.id,
              jobId: job.id,
              link: `/teacher/docs/${params.id}/submissions`
            }
          });
        }
      } catch (err) {
        console.error('PowerSchool doc sync error:', err);
        await prisma.aIJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            progress: 100,
            completedAt: new Date(),
            error: err instanceof Error ? err.message : 'Failed to sync grades'
          }
        });
        await prisma.notification.create({
          data: {
            type: 'JOB_FAILED',
            title: 'PowerSchool Sync Failed',
            message: err instanceof Error ? err.message : 'An error occurred',
            userId: locals.user!.id,
            jobId: job.id,
            link: `/teacher/docs/${params.id}/submissions`
          }
        });
      }
    })();

    return {
      psJobStarted: true,
      jobId: job.id,
      message: "We're syncing your grades to PowerSchool!"
    };
  }
};
