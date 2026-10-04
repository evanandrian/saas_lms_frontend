import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

// ---------------------------------------------------------------------------
// Architecture boundary enforcement (FE-FOUNDATION-02).
// Dokumentasi: docs/architecture/frontend-architecture-boundaries.md
// Catatan: pada flat config, opsi rule di blok yang lebih spesifik MENGGANTI
// (bukan menggabung) opsi sebelumnya, sehingga setiap area mendaftar lengkap.
// ---------------------------------------------------------------------------

/** Token dan data sesi tidak boleh disimpan di storage browser (ADR-019). */
const BROWSER_STORAGE_MESSAGE =
	'Dilarang oleh ADR-019: jangan simpan token/sesi di storage browser. Gunakan cookie HttpOnly dari backend.';

const STORAGE_GLOBALS = [
	{ name: 'localStorage', message: BROWSER_STORAGE_MESSAGE },
	{ name: 'sessionStorage', message: BROWSER_STORAGE_MESSAGE }
];
const STORAGE_PROPERTIES = [
	{ object: 'window', property: 'localStorage', message: BROWSER_STORAGE_MESSAGE },
	{ object: 'window', property: 'sessionStorage', message: BROWSER_STORAGE_MESSAGE }
];

/** Route dan komponen tidak memanggil HTTP langsung; `fetch` dari parameter `load` tetap diizinkan. */
const RAW_FETCH_GLOBAL = {
	name: 'fetch',
	message:
		'Raw fetch() dilarang di route/komponen. Gunakan feature API → generated client (ADR-021, FE-02).'
};
const DOCUMENT_COOKIE_PROPERTY = {
	object: 'document',
	property: 'cookie',
	message:
		'Akses cookie hanya melalui infrastruktur ($lib/i18n, $lib/auth), bukan dari route/komponen.'
};

const PRESENTATION_GLOBALS = [...STORAGE_GLOBALS, RAW_FETCH_GLOBAL];
const PRESENTATION_PROPERTIES = [...STORAGE_PROPERTIES, DOCUMENT_COOKIE_PROPERTY];

const GENERATED_CLIENT = {
	group: ['$lib/api/generated', '$lib/api/generated/**'],
	message: 'Generated client hanya dipakai oleh feature API (ADR-021).'
};
const API_ANY = {
	group: ['$lib/api', '$lib/api/**'],
	message: 'Komponen tidak mengakses API; data diterima dari route/feature (FE-02).'
};
const FEATURE_INTERNAL = {
	group: ['$lib/features/*/internal', '$lib/features/*/internal/**'],
	message:
		'Jangan mengimpor internal feature lain; gunakan public boundary feature tersebut (FE-02).'
};
const FEATURES_ANY = {
	group: ['$lib/features', '$lib/features/**'],
	message: 'Lapisan ini tidak boleh bergantung pada feature (FE-02).'
};
/** Dipakai dengan `@typescript-eslint/no-restricted-imports` agar `import type` tetap diizinkan. */
const FEATURES_TYPES_ONLY = {
	group: ['$lib/features', '$lib/features/**'],
	allowTypeImports: true,
	message:
		'Domain component hanya boleh memakai tipe feature (`import type`), bukan API/state feature (FE-02).'
};
const COMPONENTS_ANY = {
	group: ['$lib/components', '$lib/components/**'],
	message: 'Infrastruktur tidak boleh bergantung pada komponen (FE-02).'
};
const NON_UI_COMPONENTS = {
	group: ['$lib/components/layout/**', '$lib/components/domain/**'],
	message: 'UI primitive tidak boleh bergantung pada komponen layout/domain (FE-02).'
};
const LAYOUT_COMPONENTS = {
	group: ['$lib/components/layout/**'],
	message: 'Lapisan ini tidak boleh bergantung pada komponen layout (FE-02).'
};
const AUTH_ANY = {
	group: ['$lib/auth', '$lib/auth/**'],
	message: 'UI primitive tidak mengetahui auth/permission (FE-02).'
};
const HOST_CONTEXT_ANY = {
	group: ['$lib/utils/host-context'],
	message: 'Komponen tidak memuat logika host/tenant (ADR-019, FE-02).'
};
const ROUTES_ANY = {
	group: ['**/routes/**'],
	message: 'Lapisan $lib tidak boleh bergantung pada route (FE-02).'
};

