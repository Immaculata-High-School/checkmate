import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// Explicitly externalize Prisma to avoid bundling issues
		external: ['@prisma/client', '.prisma/client']
	}
});
