/**
 * Model & fungsi turunan dashboard murid (FE-07, acuan `FLIXARE App v3.html` layar 07).
 * Halaman menerima data mentah; label tenggat, tingkatan mapel, warna nilai, kalender & persentase
 * kehadiran, serta progres XP dihitung di sini.
 */

export interface TodayAssessment {
	readonly id: string;
	readonly title: string;
	readonly subject: string;
	readonly startMinutes: number;
	readonly endMinutes: number;
	readonly questionCount: number;
	readonly xpReward: number;
}

export type StreakStatus = 'done' | 'rest' | 'today';

export interface Quest {
	readonly id: string;
	readonly title: string;
	readonly subject: string;
	readonly dueDate: string;
	readonly xp: number;
	readonly done: boolean;
}

export type SubjectIconKey = 'math' | 'biology' | 'indonesian' | 'english' | 'history' | 'physics';

export interface SubjectMastery {
	readonly id: string;
	readonly name: string;
	readonly icon: SubjectIconKey;
	readonly percent: number;
}

export interface RecentScore {
	readonly id: string;
	readonly title: string;
	readonly subject: string;
	readonly date: string;
	readonly score: number;
}

export interface Remedial {
	readonly id: string;
	readonly title: string;
	readonly subject: string;
	readonly score: number;
	readonly dueDate: string;
}

export interface Improvement {
	readonly id: string;
	readonly objective: string;
	readonly subjectLabel: string;
	readonly score: number;
	readonly tip: string;
}

export type AttendanceStatus = 'present' | 'late' | 'permit' | 'sick' | 'holiday';

export interface AttendanceMonth {
	readonly year: number;
	/** 1–12. */
	readonly month: number;
	readonly label: string;
	/** Status selain hadir, per tanggal. */
	readonly exceptions: Readonly<Record<number, Exclude<AttendanceStatus, 'present'>>>;
}

export interface StudentDashboardData {
	readonly className: string;
	readonly date: string;
	readonly clockStartSeconds: number | null;
	readonly todayAssessments: readonly TodayAssessment[];
	readonly level: {
		readonly number: number;
		readonly name: string;
		readonly xp: number;
		readonly nextLevelXp: number;
	};
	readonly streak: {
		readonly days: number;
		readonly week: readonly { readonly date: string; readonly status: StreakStatus }[];
	};
	readonly quests: readonly Quest[];
	/** Ambang tingkatan koleksi mapel (%). */
	readonly tierThresholds: { readonly gold: number; readonly silver: number };
	readonly subjects: readonly SubjectMastery[];
	/** Ambang warna stiker nilai. */
	readonly scoreBands: { readonly high: number; readonly mid: number };
	readonly recentScores: readonly RecentScore[];
	/** KKTP (kriteria ketercapaian tujuan pembelajaran). */
	readonly masteryTarget: number;
	readonly remedialXp: number;
	readonly remedials: readonly Remedial[];
	readonly bonusPractice: {
		readonly title: string;
		readonly description: string;
		readonly xp: number;
	} | null;
	/** Nilai di bawah ambang ini ditandai peringatan. */
	readonly lowScoreThreshold: number;
	readonly improvements: readonly Improvement[];
	readonly attendanceMonths: readonly AttendanceMonth[];
	readonly defaultAttendanceMonth: number;
}

const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const SCHOOL_DAYS_PER_WEEK = 5;
const PERCENT = 100;
const MORNING_END_HOUR = 11;
const MIDDAY_END_HOUR = 15;
const AFTERNOON_END_HOUR = 18;
const MINUTES_PER_HOUR = 60;