const AUTH_SESSION_INTERNAL = {
	name: '$lib/auth/session',
	message: 'Internal sesi hanya untuk hooks/infrastruktur; baca sesi lewat event.locals (ADR-019).'
};
const HOST_RESOLVER = {
	name: '$lib/utils/host-context',
	importNames: ['resolveHostContext'],
	message: 'Resolusi host hanya di hooks.server.ts; route memakai assertHostKind (ADR-019).'
};

/** @param {object[]} patterns @param {object[]} [paths] */
const restrictImports = (patterns, paths = []) => ['error', { patterns, paths }];

export default ts.config(
	{ ignores: ['build/', '.svelte-kit/', 'dist/', 'coverage/'] },
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// TypeScript sudah memeriksa identifier yang tidak terdefinisi.
			'no-undef': 'off',
			'no-restricted-globals': ['error', ...STORAGE_GLOBALS],
			'no-restricted-properties': ['error', ...STORAGE_PROPERTIES]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	// ROUTE: komposisi halaman; tanpa raw fetch, generated client, internal sesi, atau resolusi host.
	{
		files: ['src/routes/**'],
		rules: {
			'no-restricted-globals': ['error', ...PRESENTATION_GLOBALS],
			'no-restricted-properties': ['error', ...PRESENTATION_PROPERTIES],
			'no-restricted-imports': restrictImports(
				[GENERATED_CLIENT, FEATURE_INTERNAL],
				[AUTH_SESSION_INTERNAL, HOST_RESOLVER]
			)
		}
	},
	// UI COMPONENT: primitive presentasi murni.
	{
		files: ['src/lib/components/ui/**'],
		rules: {
			'no-restricted-globals': ['error', ...PRESENTATION_GLOBALS],
			'no-restricted-properties': ['error', ...PRESENTATION_PROPERTIES],
			'no-restricted-imports': restrictImports([
				FEATURES_ANY,
				API_ANY,
				AUTH_ANY,
				HOST_CONTEXT_ANY,
				NON_UI_COMPONENTS,
				ROUTES_ANY
			])
		}
	},
	// LAYOUT COMPONENT: kerangka aplikasi; boleh i18n dan $app/*, tanpa feature/API/tenant.
	{
		files: ['src/lib/components/layout/**'],
		rules: {
			'no-restricted-globals': ['error', ...PRESENTATION_GLOBALS],
			'no-restricted-properties': ['error', ...PRESENTATION_PROPERTIES],
			'no-restricted-imports': restrictImports(
				[FEATURES_ANY, API_ANY, HOST_CONTEXT_ANY, ROUTES_ANY],
				[AUTH_SESSION_INTERNAL]
			)
		}
	},
	// DOMAIN COMPONENT: konsep bisnis; boleh UI dan tipe feature saja.
	{
		files: ['src/lib/components/domain/**'],
		rules: {
			'no-restricted-globals': ['error', ...PRESENTATION_GLOBALS],
			'no-restricted-properties': ['error', ...PRESENTATION_PROPERTIES],
			// Varian typescript-eslint dipakai karena mendukung `allowTypeImports`.
			'@typescript-eslint/no-restricted-imports': restrictImports(
				[FEATURES_TYPES_ONLY, API_ANY, HOST_CONTEXT_ANY, LAYOUT_COMPONENTS, ROUTES_ANY],
				[AUTH_SESSION_INTERNAL]
			)
		}
	},
	// FEATURE: orkestrasi feature; tanpa route, internal feature lain, atau internal sesi/host.
	{
		files: ['src/lib/features/**'],
		rules: {
			'no-restricted-imports': restrictImports(
				[FEATURE_INTERNAL, LAYOUT_COMPONENTS, ROUTES_ANY],
				[AUTH_SESSION_INTERNAL, HOST_RESOLVER]
			)
		}
	},
	// INFRASTRUCTURE: tidak bergantung ke atas (feature, komponen, route).
	{
		files: [
			'src/lib/api/**',
			'src/lib/auth/**',
			'src/lib/i18n/**',
			'src/lib/offline/**',
			'src/lib/utils/**'
		],
		rules: {
			'no-restricted-imports': restrictImports([FEATURES_ANY, COMPONENTS_ANY, ROUTES_ANY])
		}
	}
);
