<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { resolve } from '$app/paths';
	import type {
		SchoolSeatsResult,
		SchoolSubscriptionView
	} from '$lib/features/school-admin/school-admin.types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import StatusPill from '$lib/features/school-admin/components/StatusPill.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		PREFIX,
		SEAT_WARNING_RATIO,
		percent,
		prorataAmount
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { formatDate, formatRupiah } from '$lib/utils/format';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);
	const SEAT_STEP = 10;
	const DEFAULT_ADD = 50;

	// svelte-ignore state_referenced_locally
	let view = $state<SchoolSubscriptionView | null>(data.view);
	const editor = createRecordEditor<SchoolSubscriptionView>(i18n.t, (v) => (view = v));
	let add = $state(DEFAULT_ADD);

	const seats = $derived(view?.seats ?? { used: 0, seats: 0 });
	const trial = $derived(view?.status === 'trial');
	const count = $derived(
		Math.min(view?.max_seat_add ?? 0, Math.max(1, Math.floor(Number(add) || 1)))
	);
	const amount = $derived(
		view ? prorataAmount(count, view.unit_price_idr, view.prorata_months) : 0
	);
	const usedPct = $derived(seats.seats ? percent(seats.used, seats.seats) : 0);
	const pendingSeats = $derived((view?.pending ?? []).reduce((a, p) => a + p.seats, 0));

	const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
		active: 'success',
		trial: 'warning',
		past_due: 'danger',
		cancelled: 'neutral',
		expired: 'neutral'
	};
	const INVOICE_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
		paid: 'success',
		issued: 'info',
		overdue: 'danger',
		void: 'neutral'
	};
	const facts = $derived(
		view
			? trial
				? [
						{
							label: t('subscription.trial_ends'),
							value: formatDate(view.trial_ends_at, i18n.locale, {
								weekday: 'long',
								hour: '2-digit',
								minute: '2-digit'
							})
						},
						{
							label: t('subscription.trial_limit'),
							value: t('subscription.seats_value', { count: seats.seats })
						},
						{
							label: t('subscription.after_activation'),
							value: t('subscription.period_until', {
								date: formatDate(view.period_end, i18n.locale)
							})
						}
					]
				: [
						{
							label: t('subscription.period'),
							value: `${formatDate(view.period_start, i18n.locale)} – ${formatDate(view.period_end, i18n.locale)}`
						},
						{
							label: t('subscription.auto_renew'),
							value: view.auto_renew ? t('common.yes') : t('common.no')
						},
						{
							label: t('subscription.annual_total'),
							value: formatRupiah(view.annual_total_idr, i18n.locale)
						}
					]
			: []
	);

	async function buy() {
		if (count < 1) return;
		const out = await editor.run<SchoolSeatsResult>('addSeats', { seats: count });
		if (!out) return;
		view = out.subscription;
		editor.notify(
			out.applied ? t('students.seats_applied', { count }) : t('students.seats_invoiced')
		);
	}

	const invoiceHref = (id: string) => `${resolve(APP_PATHS.SCHOOL_ADMIN_BILLING)}?id=${id}`;
</script>

<svelte:head><title>{t('subscription.title')} · FLIXARE</title></svelte:head>

