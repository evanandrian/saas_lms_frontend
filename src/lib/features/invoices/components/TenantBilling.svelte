<script lang="ts">
	import { replaceState } from '$app/navigation';
	import type { BackendFailure } from '$lib/api/backend-call';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import { useI18n } from '$lib/i18n';
	import { runPageAction } from '$lib/utils/page-action';
	import type { LucideIcon } from '@lucide/svelte';
	import Ban from '@lucide/svelte/icons/ban';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import Copy from '@lucide/svelte/icons/copy';
	import Landmark from '@lucide/svelte/icons/landmark';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Printer from '@lucide/svelte/icons/printer';
	import QrCode from '@lucide/svelte/icons/qr-code';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Send from '@lucide/svelte/icons/send';
	import {
		STATUS_TONE,
		longDate,
		longDateTs,
		pendingProof,
		rupiah,
		terbilang,
		type InvoiceDetail,
		type InvoiceList,
		type InvoiceStatus,
		type InvoiceSummary
	} from '../invoices.model';
	import type { PaperData } from './InvoicePaper.svelte';
	import PrintOverlay from './PrintOverlay.svelte';
	import TransferForm, { type TransferPayload } from './TransferForm.svelte';

	/**
	 * Tagihan lembaga (admin sekolah / pemilik): daftar invoice terbit, bayar lewat VA/QRIS Midtrans atau
	 * kirim bukti transfer (diverifikasi staf keuangan), cetak invoice/kuitansi A4.
	 */
	interface Props {
		list: InvoiceList | null;
		selected: InvoiceDetail | null;
		failure: BackendFailure | null;
		proofHref: string;
	}

	let { list: initialList, selected, failure, proofHref }: Props = $props();
	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`invoices.tenant.${key}`, params);
	const money = (n: number) => rupiah(n, i18n.locale);
	const TOAST_MS = 5000;
	const COPIED_MS = 2500;
	const VA_CHANNELS = ['va_bca', 'va_bni', 'va_bri', 'va_mandiri', 'va_permata'] as const;
	type Method = 'va' | 'qris' | 'transfer';

	// svelte-ignore state_referenced_locally
	let items = $state<InvoiceSummary[]>(initialList?.items ?? []);
	// svelte-ignore state_referenced_locally
	let detail = $state<InvoiceDetail | null>(selected);
	let method = $state<Method>('va');
	let bank = $state<(typeof VA_CHANNELS)[number]>('va_bca');
	let busy = $state(false);
	let printOpen = $state(false);
	let copied = $state(false);
	let transferTried = $state(false);
	let transfer = $state<TransferPayload | null>(null);
	let toast = $state<{ text: string; icon: LucideIcon } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	const status = $derived<InvoiceStatus>(detail?.status ?? 'issued');
	const payable = $derived(status === 'issued' || status === 'overdue');
	const pending = $derived(pendingProof(detail));
	const gateway = $derived(
		detail?.payments.find(
			(p) =>
				p.method === 'gateway' &&
				p.status === 'pending' &&
				(!p.expires_at || new Date(p.expires_at) > new Date())
		) ?? null
	);
	const banks = $derived(detail?.bank ? [detail.bank] : []);

	function notify(text: string, icon: LucideIcon = CircleCheck) {
		toast = { text, icon };
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), TOAST_MS);
	}

	type ActionResult = { detail: InvoiceDetail; list: InvoiceList | null };

	async function run(name: string, body: Record<string, unknown>): Promise<ActionResult | null> {
		busy = true;
		const result = await runPageAction<ActionResult>(name, body);
		busy = false;
		if (!result.ok) {
			const code = result.issues[0]?.code ?? result.code;
			notify(i18n.t(`invoices.failure.${KNOWN.includes(code) ? code : 'generic'}`), CircleAlert);
			return null;
		}
		if (result.data.list) items = result.data.list.items;
		detail = result.data.detail;
		return result.data;
	}
	const KNOWN = [
		'invalid_transition',
		'gateway_unavailable',
		'amount_mismatch',
		'proof_invalid',
		'no_context'
	];

	async function pick(x: InvoiceSummary) {
		if (x.id === detail?.id) return;
		if (await run('get', { id: x.id })) {
			const url = new URL(window.location.href);
			url.searchParams.set('id', x.id);
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- path halaman yang sama, hanya query `id`
			replaceState(url, {});
		}
	}

	async function pay(channel: string) {
		if (!detail) return;
		if (await run('pay', { id: detail.id, channel })) notify(t('toast.created'));
	}

	async function check() {
		if (!detail) return;
		const out = await run('check', { id: detail.id });
		if (out)
			notify(
				out.detail.status === 'paid' ? t('toast.paid') : t('toast.not_yet'),
				out.detail.status === 'paid' ? CircleCheck : Clock
			);
	}

	async function sendTransfer() {
		transferTried = true;
		if (!detail || !transfer) return;
		if (await run('transfer', { id: detail.id, payment: transfer })) {
			transferTried = false;
			notify(t('toast.sent'), Send);
		}
	}

	async function copy(value: string) {
		try {
			await navigator.clipboard.writeText(value.replace(/\s/g, ''));
			copied = true;
			setTimeout(() => (copied = false), COPIED_MS);
		} catch {
			copied = false;
		}
	}

	const dueLine = (x: InvoiceSummary) =>
		x.status === 'paid'
			? i18n.t('invoices.list.paid')
			: x.status === 'void'
				? i18n.t('invoices.list.void')
				: i18n.t('invoices.list.due', { date: longDateTs(x.due_at, i18n.locale) });

	const paper = $derived.by((): PaperData | null => {
		if (!detail) return null;
		const d = detail;
		return {
			number: d.number,
			status: d.status,
			issuer: d.issuer,
			billTo: d.bill_to,
			issueDate: d.issue_date ?? '',
			dueDate: d.due_at
				? new Date(d.due_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
				: '',
			period: d.period_label,
			lines: d.items.map((it) => ({
				description: it.description,
				quantity: it.quantity,
				unitLabel: it.unit_label,
				unitPrice: it.unit_price_idr
			})),
			subtotal: d.totals.subtotal_idr,
			discount: d.totals.discount_idr,
			discountLabel: `${i18n.t('invoices.sum.discount')}${d.discount_type === 'percent' && d.discount_value ? ` ${d.discount_value}%` : ''}`,
			dpp: d.totals.dpp_idr,
			taxEnabled: d.tax_enabled,
			tax: d.totals.tax_idr,
			total: d.totals.total_idr,
			bank: d.bank,
			va: d.va?.va_number
				? {
						bank: (d.va.channel ?? '').replace('va_', '').toUpperCase(),
						number: d.va.va_number,
						billerCode: d.va.biller_code
					}
				: null,
			note: d.note || d.default_note
		};
	});

	const tabCls = (on: boolean) => [
		'lms-focus-ring flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold',
		on ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
	];
</script>

<svelte:head><title>{t('head_title')} · FLIXARE</title></svelte:head>

{#if !initialList}
	<div class="flex flex-col gap-4 pb-24">
		<StatePanel
			headingLevel={1}
			title={t(failure === 'forbidden' ? 'forbidden_title' : 'unavailable_title')}
			description={t(failure === 'forbidden' ? 'forbidden_text' : 'unavailable_text')}
			tone={failure === 'forbidden' ? 'warning' : 'error'}
		/>
	</div>
{:else}
	<div class="text-lms-foreground flex flex-col gap-4 pb-24">
		<HeroBanner
			eyebrow={t('eyebrow')}
			title={t('title')}
			description={t('desc')}
		/>

		{#if !items.length}
			<StatePanel title={t('empty_title')} description={t('empty_text')} />
		{:else}
			<div class="flex flex-wrap items-start gap-4">
				<section
					class="bg-lms-surface border-lms-border flex min-w-60 flex-[0_1_290px] flex-col overflow-hidden rounded-xl border"
					aria-label={t('list_label')}
				>
					{#each items as x (x.id)}
						{@const on = x.id === detail?.id}
						<button
							type="button"
							aria-current={on}
							class={[
								'border-lms-border lms-focus-ring flex flex-col gap-1.5 border-b px-3.5 py-3 text-left last:border-b-0',
								on &&
									'bg-lms-interactive-subtle/50 shadow-[inset_3px_0_0_var(--color-lms-interactive)]'
							]}
							onclick={() => pick(x)}
						>
							<span class="flex w-full justify-between gap-2">
								<span class="font-mono text-xs font-semibold">{x.number}</span>
								<span
									class={[
										'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.04em]',
										STATUS_TONE[x.status]
									]}>{i18n.t(`invoices.status.${x.status}`).toUpperCase()}</span
								>
							</span>
							<span class="text-[13px] font-bold tabular-nums">{money(x.total_idr)}</span>
							<span
								class={[
									'text-[11px]',
									x.status === 'overdue' ? 'text-lms-warning-text' : 'text-lms-muted'
								]}>{dueLine(x)}</span
							>
						</button>
					{/each}
				</section>

				{#if detail}
					<div class="flex min-w-0 flex-[1_1_440px] flex-col gap-3.5">
						{#if status === 'paid'}
							<div
								class="lms-tone-success flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5 text-[13px]"
							>
								<Icon icon={CircleCheck} /><span class="flex-1"
									><b>{i18n.t('invoices.banner.paid_title')}</b>
									{t('paid_text', { date: longDateTs(detail.paid_at, i18n.locale) })}</span
								>
								<button
									type="button"
									class="lms-focus-ring flex h-8.5 items-center gap-1.5 rounded-lg border border-current px-3 text-xs font-bold"
									onclick={() => (printOpen = true)}
									><Icon icon={Printer} size="sm" />{i18n.t(
										'invoices.banner.print_receipt'
									)}</button
								>
							</div>
						{:else if status === 'void'}
							<div
								class="lms-tone-danger flex items-center gap-3 rounded-xl px-4 py-3.5 text-[13px]"
							>
								<Icon icon={Ban} /><span
									><b>{i18n.t('invoices.banner.void_title')}</b>
									{t('void_text', { reason: detail.void_reason || '—' })}</span
								>
							</div>
						{:else if status === 'overdue'}
							<div
								class="lms-tone-warning flex items-center gap-3 rounded-xl px-4 py-3.5 text-[13px]"
							>
								<Icon icon={Clock} /><span
									><b>{i18n.t('invoices.banner.overdue_title')}</b> {t('overdue_text')}</span
								>
							</div>
						{/if}

						<section
							class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5"
						>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<span class="flex flex-col gap-1">
									<span class="text-lms-muted font-mono text-[13px] font-semibold"
										>{detail.number}</span
									>
									<span class="text-[28px] leading-9 font-bold tabular-nums"
										>{money(detail.totals.total_idr)}</span
									>
									<span class="text-lms-muted text-xs italic"
										>{terbilang(detail.totals.total_idr)}</span
									>
								</span>
								<button
									type="button"
									class="lms-focus-ring border-lms-border-strong bg-lms-surface flex h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold"
									onclick={() => (printOpen = true)}
									><Icon icon={Printer} size="sm" />{t('print')}</button
								>
							</div>
							<dl
								class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-3 text-[13px]"
							>
								<div>
									<dt class="text-lms-muted text-xs">{t('issue_date')}</dt>
									<dd class="font-semibold">{longDate(detail.issue_date, i18n.locale)}</dd>
								</div>
								<div>
									<dt class="text-lms-muted text-xs">{t('due_date')}</dt>
									<dd class="font-semibold">{longDateTs(detail.due_at, i18n.locale)}</dd>
								</div>
								<div>
									<dt class="text-lms-muted text-xs">{t('period')}</dt>
									<dd class="font-semibold">{detail.period_label || '—'}</dd>
								</div>
							</dl>
							<div class="flex flex-col">
								{#each detail.items as it (it.id)}
									<div
										class="border-lms-border flex justify-between gap-3 border-t py-2.5 text-[13px]"
									>
										<span class="flex flex-col"
											><span class="font-semibold">{it.description}</span><span
												class="text-lms-muted text-xs"
												>{it.quantity.toLocaleString(i18n.locale === 'en' ? 'en-US' : 'id-ID')}
												{it.unit_label} × {money(it.unit_price_idr)}</span
											></span
										>
										<span class="font-semibold tabular-nums">{money(it.amount_idr)}</span>
									</div>
								{/each}
								<div
									class="border-lms-border text-lms-muted flex justify-between border-t py-2 text-[13px]"
								>
									<span>{i18n.t('invoices.sum.subtotal')}</span><span class="tabular-nums"
										>{money(detail.totals.subtotal_idr)}</span
									>
								</div>
								{#if detail.totals.discount_idr}<div
										class="text-lms-muted flex justify-between py-1 text-[13px]"
									>
										<span>{paper?.discountLabel}</span><span class="tabular-nums"
											>−{money(detail.totals.discount_idr)}</span
										>
									</div>{/if}
								<div
									class="border-lms-border text-lms-muted flex justify-between border-t py-2 text-[13px]"
								>
									<span>PPN 11%</span><span class="tabular-nums"
										>{detail.tax_enabled
											? money(detail.totals.tax_idr)
											: i18n.t('invoices.sum.no_vat')}</span
									>
								</div>
							</div>
						</section>

						{#if payable}
							<section
								class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5"
							>
								<h2 class="text-base font-bold">{t('how_to_pay')}</h2>
								{#if pending}
									<p
										class="lms-tone-info flex items-center gap-2 rounded-xl px-3.5 py-3 text-[13px]"
									>
										<Icon icon={LoaderCircle} size="sm" />{t('proof_waiting', {
											amount: money(pending.amount_idr)
										})}
									</p>
								{/if}
								<div
									class="bg-lms-surface-muted flex gap-1 rounded-[10px] p-1"
									role="tablist"
									aria-label={t('how_to_pay')}
								>
									<button
										type="button"
										role="tab"
										aria-selected={method === 'va'}
										class={tabCls(method === 'va')}
										onclick={() => (method = 'va')}
										><Icon icon={Landmark} size="sm" />{t('method_va')}</button
									>
									<button
										type="button"
										role="tab"
										aria-selected={method === 'qris'}
										class={tabCls(method === 'qris')}
										onclick={() => (method = 'qris')}><Icon icon={QrCode} size="sm" />QRIS</button
									>
									<button
										type="button"
										role="tab"
										aria-selected={method === 'transfer'}
										class={tabCls(method === 'transfer')}
										onclick={() => (method = 'transfer')}
										><Icon icon={Send} size="sm" />{t('method_transfer')}</button
									>
								</div>

								{#if method === 'va' || method === 'qris'}
									{@const current =
										gateway &&
										(method === 'qris' ? gateway.channel === 'qris' : gateway.channel !== 'qris')
											? gateway
											: null}
									{#if current}
										<div class="border-lms-border flex flex-col gap-3 rounded-xl border p-4">
											{#if current.qr_image_url}
												<img
													src={current.qr_image_url}
													alt={t('qris_alt')}
													class="border-lms-border size-44 self-center rounded-xl border bg-white p-2"
												/>
											{:else}
												<span class="text-lms-muted text-xs"
													>{t('va_number', {
														bank: (current.channel ?? '').replace('va_', '').toUpperCase()
													})}{#if current.biller_code}
														· {t('biller_code', { code: current.biller_code })}{/if}</span
												>
												<span class="flex items-center gap-3">
													<span class="font-mono text-xl font-bold tracking-wide"
														>{current.va_number}</span
													>
													<button
														type="button"
														class="lms-focus-ring text-lms-link flex items-center gap-1 text-xs font-semibold"
														onclick={() => copy(current.va_number ?? '')}
														><Icon icon={copied ? Check : Copy} size="sm" />{copied
															? t('copied')
															: t('copy')}</button
													>
												</span>
											{/if}
											<span class="text-lms-muted text-xs"
												>{t('valid_until', {
													date: current.expires_at
														? new Date(current.expires_at).toLocaleString(
																i18n.locale === 'en' ? 'en-GB' : 'id-ID',
																{
																	dateStyle: 'medium',
																	timeStyle: 'short',
																	timeZone: 'Asia/Jakarta'
																}
															)
														: '—'
												})}</span
											>
											<button
												type="button"
												disabled={busy}
												class="lms-focus-ring bg-lms-interactive text-lms-on-interactive flex h-10 items-center justify-center gap-2 rounded-[10px] text-sm font-bold disabled:opacity-60"
												onclick={check}
												><Icon icon={busy ? LoaderCircle : RefreshCw} size="sm" />{t(
													'check'
												)}</button
											>
										</div>
									{/if}
									{#if method === 'va'}
										<div class="flex flex-wrap items-end gap-2">
											<label class="flex flex-1 flex-col gap-1.5">
												<span class="text-[13px] font-semibold"
													>{current ? t('other_bank') : t('pick_bank')}</span
												>
												<select
													bind:value={bank}
													class="input lms-input lms-focus-ring h-10.5 text-sm"
												>
													{#each VA_CHANNELS as c (c)}<option value={c}
															>{c.replace('va_', '').toUpperCase()}</option
														>{/each}
												</select>
											</label>
											<button
												type="button"
												disabled={busy}
												class="lms-focus-ring border-lms-border-strong bg-lms-surface h-10.5 rounded-[10px] border px-4 text-sm font-semibold disabled:opacity-60"
												onclick={() => pay(bank)}
												>{t('create_va', { bank: bank.replace('va_', '').toUpperCase() })}</button
											>
										</div>
									{:else if !current}
										<button
											type="button"
											disabled={busy}
											class="lms-focus-ring border-lms-border-strong bg-lms-surface h-10.5 self-start rounded-[10px] border px-4 text-sm font-semibold disabled:opacity-60"
											onclick={() => pay('qris')}>{t('create_qris')}</button
										>
									{/if}
								{:else}
									{#if detail.bank}
										<p class="bg-lms-surface-muted rounded-xl px-3.5 py-3 text-[13px] leading-5">
											{t('transfer_to', {
												bank: detail.bank.bank_name,
												number: detail.bank.account_number,
												name: detail.bank.account_name
											})}
										</p>
									{/if}
									{#if !pending}
										<TransferForm
											total={detail.totals.total_idr}
											{banks}
											proofRequired
											tried={transferTried}
											onchange={(v) => (transfer = v)}
										/>
										<button
											type="button"
											disabled={busy}
											class="lms-focus-ring bg-lms-interactive text-lms-on-interactive h-10.5 self-end rounded-[10px] px-4 text-sm font-bold disabled:opacity-60"
											onclick={sendTransfer}>{t('send_proof')}</button
										>
									{/if}
								{/if}
							</section>
						{/if}

						{#if detail.payments.length}
							<section
								class="bg-lms-surface border-lms-border flex flex-col gap-2 rounded-xl border p-5"
							>
								<h2 class="text-base font-bold">{i18n.t('invoices.payments.title')}</h2>
								{#each detail.payments as p (p.id)}
									<div
										class="border-lms-border flex flex-wrap items-center gap-3 border-t py-2.5 text-[13px]"
									>
										<span class="flex min-w-0 flex-1 flex-col gap-0.5">
											<span class="font-semibold"
												>{p.method === 'gateway'
													? i18n.t('invoices.payments.gateway', {
															channel: (p.channel ?? '').replace('va_', 'VA ').toUpperCase()
														})
													: i18n.t('invoices.payments.manual', { bank: p.bank_name || '—' })}</span
											>
											<span class="text-lms-muted text-xs"
												>{longDateTs(p.paid_at ?? p.created_at, i18n.locale)}{#if p.reject_reason}
													· {p.reject_reason}{/if}</span
											>
										</span>
										<span class="tabular-nums">{money(p.amount_idr)}</span>
										<span
											class="bg-lms-surface-muted rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
											>{i18n.t(`invoices.payments.status_${p.status}`)}</span
										>
										{#if p.has_proof}
											<!-- eslint-disable svelte/no-navigation-without-resolve -- proofHref sudah lewat resolve() di rute; hanya query id -->
											<a
												href={`${proofHref}?id=${p.id}`}
												target="_blank"
												rel="noopener"
												class="text-lms-link lms-focus-ring text-xs font-semibold"
												>{i18n.t('invoices.payments.proof')}</a
											>
											<!-- eslint-enable svelte/no-navigation-without-resolve -->
										{/if}
									</div>
								{/each}
							</section>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if paper}<PrintOverlay open={printOpen} data={paper} onclose={() => (printOpen = false)} />{/if}
	<Toast message={toast?.text ?? null} icon={toast?.icon} />
{/if}
