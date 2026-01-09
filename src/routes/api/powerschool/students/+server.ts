import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import * as powerSchool from '$lib/server/powerschool';
import type { RequestHandler } from './$types';

// GET /api/powerschool/students?classId=xxx
// Fetches PowerSchool students for a specific class on demand
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const classId = url.searchParams.get('classId');
  if (!classId) {
    throw error(400, 'classId is required');
  }

  // Verify the user owns this class
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      powerSchoolMapping: true
    }
  });

  if (!cls) {
    throw error(404, 'Class not found');
  }

  if (cls.teacherId !== locals.user.id) {
    throw error(403, 'Not authorized');
  }

  // Check PowerSchool connection
  const psStatus = await powerSchool.getConnectionStatus(locals.user.id);
  
  if (!psStatus.connected) {
    return json({ 
      students: [], 
      error: 'PowerSchool not connected' 
    });
  }

  if (!cls.powerSchoolMapping) {
    return json({ 
      students: [], 
      error: 'Class not linked to PowerSchool' 
    });
  }

  try {
    const students = await powerSchool.getSectionStudents(
      locals.user.id,
      cls.powerSchoolMapping.sectionId
    );

    return json({ 
      students,
      sectionId: cls.powerSchoolMapping.sectionId,
      sectionName: cls.powerSchoolMapping.sectionName
    });
  } catch (e) {
    console.error('Failed to fetch PowerSchool students:', e);
    return json({ 
      students: [], 
      error: e instanceof Error ? e.message : 'Failed to fetch students' 
    });
  }
};
