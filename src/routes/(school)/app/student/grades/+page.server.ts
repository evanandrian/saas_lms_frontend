import { loadStudent } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext } from '$lib/features/dashboards/dashboards.server';
import type { PageServerLoad } from './$types';
import type { StudentGradesPageData, StudentSubjectGrade, ReportCardSummary } from './grades.types';

export const load: PageServerLoad = async (event) => {
	const res = await loadStudent(dashboardsContext(event));

	const className = res.ok && res.data?.class_name ? res.data.class_name : 'XI-A';
	const userName = res.ok && res.data?.viewer?.full_name ? res.data.viewer.full_name : 'Dimas Surya Pratama';

	const summary: ReportCardSummary = {
		studentName: userName,
		nisn: '0078921435',
		className: className,
		academicYear: '2026/2027',
		semester: 'Ganjil (Tengah Semester)',
		averageScore: 84.5,
		rankInClass: 3,
		totalStudents: 32,
		homeroomTeacher: 'Dra. Endang Sulastri, M.Pd.',
		principalName: 'Dr. H. Mulyadi, M.M.'
	};

	const subjects: StudentSubjectGrade[] = [
		{
			id: 'sub-mat',
			subjectName: 'Matematika',
			subjectIcon: 'math',
			teacherName: 'Bambang Sudibyo, M.Pd.',
			formativeScore: 82,
			summativeScore: 86,
			finalScore: 84,
			predicate: 'B',
			passingCriteria: 75,
			achievedObjectives: [
				'Menunjukkan penguasaan sangat baik dalam menyelesaikan sistem persamaan linear tiga variabel',
				'Mampu memodelkan permasalahan kontekstual ke dalam fungsi kuadrat'
			],
			improvementObjectives: [
				'Perlu pendalaman lebih lanjut dalam analisis grafik fungsi kuadrat dan interpretasi nilai diskriminan'
			]
		},
		{
			id: 'sub-bio',
			subjectName: 'Biologi',
			subjectIcon: 'biology',
			teacherName: 'Dr. Retno Wulandari',
			formativeScore: 88,
			summativeScore: 92,
			finalScore: 90,
			predicate: 'A',
			passingCriteria: 75,
			achievedObjectives: [
				'Sangat terampil dalam melakukan pengamatan preparat mikroskopis dan penyusunan laporan praktikum sel',
				'Memahami secara mendalam mekanisme difusi dan osmosis membran biologis'
			],
			improvementObjectives: []
		},
		{
			id: 'sub-sej',
			subjectName: 'Sejarah',
			subjectIcon: 'history',
			teacherName: 'Dra. Siti Rahmah',
			formativeScore: 78,
			summativeScore: 80,
			finalScore: 79,
			predicate: 'B',
			passingCriteria: 75,
			achievedObjectives: [
				'Mampu menganalisis pengaruh masuknya kebudayaan Hindu-Buddha terhadap sistem ketatanegaraan di Nusantara'
			],
			improvementObjectives: [
				'Perlu meningkatkan kemampuan kritik sumber primer prasasti dan historiografi kerajaan maritim'
			]
		},
		{
			id: 'sub-indo',
			subjectName: 'Bahasa Indonesia',
			subjectIcon: 'indonesian',
			teacherName: 'Hendra Gunawan, S.Pd.',
			formativeScore: 85,
			summativeScore: 87,
			finalScore: 86,
			predicate: 'B',
			passingCriteria: 75,
			achievedObjectives: [
				'Sangat terampil menyusun teks argumentasi dengan logika kausalitas yang kuat dan runtut',
				'Menguasai kaidah ejaan bahasa Indonesia dan tanda baca secara konsisten'
			],
			improvementObjectives: []
		},
		{
			id: 'sub-eng',
			subjectName: 'Bahasa Inggris',
			subjectIcon: 'english',
			teacherName: 'Sarah Jenkins, M.A.',
			formativeScore: 84,
			summativeScore: 88,
			finalScore: 86,
			predicate: 'B',
			passingCriteria: 75,
			achievedObjectives: [
				'Demonstrates excellent spoken fluency in delivering descriptive video presentations about cultural heritage',
				'Skilled in identifying implied main ideas from complex informational reading passages'
			],
			improvementObjectives: []
		},
		{
			id: 'sub-fis',
			subjectName: 'Fisika',
			subjectIcon: 'physics',
			teacherName: 'Agus Purnomo, M.Sc.',
			formativeScore: 80,
			summativeScore: 84,
			finalScore: 82,
			predicate: 'B',
			passingCriteria: 75,
			achievedObjectives: [
				'Mampu menerapkan hukum gerak Newton dalam fenomena mekanika sehari-hari',
				'Terampil mengolah data pengukuran besaran vektor dengan presisi tinggi'
			],
			improvementObjectives: [
				'Perlu penguatan konsep dinamika rotasi dan momen inersia benda tegar'
			]
		}
	];

	const data: StudentGradesPageData = {
		summary,
		subjects
	};

	return {
		gradesData: data
	};
};
