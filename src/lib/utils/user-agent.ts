/**
 * Ringkasan perangkat untuk tampilan (mis. "Chrome · macOS"), hanya dari User-Agent browser.
 * Bukan identifikasi/keamanan — sekadar informasi bagi pengguna pada dialog keluar (FE-06).
 */
const BROWSERS: readonly [RegExp, string][] = [
	[/Edg\//, 'Edge'],
	[/OPR\//, 'Opera'],
	[/Firefox\//, 'Firefox'],
	[/Chrome\//, 'Chrome'],
	[/Safari\//, 'Safari']
];
const SYSTEMS: readonly [RegExp, string][] = [
	[/Windows/, 'Windows'],
	[/Android/, 'Android'],
	[/iPhone|iPad|iPod/, 'iOS'],
	[/Mac OS X|Macintosh/, 'macOS'],
	[/CrOS/, 'ChromeOS'],
	[/Linux/, 'Linux']
];

export function describeDevice(userAgent: string): string | null {
	const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
	const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
	const parts = [browser, system].filter(Boolean);
	return parts.length ? parts.join(' · ') : null;
}
