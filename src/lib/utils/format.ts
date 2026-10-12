/**
 * Format angka, rupiah, dan tanggal sesuai locale UI aktif (`i18n.locale`).
 * Timestamp selalu ditampilkan dalam WIB (zona operasional) agar hasil SSR dan browser sama;
 * tanggal kalender `YYYY-MM-DD` ditampilkan apa adanya (tanpa geser zona).
 */
export const APP_TIME_ZONE = 'Asia/Jakarta';
export const EMPTY_VALUE = '—';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SHORT_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** Tag BCP 47 untuk `Intl` dari locale UI (`id` | `en`). */
export const intlLocale = (locale: string) => (locale === 'en' ? 'en-GB' : 'id-ID');

export const formatNumber = (value: number, locale: string, options?: Intl.NumberFormatOptions) =>
	new Intl.NumberFormat(intlLocale(locale), options).format(value);

export const formatRupiah = (value: number, locale: string) =>
	`Rp${formatNumber(Math.round(value), locale)}`;

/** Tanggal/waktu dengan opsi `Intl` apa adanya; nilai kosong/tidak valid → `—`. */
export function formatDateTime(
	value: string | null | undefined,
	locale: string,
	options: Intl.DateTimeFormatOptions
): string {
	if (!value) return EMPTY_VALUE;
	const dateOnly = DATE_ONLY_PATTERN.test(value);
	const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
	if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
	return new Intl.DateTimeFormat(intlLocale(locale), {
		...options,
		timeZone: dateOnly ? 'UTC' : APP_TIME_ZONE
	}).format(date);
}

/** Tanggal pendek (mis. "6 Okt 2026" / "6 Oct 2026"); `options` menambah/menimpa bawaan. */
export const formatDate = (
	value: string | null | undefined,
	locale: string,
	options: Intl.DateTimeFormatOptions = {}
) => formatDateTime(value, locale, { ...SHORT_DATE, ...options });
