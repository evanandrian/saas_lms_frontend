/**
 * Model & fungsi turunan dashboard guru (FE-07, acuan `FLIXARE App v3.html` layar 06).
 *
 * Halaman hanya menerima data mentah (`TeacherDashboardData`); semua angka turunan — sisa koreksi,
 * posisi agenda, garis "sekarang", rata-rata kelas, jumlah nilai di bawah ambang — dihitung di sini
 * sehingga tetap benar ketika sumber data asli (API, BLOCKED-01) menggantikan data contoh.
 */

import { formatHourMinute } from '$lib/utils/clock';

export type AgendaKind = 'done' | 'next' | 'open' | 'later';

export interface AgendaItem {
	readonly id: string;
	/** Menit sejak tengah malam (WIB). */
	readonly startMinutes: number;
	/** Akhir jam pelajaran (data asli); tinggi kartu mengikuti durasi. Tanpa nilai: tinggi per jenis. */
	readonly endMinutes?: number;
	readonly title: string;
	readonly meta: string;
	readonly statusLabel: string;
	readonly kind: AgendaKind;
}

export interface NextSession {
	readonly title: string;
	readonly classLabel: string;
	readonly startMinutes: number;
	readonly endMinutes: number;
	readonly questionCount: number;
	readonly studentCount: number;
}

export interface GradingPile {
	readonly id: string;
	readonly title: string;
	readonly classLabel: string;
	readonly dueLabel: string;
	readonly count: number;
}

export interface LearningObjective {
	readonly code: string;
	readonly name: string;
}

export interface GradebookClass {
	readonly id: string;
	readonly name: string;
	readonly progressPercent: number;
	readonly objectives: readonly LearningObjective[];
	/** `null` = nilai belum diisi. */
	readonly students: readonly {
		readonly name: string;
		readonly scores: readonly (number | null)[];
	}[];
	/**
	 * KKTP mapel kelas ini (data asli). `undefined` = pakai `remedialThreshold` dashboard (data contoh);
	 * `null` = mapel belum menetapkan KKTP → tidak ada sorotan remedial.
	 */
	readonly remedialThreshold?: number | null;
}

