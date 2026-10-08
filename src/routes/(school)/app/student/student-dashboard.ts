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

/** Menghasilkan pekan streak dinamis 7 hari (H-6 s.d. hari ini H-0) dan menghitung hari beruntun. */
export function buildDynamicStreak(
	todayIso: string,
	attendanceHistory?: Record<string, string>
): {
	days: number;
	week: { date: string; status: StreakStatus }[];
} {
	const todayDate = new Date(`${todayIso}T00:00:00Z`);
	const week: { date: string; status: StreakStatus }[] = [];

	for (let i = 6; i >= 0; i--) {
		const d = new Date(todayDate.getTime() - i * MS_PER_DAY);
		const dateStr = d.toISOString().slice(0, 10);
		const dayOfWeek = d.getUTCDay(); // 0: Min, 6: Sab
		const att = attendanceHistory ? attendanceHistory[dateStr] : undefined;

		let status: StreakStatus = 'rest';
		if (i === 0) {
			status = att === 'present' ? 'done' : 'today';
		} else if (dayOfWeek === 0 || dayOfWeek === 6) {
			status = 'rest';
		} else {
			status = att === 'present' ? 'done' : (att ? 'rest' : 'done');
		}
		week.push({ date: dateStr, status });
	}

	let days = 0;
	for (let i = week.length - 1; i >= 0; i--) {
		const item = week[i];
		if (!item) continue;
		if (item.status === 'done') {
			// Hari aktif belajar yang sudah selesai (centang)
			days++;
		} else if (item.status === 'today') {
			// Hari ini sedang berlangsung (belum dihitung sebagai hari yang selesai)
			continue;
		} else if (item.status === 'rest') {
			const d = new Date(`${item.date}T00:00:00Z`);
			const dow = d.getUTCDay();
			if (dow === 0 || dow === 6) {
				// Akhir pekan tidak memutus rangkaian, namun bukan hari belajar (tidak menambah hitungan)
				continue;
			} else {
				break;
			}
		} else {
			break;
		}
	}

	return { days, week };
}

export interface LevelTier {
	readonly level: number;
	readonly name: string;
	readonly requiredXp: number;
	readonly nextLevelXp: number;
}

export const LEVEL_TIERS: readonly LevelTier[] = [
	{ level: 10, name: 'Sang Juara', requiredXp: 3200, nextLevelXp: 4000 },
	{ level: 9, name: 'Master Belajar', requiredXp: 2500, nextLevelXp: 3200 },
	{ level: 8, name: 'Pakar Muda', requiredXp: 1900, nextLevelXp: 2500 },
	{ level: 7, name: 'Penjelajah', requiredXp: 1400, nextLevelXp: 1900 },
	{ level: 6, name: 'Petualang Ilmu', requiredXp: 1000, nextLevelXp: 1400 },
	{ level: 5, name: 'Pembelajar Hebat', requiredXp: 700, nextLevelXp: 1000 },
	{ level: 4, name: 'Cendekia Muda', requiredXp: 450, nextLevelXp: 700 },
	{ level: 3, name: 'Murid Rajin', requiredXp: 250, nextLevelXp: 450 },
	{ level: 2, name: 'Pelajar Baru', requiredXp: 100, nextLevelXp: 250 },
	{ level: 1, name: 'Pemula', requiredXp: 0, nextLevelXp: 100 }
];

export function getLevelForXp(xp: number): {
	number: number;
	name: string;
	xp: number;
	nextLevelXp: number;
} {
	for (const tier of LEVEL_TIERS) {
		if (xp >= tier.requiredXp) {
			return {
				number: tier.level,
				name: tier.name,
				xp,
				nextLevelXp: tier.nextLevelXp
			};
		}
	}
	return { number: 1, name: 'Pemula', xp, nextLevelXp: 100 };
}

