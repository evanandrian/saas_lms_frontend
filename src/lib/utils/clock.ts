/**
 * Utilitas jam & tanggal dashboard (FE-07). Semua jam dalam WIB (`Asia/Jakarta`),
 * dinyatakan sebagai detik sejak tengah malam agar mudah dihitung dan diuji.
 */
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86_400;

const pad = (value: number) => String(value).padStart(2, '0');

export function formatHourMinute(seconds: number, separator = '.'): string {
	return `${pad(Math.floor(seconds / SECONDS_PER_HOUR))}${separator}${pad(Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE))}`;
}

export function formatMinuteSecond(seconds: number): string {
	return `${pad(Math.floor(seconds / SECONDS_PER_MINUTE))}:${pad(seconds % SECONDS_PER_MINUTE)}`;
}

/** Detik sejak tengah malam di zona WIB untuk waktu `epochMs`. */
export function jakartaSecondsOfDay(epochMs: number): number {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Jakarta',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(epochMs);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((item) => item.type === type)?.value ?? 0);
	return part('hour') * SECONDS_PER_HOUR + part('minute') * SECONDS_PER_MINUTE + part('second');
}

export type GreetingPeriod = 'morning' | 'midday' | 'afternoon' | 'evening';

export function greetingPeriod(seconds: number): GreetingPeriod {
	const hour = Math.floor(seconds / SECONDS_PER_HOUR);
	if (hour < 11) return 'morning';
	if (hour < 15) return 'midday';
	if (hour < 18) return 'afternoon';
	return 'evening';
}

/** Label tanggal panjang Indonesia, mis. "Senin, 5 Oktober 2026". */
export function formatLongDate(isoDate: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(Date.parse(`${isoDate}T00:00:00Z`));
}

/** Label tanggal pendek, mis. "7 Okt 2026". */
export function formatShortDate(isoDate: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(Date.parse(`${isoDate}T00:00:00Z`));
}

/** Nama hari singkat huruf besar, mis. "KAM". */
export function formatWeekdayShort(isoDate: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
		.format(Date.parse(`${isoDate}T00:00:00Z`))
		.toUpperCase();
}

/** Tanggal (angka hari) dari `YYYY-MM-DD`. */
export const dayOfMonth = (isoDate: string) => Number(isoDate.slice(8, 10));

/** Nama hari panjang, mis. "Rabu". */
export const formatWeekdayLong = (isoDate: string, locale: string) =>
	new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
		Date.parse(`${isoDate}T00:00:00Z`)
	);
