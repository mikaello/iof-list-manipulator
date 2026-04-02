import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// When deploying to GitHub Pages the site lives at /<repo-name>/.
// The CI workflow sets BASE_PATH via `actions/configure-pages` so that
// all asset references and links are prefixed correctly.
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: '404.html'
		}),
		paths: { base }
	}
};

export default config;
