<script lang="ts">
	import { resolve } from '$app/paths';
	import type { BackendFailure } from '$lib/api/backend-call';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { runPageAction } from '$lib/utils/page-action';
	import Banknote from '@lucide/svelte/icons/banknote';
	import Building2 from '@lucide/svelte/icons/building-2';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import FileCheck from '@lucide/svelte/icons/file-check';
	import FileText from '@lucide/svelte/icons/file-text';
	import Hash from '@lucide/svelte/icons/hash';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Info from '@lucide/svelte/icons/info';
	import Landmark from '@lucide/svelte/icons/landmark';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Plus from '@lucide/svelte/icons/plus';
	import QrCode from '@lucide/svelte/icons/qr-code';
	import Receipt from '@lucide/svelte/icons/receipt';
	import Save from '@lucide/svelte/icons/save';
	import Search from '@lucide/svelte/icons/search';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Upload from '@lucide/svelte/icons/upload';
	import type { LucideIcon } from '@lucide/svelte';
	import {
		MANUAL_CHANNELS,
		PREFIX,
		PROOF_MAX_BYTES,
		PROOF_TYPES,
		REJECT_REASONS,
		STATUS_TONE,
		TABS,
		bankOfChannel,
		channelKey,
		displayId,
		remainingOf,
		type BankAccount,
		type ManualChannel,
		type PaymentTab,
		type PlatformPaymentList,
		type UnpaidInvoiceList
	} from '../payments.model';

	interface Props {
		list: PlatformPaymentList | null;
		unpaid: UnpaidInvoiceList | null;
		banks: BankAccount[];
		failure: BackendFailure | null;
	}

	let { list, unpaid, banks, failure }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);
	const LOCALE = $derived(i18n.locale === 'en' ? 'en-US' : 'id-ID');
	const TOAST_MS = 5000;
	const MIN_SENDER = 3;
	const MIN_REFERENCE = 4;
	const CHANNEL_ICON: Record<string, LucideIcon> = {
		transfer: Landmark,
		va: Hash,
		qris: QrCode,
		cash: Banknote
	};
	const TONE_CLASS = {
		warning: 'lms-tone-warning',
		success: 'lms-tone-success',
		danger: 'lms-tone-danger',
		neutral: 'bg-lms-surface-muted text-lms-muted'
	} as const;

	// Data dari backend; aksi mengembalikan daftar terbaru.
	// svelte-ignore state_referenced_locally
	let items = $state(list?.items ?? []);
	// svelte-ignore state_referenced_locally
	let invoices = $state(unpaid?.items ?? []);
	let selId = $state('');
	let mode = $state<'verify' | 'new'>('verify');
	let tab = $state<PaymentTab>('pending');
	let query = $state('');
	let act = $state<'verify' | 'reject'>('verify');
	let reason = $state('');
	let tried = $state(false);
	let confirmOpen = $state(false);
	let busy = $state(false);
	let toast = $state<{ text: string; error: boolean } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	const rp = (n: number) => `Rp${Math.round(n || 0).toLocaleString(LOCALE)}`;
	const fmtDate = (v: string | null | undefined, time = false) => {
		if (!v) return '—';
		const d = new Date(v);
		if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return '—';
		return d.toLocaleString(LOCALE, {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			...(time ? { hour: '2-digit', minute: '2-digit' } : {})
		});
	};
	const todayIso = () => {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	};

	function notify(text: string, error = false) {
		toast = { text, error };
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), TOAST_MS);
	}

	function errorText(code: string) {
		const key = `${PREFIX}.errors.${code}`;
		const text = i18n.t(key);
		return text === key ? t('errors.generic') : text;
	}

	type Snapshot = { list: PlatformPaymentList | null; unpaid: UnpaidInvoiceList | null };
	async function run(name: string, body: unknown): Promise<boolean> {
		busy = true;
		const out = await runPageAction<Snapshot>(name, body);
		busy = false;
		if (!out.ok) {
			notify(errorText(out.issues[0]?.code ?? out.code), true);
			return false;
		}
		if (out.data.list) items = out.data.list.items;
		if (out.data.unpaid) invoices = out.data.unpaid.items;
		return true;
	}

	// ===== Daftar =====
	const counts = $derived({
		pending: items.filter((x) => x.status === 'pending').length,
		all: items.length,
		succeeded: items.filter((x) => x.status === 'succeeded').length,
		failed: items.filter((x) => x.status === 'failed').length
	});
	const filtered = $derived(
		items.filter((x) => {
			if (tab !== 'all' && x.status !== tab) return false;
			const q = query.trim().toLowerCase();
			return (
				!q ||
				`${displayId(x.id)} ${x.invoice_number} ${x.reference} ${x.tenant_name}`
					.toLowerCase()
					.includes(q)
			);
		})
	);
	const p = $derived(items.find((x) => x.id === selId) ?? filtered[0] ?? items[0] ?? null);
	const pending = $derived(p?.status === 'pending');
	const left = $derived(p ? remainingOf(p) : 0);
	const diff = $derived(p ? p.amount_idr - left : 0);
	const statusTone = (s: string) => STATUS_TONE[s as keyof typeof STATUS_TONE] ?? 'neutral';
	const methodLabel = (x: NonNullable<typeof p>) => {
		const key = channelKey(x);
		return x.method === 'gateway' && key === 'va'
			? t('channel.va_bank', { bank: bankOfChannel(x.channel) })
			: t(`channel.${key}`);
	};
	const isImage = (name: string) => /\.(png|jpe?g)$/i.test(name);
	const proofHref = (id: string) => `${resolve(APP_PATHS.PLATFORM_INVOICE_PROOF)}?id=${id}`;

	function pick(id: string) {
		selId = id;
		mode = 'verify';
		act = 'verify';
		reason = '';
		tried = false;
	}

	async function doAction() {
		if (!p) return;
		// Snapshot setelah aksi sudah memuat pembayaran ini; simpan selisih & nomor sebelum data berganti.
		const before = { diff, invoice: p.invoice_number };
		const ok =
			act === 'verify'
				? await run('verify', { invoiceId: p.invoice_id, paymentId: p.id })
				: await run('reject', {
						invoiceId: p.invoice_id,
						paymentId: p.id,
						reason: t(`reject.${reason}`)
					});
		if (!ok) return;
		notify(
			act === 'verify'
				? before.diff >= 0
					? t('toast.verified_paid', { invoice: before.invoice })
					: t('toast.verified_partial', { left: rp(-before.diff) })
				: t('toast.rejected'),
			act !== 'verify'
		);
	}

	async function checkMutation() {
		if (!p) return;
		if (await run('mutation', { invoiceId: p.invoice_id, paymentId: p.id }))
			notify(t('toast.mutation'));
	}

	// ===== Catat pembayaran manual =====
	type Form = {
		inv: string;
		amount: string;
		date: string;
		method: ManualChannel;
		bankId: string;
		sender: string;
		ref: string;
		file: { name: string; size: number; type: string; data: string } | null;
		/** Sudah dicek di mutasi rekening → bukti transfer boleh kosong. */
		checked: boolean;
	};
	const blank = (): Form => ({
		inv: '',
		amount: '',
		date: todayIso(),
		method: 'transfer',
		bankId: banks.find((b) => b.is_default)?.id ?? banks[0]?.id ?? '',
		sender: '',
		ref: '',
		file: null,
		checked: false
	});
	let f = $state<Form>(blank());
	const fInv = $derived(invoices.find((i) => i.id === f.inv) ?? null);
	const amountValue = $derived(Number(f.amount.replace(/\D/g, '')) || 0);
	const formErrors = $derived.by(() => {
		const e: Record<string, string> = {};
		if (!fInv) e.inv = t('form.err_inv');
		if (amountValue <= 0) e.amount = t('form.err_amount');
		else if (fInv && amountValue > fInv.remaining_idr)
			e.amount = t('form.err_amount_over', { left: rp(fInv.remaining_idr) });
		if (!f.date) e.date = t('form.err_date');
		else if (f.date > todayIso()) e.date = t('form.err_date_future');
		if (f.method === 'transfer' && !f.bankId) e.bankId = t('form.err_bank_account');
		if (f.method !== 'cash' && f.sender.trim().length < MIN_SENDER) e.sender = t('form.err_sender');
		if (f.method !== 'cash' && f.ref.trim().length < MIN_REFERENCE) e.ref = t('form.err_ref');
		if (f.method === 'transfer' && !f.file && !f.checked) e.file = t('form.err_file');
		return e;
	});
	const errorCount = $derived(Object.keys(formErrors).length);
	const err = (k: string) => (tried ? (formErrors[k] ?? '') : '');

	async function onFile(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		if (!(PROOF_TYPES as readonly string[]).includes(file.type) || file.size > PROOF_MAX_BYTES) {
			notify(t('form.err_file_invalid'), true);
			return;
		}
		const buffer = new Uint8Array(await file.arrayBuffer());
		let binary = '';
		for (const byte of buffer) binary += String.fromCharCode(byte);
		f.file = { name: file.name, size: file.size, type: file.type, data: btoa(binary) };
	}

	async function saveNew() {
		if (errorCount) {
			tried = true;
			return;
		}
		const invoice = fInv;
		if (!invoice) return;
		const ok = await run('record', {
			invoiceId: invoice.id,
			payment: {
				channel: f.method,
				amount_idr: amountValue,
				paid_date: f.date,
				bank_account_id: f.method === 'transfer' ? f.bankId : '',
				sender_name: f.sender.trim(),
				reference: f.ref.trim(),
				proof: f.file
					? { file_name: f.file.name, content_type: f.file.type, data_base64: f.file.data }
					: null,
				mutation_checked: f.method !== 'cash' && f.checked
			}
		});
		if (!ok) return;
		notify(t('toast.recorded', { amount: rp(amountValue), invoice: invoice.invoice_number }));
		mode = 'verify';
		tab = 'succeeded';
		selId = items.find((x) => x.invoice_id === invoice.id && x.status === 'succeeded')?.id ?? '';
		tried = false;
	}

	const fileText = $derived(
		f.file
			? `${f.file.name} · ${Math.max(1, Math.round(f.file.size / 1024))} KB`
			: t('form.file_ph')
	);
