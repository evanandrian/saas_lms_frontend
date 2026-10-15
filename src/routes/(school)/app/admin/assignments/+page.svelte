<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import AssignmentsPanel from '$lib/features/school-admin/components/planning/AssignmentsPanel.svelte';
	import Segmented from '$lib/features/school-admin/components/Segmented.svelte';
	import { PlanningDrawerState } from '$lib/features/school-admin/planning-drawer.state.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		PREFIX,
		PROGRESS_DEPENDENCY_KEY,
		TEACHING_LOAD_MAX_JP,
		TEACHING_LOAD_MIN_JP,
		sectionGap,
		teacherLoads
	} from '$lib/features/school-admin/school-admin.model';
	import type { SchoolPlanningView } from '$lib/features/school-admin/school-admin.types';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

	// svelte-ignore state_referenced_locally
	let planning = $state<SchoolPlanningView | null>(data.planning);
	const editor = createRecordEditor<SchoolPlanningView>(i18n.t, (v) => (planning = v));
	let mode = $state<'class' | 'teacher'>('class');

	// Dibuat sekali; data perencanaan mengalir lewat getter (pemilih kelas tidak ter-reset).
	const planner = new PlanningDrawerState({
		planning: () => planning!,
		key: () => 'assign',
		t: i18n.t,
		onplanning: (v) => {
			planning = v;
			void invalidate(PROGRESS_DEPENDENCY_KEY);
		},
		onnotify: (m) => editor.notify(m)
	});

	const loads = $derived(planning ? teacherLoads(planning) : []);
	const filled = $derived(planning?.assignments.length ?? 0);
	const slots = $derived((planning?.classes.length ?? 0) * (planning?.subjects.length ?? 0));
	const stats = $derived([
		{ label: t('assignments.stat_filled'), value: `${filled}/${slots}` },
		{ label: t('assignments.stat_teachers'), value: loads.length },
		{
			label: t('assignments.stat_out_of_range'),
			value: loads.filter((l) => l.flag !== 'ok').length
		}
	]);
	const gap = $derived(
		sectionGap(i18n.t, data.schoolProgress, 'assign', resolve(APP_PATHS.SCHOOL_ADMIN_SETUP))
	);
	const FLAG_TONE = { low: 'text-lms-danger-text', high: 'text-lms-danger-text', ok: '' } as const;
</script>

<svelte:head><title>{t('assignments.title')} · FLIXARE</title></svelte:head>

{#if !planning}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('assignments.eyebrow')}
		title={t('assignments.title')}
		description={t('assignments.desc')}
		{gap}
		{stats}
		help="help.school_admin_assignments"
	>
		<div class="flex flex-col gap-4">
			{#if !planning.semester_id}
				<p class="border-lms-border text-lms-muted rounded-xl border p-4 text-sm">
					{t('assignments.no_semester')}
				</p>
			{:else}
				<Segmented
					label={t('assignments.view')}
					value={mode}
					onchange={(v) => (mode = v === 'teacher' ? 'teacher' : 'class')}
					options={[
						{ value: 'class', label: t('assignments.per_class') },
						{ value: 'teacher', label: t('assignments.per_teacher') }
					]}
				/>
				{#if mode === 'class'}
					<AssignmentsPanel {planner} {planning} />
				{:else}
					<p class="text-lms-muted text-xs">
						{t('assignments.load_note', { min: TEACHING_LOAD_MIN_JP, max: TEACHING_LOAD_MAX_JP })}
					</p>
					<div class="border-lms-border overflow-x-auto rounded-xl border">
						<table class="w-full min-w-[560px] text-left text-sm">
							<thead>
								<tr class="text-lms-muted font-mono text-[10px] tracking-[0.1em]">
									<th class="px-3 py-2">{t('assignments.head_teacher')}</th>
									<th class="px-3 py-2">{t('assignments.head_subjects')}</th>
									<th class="px-3 py-2">{t('assignments.head_classes')}</th>
									<th class="px-3 py-2 text-right">{t('assignments.head_jp')}</th>
								</tr>
							</thead>
							<tbody>
								{#each loads as l (l.teacher_id)}
									<tr class="border-lms-border border-t">
										<td class="px-3 py-2 font-semibold">{l.name}</td>
										<td class="px-3 py-2 font-mono text-xs">{l.subjects.join(', ') || '—'}</td>
										<td class="px-3 py-2 text-xs">{l.classes.join(', ') || '—'}</td>
										<td class="px-3 py-2 text-right font-bold tabular-nums {FLAG_TONE[l.flag]}"
											>{t('assignments.jp_value', { jp: l.jp })}</td
										>
									</tr>
								{:else}
									<tr
										><td colspan="4" class="text-lms-muted p-4 text-sm"
											>{t('assignments.empty_teachers')}</td
										></tr
									>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{/if}
		</div>
	</ModuleShell>
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
