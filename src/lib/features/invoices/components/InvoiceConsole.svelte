<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { BackendFailure } from '$lib/api/backend-call';
	import ConfirmDialog, { type ConfirmDialogDetail } from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { useI18n } from '$lib/i18n';
	import { runPageAction } from '$lib/utils/page-action';
	import type { LucideIcon } from '@lucide/svelte';
	import AlarmClock from '@lucide/svelte/icons/alarm-clock';
	import Ban from '@lucide/svelte/icons/ban';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Copy from '@lucide/svelte/icons/copy';
	import FileText from '@lucide/svelte/icons/file-text';
	import Info from '@lucide/svelte/icons/info';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Lock from '@lucide/svelte/icons/lock';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Printer from '@lucide/svelte/icons/printer';
	import Search from '@lucide/svelte/icons/search';
	import Send from '@lucide/svelte/icons/send';
	import Settings from '@lucide/svelte/icons/settings';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Wallet from '@lucide/svelte/icons/wallet';
	import WandSparkles from '@lucide/svelte/icons/wand-sparkles';
	import { untrack } from 'svelte';
	import {
		STATUS_TONE,
		TABS,
		TERMS_OPTIONS,
		addDays,
		calcTotals,
		emptyForm,
		emptyRow,
		formErrors,
		formFromDetail,
		inTab,
		longDate,
		longDateTs,
		pendingProof,
		rowsFromSubscription,
		rupiah,
		terbilang,
		toDraftInput,
		todayJakarta,
		type BillingSettings,
		type InvoiceDetail,
		type InvoiceForm,
		type InvoiceList,
		type InvoiceOptions,
		type InvoiceStatus,
		type InvoiceSummary,
		type InvoiceTab
	} from '../invoices.model';
	import type { PaperData } from './InvoicePaper.svelte';
	import InvoiceModal from './InvoiceModal.svelte';
	import PrintOverlay from './PrintOverlay.svelte';
	import SettingsModal from './SettingsModal.svelte';
	import TransferForm, { type TransferPayload } from './TransferForm.svelte';

	/**
	 * Invoice konsol platform (referensi "04e Invoice"): daftar + filter, editor draf, terbitkan & kirim,
	 * batalkan, pengingat, catat/verifikasi pembayaran, pratinjau & cetak A4. Semua angka & status dari
	 * backend; invoice yang sudah terbit terkunci (koreksi = batalkan lalu buat ulang).
	 */
	interface Props {
		list: InvoiceList | null;
		options: InvoiceOptions | null;
		selected: InvoiceDetail | null;
		failure: BackendFailure | null;
	}

	let {
		list: initialList,
		options: initialOptions,
		selected: initialSelected,
		failure
	}: Props = $props();

	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`invoices.${key}`, params);
	const money = (n: number) => rupiah(n, i18n.locale);
	const TOAST_MS = 5000;

	// svelte-ignore state_referenced_locally
	let items = $state<InvoiceSummary[]>(initialList?.items ?? []);
	// svelte-ignore state_referenced_locally
	let settings = $state<BillingSettings | null>(initialOptions?.settings ?? null);
	const tenants = $derived(initialOptions?.tenants ?? []);
	// svelte-ignore state_referenced_locally
	let detail = $state<InvoiceDetail | null>(initialSelected);
	let tab = $state<InvoiceTab>('all');
	let query = $state('');
	let tried = $state(false);
	let busy = $state(false);
	let printOpen = $state(false);
	let settingsOpen = $state(false);
	let confirm = $state<'issue' | 'void' | 'delete' | null>(null);
	let voidReason = $state('');
	let paymentOpen = $state(false);
	let paymentTried = $state(false);
	let payment = $state<TransferPayload | null>(null);
	let rejectId = $state<string | null>(null);
	let rejectReason = $state('');
	let toast = $state<{ text: string; icon: LucideIcon } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	const today = todayJakarta();
	const defaultPeriodLabel = () =>
		new Date().toLocaleDateString(i18n.locale === 'en' ? 'en-GB' : 'id-ID', {
			month: 'long',
			year: 'numeric',
			timeZone: 'Asia/Jakarta'
		});

	// Form awal disiapkan sinkron (SSR); selanjutnya mengikuti invoice terpilih (draf baru = form kosong).
	const initialForm = (): InvoiceForm | null =>
		initialSelected
			? formFromDetail(initialSelected)
			: initialOptions
				? emptyForm(initialOptions.settings, today, defaultPeriodLabel())
				: null;
	const startForm = initialForm();
	let form = $state<InvoiceForm | null>(startForm);
	let baseline = $state(JSON.stringify(startForm));

	$effect(() => {
		const d = detail;
		untrack(() => {
			if (d) setForm(formFromDetail(d));
		});
	});

	function setForm(f: InvoiceForm) {
		form = f;
		baseline = JSON.stringify(f);
		tried = false;
	}

	function startNew() {
		if (!settings) return;
		detail = null;
		setForm(emptyForm(settings, today, defaultPeriodLabel()));
		syncUrl(null);
	}

	const status = $derived<InvoiceStatus>(detail?.status ?? 'draft');
	const locked = $derived(status !== 'draft');
	const dirty = $derived(!!form && JSON.stringify(form) !== baseline);
	const totals = $derived(form ? calcTotals(form) : null);
	const errors = $derived(form ? formErrors(form) : {});
	const errorCount = $derived(Object.keys(errors).length);
	const tenant = $derived(tenants.find((x) => x.id === form?.tenantId) ?? null);
	const dueIso = $derived(
		locked && detail?.due_at
			? new Date(detail.due_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
			: form
				? addDays(form.issueDate, form.termsDays)
				: ''
	);
	const proof = $derived(pendingProof(detail));
	const banks = $derived(settings?.bank_accounts ?? []);
	const visible = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return items.filter(
			(x) =>
				inTab(x.status, tab) &&
				`${x.number ?? ''} ${x.tenant_name} ${x.tenant_code}`.toLowerCase().includes(q)
		);
	});

	function syncUrl(id: string | null) {
		const url = new URL(window.location.href);
		if (id) url.searchParams.set('id', id);
		else url.searchParams.delete('id');
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- path halaman yang sama, hanya query `id`
		replaceState(url, {});
	}

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
			notify(t(`failure.${KNOWN_FAILURES.includes(code) ? code : 'generic'}`), CircleAlert);
			return null;
		}
		if (result.data.list) items = result.data.list.items;
		return result.data;
	}
	const KNOWN_FAILURES = [
		'invalid_transition',
		'reminder_too_soon',
		'gateway_unavailable',
		'email_missing',
		'rows_required',
		'amount_mismatch',
		'proof_invalid',
		'min_length',
		'forbidden'
	];

	async function pick(x: InvoiceSummary) {
		if (x.id === detail?.id) return;
		const out = await run('get', { id: x.id });
		if (out) {
			detail = out.detail;
			syncUrl(out.detail.id);
		}
	}

	async function saveDraft(silent = false): Promise<InvoiceDetail | null> {
		if (!form) return null;
		if (!form.tenantId) {
			tried = true;
			notify(t('err.tenant'), Info);
			return null;
		}
		const out = await run('save', { id: detail?.id, draft: toDraftInput(form) });
		if (!out) return null;
		detail = out.detail;
		setForm(formFromDetail(out.detail));
		syncUrl(out.detail.id);
		if (!silent) notify(t('toast.saved'));
		return out.detail;
	}

	function askIssue() {
		tried = true;
		if (errorCount) return;
		confirm = 'issue';
	}

	async function doIssue() {
		const saved = dirty || !detail ? await saveDraft(true) : detail;
		if (!saved) return;
		const out = await run('issue', { id: saved.id });
		if (out) {
			detail = out.detail;
			notify(t('toast.issued', { number: out.detail.number ?? '' }), Send);
		}
	}

	async function doVoid() {
		if (!detail) return;
		const out = await run('void', { id: detail.id, reason: voidReason });
		if (out) {
			detail = out.detail;
			voidReason = '';
			notify(t('toast.voided', { number: out.detail.number ?? '' }), Ban);
		}
	}

	async function doDelete() {
		if (!detail) return;
		const id = detail.id;
		const out = await run('remove', { id });
		if (out) {
			items = items.filter((x) => x.id !== id);
			startNew();
			notify(t('toast.deleted'), Trash2);
		}
	}

	async function remind() {
		if (!detail) return;
		const out = await run('remind', { id: detail.id });
		if (out) notify(t('toast.reminded', { email: out.detail.bill_to.email }), BellRing);
	}

	async function duplicate() {
		if (!detail) return;
		const out = await run('duplicate', { id: detail.id });
		if (out) {
			detail = out.detail;
			syncUrl(out.detail.id);
			notify(t('toast.duplicated'), Copy);
		}
	}

	async function recordPayment() {
		paymentTried = true;
		if (!detail || !payment) return;
		const out = await run('record', { id: detail.id, payment });
		if (out) {
			detail = out.detail;
			paymentOpen = false;
			notify(t('toast.paid', { number: out.detail.number ?? '' }));
		}
	}

	async function verify(paymentId: string) {
		if (!detail) return;
		const out = await run('verify', { id: detail.id, paymentId });
		if (out) {
			detail = out.detail;
			notify(t('toast.paid', { number: out.detail.number ?? '' }));
		}
	}

	async function reject() {
		if (!detail || !rejectId) return;
		const out = await run('reject', { id: detail.id, paymentId: rejectId, reason: rejectReason });
		if (out) {
			detail = out.detail;
			rejectId = null;
			rejectReason = '';
			notify(t('toast.rejected'), Ban);
		}
	}

	function fillFromPlan() {
		if (!form) return;
		if (!tenant) {
			tried = true;
			notify(t('err.tenant'), Info);
			return;
		}
		if (!tenant.plan_name) {
			notify(t('editor.no_subscription'), Info);
			return;
		}
		form.subscriptionId = tenant.subscription_id ?? '';
		form.rows = rowsFromSubscription(tenant, form.periodLabel, {
			plan: t('editor.plan_prefix'),
			seat: t('editor.unit_student'),
			month: t('editor.unit_month'),
			year: t('editor.unit_year'),
			package: t('editor.unit_package'),
			yearly: t('editor.yearly')
		});
	}

	function onTenant(id: string) {
		if (!form || locked) return;
		form.tenantId = id;
		form.subscriptionId = '';
	}

	const digits = (v: string) => v.replace(/\D/g, '');

	// ===== Tampilan =====

	const statusLabel = (s: InvoiceStatus) => t(`status.${s}`);
	const dueLine = (x: InvoiceSummary) =>
		x.status === 'paid'
			? t('list.paid')
			: x.status === 'void'
				? t('list.void')
				: x.status === 'draft'
					? t('list.draft')
					: t('list.due', { date: longDateTs(x.due_at, i18n.locale) });

	const banner = $derived.by(() => {
		if (!detail || status === 'draft') return null;
		if (status === 'paid')
			return {
				tone: 'lms-tone-success',
				icon: CircleCheck,
				title: t('banner.paid_title'),
				text: t('banner.paid_text', { date: longDateTs(detail.paid_at, i18n.locale) }),
				actions: [
					{
						key: 'receipt',
						label: t('banner.print_receipt'),
						icon: Printer,
						run: () => (printOpen = true)
					}
				]
			};
		if (status === 'void')
			return {
				tone: 'lms-tone-danger',
				icon: Ban,
				title: t('banner.void_title'),
				text: t('banner.void_text', { reason: detail.void_reason || '—' }),
				actions: [{ key: 'dupe', label: t('banner.duplicate'), icon: Copy, run: duplicate }]
			};
		return {
			tone: status === 'overdue' ? 'lms-tone-warning' : 'lms-tone-info',
			icon: status === 'overdue' ? AlarmClock : Send,
			title: status === 'overdue' ? t('banner.overdue_title') : t('banner.issued_title'),
			text: t('banner.issued_text', { email: detail.bill_to.email }),
			actions: [
				{ key: 'remind', label: t('banner.remind'), icon: BellRing, run: remind },
				{
					key: 'record',
					label: t('banner.record'),
					icon: Wallet,
					run: () => ((paymentTried = false), (paymentOpen = true))
				},
				{ key: 'void', label: t('banner.void'), icon: Ban, run: () => (confirm = 'void') }
			]
		};
	});

	const sums = $derived.by(() => {
		if (!form || !totals) return [];
		return [
			{ k: t('sum.subtotal'), v: money(totals.subtotal) },
			...(totals.discount
				? [
						{
							k: `${t('sum.discount')}${form.discountType === 'percent' ? ` ${form.discountValue}%` : ''}`,
							v: `−${money(totals.discount)}`
						}
					]
				: []),
			{ k: 'DPP', v: money(totals.dpp) },
			{ k: t('sum.vat'), v: form.taxEnabled ? money(totals.tax) : t('sum.no_vat') }
		];
	});

	const barState = $derived.by((): { text: string; icon: LucideIcon; tone: string } => {
		if (tried && errorCount)
			return {
				text: t('bar.errors', { n: errorCount }),
				icon: CircleAlert,
				tone: 'text-lms-danger-text'
			};
		if (locked)
			return {
				text: t('bar.locked', { status: statusLabel(status).toLowerCase() }),
				icon: Lock,
				tone: 'text-lms-muted'
			};
		if (dirty || !detail)
			return { text: t('bar.unsaved'), icon: Pencil, tone: 'text-lms-warning-text' };
		return { text: t('bar.saved'), icon: CircleCheck, tone: 'text-lms-muted' };
	});

	const paper = $derived.by((): PaperData | null => {
		if (!form || !totals || !settings) return null;
		const issued = locked ? detail : null;
		const bank = issued ? issued.bank : (banks.find((b) => b.id === form?.bankAccountId) ?? null);
		const billTo = issued
			? issued.bill_to
			: {
					name: tenant?.name ?? t('paper_empty.tenant'),
					address: tenant?.address || t('paper_empty.address'),
					pic: tenant?.pic ?? '—',
					email: tenant?.email ?? '—',
					tenant_code: tenant?.code ?? '—'
				};
		const va = detail?.va?.va_number
			? {
					bank: (detail.va.channel ?? '').replace('va_', '').toUpperCase(),
					number: detail.va.va_number,
					billerCode: detail.va.biller_code
				}
			: null;
		return {
			number: detail?.number ?? null,
			status,
			issuer: issued ? issued.issuer : settings.issuer,
			billTo,
			issueDate: form.issueDate,
			dueDate: dueIso,
			period: form.periodLabel,
			lines: form.rows.map((r) => ({
				description: r.description,
				quantity: Number(r.quantity) || 0,
				unitLabel: r.unitLabel,
				unitPrice: Number(r.unitPrice) || 0
			})),
			subtotal: totals.subtotal,
			discount: totals.discount,
			discountLabel: `${t('sum.discount')}${form.discountType === 'percent' ? ` ${form.discountValue}%` : ''}`,
			dpp: totals.dpp,
			taxEnabled: form.taxEnabled,
			tax: totals.tax,
			total: totals.total,
			bank,
			va,
			note: form.note || (issued ? issued.default_note : settings.default_note)
		};
	});

	const confirmContent = $derived.by(() => {
		if (!confirm || !totals) return null;
		const name = tenant?.name ?? detail?.tenant_name ?? '';
		const total: ConfirmDialogDetail = {
			icon: Wallet,
			label: t('confirm.total'),
			value: money(totals.total)
		};
		if (confirm === 'issue')
			return {
				tone: 'primary' as const,
				icon: Send,
				title: t('confirm.issue_title'),
				message: t('confirm.issue_message', {
					email: tenant?.email ?? detail?.bill_to.email ?? ''
				}),
				label: t('confirm.issue_label'),
				details: [
					{ icon: Building2, label: t('confirm.tenant'), value: name },
					total,
					{ icon: Calendar, label: t('confirm.due'), value: longDate(dueIso, i18n.locale) }
				],
				run: doIssue
			};
		if (confirm === 'void')
			return {
				tone: 'danger' as const,
				icon: Ban,
				title: t('confirm.void_title', { number: detail?.number ?? '' }),
				message: t('confirm.void_message'),
				label: t('confirm.void_label'),
				details: [{ icon: Building2, label: t('confirm.tenant'), value: name }, total],
				run: doVoid
			};
		return {
			tone: 'danger' as const,
			icon: Trash2,
			title: t('confirm.delete_title'),
			message: t('confirm.delete_message'),
			label: t('confirm.delete_label'),
			details: [{ icon: Building2, label: t('confirm.tenant'), value: name }, total],
			run: doDelete
		};
	});

	const chip =
		'h-7 rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap lms-focus-ring';
	const inputCls =
		'input lms-input lms-focus-ring h-10.5 text-sm read-only:bg-lms-surface-muted disabled:bg-lms-surface-muted';
