import { loadStudent } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext } from '$lib/features/dashboards/dashboards.server';
import type { PageServerLoad } from './$types';
import type { StudentAssessmentsPageData, StudentAssessmentItem } from './assessments.types';

export const load: PageServerLoad = async (event) => {
	const res = await loadStudent(dashboardsContext(event));

	const className = res.ok && res.data?.class_name ? res.data.class_name : 'XI-A';
	const apiSubjects = res.ok && res.data?.subjects ? res.data.subjects : [];

	const subjects = apiSubjects.map((s) => ({
		id: s.id,
		name: s.name,
		icon: ((s.icon as any) ?? 'math') as 'math' | 'biology' | 'indonesian' | 'english' | 'history' | 'physics',
		assessmentCount: 0
	}));

	if (subjects.length === 0) {
		subjects.push(
			{ id: 'math', name: 'Matematika', icon: 'math', assessmentCount: 0 },
			{ id: 'biology', name: 'Biologi', icon: 'biology', assessmentCount: 0 },
			{ id: 'history', name: 'Sejarah', icon: 'history', assessmentCount: 0 },
			{ id: 'indonesian', name: 'Bahasa Indonesia', icon: 'indonesian', assessmentCount: 0 },
			{ id: 'english', name: 'Bahasa Inggris', icon: 'english', assessmentCount: 0 },
			{ id: 'physics', name: 'Fisika', icon: 'physics', assessmentCount: 0 }
		);
	}

	const assessments: StudentAssessmentItem[] = [
		{
			id: 'exam-01',
			title: 'Kuis Harian 2: Fungsi Kuadrat & Parabola',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('mat'))?.id ?? 'math',
			subjectName: 'Matematika',
			subjectIcon: 'math',
			type: 'formative',
			date: '2026-10-08',
			startTime: '08:00',
			endTime: '08:30',
			durationMinutes: 30,
			questionCount: 15,
			xpReward: 50,
			status: 'active',
			passingScore: 75,
			teacherName: 'Bambang Sudibyo, M.Pd.',
			roomCode: 'MAT-XI-02',
			instructions: 'Kerjakan 15 butir soal pilihan ganda interaktif. Pastikan koneksi internet stabil dan jangan berpindah tab browser selama ujian berlangsung.'
		},
		{
			id: 'exam-02',
			title: 'Sumatif Tengah Semester (STS) Biologi',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('bio'))?.id ?? 'biology',
			subjectName: 'Biologi',
			subjectIcon: 'biology',
			type: 'summative',
			date: '2026-10-14',
			startTime: '07:30',
			endTime: '09:00',
			durationMinutes: 90,
			questionCount: 40,
			xpReward: 100,
			status: 'upcoming',
			passingScore: 75,
			teacherName: 'Dr. Retno Wulandari',
			roomCode: 'BIO-STS-XI',
			instructions: 'Cakupan materi: Struktur Sel, Transpor Membran, Enzim dan Metabolisme Sel. Siapkan perangkat yang sudah terinstal aplikasi ujian.'
		},
		{
			id: 'exam-03',
			title: 'Ulangan Harian Kerajaan Hindu-Buddha',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('sejarah'))?.id ?? 'history',
			subjectName: 'Sejarah',
			subjectIcon: 'history',
			type: 'remedial',
			date: '2026-10-06',
			startTime: '09:00',
			endTime: '09:45',
			durationMinutes: 45,
			questionCount: 25,
			xpReward: 40,
			status: 'completed',
			score: 68,
			passingScore: 75,
			isRemedial: true,
			teacherName: 'Dra. Siti Rahmah',
			roomCode: 'SEJ-UH-01',
			instructions: 'Hasil nilai 68 (di bawah KKM 75). Remedial dibuka s.d. Senin, 12 Oktober 2026.'
		},
		{
			id: 'exam-04',
			title: 'Tes Kemampuan Menulis Teks Argumentatif',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('indo'))?.id ?? 'indonesian',
			subjectName: 'Bahasa Indonesia',
			subjectIcon: 'indonesian',
			type: 'formative',
			date: '2026-10-02',
			startTime: '10:00',
			endTime: '11:00',
			durationMinutes: 60,
			questionCount: 20,
			xpReward: 50,
			status: 'completed',
			score: 88,
			passingScore: 75,
			teacherName: 'Hendra Gunawan, S.Pd.',
			roomCode: 'BIN-TES-01',
			instructions: 'Uji pemahaman kaidah bahasa baku dan struktur argumentasi.'
		},
		{
			id: 'exam-05',
			title: 'Tryout Asesmen Standar Nasional (AKM)',
			subjectId: subjects.find((s) => s.name.toLowerCase().includes('eng'))?.id ?? 'english',
			subjectName: 'Bahasa Inggris',
			subjectIcon: 'english',
			type: 'tryout',
			date: '2026-10-18',
			startTime: '08:00',
			endTime: '10:00',
			durationMinutes: 120,
			questionCount: 50,
			xpReward: 120,
			status: 'upcoming',
			passingScore: 70,
			teacherName: 'Sarah Jenkins, M.A.',
			roomCode: 'AKM-ENG-XI',
			instructions: 'Simulasi ujian literasi bahasa Inggris berbasis komputer dengan model soal stimulus teks dan infografis.'
		}
	];

	for (const sub of subjects) {
		sub.assessmentCount = assessments.filter((a) => a.subjectId === sub.id || a.subjectName.toLowerCase().includes(sub.name.toLowerCase())).length;
	}

	const data: StudentAssessmentsPageData = {
		className,
		subjects,
		assessments
	};

	return {
		assessmentsData: data
	};
};
