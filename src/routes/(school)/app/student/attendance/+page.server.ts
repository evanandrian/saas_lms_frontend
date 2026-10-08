import { loadStudent } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext } from '$lib/features/dashboards/dashboards.server';
import type { PageServerLoad } from './$types';
import type { StudentAttendancePageData, MonthlyAttendanceSummary, DailyAttendanceLog, AttendancePermitRequest } from './attendance.types';

export const load: PageServerLoad = async (event) => {
	const res = await loadStudent(dashboardsContext(event));

	const className = res.ok && res.data?.class_name ? res.data.class_name : 'XI-A';
	const userName = res.ok && res.data?.viewer?.full_name ? res.data.viewer.full_name : 'Dimas Surya Pratama';
	const streakDays = res.ok && res.data?.streak?.days ? res.data.streak.days : 14;

	const septemberLogs: DailyAttendanceLog[] = [
		{ date: '2026-09-01', dayName: 'Selasa', checkInTime: '06:42', checkOutTime: '15:05', status: 'present' },
		{ date: '2026-09-02', dayName: 'Rabu', checkInTime: '06:45', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-03', dayName: 'Kamis', checkInTime: '06:40', checkOutTime: '15:10', status: 'present' },
		{ date: '2026-09-04', dayName: 'Jumat', checkInTime: '06:38', checkOutTime: '11:45', status: 'present' },
		{ date: '2026-09-07', dayName: 'Senin', checkInTime: '06:35', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-08', dayName: 'Selasa', checkInTime: '07:18', checkOutTime: '15:00', status: 'late', note: 'Terlambat 18 menit (hujan deras & macet)' },
		{ date: '2026-09-09', dayName: 'Rabu', checkInTime: '06:40', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-10', dayName: 'Kamis', checkInTime: '06:44', checkOutTime: '15:05', status: 'present' },
		{ date: '2026-09-11', dayName: 'Jumat', checkInTime: '06:41', checkOutTime: '11:45', status: 'present' },
		{ date: '2026-09-14', dayName: 'Senin', checkInTime: '06:36', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-15', dayName: 'Selasa', checkInTime: '06:43', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-16', dayName: 'Rabu', checkInTime: '-', checkOutTime: '-', status: 'permit', note: 'Izin lomba Olimpiade Sains Kota' },
		{ date: '2026-09-17', dayName: 'Kamis', checkInTime: '06:40', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-18', dayName: 'Jumat', checkInTime: '06:39', checkOutTime: '11:45', status: 'present' },
		{ date: '2026-09-21', dayName: 'Senin', checkInTime: '06:35', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-22', dayName: 'Selasa', checkInTime: '06:42', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-23', dayName: 'Rabu', checkInTime: '06:45', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-24', dayName: 'Kamis', checkInTime: '06:40', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-25', dayName: 'Jumat', checkInTime: '06:38', checkOutTime: '11:45', status: 'present' },
		{ date: '2026-09-28', dayName: 'Senin', checkInTime: '06:37', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-29', dayName: 'Selasa', checkInTime: '06:41', checkOutTime: '15:00', status: 'present' },
		{ date: '2026-09-30', dayName: 'Rabu', checkInTime: '06:40', checkOutTime: '15:00', status: 'present' }
	];

	const months: MonthlyAttendanceSummary[] = [
		{
			month: 9,
			year: 2026,
			monthLabel: 'September 2026',
			totalSchoolDays: 22,
			presentDays: 20,
			lateDays: 1,
			permitDays: 1,
			sickDays: 0,
			absentDays: 0,
			attendanceRate: 95.5,
			dailyRecords: septemberLogs
		},
		{
			month: 8,
			year: 2026,
			monthLabel: 'Agustus 2026',
			totalSchoolDays: 20,
			presentDays: 18,
			lateDays: 0,
			permitDays: 0,
			sickDays: 2,
			absentDays: 0,
			attendanceRate: 90.0,
			dailyRecords: []
		},
		{
			month: 10,
			year: 2026,
			monthLabel: 'Oktober 2026 (Berjalan)',
			totalSchoolDays: 6,
			presentDays: 6,
			lateDays: 0,
			permitDays: 0,
			sickDays: 0,
			absentDays: 0,
			attendanceRate: 100.0,
			dailyRecords: []
		}
	];

	const permitRequests: AttendancePermitRequest[] = [
		{
			id: 'req-01',
			type: 'permit',
			startDate: '2026-09-16',
			endDate: '2026-09-16',
			reason: 'Mewakili sekolah dalam Olimpiade Sains Tingkat Kota Bidang Matematika.',
			fileName: 'Surat_Tugas_OSN_2026.pdf',
			status: 'approved',
			submittedAt: '2026-09-14'
		},
		{
			id: 'req-02',
			type: 'sick',
			startDate: '2026-08-12',
			endDate: '2026-08-13',
			reason: 'Demam tinggi dan flu, beristirahat sesuai anjuran dokter puskesmas.',
			fileName: 'Surat_Keterangan_Dokter.pdf',
			status: 'approved',
			submittedAt: '2026-08-12'
		}
	];

	const data: StudentAttendancePageData = {
		className,
		studentName: userName,
		currentStreakDays: streakDays,
		semesterAttendanceRate: 95.2,
		months,
		permitRequests
	};

	return {
		attendanceData: data
	};
};
