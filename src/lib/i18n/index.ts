import { dev } from '$app/environment';
import { getContext, setContext } from 'svelte';
import en from './en.json';
import id from './id.json';

/**
 * `en` adalah resource dorman untuk kesiapan mendatang (FE-04R): tidak dapat dipilih dari UI,
 * tidak ada pemilih bahasa, cookie, maupun deteksi bahasa browser.
 */
export const LOCALES = ['id', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** UI saat ini hanya Bahasa Indonesia (NFR-13, SAD §10.4; keputusan FE-04R). */
export const DEFAULT_LOCALE: Locale = 'id';
export const FALLBACK_LOCALE: Locale = 'id';

type Messages = { readonly [key: string]: string | Messages };
export type TranslationParams = Readonly<Record<string, string | number>>;

const MESSAGES: Readonly<Record<Locale, Messages>> = { id, en };
const PARAM_PATTERN = /\{(\w+)\}/g;

function lookupMessage(messages: Messages, key: string): string | undefined {
	let node: string | Messages | undefined = messages;
	for (const part of key.split('.')) {
		if (node === undefined || typeof node === 'string') return undefined;
		node = node[part];
	}
	return typeof node === 'string' ? node : undefined;
}

/** Kunci `<module>.<screen>.<element>`; kunci hilang di locale aktif jatuh ke `id`, lalu ke kunci itu sendiri. */
export function translate(locale: Locale, key: string, params?: TranslationParams): string {
	const template =
		lookupMessage(MESSAGES[locale], key) ?? lookupMessage(MESSAGES[FALLBACK_LOCALE], key);

	if (template === undefined) {
		if (dev) console.warn(`[i18n] Missing translation key: ${key}`);
		return key;
	}

	if (!params) return template;
	return template.replace(PARAM_PATTERN, (placeholder, name: string) =>
		name in params ? String(params[name]) : placeholder
	);
}

export interface I18n {
	readonly locale: Locale;
	t(key: string, params?: TranslationParams): string;
}

const I18N_CONTEXT_KEY = Symbol('lms-i18n');

/** Dipanggil sekali di root layout; `getLocale` reaktif terhadap data layout. */
export function setI18n(getLocale: () => Locale): I18n {
	const i18n: I18n = {
		get locale() {
			return getLocale();
		},
		t: (key, params) => translate(getLocale(), key, params)
	};
	setContext(I18N_CONTEXT_KEY, i18n);
	return i18n;
}

export function useI18n(): I18n {
	const i18n = getContext<I18n | undefined>(I18N_CONTEXT_KEY);
	if (!i18n) throw new Error('i18n context is not initialized; call setI18n() in the root layout.');
	return i18n;
}
