export type AttendanceStatus = 'present' | 'late' | 'permit' | 'sick' | 'absent';

export interface DailyAttendanceLog {
	date: string;
	dayName: string;
	checkInTime: string;
	checkOutTime: string;
	status: AttendanceStatus;
	note?: string;
}

export interface MonthlyAttendanceSummary {
	month: number;
	year: number;
	monthLabel: string;
	totalSchoolDays: number;
	presentDays: number;
	lateDays: number;
	permitDays: number;
	sickDays: number;
	absentDays: number;
	attendanceRate: number;
	dailyRecords: DailyAttendanceLog[];
}

export interface AttendancePermitRequest {
	id: string;
	type: 'permit' | 'sick';
	startDate: string;
	endDate: string;
	reason: string;
	fileName?: string;
	status: 'approved' | 'pending' | 'rejected';
	submittedAt: string;
}

export interface StudentAttendancePageData {
	className: string;
	studentName: string;
	currentStreakDays: number;
	semesterAttendanceRate: number;
	months: MonthlyAttendanceSummary[];
	permitRequests: AttendancePermitRequest[];
}
