<!-- Jenis asesmen & bobot kebijakan penilaian; dipakai drawer setup & halaman Asesmen. -->
<script lang="ts">
	import type { SchoolPlanningView } from '$lib/api/generated/lms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
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
	<span class="text-lms-muted flex-[1_1_260px] text-[13px]">{t('assess_note')}</span>
	<button
		type="button"
		class="lms-action-secondary lms-focus-ring h-9 rounded-lg px-3 text-xs font-semibold"
		disabled={planner.busy}
		onclick={() => planner.useDefaultAssessments()}>{t('assess_default')}</button
	>
</div>
<div class="border-lms-border flex flex-col rounded-xl border">
	{#each planning.assessments as a (a.code)}
		<div class="border-lms-border flex items-center gap-3 border-t px-4 py-2.5 first:border-t-0">
			<span class="flex flex-1 flex-col"
				><span class="text-sm font-semibold">{a.name}</span><span class="text-lms-muted text-xs"
					>{a.code} · {a.category === 'formative' ? t('formative') : t('summative')}{a.is_exam
						? ` · ${t('exam')}`
						: ''}</span
				></span
			>
			<span class="flex items-center gap-1"
				><input
					type="number"
					min="0"
					max="100"
					aria-label={t('weight_of', { name: a.name })}
					class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 w-20 rounded-lg px-2 text-center text-sm"
					disabled={a.category === 'formative'}
					bind:value={planner.weights[a.code]}
				/>%</span
			>
		</div>
	{:else}<p class="text-lms-muted p-4 text-sm">{t('assess_empty')}</p>{/each}
</div>
{#if planning.assessments.length}
	<div
		class="flex items-center justify-between rounded-xl px-4 py-3 {planner.weightSum === 100
			? 'lms-tone-success'
			: 'lms-tone-danger'}"
	>
		<span class="text-sm font-semibold">{t('weight_total')}</span>
		<span class="flex items-center gap-1.5 font-bold tabular-nums"
			><Icon
				icon={planner.weightSum === 100 ? CircleCheck : CircleAlert}
				size="sm"
			/>{planner.weightSum}%</span
		>
	</div>
	<button
		type="button"
		class="lms-action-primary lms-focus-ring h-10 self-start rounded-[10px] px-4 text-sm font-semibold disabled:opacity-50"
		disabled={planner.busy || planner.weightSum !== 100}
		onclick={() => planner.saveWeights()}>{t('save_weights')}</button
	>
{/if}
