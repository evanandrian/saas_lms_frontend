<!-- Jenis asesmen & bobot kebijakan penilaian; dipakai drawer setup & halaman Asesmen. -->
<script lang="ts">
	import { formatNumber } from '$lib/utils/format';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import type { PlanningDrawerState } from '../../planning-drawer.state.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import {
		ASSESSMENT_AGGREGATIONS,
		ASSESSMENT_CATEGORY_OPTIONS,
		DECIMAL_OPTIONS,
		DEFAULT_AGGREGATION,
		PREFIX,
		REASON_MAX,
		REASON_MIN,
		exampleSample,
		normalizeDecimals,
		normalizeWeight,
		weightValid,
		weightExample
	} from '../../school-admin.model';

	interface Props {
		planner: PlanningDrawerState;
	}
	let { planner }: Props = $props();

	const i18n = useI18n();
	const t = (k: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.planning.${k}`, params);

	const FIELD =
		'lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 rounded-lg px-2 text-sm';
	const weighted = $derived(
		planner.types.map((a) => ({ ...a, weight: normalizeWeight(planner.weights[a.code]) }))
	);
	const example = $derived(
		weightExample(weighted, exampleSample(weighted.map((a) => a.code)), planner.decimals)
	);
	const expression = $derived(
		example.parts.map((p) => `${p.code} ${p.score} × ${p.weight}%`).join(' + ')
	);
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
<div class="border-lms-border overflow-x-auto rounded-xl border">
	<table class="w-full min-w-[640px] text-left text-sm">
		<thead>
			<tr class="text-lms-muted font-mono text-[10px] tracking-[0.1em]">
				<th class="px-3 py-2">{t('type_code')}</th>
				<th class="px-3 py-2">{t('type_name')}</th>
				<th class="px-3 py-2">{t('type_category')}</th>
				<th class="px-3 py-2">{t('exam_label')}</th>
				<th class="px-3 py-2">{t('weight_head')}</th>
				<th class="px-3 py-2">{t('aggregation')}</th>
			</tr>
		</thead>
		<tbody>
			{#each planner.types as a (a.code)}
				<tr class="border-lms-border border-t">
					<td class="px-3 py-2 font-mono text-xs">{a.code}</td>
					<td class="px-3 py-2 font-semibold">{a.name}</td>
					<td class="px-3 py-2 text-xs"
						>{a.category === 'formative' ? t('formative') : t('summative')}</td
					>
					<td class="px-3 py-2"
						><Checkbox
							name="exam-{a.code}"
							label={t('exam_label')}
							bind:checked={() => a.is_exam ?? false, (v) => (a.is_exam = v)}
						/></td
					>
					<td class="px-3 py-2"
						><span class="flex items-center gap-1"
							><input
								type="number"
								min="0"
								max="100"
								step="1"
								aria-invalid={weightValid(planner.weights[a.code]) ? undefined : 'true'}
								aria-label={t('weight_of', { name: a.name })}
								class="{FIELD} w-20 border-[1.5px] text-center"
								disabled={a.category === 'formative'}
								bind:value={planner.weights[a.code]}
							/>%</span
						></td
					>
					<td class="px-3 py-2"
						><select
							aria-label={t('aggregation_of', { name: a.name })}
							class="{FIELD} select"
							bind:value={() => a.aggregation ?? DEFAULT_AGGREGATION, (v) => (a.aggregation = v)}
						>
							{#each ASSESSMENT_AGGREGATIONS as agg (agg)}
								<option value={agg}>{t(`aggregation_${agg}`)}</option>
							{/each}
						</select></td
					>
				</tr>
			{:else}
				<tr><td colspan="6" class="text-lms-muted p-4 text-sm">{t('assess_empty')}</td></tr>
			{/each}
			<tr class="border-lms-border bg-lms-surface-muted border-t">
				<td class="px-3 py-2"
					><input
						class="{FIELD} w-28 font-mono uppercase"
						placeholder={t('type_code')}
						aria-label={t('type_code')}
						maxlength="20"
						bind:value={planner.newType.code}
					/></td
				>
				<td class="px-3 py-2"
					><input
						class="{FIELD} w-full"
						placeholder={t('type_name')}
						aria-label={t('type_name')}
						bind:value={planner.newType.name}
					/></td
				>
				<td class="px-3 py-2"
					><select
						class="{FIELD} select"
						aria-label={t('type_category')}
						bind:value={planner.newType.category}
					>
						{#each ASSESSMENT_CATEGORY_OPTIONS as c (c)}
							<option value={c}>{c === 'formative' ? t('formative') : t('summative')}</option>
						{/each}
					</select></td
				>
				<td class="px-3 py-2"
					><Checkbox
						name="exam-new"
						label={t('exam_label')}
						bind:checked={
							() => planner.newType.is_exam ?? false, (v) => (planner.newType.is_exam = v)
						}
					/></td
				>
				<td class="px-3 py-2" colspan="2"
					><button
						type="button"
						class="lms-action-secondary lms-focus-ring h-9 rounded-lg px-3 text-xs font-semibold"
						disabled={planner.busy}
						onclick={() => planner.addType()}>{t('type_add')}</button
					></td
				>
			</tr>
		</tbody>
	</table>
</div>
{#if planner.types.length}
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
	<div
		class="bg-lms-surface-muted flex h-3 overflow-hidden rounded-full"
		role="img"
		aria-label={t('weight_bar')}
	>
		{#each weighted.filter((a) => a.weight > 0) as a, i (a.code)}
			<span
				class={i % 2 ? 'bg-lms-interactive-subtle' : 'bg-lms-interactive'}
				style:width="{a.weight}%"
				title="{a.code} {a.weight}%"
			></span>
		{/each}
	</div>
	<label class="flex flex-col gap-1 text-sm font-semibold sm:w-64">
		{t('decimals')}
		<select
			class="{FIELD} select"
			bind:value={() => planner.decimals, (v) => (planner.decimals = normalizeDecimals(v))}
		>
			{#each DECIMAL_OPTIONS as d (d)}
				<option value={d}>{t(`decimals_${d}`)}</option>
			{/each}
		</select>
	</label>
	<div class="border-lms-border rounded-xl border p-4">
		<p class="text-lms-muted font-mono text-[10px] tracking-[0.1em]">{t('example_title')}</p>
		<p class="mt-1 text-sm tabular-nums">
			{example.parts.length
				? t('example_line', {
						expr: expression,
						total: formatNumber(example.total, i18n.locale, {
							maximumFractionDigits: planner.decimals
						})
					})
				: t('example_empty')}
		</p>
	</div>
	<p class="text-lms-muted text-xs">{t('policy_pending_note')}</p>
	<label class="flex flex-col gap-1 text-sm font-semibold">
		{t('reason_label')}
		<textarea
			class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border min-h-20 rounded-lg px-3 py-2 text-sm font-normal"
			maxlength={REASON_MAX}
			bind:value={planner.reason}></textarea>
		<span class="text-lms-muted text-xs font-normal"
			>{planner.reasonRequired ? t('reason_hint', { min: REASON_MIN }) : t('reason_optional')}</span
		>
	</label>
	<button
		type="button"
		class="lms-action-primary lms-focus-ring h-10 self-start rounded-[10px] px-4 text-sm font-semibold disabled:opacity-50"
		disabled={planner.busy ||
			planner.weightSum !== 100 ||
			!planner.weightsValid ||
			!planner.reasonValid}
		onclick={() => planner.saveWeights()}>{t('save_weights')}</button
	>
{/if}
