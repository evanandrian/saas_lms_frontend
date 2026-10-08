<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Calculator from '@lucide/svelte/icons/calculator';
	import Calendar from '@lucide/svelte/icons/calendar';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Clock from '@lucide/svelte/icons/clock';
	import Dna from '@lucide/svelte/icons/dna';
	import FileText from '@lucide/svelte/icons/file-text';
	import HelpCircle from '@lucide/svelte/icons/help-circle';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Languages from '@lucide/svelte/icons/languages';
	import Play from '@lucide/svelte/icons/play';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Search from '@lucide/svelte/icons/search';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Timer from '@lucide/svelte/icons/timer';
	import User from '@lucide/svelte/icons/user';
	import X from '@lucide/svelte/icons/x';
	import Zap from '@lucide/svelte/icons/zap';
	import type { PageProps } from './$types';
	import type { AssessmentType, StudentAssessmentItem } from './assessments.types';

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

	const TYPE_LABELS: Record<AssessmentType, { label: string; tone: string }> = {
		formative: { label: 'Kuis Formatif', tone: 'bg-lms-interactive-subtle text-lms-interactive' },
		summative: { label: 'Sumatif STS/SAS', tone: 'bg-primary-500/15 text-primary-400' },
		tryout: { label: 'Tryout / AKM', tone: 'bg-purple-500/15 text-purple-400' },
		remedial: { label: 'Ujian Remedial', tone: 'bg-warning-500/15 text-warning-400' }
	};

	let selectedSubject = $state<string>('all');
	let selectedStatus = $state<string>('all');
	let searchQuery = $state<string>('');
	let selectedExam = $state<StudentAssessmentItem | null>(null);
	let isExamModalOpen = $state<boolean>(false);
	let isExamInProgress = $state<boolean>(false);

	const allAssessments = $derived(data.assessmentsData.assessments);
	const subjects = $derived(data.assessmentsData.subjects);

	const activeCount = $derived(allAssessments.filter((a) => a.status === 'active').length);
	const upcomingCount = $derived(allAssessments.filter((a) => a.status === 'upcoming').length);
	const completedCount = $derived(allAssessments.filter((a) => a.status === 'completed').length);
	const remedialCount = $derived(allAssessments.filter((a) => a.isRemedial || a.type === 'remedial').length);

	const filteredAssessments = $derived(
		allAssessments.filter((a) => {
			const matchSubject =
				selectedSubject === 'all' ||
				a.subjectId === selectedSubject ||
				a.subjectName.toLowerCase() === selectedSubject.toLowerCase();
			let matchStatus = true;
			if (selectedStatus === 'remedial') {
				matchStatus = Boolean(a.isRemedial || a.type === 'remedial');
			} else if (selectedStatus !== 'all') {
				matchStatus = a.status === selectedStatus;
			}

			const query = searchQuery.toLowerCase().trim();
			const matchQuery =
				!query ||
				a.title.toLowerCase().includes(query) ||
				a.instructions.toLowerCase().includes(query) ||
				a.subjectName.toLowerCase().includes(query) ||
				(a.roomCode && a.roomCode.toLowerCase().includes(query)) ||
				a.teacherName.toLowerCase().includes(query);
			return matchSubject && matchStatus && matchQuery;
		})
	);

	function openExamModal(exam: StudentAssessmentItem) {
		selectedExam = exam;
		isExamInProgress = false;
		isExamModalOpen = true;
	}

	function closeExamModal() {
		isExamModalOpen = false;
		selectedExam = null;
		isExamInProgress = false;
	}

	function startCbtSimulation() {
		isExamInProgress = true;
	}
</script>

