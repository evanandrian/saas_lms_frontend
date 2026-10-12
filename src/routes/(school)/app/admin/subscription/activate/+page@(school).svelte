<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ColorModeToggle from '$lib/components/layout/ColorModeToggle.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import {
		PREFIX,
		SEAT_CELLS,
		SEATS_PER_CELL,
		STUDENTS_PER_GROUP,
		activationQuote,
		failureMessage
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { formatDate, formatNumber, formatRupiah } from '$lib/utils/format';
	import { runPageAction } from '$lib/utils/page-action';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import QrCode from '@lucide/svelte/icons/qr-code';
	import Receipt from '@lucide/svelte/icons/receipt';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.activation.${key}`, params);
	const TOAST_MS = 5000;

	const view = $derived(data.view);
	// svelte-ignore state_referenced_locally
	let planCode = $state(
		data.view?.pending?.plan_code ??
			data.view?.plans.find((p) => p.current)?.code ??
			data.view?.plans[0]?.code ??
			''
	);
	let seats = $state(initialSeats());
	let pay = $state<'transfer' | 'gateway'>('transfer');
	let busy = $state(false);
	let toast = $state<string | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function initialSeats(): number {
		const v = data.view;
		if (!v) return 0;
		const step = v.seat_step || 1;
		const wanted = v.pending?.seats ?? Math.max(v.current_seats, v.min_seats);
		return Math.min(v.max_seats, Math.ceil(wanted / step) * step);
	}

	const plan = $derived(view?.plans.find((p) => p.code === planCode) ?? null);
	const minSeats = $derived(Math.max(view?.min_seats ?? 1, plan?.min_seats ?? 1));
	const maxSeats = $derived(
		Math.min(view?.max_seats ?? 0, plan?.max_seats ?? view?.max_seats ?? 0)
	);
	const step = $derived(view?.seat_step ?? 1);
	const quote = $derived(plan && view ? activationQuote(plan, seats, view.vat_basis_points) : null);
	const filledCells = $derived(Math.min(SEAT_CELLS, Math.round(seats / SEATS_PER_CELL)));
	const groups = $derived(Math.floor(seats / STUDENTS_PER_GROUP));
	const seatError = $derived(seats < minSeats || seats > maxSeats);

	function setSeats(value: number) {
		seats = Math.max(minSeats, Math.min(maxSeats, Math.round(value / step) * step || minSeats));
	}

	async function submit() {
		if (!plan || seatError) return;
		busy = true;
		const out = await runPageAction<{ invoice_id: string }>('activate', {
			plan_code: plan.code,
			seats
		});
		busy = false;
		if (!out.ok) {
			toast = failureMessage(i18n.t, out);
			clearTimeout(timer);
			timer = setTimeout(() => (toast = null), TOAST_MS);
			return;
		}
		const method = pay === 'gateway' ? 'va' : 'transfer';
		/* eslint-disable svelte/no-navigation-without-resolve -- path tagihan sudah lewat resolve(); hanya query id & pay */
		await goto(
			`${resolve(APP_PATHS.SCHOOL_ADMIN_BILLING)}?id=${out.data.invoice_id}&pay=${method}`
		);
		/* eslint-enable svelte/no-navigation-without-resolve */
	}

	const steps = $derived([
		{ key: 'institution', done: true, current: false },
		{ key: 'plan', done: false, current: true },
		{ key: 'payment', done: false, current: false },
		{ key: 'activation', done: false, current: false }
	]);
</script>

<svelte:head><title>{t('title')} · FLIXARE</title></svelte:head>

<!-- Aktivasi langganan (referensi FLIXARE App v4 "03 Onboarding Berlangganan"). -->
<div
	class="bg-lms-background text-lms-foreground flex min-h-dvh flex-col"
	data-screen-label="03 Onboarding Berlangganan"
>
	<header
		class="border-lms-border bg-lms-surface sticky z-20 flex flex-wrap items-center gap-4 border-b px-4 py-3 lg:px-8"
		style:top="env(safe-area-inset-top, 0px)"
	>
		<span class="h-8"><BrandLogo expression="core" /></span>
		<ol
			class="flex flex-1 flex-wrap items-center justify-center gap-2 text-[13px]"
			aria-label={t('steps')}
		>
			{#each steps as s, i (s.key)}
				<li class="flex items-center gap-2">
					<span
						class="flex items-center gap-1.5 {s.current
							? 'text-lms-foreground font-bold'
							: s.done
								? 'text-lms-success-text font-semibold'
								: 'text-lms-muted'}"
					>
						{#if s.done}<Icon icon={CircleCheck} size="sm" />{/if}{t(`step_${s.key}`)}
					</span>
					{#if i < steps.length - 1}<span class="text-lms-muted"
							><Icon icon={ChevronRight} size="sm" /></span
						>{/if}
				</li>
			{/each}
		</ol>
		<ColorModeToggle />
	</header>

	{#if !view}
		<div class="p-8">
			<StatePanel
				tone="error"
				title={i18n.t(`${PREFIX}.common.load_failed`)}
				description={i18n.t(`${PREFIX}.failure.${data.failure}`)}
			/>
		</div>
	{:else if !view.eligible}
		<div class="mx-auto w-full max-w-2xl p-8">
			<StatePanel title={t('not_eligible_title')} description={t('not_eligible_desc')}>
				{#snippet actions()}<a
						class="lms-action-primary lms-focus-ring inline-flex h-10 items-center rounded-[10px] px-4 text-sm font-semibold"
						href={resolve(APP_PATHS.SCHOOL_ADMIN_SUBSCRIPTION)}>{t('to_subscription')}</a
					>{/snippet}
			</StatePanel>
		</div>
	{:else}
		<div
			class="mx-auto grid w-full max-w-[1200px] flex-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8"
		>
			<div class="flex min-w-0 flex-col gap-5">
				<div class="flex flex-col gap-1">
					<h1 class="text-2xl font-bold">{t('heading', { school: view.school })}</h1>
					<p class="text-lms-muted text-sm">{t('subheading')}</p>
				</div>

				{#if view.pending}
					<div
						role="status"
						class="lms-tone-info flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-[13px]"
					>
						<Icon icon={Receipt} size="sm" />
						<span class="flex-[1_1_260px]"
							>{t('pending', {
								number: view.pending.invoice_number,
								plan: view.pending.plan_name,
								seats: view.pending.seats,
								total: formatRupiah(view.pending.total_idr, i18n.locale)
							})}</span
						>
						<!-- eslint-disable svelte/no-navigation-without-resolve -- path tagihan sudah lewat resolve(); hanya query id -->
						<a
							class="lms-action-primary lms-focus-ring inline-flex h-9 items-center rounded-lg px-3.5 text-xs font-bold"
							href={`${resolve(APP_PATHS.SCHOOL_ADMIN_BILLING)}?id=${view.pending.invoice_id}`}
							>{t('pending_pay')}</a
						>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					</div>
				{/if}

				<!-- Perbandingan paket -->
				<section class="lms-card overflow-x-auto rounded-xl">
					<div
						class="grid min-w-[560px]"
						style:grid-template-columns="minmax(180px,1.4fr) repeat({view.plans.length},
						minmax(120px,1fr))"
					>
						<div
							class="border-lms-border text-lms-muted flex items-end border-b px-4 py-3 text-xs font-semibold"
						>
							{t('features')}
						</div>
						{#each view.plans as p (p.code)}
							{@const on = p.code === planCode}
							<button
								type="button"
								aria-pressed={on}
								class="border-lms-border lms-focus-ring flex flex-col items-start gap-1 border-b border-l px-4 py-3 text-left {on
									? 'bg-lms-interactive-subtle shadow-[inset_0_3px_0_var(--color-lms-interactive)]'
									: ''}"
								onclick={() => {
									planCode = p.code;
									setSeats(seats);
								}}
							>
								<span class="flex w-full items-center justify-between gap-2">
									<span class="text-sm font-bold">{p.name}</span>
									<span
										class="size-4 rounded-full {on
											? 'border-lms-interactive border-[5px]'
											: 'border-lms-border-strong border-2'}"
									></span>
								</span>
								<span class="text-lg font-bold tabular-nums"
									>{formatRupiah(p.price_idr, i18n.locale)}</span
								>
								<span class="text-lms-muted text-[11px]">{t('per_student_month')}</span>
								{#if p.badge}<span class="lms-tone-info rounded px-1.5 py-0.5 text-[10px] font-bold"
										>{p.badge}</span
									>{/if}
							</button>
						{/each}
						{#each view.features as feat (feat)}
							<div class="border-lms-border border-b px-4 py-2.5 text-[13px]">{feat}</div>
							{#each view.plans as p (p.code)}
								{@const has = p.features.includes(feat)}
								<div
									class="border-lms-border flex items-center justify-center border-b border-l py-2.5 {p.code ===
									planCode
										? 'bg-lms-interactive-subtle'
										: ''} {has ? 'text-lms-success-text' : 'text-lms-border-strong'}"
								>
									<Icon icon={has ? Check : Minus} size="sm" />
									<span class="sr-only">{has ? t('included') : t('not_included')}</span>
								</div>
							{/each}
						{:else}
							<div class="text-lms-muted col-span-full px-4 py-3 text-xs">{t('no_features')}</div>
						{/each}
					</div>
				</section>

				<!-- Kursi -->
				<section class="lms-card flex flex-col gap-4 rounded-xl p-5">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="flex flex-col gap-1">
							<span class="text-base font-bold">{t('seats_title')}</span>
							<span class="text-lms-muted text-[13px]">{t('seats_desc')}</span>
						</div>
						<div
							class="border-lms-border-strong flex items-center overflow-hidden rounded-[10px] border-[1.5px]"
						>
							<button
								type="button"
								aria-label={t('decrease')}
								class="lms-focus-ring flex h-10 w-10 items-center justify-center disabled:opacity-40"
								disabled={seats <= minSeats}
								onclick={() => setSeats(seats - step)}><Icon icon={Minus} size="sm" /></button
							>
							<span class="min-w-20 text-center text-base font-bold tabular-nums"
								>{formatNumber(seats, i18n.locale)}</span
							>
							<button
								type="button"
								aria-label={t('increase')}
								class="lms-focus-ring flex h-10 w-10 items-center justify-center disabled:opacity-40"
								disabled={seats >= maxSeats}
								onclick={() => setSeats(seats + step)}><Icon icon={Plus} size="sm" /></button
							>
						</div>
					</div>
					<div
						class="grid grid-cols-20 gap-0.75"
						role="img"
						aria-label={t('seats_value', { seats })}
					>
						{#each Array.from({ length: SEAT_CELLS }, (_, i) => i) as i (i)}
							<span
								class="h-3 rounded-t-xs rounded-b-[1px] {i < filledCells
									? 'bg-lms-interactive'
									: 'bg-lms-surface-muted'}"
							></span>
						{/each}
					</div>
					<input
						type="range"
						aria-label={t('seats_title')}
						min={minSeats}
						max={maxSeats}
						{step}
						value={seats}
						oninput={(e) => setSeats(Number(e.currentTarget.value))}
						class="accent-lms-interactive w-full"
					/>
					<div class="text-lms-muted flex flex-wrap justify-between gap-2 text-xs">
						<span>{t('cell_hint', { seats: SEATS_PER_CELL })}</span>
						<span>{t('groups_hint', { groups, per: STUDENTS_PER_GROUP })}</span>
					</div>
					<span class="text-xs {seatError ? 'text-lms-danger-text' : 'text-lms-muted'}"
						>{t('seats_min', { min: minSeats, students: view.active_students })}</span
					>
				</section>

				<!-- Metode pembayaran -->
				<section class="lms-card flex flex-col gap-3 rounded-xl p-5">
					<span class="text-base font-bold">{t('pay_title')}</span>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each [{ k: 'transfer', icon: Landmark }, { k: 'gateway', icon: QrCode }] as m (m.k)}
							{@const on = pay === m.k}
							{@const disabled = m.k === 'gateway' && !view.gateway_ready}
							<button
								type="button"
								aria-pressed={on}
								{disabled}
								class="lms-focus-ring flex items-start gap-3 rounded-[10px] border-[1.5px] p-3.5 text-left disabled:cursor-not-allowed disabled:opacity-50 {on
									? 'border-lms-interactive bg-lms-interactive-subtle'
									: 'border-lms-border bg-lms-surface'}"
								onclick={() => (pay = m.k as typeof pay)}
							>
								<span
									class="mt-0.5 size-4 flex-none rounded-full {on
										? 'border-lms-interactive border-[5px]'
										: 'border-lms-border-strong border-2'}"
								></span>
								<span class="text-lms-interactive"><Icon icon={m.icon} size="sm" /></span>
								<span class="flex flex-col gap-0.5">
									<span class="text-sm font-bold">{t(`pay_${m.k}`)}</span>
									<span class="text-lms-muted text-xs"
										>{disabled ? t('pay_gateway_off') : t(`pay_${m.k}_desc`)}</span
									>
								</span>
							</button>
						{/each}
					</div>
				</section>
			</div>

			<!-- Rincian langganan -->
			<aside class="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
				<div class="lms-card flex flex-col gap-3 rounded-xl p-5 font-mono text-[13px]">
					<div class="flex flex-col items-center gap-0.5 text-center">
						<span class="font-sans text-sm font-bold tracking-[0.18em]">FLIXARE</span>
						<span class="text-lms-muted text-[11px] tracking-[0.14em]">{t('receipt_title')}</span>
						<span class="text-lms-muted font-sans text-xs">{view.school}</span>
					</div>
					<div class="border-lms-border-strong border-t border-dashed"></div>
					{#if plan && quote}
						{#each [[t('r_plan'), plan.name], [t('r_price'), formatRupiah(plan.price_idr, i18n.locale)], [t('r_seats'), `× ${formatNumber(seats, i18n.locale)}`], [t('r_months'), `× ${plan.billed_months}`], [t('r_monthly'), formatRupiah(quote.monthly, i18n.locale)], [t('r_subtotal'), formatRupiah(quote.subtotal, i18n.locale)], [plan.tax_mode === 'incl' ? t('r_tax_incl') : t('r_tax'), formatRupiah(quote.tax, i18n.locale)]] as [k, v] (k)}
							<div class="flex items-baseline gap-2">
								<span class="text-lms-muted">{k}</span><span
									class="border-lms-border flex-1 border-b border-dotted"
								></span><span class="font-semibold">{v}</span>
							</div>
						{/each}
						{#if plan.free_months}<span class="text-lms-success-text text-xs"
								>{t('free_months', { months: plan.free_months })}</span
							>{/if}
						<div class="border-lms-border-strong border-t border-dashed"></div>
						<div class="flex items-baseline justify-between">
							<span class="text-xs font-bold tracking-[0.1em]">{t('r_total')}</span><span
								class="font-sans text-xl font-bold">{formatRupiah(quote.total, i18n.locale)}</span
							>
						</div>
					{/if}
					{#if view.status === 'trial' && view.trial_ends_at}
						<div
							class="lms-tone-warning flex items-baseline justify-between rounded-lg px-2.5 py-1.5 text-[11px]"
						>
							<span class="font-bold tracking-[0.08em]">{t('trial_label')}</span><span
								>{t('trial_until', {
									date: formatDate(view.trial_ends_at, i18n.locale, {
										weekday: 'long',
										hour: '2-digit',
										minute: '2-digit'
									})
								})}</span
							>
						</div>
					{/if}
					<p class="text-lms-muted font-sans text-xs leading-[18px]">{t('period_note')}</p>
				</div>
				<button
					type="button"
					class="lms-action-primary lms-focus-ring flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-bold disabled:opacity-60"
					disabled={busy || !plan || seatError}
					onclick={submit}
					>{view.pending ? t('submit_replace') : t('submit')}<Icon
						icon={ArrowRight}
						size="sm"
					/></button
				>
				<p class="text-lms-muted text-xs leading-[18px]">
					{view.pending ? t('replace_note') : t('submit_note')}
				</p>
			</aside>
		</div>
	{/if}
</div>
<Toast message={toast} icon={CircleAlert} />
