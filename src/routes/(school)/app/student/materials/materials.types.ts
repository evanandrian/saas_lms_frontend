export type MaterialType = 'pdf' | 'video' | 'slide' | 'article';
export type MaterialStatus = 'completed' | 'in_progress' | 'not_started';

export interface StudentMaterialItem {
	id: string;
	subjectId: string;
	subjectName: string;
	subjectIcon: 'math' | 'biology' | 'indonesian' | 'english' | 'history' | 'physics';
	title: string;
	chapter: string;
	topicCode?: string;
	type: MaterialType;
	duration: string;
	description: string;
	teacherName: string;
	progress: number;
	status: MaterialStatus;
	updatedAt: string;
	fileUrl?: string;
}

export interface StudentMaterialsPageData {
	className: string;
	subjects: Array<{
		id: string;
		name: string;
		icon: 'math' | 'biology' | 'indonesian' | 'english' | 'history' | 'physics';
		materialCount: number;
	}>;
	materials: StudentMaterialItem[];
}
