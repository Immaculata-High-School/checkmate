import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// Don't externalize @prisma/client - bundle it to avoid ESM/CJS issues
		noExternal: ['@prisma/client']
	}
});
