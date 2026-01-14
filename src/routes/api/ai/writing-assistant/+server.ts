import { json, error } from '@sveltejs/kit';
import { createJob, getJobStatus } from '$lib/server/jobs';
import { prisma } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request, locals }: RequestEvent) {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  // Only teachers can use the writing assistant
  if (locals.effectiveRole !== 'teacher' && locals.effectiveRole !== 'admin') {
    throw error(403, 'Only teachers can use the AI writing assistant');
  }

  try {
    const body = await request.json();
    const { prompt, currentContent, title, documentId } = body;

    if (!prompt || typeof prompt !== 'string') {
      throw error(400, 'Prompt is required');
    }

    if (!documentId || typeof documentId !== 'string') {
      throw error(400, 'Document ID is required');
    }

    // Get org membership for AI tracking
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: locals.user.id }
    });

    // Create a job for the writing assistant
    const job = await createJob(
      'WRITING_ASSISTANT',
      {
        prompt,
        currentContent: currentContent || '',
        title: title || 'Untitled Document',
        documentId
      },
      locals.user.id,
      membership?.organizationId
    );

    return json({
      success: true,
      jobId: job.id,
      message: 'AI writing job started'
    });
  } catch (err) {
    console.error('Writing assistant error:', err);

    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    throw error(500, err instanceof Error ? err.message : 'Failed to process request');
  }
}

// GET endpoint to check job status and get result
export async function GET({ url, locals }: RequestEvent) {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  const jobId = url.searchParams.get('jobId');
  if (!jobId) {
    throw error(400, 'Job ID is required');
  }

  try {
    const job = await getJobStatus(jobId);
    
    if (!job) {
      throw error(404, 'Job not found');
    }

    return json({
      success: true,
      status: job.status,
      progress: job.progress,
      output: job.output,
      error: job.error
    });
  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    throw error(500, err instanceof Error ? err.message : 'Failed to get job status');
  }
}
