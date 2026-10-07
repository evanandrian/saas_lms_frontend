<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import { RULES, groupSuffix, onlyDigits } from '../../registration.model';
	import type { RegistrationWizard } from '../../registration.state.svelte';
	import Segmented from '../Segmented.svelte';

	interface Props {
		wizard: RegistrationWizard;
		tried: boolean;
	}

	let { wizard, tried }: Props = $props();
	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
	const school = $derived(wizard.type === 'school');
	const capErr = $derived(wizard.errors.capacity);

	function setCount(grade: number, delta: number) {
		wizard.setup.grades = wizard.setup.grades.map((g) =>
			g.grade === grade
				? { ...g, count: Math.max(0, Math.min(RULES.groupsMax, g.count + delta)) }
				: g
		);
	}

	const chips = (label: string, count: number) =>
		Array.from({ length: count }, (_, j) =>
			school
				? `${label}-${groupSuffix(j, wizard.setup.scheme)}`
				: t('classes.group_name', { letter: String.fromCharCode(65 + j) })
		);
	const capTotal = $derived(
		(wizard.rombel * (Number(wizard.setup.capacity) || 0)).toLocaleString(
			i18n.locale === 'en' ? 'en-US' : 'id-ID'
		)
	);
</script>

<section class="lms-card flex flex-col gap-4.5 rounded-[14px]! p-6 shadow-none!">
	<div class="flex flex-wrap items-end gap-4">
		{#if school}
			<div class="flex flex-col gap-1.5">
				<span class="text-[0.8125rem] font-semibold">{t('classes.scheme')}</span>
				<Segmented
					full={false}
					options={[
						{ value: 'huruf' as const, label: t('classes.scheme_letter') },
						{ value: 'angka' as const, label: t('classes.scheme_number') }
					]}
					value={wizard.setup.scheme}
					label={t('classes.scheme')}
					onchange={(v) => (wizard.setup.scheme = v)}
				/>
			</div>
		{/if}
		<label class="flex w-45 flex-col gap-1.5" for="{uid}-cap">
			<span class="text-[0.8125rem] font-semibold">{t('classes.capacity')}</span>
			<input
				id="{uid}-cap"
				inputmode="numeric"
				value={wizard.setup.capacity}
				oninput={(e) => {
					wizard.setup.capacity = onlyDigits(e.currentTarget.value, 2);
					e.currentTarget.value = wizard.setup.capacity;
				}}
				class={[
					'input lms-input lms-focus-ring h-10 text-[0.9375rem]',
					capErr && 'border-lms-danger-text!'
				]}
			/>
		</label>
		<span class="text-lms-muted ms-auto pb-2.5 text-[0.8125rem]">
			<strong class="text-lms-foreground text-lg">{wizard.rombel}</strong>
			{school ? t('classes.unit_rombel') : t('classes.unit_group')} · {t('classes.capacity_total', {
				n: capTotal
			})}
		</span>
	</div>
	{#if capErr && (tried || wizard.setup.capacity)}<span
			class="text-lms-danger-text text-xs"
			role="alert">{t(`errors.${capErr}`)}</span
		>{/if}
	<ul class="flex flex-col">
		{#each wizard.setup.grades as g (g.grade)}
			<li class="border-lms-border flex flex-wrap items-center gap-4 border-t py-3.5">
				<span class="flex w-21 flex-none flex-col">
					<span class="text-lms-muted text-[11px]"
						>{school ? t('classes.grade') : t('classes.learning')}</span
					>
					<span class="text-lg font-bold">{school ? g.label : t('classes.group')}</span>
				</span>
				<span class="flex flex-none items-center gap-1">
					<button
						type="button"
						class="border-lms-input-border bg-lms-surface lms-focus-ring flex size-8 items-center justify-center rounded-lg border"
						aria-label={t('classes.less', { grade: g.label })}
						onclick={() => setCount(g.grade, -1)}><Icon icon={Minus} size="sm" /></button
					>
					<span class="w-9 text-center text-base font-bold tabular-nums">{g.count}</span>
					<button
						type="button"
						class="border-lms-input-border bg-lms-surface lms-focus-ring flex size-8 items-center justify-center rounded-lg border"
						aria-label={t('classes.more', { grade: g.label })}
						onclick={() => setCount(g.grade, 1)}><Icon icon={Plus} size="sm" /></button
					>
				</span>
				<span class="flex flex-[1_1_16.25rem] flex-wrap gap-1.5">
					{#each chips(g.label, g.count) as chip (chip)}
						<span
							class="bg-lms-interactive-subtle text-lms-interactive-subtle-text flex h-7 items-center rounded-[7px] px-2.5 text-xs font-bold"
							>{chip}</span
						>
					{/each}
				</span>
			</li>
		{/each}
	</ul>
	{#if school}<span class="text-lms-muted text-xs">{t('classes.homeroom_later')}</span>{/if}
</section>
