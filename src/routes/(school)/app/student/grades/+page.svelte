<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Award from '@lucide/svelte/icons/award';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Calculator from '@lucide/svelte/icons/calculator';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Dna from '@lucide/svelte/icons/dna';
	import Download from '@lucide/svelte/icons/download';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FileText from '@lucide/svelte/icons/file-text';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Languages from '@lucide/svelte/icons/languages';
	import Printer from '@lucide/svelte/icons/printer';
	import Search from '@lucide/svelte/icons/search';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import User from '@lucide/svelte/icons/user';
	import X from '@lucide/svelte/icons/x';
	import type { PageProps } from './$types';
	import type { StudentSubjectGrade } from './grades.types';

	let { data }: PageProps = $props();
	const i18n = useI18n();

	const SUBJECT_ICONS = {
		math: Calculator,
		biology: Dna,
		indonesian: BookOpen,
		english: Languages,
		history: Landmark,
		physics: Sparkles
	} as const;

	const PREDICATE_COLORS = {
		A: 'bg-success-400/15 text-success-400 border-success-400/30',
		B: 'bg-lms-interactive-subtle text-lms-interactive border-lms-interactive/30',
		C: 'bg-warning-500/15 text-warning-400 border-warning-500/30',
		D: 'bg-error-500/15 text-error-400 border-error-500/30'
	} as const;

	let selectedPredicate = $state<string>('all');
	let searchQuery = $state<string>('');
	let expandedSubject = $state<string | null>(null);
	let isPrintModalOpen = $state<boolean>(false);

	const summary = $derived(data.gradesData.summary);
	const subjects = $derived(data.gradesData.subjects);

	const allSubjects = $derived(subjects);
	const gradeACount = $derived(subjects.filter((s) => s.predicate === 'A').length);
	const gradeBCount = $derived(subjects.filter((s) => s.predicate === 'B').length);
	const needImprovementCount = $derived(subjects.filter((s) => s.improvementObjectives.length > 0).length);

	const filteredSubjects = $derived(
		subjects.filter((s) => {
			let matchPredicate = true;
			if (selectedPredicate === 'need_improvement') {
				matchPredicate = s.improvementObjectives.length > 0;
			} else if (selectedPredicate !== 'all') {
				matchPredicate = s.predicate === selectedPredicate;
			}

			const query = searchQuery.toLowerCase().trim();
			const matchQuery =
				!query ||
				s.subjectName.toLowerCase().includes(query) ||
				s.teacherName.toLowerCase().includes(query) ||
				s.achievedObjectives.some((o) => o.toLowerCase().includes(query)) ||
				s.improvementObjectives.some((o) => o.toLowerCase().includes(query));

			return matchPredicate && matchQuery;
		})
	);

	function toggleExpand(id: string) {
		expandedSubject = expandedSubject === id ? null : id;
	}

	function openPrintModal() {
		isPrintModalOpen = true;
	}

	function closePrintModal() {
		isPrintModalOpen = false;
	}

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>Nilai & Rapor · {summary.studentName} ({summary.className})</title>
</svelte:head>