</script>

<svelte:head><title>{t('head_title')} · FLIXARE</title></svelte:head>

{#if !initialList || !settings || !form}
	<div class="flex flex-col gap-4 pb-24">
		<StatePanel
			headingLevel={1}
			title={t(`state.${failure === 'forbidden' ? 'forbidden' : 'unavailable'}_title`)}
			description={t(`state.${failure === 'forbidden' ? 'forbidden' : 'unavailable'}_text`)}
			tone={failure === 'forbidden' ? 'warning' : 'error'}
		/>
	</div>
{:else}
	<div class="text-lms-foreground flex flex-col gap-4 pb-24" data-screen-label="04e Invoice">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div class="flex flex-col gap-1.5">
				<span class="text-lms-link font-mono text-xs font-semibold tracking-[0.1em]"
					>{t('eyebrow')}</span
				>
				<h1 class="text-[26px] leading-[34px] font-bold">{t('title')}</h1>
				<span class="text-lms-muted text-sm">{t('desc')}</span>
			</div>
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="lms-focus-ring border-lms-border-strong bg-lms-surface flex h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold"
					onclick={() => (settingsOpen = true)}
				>
					<Icon icon={Settings} size="sm" />{t('settings_button')}
				</button>
				<button
					type="button"
					class="lms-focus-ring bg-lms-interactive text-lms-on-interactive flex h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold"
					onclick={startNew}
				>
					<Icon icon={Plus} size="sm" />{t('new')}
				</button>
			</div>
		</div>

		{#if settings.issuer.is_sample}
			<p
				class="lms-tone-warning flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-[13px]"
			>
				<Icon icon={CircleAlert} size="sm" /><span class="flex-1">{t('sample_issuer')}</span>
				<button
					type="button"
					class="lms-focus-ring rounded-lg border border-current px-3 py-1 text-xs font-bold"
					onclick={() => (settingsOpen = true)}>{t('settings_button')}</button
				>
			</p>
		{/if}

		<div class="flex flex-wrap items-start gap-4">
			<!-- Daftar invoice -->
			<section
				class="bg-lms-surface border-lms-border flex max-h-[calc(100vh-120px)] min-w-60 flex-[0_1_290px] flex-col overflow-auto rounded-xl border lg:sticky lg:top-21"
				aria-label={t('list.label')}
			>
				<div class="border-lms-border flex flex-col gap-2.5 border-b p-3">
					<label class="relative block">
						<span class="text-lms-muted absolute top-2.5 left-3"
							><Icon icon={Search} size="sm" /></span
						>
						<input
							type="search"
							bind:value={query}
							placeholder={t('list.search')}
							aria-label={t('list.search')}
							class="bg-lms-surface border-lms-border-strong lms-focus-ring h-[38px] w-full rounded-lg border ps-9 pe-3 text-[13px]"
						/>
					</label>
					<div class="flex flex-wrap gap-1.5" role="tablist" aria-label={t('list.tabs')}>
						{#each TABS as key (key)}
							<button
								type="button"
								role="tab"
								aria-selected={tab === key}
								class={[
									chip,
									tab === key
										? 'bg-lms-foreground text-lms-surface border-lms-foreground'
										: 'bg-lms-surface text-lms-muted border-lms-border-strong'
								]}
								onclick={() => (tab = key)}
							>
								{t(`tab.${key}`)}
							</button>
						{/each}
					</div>
				</div>
				{#each visible as x (x.id)}
					{@const on = x.id === detail?.id}
					<button
						type="button"
						aria-current={on}
						class={[
							'border-lms-border lms-focus-ring flex flex-col gap-1.5 border-b px-3.5 py-3 text-left',
							on &&
								'bg-lms-interactive-subtle/50 shadow-[inset_3px_0_0_var(--color-lms-interactive)]'
						]}
						onclick={() => pick(x)}
					>
						<span class="flex w-full justify-between gap-2">
							<span class="font-mono text-xs font-semibold">{x.number ?? t('list.draft_no')}</span>
							<span
								class={[
									'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.04em]',
									STATUS_TONE[x.status]
								]}>{statusLabel(x.status).toUpperCase()}</span
							>
						</span>
						<span class="flex w-full items-baseline justify-between gap-2">
							<span class="truncate text-[13px] font-semibold">{x.tenant_name}</span>
							<span class="text-[13px] font-bold whitespace-nowrap tabular-nums"
								>{money(x.total_idr)}</span
							>
						</span>
						<span
							class={[
								'text-[11px]',
								x.status === 'overdue' ? 'text-lms-warning-text' : 'text-lms-muted'
							]}
						>
							{dueLine(x)}{#if x.has_pending_proof}<span class="text-lms-interactive font-semibold">
									· {t('list.proof_waiting')}</span
								>{/if}
						</span>
					</button>
				{:else}
					<div class="text-lms-muted px-4 py-7 text-center text-[13px]">{t('list.empty')}</div>
				{/each}
			</section>

			<!-- Editor -->
			<div class="flex min-w-0 flex-[1_1_440px] flex-col gap-3.5">
				{#if proof && (status === 'issued' || status === 'overdue')}
					<div class="lms-tone-info flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5">
						<Icon icon={Landmark} />
						<span class="flex-[1_1_240px] text-[13px] leading-5">
							<b>{t('banner.proof_title')}</b>
							{t('banner.proof_text', {
								amount: money(proof.amount_idr),
								date: longDateTs(proof.paid_at, i18n.locale),
								bank: proof.bank_name,
								sender: proof.sender_name || '—'
							})}
						</span>
						<div class="flex flex-wrap gap-2">
							{#if proof.has_proof}
								<!-- eslint-disable svelte/no-navigation-without-resolve -- proxy berkas lewat resolve(); hanya query id -->
								<a
									href={`${resolve('/platform/invoice/proof')}?id=${proof.id}`}
									target="_blank"
									rel="noopener"
									class="lms-focus-ring flex h-8.5 items-center gap-1.5 rounded-lg border border-current px-3 text-xs font-bold"
								>
									<Icon icon={FileText} size="sm" />{t('banner.view_proof')}
								</a>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							{/if}
							<button
								type="button"
								disabled={busy}
								class="lms-focus-ring flex h-8.5 items-center gap-1.5 rounded-lg border border-current px-3 text-xs font-bold"
								onclick={() => verify(proof.id)}
								><Icon icon={Check} size="sm" />{t('banner.verify')}</button
							>
							<button
								type="button"
								disabled={busy}
								class="lms-focus-ring flex h-8.5 items-center gap-1.5 rounded-lg border border-current px-3 text-xs font-bold"
								onclick={() => ((rejectId = proof.id), (rejectReason = ''))}
								><Icon icon={Ban} size="sm" />{t('banner.reject')}</button
							>
						</div>
					</div>
				{/if}

				{#if banner}
					<div class={['flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5', banner.tone]}>
						<Icon icon={banner.icon} />
						<span class="flex-[1_1_240px] text-[13px] leading-5"
							><b>{banner.title}</b> {banner.text}</span
						>
						<div class="flex flex-wrap gap-2">
							{#each banner.actions as a (a.key)}
								<button
									type="button"
									disabled={busy}
									class="lms-focus-ring flex h-8.5 items-center gap-1.5 rounded-lg border border-current px-3 text-xs font-bold"
									onclick={a.run}><Icon icon={a.icon} size="sm" />{a.label}</button
								>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Tagihan untuk -->
				<section class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="text-base font-bold">{t('editor.bill_to')}</h2>
						<span class="text-lms-muted font-mono text-[13px] font-semibold"
							>{detail?.number ?? t('list.draft_no')}</span
						>
					</div>
					<div
						class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] items-start gap-x-4 gap-y-3.5"
					>
						<label class="col-span-full flex flex-col gap-1.5" for="{uid}-tenant">
							<span class="text-[13px] font-semibold">{t('editor.tenant')}</span>
							<select
								id="{uid}-tenant"
								value={form.tenantId}
								disabled={locked}
								onchange={(e) => onTenant(e.currentTarget.value)}
								class={[inputCls, tried && errors.tenant && 'border-lms-danger-text!']}
							>
								<option value="">{t('editor.tenant_pick')}</option>
								{#if locked && !tenants.some((x) => x.id === form?.tenantId)}<option
										value={form.tenantId}>{detail?.tenant_name}</option
									>{/if}
								{#each tenants as o (o.id)}<option value={o.id}>{o.name} · {o.code}</option>{/each}
							</select>
							<span
								class={[
									'text-xs',
									tried && errors.tenant ? 'text-lms-danger-text' : 'text-lms-muted'
								]}
							>
								{tried && errors.tenant
									? t('err.tenant')
									: locked && detail
										? t('editor.tenant_hint', {
												pic: detail.bill_to.pic || '—',
												email: detail.bill_to.email || '—'
											})
										: tenant
											? t('editor.tenant_hint', {
													pic: tenant.pic || '—',
													email: tenant.email || '—'
												})
											: t('editor.tenant_hint_empty')}
							</span>
						</label>
						<label class="flex flex-col gap-1.5" for="{uid}-issue">
							<span class="text-[13px] font-semibold">{t('editor.issue_date')}</span>
							<input
								id="{uid}-issue"
								type="date"
								bind:value={form.issueDate}
								readonly={locked}
								class={inputCls}
							/>
						</label>
						<label class="flex flex-col gap-1.5" for="{uid}-terms">
							<span class="text-[13px] font-semibold">{t('editor.terms')}</span>
							<select
								id="{uid}-terms"
								bind:value={form.termsDays}
								disabled={locked}
								class={inputCls}
							>
								{#each TERMS_OPTIONS as d (d)}<option value={d}
										>{t('editor.terms_days', { n: d })}</option
									>{/each}
							</select>
							<span class="text-lms-muted text-xs"
								>{t('editor.due', { date: longDate(dueIso, i18n.locale) })}</span
							>
						</label>
						<label class="flex flex-col gap-1.5" for="{uid}-period">
							<span class="text-[13px] font-semibold">{t('editor.period')}</span>
							<input
								id="{uid}-period"
								bind:value={form.periodLabel}
								readonly={locked}
								maxlength={80}
								placeholder={t('editor.period_ph')}
								class={inputCls}
							/>
						</label>
					</div>
				</section>

				<!-- Rincian -->
				<section class="bg-lms-surface border-lms-border flex flex-col gap-3 rounded-xl border p-5">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="text-base font-bold">{t('editor.items')}</h2>
						{#if !locked}
							<button
								type="button"
								class="lms-focus-ring border-lms-border-strong bg-lms-surface flex h-8.5 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold"
								onclick={fillFromPlan}
							>
								<span class="text-lms-interactive"><Icon icon={WandSparkles} size="sm" /></span>{t(
									'editor.fill'
								)}
							</button>
						{/if}
					</div>
					<div class="overflow-x-auto">
						<div class="flex min-w-[640px] flex-col gap-2">
							<div
								class="text-lms-muted grid grid-cols-[minmax(0,1fr)_80px_96px_140px_120px_36px] gap-2 font-mono text-[11px] tracking-[0.06em]"
							>
								<span>{t('editor.col_desc')}</span><span>QTY</span><span
									>{t('editor.col_unit')}</span
								><span>{t('editor.col_price')}</span><span class="text-right"
									>{t('editor.col_amount')}</span
								><span></span>
							</div>
							{#each form.rows as row, i (i)}
								{@const rowBad =
									tried &&
									(!row.description.trim() ||
										!(Number(row.quantity) > 0) ||
										!(Number(row.unitPrice) > 0))}
								<div
									class="grid grid-cols-[minmax(0,1fr)_80px_96px_140px_120px_36px] items-center gap-2"
								>
									<input
										bind:value={row.description}
										readonly={locked}
										maxlength={200}
										placeholder={t('editor.desc_ph')}
										aria-label={t('editor.col_desc')}
										class={[
											inputCls,
											'min-w-0',
											rowBad && !row.description.trim() && 'border-lms-danger-text!'
										]}
									/>
									<input
										value={row.quantity}
										readonly={locked}
										inputmode="numeric"
										aria-label="QTY"
										oninput={(e) => {
											row.quantity = digits(e.currentTarget.value);
											e.currentTarget.value = row.quantity;
										}}
										class={[
											inputCls,
											'min-w-0 tabular-nums',
											rowBad && !(Number(row.quantity) > 0) && 'border-lms-danger-text!'
										]}
									/>
									<input
										bind:value={row.unitLabel}
										readonly={locked}
										maxlength={20}
										aria-label={t('editor.col_unit')}
										class={[inputCls, 'min-w-0']}
									/>
									<span
										class={[
											'border-lms-input-border flex overflow-hidden rounded-[10px] border-[1.5px]',
											locked && 'bg-lms-surface-muted',
											rowBad && !(Number(row.unitPrice) > 0) && 'border-lms-danger-text!'
										]}
									>
										<span class="bg-lms-surface-muted text-lms-muted flex items-center px-2 text-xs"
											>Rp</span
										>
										<input
											value={row.unitPrice}
											readonly={locked}
											inputmode="numeric"
											aria-label={t('editor.col_price')}
											oninput={(e) => {
												row.unitPrice = digits(e.currentTarget.value);
												e.currentTarget.value = row.unitPrice;
											}}
											class="h-9.5 min-w-0 flex-1 bg-transparent px-2 text-sm tabular-nums outline-none"
										/>
									</span>
									<span class="text-right text-sm font-bold tabular-nums"
										>{money((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0))}</span
									>
									<button
										type="button"
										title={t('editor.remove_row')}
										aria-label={t('editor.remove_row')}
										disabled={locked || form.rows.length < 2}
										class="border-lms-border-strong bg-lms-surface text-lms-muted lms-focus-ring flex size-9 items-center justify-center rounded-lg border disabled:opacity-40"
										onclick={() => form && (form.rows = form.rows.filter((_, j) => j !== i))}
									>
										<Icon icon={Trash2} size="sm" />
									</button>
								</div>
							{/each}
						</div>
					</div>
					{#if !locked}
						<button
							type="button"
							class="text-lms-interactive lms-focus-ring border-lms-border-strong flex h-9 items-center gap-1.5 self-start rounded-lg border border-dashed px-3 text-[13px] font-semibold"
							onclick={() =>
								form && (form.rows = [...form.rows, emptyRow(t('editor.unit_default'))])}
						>
							<Icon icon={Plus} size="sm" />{t('editor.add_row')}
						</button>
					{/if}
					{#if tried && errors.rows}<span class="text-lms-danger-text text-xs" role="alert"
							>{t('err.rows')}</span
						>{/if}

					<div class="border-lms-border flex flex-wrap items-start gap-5 border-t pt-4">
						<div class="flex flex-[1_1_240px] flex-col gap-3.5">
							<div class="flex flex-col gap-1.5">
								<span class="text-[13px] font-semibold">{t('editor.discount')}</span>
								<span class="flex gap-2">
									<span
										class="bg-lms-surface-muted flex flex-none gap-0.5 rounded-[10px] p-[3px]"
										role="radiogroup"
										aria-label={t('editor.discount')}
									>
										{#each [['percent', '%'], ['amount', 'Rp']] as const as [k, label] (k)}
											<button
												type="button"
												role="radio"
												aria-checked={form.discountType === k}
												disabled={locked}
												class={[
													'lms-focus-ring h-9 w-11 rounded-lg text-xs font-bold',
													form.discountType === k
														? 'bg-lms-surface text-lms-foreground shadow-sm'
														: 'text-lms-muted'
												]}
												onclick={() => form && ((form.discountType = k), (form.discountValue = ''))}
												>{label}</button
											>
										{/each}
									</span>
									<input
										value={form.discountValue}
										readonly={locked}
										inputmode="numeric"
										placeholder="0"
										aria-label={t('editor.discount')}
										oninput={(e) => {
											if (form) {
												form.discountValue = digits(e.currentTarget.value);
												e.currentTarget.value = form.discountValue;
											}
										}}
										class={[
											inputCls,
											'min-w-0 flex-1 tabular-nums',
											errors.disc && 'border-lms-danger-text!'
										]}
									/>
								</span>
								{#if errors.disc}<span class="text-lms-danger-text text-xs">{t('err.disc')}</span
									>{/if}
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={form.taxEnabled}
								disabled={locked}
								class="lms-focus-ring flex items-center gap-3 text-left"
								onclick={() => form && (form.taxEnabled = !form.taxEnabled)}
							>
								<span
									class={[
										'relative h-5.5 w-10 flex-none rounded-full transition-colors',
										form.taxEnabled ? 'bg-lms-interactive' : 'bg-lms-input-border'
									]}
									><span
										class={[
											'absolute top-0.75 left-0.75 size-4 rounded-full bg-white transition-transform',
											form.taxEnabled && 'translate-x-4.5'
										]}
									></span></span
								>
								<span class="flex flex-col gap-0.5">
									<span class="text-sm font-semibold">{t('editor.vat')}</span>
									<span class="text-lms-muted text-xs">{t('editor.vat_hint')}</span>
								</span>
							</button>
							<label class="flex flex-col gap-1.5" for="{uid}-bank">
								<span class="text-[13px] font-semibold">{t('editor.bank')}</span>
								<select
									id="{uid}-bank"
									bind:value={form.bankAccountId}
									disabled={locked}
									class={inputCls}
								>
									{#if locked && detail?.bank && !banks.some((b) => b.id === detail?.bank?.id)}<option
											value={form.bankAccountId}
											>{detail.bank.bank_name} · {detail.bank.account_number}</option
										>{/if}
									{#each banks as b (b.id)}<option value={b.id}
											>{b.bank_name} · {b.account_number}</option
										>{/each}
								</select>
							</label>
							<label class="flex flex-col gap-1.5" for="{uid}-note">
								<span class="text-[13px] font-semibold"
									>{t('editor.note')}
									<span class="text-lms-muted font-normal">({t('editor.optional')})</span></span
								>
								<textarea
									id="{uid}-note"
									bind:value={form.note}
									readonly={locked}
									rows="2"
									maxlength={500}
									placeholder={settings.default_note}
									class="input lms-input lms-focus-ring read-only:bg-lms-surface-muted resize-y py-2.5 text-sm leading-[21px]"
								></textarea>
							</label>
						</div>
						<div class="bg-lms-surface-muted flex flex-[1_1_260px] flex-col gap-2 rounded-xl p-4">
							{#each sums as s (s.k)}
								<div class="text-lms-muted flex justify-between gap-3 text-sm">
									<span>{s.k}</span><span class="text-lms-foreground tabular-nums">{s.v}</span>
								</div>
							{/each}
							<div
								class="border-lms-border-strong flex items-baseline justify-between gap-3 border-t pt-2.5"
							>
								<span class="text-sm font-bold">{t('sum.total')}</span>
								<span class="text-[22px] font-bold tabular-nums">{money(totals?.total ?? 0)}</span>
							</div>
							<span class="text-lms-muted text-xs leading-[18px] italic"
								>{terbilang(totals?.total ?? 0)}</span
							>
						</div>
					</div>
				</section>

				{#if detail && detail.payments.length}
					<section
						class="bg-lms-surface border-lms-border flex flex-col gap-2 rounded-xl border p-5"
					>
						<h2 class="text-base font-bold">{t('payments.title')}</h2>
						{#each detail.payments as p (p.id)}
							<div
								class="border-lms-border flex flex-wrap items-center gap-3 border-t py-2.5 text-[13px]"
							>
								<span class="flex min-w-0 flex-1 flex-col gap-0.5">
									<span class="font-semibold">
										{p.method === 'gateway'
											? t('payments.gateway', {
													channel: (p.channel ?? '').replace('va_', 'VA ').toUpperCase()
												})
											: t('payments.manual', { bank: p.bank_name || '—' })}
										{#if p.va_number}<span class="text-lms-muted font-mono font-normal">
												· {p.va_number}</span
											>{/if}
									</span>
									<span class="text-lms-muted text-xs">
										{longDateTs(p.paid_at ?? p.created_at, i18n.locale)}{#if p.reference}
											· {p.reference}{/if}{#if p.verifier_name}
											· {t('payments.by', { name: p.verifier_name })}{/if}{#if p.reject_reason}
											· {p.reject_reason}{/if}
									</span>
								</span>
								<span class="tabular-nums">{money(p.amount_idr)}</span>
								<span
									class="bg-lms-surface-muted rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
									>{t(`payments.status_${p.status}`)}</span
								>
								{#if p.has_proof}
									<!-- eslint-disable svelte/no-navigation-without-resolve -- proxy berkas lewat resolve(); hanya query id -->
									<a
										href={`${resolve('/platform/invoice/proof')}?id=${p.id}`}
										target="_blank"
										rel="noopener"
										class="text-lms-link lms-focus-ring text-xs font-semibold"
										>{t('payments.proof')}</a
									>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
								{/if}
							</div>
						{/each}
					</section>
				{/if}

				<!-- Bar aksi -->
				<div
					class="bg-lms-surface border-lms-border sticky bottom-4 z-[5] flex flex-wrap items-center gap-2.5 rounded-xl border py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_rgba(15,24,56,0.4)]"
				>
					<span class={['flex flex-[1_1_200px] items-center gap-2 text-[13px]', barState.tone]}
						><Icon icon={barState.icon} size="sm" />{barState.text}</span
					>
					{#if !locked && detail}
						<button
							type="button"
							disabled={busy}
							class="lms-focus-ring text-lms-muted flex h-10.5 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold"
							onclick={() => (confirm = 'delete')}
							><Icon icon={Trash2} size="sm" />{t('bar.delete')}</button
						>
					{/if}
					<button
						type="button"
						class="lms-focus-ring border-lms-border-strong bg-lms-surface flex h-10.5 items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold"
						onclick={() => (printOpen = true)}
					>
						<Icon icon={Printer} size="sm" />{t('bar.preview')}
					</button>
					{#if !locked}
						<button
							type="button"
							disabled={busy}
							class="lms-focus-ring border-lms-border-strong bg-lms-surface h-10.5 rounded-[10px] border px-4 text-sm font-semibold disabled:opacity-60"
							onclick={() => saveDraft()}>{t('bar.save')}</button
						>
						<button
							type="button"
							disabled={busy}
							class="lms-focus-ring bg-lms-interactive text-lms-on-interactive flex h-10.5 items-center gap-2 rounded-[10px] px-4.5 text-sm font-bold disabled:opacity-60"
							onclick={askIssue}
						>
							<Icon icon={Send} size="sm" />{t('bar.issue')}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if paper}<PrintOverlay open={printOpen} data={paper} onclose={() => (printOpen = false)} />{/if}

	<SettingsModal
		open={settingsOpen}
		{settings}
		onclose={() => (settingsOpen = false)}
		onsaved={(s) => ((settings = s), notify(t('toast.settings_saved')))}
	/>

	{#if detail && totals}
		<InvoiceModal
			open={paymentOpen}
			title={t('payment_modal.title', { number: detail.number ?? '' })}
			closeLabel={t('payment_modal.cancel')}
			onclose={() => (paymentOpen = false)}
		>
			<p class="text-lms-muted mb-3 text-[13px]">{t('payment_modal.hint')}</p>
			{#if paymentOpen}<TransferForm
					total={detail.totals.total_idr}
					{banks}
					proofRequired={false}
					tried={paymentTried}
					onchange={(v) => (payment = v)}
				/>{/if}
			{#snippet footer()}
				<button
					type="button"
					class="lms-focus-ring border-lms-border-strong h-10 rounded-[10px] border px-4 text-sm font-semibold"
					onclick={() => (paymentOpen = false)}>{t('payment_modal.cancel')}</button
				>
				<button
					type="button"
					disabled={busy}
					class="bg-lms-interactive text-lms-on-interactive lms-focus-ring h-10 rounded-[10px] px-4 text-sm font-bold disabled:opacity-60"
					onclick={recordPayment}>{t('payment_modal.save')}</button
				>
			{/snippet}
		</InvoiceModal>

		<InvoiceModal
			open={rejectId !== null}
			title={t('reject_modal.title')}
			closeLabel={t('payment_modal.cancel')}
			onclose={() => (rejectId = null)}
		>
			<label class="flex flex-col gap-1.5" for="{uid}-reject">
				<span class="text-[13px] font-semibold">{t('reject_modal.reason')}</span>
				<textarea
					id="{uid}-reject"
					bind:value={rejectReason}
					rows="3"
					maxlength={500}
					placeholder={t('reject_modal.reason_ph')}
					class="input lms-input lms-focus-ring py-2.5 text-sm"></textarea>
				<span class="text-lms-muted text-xs">{t('reject_modal.hint')}</span>
			</label>
			{#snippet footer()}
				<button
					type="button"
					class="lms-focus-ring border-lms-border-strong h-10 rounded-[10px] border px-4 text-sm font-semibold"
					onclick={() => (rejectId = null)}>{t('payment_modal.cancel')}</button
				>
				<button
					type="button"
					disabled={busy || rejectReason.trim().length < 5}
					class="bg-lms-danger-text lms-focus-ring h-10 rounded-[10px] px-4 text-sm font-bold text-white disabled:opacity-60"
					onclick={reject}>{t('reject_modal.submit')}</button
				>
			{/snippet}
		</InvoiceModal>
	{/if}

	{#if confirmContent && confirm}
		<ConfirmDialog
			bind:open={
				() => confirm !== null,
				(open) => {
					if (!open) confirm = null;
				}
			}
			tone={confirmContent.tone}
			icon={confirmContent.icon}
			title={confirmContent.title}
			message={confirmContent.message}
			details={confirmContent.details}
			confirmLabel={confirmContent.label}
			confirmIcon={Check}
			busyLabel={t('confirm.busy')}
			cancelLabel={t('confirm.cancel')}
			onconfirm={async () => {
				const fn = confirmContent.run;
				confirm = null;
				await fn();
			}}
		>
			{#snippet options()}
				{#if confirm === 'void'}
					<label class="flex flex-col gap-1.5 text-left" for="{uid}-void">
						<span class="text-[13px] font-semibold">{t('confirm.void_reason')}</span>
						<textarea
							id="{uid}-void"
							bind:value={voidReason}
							rows="2"
							maxlength={500}
							placeholder={t('confirm.void_reason_ph')}
							class="input lms-input lms-focus-ring py-2 text-sm"></textarea>
					</label>
				{/if}
			{/snippet}
		</ConfirmDialog>
	{/if}

	<Toast message={toast?.text ?? null} icon={toast?.icon} />
{/if}
