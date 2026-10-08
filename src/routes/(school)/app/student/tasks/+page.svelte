<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Calculator from '@lucide/svelte/icons/calculator';
	import Calendar from '@lucide/svelte/icons/calendar';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Clock from '@lucide/svelte/icons/clock';
	import Dna from '@lucide/svelte/icons/dna';
	import FileText from '@lucide/svelte/icons/file-text';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Languages from '@lucide/svelte/icons/languages';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import Search from '@lucide/svelte/icons/search';
	import Send from '@lucide/svelte/icons/send';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import User from '@lucide/svelte/icons/user';
	import Users from '@lucide/svelte/icons/users';
	import X from '@lucide/svelte/icons/x';
	import Zap from '@lucide/svelte/icons/zap';
	import type { PageProps } from './$types';
	import type { StudentTaskItem, TaskStatus, TaskType } from './tasks.types';

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

	const TYPE_LABELS: Record<TaskType, { label: string; icon: typeof User }> = {
		individual: { label: 'Tugas Individu', icon: User },
		group: { label: 'Tugas Kelompok', icon: Users },
		quiz: { label: 'Kuis Singkat', icon: Zap },
		project: { label: 'Proyek Portofolio', icon: Sparkles }
	};

	let selectedSubject = $state<string>('all');
	let selectedStatus = $state<string>('all');
	let searchQuery = $state<string>('');
	let selectedTask = $state<StudentTaskItem | null>(null);
	let isSubmitModalOpen = $state<boolean>(false);
	let uploadSuccessMessage = $state<string | null>(null);

	let submissionNote = $state<string>('');
	let selectedFileName = $state<string>('');

	const allTasks = $derived(data.tasksData.tasks);
	const subjects = $derived(data.tasksData.subjects);

	const pendingCount = $derived(allTasks.filter((t) => t.status === 'pending').length);
	const submittedCount = $derived(allTasks.filter((t) => t.status === 'submitted').length);
	const gradedCount = $derived(allTasks.filter((t) => t.status === 'graded').length);

	const filteredTasks = $derived(
		allTasks.filter((t) => {
			const matchSubject =
				selectedSubject === 'all' ||
				t.subjectId === selectedSubject ||
				t.subjectName.toLowerCase() === selectedSubject.toLowerCase();
			const matchStatus = selectedStatus === 'all' || t.status === selectedStatus;
			const query = searchQuery.toLowerCase().trim();
			const matchQuery =
				!query ||
				t.title.toLowerCase().includes(query) ||
				t.instructions.toLowerCase().includes(query) ||
				t.subjectName.toLowerCase().includes(query) ||
				t.teacherName.toLowerCase().includes(query);
			return matchSubject && matchStatus && matchQuery;
		})
	);

	function openTaskDetail(task: StudentTaskItem) {
		selectedTask = task;
		submissionNote = '';
		selectedFileName = '';
		uploadSuccessMessage = null;
		isSubmitModalOpen = true;
	}

	function closeTaskModal() {
		isSubmitModalOpen = false;
		selectedTask = null;
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			selectedFileName = target.files[0].name;
		}
	}

	function submitTask() {
		if (!selectedTask) return;
		selectedTask.status = 'submitted';
		selectedTask.submissionDate = new Date().toISOString().slice(0, 10);
		selectedTask.submittedFileName = selectedFileName || 'Jawaban_Tugas.pdf';
		uploadSuccessMessage = 'Tugas berhasil dikirim ke guru! Kamu mendapatkan tambahan XP.';
		setTimeout(() => {
			closeTaskModal();
		}, 1500);
	}
</script>

