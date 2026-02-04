import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { cache } from '$lib/server/cache';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  if (locals.effectiveRole !== 'teacher' && locals.effectiveRole !== 'admin') {
    throw redirect(302, '/student');
  }

  // Check if user is an org owner/admin - redirect them to their org dashboard
  const orgOwnership = locals.orgMemberships?.find(
    (m: any) => m.role === 'ORG_OWNER' || m.role === 'ORG_ADMIN'
  );

  if (orgOwnership && orgOwnership.orgSlug) {
    throw redirect(302, `/org/${orgOwnership.orgSlug}`);
  }

  const userId = locals.user.id;
  
  // Cache keys
  const classesCacheKey = `teacher_classes:${userId}`;
  const testsCacheKey = `teacher_tests:${userId}`;
  const orgCacheKey = `teacher_org:${userId}`;
  
  // Try to get cached data
  let classes = cache.get<any[]>(classesCacheKey);
  let tests = cache.get<any[]>(testsCacheKey);
  let teacherMembership = cache.get<any>(orgCacheKey);
  
  // Collect queries that need to be run
  const queries: Promise<any>[] = [];
  const queryMap: { classes?: number; tests?: number; org?: number; jobs?: number } = {};
  
  if (!classes) {
    queryMap.classes = queries.length;
    queries.push(
      prisma.class.findMany({
        where: {
          teacherId: userId,
          archived: false
        },
        select: {
          id: true,
          name: true,
          description: true,
          joinCode: true,
          theme: true,
          emoji: true,
          createdAt: true,
          _count: { select: { members: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    );
  }
  
  if (!tests) {
    queryMap.tests = queries.length;
    queries.push(
      prisma.test.findMany({
        where: { teacherId: userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          accessCode: true,
          createdAt: true,
          _count: { select: { submissions: true, questions: true } }
        }
      })
    );
  }
  
  if (teacherMembership === null) {
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
              balance: true,
              powerSchoolEnabled: true
            }
          }
        }
      })
    );
  }
  
  // Always get fresh job count (changes frequently)
  queryMap.jobs = queries.length;
  queries.push(
    prisma.aIJob.count({
      where: {
        userId,
        status: { in: ['RUNNING', 'PENDING'] }
      }
    })
  );
  
  // Run all needed queries in parallel
  const results = await Promise.all(queries);
  
  // Update from results and cache
  if (queryMap.classes !== undefined) {
    classes = results[queryMap.classes];
    cache.set(classesCacheKey, classes, 30000); // 30 second cache
  }
  
  if (queryMap.tests !== undefined) {
    tests = results[queryMap.tests];
    cache.set(testsCacheKey, tests, 30000); // 30 second cache
  }
  
  if (queryMap.org !== undefined) {
    teacherMembership = results[queryMap.org];
    cache.set(orgCacheKey, teacherMembership, 60000); // 1 minute cache
  }
  
  const runningJobsCount = results[queryMap.jobs!];

  // If teacher is in an org with disabled billing OR zero/negative balance, show the disabled page
  let orgDisabled = false;
  let disabledOrgName = '';
  if (teacherMembership?.organization) {
    const org = teacherMembership.organization;
    if (!org.billingEnabled || org.balance <= 0) {
      orgDisabled = true;
      disabledOrgName = org.name;
    }
  }

  return {
    classes,
    tests,
    runningJobsCount,
    orgDisabled,
    disabledOrgName,
    powerSchoolEnabled: teacherMembership?.organization?.powerSchoolEnabled ?? true
  };
};
