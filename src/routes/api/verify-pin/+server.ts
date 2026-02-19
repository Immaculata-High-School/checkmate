import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import bcrypt from 'bcryptjs';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { pin } = await request.json();

	if (!pin || typeof pin !== 'string') {
		return json({ error: 'PIN is required' }, { status: 400 });
	}

	const user = await prisma.user.findUnique({
		where: { id: locals.user.id },
		select: { dashboardPin: true, dashboardPinEnabled: true }
	});

	if (!user?.dashboardPinEnabled || !user.dashboardPin) {
		return json({ error: 'PIN lock is not enabled' }, { status: 400 });
	}

	const valid = await bcrypt.compare(pin, user.dashboardPin);

	if (!valid) {
		return json({ error: 'Incorrect PIN' }, { status: 403 });
	}

	return json({ success: true });
};
