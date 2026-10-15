<!-- Tujuan pembelajaran per mapel × tingkat; dipakai drawer setup & halaman Mapel. -->
<script lang="ts">
	import type { SchoolPlanningView } from '$lib/api/generated/lms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { PlanningDrawerState } from '../../planning-drawer.state.svelte';
	import { PREFIX } from '../../school-admin.model';

	interface Props {
		planner: PlanningDrawerState;
		planning: SchoolPlanningView;
		/** Sembunyikan pemilih mapel (halaman Mapel sudah memilih mapel). */
		lockSubject?: boolean;
	}
	let { planner, planning, lockSubject = false }: Props = $props();

	const i18n = useI18n();
	const t = (k: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.planning.${k}`, params);
</script>

<div class="flex flex-wrap gap-2">
	{#if !lockSubject}
		<select
			aria-label={t('pick_subject')}
			class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 flex-1 rounded-lg px-2 text-sm"
			bind:value={planner.objSubject}
			>{#each planning.subjects as s (s.id)}<option value={s.id}>{s.code} · {s.name}</option
				>{/each}</select
		>
	{/if}
	<select
		aria-label={t('pick_grade')}
		class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 rounded-lg px-2 text-sm"
		bind:value={planner.objGrade}
		>{#each planning.grades as g (g.id)}<option value={g.id}
				>{t('grade', { grade: g.grade })}</option
			>{/each}</select
	>
</div>
<div class="border-lms-border flex flex-col rounded-xl border">
	{#each planner.objectives as o (o.id)}
		<div class="border-lms-border flex items-start gap-3 border-t px-4 py-2.5 first:border-t-0">
			<span class="text-lms-interactive w-16 font-mono text-xs font-bold">{o.code}</span>
			<span class="flex-1 text-[13px]">{o.description}</span>
			<button
				type="button"
				aria-label={t('delete')}
				class="lms-action-ghost lms-focus-ring flex size-7 items-center justify-center rounded-md"
				disabled={planner.busy}
				onclick={() => planner.removeObjective(o.id)}><Icon icon={Trash2} size="sm" /></button
			>
		</div>
	{:else}<p class="text-lms-muted p-4 text-sm">{t('objectives_empty')}</p>{/each}
</div>
<div class="flex flex-col gap-2">
	<span class="text-[13px] font-semibold"
		>{t('objective_add')} ·
		<span class="text-lms-interactive font-mono">{planner.nextCode}</span></span
	>
	<textarea
		rows="2"
		class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border rounded-[10px] px-3 py-2 text-sm"
		placeholder={t('objective_ph')}
		bind:value={planner.objDesc}></textarea>
	<button
		type="button"
		class="lms-action-primary lms-focus-ring h-10 self-start rounded-[10px] px-4 text-sm font-semibold disabled:opacity-50"
		disabled={planner.busy || !planner.objSubject || !planner.objGrade}
		onclick={() => planner.addObjective()}>{t('objective_add')}</button
	>
</div>
