import { json, error } from '@sveltejs/kit';
import { shuttleAI } from '$lib/server/shuttleai';
import { prisma } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request, locals }: RequestEvent) {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  try {
    const body = await request.json();
    const { message, currentPage, context } = body;

    if (!message || typeof message !== 'string') {
      throw error(400, 'Message is required');
    }

    // Get org membership for AI tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user.id }
    });

    const result = await shuttleAI.teacherAssistant(
      {
        message,
        currentPage: currentPage || '/teacher',
        context
      },
      { userId: locals.user.id, orgId: membership?.organizationId }
    );

    return json({
      success: true,
      response: result.response,
      action: result.action
    });
  } catch (err) {
    console.error('Teacher assistant error:', err);

    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    throw error(500, err instanceof Error ? err.message : 'Failed to process request');
  }
}
