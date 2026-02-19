import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { generateCode } from '$lib/utils';
import { sendOrganizationInvite, sendRequestApproved, sendRequestRejected } from '$lib/server/email';
import { logAudit, getRequestInfo } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const request = await prisma.organizationRequest.findUnique({
    where: { id: params.id }
  });

  if (!request) {
    throw error(404, 'Request not found');
  }

  return { request };
};

export const actions: Actions = {
  approve: async (event) => {
    const { params, locals } = event;
    const formData = await event.request.formData();
    const monthlyUserFee = parseFloat(formData.get('monthlyUserFee')?.toString() || '5');

    const req = await prisma.organizationRequest.findUnique({
      where: { id: params.id }
    });

    if (!req) {
      return fail(404, { error: 'Request not found' });
    }

    if (req.status !== 'PENDING') {
      return fail(400, { error: 'Request has already been processed' });
    }

    // Generate a unique slug
    const baseSlug = req.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the organization
    const organization = await prisma.organization.create({
      data: {
        name: req.organizationName,
        slug,
        type: req.organizationType,
        email: req.contactEmail,
        phone: req.contactPhone,
        address: req.address,
        city: req.city,
        state: req.state,
        zipCode: req.zipCode,
        country: req.country,
        monthlyUserFee
      }
    });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: req.contactEmail }
    });

    if (existingUser) {
      // User exists - add them directly as org owner
      await prisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: existingUser.id,
          role: 'ORG_OWNER'
        }
      });

      // Send approval notification
      await sendRequestApproved(req.contactEmail, req.organizationName);
    } else {
      // User doesn't exist - create invite link
      const inviteToken = generateCode(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.organizationInvite.create({
        data: {
          organizationId: organization.id,
          email: req.contactEmail,
          role: 'ORG_OWNER',
          token: inviteToken,
          expiresAt
        }
      });

      // Send invite email
      await sendOrganizationInvite(req.contactEmail, req.organizationName, 'ORG_OWNER', inviteToken);
    }

    // Update request status
    await prisma.organizationRequest.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        reviewedBy: locals.user!.id,
        reviewedAt: new Date()
      }
    });

    logAudit({ userId: locals.user?.id, action: 'ADMIN_REQUEST_APPROVED', entityType: 'OrganizationRequest', entityId: params.id, details: { organizationName: req.organizationName, organizationId: organization.id }, ...getRequestInfo(event) });

    throw redirect(302, '/admin/requests');
  },

  reject: async (event) => {
    const { params, locals } = event;
    const formData = await event.request.formData();
    const reason = formData.get('reason')?.toString();

    const req = await prisma.organizationRequest.findUnique({
      where: { id: params.id }
    });

    if (!req) {
      return fail(404, { error: 'Request not found' });
    }

    if (req.status !== 'PENDING') {
      return fail(400, { error: 'Request has already been processed' });
    }

    await prisma.organizationRequest.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        reviewedBy: locals.user!.id,
        reviewedAt: new Date(),
        rejectionReason: reason
      }
    });

    // Send rejection email
    await sendRequestRejected(req.contactEmail, req.organizationName, reason);

    logAudit({ userId: locals.user?.id, action: 'ADMIN_REQUEST_REJECTED', entityType: 'OrganizationRequest', entityId: params.id, details: { organizationName: req.organizationName, reason }, ...getRequestInfo(event) });

    throw redirect(302, '/admin/requests');
  }
};