export interface TeacherDashboardData {
	/** Tanggal kalender `YYYY-MM-DD` (WIB). */
	readonly date: string;
	readonly semesterLabel: string;
	/**
	 * Jam awal (detik sejak tengah malam, WIB) untuk data contoh agar jam & hitung mundur sama
	 * dengan referensi. `null` = jam nyata.
	 */
	readonly clockStartSeconds: number | null;
	readonly nextSession: NextSession | null;
	readonly agenda: readonly AgendaItem[];
	readonly toGrade: readonly GradingPile[];
	/** Ambang remedial dari kebijakan sekolah (data), bukan ditentukan UI. */
	readonly remedialThreshold: number;
	readonly gradebook: readonly GradebookClass[];
	/** Nama murid untuk avatar lobi ujian. */
	readonly lobbyRoster: readonly string[];
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const MINUTES_PER_HOUR = 60;

/** Kalender agenda mengikuti referensi: 07.00–14.00, 56px per jam. */
export const AGENDA_START_HOUR = 7;
export const AGENDA_HOUR_COUNT = 8;
export const AGENDA_HOUR_HEIGHT_PX = 56;
const AGENDA_TOP_OFFSET_PX = 2;
const NOW_LINE_OFFSET_PX = 8;
/** Tinggi kartu per jenis agenda (referensi v3); detail kelas disembunyikan di kartu < 52px. */
const AGENDA_CARD_HEIGHT_PX: Record<AgendaKind, number> = {
	done: 40,
	next: 100,
	open: 52,
	later: 56
};
const AGENDA_META_MIN_HEIGHT_PX = 52;
/** Kartu jam pelajaran asli: jarak antar kartu berurutan & tinggi minimum agar teks terbaca. */
const AGENDA_CARD_GAP_PX = 4;
const AGENDA_MIN_CARD_HEIGHT_PX = 36;

export const formatMinutesOfDay = (minutes: number) =>
	formatHourMinute(minutes * SECONDS_PER_MINUTE);

export function nextSessionMeta(
	session: NextSession,
	labels: { questions: string; students: string }
) {
	return [
		session.classLabel,
		`${formatMinutesOfDay(session.startMinutes)}–${formatMinutesOfDay(session.endMinutes)} WIB`,
		labels.questions,
		labels.students
	].join(' · ');
}

/** Detik menuju sesi berikutnya (≤ 0 berarti sudah dimulai). */
export const secondsUntil = (startMinutes: number, nowSeconds: number) =>
	startMinutes * SECONDS_PER_MINUTE - nowSeconds;

export interface AgendaCard extends AgendaItem {
	readonly time: string;
	readonly topPx: number;
	readonly heightPx: number;
	readonly showMeta: boolean;
}

export function layoutAgenda(items: readonly AgendaItem[]): AgendaCard[] {
	return items.map((item) => {
		const heightPx =
			item.endMinutes === undefined
				? AGENDA_CARD_HEIGHT_PX[item.kind]
				: Math.max(
						AGENDA_MIN_CARD_HEIGHT_PX,
						Math.round(
							((item.endMinutes - item.startMinutes) / MINUTES_PER_HOUR) * AGENDA_HOUR_HEIGHT_PX
						) - AGENDA_CARD_GAP_PX
					);
		return {
			...item,
			time: formatMinutesOfDay(item.startMinutes),
			topPx:
				Math.round(
					(item.startMinutes / MINUTES_PER_HOUR - AGENDA_START_HOUR) * AGENDA_HOUR_HEIGHT_PX
				) + AGENDA_TOP_OFFSET_PX,
			heightPx,
			showMeta: heightPx >= AGENDA_META_MIN_HEIGHT_PX
		};
	});
}

export const agendaHours = () =>
	Array.from({ length: AGENDA_HOUR_COUNT }, (_, index) =>
		formatHourMinute((AGENDA_START_HOUR + index) * SECONDS_PER_HOUR)
	);

/** Posisi garis "sekarang"; `null` bila di luar rentang kalender. */
export function nowLinePosition(nowSeconds: number): number | null {
	const offsetHours = nowSeconds / SECONDS_PER_HOUR - AGENDA_START_HOUR;
	if (offsetHours < 0 || offsetHours > AGENDA_HOUR_COUNT) return null;
	return Math.round(offsetHours * AGENDA_HOUR_HEIGHT_PX) - NOW_LINE_OFFSET_PX;
}

export interface GradebookView {
	readonly rows: readonly { readonly name: string; readonly scores: readonly (number | null)[] }[];
	/** Rata-rata nilai yang sudah diisi; `null` bila belum ada nilai di kolom itu. */
	readonly averages: readonly (number | null)[];
	readonly lowCount: number;
}

export function buildGradebook(
	gradebookClass: GradebookClass,
	threshold: number | null
): GradebookView {
	const rows = gradebookClass.students;
	const averages = gradebookClass.objectives.map((_, column) => {
		const filled = rows.map((row) => row.scores[column]).filter(isScore);
		return filled.length
			? Math.round(filled.reduce((sum, score) => sum + score, 0) / filled.length)
			: null;
	});
	const lowCount = rows.reduce(
		(sum, row) =>
			sum +
			row.scores.filter((score) => threshold !== null && isScore(score) && score < threshold)
				.length,
		0
	);
	return { rows, averages, lowCount };
}

const isScore = (score: number | null | undefined): score is number => typeof score === 'number';

/** Data dashboard guru dari API (bagian yang modulnya sudah ada) + label status agenda. */
export interface TeacherApiData {
	readonly date: string;
	readonly agenda?:
		| readonly {
				readonly id: string;
				readonly start_minutes: number;
				readonly end_minutes: number;
				readonly subject: string;
				readonly class_name: string;
		  }[]
		| null;
	readonly gradebook?:
		| readonly {
				readonly id: string;
				readonly class_name: string;
				readonly subject: string;
				readonly passing_criteria: number | null;
				readonly students: number;
				readonly filled: number;
				readonly grades: readonly { readonly name: string; readonly score: number | null }[];
		  }[]
		| null;
}

export interface TeacherApiLabels {
	readonly status: Record<AgendaKind, string>;
	readonly finalScoreCode: string;
	readonly finalScoreName: string;
}

const PERCENT = 100;

/** Ambang remedial kelas terpilih; `null` bila KKTP belum ditetapkan. */
export const classThreshold = (gradebookClass: GradebookClass, fallback: number) =>
	gradebookClass.remedialThreshold === undefined ? fallback : gradebookClass.remedialThreshold;

/** Status agenda terhadap jam sekarang: selesai, berlangsung, berikutnya (pertama), lalu terjadwal. */
export function agendaKinds(
	lessons: readonly { readonly startMinutes: number; readonly endMinutes: number }[],
	nowMinutes: number
): AgendaKind[] {
	let nextAssigned = false;
	return lessons.map(({ startMinutes, endMinutes }) => {
		if (endMinutes <= nowMinutes) return 'done';
		if (startMinutes <= nowMinutes) return 'open';
		if (!nextAssigned) {
			nextAssigned = true;
			return 'next';
		}
		return 'later';
	});
}

/**
 * Model halaman dari data asli: jam nyata (`clockStartSeconds: null`), agenda & buku nilai dari
 * backend; bagian tanpa modul backend (sesi ujian, tumpukan koreksi, lobi) kosong — tanpa data contoh.
 */
export function teacherDashboardFromApi(
	api: TeacherApiData,
	nowMinutes: number,
	semesterLabel: string,
	labels: TeacherApiLabels
): TeacherDashboardData {
	const lessons = (api.agenda ?? []).map((lesson) => ({
		...lesson,
		startMinutes: lesson.start_minutes,
		endMinutes: lesson.end_minutes
	}));
	const kinds = agendaKinds(lessons, nowMinutes);
	const gradebook = (api.gradebook ?? []).map((item): GradebookClass => ({
		id: item.id,
		name: `${item.class_name} · ${item.subject}`,
		progressPercent: item.students ? Math.round((item.filled / item.students) * PERCENT) : 0,
		objectives: [{ code: labels.finalScoreCode, name: labels.finalScoreName }],
		students: item.grades.map((grade) => ({ name: grade.name, scores: [grade.score] })),
		remedialThreshold: item.passing_criteria
	}));
	return {
		date: api.date,
		semesterLabel,
		clockStartSeconds: null,
		nextSession: null,
		agenda: lessons.map((lesson, index) => {
			const kind = kinds[index] ?? 'later';
			return {
				id: lesson.id,
				startMinutes: lesson.startMinutes,
				endMinutes: lesson.endMinutes,
				title: lesson.subject,
				meta: lesson.class_name,
				statusLabel: labels.status[kind],
				kind
			};
		}),
		toGrade: [],
		// Ambang per kelas (KKTP mapel) dipakai lewat `classThreshold`; nilai dashboard tidak berlaku.
		remedialThreshold: 0,
		gradebook,
		lobbyRoster: []
	};
}
