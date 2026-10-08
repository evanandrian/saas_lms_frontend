export type TaskStatus = 'pending' | 'submitted' | 'graded' | 'overdue';
export type TaskType = 'individual' | 'group' | 'quiz' | 'project';

export interface StudentTaskItem {
	id: string;
	title: string;
	subjectId: string;
	subjectName: string;
	subjectIcon: 'math' | 'biology' | 'indonesian' | 'english' | 'history' | 'physics';
	type: TaskType;
	dueDate: string;
	xp: number;
	status: TaskStatus;
	score?: number;
	maxScore?: number;
	feedback?: string;
	instructions: string;
	teacherName: string;
	submissionDate?: string;
	submittedFileName?: string;
	attachmentCount?: number;
}

export interface StudentTasksPageData {
	className: string;
	subjects: Array<{
		id: string;
		name: string;
		icon: 'math' | 'biology' | 'indonesian' | 'english' | 'history' | 'physics';
		taskCount: number;
	}>;
	tasks: StudentTaskItem[];
}
