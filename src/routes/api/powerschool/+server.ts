/**
 * PowerSchool API endpoints
 */
import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import * as powerSchool from '$lib/server/powerschool';
import type { RequestHandler } from './$types';

// GET - Get connection status and data
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'status': {
        const status = await powerSchool.getConnectionStatus(locals.user.id);
        const config = powerSchool.getConfig();
        return json({
          ...status,
          configured: config.isConfigured
        });
      }

      case 'sections': {
        const sections = await powerSchool.getSections(locals.user.id);
        return json({ sections });
      }

      case 'categories': {
        const categories = await powerSchool.getCategories(locals.user.id);
        return json({ categories });
      }

      case 'students': {
        const sectionId = url.searchParams.get('sectionId');
        if (!sectionId) {
          throw error(400, 'sectionId required');
        }
        const students = await powerSchool.getSectionStudents(locals.user.id, parseInt(sectionId));
        return json({ students });
      }

      case 'class-mapping': {
        const classId = url.searchParams.get('classId');
        if (!classId) {
          throw error(400, 'classId required');
        }
        const mapping = await prisma.powerSchoolClassMapping.findUnique({
          where: { classId }
        });
        return json({ mapping });
      }

      case 'terms': {
        const termsData = await powerSchool.getTerms(locals.user.id);
        return json({
          current_term: termsData.current_term,
          store_codes: termsData.store_codes
        });
      }

      case 'sync-data': {
        // Get categories and terms in one call for the sync modal
        const [categories, termsData] = await Promise.all([
          powerSchool.getCategories(locals.user.id),
          powerSchool.getTerms(locals.user.id).catch(() => null)
        ]);
        return json({
          categories,
          terms: termsData ? {
            current_term: termsData.current_term,
            store_codes: termsData.store_codes
          } : null
        });
      }

      case 'auth-url': {
        const state = crypto.randomUUID();
        const authUrl = powerSchool.getAuthorizationUrl(state, url.origin);
        return json({ authUrl, state });
      }

      default:
        throw error(400, 'Invalid action');
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('PowerSchool API error:', err);
    throw error(500, err instanceof Error ? err.message : 'PowerSchool API error');
  }
};

// POST - Perform actions
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const data = await request.json();
  const action = data.action;

  try {
    switch (action) {
      case 'disconnect': {
        await powerSchool.disconnect(locals.user.id);
        return json({ success: true });
      }

      case 'save-mapping': {
        const { classId, sectionId, sectionName, categoryId, categoryName, term, yearId } = data;
        
        if (!classId || !sectionId) {
          throw error(400, 'classId and sectionId required');
        }

        // Verify user owns this class
        const cls = await prisma.class.findFirst({
          where: { id: classId, teacherId: locals.user.id }
        });

        if (!cls) {
          throw error(403, 'Not authorized to modify this class');
        }

        const mapping = await prisma.powerSchoolClassMapping.upsert({
          where: { classId },
          update: {
            sectionId: parseInt(sectionId),
            sectionName,
            defaultCategoryId: categoryId ? parseInt(categoryId) : null,
            defaultCategoryName: categoryName,
            term,
            yearId: yearId ? parseInt(yearId) : null
          },
          create: {
            classId,
            sectionId: parseInt(sectionId),
            sectionName,
            defaultCategoryId: categoryId ? parseInt(categoryId) : null,
            defaultCategoryName: categoryName,
            term,
            yearId: yearId ? parseInt(yearId) : null
          }
        });

        return json({ success: true, mapping });
      }

      case 'remove-mapping': {
        const { classId } = data;
        
        if (!classId) {
          throw error(400, 'classId required');
        }

        // Verify user owns this class
        const cls = await prisma.class.findFirst({
          where: { id: classId, teacherId: locals.user.id }
        });

        if (!cls) {
          throw error(403, 'Not authorized to modify this class');
        }

        await prisma.powerSchoolClassMapping.delete({
          where: { classId }
        }).catch(() => {});

        return json({ success: true });
      }

      case 'release-grades': {
        const { testId, classId, assignmentName, categoryId, dueDate, submissionIds } = data;

        if (!testId || !classId) {
          throw error(400, 'testId and classId required');
        }

        // Verify user owns this test
        const test = await prisma.test.findFirst({
          where: { id: testId, teacherId: locals.user.id }
        });

        if (!test) {
          throw error(403, 'Not authorized to release grades for this test');
        }

        const result = await powerSchool.releaseGradesToPowerSchool(
          locals.user.id,
          testId,
          classId,
          {
            assignmentName,
            categoryId: categoryId ? parseInt(categoryId) : undefined,
            dueDate,
            submissionIds
          }
        );

        return json(result);
      }

      default:
        throw error(400, 'Invalid action');
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('PowerSchool API error:', err);
    throw error(500, err instanceof Error ? err.message : 'PowerSchool API error');
  }
};
