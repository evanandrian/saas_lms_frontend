export type AssessmentType = 'formative' | 'summative' | 'tryout' | 'remedial';
export type AssessmentStatus = 'active' | 'upcoming' | 'completed' | 'missed';

export interface StudentAssessmentItem {
	id: string;
	title: string;
	subjectId: string;
	subjectName: string;
	subjectIcon: 'math' | 'biology' | 'indonesian' | 'english' | 'history' | 'physics';
	type: AssessmentType;
	date: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	questionCount: number;
	xpReward: number;
	status: AssessmentStatus;
	score?: number;
	passingScore: number;
	teacherName: string;
	roomCode?: string;
	instructions: string;
	isRemedial?: boolean;
}

export interface StudentAssessmentsPageData {
	className: string;
	subjects: Array<{
		id: string;
		name: string;
		icon: 'math' | 'biology' | 'indonesian' | 'english' | 'history' | 'physics';
		assessmentCount: number;
	}>;
	assessments: StudentAssessmentItem[];
}
