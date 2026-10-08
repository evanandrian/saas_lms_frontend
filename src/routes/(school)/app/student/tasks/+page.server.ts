import { loadStudent } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext } from '$lib/features/dashboards/dashboards.server';
import type { PageServerLoad } from './$types';
import type { StudentTasksPageData, StudentTaskItem } from './tasks.types';

export const load: PageServerLoad = async (event) => {
	const res = await loadStudent(dashboardsContext(event));

	const className = res.ok && res.data?.class_name ? res.data.class_name : 'XI-A';
	const apiSubjects = res.ok && res.data?.subjects ? res.data.subjects : [];

	const subjects = apiSubjects.map((s) => ({
		id: s.id,
		name: s.name,
		icon: ((s.icon as any) ?? 'math') as 'math' | 'biology' | 'indonesian' | 'english' | 'history' | 'physics',
		taskCount: 0
	}));

	if (subjects.length === 0) {
		subjects.push(
			{ id: 'math', name: 'Matematika', icon: 'math', taskCount: 0 },
			{ id: 'biology', name: 'Biologi', icon: 'biology', taskCount: 0 },
			{ id: 'history', name: 'Sejarah', icon: 'history', taskCount: 0 },
			{ id: 'indonesian', name: 'Bahasa Indonesia', icon: 'indonesian', taskCount: 0 },
			{ id: 'english', name: 'Bahasa Inggris', icon: 'english', taskCount: 0 },
			{ id: 'physics', name: 'Fisika', icon: 'physics', taskCount: 0 }
		);
	}

	const tasks: StudentTaskItem[] = [
		{
			id: 'task-01',
			title: 'Latihan Soal Aplikasi Persamaan Kuadrat',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('mat'))?.id ?? 'math',
			subjectName: 'Matematika',
			subjectIcon: 'math',
			type: 'individual',
			dueDate: '2026-10-09',
			xp: 50,
			status: 'pending',
			maxScore: 100,
			instructions: 'Selesaikan 5 soal cerita mengenai titik maksimum lemparan bola dan penerapannya dalam proyektil. Tuliskan rumus langkah demi langkah di buku latihan atau unggah berkas PDF jawaban.',
			teacherName: 'Bambang Sudibyo, M.Pd.',
			attachmentCount: 1
		},
		{
			id: 'task-02',
			title: 'Laporan Esai: Analisis Kerajaan Maritim Sriwijaya',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('sejarah'))?.id ?? 'history',
			subjectName: 'Sejarah',
			subjectIcon: 'history',
			type: 'individual',
			dueDate: '2026-10-12',
			xp: 60,
			status: 'pending',
			maxScore: 100,
			instructions: 'Buat esai minimal 500 kata yang membandingkan jalur perdagangan maritim Selat Malaka masa Sriwijaya dengan kondisi modern. Cantumkan minimal 2 sumber rujukan sejarah.',
			teacherName: 'Dra. Siti Rahmah',
			attachmentCount: 2
		},
		{
			id: 'task-03',
			title: 'Laporan Praktikum: Pengamatan Osmosis pada Kentang',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('bio'))?.id ?? 'biology',
			subjectName: 'Biologi',
			subjectIcon: 'biology',
			type: 'group',
			dueDate: '2026-10-05',
			xp: 80,
			status: 'graded',
			score: 92,
			maxScore: 100,
			feedback: 'Laporan tersusun sangat sistematis. Tabel data perubahan massa kentang lengkap dan analisis pembahasan teori osmosis sangat tajam. Kerja bagus!',
			instructions: 'Kumpulkan laporan lengkap hasil uji osmosis larutan garam pekat dan air murni terhadap silinder kentang sesuai format standar lembar praktikum.',
			teacherName: 'Dr. Retno Wulandari',
			submissionDate: '2026-10-04',
			submittedFileName: 'Laporan_Biologi_Kelompok3_XI-A.pdf',
			attachmentCount: 1
		},
		{
			id: 'task-04',
			title: 'Teks Argumentasi Isu Transisi Energi Hijau',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('indo'))?.id ?? 'indonesian',
			subjectName: 'Bahasa Indonesia',
			subjectIcon: 'indonesian',
			type: 'individual',
			dueDate: '2026-10-07',
			xp: 45,
			status: 'submitted',
			maxScore: 100,
			instructions: 'Tulis sebuah teks argumentatif dengan struktur: tesis, rangkaian argumen pendukung, dan penegasan ulang. Perhatikan tanda baca dan konjungsi antarkalimat.',
			teacherName: 'Hendra Gunawan, S.Pd.',
			submissionDate: '2026-10-06',
			submittedFileName: 'Teks_Argumentasi_Dimas.pdf'
		},
		{
			id: 'task-05',
			title: 'Descriptive Text Video Recording: Famous Landmarks',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('eng'))?.id ?? 'english',
			subjectName: 'Bahasa Inggris',
			subjectIcon: 'english',
			type: 'project',
			dueDate: '2026-10-15',
			xp: 75,
			status: 'pending',
			maxScore: 100,
			instructions: 'Record a 2-3 minute spoken descriptive video presentation about a world heritage landmark of your choice. Ensure clear pronunciation and vocabulary mastery.',
			teacherName: 'Sarah Jenkins, M.A.',
			attachmentCount: 1
		}
	];

	for (const sub of subjects) {
		sub.taskCount = tasks.filter((t) => t.subjectId === sub.id || t.subjectName.toLowerCase().includes(sub.name.toLowerCase())).length;
	}

	const data: StudentTasksPageData = {
		className,
		subjects,
		tasks
	};

	return {
		tasksData: data
	};
};