</script>

<!-- Konsol Pembayaran (referensi FLIXARE App v4 "04f Pembayaran"): verifikasi & catat pembayaran manual. -->
<div class="text-lms-foreground flex flex-col gap-4 pb-24" data-screen-label="04f Pembayaran">
	<HeroBanner
		eyebrow={t('eyebrow')}
		title={t('title')}
		description={t('desc')}
		actionsPlacement="end"
		help="help.platform_payments"
	>
		{#snippet actions()}
			<button
				type="button"
				class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero hover:bg-lms-on-hero/14 lms-focus-ring flex h-10 items-center gap-2 rounded-[10px] border px-4 text-[13px] font-semibold"
				onclick={() => {
					mode = 'new';
					f = blank();
					tried = false;
				}}><Icon icon={Plus} size="sm" />{t('new')}</button
			>
		{/snippet}
	</HeroBanner>

	{#if failure}
		<StatePanel tone="error" title={t('load_failed')} description={t(`failure.${failure}`)} />
	{:else}
		<div class="flex flex-wrap items-start gap-4">
			<!-- Daftar -->
			<aside
				class="lms-card sticky top-21 flex max-h-[calc(100dvh-120px)] min-w-60 flex-[0_1_290px] flex-col overflow-auto rounded-xl"
			>
				<div class="border-lms-border flex flex-col gap-2.5 border-b p-3">
					<label class="relative block">
						<span class="sr-only">{t('search')}</span>
						<span class="text-lms-muted absolute top-1/2 left-3 -translate-y-1/2"
							><Icon icon={Search} size="sm" /></span
						>
						<input
							type="search"
							bind:value={query}
							placeholder={t('search')}
							class="lms-input lms-focus-ring border-lms-input-border h-9.5 w-full rounded-lg border-[1.5px] pr-3 pl-9 text-[13px]"
						/>
					</label>
					<div
						role="tablist"
						aria-label={t('tabs')}
						class="bg-lms-surface-muted grid grid-cols-2 gap-0.5 rounded-lg p-[3px]"
					>
						{#each TABS as k (k)}
							<button
								type="button"
								role="tab"
								aria-selected={tab === k}
								class="lms-focus-ring h-7.5 rounded-md text-xs font-semibold whitespace-nowrap {tab ===
								k
									? 'bg-lms-surface text-lms-foreground shadow-sm'
									: 'text-lms-muted'}"
								onclick={() => (tab = k)}>{t(`tab.${k}`, { count: counts[k] })}</button
							>
						{/each}
					</div>
				</div>
				{#each filtered as x (x.id)}
					{@const sel = mode === 'verify' && x.id === p?.id}
					<button
						type="button"
						class="border-lms-border lms-focus-ring flex items-center gap-2.5 border-b px-3.5 py-3 text-left {sel
							? 'bg-lms-interactive-subtle shadow-[inset_3px_0_0_var(--color-lms-interactive)]'
							: 'hover:bg-lms-surface-muted'}"
						onclick={() => pick(x.id)}
					>
						<span
							class="bg-lms-surface-muted text-lms-muted flex size-8.5 flex-none items-center justify-center rounded-lg"
							><Icon icon={CHANNEL_ICON[channelKey(x)] ?? Landmark} size="sm" /></span
						>
						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="truncate text-[13px] font-bold">{x.tenant_name}</span>
							<span class="text-lms-muted truncate font-mono text-[11px]"
								>{methodLabel(x)} · {fmtDate(x.paid_at || x.created_at)}</span
							>
						</span>
						<span class="flex flex-col items-end gap-1">
							<span class="text-[13px] font-bold whitespace-nowrap tabular-nums"
								>{rp(x.amount_idr)}</span
							>
							<span
								class="rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em] {TONE_CLASS[
									statusTone(x.status)
								]}">{t(`status.${x.status}`)}</span
							>
						</span>
					</button>
				{:else}
					<div
						class="text-lms-muted flex flex-col items-center gap-1.5 px-4 py-7 text-center text-[13px]"
					>
						<span class="text-lms-success-text"><Icon icon={CircleCheck} /></span>{t('empty')}
					</div>
				{/each}
			</aside>

			<!-- Detail / form -->
			<div class="flex min-w-0 flex-[1_1_440px] flex-col gap-3.5">
				{#if mode === 'verify' && p}
					<section class="lms-card flex flex-col gap-4 rounded-xl p-5">
						<div class="flex flex-wrap items-center gap-3.5">
							<div class="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
								<span class="text-lg font-bold">{p.tenant_name}</span>
								<span class="text-lms-muted font-mono text-xs"
									>{displayId(p.id)} · {p.invoice_number}</span
								>
							</div>
							<span
								class="rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] {TONE_CLASS[
									statusTone(p.status)
								]}">{t(`status.${p.status}`)}</span
							>
						</div>
						<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-3">
							<div
								class="bg-lms-background border-lms-border flex flex-col gap-1 rounded-[10px] border p-3"
							>
								<span class="text-lms-muted text-xs">{t('compare.remaining')}</span>
								<span class="text-lg font-bold tabular-nums">{rp(left)}</span>
							</div>
							<div
								class="bg-lms-background border-lms-border flex flex-col gap-1 rounded-[10px] border p-3"
							>
								<span class="text-lms-muted text-xs">{t('compare.paid')}</span>
								<span class="text-lg font-bold tabular-nums">{rp(p.amount_idr)}</span>
							</div>
							<div
								class="flex flex-col gap-1 rounded-[10px] p-3 {!pending
									? 'bg-lms-background'
									: diff === 0
										? 'lms-tone-success'
										: 'lms-tone-warning'}"
							>
								<span class="text-xs opacity-80">{t('compare.diff')}</span>
								<span class="text-lg font-bold tabular-nums"
									>{!pending
										? '—'
										: diff === 0
											? 'Rp0'
											: `${diff > 0 ? '+' : '−'}${rp(Math.abs(diff))}`}</span
								>
							</div>
						</div>
						<span
							class="flex items-start gap-2 text-[13px] leading-[19px] {!pending
								? 'text-lms-muted'
								: diff === 0
									? 'text-lms-success-text'
									: 'text-lms-warning-text'}"
						>
							<Icon icon={!pending ? Info : diff === 0 ? CircleCheck : TriangleAlert} size="sm" />
							{#if !pending}
								{p.status === 'succeeded'
									? t('diff.verified_by', {
											by: p.method === 'gateway' ? t('auto_gateway') : p.verifier_name || '—',
											at: fmtDate(p.verified_at || p.paid_at, true)
										})
									: t('diff.rejected', {
											reason: p.reject_reason || '—',
											by: p.verifier_name || '—'
										})}
							{:else if diff === 0}
								{t('diff.exact')}
							{:else if diff < 0}
								{t('diff.short', { amount: rp(-diff) })}
							{:else}
								{t('diff.over', { amount: rp(diff) })}
							{/if}
						</span>
					</section>

					<div class="flex flex-wrap items-stretch gap-3.5">
						<section class="lms-card flex min-w-0 flex-[1_1_260px] flex-col gap-3 rounded-xl p-5">
							<span class="text-base font-bold">{t('proof.title')}</span>
							{#if p.has_proof}
								<!-- eslint-disable svelte/no-navigation-without-resolve -- proofHref sudah lewat resolve(); hanya query id -->
								<a
									href={proofHref(p.id)}
									target="_blank"
									rel="noopener"
									class="border-lms-border bg-lms-surface-muted lms-focus-ring flex max-h-[340px] flex-col items-center justify-center gap-2 overflow-hidden rounded-[10px] border p-3"
								>
									{#if isImage(p.proof_name)}
										<img
											src={proofHref(p.id)}
											alt={t('proof.title')}
											class="max-h-[300px] rounded-md object-contain"
										/>
									{:else}
										<span class="text-lms-muted"><Icon icon={FileText} /></span>
									{/if}
									<span class="text-lms-muted flex items-center gap-1.5 font-mono text-[11px]"
										><Icon
											icon={isImage(p.proof_name) ? ImageIcon : FileText}
											size="sm"
										/>{p.proof_name}</span
									>
								</a>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							{:else}
								<div
									class="bg-lms-surface-muted text-lms-muted rounded-[10px] p-6 text-center text-[13px]"
								>
									{p.method === 'gateway'
										? t('proof.gateway', { method: methodLabel(p) })
										: t('proof.none')}
								</div>
							{/if}
						</section>
						<section class="lms-card flex min-w-0 flex-[1_1_260px] flex-col gap-3 rounded-xl p-5">
							<span class="text-base font-bold">{t('detail.title')}</span>
							<dl class="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-[13px]">
								{#each [[t('detail.method'), methodLabel(p)], [t('detail.time'), fmtDate(p.paid_at || p.created_at, true)], [t('detail.sender'), p.sender_name || p.va_number || p.bank_account || '—'], [t('detail.reference'), p.reference || '—'], [t('detail.invoice'), p.invoice_number], [t('detail.due'), fmtDate(p.due_at)]] as [k, v] (k)}
									<dt class="text-lms-muted">{k}</dt>
									<dd class="text-right font-semibold break-all">{v}</dd>
								{/each}
							</dl>
							{#if p.method === 'manual_transfer' && p.manual_channel !== 'cash'}
								<div
									class="flex flex-wrap items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] {p.mutation_checked_at
										? 'lms-tone-success'
										: 'bg-lms-background text-lms-link'}"
								>
									<Icon icon={p.mutation_checked_at ? CircleCheck : Search} size="sm" />
									<span class="flex-1">
										{p.mutation_checked_at
											? t('mutation.checked', {
													by: p.mutation_checker_name || '—',
													at: fmtDate(p.mutation_checked_at, true)
												})
											: t('mutation.unchecked')}
									</span>
									{#if pending && !p.mutation_checked_at}
										<button
											type="button"
											class="lms-action-secondary lms-focus-ring h-8 rounded-lg px-3 text-xs font-bold disabled:opacity-60"
											disabled={busy}
											onclick={checkMutation}>{t('mutation.mark')}</button
										>
									{/if}
								</div>
							{/if}
						</section>
					</div>

					{#if pending}
						<section class="lms-card flex flex-col gap-3.5 rounded-xl p-5">
							<span class="text-base font-bold">{t('action.title')}</span>
							<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2">
								{#each [{ k: 'verify', icon: CircleCheck, tone: 'text-lms-success-text', on: 'border-lms-success-text bg-lms-success-subtle' }, { k: 'reject', icon: CircleX, tone: 'text-lms-danger-text', on: 'border-lms-danger-text bg-lms-danger-subtle' }] as o (o.k)}
									<button
										type="button"
										aria-pressed={act === o.k}
										class="lms-focus-ring flex items-center gap-2.5 rounded-[10px] border-[1.5px] px-3.5 py-3 text-left {act ===
										o.k
											? o.on
											: 'border-lms-border bg-lms-surface'}"
										onclick={() => {
											act = o.k as typeof act;
											tried = false;
										}}
									>
										<span class={o.tone}><Icon icon={o.icon} /></span>
										<span class="flex flex-col gap-0.5"
											><span class="text-sm font-bold">{t(`action.${o.k}`)}</span><span
												class="text-lms-muted text-xs">{t(`action.${o.k}_sub`)}</span
											></span
										>
									</button>
								{/each}
							</div>
							{#if act === 'reject'}
								<div class="flex flex-col gap-2">
									<span class="text-[13px] font-semibold">{t('reject.title')}</span>
									<div class="flex flex-wrap gap-2">
										{#each REJECT_REASONS as r (r)}
											<button
												type="button"
												aria-pressed={reason === r}
												class="lms-focus-ring h-8.5 rounded-full border-[1.5px] px-3 text-[13px] font-semibold {reason ===
												r
													? 'border-lms-danger-text bg-lms-danger-subtle'
													: 'border-lms-border-strong bg-lms-surface'}"
												onclick={() => (reason = r)}>{t(`reject.${r}`)}</button
											>
										{/each}
									</div>
									<span
										class="text-xs {tried && !reason ? 'text-lms-danger-text' : 'text-lms-muted'}"
										>{tried && !reason ? t('reject.required') : t('reject.hint')}</span
									>
								</div>
							{:else}
								<span class="text-lms-muted text-xs"
									>{p.mutation_checked_at
										? t('action.verify_ready')
										: t('action.verify_hint')}</span
								>
							{/if}
						</section>
						<div
							class="lms-card sticky bottom-0 z-5 flex flex-wrap items-center gap-2.5 rounded-xl! py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--color-lms-brand-deep-neutral)_40%,transparent)]!"
						>
							<span
								class="flex flex-[1_1_200px] items-center gap-1.5 text-[13px] {tried &&
								act === 'reject' &&
								!reason
									? 'text-lms-danger-text'
									: 'text-lms-muted'}"
							>
								<Icon icon={tried && act === 'reject' && !reason ? CircleAlert : Info} size="sm" />
								{tried && act === 'reject' && !reason
									? t('reject.required')
									: act === 'verify'
										? diff >= 0
											? t('bar.paid')
											: t('bar.partial')
										: t('bar.reject')}
							</span>
							<button
								type="button"
								class="lms-focus-ring flex h-10.5 items-center gap-2 rounded-[10px] px-4.5 text-sm font-bold disabled:opacity-60 {act ===
								'verify'
									? 'lms-action-primary'
									: 'lms-action-destructive'}"
								disabled={busy}
								onclick={() => {
									if (act === 'reject' && !reason) {
										tried = true;
										return;
									}
									confirmOpen = true;
								}}
								><Icon icon={act === 'verify' ? CircleCheck : CircleX} size="sm" />{t(
									`action.go_${act}`
								)}</button
							>
						</div>
					{/if}
				{:else if mode === 'verify'}
					<StatePanel title={t('no_selection_title')} description={t('no_selection_desc')} />
				{/if}

				{#if mode === 'new'}
					<section class="lms-card flex flex-col gap-5 rounded-xl p-6">
						<div class="flex flex-wrap items-baseline justify-between gap-3">
							<span class="text-base font-bold">{t('form.title')}</span>
							<span class="text-lms-muted text-xs">{t('form.sub')}</span>
						</div>
						<div class="flex flex-col gap-2.5">
							<span class="text-[13px] font-bold">{t('form.invoice')}</span>
							{#each invoices as o (o.id)}
								{@const on = f.inv === o.id}
								<button
									type="button"
									aria-pressed={on}
									class="lms-focus-ring flex items-center gap-4 rounded-[10px] border-[1.5px] px-4 py-3 text-left {on
										? 'border-lms-interactive bg-lms-interactive-subtle'
										: err('inv')
											? 'border-lms-danger-text'
											: 'border-lms-border bg-lms-surface'}"
									onclick={() => {
										f.inv = o.id;
										if (o.bank_account_id) f.bankId = o.bank_account_id;
									}}
								>
									<span
										class="size-4 flex-none rounded-full {on
											? 'border-lms-interactive border-[5px]'
											: 'border-lms-border-strong border-2'}"
									></span>
									<span class="flex min-w-0 flex-1 flex-col gap-0.5">
										<span class="text-sm font-semibold">{o.tenant_name}</span>
										<span class="text-lms-muted font-mono text-[11px]"
											>{o.invoice_number} · {fmtDate(o.due_at)}</span
										>
									</span>
									<span class="flex flex-col items-end gap-0.5">
										<span class="text-sm font-bold tabular-nums">{rp(o.remaining_idr)}</span>
										<span class="text-lms-muted text-[11px]"
											>{o.paid_amount_idr
												? t('form.left_of', { total: rp(o.total_idr) })
												: t('form.unpaid')}</span
										>
									</span>
								</button>
							{:else}
								<div
									class="bg-lms-surface-muted text-lms-muted rounded-[10px] p-6 text-center text-[13px]"
								>
									{t('form.no_invoices')}
								</div>
							{/each}
							{#if err('inv')}<span class="text-lms-danger-text text-xs">{err('inv')}</span>{/if}
						</div>

						<div
							class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] items-start gap-4"
						>
							<div class="flex flex-col gap-1.5">
								<label for="pay-amount" class="text-[13px] font-bold">{t('form.amount')}</label>
								<div
									class="bg-lms-surface flex overflow-hidden rounded-[10px] border-[1.5px] {err(
										'amount'
									)
										? 'border-lms-danger-text'
										: 'border-lms-input-border'}"
								>
									<span
										class="bg-lms-surface-muted text-lms-muted flex items-center px-3 text-[13px] font-semibold"
										>Rp</span
									>
									<input
										id="pay-amount"
										inputmode="numeric"
										value={amountValue ? amountValue.toLocaleString(LOCALE) : ''}
										oninput={(e) => (f.amount = e.currentTarget.value)}
										class="lms-focus-ring h-10 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold tabular-nums"
									/>
									<button
										type="button"
										class="border-lms-border text-lms-link lms-focus-ring border-l px-3 text-xs font-bold disabled:opacity-50"
										disabled={!fInv}
										onclick={() => fInv && (f.amount = String(fInv.remaining_idr))}
										>{t('form.full')}</button
									>
								</div>
								<span
									class="text-xs {err('amount')
										? 'text-lms-danger-text'
										: fInv && amountValue === fInv.remaining_idr
											? 'text-lms-success-text'
											: 'text-lms-muted'}"
								>
									{err('amount') ||
										(fInv && amountValue
											? amountValue === fInv.remaining_idr
												? t('form.amount_full')
												: t('form.amount_left', {
														left: rp(Math.max(0, fInv.remaining_idr - amountValue))
													})
											: t('form.amount_hint'))}
								</span>
							</div>
							<label class="flex flex-col gap-1.5">
								<span class="text-[13px] font-bold">{t('form.date')}</span>
								<input
									type="date"
									max={todayIso()}
									bind:value={f.date}
									class="lms-input lms-focus-ring h-10.5 rounded-[10px] border-[1.5px] px-3 text-sm {err(
										'date'
									)
										? 'border-lms-danger-text'
										: 'border-lms-input-border'}"
								/>
								{#if err('date')}<span class="text-lms-danger-text text-xs">{err('date')}</span
									>{/if}
							</label>
						</div>

						<div class="flex flex-col gap-2.5">
							<span class="text-[13px] font-bold">{t('form.method')}</span>
							<div
								role="radiogroup"
								aria-label={t('form.method')}
								class="bg-lms-surface-muted flex flex-wrap gap-0.5 rounded-lg p-1"
							>
								{#each MANUAL_CHANNELS as m (m)}
									<button
										type="button"
										role="radio"
										aria-checked={f.method === m}
										class="lms-focus-ring h-9 flex-1 rounded-md px-2 text-[13px] font-bold whitespace-nowrap {f.method ===
										m
											? 'bg-lms-surface text-lms-foreground shadow-sm'
											: 'text-lms-muted'}"
										onclick={() => (f.method = m)}>{t(`channel.${m}`)}</button
									>
								{/each}
							</div>
						</div>

						<div
							class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] items-start gap-4"
						>
							{#if f.method === 'transfer'}
								<label class="flex flex-col gap-1.5">
									<span class="text-[13px] font-bold">{t('form.bank_account')}</span>
									<select
										bind:value={f.bankId}
										class="lms-input lms-focus-ring h-10.5 rounded-[10px] border-[1.5px] px-3 text-sm {err(
											'bankId'
										)
											? 'border-lms-danger-text'
											: 'border-lms-input-border'}"
									>
										{#each banks as b (b.id)}<option value={b.id}
												>{b.bank_name} · {b.account_number}</option
											>{/each}
									</select>
									{#if err('bankId')}<span class="text-lms-danger-text text-xs"
											>{err('bankId')}</span
										>{/if}
								</label>
							{/if}
							{#if f.method !== 'cash'}
								<label class="flex flex-col gap-1.5">
									<span class="text-[13px] font-bold">{t('form.sender')}</span>
									<input
										bind:value={f.sender}
										placeholder={t('form.sender_ph')}
										class="lms-input lms-focus-ring h-10.5 rounded-[10px] border-[1.5px] px-3 text-sm {err(
											'sender'
										)
											? 'border-lms-danger-text'
											: 'border-lms-input-border'}"
									/>
									{#if err('sender')}<span class="text-lms-danger-text text-xs"
											>{err('sender')}</span
										>{/if}
								</label>
								<label class="flex flex-col gap-1.5">
									<span class="text-[13px] font-bold">{t('form.ref')}</span>
									<input
										bind:value={f.ref}
										placeholder={t('form.ref_ph')}
										class="lms-input lms-focus-ring h-10.5 rounded-[10px] border-[1.5px] px-3 font-mono text-sm {err(
											'ref'
										)
											? 'border-lms-danger-text'
											: 'border-lms-input-border'}"
									/>
									{#if err('ref')}<span class="text-lms-danger-text text-xs">{err('ref')}</span
										>{/if}
								</label>
							{/if}
						</div>

						{#if f.method !== 'cash'}
							<label class="flex items-start gap-2.5 text-[13px]">
								<input
									type="checkbox"
									class="lms-focus-ring mt-0.5 size-4 accent-current"
									bind:checked={f.checked}
								/>
								<span class="flex flex-col gap-0.5">
									<span class="font-semibold">{t('form.checked')}</span>
									<span class="text-lms-muted text-xs">{t('form.checked_hint')}</span>
								</span>
							</label>
						{/if}
						<div class="flex flex-col gap-1.5">
							<span class="text-[13px] font-bold"
								>{t('form.proof')}
								<span class="text-lms-muted font-normal">{t('form.proof_hint')}</span>
								{#if f.method !== 'transfer' || f.checked}<span class="text-lms-muted font-normal"
										>· {t('form.optional')}</span
									>{/if}</span
							>
							<label
								class="lms-focus-ring bg-lms-surface-muted flex cursor-pointer flex-wrap items-center gap-3 rounded-[10px] border-[1.5px] border-dashed px-4 py-3.5 {err(
									'file'
								)
									? 'border-lms-danger-text'
									: 'border-lms-border-strong'}"
							>
								<span class="text-lms-interactive"
									><Icon icon={f.file ? FileCheck : Upload} size="sm" /></span
								>
								<span class="min-w-0 flex-1 truncate text-[13px] font-semibold">{fileText}</span>
								<span class="lms-action-secondary rounded-md px-3 py-1.5 text-xs font-bold"
									>{t('form.pick')}</span
								>
								<input
									type="file"
									accept={PROOF_TYPES.join(',')}
									class="sr-only"
									onchange={onFile}
								/>
							</label>
							{#if err('file')}<span class="text-lms-danger-text text-xs">{err('file')}</span>{/if}
						</div>
					</section>
					<div
						class="lms-card sticky bottom-0 z-5 flex flex-wrap items-center gap-2.5 rounded-xl! py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--color-lms-brand-deep-neutral)_40%,transparent)]!"
					>
						<span
							class="flex flex-[1_1_200px] items-center gap-1.5 text-[13px] {tried && errorCount
								? 'text-lms-danger-text'
								: 'text-lms-muted'}"
						>
							<Icon icon={tried && errorCount ? CircleAlert : Info} size="sm" />
							{tried && errorCount
								? t('form.bar_errors', { count: errorCount })
								: t('form.bar_info')}
						</span>
						<button
							type="button"
							class="lms-action-secondary lms-focus-ring h-10.5 rounded-[10px] px-4 text-sm font-semibold"
							onclick={() => ((mode = 'verify'), (tried = false))}>{t('form.cancel')}</button
						>
						<button
							type="button"
							class="lms-action-primary lms-focus-ring flex h-10.5 items-center gap-2 rounded-[10px] px-4.5 text-sm font-bold disabled:opacity-60"
							disabled={busy}
							onclick={saveNew}><Icon icon={Save} size="sm" />{t('form.save')}</button
						>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

{#if p}
	<ConfirmDialog
		bind:open={confirmOpen}
		tone={act === 'verify' ? 'primary' : 'danger'}
		icon={act === 'verify' ? CircleCheck : CircleX}
		title={act === 'verify'
			? t('confirm.verify_title', { amount: rp(p.amount_idr) })
			: t('confirm.reject_title')}
		message={act === 'verify'
			? diff >= 0
				? t('confirm.verify_paid', { invoice: p.invoice_number })
				: t('confirm.verify_partial', { left: rp(-diff) })
			: t('confirm.reject_message')}
		details={act === 'verify'
			? [
					{ icon: Building2, label: t('confirm.tenant'), value: p.tenant_name },
					{ icon: Receipt, label: t('confirm.invoice'), value: p.invoice_number }
				]
			: [
					{
						icon: MessageSquare,
						label: t('confirm.reason'),
						value: reason ? t(`reject.${reason}`) : '—'
					}
				]}
		confirmLabel={act === 'verify' ? t('confirm.verify_label') : t('confirm.reject_label')}
		confirmIcon={act === 'verify' ? CircleCheck : CircleX}
		busyLabel={t('confirm.busy')}
		cancelLabel={t('form.cancel')}
		onconfirm={doAction}
	/>
{/if}
<Toast message={toast?.text ?? null} icon={toast?.error ? CircleAlert : CircleCheck} />
