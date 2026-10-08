import { loadStudent } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext } from '$lib/features/dashboards/dashboards.server';
import type { PageServerLoad } from './$types';
import type { StudentMaterialsPageData, StudentMaterialItem } from './materials.types';

export const load: PageServerLoad = async (event) => {
	const res = await loadStudent(dashboardsContext(event));

	const className = res.ok && res.data?.class_name ? res.data.class_name : 'XI-A';
	const apiSubjects = res.ok && res.data?.subjects ? res.data.subjects : [];

	// Mapel yang terdaftar dari database kelas murid
	const subjects = apiSubjects.map((s) => ({
		id: s.id,
		name: s.name,
		icon: ((s.icon as any) ?? 'math') as 'math' | 'biology' | 'indonesian' | 'english' | 'history' | 'physics',
		materialCount: 0
	}));

	// Jika belum ada mata pelajaran di database kelas, sediakan daftar default mapel umum
	if (subjects.length === 0) {
		subjects.push(
			{ id: 'math', name: 'Matematika', icon: 'math', materialCount: 0 },
			{ id: 'biology', name: 'Biologi', icon: 'biology', materialCount: 0 },
			{ id: 'history', name: 'Sejarah', icon: 'history', materialCount: 0 },
			{ id: 'indonesian', name: 'Bahasa Indonesia', icon: 'indonesian', materialCount: 0 },
			{ id: 'english', name: 'Bahasa Inggris', icon: 'english', materialCount: 0 },
			{ id: 'physics', name: 'Fisika', icon: 'physics', materialCount: 0 }
		);
	}

	// Daftar materi belajar yang terstruktur per mata pelajaran dan topik
	const materials: StudentMaterialItem[] = [
		{
			id: 'mat-01',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('mat'))?.id ?? 'math',
			subjectName: 'Matematika',
			subjectIcon: 'math',
			title: 'Akar Persamaan & Fungsi Kuadrat',
			chapter: 'Bab 2 · Relasi & Fungsi Kuadrat',
			topicCode: 'TP 4',
			type: 'video',
			duration: '15 menit',
			description: 'Penjelasan konsep titik puncak grafik parabola, rumus determinan, dan solusi persamaan kuadrat dengan metode faktorisasi.',
			teacherName: 'Bambang Sudibyo, M.Pd.',
			progress: 100,
			status: 'completed',
			updatedAt: '2026-10-06'
		},
		{
			id: 'mat-02',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('mat'))?.id ?? 'math',
			subjectName: 'Matematika',
			subjectIcon: 'math',
			title: 'Analisis Grafik Parabola dan Diskriminan',
			chapter: 'Bab 2 · Relasi & Fungsi Kuadrat',
			topicCode: 'TP 5',
			type: 'pdf',
			duration: '20 menit baca',
			description: 'Modul lengkap membaca grafik, sumbu simetri, dan sifat definit positif/negatif pada kurva kuadrat.',
			teacherName: 'Bambang Sudibyo, M.Pd.',
			progress: 60,
			status: 'in_progress',
			updatedAt: '2026-10-07'
		},
		{
			id: 'bio-01',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('bio'))?.id ?? 'biology',
			subjectName: 'Biologi',
			subjectIcon: 'biology',
			title: 'Struktur dan Organel Sel Eukariotik',
			chapter: 'Bab 1 · Biologi Sel',
			topicCode: 'TP 1',
			type: 'slide',
			duration: '25 slide',
			description: 'Presentasi visual anatomi sel hewan dan tumbuhan, mitokondria, nukleus, serta fungsi membran sel.',
			teacherName: 'Dr. Retno Wulandari',
			progress: 100,
			status: 'completed',
			updatedAt: '2026-10-04'
		},
		{
			id: 'bio-02',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('bio'))?.id ?? 'biology',
			subjectName: 'Biologi',
			subjectIcon: 'biology',
			title: 'Panduan Praktikum Sel & Osmosis',
			chapter: 'Bab 1 · Biologi Sel',
			topicCode: 'TP 3',
			type: 'pdf',
			duration: '10 menit baca',
			description: 'Langkah kerja pembuatan preparat sel gabus dan sel epitel pipi serta panduan format penulisan laporan praktikum.',
			teacherName: 'Dr. Retno Wulandari',
			progress: 0,
			status: 'not_started',
			updatedAt: '2026-10-05'
		},
		{
			id: 'his-01',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('sejarah'))?.id ?? 'history',
			subjectName: 'Sejarah',
			subjectIcon: 'history',
			title: 'Analisis Sumber Primer Kerajaan Hindu-Buddha',
			chapter: 'Bab 3 · Masa Klasik Nusantara',
			topicCode: 'TP 2',
			type: 'article',
			duration: '12 menit baca',
			description: 'Studi prasasti Yupa Kutai, Tarumanagara, dan catatan musafir Tiongkok I-Tsing mengenai Sriwijaya.',
			teacherName: 'Dra. Siti Rahmah',
			progress: 30,
			status: 'in_progress',
			updatedAt: '2026-10-03'
		},
		{
			id: 'ind-01',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('indo'))?.id ?? 'indonesian',
			subjectName: 'Bahasa Indonesia',
			subjectIcon: 'indonesian',
			title: 'Struktur Esai Argumentatif & Kaidah Kebahasaan',
			chapter: 'Bab 2 · Teks Argumentasi',
			topicCode: 'TP 1',
			type: 'pdf',
			duration: '18 menit baca',
			description: 'Kiat menyusun tesis yang kuat, argumentasi berbasis data faktual, dan teknik perangkai kalimat konjungsi kausalitas.',
			teacherName: 'Hendra Gunawan, S.Pd.',
			progress: 0,
			status: 'not_started',
			updatedAt: '2026-10-02'
		}
	];

	// Hitung jumlah materi per subject
	for (const sub of subjects) {
		sub.materialCount = materials.filter((m) => m.subjectId === sub.id || m.subjectName.toLowerCase().includes(sub.name.toLowerCase())).length;
	}

	const data: StudentMaterialsPageData = {
		className,
		subjects,
		materials
	};

	return {
		materialsData: data
	};
};