<div class="flex min-w-0 flex-col gap-6 leading-tight">
	<!-- Hero Section -->
	<section
		class="bg-lms-hero text-lms-on-hero relative isolate flex min-w-0 flex-col gap-5 overflow-hidden rounded-[22px] p-7 md:p-8"
	>
		<img
			src={logogramColor}
			alt=""
			aria-hidden="true"
			draggable="false"
			class="pointer-events-none absolute -top-8 -right-10 -z-10 w-72 max-w-none opacity-10 select-none"
		/>
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div class="flex flex-col items-start gap-2">
				<span
					class="bg-warning-400 text-lms-brand-deep-neutral rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.14em]"
				>
					NILAI & LAPORAN RAPOR
				</span>
				<h1 class="text-[1.75rem] md:text-3xl font-bold">Rapor Capaian Pembelajaran</h1>
				<p class="text-lms-on-hero-muted text-sm md:text-base max-w-xl">
					{summary.studentName} · NISN {summary.nisn} · Kelas {summary.className} · TA {summary.academicYear} ({summary.semester})
				</p>
			</div>

			<!-- Print/Export Action Button -->
			<button
				type="button"
				class="bg-lms-on-hero text-lms-brand-deep-neutral hover:opacity-90 flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all self-start md:self-auto"
				onclick={openPrintModal}
			>
				<Icon icon={Printer} size="sm" />
				Cetak Lembar Rapor
			</button>
		</div>

		<!-- Quick Stats -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 max-w-2xl">
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Rerata Nilai Rapor</span>
				<span class="text-2xl font-bold tabular-nums text-warning-400">{summary.averageScore}</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Peringkat Kelas</span>
				<span class="text-2xl font-bold">{summary.rankInClass} <span class="text-xs text-lms-on-hero-muted font-normal">/ {summary.totalStudents}</span></span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Predikat A</span>
				<span class="text-2xl font-bold text-success-400">{gradeACount} Mapel</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Wali Kelas</span>
				<span class="text-xs font-semibold truncate mt-1">{summary.homeroomTeacher}</span>
			</div>
		</div>
	</section>

	<!-- Filter & Search Controls -->
	<div class="lms-card flex flex-col gap-4 rounded-[22px]! p-5 shadow-none!">
		<!-- Filter Tabs & Search Bar -->
		<div class="grid gap-3 md:grid-cols-[1fr_auto]">
			<div class="relative flex items-center">
				<span class="text-lms-muted pointer-events-none absolute left-3.5">
					<Icon icon={Search} size="sm" />
				</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari mata pelajaran, guru, atau deskripsi capaian..."
					class="lms-input bg-lms-surface border-lms-border focus:border-lms-interactive h-11 w-full rounded-xl pl-10 pr-4 text-sm"
				/>
				{#if searchQuery}
					<button
						type="button"
						class="text-lms-muted hover:text-lms-foreground absolute right-3 p-1"
						onclick={() => (searchQuery = '')}
						aria-label="Bersihkan pencarian"
					>
						<Icon icon={X} size="sm" />
					</button>
				{/if}
			</div>

			<div class="flex items-center gap-1.5 overflow-x-auto">
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3.5 text-xs font-semibold transition-colors',
						selectedPredicate === 'all'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedPredicate = 'all')}
				>
					Semua Mapel ({subjects.length})
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3.5 text-xs font-semibold transition-colors',
						selectedPredicate === 'A'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedPredicate = 'A')}
				>
					Predikat A ({gradeACount})
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3.5 text-xs font-semibold transition-colors',
						selectedPredicate === 'B'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedPredicate = 'B')}
				>
					Predikat B ({gradeBCount})
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3.5 text-xs font-semibold transition-colors',
						selectedPredicate === 'need_improvement'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedPredicate = 'need_improvement')}
				>
					Perlu Penguatan ({needImprovementCount})
				</button>
			</div>
		</div>
	</div>

	<!-- Grades List / Cards -->
	{#if filteredSubjects.length === 0}
		<div class="lms-card flex flex-col items-center justify-center gap-3 rounded-[22px]! p-12 text-center shadow-none!">
			<div class="bg-lms-interactive-subtle text-lms-interactive flex size-14 items-center justify-center rounded-full">
				<Icon icon={Award} size="lg" />
			</div>
			<div class="flex flex-col gap-1 max-w-sm">
				<h3 class="text-base font-bold">Tidak ada data nilai yang cocok</h3>
				<p class="text-lms-muted text-xs">
					Coba sesuaikan kata kunci pencarian atau ubah filter predikat yang Anda pilih.
				</p>
			</div>
		</div>
	{:else}
		<div class="flex flex-col gap-4">
			{#each filteredSubjects as subject (subject.id)}
				{@const isExpanded = expandedSubject === subject.id}
				<article
					class="lms-card hover:border-lms-interactive/40 flex flex-col rounded-[22px]! p-5 transition-all duration-200 shadow-none!"
				>
					<!-- Card Header Summary -->
					<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div class="flex items-center gap-3.5">
							<span class="bg-lms-interactive-subtle text-lms-interactive flex size-12 items-center justify-center rounded-2xl">
								<Icon icon={SUBJECT_ICONS[subject.subjectIcon] ?? BookOpen} size="md" />
							</span>
							<div class="flex flex-col gap-0.5">
								<div class="flex items-center gap-2">
									<h3 class="text-base font-bold">{subject.subjectName}</h3>
									<span class={['rounded-md border px-2 py-0.5 text-xs font-bold', PREDICATE_COLORS[subject.predicate]]}>
										Predikat {subject.predicate}
									</span>
								</div>
								<span class="text-lms-muted text-xs">
									Guru Pengampu: {subject.teacherName} · KKTP: {subject.passingCriteria}
								</span>
							</div>
						</div>

						<!-- Scores Grid & Toggle Button -->
						<div class="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 border-lms-border pt-3 md:pt-0">
							<div class="flex items-center gap-4 text-center">
								<div class="flex flex-col">
									<span class="text-lms-muted text-[11px]">Formatif</span>
									<span class="text-sm font-bold tabular-nums">{subject.formativeScore}</span>
								</div>
								<div class="text-lms-muted text-xs">/</div>
								<div class="flex flex-col">
									<span class="text-lms-muted text-[11px]">Sumatif</span>
									<span class="text-sm font-bold tabular-nums">{subject.summativeScore}</span>
								</div>
								<div class="text-lms-muted text-xs">=</div>
								<div class="flex flex-col">
									<span class="text-lms-muted text-[11px] font-bold text-lms-foreground">Nilai Akhir</span>
									<span class="text-lg font-bold tabular-nums text-lms-interactive">{subject.finalScore}</span>
								</div>
							</div>

							<button
								type="button"
								class="lms-focus-ring flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-lms-muted hover:text-lms-foreground hover:bg-lms-surface-muted transition-colors"
								onclick={() => toggleExpand(subject.id)}
								aria-expanded={isExpanded}
							>
								<span>{isExpanded ? 'Tutup Capaian' : 'Rincian TP'}</span>
								<span class={['transition-transform duration-200', isExpanded && 'rotate-180']}>
									<Icon icon={ChevronDown} size="sm" />
								</span>
							</button>
						</div>
					</div>

					<!-- Expandable Learning Objectives Detail -->
					{#if isExpanded}
						<div class="mt-4 flex flex-col gap-3 border-t border-lms-border pt-4 text-xs leading-relaxed animate-in fade-in duration-200">
							<!-- Achieved Objectives -->
							{#if subject.achievedObjectives.length > 0}
								<div class="flex flex-col gap-1.5 bg-success-400/5 border border-success-400/20 rounded-xl p-3.5">
									<span class="text-success-500 font-bold flex items-center gap-1.5">
										<Icon icon={CheckCircle2} size="sm" /> Capaian Kompetensi Tertinggi (Tuntas Baik):
									</span>
									<ul class="flex flex-col gap-1 text-lms-muted list-disc list-inside pl-1">
										{#each subject.achievedObjectives as obj}
											<li>{obj}</li>
										{/each}
									</ul>
								</div>
							{/if}

							<!-- Improvement Objectives -->
							{#if subject.improvementObjectives.length > 0}
								<div class="flex flex-col gap-1.5 bg-warning-500/5 border border-warning-500/20 rounded-xl p-3.5">
									<span class="text-warning-500 font-bold flex items-center gap-1.5">
										<Icon icon={AlertCircle} size="sm" /> Perlu Peningkatan & Penguatan Materi:
									</span>
									<ul class="flex flex-col gap-1 text-lms-muted list-disc list-inside pl-1">
										{#each subject.improvementObjectives as obj}
											<li>{obj}</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal Lembar Cetak Rapor Digital -->
{#if isPrintModalOpen}
	<div
		class="bg-lms-scrim/60 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="print-modal-title"
	>
		<div
			class="bg-lms-surface border-lms-border flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border shadow-2xl"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-lms-border p-5">
				<div class="flex items-center gap-3">
					<span class="bg-lms-interactive-subtle text-lms-interactive flex size-10 items-center justify-center rounded-xl">
						<Icon icon={Printer} size="md" />
					</span>
					<div class="flex flex-col">
						<span class="text-lms-muted text-[11px] font-semibold uppercase tracking-wider">
							Pratinjau Lembar Rapor Digital
						</span>
						<h2 id="print-modal-title" class="text-base font-bold">
							Laporan Capaian Pembelajaran Murid
						</h2>
					</div>
				</div>
				<button
					type="button"
					class="text-lms-muted hover:text-lms-foreground flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-lms-surface-muted"
					onclick={closePrintModal}
					aria-label="Tutup"
				>
					<Icon icon={X} size="md" />
				</button>
			</div>

			<!-- Modal Body: Printable Report Card Preview -->
			<div class="flex flex-col gap-5 overflow-y-auto p-6 leading-relaxed bg-lms-surface text-xs">
				<!-- School & Student Info Header -->
				<div class="border-b border-lms-border pb-4 flex flex-col gap-2 text-center">
					<h3 class="text-sm font-bold uppercase tracking-wider">RAPOR CAPAIAN HASIL BELAJAR PESERTA DIDIK</h3>
					<p class="text-lms-muted text-[11px]">SMA NEGERI CONTOH FLIXARE · TAHUN AJARAN {summary.academicYear}</p>
				</div>

				<div class="grid grid-cols-2 gap-2 text-xs border border-lms-border p-3.5 rounded-xl bg-lms-surface-muted/30">
					<div>Nama Murid: <strong>{summary.studentName}</strong></div>
					<div>Kelas: <strong>{summary.className}</strong></div>
					<div>NISN: <strong>{summary.nisn}</strong></div>
					<div>Semester: <strong>{summary.semester}</strong></div>
				</div>

				<!-- Table Grades -->
				<div class="overflow-x-auto border border-lms-border rounded-xl">
					<table class="w-full text-left border-collapse">
						<thead>
							<tr class="border-b border-lms-border bg-lms-surface-muted text-[11px]">
								<th class="p-2.5">No</th>
								<th class="p-2.5">Mata Pelajaran</th>
								<th class="p-2.5 text-center">KKTP</th>
								<th class="p-2.5 text-center">Nilai Akhir</th>
								<th class="p-2.5 text-center">Predikat</th>
								<th class="p-2.5">Capaian Kompetensi Tertinggi</th>
							</tr>
						</thead>
						<tbody>
							{#each subjects as s, i (s.id)}
								<tr class="border-b border-lms-border/50">
									<td class="p-2.5 text-center">{i + 1}</td>
									<td class="p-2.5 font-semibold">{s.subjectName}</td>
									<td class="p-2.5 text-center tabular-nums">{s.passingCriteria}</td>
									<td class="p-2.5 text-center font-bold tabular-nums">{s.finalScore}</td>
									<td class="p-2.5 text-center font-bold">{s.predicate}</td>
									<td class="p-2.5 text-[11px] text-lms-muted">{s.achievedObjectives[0] ?? '-'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Signatures -->
				<div class="grid grid-cols-2 gap-6 pt-4 text-center">
					<div class="flex flex-col gap-12">
						<span class="text-lms-muted">Mengetahui,<br>Orang Tua / Wali Murid</span>
						<span class="font-bold border-b border-lms-border w-3/4 mx-auto pb-1">........................................</span>
					</div>
					<div class="flex flex-col gap-12">
						<span class="text-lms-muted">Wali Kelas {summary.className},</span>
						<span class="font-bold border-b border-lms-border w-3/4 mx-auto pb-1">{summary.homeroomTeacher}</span>
					</div>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="flex items-center justify-end gap-2 border-t border-lms-border p-4 bg-lms-surface-muted/30">
				<button
					type="button"
					class="lms-action-ghost rounded-xl px-4 py-2 text-xs font-semibold"
					onclick={closePrintModal}
				>
					Tutup
				</button>
				<button
					type="button"
					class="lms-action-primary flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold"
					onclick={handlePrint}
				>
					<Icon icon={Printer} size="sm" />
					Cetak Sekarang
				</button>
			</div>
		</div>
	</div>
{/if}
