import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getQueueStatus, getStudentQueueInfo, getRateLimitStatus, getQueueStats } from '$lib/server/rateLimiter';

// GET /api/queue - Get queue status for current user or specific submission
export const GET = async ({ url, locals }: RequestEvent) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const submissionId = url.searchParams.get('submissionId');
  const includeStats = url.searchParams.get('stats') === 'true';

  // If submissionId provided, get specific submission status
  if (submissionId) {
    const status = await getQueueStatus(submissionId);

    if (!status) {
      return json({
        status: 'not_queued',
        message: 'This submission is not in the grading queue'
      });
    }

    return json(status);
  }

  // Otherwise, get all queue info for current user
  const userQueue = await getStudentQueueInfo(locals.user.id);
  const rateLimitStatus = getRateLimitStatus();

  const response: Record<string, unknown> = {
    ...userQueue,
    rateLimit: {
      currentRequests: rateLimitStatus.currentRequests,
      maxRequests: rateLimitStatus.maxRequests,
      availableSlots: rateLimitStatus.availableSlots
    }
  };

  // Include queue stats if requested (for admin dashboards)
  if (includeStats) {
    const stats = await getQueueStats();
    response.stats = stats;
  }

  return json(response);
};
