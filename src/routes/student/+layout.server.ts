import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { cache } from '$lib/server/cache';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const userId = locals.user.id;
  
  // Cache keys
  const orgCacheKey = `student_org:${userId}`;
  const classesCacheKey = `student_classes:${userId}`;
  
  // Try to get cached data
  let studentMembership = cache.get<any>(orgCacheKey);
  let classMemberships = cache.get<any[]>(classesCacheKey);
  
  // Collect queries that need to be run
  const queries: Promise<any>[] = [];
  const queryMap: { org?: number; classes?: number } = {};
  
  if (studentMembership === null) {
    queryMap.org = queries.length;
    queries.push(
      prisma.organizationMember.findFirst({
        where: { userId },
        select: {
          organization: {
            select: {
              id: true,
              name: true,
              billingEnabled: true,
              balance: true
            }
          }
        }
      })
    );
  }
  
  if (!classMemberships) {
    queryMap.classes = queries.length;
    queries.push(
      prisma.classMember.findMany({
        where: { userId },
        select: {
          class: {
            select: {
              id: true,
              name: true,
              description: true,
              joinCode: true,
              theme: true,
              emoji: true,
              archived: true,
              teacher: { select: { name: true } }
            }
          }
        }
      })
    );
  }
  
  // Run all needed queries in parallel
  if (queries.length > 0) {
    const results = await Promise.all(queries);
    
    if (queryMap.org !== undefined) {
      studentMembership = results[queryMap.org];
      cache.set(orgCacheKey, studentMembership, 60000); // 1 minute cache
    }
    
    if (queryMap.classes !== undefined) {
      classMemberships = results[queryMap.classes];
      cache.set(classesCacheKey, classMemberships, 30000); // 30 second cache
    }
  }

  // If student is in an org with disabled billing OR zero/negative balance, show the disabled page
  let orgDisabled = false;
  let disabledOrgName = '';
  if (studentMembership?.organization) {
    const org = studentMembership.organization;
    if (!org.billingEnabled || org.balance <= 0) {
      orgDisabled = true;
      disabledOrgName = org.name;
    }
  }

  const classes = (classMemberships || []).map((m: any) => m.class);
  const classIds = classes.map((c: any) => c.id);

  // Get pending assignments - cache for 15 seconds (changes more frequently)
  const assignmentsCacheKey = `student_assignments:${userId}`;
  let assignments = cache.get<any[]>(assignmentsCacheKey);
  
  if (!assignments && classIds.length > 0) {
    assignments = await prisma.classAssignment.findMany({
      where: {
        classId: { in: classIds },
        OR: [{ dueDate: { gte: new Date() } }, { dueDate: null }]
      },
      select: {
        id: true,
        type: true,
        title: true,
        dueDate: true,
        test: { select: { id: true, title: true } },
        studySet: { select: { id: true, title: true } },
        class: { select: { id: true, name: true } }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    });
    cache.set(assignmentsCacheKey, assignments, 15000); // 15 second cache
  }

  return {
    classes,
    assignments: assignments || [],
    orgDisabled,
    disabledOrgName
  };
};
