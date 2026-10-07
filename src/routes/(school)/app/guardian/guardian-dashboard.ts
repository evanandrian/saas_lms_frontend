/**
 * Model & fungsi turunan dashboard orang tua (FE-07, acuan `FLIXARE App v3.html` layar 08).
 * Halaman menerima data mentah per anak; predikat nilai, ringkasan & catatan kehadiran,
 * dan label tanggal agenda dihitung di sini.
 */

export type TimelineTone = 'ok' | 'warning' | 'muted';
export type TimelineIcon = 'check' | 'alert' | 'book';

export interface TimelineItem {
	readonly time: string;
	readonly icon: TimelineIcon;
	readonly tone: TimelineTone;
	readonly title: string;
	readonly detail: string;
}

export interface AgendaEntry {
	readonly id: string;
	readonly date: string;
	readonly title: string;
	readonly detail: string;
}

export type AbsenceStatus = 'permit' | 'sick' | 'absent';

export interface ChildSummary {
	readonly id: string;
	readonly fullName: string;
	readonly shortName: string;
	readonly className: string;
	readonly homeroomTeacher: string;
	readonly headline: string;
	/** Hal yang perlu ditindaklanjuti orang tua; `null` = tidak ada. */
	readonly actionNeeded: string | null;
	readonly today: readonly TimelineItem[];
	readonly subjects: readonly { readonly name: string; readonly score: number }[];
	readonly homeroomNote: { readonly text: string; readonly date: string };
	/** Ketidakhadiran bulan kehadiran, per tanggal. */
	readonly absences: Readonly<Record<number, AbsenceStatus>>;
	readonly agenda: readonly AgendaEntry[];
}

export interface GuardianDashboardData {
	readonly date: string;
	readonly clockStartSeconds: number | null;
	/** KKTP dan ambang predikat "Sangat baik". */
	readonly masteryTarget: number;
	readonly excellentThreshold: number;
	readonly attendanceMonth: { readonly year: number; readonly month: number };
	readonly children: readonly ChildSummary[];
	/** Pengumuman sekolah, ditampilkan setelah agenda anak. */
	readonly announcements: readonly AgendaEntry[];
}

const SCHOOL_DAYS = new Set([1, 2, 3, 4, 5]);

const utcDate = (year: number, month: number, day: number) =>
	new Date(Date.UTC(year, month - 1, day));

export type ScoreWord = 'excellent' | 'good' | 'practice';

export const scoreWord = (score: number, target: number, excellent: number): ScoreWord =>
	score >= excellent ? 'excellent' : score >= target ? 'good' : 'practice';

/** Hari sekolah (Sen–Jum) dalam bulan. */
export function schoolDaysOf(year: number, month: number): number[] {
	const days: number[] = [];
	const total = utcDate(year, month + 1, 0).getUTCDate();
	for (let day = 1; day <= total; day += 1) {
		if (SCHOOL_DAYS.has(utcDate(year, month, day).getUTCDay())) days.push(day);
	}
	return days;
}

export function attendanceSummary(year: number, month: number, absences: ChildSummary['absences']) {
	const days = schoolDaysOf(year, month).map((day) => ({ day, status: absences[day] ?? null }));
	const absent = days.filter((item) => item.status !== null);
	const byStatus = new Map<AbsenceStatus, number[]>();
	for (const item of absent) {
		if (!item.status) continue;
		byStatus.set(item.status, [...(byStatus.get(item.status) ?? []), item.day]);
	}
	return {
		days,
		present: days.length - absent.length,
		total: days.length,
		groups: [...byStatus.entries()].map(([status, list]) => ({ status, days: list }))
	};
}

/** Label agenda: "Sel 6" untuk bulan berjalan, "16 Nov" untuk bulan lain (referensi). */
export function agendaDateLabel(isoDate: string, today: string, locale: string): string {
	const date = Date.parse(`${isoDate}T00:00:00Z`);
	const sameMonth = isoDate.slice(0, 7) === today.slice(0, 7);
	if (sameMonth) {
		const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
			date
		);
		return `${weekday} ${Number(isoDate.slice(8, 10))}`;
	}
	return new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	}).format(date);
}

export const formatDayMonthYear = (isoDate: string, locale: string) =>
	new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(Date.parse(`${isoDate}T00:00:00Z`));

/** "Rabu, 16 September". */
export const formatWeekdayDayMonth = (year: number, month: number, day: number, locale: string) =>
	new Intl.DateTimeFormat(locale, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	}).format(utcDate(year, month, day));

export const formatMonthName = (year: number, month: number, locale: string) =>
	new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
		utcDate(year, month, 1)
	);
