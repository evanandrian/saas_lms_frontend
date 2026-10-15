<script lang="ts">
	import type { SchoolPlanningView, SchoolSection } from '$lib/api/generated/lms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import { resolve } from '$app/paths';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CloudCheck from '@lucide/svelte/icons/cloud-check';
	import FileUp from '@lucide/svelte/icons/file-up';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import X from '@lucide/svelte/icons/x';
	import { onMount } from 'svelte';
	import { PlanningDrawerState, type DrawerKey } from '../../planning-drawer.state.svelte';
	import { PREFIX, WEEKDAYS, sectionCount } from '../../school-admin.model';
	import TabBar from '../TabBar.svelte';
	import AssessmentsPanel from '../planning/AssessmentsPanel.svelte';
	import AssignmentsPanel from '../planning/AssignmentsPanel.svelte';
	import ExtrasPanel from '../planning/ExtrasPanel.svelte';
	import ObjectivesPanel from '../planning/ObjectivesPanel.svelte';

	interface Props {
		key: DrawerKey;
		section: SchoolSection | undefined;
		planning: SchoolPlanningView;
		onplanning: (view: SchoolPlanningView) => void;
		onimport: (kind: 'teachers' | 'students') => void;
		onclose: () => void;
		onnotify: (message: string) => void;
	}

	let { key, section, planning, onplanning, onimport, onclose, onnotify }: Props = $props();

	const i18n = useI18n();
	const t = (k: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.planning.${k}`, params);

	let dialog: HTMLDialogElement | undefined = $state();
	const planner = new PlanningDrawerState({
		planning: () => planning,
		key: () => key,
		t: i18n.t,
		onplanning: (view) => onplanning(view),
		onnotify: (message) => onnotify(message)
	});

	$effect(() => {
		dialog?.showModal();
	});

	onMount(() => {
		void planner.loadPeople();
	});

	const dayLabel = (d: number) => i18n.t(`${PREFIX}.weekday.${d}`);
</script>

<!-- Drawer bagian opsional 03b (referensi v4: tabel DDL, judul, ringkasan, tab, isi, "Tersimpan otomatis"). -->
<dialog
	bind:this={dialog}
	aria-label={i18n.t(`${PREFIX}.sections.${key}.title`)}
	class="bg-lms-surface text-lms-foreground border-lms-border m-0 ml-auto h-dvh max-h-dvh w-[min(720px,100vw)] max-w-none border-l p-0 shadow-2xl backdrop:bg-(--color-lms-hero)/45"
	{onclose}
	onclick={(e) => e.target === dialog && onclose()}
>
	<div class="flex h-full flex-col">
		<div class="border-lms-border flex items-start gap-3 border-b px-5 py-[18px]">
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<span class="text-lms-muted font-mono text-[11px] tracking-[0.1em]"
					>{i18n.t(`${PREFIX}.setup.step_table_${key}`)}</span
				>
				<span class="text-lg font-bold">{i18n.t(`${PREFIX}.sections.${key}.title`)}</span>
				{#if section}<span class="text-lms-muted text-xs">{sectionCount(i18n.t, section)}</span
					>{/if}
			</div>
			<button
				type="button"
				aria-label={i18n.t(`${PREFIX}.common.close`)}
				class="bg-lms-surface-muted text-lms-muted lms-focus-ring flex size-9 items-center justify-center rounded-lg"
				onclick={onclose}><Icon icon={X} size="sm" /></button
			>
		</div>
		{#if key === 'assign' || key === 'schedule'}
			<div class="border-lms-border border-b px-5 py-2">
				<TabBar
					label={t('tabs')}
					value={String(planner.tab)}
					onchange={(k) => (planner.tab = Number(k))}
					items={key === 'assign'
						? [
								{ key: '0', label: t('tab_homeroom') },
								{ key: '1', label: t('tab_teaching') }
							]
						: [
								{ key: '0', label: t('tab_periods') },
								{ key: '1', label: t('tab_grid') }
							]}
				/>
			</div>
		{/if}

		<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5">
			{#if key === 'teachers' || key === 'students'}
				<div class="grid grid-cols-3 gap-3">
					{#each planner.peopleStats as s (s.label)}<div
							class="lms-card flex flex-col rounded-xl px-4 py-3"
						>
							<span class="text-xl font-bold tabular-nums">{s.value}</span><span
								class="text-lms-muted text-xs">{s.label}</span
							>
						</div>{/each}
				</div>
				<div class="flex flex-col gap-2">
					<button
						type="button"
						class="border-lms-border hover:bg-lms-surface-muted lms-focus-ring flex items-center gap-3 rounded-xl border p-3 text-left"
						onclick={() => onimport(key === 'teachers' ? 'teachers' : 'students')}
					>
						<span
							class="bg-lms-interactive-subtle text-lms-interactive flex size-9 items-center justify-center rounded-lg"
							><Icon icon={FileUp} size="sm" /></span
						>
						<span class="flex flex-1 flex-col"
							><span class="text-sm font-semibold">{t(`people_import_${key}`)}</span><span
								class="text-lms-muted text-xs">{t(`people_import_${key}_sub`)}</span
							></span
						>
						<Icon icon={ChevronRight} size="sm" />
					</button>
					<a
						href={key === 'teachers'
							? resolve(APP_PATHS.SCHOOL_ADMIN_TEACHERS)
							: resolve(APP_PATHS.SCHOOL_ADMIN_STUDENTS)}
						class="border-lms-border hover:bg-lms-surface-muted lms-focus-ring flex items-center gap-3 rounded-xl border p-3"
					>
						<span
							class="bg-lms-interactive-subtle text-lms-interactive flex size-9 items-center justify-center rounded-lg"
							><Icon icon={UserPlus} size="sm" /></span
						>
						<span class="flex flex-1 flex-col"
							><span class="text-sm font-semibold">{t(`people_manual_${key}`)}</span><span
								class="text-lms-muted text-xs">{t('people_manual_sub')}</span
							></span
						>
						<Icon icon={ChevronRight} size="sm" />
					</a>
				</div>
				{#if planner.people.length}
					<div class="border-lms-border flex flex-col rounded-xl border">
						<span class="text-lms-muted px-3.5 py-2.5 font-mono text-[10px] tracking-[0.1em]"
							>{t('recent')}</span
						>
						{#each planner.people as p, i (i)}<div
								class="border-lms-border flex justify-between gap-2 border-t px-3.5 py-2 text-[13px]"
							>
								<span class="font-semibold">{p.name}</span><span class="text-lms-muted"
									>{p.meta}</span
								>
							</div>{/each}
					</div>
				{/if}
			{:else if key === 'assign' && planner.tab === 0}
				<span class="text-lms-muted text-[13px]">{t('homeroom_note')}</span>
				<div class="border-lms-border flex flex-col rounded-xl border">
					{#each planning.classes as c (c.id)}
						<div
							class="border-lms-border flex items-center gap-3 border-t px-4 py-2 first:border-t-0"
						>
							<span class="w-24 text-sm font-bold">{c.name}</span>
							<select
								aria-label={t('homeroom_of', { class: c.name })}
								class="lms-input lms-focus-ring h-9 flex-1 rounded-lg border-[1.5px] px-2 text-sm {c.homeroom_id
									? 'border-lms-input-border'
									: 'border-lms-warning-text'}"
								value={planner.homeroomOf(c.id)}
								disabled={planner.busy}
								onchange={(e) => planner.setHomeroom(c.id, e.currentTarget.value)}
							>
								<option value="">{i18n.t(`${PREFIX}.common.not_set_option`)}</option>
								{#each planner.teacherOptions as o (o.value)}<option value={o.value}
										>{o.label}</option
									>{/each}
							</select>
						</div>
					{:else}<p class="text-lms-muted p-4 text-sm">{t('no_classes')}</p>{/each}
				</div>
			{:else if key === 'assign'}
				<AssignmentsPanel {planner} {planning} />
			{:else if key === 'objectives'}
				<ObjectivesPanel {planner} {planning} />
			{:else if key === 'assess'}
				<AssessmentsPanel {planner} />
			{:else if key === 'schedule' && planner.tab === 0}
				<div class="flex flex-wrap items-center gap-3">
					<span class="text-lms-muted flex-[1_1_260px] text-[13px]">{t('periods_note')}</span>
					<button
						type="button"
						class="lms-action-secondary lms-focus-ring h-9 rounded-lg px-3 text-xs font-semibold"
						disabled={planner.busy}
						onclick={() => planner.useDefaultPeriods()}>{t('periods_default')}</button
					>
				</div>
				<div class="border-lms-border flex flex-col rounded-xl border">
					{#each planner.periods as p, i (i)}
						<div
							class="border-lms-border flex items-center gap-2 border-t px-4 py-2 first:border-t-0"
						>
							<span class="w-16 text-sm font-semibold">{t('period', { no: i + 1 })}</span>
							<input
								aria-label={t('period_start', { no: i + 1 })}
								class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 w-24 rounded-lg px-2 text-center font-mono text-sm"
								placeholder="07:00"
								bind:value={p.start}
							/>
							<span>–</span>
							<input
								aria-label={t('period_end', { no: i + 1 })}
								class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 w-24 rounded-lg px-2 text-center font-mono text-sm"
								placeholder="07:45"
								bind:value={p.end}
							/>
							<span class="flex-1"></span>
							<button
								type="button"
								aria-label={t('delete')}
								class="lms-action-ghost lms-focus-ring flex size-7 items-center justify-center rounded-md"
								onclick={() => planner.removePeriod(i)}><Icon icon={Trash2} size="sm" /></button
							>
						</div>
					{:else}<p class="text-lms-muted p-4 text-sm">{t('periods_empty')}</p>{/each}
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						class="lms-action-secondary lms-focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
						onclick={() => planner.addPeriod()}
						><Icon icon={Plus} size="sm" />{t('period_add')}</button
					>
					<button
						type="button"
						class="lms-action-primary lms-focus-ring h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-50"
						disabled={planner.busy}
						onclick={() => planner.savePeriods()}>{t('save_periods')}</button
					>
				</div>
			{:else if key === 'schedule'}
				<div class="flex flex-wrap items-center gap-3">
					<select
						aria-label={t('pick_class')}
						class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 rounded-lg px-2 text-sm"
						bind:value={planner.classId}
						>{#each planning.classes as c (c.id)}<option value={c.id}
								>{i18n.t(`${PREFIX}.common.class_of`, { class: c.name })}</option
							>{/each}</select
					>
					<span
						class="text-xs {!planning.periods.length || !planner.classAssignments.length
							? 'text-lms-warning-text'
							: 'text-lms-muted'}"
						>{!planning.periods.length
							? t('grid_no_periods')
							: !planner.classAssignments.length
								? t('grid_no_assignments')
								: t('grid_note')}</span
					>
				</div>
				<div class="border-lms-border overflow-x-auto rounded-xl border">
					<table class="w-full min-w-[640px] text-left text-xs">
						<thead
							><tr class="text-lms-muted font-mono text-[10px] tracking-[0.1em]"
								><th class="px-2 py-2">{t('grid_period')}</th>{#each WEEKDAYS as d (d)}<th
										class="px-2 py-2">{dayLabel(d)}</th
									>{/each}</tr
							></thead
						>
						<tbody>
							{#each planning.periods as p (p.no)}
								<tr class="border-lms-border border-t">
									<td class="px-2 py-1.5"
										><span class="block font-bold">{p.no}</span><span
											class="text-lms-muted font-mono text-[10px]">{p.start}–{p.end}</span
										></td
									>
									{#each WEEKDAYS as d (d)}
										{@const value = planner.cellOf(d, p.no)}
										<td class="px-1 py-1">
											<select
												aria-label={t('grid_cell', { day: dayLabel(d), no: p.no })}
												class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-8 w-full min-w-[96px] rounded-md px-1 text-xs {value
													? 'bg-lms-interactive-subtle'
													: ''}"
												{value}
												disabled={planner.busy || !planner.classAssignments.length}
												onchange={(e) => planner.setScheduleCell(d, p.no, e.currentTarget.value)}
											>
												<option value="">—</option>
												{#each planner.classAssignments as a (a.subject_id)}<option
														value={a.subject_id}
														>{planner.subjectName(a.subject_id)} · {a.teacher_name}</option
													>{/each}
											</select>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else if key === 'extras'}
				<ExtrasPanel {planner} {planning} />
			{/if}
		</div>
		<div class="border-lms-border flex items-center gap-3 border-t px-5 py-3">
			<span class="text-lms-muted flex flex-1 items-center gap-1.5 text-xs"
				><Icon icon={CloudCheck} size="sm" />{t('autosaved')}</span
			>
			<button
				type="button"
				class="lms-action-primary lms-focus-ring h-10 rounded-[10px] px-5 text-sm font-bold"
				onclick={onclose}>{t('done')}</button
			>
		</div>
	</div>
</dialog>
