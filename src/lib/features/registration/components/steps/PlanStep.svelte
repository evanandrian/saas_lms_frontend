<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import Check from '@lucide/svelte/icons/check';
	import Dot from '@lucide/svelte/icons/dot';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import type { SignupPlan } from '$lib/api/generated/lms';
	import { RULES, rupiah } from '../../registration.model';
	import type { RegistrationWizard } from '../../registration.state.svelte';

	interface Props {
		wizard: RegistrationWizard;
	}

	let { wizard }: Props = $props();
	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
	const money = (n: number) => rupiah(n, i18n.locale);

	const plan = $derived(wizard.plan);
	const preview = $derived(wizard.preview);
	const minSeats = $derived(plan?.min_seats ?? RULES.seatsMin);
	const maxSeats = $derived(plan?.max_seats ?? RULES.seatsMax);
	const freeMonths = $derived(Math.max(0, ...wizard.plans.map((p) => p.free_months)));
	const editable = $derived(
		!wizard.server?.application ||
			['draft', 'revision_requested'].includes(wizard.server.application.status)
	);

	const unit = (p: SignupPlan) => t(`plan.unit_${p.pricing_model}`);
	const trialUnit = $derived(
		plan?.trial_unit === 'business_day'
			? 'business_day'
			: plan?.trial_unit === 'hour'
				? 'hour'
				: 'day'
	);

	function setSeats(v: number) {
		wizard.seats = Math.min(maxSeats, Math.max(minSeats, v));
	}

	const summary = $derived.by(() => {
		if (!plan || !preview) return [];
		const rows: { k: string; v: string; strong?: boolean }[] = [
			{ k: t('plan.sum_plan'), v: plan.name }
		];
		if (plan.pricing_model === 'seat') {
			rows.push({ k: t('plan.sum_price_seat'), v: money(plan.price_idr) });
			rows.push({
				k: t('plan.sum_seats'),
				v: `× ${wizard.seats.toLocaleString(i18n.locale === 'en' ? 'en-US' : 'id-ID')}`
			});
		} else if (plan.pricing_model === 'flat') {
			rows.push({ k: t('plan.sum_price_month'), v: money(plan.price_idr) });
		}
		if (plan.pricing_model !== 'package') {
			rows.push({
				k: t('plan.sum_period'),
				v:
					wizard.cycle === 'year'
						? t('plan.period_year', { billed: preview.billedMonths })
						: t('plan.period_month')
			});
		}
		rows.push({ k: t('plan.sum_subtotal'), v: money(preview.subtotal) });
		rows.push({ k: t('plan.sum_vat'), v: money(preview.tax) });
		rows.push({ k: t('plan.sum_total'), v: money(preview.total), strong: true });
		return rows;
	});
</script>

