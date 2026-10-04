/**
 * Preferensi mode warna (FE-05R). Non-sensitif; disimpan di cookie agar SSR mengisi `<html data-mode>`
 * tanpa kedipan. `system` = mengikuti OS (bawaan).
 */
export const COLOR_MODES = ['light', 'dark', 'system'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const DEFAULT_COLOR_MODE: ColorMode = 'system';
export const COLOR_MODE_COOKIE = 'lms_color_mode';
const COLOR_MODE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isColorMode(value: unknown): value is ColorMode {
	return typeof value === 'string' && (COLOR_MODES as readonly string[]).includes(value);
}

export function resolveColorMode(cookieValue: string | undefined): ColorMode {
	return isColorMode(cookieValue) ? cookieValue : DEFAULT_COLOR_MODE;
}

/** Hanya di browser: menerapkan mode ke `<html>` dan menyimpannya untuk SSR berikutnya. */
export function applyColorMode(mode: ColorMode): void {
	document.documentElement.dataset.mode = mode;
	const secureAttribute = location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `${COLOR_MODE_COOKIE}=${mode}; Path=/; Max-Age=${COLOR_MODE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureAttribute}`;
}
