<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Calculator from '@lucide/svelte/icons/calculator';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Clock from '@lucide/svelte/icons/clock';
	import Dna from '@lucide/svelte/icons/dna';
	import Download from '@lucide/svelte/icons/download';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Eye from '@lucide/svelte/icons/eye';
	import FileText from '@lucide/svelte/icons/file-text';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Languages from '@lucide/svelte/icons/languages';
	import Presentation from '@lucide/svelte/icons/presentation';
	import Search from '@lucide/svelte/icons/search';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Video from '@lucide/svelte/icons/video';
	import X from '@lucide/svelte/icons/x';
	import type { PageProps } from './$types';
	import type { MaterialType, StudentMaterialItem } from './materials.types';

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

	const TYPE_ICONS = {
		video: Video,
		pdf: FileText,
		slide: Presentation,
		article: BookOpen
	} as const;

	const TYPE_LABELS: Record<MaterialType, string> = {
		video: 'Video Pembelajaran',
		pdf: 'Dokumen / Modul PDF',
		slide: 'Slide Presentasi',
		article: 'Rangkuman Artikel'
	};

	let selectedSubject = $state<string>('all');
	let selectedType = $state<string>('all');
	let searchQuery = $state<string>('');
	let previewMaterial = $state<StudentMaterialItem | null>(null);

	const allMaterials = $derived(data.materialsData.materials);
	const subjects = $derived(data.materialsData.subjects);

	const filteredMaterials = $derived(
		allMaterials.filter((m) => {
			const matchSubject =
				selectedSubject === 'all' ||
				m.subjectId === selectedSubject ||
				m.subjectName.toLowerCase() === selectedSubject.toLowerCase();
			const matchType = selectedType === 'all' || m.type === selectedType;
			const query = searchQuery.toLowerCase().trim();
			const matchQuery =
				!query ||
				m.title.toLowerCase().includes(query) ||
				m.chapter.toLowerCase().includes(query) ||
				m.description.toLowerCase().includes(query) ||
				m.subjectName.toLowerCase().includes(query) ||
				(m.topicCode && m.topicCode.toLowerCase().includes(query));
			return matchSubject && matchType && matchQuery;
		})
	);

	const completedCount = $derived(allMaterials.filter((m) => m.status === 'completed').length);
	const inProgressCount = $derived(allMaterials.filter((m) => m.status === 'in_progress').length);

	function openPreview(item: StudentMaterialItem) {
		previewMaterial = item;
	}

	function closePreview() {
		previewMaterial = null;
	}
</script>

