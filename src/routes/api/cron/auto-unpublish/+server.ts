import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { logAudit } from '$lib/server/audit';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ request }) => {
	// Verify cron secret to prevent unauthorized access
	const authHeader = request.headers.get('authorization');
	const cronSecret = env.CRON_SECRET;
	
	// Allow if no secret is set (development) or if secret matches
	if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const now = new Date();
		
		// Find all published tests that should be unpublished
		// Check both autoUnpublishAt and endDate
		const testsToUnpublish = await prisma.test.findMany({
			where: {
				status: 'PUBLISHED',
				OR: [
					{ autoUnpublishAt: { lte: now } },
					{ endDate: { lte: now } }
				]
			},
			select: {
				id: true,
				title: true,
				autoUnpublishAt: true,
				endDate: true
			}
		});

		if (testsToUnpublish.length === 0) {
			return json({ 
				success: true, 
				message: 'No tests to unpublish',
				unpublished: 0 
			});
		}

		// Unpublish all matching tests
		const result = await prisma.test.updateMany({
			where: {
				id: {
					in: testsToUnpublish.map((t: { id: string }) => t.id)
				}
			},
			data: {
				status: 'ARCHIVED',
				autoUnpublishAt: null // Clear the auto-unpublish time
			}
		});

		console.log(`[Auto-Unpublish] Unpublished ${result.count} tests:`, testsToUnpublish.map((t: { title: string }) => t.title));

		logAudit({ action: 'SYSTEM_AUTO_UNPUBLISH', entityType: 'Test', details: { count: result.count, tests: testsToUnpublish.map((t: { id: string; title: string }) => t.title) } });

		return json({
			success: true,
			message: `Unpublished ${result.count} tests`,
			unpublished: result.count,
			tests: testsToUnpublish.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title }))
		});
	} catch (error) {
		console.error('[Auto-Unpublish] Error:', error);
		return json({ 
			error: 'Failed to process auto-unpublish',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

// Also support POST for flexibility
export const POST: RequestHandler = GET;
