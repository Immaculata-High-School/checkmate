import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { generateCode } from '$lib/utils';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  return {};
};

export const actions: Actions = {
  default: async (event) => {
    const { request, locals } = event;
    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const description = formData.get('description')?.toString().trim();

    if (!name) {
      return fail(400, { error: 'Class name is required' });
    }

    // Get teacher's organization if they have one
    const membership = locals.orgMemberships?.find(
      (m: any) => ['ORG_OWNER', 'ORG_ADMIN', 'TEACHER', 'TEACHING_ASSISTANT'].includes(m.role)
    );

    const cls = await prisma.class.create({
      data: {
        name,
        description,
        joinCode: generateCode(6),
        teacherId: locals.user!.id,
        organizationId: membership?.orgId || null
      }
    });

    logAudit({ userId: locals.user!.id, action: 'CLASS_CREATED', entityType: 'Class', entityId: cls.id, details: { name }, ...getRequestInfo(event) });

    throw redirect(302, `/teacher/classes/${cls.id}`);
  }
};
