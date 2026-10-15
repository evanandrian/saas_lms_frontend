<!-- Penugasan guru mapel per kelas (semester aktif); dipakai drawer setup & halaman Penugasan. -->
<script lang="ts">
	import type { SchoolPlanningView } from '$lib/api/generated/lms';
	import { useI18n } from '$lib/i18n';
	import type { PlanningDrawerState } from '../../planning-drawer.state.svelte';
	import { PREFIX } from '../../school-admin.model';

	interface Props {
		planner: PlanningDrawerState;
		planning: SchoolPlanningView;
	}
	let { planner, planning }: Props = $props();

	const i18n = useI18n();
	const t = (k: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.planning.${k}`, params);
</script>

<div class="flex flex-wrap items-center gap-3">
	<select
		aria-label={t('pick_class')}
		class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 rounded-lg px-2 text-sm"
		bind:value={planner.classId}
		>{#each planning.classes as c (c.id)}<option value={c.id}
				>{i18n.t(`${PREFIX}.common.class_of`, { class: c.name })}</option
			>{/each}</select
	>
	<span class="text-lms-muted text-xs"
		>{planning.semester_id
			? t('teaching_note', {
					term:
						planning.term === 1
							? i18n.t(`${PREFIX}.years.term_odd`)
							: i18n.t(`${PREFIX}.years.term_even`),
					filled: planner.classAssignments.length,
					total: planning.subjects.length
				})
			: t('no_semester')}</span
	>
</div>
<div class="border-lms-border flex flex-col rounded-xl border">
	{#each planning.subjects as s (s.id)}
		<div class="border-lms-border flex items-center gap-3 border-t px-4 py-2 first:border-t-0">
			<span class="flex flex-1 items-center gap-2 text-sm"
				><span class="text-lms-muted w-14 font-mono text-xs">{s.code}</span>{s.name}</span
			>
			<select
				aria-label={t('teacher_of', { subject: s.name })}
				class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 w-56 rounded-lg px-2 text-sm"
				value={planner.assignmentOf(s.id)}
				disabled={planner.busy || !planning.semester_id}
				onchange={(e) => planner.setAssignment(s.id, e.currentTarget.value)}
			>
				<option value="">{i18n.t(`${PREFIX}.common.not_set_option`)}</option>
				{#each planner.teacherOptions as o (o.value)}<option value={o.value}>{o.label}</option
					>{/each}
			</select>
		</div>
	{/each}
</div>