const utcMs = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`);

export const daysBetween = (from: string, to: string) =>
	Math.round((utcMs(to) - utcMs(from)) / MS_PER_DAY);

export type DueLabel =
	| { readonly kind: 'tomorrow' }
	| { readonly kind: 'today' }
	| { readonly kind: 'in_days'; readonly days: number }
	| { readonly kind: 'this_week' }
	| { readonly kind: 'date' };

/** Label tenggat relatif seperti referensi: besok, N hari lagi, nama hari minggu ini, atau tanggal. */
export function dueLabel(dueDate: string, today: string): DueLabel {
	const days = daysBetween(today, dueDate);
	if (days <= 0) return { kind: 'today' };
	if (days === 1) return { kind: 'tomorrow' };
	if (days === 2) return { kind: 'in_days', days };
	if (days < DAYS_PER_WEEK) return { kind: 'this_week' };
	return { kind: 'date' };
}

/** Tenggat ≤ 1 hari ditandai mendesak. */
export const isUrgent = (dueDate: string, today: string) => daysBetween(today, dueDate) <= 1;

export type DayPart = 'morning' | 'midday' | 'afternoon' | 'evening';

export function dayPartOf(minutes: number): DayPart {
	const hour = Math.floor(minutes / MINUTES_PER_HOUR);
	if (hour < MORNING_END_HOUR) return 'morning';
	if (hour < MIDDAY_END_HOUR) return 'midday';
	if (hour < AFTERNOON_END_HOUR) return 'afternoon';
	return 'evening';
}

export type Tier = 'gold' | 'silver' | 'bronze';

export const tierOf = (
	percent: number,
	thresholds: StudentDashboardData['tierThresholds']
): Tier =>
	percent >= thresholds.gold ? 'gold' : percent >= thresholds.silver ? 'silver' : 'bronze';

export type ScoreBand = 'high' | 'mid' | 'low';

export const scoreBandOf = (score: number, bands: StudentDashboardData['scoreBands']): ScoreBand =>
	score >= bands.high ? 'high' : score >= bands.mid ? 'mid' : 'low';

export type CalendarStatus = AttendanceStatus | 'upcoming';

export interface AttendanceCalendar {
	readonly leadingBlanks: number;
	readonly days: readonly { readonly day: number; readonly status: CalendarStatus }[];
	readonly counts: Readonly<Record<'present' | 'late' | 'permit' | 'sick', number>>;
	readonly schoolDays: number;
	readonly presentDays: number;
	readonly rate: number | null;
}

/** Kalender hari sekolah (Sen–Jum). Hari setelah `today` di bulan berjalan = belum berlangsung. */
export function attendanceCalendar(month: AttendanceMonth, today: string): AttendanceCalendar {
	const daysInMonth = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
	const firstWeekday = (new Date(Date.UTC(month.year, month.month - 1, 1)).getUTCDay() + 6) % 7;
	const leadingBlanks = firstWeekday >= SCHOOL_DAYS_PER_WEEK ? 0 : firstWeekday;
	const counts = { present: 0, late: 0, permit: 0, sick: 0 };
	const days: { day: number; status: CalendarStatus }[] = [];
	for (let day = 1; day <= daysInMonth; day += 1) {
		const weekday = new Date(Date.UTC(month.year, month.month - 1, day)).getUTCDay();
		if (weekday === 0 || weekday === 6) continue;
		const iso = `${month.year}-${String(month.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		const status: CalendarStatus =
			daysBetween(today, iso) > 0 ? 'upcoming' : (month.exceptions[day] ?? 'present');
		if (status !== 'upcoming' && status !== 'holiday') counts[status] += 1;
		days.push({ day, status });
	}
	const schoolDays = counts.present + counts.late + counts.permit + counts.sick;
	const presentDays = counts.present + counts.late;
	return {
		leadingBlanks,
		days,
		counts,
		schoolDays,
		presentDays,
		rate: schoolDays ? Math.round((presentDays / schoolDays) * PERCENT) : null
	};
}

const SECONDS_PER_MINUTE = 60;

/** Detik menuju ujian (≤ 0 berarti sudah dimulai). */
export const secondsUntilStart = (startMinutes: number, nowSeconds: number) =>
	startMinutes * SECONDS_PER_MINUTE - nowSeconds;
