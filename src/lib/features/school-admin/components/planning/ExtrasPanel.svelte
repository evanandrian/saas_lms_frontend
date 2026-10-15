<!-- Ekstrakurikuler & pembina; dipakai drawer setup & halaman Ekskul. -->
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
	}
	let { planner, planning }: Props = $props();

	const i18n = useI18n();
	const t = (k: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.planning.${k}`, params);
</script>

<div class="border-lms-border flex flex-col rounded-xl border">
	{#each planning.extras as x (x.id)}
		<div class="border-lms-border flex items-center gap-3 border-t px-4 py-2.5 first:border-t-0">
			<span class="flex flex-1 flex-col"
				><span class="text-sm font-semibold">{x.name}</span><span class="text-lms-muted text-xs"
					>{t('coach', { name: x.coach_name || '—' })}</span
				></span
			>
			<button
				type="button"
				aria-label={t('delete')}
				class="lms-action-ghost lms-focus-ring flex size-7 items-center justify-center rounded-md"
				disabled={planner.busy}
				onclick={() => planner.removeExtra(x.id)}><Icon icon={Trash2} size="sm" /></button
			>
		</div>
	{:else}<p class="text-lms-muted p-4 text-sm">{t('extras_empty')}</p>{/each}
</div>
<div class="flex flex-wrap gap-2">
	<input
		class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-10 flex-[1_1_200px] rounded-[10px] px-3 text-sm"
		placeholder={t('extra_ph')}
		bind:value={planner.exName}
	/>
	<select
		aria-label={t('coach_label')}
		class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-10 rounded-[10px] px-2 text-sm"
		bind:value={planner.exCoach}
	>
		<option value="">{t('coach_none')}</option>
		{#each planner.teacherOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
	</select>
	<button
		type="button"
		class="lms-action-primary lms-focus-ring h-10 rounded-[10px] px-4 text-sm font-semibold disabled:opacity-50"
		disabled={planner.busy}
		onclick={() => planner.addExtra()}>{t('extra_add')}</button
	>
</div>
