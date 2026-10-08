export interface StudentSubjectGrade {
	id: string;
	subjectName: string;
	subjectIcon: 'math' | 'biology' | 'indonesian' | 'english' | 'history' | 'physics';
	teacherName: string;
	formativeScore: number;
	summativeScore: number;
	finalScore: number;
	predicate: 'A' | 'B' | 'C' | 'D';
	passingCriteria: number;
	achievedObjectives: string[];
	improvementObjectives: string[];
}

export interface ReportCardSummary {
	studentName: string;
	nisn: string;
	className: string;
	academicYear: string;
	semester: string;
	averageScore: number;
	rankInClass: number;
	totalStudents: number;
	homeroomTeacher: string;
	principalName: string;
}

export interface StudentGradesPageData {
	summary: ReportCardSummary;
	subjects: StudentSubjectGrade[];
}
