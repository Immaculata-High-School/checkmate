import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma, withRetry } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		// DB check with retry for cold starts (Prisma.io wakes up on first request)
		await withRetry(
			() => prisma.$queryRaw`SELECT 1`,
			2,  // 2 retries (3 attempts total)
			2000 // 2 second delay between retries
		);
		
		return json({ status: 'ok', db: 'connected' });
	} catch (error) {
		console.error('[Health Check] Database connection issue:', error);
		// ALWAYS return 200 to prevent container restarts
		// App can still serve cached content during DB wake-up
		return json({ status: 'degraded', db: 'disconnected', error: String(error) }, { status: 200 });
	}
};
