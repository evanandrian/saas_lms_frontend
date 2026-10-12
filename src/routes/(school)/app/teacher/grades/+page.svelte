<script lang="ts">
	import { resolve } from '$app/paths';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import StatusPill from '$lib/features/school-admin/components/StatusPill.svelte';
	import { PREFIX, percent } from '$lib/features/school-admin/school-admin.model';
	import type { SchoolGradeAssignment } from '$lib/features/school-admin/school-admin.types';
	import { useI18n } from '$lib/i18n';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Lock from '@lucide/svelte/icons/lock';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`grades.${key}`, params);

	const view = $derived(data.view);
	const assignments = $derived(view?.assignments ?? []);
	const lockedCount = $derived(assignments.filter((a) => a.locked).length);

	type Progress = 'locked' | 'ready' | 'partial' | 'empty';
	const PROGRESS_TONE = {
		locked: 'success',
		ready: 'info',
		partial: 'warning',
		empty: 'neutral'
	} as const;
	const BAR_TONE: Record<Progress, string> = {
		locked: 'bg-lms-progress',
		ready: 'bg-lms-interactive',
		partial: 'bg-lms-warning-text',
		empty: 'bg-lms-interactive'
	};

	function progressOf(a: SchoolGradeAssignment): Progress {
		if (a.locked) return 'locked';
		if (a.students > 0 && a.filled >= a.students) return 'ready';
		return a.filled > 0 ? 'partial' : 'empty';
	}
</script>

<svelte:head><title>{t('list.title')} · FLIXARE</title></svelte:head>

{#if !view}
	<div class="flex flex-col gap-4 pb-24">
		<StatePanel
			headingLevel={1}
			tone="error"
			title={i18n.t(`${PREFIX}.common.load_failed`)}
			description={i18n.t(`${PREFIX}.failure.${data.failure}`)}
		/>
	</div>
{:else}
	<div
		class="text-lms-foreground flex min-w-0 flex-col gap-4 pb-24"
		data-screen-label="Nilai akhir"
	>
		<HeroBanner
			eyebrow={view.term
				? t('list.eyebrow_term', { term: view.term, year: view.year })
				: t('list.eyebrow')}
			title={t('list.title')}
			description={t('list.desc')}
			actionsPlacement="end"
			help="help.teacher_grades"
		>
			{#snippet actions()}
				{#if assignments.length}
					<span
						class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero inline-flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-sm font-semibold"
					>
						<Icon icon={Lock} size="sm" />
						{t('list.locked_summary', { locked: lockedCount, total: assignments.length })}
					</span>
				{/if}
			{/snippet}
		</HeroBanner>

		{#if !view.term}
			<StatePanel title={t('list.no_semester_title')} description={t('list.no_semester_desc')} />
		{:else if !assignments.length}
			<StatePanel title={t('list.empty_title')} description={t('list.empty_desc')} />
		{:else}
			<ul class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3">
				{#each assignments as a (a.id)}
					{@const progress = progressOf(a)}
					<li>
						<a
							href={resolve('/(school)/app/teacher/grades/[id]', { id: a.id })}
							class="lms-card lms-focus-ring hover:border-lms-interactive flex h-full flex-col gap-3 rounded-xl! p-4 transition-colors"
						>
							<div class="flex items-start justify-between gap-2">
								<span class="flex min-w-0 flex-col gap-0.5">
									<span class="truncate text-[0.9375rem] font-bold">{a.subject}</span>
									<span class="text-lms-muted text-xs"
										>{i18n.t(`${PREFIX}.common.class_of`, { class: a.class })} · {t('kkm', {
											value: a.kkm
										})}</span
									>
								</span>
								<StatusPill tone={PROGRESS_TONE[progress]} label={t(`list.progress_${progress}`)} />
							</div>
							<div class="flex flex-col gap-1.5">
								<div
									class="bg-lms-surface-muted h-1.5 overflow-hidden rounded-full"
									role="progressbar"
									aria-valuemin={0}
									aria-valuemax={a.students}
									aria-valuenow={a.filled}
									aria-label={t('list.filled_label', { subject: a.subject, class: a.class })}
								>
									<div
										class="h-full rounded-full {BAR_TONE[progress]}"
										style:width="{percent(a.filled, a.students)}%"
									></div>
								</div>
								<span class="text-lms-muted flex items-center justify-between text-xs">
									<span class="tabular-nums"
										>{t('filled_of', { filled: a.filled, total: a.students })}</span
									>
									<span class="text-lms-interactive inline-flex items-center gap-1 font-semibold"
										>{a.locked ? t('list.view') : t('list.open')}<Icon
											icon={ChevronRight}
											size="sm"
										/></span
									>
								</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
