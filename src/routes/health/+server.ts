import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		// Simple DB connectivity check (lightweight query)
		await prisma.$queryRaw`SELECT 1`;
		return json({ status: 'ok', db: 'connected' });
	} catch (error) {
		console.error('[Health Check] Database connection failed:', error);
		// Return 200 to prevent container restarts, but indicate DB issue
		return json({ status: 'degraded', db: 'disconnected', error: String(error) }, { status: 200 });
	}
};
