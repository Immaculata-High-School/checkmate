import { error, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

async function requireOrgAdmin(slug: string, userId: string) {
  const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
  if (!org) throw error(404, 'Organization not found');
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: org.id, role: { in: ['ORG_OWNER', 'ORG_ADMIN'] }, isActive: true }
  });
  if (!membership) throw error(403, 'Not authorized');
  return org;
}

export const load: PageServerLoad = async ({ params }) => {
  const organization = await prisma.organization.findUnique({
    where: { slug: params.slug },
    include: {
      departments: {
        orderBy: { name: 'asc' }
      }
    }
  });

  if (!organization) {
    return { organization: null, departments: [] };
  }

  return {
    organization,
    departments: organization.departments
  };
};

export const actions: Actions = {
  updateOrganization: async ({ request, params, locals }) => {
    if (!locals.user) throw error(401, 'Not authenticated');
    await requireOrgAdmin(params.slug, locals.user.id);

    const organization = await prisma.organization.findUnique({
      where: { slug: params.slug }
    });

    if (!organization) {
      return fail(404, { error: 'Organization not found' });
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().toLowerCase().trim();
    const phone = formData.get('phone')?.toString().trim();
    const website = formData.get('website')?.toString().trim();
    const address = formData.get('address')?.toString().trim();
    const city = formData.get('city')?.toString().trim();
    const state = formData.get('state')?.toString().trim();
    const zipCode = formData.get('zipCode')?.toString().trim();
    const timezone = formData.get('timezone')?.toString();

    if (!name) {
      return fail(400, { error: 'Organization name is required' });
    }

    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        timezone: timezone || 'America/New_York'
      }
    });

    return { success: true, message: 'Organization settings updated' };
  },

  updateBranding: async ({ request, params, locals }) => {
    if (!locals.user) throw error(401, 'Not authenticated');
    await requireOrgAdmin(params.slug, locals.user.id);

    const organization = await prisma.organization.findUnique({
      where: { slug: params.slug }
    });

    if (!organization) {
      return fail(404, { error: 'Organization not found' });
    }

    const formData = await request.formData();
    const logoUrl = formData.get('logoUrl')?.toString().trim();
    const primaryColor = formData.get('primaryColor')?.toString().trim();
    const secondaryColor = formData.get('secondaryColor')?.toString().trim();

    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || '#3b82f6',
        secondaryColor: secondaryColor || '#1e40af'
      }
    });

    return { brandingSuccess: true, message: 'Branding settings updated' };
  },

  createDepartment: async ({ request, params, locals }) => {
    if (!locals.user) throw error(401, 'Not authenticated');
    await requireOrgAdmin(params.slug, locals.user.id);

    const organization = await prisma.organization.findUnique({
      where: { slug: params.slug }
    });

    if (!organization) {
      return fail(404, { error: 'Organization not found' });
    }

    const formData = await request.formData();
    const name = formData.get('departmentName')?.toString().trim();

    if (!name) {
      return fail(400, { deptError: 'Department name is required' });
    }

    await prisma.department.create({
      data: {
        name,
        organizationId: organization.id
      }
    });

    return { deptSuccess: true };
  },

  deleteDepartment: async ({ request, params, locals }) => {
    if (!locals.user) throw error(401, 'Not authenticated');
    await requireOrgAdmin(params.slug, locals.user.id);

    const formData = await request.formData();
    const departmentId = formData.get('departmentId')?.toString();

    if (!departmentId) {
      return fail(400, { error: 'Department ID required' });
    }

    await prisma.department.delete({
      where: { id: departmentId }
    });

    return { deptSuccess: true };
  }
};
