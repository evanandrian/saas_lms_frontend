/**
 * Model & fungsi turunan dashboard sekolah (FE-07, acuan `FLIXARE App v3.html` layar 05).
 * Halaman menerima data mentah; jumlah kelas, kelas yang sudah presensi, pita kehadiran, hari trial,
 * kursi terpakai, dan sisa tindak lanjut dihitung di sini.
 */

export type AbsenceStatus = 'sick' | 'permit' | 'absent';

export interface ClassRoom {
	/** Nama tampil, mis. "XI-B". */
	readonly id: string;
	readonly homeroomTeacher: string;
	/** Persentase hadir hari ini; `null` = presensi belum diisi. */
	readonly attendancePercent: number | null;
	readonly absentees: readonly { readonly name: string; readonly status: AbsenceStatus }[];
}

export interface GradeLevel {
	readonly label: string;
	readonly rooms: readonly ClassRoom[];
}

export interface TrialInfo {
	/** Hari kerja trial `YYYY-MM-DD`, berurutan. */
	readonly days: readonly string[];
	/** Jam berakhir di hari terakhir, mis. "23.59". */
	readonly endTimeLabel: string;
	readonly studentsUsed: number;
	readonly studentLimit: number;
}

export interface ReportStep {
	readonly label: string;
	readonly count: number;
}

export interface SeatUsage {
	readonly used: number;
	readonly capacity: number;
	readonly activeStudents7d: number;
	readonly activeTeachers7d: number;
	readonly totalTeachers: number;
	readonly storageUsedGb: number;
	readonly storageCapacityGb: number;
}

export interface FollowUp {
	readonly id: string;
	readonly title: string;
	readonly detail: string;
	readonly actionLabel: string;
}

export interface SchoolDashboardData {
	readonly date: string;
	readonly clockStartSeconds: number | null;
	readonly academicYearLabel: string;
	readonly semesterLabel: string;
	readonly trial: TrialInfo | null;
	/** Ambang pita kehadiran dari kebijakan sekolah (%). */
	readonly attendanceBands: { readonly high: number; readonly mid: number };
	readonly studentsPerClass: number;
	/** Mulai jam pelajaran pertama (menit sejak tengah malam WIB). */
	readonly firstPeriodStartMinutes: number;
	readonly defaultRoomId: string;
	readonly grades: readonly GradeLevel[];
	readonly reportCard: {
		readonly semesterName: string;
		readonly approvalDeadlineLabel: string;
		readonly steps: readonly ReportStep[];
	};
	readonly seats: SeatUsage;
	readonly followUps: readonly FollowUp[];
}

const PERCENT = 100;
const SECONDS_PER_MINUTE = 60;
export const SEAT_SEGMENTS = 40;

export type AttendanceBand = 'high' | 'mid' | 'low' | 'unfilled';

export function attendanceBand(
	percent: number | null,
	bands: SchoolDashboardData['attendanceBands']
): AttendanceBand {
	if (percent === null) return 'unfilled';
	if (percent >= bands.high) return 'high';
	if (percent >= bands.mid) return 'mid';
	return 'low';
}

export const allRooms = (grades: readonly GradeLevel[]) => grades.flatMap((grade) => grade.rooms);

export const presentCount = (room: ClassRoom, studentsPerClass: number) =>
	room.attendancePercent === null
		? 0
		: Math.round((room.attendancePercent * studentsPerClass) / PERCENT);

/** Menit sejak jam pertama dimulai (≥ 0). */
export const minutesSinceFirstPeriod = (nowSeconds: number, firstPeriodStartMinutes: number) =>
	Math.max(0, Math.floor(nowSeconds / SECONDS_PER_MINUTE) - firstPeriodStartMinutes);

export function trialProgress(trial: TrialInfo, today: string) {
	const currentIndex = trial.days.indexOf(today);
	return {
		currentIndex,
		dayNumber: currentIndex + 1,
		totalDays: trial.days.length,
		lastDay: trial.days.at(-1) ?? today
	};
}

/** Tahap rapor ditandai bila sudah dicapai mayoritas kelas. */
export const reportStepReached = (count: number, totalClasses: number) =>
	totalClasses > 0 && count * 2 >= totalClasses;

export function seatSummary(seats: SeatUsage) {
	return {
		filledSegments: Math.round((seats.used / seats.capacity) * SEAT_SEGMENTS),
		activeStudentsPercent: seats.used
			? Math.round((seats.activeStudents7d / seats.used) * PERCENT)
			: 0
	};
}