<svelte:head>
	<title>Jadwal & Ruang Ujian · {data.assessmentsData.className}</title>
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
		<div class="flex flex-col items-start gap-2">
			<span
				class="bg-warning-400 text-lms-brand-deep-neutral rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.14em]"
			>
				UJIAN & ASESMEN CBT
			</span>
			<h1 class="text-[1.75rem] md:text-3xl font-bold">Ruang Ujian & Asesmen Digital</h1>
			<p class="text-lms-on-hero-muted text-sm md:text-base max-w-2xl">
				Ikuti kuis harian, ulangan sumatif, tryout AKM, dan ujian remedial kelas {data.assessmentsData.className} secara terintegrasi dan aman.
			</p>
		</div>

		<!-- Quick Stats -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 max-w-2xl">
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Total Ujian</span>
				<span class="text-2xl font-bold">{allAssessments.length}</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Aktif Hari Ini</span>
				<span class="text-2xl font-bold text-warning-400">{activeCount}</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Ujian Mendatang</span>
				<span class="text-2xl font-bold text-lms-link">{upcomingCount}</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Perlu Remedial</span>
				<span class="text-2xl font-bold text-error-400">{remedialCount}</span>
			</div>
		</div>
	</section>

	<!-- Filter & Search Controls -->
	<div class="lms-card flex flex-col gap-4 rounded-[22px]! p-5 shadow-none!">
		<!-- Subject Pills Filter -->
		<div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
			<button
				type="button"
				class={[
					'lms-focus-ring flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors',
					selectedSubject === 'all'
						? 'bg-lms-interactive text-lms-on-interactive'
						: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
				]}
				onclick={() => (selectedSubject = 'all')}
			>
				<Icon icon={BookOpen} size="sm" />
				Semua Mapel ({allAssessments.length})
			</button>
			{#each subjects as sub (sub.id)}
				<button
					type="button"
					class={[
						'lms-focus-ring flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors',
						selectedSubject === sub.id || selectedSubject === sub.name
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedSubject = sub.id)}
				>
					<Icon icon={SUBJECT_ICONS[sub.icon] ?? BookOpen} size="sm" />
					{sub.name}
					{#if sub.assessmentCount > 0}
						<span class="opacity-70 text-[11px]">({sub.assessmentCount})</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Status Tabs & Search Bar -->
		<div class="grid gap-3 md:grid-cols-[1fr_auto]">
			<div class="relative flex items-center">
				<span class="text-lms-muted pointer-events-none absolute left-3.5">
					<Icon icon={Search} size="sm" />
				</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari judul ujian, kode ruang, atau mata pelajaran..."
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
						'h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
						selectedStatus === 'all'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedStatus = 'all')}
				>
					Semua Ujian
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
						selectedStatus === 'active'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedStatus = 'active')}
				>
					Aktif Hari Ini ({activeCount})
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
						selectedStatus === 'upcoming'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedStatus = 'upcoming')}
				>
					Mendatang ({upcomingCount})
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
						selectedStatus === 'completed'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedStatus = 'completed')}
				>
					Riwayat & Nilai ({completedCount})
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
						selectedStatus === 'remedial'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedStatus = 'remedial')}
				>
					Remedial ({remedialCount})
				</button>
			</div>
		</div>
	</div>

	<!-- Assessments Grid -->
	{#if filteredAssessments.length === 0}
		<div class="lms-card flex flex-col items-center justify-center gap-3 rounded-[22px]! p-12 text-center shadow-none!">
			<div class="bg-lms-interactive-subtle text-lms-interactive flex size-14 items-center justify-center rounded-full">
				<Icon icon={Timer} size="lg" />
			</div>
			<div class="flex flex-col gap-1 max-w-sm">
				<h3 class="text-base font-bold">Tidak ada jadwal ujian pada filter ini</h3>
				<p class="text-lms-muted text-xs">
					Semua ujian telah diselesaikan atau tidak ada sesi ujian yang cocok dengan pencarian.
				</p>
			</div>
			{#if searchQuery || selectedSubject !== 'all' || selectedStatus !== 'all'}
				<button
					type="button"
					class="lms-action-ghost text-xs font-semibold mt-2"
					onclick={() => {
						searchQuery = '';
						selectedSubject = 'all';
						selectedStatus = 'all';
					}}
				>
					Reset Semua Filter
				</button>
			{/if}
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each filteredAssessments as item (item.id)}
				{@const isRemedialNeeded = item.isRemedial || (item.score !== undefined && item.score < item.passingScore)}
				<article
					class={[
						'lms-card hover:border-lms-interactive/40 relative flex flex-col justify-between rounded-[22px]! p-5 transition-all duration-200 shadow-none!',
						item.status === 'active' ? 'border-warning-400/40 bg-warning-400/5' : ''
					]}
				>
					<div class="flex flex-col gap-3">
						<!-- Card Top: Subject & Type Badge -->
						<div class="flex items-center justify-between gap-2">
							<span class="bg-lms-interactive-subtle text-lms-interactive flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold">
								<Icon icon={SUBJECT_ICONS[item.subjectIcon] ?? BookOpen} size="sm" />
								{item.subjectName}
							</span>
							<span class={['rounded-full px-2.5 py-0.75 text-xs font-bold', TYPE_LABELS[item.type].tone]}>
								{TYPE_LABELS[item.type].label}
							</span>
						</div>

						<!-- Title & Meta -->
						<div class="flex flex-col gap-1">
							<h3 class="text-base font-bold line-clamp-2 hover:text-lms-link transition-colors">
								{item.title}
							</h3>
							<div class="flex items-center gap-2 text-lms-muted text-xs">
								<span>{item.date}</span>
								<span>·</span>
								<span>{item.startTime}–{item.endTime} WIB</span>
							</div>
						</div>

						<!-- Details Chips -->
						<div class="flex flex-wrap gap-2 pt-1 text-xs">
							<span class="bg-lms-surface-muted text-lms-muted flex items-center gap-1 rounded-lg px-2.5 py-1">
								<Icon icon={Clock} size="sm" /> {item.durationMinutes} Menit
							</span>
							<span class="bg-lms-surface-muted text-lms-muted flex items-center gap-1 rounded-lg px-2.5 py-1">
								<Icon icon={HelpCircle} size="sm" /> {item.questionCount} Soal
							</span>
							<span class="bg-warning-400/10 text-warning-500 font-bold flex items-center gap-1 rounded-lg px-2.5 py-1">
								<Icon icon={Zap} size="sm" /> +{item.xpReward} XP
							</span>
						</div>

						<!-- Score / Result Banner if Completed -->
						{#if item.status === 'completed' && item.score !== undefined}
							<div
								class={[
									'rounded-xl p-3 flex items-center justify-between',
									item.score >= item.passingScore
										? 'bg-success-400/10 border border-success-400/30'
										: 'bg-error-400/10 border border-error-400/30'
								]}
							>
								<div class="flex flex-col">
									<span class="text-xs font-bold">
										{item.score >= item.passingScore ? 'Lulus KKM' : 'Perlu Remedial'}
									</span>
									<span class="text-[11px] text-lms-muted">Target KKM: {item.passingScore}</span>
								</div>
								<span
									class={[
										'text-xl font-bold tabular-nums',
										item.score >= item.passingScore ? 'text-success-500' : 'text-error-500'
									]}
								>
									{item.score}
								</span>
							</div>
						{/if}
					</div>

					<!-- Card Footer: Room Code & Action -->
					<div class="mt-5 flex flex-col gap-3 border-t border-lms-border pt-4">
						<div class="flex items-center justify-between text-xs">
							<span class="text-lms-muted text-[11px]">
								{#if item.roomCode}
									Kode Ruang: <strong class="font-mono text-lms-foreground">{item.roomCode}</strong>
								{:else}
									Guru: {item.teacherName}
								{/if}
							</span>
							<span>
								{#if item.status === 'active'}
									<span class="text-warning-500 font-bold flex items-center gap-1 animate-pulse">
										● Ujian Dibuka
									</span>
								{:else if item.status === 'upcoming'}
									<span class="text-lms-link font-bold">Mendatang</span>
								{:else}
									<span class="text-lms-muted font-semibold">Selesai</span>
								{/if}
							</span>
						</div>

						<!-- Action Button -->
						<button
							type="button"
							class={[
								'lms-focus-ring flex h-9.5 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all hover:opacity-95',
								item.status === 'active'
									? 'bg-warning-400 text-lms-brand-deep-neutral hover:bg-warning-500'
									: isRemedialNeeded
										? 'lms-action-primary'
										: 'lms-action-ghost border border-lms-border'
							]}
							onclick={() => openExamModal(item)}
						>
							{#if item.status === 'active'}
								<Icon icon={Play} size="sm" />
								Mulai Ujian Sekarang
							{:else if isRemedialNeeded}
								<Icon icon={RotateCcw} size="sm" />
								Mulai Ujian Remedial
							{:else if item.status === 'completed'}
								<Icon icon={FileText} size="sm" />
								Lihat Pembahasan & Nilai
							{:else}
								<Icon icon={Calendar} size="sm" />
								Lihat Jadwal & Petunjuk
							{/if}
						</button>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal Ruang Ujian CBT Simulator -->
{#if isExamModalOpen && selectedExam}
	<div
		class="bg-lms-scrim/60 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="exam-modal-title"
	>
		<div
			class="bg-lms-surface border-lms-border flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border shadow-2xl"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-lms-border p-5">
				<div class="flex items-center gap-3">
					<span class="bg-lms-interactive-subtle text-lms-interactive flex size-10 items-center justify-center rounded-xl">
						<Icon icon={SUBJECT_ICONS[selectedExam.subjectIcon] ?? BookOpen} size="md" />
					</span>
					<div class="flex flex-col">
						<span class="text-lms-muted text-[11px] font-semibold uppercase tracking-wider">
							{selectedExam.subjectName} · {TYPE_LABELS[selectedExam.type].label}
						</span>
						<h2 id="exam-modal-title" class="text-base font-bold">
							{selectedExam.title}
						</h2>
					</div>
				</div>
				<button
					type="button"
					class="text-lms-muted hover:text-lms-foreground flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-lms-surface-muted"
					onclick={closeExamModal}
					aria-label="Tutup"
				>
					<Icon icon={X} size="md" />
				</button>
			</div>

			<!-- Modal Body -->
			<div class="flex flex-col gap-4 overflow-y-auto p-6 leading-relaxed">
				{#if isExamInProgress}
					<!-- Live CBT Simulation Active State -->
					<div class="bg-lms-hero text-lms-on-hero flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center">
						<div class="bg-warning-400 text-lms-brand-deep-neutral flex size-16 items-center justify-center rounded-2xl shadow-lg">
							<Icon icon={Timer} size="lg" />
						</div>
						<div class="flex flex-col gap-1">
							<span class="text-xs font-bold uppercase tracking-widest text-warning-400">Sesi Ujian Berlangsung</span>
							<h3 class="text-2xl font-bold font-mono">00:29:45</h3>
							<p class="text-lms-on-hero-muted text-xs">
								Soal 1 dari {selectedExam.questionCount} butir · Navigasi soal aktif
							</p>
						</div>
						<div class="bg-lms-hero-raised mt-2 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs">
							<span class="size-2 rounded-full bg-success-400 animate-pulse"></span>
							<span>Sistem CBT Tersambung Aman</span>
						</div>
					</div>
				{:else}
					<!-- Pre-Exam Information & Rules -->
					<div class="bg-lms-surface-muted grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl p-3.5 text-xs">
						<div class="flex items-center gap-2">
							<Icon icon={Clock} size="sm" />
							<span>Durasi: <strong>{selectedExam.durationMinutes} Menit</strong></span>
						</div>
						<div class="flex items-center gap-2">
							<Icon icon={HelpCircle} size="sm" />
							<span>Jumlah Soal: <strong>{selectedExam.questionCount} Butir</strong></span>
						</div>
						<div class="flex items-center gap-2">
							<Icon icon={Zap} size="sm" />
							<span>Hadiah XP: <strong class="text-warning-500">+{selectedExam.xpReward} XP</strong></span>
						</div>
						<div class="flex items-center gap-2">
							<Icon icon={CheckCircle2} size="sm" />
							<span>KKM: <strong>{selectedExam.passingScore}</strong></span>
						</div>
						<div class="flex items-center gap-2 sm:col-span-2">
							<Icon icon={User} size="sm" />
							<span>Pengawas/Guru: <strong>{selectedExam.teacherName}</strong></span>
						</div>
					</div>

					<!-- Instructions -->
					<div class="flex flex-col gap-2">
						<h4 class="text-sm font-bold">Tata Tertib & Petunjuk Ujian</h4>
						<div class="bg-lms-surface border border-lms-border flex flex-col gap-2 rounded-xl p-4 text-xs text-lms-muted leading-relaxed">
							<p>{selectedExam.instructions}</p>
							<ul class="flex flex-col gap-1 list-disc list-inside mt-1">
								<li>Gunakan koneksi internet stabil dan perangkat baterai mencukupi.</li>
								<li>Dilarang membuka tab atau jendela lain selama proses ujian berlangsung.</li>
								<li>Jawaban tersimpan otomatis secara berkala di server sekolah.</li>
							</ul>
						</div>
					</div>
				{/if}
			</div>

			<!-- Modal Footer -->
			<div class="flex items-center justify-end gap-2 border-t border-lms-border p-4 bg-lms-surface-muted/30">
				<button
					type="button"
					class="lms-action-ghost rounded-xl px-4 py-2 text-xs font-semibold"
					onclick={closeExamModal}
				>
					{isExamInProgress ? 'Keluar Sesi' : 'Tutup'}
				</button>
				{#if !isExamInProgress && (selectedExam.status === 'active' || selectedExam.isRemedial)}
					<button
						type="button"
						class="bg-warning-400 text-lms-brand-deep-neutral hover:bg-warning-500 flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition-colors"
						onclick={startCbtSimulation}
					>
						<Icon icon={Play} size="sm" />
						Konfirmasi & Masuk Ujian
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
