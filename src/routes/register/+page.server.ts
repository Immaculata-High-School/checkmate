import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(302, '/dashboard');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const organizationName = formData.get('organizationName')?.toString().trim();
    const organizationType = formData.get('organizationType')?.toString();
    const contactName = formData.get('contactName')?.toString().trim();
    const contactEmail = formData.get('contactEmail')?.toString().toLowerCase().trim();
    const contactPhone = formData.get('contactPhone')?.toString().trim();
    const address = formData.get('address')?.toString().trim();
    const city = formData.get('city')?.toString().trim();
    const state = formData.get('state')?.toString().trim();
    const zipCode = formData.get('zipCode')?.toString().trim();
    const message = formData.get('message')?.toString().trim();

    if (!organizationName || !contactName || !contactEmail) {
      return fail(400, {
        error: 'Organization name, contact name, and email are required',
        organizationName,
        contactName,
        contactEmail,
        contactPhone,
        address,
        city,
        state,
        zipCode,
        message
      });
    }

    // Check if request already exists
    const existingRequest = await prisma.organizationRequest.findFirst({
      where: {
        contactEmail,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return fail(400, {
        error: 'A request from this email is already pending review',
        organizationName,
        contactName,
        contactEmail
      });
    }

    // Create organization request
    await prisma.organizationRequest.create({
      data: {
        organizationName,
        organizationType: (organizationType as any) || 'SCHOOL',
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        message: message || null,
        status: 'PENDING'
      }
    });

    return { success: true };
  }
};