<div class="flex flex-col gap-4">
	{#if wizard.type !== 'event'}
		<div
			class="bg-lms-surface-muted border-lms-border flex gap-0.5 self-start rounded-full border p-0.75"
			role="group"
			aria-label={t('plan.cycle')}
		>
			{#each [{ value: 'month' as const, label: t('plan.monthly') }, { value: 'year' as const, label: t('plan.yearly') }] as option (option.value)}
				<button
					type="button"
					aria-pressed={wizard.cycle === option.value}
					disabled={!editable}
					class={[
						'lms-focus-ring flex h-9 items-center gap-2 rounded-full px-4 text-[0.8125rem] font-semibold',
						wizard.cycle === option.value
							? 'bg-lms-surface text-lms-foreground shadow-[0_1px_3px_rgba(15,24,56,0.15)]'
							: 'text-lms-muted'
					]}
					onclick={() => (wizard.cycle = option.value)}
				>
					{option.label}
					{#if option.value === 'year' && freeMonths > 0}
						<span class="lms-tone-success rounded-full px-1.75 py-0.5 text-[10px] font-bold"
							>{t('plan.save_months', { n: freeMonths })}</span
						>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
	<div
		class="grid grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))] gap-3"
		role="radiogroup"
		aria-label={t('plan.label')}
	>
		{#each wizard.plans as p (p.code)}
			{@const selected = p.code === plan?.code}
			<button
				type="button"
				role="radio"
				aria-checked={selected}
				disabled={!editable}
				class={[
					'lms-focus-ring relative flex flex-col gap-3 rounded-[14px] p-4.5 text-left transition-[transform,colors]',
					selected
						? 'border-lms-interactive bg-lms-interactive-subtle -translate-y-0.5 border-2'
						: 'border-lms-border bg-lms-surface border'
				]}
				onclick={() => (wizard.planCode = p.code)}
			>
				<span class="flex w-full items-center justify-between">
					<span class="text-base font-bold">{p.name}</span>
					<span
						class={[
							'bg-lms-surface size-4.5 rounded-full',
							selected ? 'border-lms-interactive border-[6px]' : 'border-lms-input-border border-2'
						]}
					></span>
				</span>
				{#if p.badge}
					<span
						class="bg-lms-interactive text-lms-on-interactive absolute -top-2.5 left-4 rounded-full px-2 py-0.75 text-[10px] font-bold tracking-wide uppercase"
						>{p.badge}</span
					>
				{/if}
				<span
					><span class="text-2xl font-bold tabular-nums">{money(p.price_idr)}</span><span
						class="text-lms-muted text-xs"
					>
						{unit(p)}</span
					></span
				>
				<span class="text-lms-muted text-xs">{p.description}</span>
				<span class="border-lms-border flex flex-col gap-1.5 border-t pt-2.5">
					{#each p.features.slice(0, 4) as feature (feature)}
						<span class="flex gap-2 text-xs leading-4.25"
							><span class="text-lms-progress mt-px"><Icon icon={Check} size="sm" /></span
							>{feature}</span
						>
					{/each}
				</span>
			</button>
		{/each}
	</div>
	{#if plan?.pricing_model === 'seat'}
		<section class="lms-card flex flex-col gap-3.5 rounded-[14px]! p-5 shadow-none!">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h2 class="text-[0.9375rem] font-bold">{t('plan.seats')}</h2>
					<p class="text-lms-muted mt-0.5 text-[0.8125rem]">{t('plan.seats_hint')}</p>
				</div>
				<div class="flex items-center gap-1.5">
					<button
						type="button"
						class="border-lms-input-border bg-lms-surface lms-focus-ring flex size-9.5 items-center justify-center rounded-lg border"
						aria-label={t('plan.seats_less')}
						disabled={!editable}
						onclick={() => setSeats(wizard.seats - RULES.seatsStep)}
						><Icon icon={Minus} size="sm" /></button
					>
					<span class="min-w-23 text-center text-[1.75rem] font-bold tabular-nums"
						>{wizard.seats.toLocaleString(i18n.locale === 'en' ? 'en-US' : 'id-ID')}</span
					>
					<button
						type="button"
						class="border-lms-input-border bg-lms-surface lms-focus-ring flex size-9.5 items-center justify-center rounded-lg border"
						aria-label={t('plan.seats_more')}
						disabled={!editable}
						onclick={() => setSeats(wizard.seats + RULES.seatsStep)}
						><Icon icon={Plus} size="sm" /></button
					>
				</div>
			</div>
			<label for="{uid}-seats" class="sr-only">{t('plan.seats')}</label>
			<input
				id="{uid}-seats"
				type="range"
				min={minSeats}
				max={maxSeats}
				step={RULES.seatsRangeStep}
				value={wizard.seats}
				oninput={(e) => setSeats(Number(e.currentTarget.value))}
				disabled={!editable}
				class="accent-lms-interactive w-full"
			/>
			<span class="text-lms-muted text-xs">
				{t('plan.seats_note', {
					groups: Math.floor(wizard.seats / RULES.studentsPerGroup),
					size: RULES.studentsPerGroup
				})}
				{#if wizard.trialOn && plan.trial_max_students}{' ' +
						t('plan.seats_trial', { n: plan.trial_max_students })}{/if}
			</span>
		</section>
	{/if}
	{#if wizard.type !== 'event' && plan?.trial_enabled}
		<button
			type="button"
			aria-pressed={wizard.trialOn}
			disabled={!editable}
			class={[
				'lms-focus-ring flex items-start gap-4 rounded-[14px] border-[1.5px] px-5 py-4.5 text-left transition-colors',
				wizard.trialOn
					? 'border-lms-progress/40 bg-lms-success-subtle'
					: 'border-lms-border bg-lms-surface'
			]}
			onclick={() => (wizard.trial = !wizard.trial)}
		>
			<span
				class={[
					'relative mt-0.5 h-6 w-10.5 flex-none rounded-full transition-colors',
					wizard.trialOn ? 'bg-lms-progress' : 'bg-lms-input-border'
				]}
			>
				<span
					class={[
						'absolute top-0.75 left-0.75 size-4.5 rounded-full bg-white shadow transition-transform',
						wizard.trialOn && 'translate-x-4.5'
					]}
				></span>
			</span>
			<span class="flex flex-col gap-1.5">
				<span class="text-[0.9375rem] font-bold"
					>{t(`plan.trial_title_${trialUnit}`, { n: plan.trial_length ?? 0 })}</span
				>
				<span class="flex flex-col gap-1">
					{#each [t( `plan.trial_rule1_${trialUnit}`, { n: plan.trial_length ?? 0 } ), t( 'plan.trial_rule2', { n: plan.trial_max_students ?? 0 } ), t(plan.trial_auto_approve ? 'plan.trial_rule3_auto' : 'plan.trial_rule3_review')] as rule (rule)}
						<span class="text-lms-muted flex gap-2 text-xs leading-4.5"
							><Icon icon={Dot} size="sm" />{rule}</span
						>
					{/each}
				</span>
			</span>
		</button>
	{/if}
	<section class="lms-card flex flex-col gap-2.5 rounded-[14px]! p-5 text-sm shadow-none!">
		{#each summary as row (row.k)}
			<div class="flex items-baseline gap-2">
				<span class="text-lms-muted">{row.k}</span>
				<span class="border-lms-input-border flex-1 border-b border-dotted"></span>
				<span class={['tabular-nums', row.strong ? 'font-bold' : 'font-medium']}>{row.v}</span>
			</div>
		{/each}
		<div
			class="border-lms-border mt-1 flex flex-wrap items-center justify-between gap-3 border-t pt-3"
		>
			<span class="flex flex-col gap-0.5">
				<span class="text-lms-muted text-xs font-bold tracking-widest uppercase"
					>{t('plan.pay_today')}</span
				>
				<span class="text-lms-muted text-xs"
					>{wizard.trialOn
						? t('plan.pay_today_trial', { total: money(preview?.total ?? 0) })
						: t('plan.pay_today_paid')}</span
				>
			</span>
			<span class="text-[1.625rem] font-bold tabular-nums"
				>{money(wizard.trialOn ? 0 : (preview?.total ?? 0))}</span
			>
		</div>
	</section>
</div>
