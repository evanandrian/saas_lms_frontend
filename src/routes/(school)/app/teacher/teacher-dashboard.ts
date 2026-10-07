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
	readonly students: readonly { readonly name: string; readonly scores: readonly number[] }[];
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
		const heightPx = AGENDA_CARD_HEIGHT_PX[item.kind];
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
	readonly rows: readonly { readonly name: string; readonly scores: readonly number[] }[];
	readonly averages: readonly number[];
	readonly lowCount: number;
}

export function buildGradebook(gradebookClass: GradebookClass, threshold: number): GradebookView {
	const rows = gradebookClass.students;
	const averages = gradebookClass.objectives.map((_, column) =>
		rows.length
			? Math.round(rows.reduce((sum, row) => sum + (row.scores[column] ?? 0), 0) / rows.length)
			: 0
	);
	const lowCount = rows.reduce(
		(sum, row) => sum + row.scores.filter((score) => score < threshold).length,
		0
	);
	return { rows, averages, lowCount };
}