<svelte:head>
	<title>Daftar Tugas & Penugasan · {data.tasksData.className}</title>
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
				TUGAS & PENUGASAN
			</span>
			<h1 class="text-[1.75rem] md:text-3xl font-bold">Daftar Tugas & Proyek Kelas</h1>
			<p class="text-lms-on-hero-muted text-sm md:text-base max-w-2xl">
				Pantau jadwal tenggat waktu tugas, kumpulkan hasil pekerjaan rumah, dan lihat catatan koreksi serta nilai langsung dari guru kelasmu.
			</p>
		</div>

		<!-- Quick Stats -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 max-w-2xl">
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Total Tugas</span>
				<span class="text-2xl font-bold">{allTasks.length}</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Perlu Dikerjakan</span>
				<span class="text-2xl font-bold text-warning-400">{pendingCount}</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Menunggu Nilai</span>
				<span class="text-2xl font-bold text-lms-link">{submittedCount}</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Sudah Dinilai</span>
				<span class="text-2xl font-bold text-success-400">{gradedCount}</span>
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
				Semua Mapel ({allTasks.length})
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
					{#if sub.taskCount > 0}
						<span class="opacity-70 text-[11px]">({sub.taskCount})</span>
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
					placeholder="Cari judul tugas, instruksi, atau nama guru..."
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
					Semua Status
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
						selectedStatus === 'pending'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedStatus = 'pending')}
				>
					Perlu Dikerjakan ({pendingCount})
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
						selectedStatus === 'submitted'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedStatus = 'submitted')}
				>
					Dikumpulkan ({submittedCount})
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
						selectedStatus === 'graded'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedStatus = 'graded')}
				>
					Selesai Dinilai ({gradedCount})
				</button>
			</div>
		</div>
	</div>

	<!-- Tasks Grid -->
	{#if filteredTasks.length === 0}
		<div class="lms-card flex flex-col items-center justify-center gap-3 rounded-[22px]! p-12 text-center shadow-none!">
			<div class="bg-lms-interactive-subtle text-lms-interactive flex size-14 items-center justify-center rounded-full">
				<Icon icon={CheckCircle2} size="lg" />
			</div>
			<div class="flex flex-col gap-1 max-w-sm">
				<h3 class="text-base font-bold">Tidak ada tugas pada filter ini</h3>
				<p class="text-lms-muted text-xs">
					Semua tugas telah diselesaikan atau tidak ada tugas yang cocok dengan filter pencarian.
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
			{#each filteredTasks as item (item.id)}
				<article
					class="lms-card hover:border-lms-interactive/40 relative flex flex-col justify-between rounded-[22px]! p-5 transition-all duration-200 shadow-none!"
				>
					<div class="flex flex-col gap-3">
						<!-- Card Top: Subject & Type Badge -->
						<div class="flex items-center justify-between gap-2">
							<span class="bg-lms-interactive-subtle text-lms-interactive flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold">
								<Icon icon={SUBJECT_ICONS[item.subjectIcon] ?? BookOpen} size="sm" />
								{item.subjectName}
							</span>
							<span
								class="bg-warning-400 text-lms-brand-deep-neutral flex items-center gap-1 rounded-full px-2.5 py-0.75 text-xs font-bold"
							>
								<Icon icon={Zap} size="sm" />+{item.xp} XP
							</span>
						</div>

						<!-- Title & Meta -->
						<div class="flex flex-col gap-1">
							<h3 class="text-base font-bold line-clamp-2 hover:text-lms-link transition-colors">
								{item.title}
							</h3>
							<div class="flex items-center gap-2 text-lms-muted text-xs">
								<span class="flex items-center gap-1">
									<Icon icon={TYPE_LABELS[item.type].icon} size="sm" />
									{TYPE_LABELS[item.type].label}
								</span>
								<span>·</span>
								<span>Oleh {item.teacherName}</span>
							</div>
						</div>

						<!-- Instructions Snippet -->
						<p class="text-lms-muted text-xs leading-relaxed line-clamp-3">
							{item.instructions}
						</p>

						<!-- Score & Feedback if Graded -->
						{#if item.status === 'graded' && item.score !== undefined}
							<div class="bg-success-400/10 border border-success-400/30 rounded-xl p-3 flex flex-col gap-1.5">
								<div class="flex items-center justify-between">
									<span class="text-xs font-bold text-success-500 flex items-center gap-1">
										<Icon icon={CheckCircle2} size="sm" /> Nilai Akhir
									</span>
									<span class="text-base font-bold text-success-500 tabular-nums">
										{item.score} / {item.maxScore ?? 100}
									</span>
								</div>
								{#if item.feedback}
									<p class="text-[11px] text-lms-muted italic">
										"{item.feedback}"
									</p>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Card Footer: Due Date & Action Button -->
					<div class="mt-5 flex flex-col gap-3 border-t border-lms-border pt-4">
						<div class="flex items-center justify-between text-xs">
							<span class="flex items-center gap-1.5 text-lms-muted">
								<Icon icon={Calendar} size="sm" />
								Tenggat: <strong class="text-lms-foreground">{item.dueDate}</strong>
							</span>
							<span>
								{#if item.status === 'graded'}
									<span class="text-success-400 font-bold text-xs">Selesai Dinilai</span>
								{:else if item.status === 'submitted'}
									<span class="text-lms-link font-bold text-xs">Terkirim</span>
								{:else}
									<span class="text-warning-500 font-bold text-xs">Belum Selesai</span>
								{/if}
							</span>
						</div>

						<!-- Action Button -->
						<button
							type="button"
							class={[
								'lms-focus-ring flex h-9.5 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all hover:opacity-95',
								item.status === 'pending'
									? 'lms-action-primary'
									: 'lms-action-ghost border border-lms-border'
							]}
							onclick={() => openTaskDetail(item)}
						>
							{#if item.status === 'pending'}
								<Icon icon={UploadCloud} size="sm" />
								Kerjakan / Kumpulkan Tugas
							{:else}
								<Icon icon={FileText} size="sm" />
								Lihat Rincian Tugas
							{/if}
						</button>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal Submission & Detail Tugas -->
{#if isSubmitModalOpen && selectedTask}
	<div
		class="bg-lms-scrim/60 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="task-modal-title"
	>
		<div
			class="bg-lms-surface border-lms-border flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border shadow-2xl"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-lms-border p-5">
				<div class="flex items-center gap-3">
					<span class="bg-lms-interactive-subtle text-lms-interactive flex size-10 items-center justify-center rounded-xl">
						<Icon icon={SUBJECT_ICONS[selectedTask.subjectIcon] ?? BookOpen} size="md" />
					</span>
					<div class="flex flex-col">
						<span class="text-lms-muted text-[11px] font-semibold uppercase tracking-wider">
							{selectedTask.subjectName} · {TYPE_LABELS[selectedTask.type].label}
						</span>
						<h2 id="task-modal-title" class="text-base font-bold">
							{selectedTask.title}
						</h2>
					</div>
				</div>
				<button
					type="button"
					class="text-lms-muted hover:text-lms-foreground flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-lms-surface-muted"
					onclick={closeTaskModal}
					aria-label="Tutup"
				>
					<Icon icon={X} size="md" />
				</button>
			</div>

			<!-- Modal Body -->
			<div class="flex flex-col gap-4 overflow-y-auto p-6 leading-relaxed">
				{#if uploadSuccessMessage}
					<div class="bg-success-400/10 border border-success-400 text-success-500 rounded-xl p-4 flex items-center gap-3 text-sm font-bold">
						<Icon icon={CheckCircle2} size="md" />
						{uploadSuccessMessage}
					</div>
				{/if}

				<!-- Task Info Banner -->
				<div class="bg-lms-surface-muted grid grid-cols-2 gap-3 rounded-xl p-3.5 text-xs">
					<div class="flex items-center gap-2">
						<Icon icon={Calendar} size="sm" />
						<span>Tenggat: <strong>{selectedTask.dueDate}</strong></span>
					</div>
					<div class="flex items-center gap-2">
						<Icon icon={User} size="sm" />
						<span>Guru: <strong>{selectedTask.teacherName}</strong></span>
					</div>
					<div class="flex items-center gap-2">
						<Icon icon={Zap} size="sm" />
						<span>Hadiah: <strong class="text-warning-500">+{selectedTask.xp} XP</strong></span>
					</div>
					<div class="flex items-center gap-2">
						<Icon icon={Clock} size="sm" />
						<span>Status: <strong class="capitalize">{selectedTask.status}</strong></span>
					</div>
				</div>

				<!-- Instructions -->
				<div class="flex flex-col gap-2">
					<h4 class="text-sm font-bold">Instruksi & Petunjuk Pengerjaan</h4>
					<p class="text-lms-muted text-xs leading-relaxed bg-lms-surface border border-lms-border p-3.5 rounded-xl">
						{selectedTask.instructions}
					</p>
				</div>

				{#if selectedTask.status === 'graded'}
					<!-- Graded Feedback Box -->
					<div class="bg-success-400/10 border border-success-400/30 rounded-xl p-4 flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<span class="text-xs font-bold text-success-500">Nilai dari Guru</span>
							<span class="text-xl font-bold text-success-500 tabular-nums">
								{selectedTask.score} / {selectedTask.maxScore ?? 100}
							</span>
						</div>
						{#if selectedTask.feedback}
							<p class="text-xs text-lms-muted">
								<strong>Catatan Guru:</strong> {selectedTask.feedback}
							</p>
						{/if}
						{#if selectedTask.submittedFileName}
							<div class="text-[11px] text-lms-muted flex items-center gap-1.5 mt-1">
								<Icon icon={Paperclip} size="sm" /> Berkas terlampir: {selectedTask.submittedFileName}
							</div>
						{/if}
					</div>
				{:else if selectedTask.status === 'submitted'}
					<!-- Submitted Status Box -->
					<div class="bg-lms-interactive-subtle border border-lms-interactive/30 rounded-xl p-4 flex flex-col gap-2">
						<div class="flex items-center gap-2 text-lms-interactive text-xs font-bold">
							<Icon icon={CheckCircle2} size="sm" /> Tugas telah dikirim pada {selectedTask.submissionDate}
						</div>
						{#if selectedTask.submittedFileName}
							<p class="text-xs text-lms-muted flex items-center gap-1.5">
								<Icon icon={Paperclip} size="sm" /> {selectedTask.submittedFileName}
							</p>
						{/if}
						<p class="text-[11px] text-lms-muted">
							Menunggu pemeriksaan dan pemberian nilai dari guru pengampu.
						</p>
					</div>
				{:else}
					<!-- Upload Submission Form -->
					<div class="flex flex-col gap-3 border-t border-lms-border pt-4">
						<h4 class="text-sm font-bold">Unggah Jawaban Tugas</h4>
						
						<!-- File Upload Dropzone -->
						<label
							class="border-lms-border hover:border-lms-interactive bg-lms-surface hover:bg-lms-interactive-subtle/40 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 cursor-pointer transition-all text-center"
						>
							<div class="bg-lms-interactive-subtle text-lms-interactive flex size-12 items-center justify-center rounded-xl">
								<Icon icon={UploadCloud} size="md" />
							</div>
							<span class="text-xs font-bold">
								{selectedFileName ? selectedFileName : 'Klik atau seret file PDF / Dokumen jawaban ke sini'}
							</span>
							<span class="text-lms-muted text-[11px]">
								Format yang didukung: PDF, DOCX, ZIP, PNG, JPG (Maks. 25MB)
							</span>
							<input
								type="file"
								class="sr-only"
								accept=".pdf,.docx,.doc,.zip,.png,.jpg,.jpeg"
								onchange={handleFileSelect}
							/>
						</label>

						<!-- Notes Textarea -->
						<div class="flex flex-col gap-1.5">
							<label for="task-note" class="text-xs font-semibold text-lms-muted">
								Catatan tambahan untuk guru (opsional)
							</label>
							<textarea
								id="task-note"
								bind:value={submissionNote}
								placeholder="Tuliskan catatan atau keterangan terkait tugas jika diperlukan..."
								rows="3"
								class="lms-input bg-lms-surface border-lms-border focus:border-lms-interactive w-full rounded-xl p-3 text-xs leading-relaxed"
							></textarea>
						</div>
					</div>
				{/if}
			</div>

			<!-- Modal Footer -->
			<div class="flex items-center justify-end gap-2 border-t border-lms-border p-4 bg-lms-surface-muted/30">
				<button
					type="button"
					class="lms-action-ghost rounded-xl px-4 py-2 text-xs font-semibold"
					onclick={closeTaskModal}
				>
					Tutup
				</button>
				{#if selectedTask.status === 'pending'}
					<button
						type="button"
						class="lms-action-primary flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold disabled:opacity-50"
						onclick={submitTask}
					>
						<Icon icon={Send} size="sm" />
						Kirim Tugas Sekarang
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