{#if !view}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('subscription.eyebrow')}
		title={t('subscription.title')}
		description={t('subscription.desc')}
		help="help.school_admin_subscription"
	>
		{#if !view.has_subscription}
			<StatePanel title={t('subscription.none_title')} description={t('subscription.none_desc')} />
		{:else}
			<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] items-start gap-4">
				<div class="lms-card flex flex-col gap-4 rounded-xl p-5">
					<div class="flex items-start justify-between gap-3">
						<div class="flex flex-col gap-1">
							<span class="text-lms-muted font-mono text-[11px] tracking-[0.12em]"
								>{t('subscription.plan_eyebrow')}</span
							>
							<span class="text-[22px] font-bold"
								>{t('subscription.plan', { name: view.plan })}</span
							>
							<span class="text-lms-muted text-[13px]"
								>{t('subscription.price', {
									price: formatRupiah(view.unit_price_idr, i18n.locale)
								})}</span
							>
						</div>
						<StatusPill
							tone={STATUS_TONE[view.status] ?? 'neutral'}
							label={t(`subscription.status_${view.status}`)}
						/>
					</div>
					<div class="flex flex-col gap-2">
						<div class="flex justify-between text-[13px]">
							<span class="font-semibold">{t('subscription.seats_used')}</span>
							<span class="tabular-nums"><strong>{seats.used}</strong> / {seats.seats || '—'}</span>
						</div>
						<div class="bg-lms-surface-muted h-2.5 overflow-hidden rounded-full">
							<div
								class="h-full rounded-full {seats.seats &&
								seats.used / seats.seats > SEAT_WARNING_RATIO
									? 'bg-lms-warning-text'
									: 'bg-lms-interactive'}"
								style:width="{Math.min(100, usedPct)}%"
							></div>
						</div>
						<span class="text-lms-muted text-xs"
							>{t('subscription.seats_note', { next: seats.seats + 1 })}</span
						>
						{#if pendingSeats}
							<span class="lms-tone-info rounded-lg px-3 py-2 text-xs"
								>{t('subscription.pending_seats', { count: pendingSeats })}</span
							>
						{/if}
					</div>
					<div class="border-lms-border flex flex-col gap-1.5 border-t pt-3">
						{#each facts as f (f.label)}
							<div class="flex justify-between gap-3 text-[13px]">
								<span class="text-lms-muted">{f.label}</span><span class="text-right font-semibold"
									>{f.value}</span
								>
							</div>
						{/each}
					</div>
					{#if trial}
						<a
							href={resolve(APP_PATHS.SCHOOL_ADMIN_ACTIVATE)}
							class="lms-action-primary lms-focus-ring flex h-[42px] items-center justify-center rounded-[10px] text-sm font-bold"
							>{t('subscription.activate')}</a
						>
					{/if}
				</div>

				<div class="lms-card flex flex-col gap-3.5 rounded-xl p-5">
					<div class="flex flex-col gap-1">
						<span class="text-base font-bold">{t('subscription.add_title')}</span>
						<span class="text-lms-muted text-[13px]">{t('subscription.add_desc')}</span>
					</div>
					<div class="flex flex-wrap items-center gap-2.5">
						<div
							class="border-lms-border-strong flex items-center overflow-hidden rounded-[10px] border-[1.5px]"
						>
							<button
								type="button"
								aria-label={t('subscription.decrease')}
								class="lms-focus-ring flex h-[42px] w-10 items-center justify-center disabled:opacity-40"
								disabled={count <= 1}
								onclick={() => (add = Math.max(1, count - SEAT_STEP))}
								><Icon icon={Minus} size="sm" /></button
							>
							<input
								type="number"
								min="1"
								max={view.max_seat_add}
								aria-label={t('subscription.seat_count')}
								class="bg-lms-surface h-[42px] w-[70px] border-none text-center text-base font-bold"
								bind:value={add}
							/>
							<button
								type="button"
								aria-label={t('subscription.increase')}
								class="lms-focus-ring flex h-[42px] w-10 items-center justify-center disabled:opacity-40"
								disabled={count >= view.max_seat_add}
								onclick={() => (add = Math.min(view?.max_seat_add ?? 0, count + SEAT_STEP))}
								><Icon icon={Plus} size="sm" /></button
							>
						</div>
						<span class="text-lms-muted text-[13px]">{t('subscription.seats_suffix')}</span>
					</div>
					<div class="bg-lms-surface-muted flex flex-col gap-1.5 rounded-[10px] p-3.5 text-[13px]">
						{#if trial}
							<span class="text-lms-muted">{t('subscription.trial_add_note')}</span>
						{:else}
							<div class="flex justify-between gap-2">
								<span class="text-lms-muted"
									>{t('subscription.formula', {
										seats: count,
										price: formatRupiah(view.unit_price_idr, i18n.locale),
										months: view.prorata_months
									})}</span
								>
								<span class="font-bold tabular-nums">{formatRupiah(amount, i18n.locale)}</span>
							</div>
							<span class="text-lms-muted text-xs"
								>{view.can_add_seats
									? t('subscription.invoice_note')
									: t('subscription.cannot_add')}</span
							>
						{/if}
					</div>
					<button
						type="button"
						class="lms-action-primary lms-focus-ring h-[42px] rounded-[10px] text-sm font-bold disabled:opacity-50"
						disabled={!view.can_add_seats || count < 1 || editor.busy}
						onclick={buy}
					>
						{trial
							? t('subscription.buy_trial', { count })
							: t('subscription.buy', { count, amount: formatRupiah(amount, i18n.locale) })}
					</button>
				</div>

				<div class="lms-card col-span-full flex flex-col rounded-xl">
					<div class="border-lms-border flex items-center justify-between border-b px-4 py-3.5">
						<span class="text-base font-bold">{t('subscription.invoices')}</span>
						<a
							href={resolve(APP_PATHS.SCHOOL_ADMIN_BILLING)}
							class="text-lms-link text-[13px] font-semibold">{t('subscription.all_invoices')}</a
						>
					</div>
					{#each view.invoices as inv (inv.id)}
						<!-- eslint-disable svelte/no-navigation-without-resolve -- invoiceHref sudah lewat resolve(); hanya query id -->
						<a
							href={invoiceHref(inv.id)}
							class="border-lms-border hover:bg-lms-surface-muted lms-focus-ring grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_110px] items-center gap-3 border-b px-4 py-3 text-[13px]"
						>
							<span class="font-mono text-xs font-semibold">{inv.number}</span>
							<span class="text-lms-muted truncate">{inv.description}</span>
							<span class="font-semibold tabular-nums"
								>{formatRupiah(inv.total_idr, i18n.locale)}</span
							>
							<StatusPill
								tone={INVOICE_TONE[inv.status] ?? 'neutral'}
								label={i18n.t(`invoices.status.${inv.status}`)}
							/>
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else}
						<p class="text-lms-muted px-4 py-8 text-center text-sm">
							{t('subscription.no_invoices')}
						</p>
					{/each}
				</div>
			</div>
		{/if}
	</ModuleShell>
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