<svelte:head>
	<title>Materi Belajar · {data.materialsData.className}</title>
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
				MATERI & MODUL
			</span>
			<h1 class="text-[1.75rem] md:text-3xl font-bold">Koleksi Materi Pembelajaran</h1>
			<p class="text-lms-on-hero-muted text-sm md:text-base max-w-2xl">
				Akses bahan ajar, modul digital, video interaktif, dan lembar kerja kelas {data.materialsData.className} yang disiapkan oleh para guru.
			</p>
		</div>

		<!-- Quick Stats -->
		<div class="grid grid-cols-3 gap-3 pt-2 max-w-lg">
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Total Materi</span>
				<span class="text-2xl font-bold">{allMaterials.length}</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Selesai Dibaca</span>
				<span class="text-2xl font-bold text-success-400">{completedCount}</span>
			</div>
			<div class="bg-lms-hero-raised flex flex-col gap-1 rounded-xl p-3.5">
				<span class="text-lms-on-hero-muted text-xs">Sedang Dipelajari</span>
				<span class="text-2xl font-bold text-warning-400">{inProgressCount}</span>
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
				Semua Mapel ({allMaterials.length})
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
					{#if sub.materialCount > 0}
						<span class="opacity-70 text-[11px]">({sub.materialCount})</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Search Bar & Type Filter -->
		<div class="grid gap-3 md:grid-cols-[1fr_auto]">
			<div class="relative flex items-center">
				<span class="text-lms-muted pointer-events-none absolute left-3.5">
					<Icon icon={Search} size="sm" />
				</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari materi, bab, topik, atau kata kunci..."
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
						selectedType === 'all'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedType = 'all')}
				>
					Semua Format
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
						selectedType === 'video'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedType = 'video')}
				>
					Video
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
						selectedType === 'pdf'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedType = 'pdf')}
				>
					PDF
				</button>
				<button
					type="button"
					class={[
						'h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
						selectedType === 'slide'
							? 'bg-lms-interactive text-lms-on-interactive'
							: 'bg-lms-surface-muted text-lms-muted hover:text-lms-foreground'
					]}
					onclick={() => (selectedType = 'slide')}
				>
					Slide
				</button>
			</div>
		</div>
	</div>

	<!-- Materials Grid -->
	{#if filteredMaterials.length === 0}
		<div class="lms-card flex flex-col items-center justify-center gap-3 rounded-[22px]! p-12 text-center shadow-none!">
			<div class="bg-lms-interactive-subtle text-lms-interactive flex size-14 items-center justify-center rounded-full">
				<Icon icon={BookOpen} size="lg" />
			</div>
			<div class="flex flex-col gap-1 max-w-sm">
				<h3 class="text-base font-bold">Tidak ada materi yang ditemukan</h3>
				<p class="text-lms-muted text-xs">
					Coba sesuaikan kata kunci pencarian atau ubah filter mata pelajaran yang Anda pilih.
				</p>
			</div>
			{#if searchQuery || selectedSubject !== 'all' || selectedType !== 'all'}
				<button
					type="button"
					class="lms-action-ghost text-xs font-semibold mt-2"
					onclick={() => {
						searchQuery = '';
						selectedSubject = 'all';
						selectedType = 'all';
					}}
				>
					Reset Semua Filter
				</button>
			{/if}
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each filteredMaterials as item (item.id)}
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
							<span class="text-lms-muted flex items-center gap-1 text-[11px] font-medium">
								<Icon icon={TYPE_ICONS[item.type]} size="sm" />
								{item.duration}
							</span>
						</div>

						<!-- Title & Chapter -->
						<div class="flex flex-col gap-1">
							<h3 class="text-base font-bold line-clamp-2 hover:text-lms-link transition-colors">
								{item.title}
							</h3>
							<p class="text-lms-muted text-xs">
								{item.chapter} {item.topicCode ? `· ${item.topicCode}` : ''}
							</p>
						</div>

						<!-- Description -->
						<p class="text-lms-muted text-xs leading-relaxed line-clamp-3">
							{item.description}
						</p>
					</div>

					<!-- Card Footer: Progress & Actions -->
					<div class="mt-5 flex flex-col gap-3 border-t border-lms-border pt-4">
						<div class="flex items-center justify-between text-xs">
							<span class="text-lms-muted text-[11px]">Oleh {item.teacherName}</span>
							<span class="font-bold tabular-nums">
								{#if item.status === 'completed'}
									<span class="text-success-400 flex items-center gap-1">
										<Icon icon={CheckCircle2} size="sm" /> Selesai
									</span>
								{:else if item.status === 'in_progress'}
									<span class="text-warning-400">{item.progress}%</span>
								{:else}
									<span class="text-lms-muted">Belum dibuka</span>
								{/if}
							</span>
						</div>

						<!-- Progress Bar -->
						<div class="bg-lms-surface-muted h-1.5 w-full overflow-hidden rounded-full">
							<div
								class={[
									'h-full rounded-full transition-all duration-300',
									item.status === 'completed'
										? 'bg-success-400'
										: item.status === 'in_progress'
											? 'bg-warning-400'
											: 'bg-transparent'
								]}
								style:width="{item.progress}%"
							></div>
						</div>

						<!-- Action Button -->
						<button
							type="button"
							class="lms-action-primary lms-focus-ring flex h-9.5 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all hover:opacity-95"
							onclick={() => openPreview(item)}
						>
							<Icon icon={Eye} size="sm" />
							Buka Materi
						</button>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal Viewer Materi -->
{#if previewMaterial}
	<div
		class="bg-lms-scrim/60 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="material-title"
	>
		<div
			class="bg-lms-surface border-lms-border flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border shadow-2xl"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-lms-border p-5">
				<div class="flex items-center gap-3">
					<span class="bg-lms-interactive-subtle text-lms-interactive flex size-10 items-center justify-center rounded-xl">
						<Icon icon={TYPE_ICONS[previewMaterial.type]} size="md" />
					</span>
					<div class="flex flex-col">
						<span class="text-lms-muted text-[11px] font-semibold uppercase tracking-wider">
							{previewMaterial.subjectName} · {TYPE_LABELS[previewMaterial.type]}
						</span>
						<h2 id="material-title" class="text-base font-bold">
							{previewMaterial.title}
						</h2>
					</div>
				</div>
				<button
					type="button"
					class="text-lms-muted hover:text-lms-foreground flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-lms-surface-muted"
					onclick={closePreview}
					aria-label="Tutup"
				>
					<Icon icon={X} size="md" />
				</button>
			</div>

			<!-- Modal Body -->
			<div class="flex flex-col gap-4 overflow-y-auto p-6 leading-relaxed">
				<div class="bg-lms-surface-muted flex items-center justify-between rounded-xl p-3 text-xs">
					<span class="flex items-center gap-2 text-lms-muted">
						<Icon icon={Clock} size="sm" /> Durasi estimasi: <strong>{previewMaterial.duration}</strong>
					</span>
					<span class="text-lms-muted">
						Guru Pengampu: <strong>{previewMaterial.teacherName}</strong>
					</span>
				</div>

				<div class="flex flex-col gap-2">
					<h4 class="text-sm font-bold">Ringkasan & Tujuan Pembelajaran</h4>
					<p class="text-lms-muted text-xs leading-relaxed">
						{previewMaterial.description}
					</p>
				</div>

				<!-- Visual Material Container Placeholder / Player -->
				<div class="bg-lms-interactive-subtle border-lms-interactive/20 flex min-h-56 flex-col items-center justify-center rounded-2xl border p-8 text-center">
					<div class="bg-lms-surface flex size-14 items-center justify-center rounded-2xl shadow-sm text-lms-interactive mb-3">
						<Icon icon={TYPE_ICONS[previewMaterial.type]} size="lg" />
					</div>
					<h4 class="text-sm font-bold">{previewMaterial.title}</h4>
					<p class="text-lms-muted text-xs mt-1 max-w-md">
						Materi ini siap dibuka secara interaktif di penampil dokumen sekolah.
					</p>
					<div class="flex items-center gap-3 mt-4">
						<button
							type="button"
							class="lms-action-primary flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold"
							onclick={closePreview}
						>
							<Icon icon={ExternalLink} size="sm" />
							Pelajari Sekarang
						</button>
						<button
							type="button"
							class="lms-action-ghost flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
							onclick={closePreview}
						>
							<Icon icon={Download} size="sm" />
							Unduh Berkas
						</button>
					</div>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="flex items-center justify-end gap-2 border-t border-lms-border p-4 bg-lms-surface-muted/30">
				<button
					type="button"
					class="lms-action-ghost rounded-xl px-4 py-2 text-xs font-semibold"
					onclick={closePreview}
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}
