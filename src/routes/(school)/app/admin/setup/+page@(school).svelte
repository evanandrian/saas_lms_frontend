<script lang="ts">
	import { resolve } from '$app/paths';
	import { afterNavigate, goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import type {
		SchoolPlanningView,
		SchoolSetupState
	} from '$lib/features/school-admin/school-admin.types';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ImportWizard, {
		type ImportKindProp
	} from '$lib/features/school-admin/components/ImportWizard.svelte';
	import PlanningDrawer from '$lib/features/school-admin/components/setup/PlanningDrawer.svelte';
	import RequiredWizard from '$lib/features/school-admin/components/setup/RequiredWizard.svelte';
	import {
		OPTIONAL_SECTIONS,
		PREFIX,
		PROGRESS_DEPENDENCY_KEY,
		REQUIRED_SECTIONS,
		percent,
		sectionCount
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { runPageAction } from '$lib/utils/page-action';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import FileUp from '@lucide/svelte/icons/file-up';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Network from '@lucide/svelte/icons/network';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Save from '@lucide/svelte/icons/save';
	import Scale from '@lucide/svelte/icons/scale';
	import Target from '@lucide/svelte/icons/target';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Users from '@lucide/svelte/icons/users';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.setup.${key}`, params);
	const TOAST_MS = 5000;
	type OptionalKey = (typeof OPTIONAL_SECTIONS)[number];
	const ICONS: Record<OptionalKey, typeof Users> = {
		teachers: Users,
		students: GraduationCap,
		assign: Network,
		objectives: Target,
		assess: Scale,
		schedule: CalendarClock,
		extras: Trophy
	};
	const IMPORT_OF: Partial<Record<OptionalKey, ImportKindProp>> = {
		teachers: 'teachers',
		students: 'students'
	};
	/** Bagian yang butuh data guru dulu (referensi DEP). */
	const DEPENDS_ON_TEACHERS: readonly OptionalKey[] = ['assign', 'schedule'];

	// Derived yang bisa ditimpa: hasil action (wizard/drawer/refreshAll) menimpa tampilan lokal, dan
	// kembali ke data load setiap kali load menghasilkan data baru (invalidate/navigasi) — tanpa salinan basi.
	let setup = $derived<SchoolSetupState | null>(data.setup);
	let planning = $derived<SchoolPlanningView | null>(data.planning);
	let editStep = $state<number | null>(null);
	let drawer = $state<OptionalKey | null>(null);
	/** Bagian dari ?section= hanya dibuka sekali per kunjungan. */
	let openedFromUrl = '';
	let importKind = $state<ImportKindProp | null>(null);
	let toast = $state<string | null>(null);
	/** Wizard dibuat ulang setelah impor agar draf kelas/mapel memuat data terbaru. */
	let wizardKey = $state(0);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const requiredDone = $derived(
		Boolean(setup && setup.progress.req_done === setup.progress.req_total)
	);
	const isWizard = $derived(!requiredDone || editStep !== null);
	const sectionOf = (key: string) => setup?.sections.find((s) => s.key === key);
	const optional = $derived(OPTIONAL_SECTIONS.map((key) => ({ key, section: sectionOf(key) })));
	const laterDone = $derived(optional.filter((s) => s.section?.done).length);
	const firstTodo = $derived(optional.find((s) => !s.section?.done)?.key);
	const teachersDone = $derived(Boolean(sectionOf('teachers')?.done));

	/**
	 * Tautan "Lengkapi" dari banner halaman lain membuka drawer bagian terkait (?section=).
	 * Dicek setiap navigasi dan setelah data disegarkan (data wajib bisa baru lengkap).
	 */
	function openSectionFromUrl() {
		const key = page.url.searchParams.get('section') as OptionalKey | null;
		if (
			key &&
			key !== openedFromUrl &&
			OPTIONAL_SECTIONS.includes(key) &&
			requiredDone &&
			planning
		) {
			openedFromUrl = key;
			drawer = key;
		}
	}
	afterNavigate(openSectionFromUrl);

	function notify(message: string) {
		toast = message;
		clearTimeout(timer);
		timer = setTimeout(() => (toast = null), TOAST_MS);
	}

	async function refreshAll() {
		const [s, p] = await Promise.all([
			runPageAction<SchoolSetupState>('setup', {}),
			runPageAction<SchoolPlanningView>('planning', {})
		]);
		if (s.ok) setup = s.data;
		if (p.ok) planning = p.data;
		openSectionFromUrl();
		void invalidate(PROGRESS_DEPENDENCY_KEY);
	}

	function exit() {
		void goto(resolve(APP_PATHS.SCHOOL_ADMIN_HOME));
	}

	async function wizardDone() {
		const wasEdit = editStep !== null;
		editStep = null;
		await refreshAll();
		notify(wasEdit ? i18n.t(`${PREFIX}.common.saved`) : t('required_complete'));
	}
</script>

<svelte:head><title>{t('title')} · FLIXARE</title></svelte:head>

<div class="bg-lms-background text-lms-foreground min-h-dvh">
	<header
		class="border-lms-border bg-lms-surface sticky top-0 z-20 flex flex-wrap items-center gap-4 border-b px-4 py-3 lg:px-8"
		style:top="env(safe-area-inset-top, 0px)"
	>
		<span class="h-8"><BrandLogo expression="compact" /></span>
		<div class="flex min-w-0 flex-1 flex-col">
			<span class="text-base font-bold">{t('title')}</span>
			{#if setup}<span class="text-lms-muted truncate text-xs"
					>{setup.school.name}{setup.school.npsn ? ` · NPSN ${setup.school.npsn}` : ''}</span
				>{/if}
		</div>
		{#if setup}
			<div class="flex items-center gap-2">
				<div class="bg-lms-surface-muted h-2 w-32 overflow-hidden rounded-full">
					<div
						class="bg-lms-interactive h-full rounded-full"
						style:width="{percent(setup.progress.done, setup.progress.total)}%"
					></div>
				</div>
				<span class="text-lms-muted text-xs tabular-nums"
					>{t('progress', { done: setup.progress.done, total: setup.progress.total })}</span
				>
			</div>
		{/if}
		<button
			type="button"
			class="lms-action-secondary lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-3.5 text-[13px] font-semibold"
			onclick={exit}
			><Icon icon={Save} size="sm" />{requiredDone ? t('to_home') : t('save_later')}</button
		>
	</header>

	{#if !setup}
		<div class="p-8">
			<StatePanel
				tone="error"
				title={i18n.t(`${PREFIX}.common.load_failed`)}
				description={i18n.t(`${PREFIX}.failure.${data.failure}`)}
			/>
		</div>
	{:else if isWizard}
		{#key wizardKey}
			<RequiredWizard
				{setup}
				step={editStep}
				editOne={editStep !== null}
				onstate={(s) => (setup = s)}
				onimport={(k) => (importKind = k)}
				ondone={wizardDone}
				onnotify={notify}
			/>
		{/key}
	{:else}
		<div class="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 lg:px-8">
			<div
				class="lms-hero relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl p-6"
			>
				<span class="lms-tone-success flex size-12 items-center justify-center rounded-full"
					><Icon icon={BadgeCheck} /></span
				>
				<div class="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
					<span class="text-lms-on-hero text-xl font-bold"
						>{laterDone === OPTIONAL_SECTIONS.length
							? t('all_done_title')
							: t('checklist_title')}</span
					>
					<span class="text-lms-on-hero-muted text-sm"
						>{laterDone === OPTIONAL_SECTIONS.length ? t('all_done_sub') : t('checklist_sub')}</span
					>
				</div>
				<button
					type="button"
					class="lms-action-primary lms-focus-ring inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold"
					onclick={exit}>{t('go_home')}<Icon icon={ArrowRight} size="sm" /></button
				>
			</div>

			<section class="flex flex-col gap-3">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h2 class="text-base font-bold">{t('later_heading')}</h2>
					<span class="text-lms-muted text-xs"
						>{t('later_count', { done: laterDone, total: OPTIONAL_SECTIONS.length })}</span
					>
				</div>
				{#each optional as item, k (item.key)}
					{@const done = Boolean(item.section?.done)}
					{@const locked = DEPENDS_ON_TEACHERS.includes(item.key) && !teachersDone}
					{@const next = firstTodo === item.key}
					<div
						class="lms-card flex flex-wrap items-center gap-4 rounded-xl p-4 {locked
							? 'opacity-60'
							: ''}"
					>
						<span class="text-lms-muted w-6 font-mono text-xs"
							>{String(k + 1).padStart(2, '0')}</span
						>
						<span
							class="flex size-10 items-center justify-center rounded-xl {done
								? 'lms-tone-success'
								: 'bg-lms-interactive-subtle text-lms-interactive'}"
							><Icon icon={ICONS[item.key]} size="sm" /></span
						>
						<div class="flex min-w-0 flex-[1_1_280px] flex-col gap-0.5">
							<span class="flex flex-wrap items-center gap-2 text-sm font-bold">
								{i18n.t(`${PREFIX}.sections.${item.key}.title`)}
								{#if item.key === 'schedule'}<span
										class="lms-tone-info rounded px-1.5 py-0.5 font-mono text-[9px] tracking-[0.06em]"
										>{t('proposal')}</span
									>{/if}
								<span
									class="rounded-full px-2 py-0.5 text-[10px] font-bold {done
										? 'lms-tone-success'
										: locked
											? 'bg-lms-surface-muted text-lms-muted'
											: 'lms-tone-warning'}"
									>{done ? t('st_done') : locked ? t('st_locked') : t('st_todo')}</span
								>
							</span>
							<span class="text-lms-muted text-[13px]"
								>{i18n.t(`${PREFIX}.sections.${item.key}.why`)}</span
							>
							<span class="text-xs {locked ? 'text-lms-warning-text' : 'text-lms-muted'}"
								>{locked
									? t('needs_teachers')
									: item.section
										? sectionCount(i18n.t, item.section)
										: ''}</span
							>
						</div>
						<div class="flex gap-2">
							{#if IMPORT_OF[item.key]}
								<button
									type="button"
									class="lms-action-secondary lms-focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
									disabled={locked}
									onclick={() => (importKind = IMPORT_OF[item.key] ?? null)}
									><Icon icon={FileUp} size="sm" />{t('import')}</button
								>
							{/if}
							<button
								type="button"
								class="lms-focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold disabled:cursor-not-allowed {next
									? 'lms-action-primary'
									: 'lms-action-secondary'}"
								disabled={locked || !planning}
								onclick={() => (drawer = item.key)}
								><Icon icon={done ? Pencil : ArrowRight} size="sm" />{done
									? t('manage')
									: t('start')}</button
							>
						</div>
					</div>
				{/each}
			</section>

			<section class="flex flex-col gap-3">
				<h2 class="text-base font-bold">{t('required_heading')}</h2>
				<div class="lms-card flex flex-col rounded-xl">
					{#each REQUIRED_SECTIONS as key, k (key)}
						{@const s = sectionOf(key)}
						<div
							class="border-lms-border flex items-center gap-3 border-t px-4 py-3 first:border-t-0"
						>
							<span class="text-lms-success-text"><Icon icon={CircleCheck} size="sm" /></span>
							<span class="flex-1 text-sm font-semibold"
								>{i18n.t(`${PREFIX}.sections.${key}.title`)}</span
							>
							<span class="text-lms-muted hidden text-xs sm:block"
								>{s ? sectionCount(i18n.t, s) : ''}</span
							>
							<button
								type="button"
								class="lms-action-ghost lms-focus-ring h-8 rounded-lg px-3 text-xs font-semibold"
								onclick={() => (editStep = k)}>{t('edit')}</button
							>
						</div>
					{/each}
				</div>
			</section>
		</div>
	{/if}
</div>

{#if drawer && planning}
	<PlanningDrawer
		key={drawer}
		section={sectionOf(drawer)}
		{planning}
		onplanning={(p) => (planning = p)}
		onimport={(k) => (importKind = k)}
		onnotify={notify}
		onclose={() => {
			drawer = null;
			void refreshAll();
		}}
	/>
{/if}

{#if importKind}
	<ImportWizard
		kind={importKind}
		onclose={() => (importKind = null)}
		ondone={async (n) => {
			if (n) notify(i18n.t(`${PREFIX}.common.imported`, { count: n }));
			await refreshAll();
			if (isWizard) wizardKey += 1;
		}}
	/>
{/if}
<Toast message={toast} />
