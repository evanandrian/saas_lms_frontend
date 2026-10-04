import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// ADR-020: server runtime Node.js (bukan adapter-static).
		adapter: adapter()
	},
	vitePlugin: {
		// Svelte 5 runes wajib untuk kode proyek; library di node_modules tetap memakai mode bawaannya.
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
