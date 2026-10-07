<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { BackendFailure } from '$lib/api/backend-call';
	import type { ReviewItem, ReviewList } from '$lib/api/generated/lms';
	import ConfirmDialog, { type ConfirmDialogDetail } from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { useI18n } from '$lib/i18n';
	import { runPageAction } from '$lib/utils/page-action';
	import { untrack } from 'svelte';
	import type { LucideIcon } from '@lucide/svelte';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Circle from '@lucide/svelte/icons/circle';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Database from '@lucide/svelte/icons/database';
	import FilePen from '@lucide/svelte/icons/file-pen';
	import FileText from '@lucide/svelte/icons/file-text';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Info from '@lucide/svelte/icons/info';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Package from '@lucide/svelte/icons/package';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Send from '@lucide/svelte/icons/send';
	import Timer from '@lucide/svelte/icons/timer';
	import X from '@lucide/svelte/icons/x';

	/**
	 * Pengajuan lembaga (referensi "04c Pengajuan Tenant"): antrean per status, data pengajuan yang dapat
	 * dikoreksi peninjau, verifikasi otomatis/manual, lalu keputusan setujui / minta revisi / tolak.
	 * Seluruh status & aturan (cek wajib lengkap, transisi) ditegakkan backend; halaman hanya meneruskan.
	 */
	interface Props {
		queue: ReviewList | null;
		failure: BackendFailure | null;
	}

	let { queue: initial, failure }: Props = $props();

	type Tab = 'submitted' | 'revision_requested' | 'approved' | 'rejected';
	type Decision = 'approve' | 'revise' | 'reject';
	const TABS: readonly Tab[] = ['submitted', 'revision_requested', 'approved', 'rejected'];
	const LEVELS = ['SD', 'SMP', 'SMA', 'SMK'] as const;
	const MIN_NAME = 3;
	const MIN_NOTE = 10;
	const MIN_PHONE = 9;
	const OTHER_REASON = 'Lainnya';
	const HOUR_MS = 3_600_000;
	const HOURS_PER_DAY = 24;
	const SLA_WARN_RATIO = 2 / 3;
	const CLUSTER_WARN_PCT = 70;
	/** Status cluster yang menerima database baru (CHECK db_cluster_s.status). */
	const CLUSTER_AVAILABLE = 'available';
	const TOAST_MS = 5000;
	const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`applications.${key}`, params);
	const locale = $derived(i18n.locale === 'en' ? 'en-US' : 'id-ID');

	// svelte-ignore state_referenced_locally
	let queue = $state<ReviewList | null>(initial);
	let tab = $state<Tab>('submitted');
	let query = $state('');
	// svelte-ignore state_referenced_locally
	let selectedId = $state<string | null>(
		initial?.items.find((x) => x.status === 'submitted')?.id ?? initial?.items[0]?.id ?? null
	);
	let busy = $state(false);
	let tried = $state(false);
	let confirmOpen = $state(false);
	let toast = $state<{ text: string; icon: LucideIcon } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	// Draf koreksi & keputusan untuk pengajuan terpilih (direset saat pilihan berganti).
	let draft = $state(emptyDraft(null));
	let decision = $state<Decision>('approve');
	let planCode = $state('');
	let trial = $state(false);
	let clusterId = $state('');
	let revFields = $state<string[]>([]);
	let revNote = $state('');
	let rejReason = $state('');
	let rejNote = $state('');

	const items = $derived(queue?.items ?? []);
	const selected = $derived(items.find((x) => x.id === selectedId) ?? null);
	const list = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return items.filter(
			(x) => x.status === tab && `${x.institution_name} ${x.npsn}`.toLowerCase().includes(q)
		);
	});
	const locked = $derived(selected?.status !== 'submitted');
	const plans = $derived(queue?.plans.filter((p) => p.tenant_type === selected?.tenant_type) ?? []);
	const plan = $derived(plans.find((p) => p.code === planCode) ?? plans[0]);
	const isSchool = $derived(selected?.tenant_type === 'school');
	const isEvent = $derived(selected?.tenant_type === 'event');
	const checks = $derived(selected?.checks ?? []);
	const okCount = $derived(checks.filter((c) => c.ok).length);
	const documents = $derived(selected?.files.filter((f) => f.kind === 'document') ?? []);
	const dirty = $derived(
		selected ? JSON.stringify(draft) !== JSON.stringify(emptyDraft(selected)) : false
	);

	// Reset hanya saat pilihan berganti; respons aksi (queue baru) tidak menghapus draf yang sedang diisi.
	$effect(() => {
		const id = selectedId;
		untrack(() => resetFor(items.find((x) => x.id === id) ?? null));
	});

	function resetFor(item: ReviewItem | null) {
		draft = emptyDraft(item);
		decision = 'approve';
		planCode = item?.plan_code ?? '';
		trial = Boolean(item?.trial);
		clusterId = recommendedCluster();
		revFields = [];
		revNote = '';
		rejReason = '';
		rejNote = '';
		tried = false;
		confirmOpen = false;
	}

	function emptyDraft(item: ReviewItem | null) {
		return {
			institution_name: item?.institution_name ?? '',
			education_level: item?.education_level ?? '',
			timezone: item?.timezone ?? '',
			seats: String(
				(item?.tenant_type === 'event' ? item?.participants_per_session : item?.seats) ?? ''
			),
			address: item?.address ?? '',
			contact_name: item?.contact_name ?? '',
			contact_email: item?.contact_email ?? '',
			contact_phone: item?.contact_phone ?? ''
		};
	}

	function recommendedCluster(): string {
		const open = (queue?.clusters ?? []).filter(
			(c) => c.status === CLUSTER_AVAILABLE && c.used_units < c.max_units
		);
		open.sort((a, b) => a.used_units / a.max_units - b.used_units / b.max_units);
		return open[0]?.id ?? '';
	}

	// ===== Validasi (referensi errs()) =====
	const errors = $derived.by(() => {
		const e: Record<string, string> = {};
		if (draft.institution_name.trim().length < MIN_NAME) e.name = t('err.name');
		if (!(Number(draft.seats) > 0)) e.seats = t('err.seats');
		if (draft.contact_name.trim().length < MIN_NAME) e.pic = t('err.pic');
		if (!EMAIL_PATTERN.test(draft.contact_email.trim())) e.email = t('err.email');
		if (draft.contact_phone.replace(/\D/g, '').length < MIN_PHONE) e.phone = t('err.phone');
		if (decision === 'approve' && okCount < checks.length)
			e.checks = t('err.checks', { n: checks.length - okCount });
		if (decision === 'revise' && !revFields.length) e.rev = t('err.rev_fields');
		else if (decision === 'revise' && revNote.trim().length < MIN_NOTE) e.rev = t('err.rev_note');
		if (decision === 'reject' && !rejReason) e.rejReason = t('err.rej_reason');
		if (decision === 'reject' && rejReason === OTHER_REASON && rejNote.trim().length < MIN_NOTE)
			e.rejNote = t('err.rej_note');
		return e;
	});
	const fieldErrors = $derived(Object.keys(errors).filter((k) => k !== 'checks').length);
	const failing = $derived(tried && (fieldErrors > 0 || Boolean(errors.checks)));

	// ===== Tampilan =====
	const ageHours = (x: ReviewItem) =>
		x.submitted_at
			? Math.max(0, Math.floor((Date.now() - new Date(x.submitted_at).getTime()) / HOUR_MS))
			: 0;
	const ageLabel = (x: ReviewItem) => {
		if (x.status !== 'submitted') return x.reviewed_at ? shortDate(x.reviewed_at) : '';
		const h = ageHours(x);
		return h >= HOURS_PER_DAY
			? t('age_days', { n: Math.round(h / HOURS_PER_DAY) })
			: t('age_hours', { n: h });
	};
	const slaPct = (x: ReviewItem) =>
		Math.min(100, Math.round((ageHours(x) / (queue?.sla_hours || 1)) * 100));
	const shortDate = (iso: string) =>
		new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
	const longDate = (iso: string | null) =>
		iso
			? new Date(iso).toLocaleString(locale, {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			: '—';
	const typeLabel = (type: string) =>
		t(`type.${type === 'school' || type === 'personal' || type === 'event' ? type : 'school'}`);
	const zoneLabel = (code: string) => queue?.timezones.find((z) => z.code === code)?.label ?? code;
	const initials = (name: string) =>
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase();
	const money = (n: number) => `Rp${Math.round(n).toLocaleString(locale)}`;
	const STATUS_TONE: Record<string, string> = {
		submitted: 'lms-tone-warning',
		revision_requested: 'lms-tone-info',
		approved: 'lms-tone-success',
		rejected: 'lms-tone-danger'
	};

	const dbName = $derived(
		!selected
			? ''
			: selected.tenant?.db_name ||
					`lms_t_${isSchool ? `sch_${selected.npsn}` : selected.tenant_code || '…'}`
	);
	const estimate = $derived.by(() => {
		if (!plan) return '';
		if (isEvent) return t('estimate_event');
		if (plan.pricing_model === 'seat')
			return t('estimate_seat', {
				total: money(plan.price_idr * (Number(draft.seats) || 0)),
				seats: draft.seats
			});
		return t('estimate_flat', { total: money(plan.price_idr) });
	});
	const trialAllowed = $derived(!isEvent && Boolean(plan?.trial_enabled));
	const provisioning = $derived.by(() => {
		const tenant = selected?.tenant;
		if (!tenant) return null;
		const live = tenant.lifecycle === 'trial' || tenant.lifecycle === 'active';
		const awaitingPayment = tenant.lifecycle === 'pending_payment';
		const steps = ['create_db', 'migrate', 'seed', 'email'] as const;
		return {
			title: `${tenant.db_name} · ${tenant.cluster}`,
			awaitingPayment,
			error: !live && tenant.provision_attempts > 0 ? tenant.provision_error : '',
			steps: steps.map((key, i) => ({
				key,
				done: live,
				running: !live && !awaitingPayment && i === 0
			}))
		};
	});

	function checkLabel(key: string) {
		return t(`check.${key}${key === 'npsn' && !isSchool ? '_other' : ''}`);
	}
	function checkSub(key: string, ok: boolean): string {
		if (!selected) return '';
		switch (key) {
			case 'email':
				return ok ? selected.contact_email : t('check.email_pending');
			case 'npsn':
				return !isSchool
					? t('check.npsn_na', { type: typeLabel(selected.tenant_type).toLowerCase() })
					: t(selected.npsn_source === 'directory' ? 'check.npsn_directory' : 'check.npsn_manual', {
							npsn: selected.npsn,
							driver: queue?.npsn_directory ?? ''
						});
			case 'duplicate':
				return ok ? t('check.duplicate_none') : t('check.duplicate_found');
			case 'docs':
				return documents.length
					? t('check.docs_count', { n: documents.length })
					: t('check.docs_none');
			default:
				return t('check.contact_sub', {
					name: selected.contact_name,
					phone: selected.contact_phone
				});
		}
	}

	// ===== Aksi =====
	function notify(text: string, icon: LucideIcon = CircleCheck) {
		toast = { text, icon };
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), TOAST_MS);
	}

	async function run(name: string, body: Record<string, unknown>): Promise<boolean> {
		busy = true;
		const result = await runPageAction<ReviewList>(name, body);
		busy = false;
		if (result.ok) {
			queue = result.data;
			// Badge menu "Pengajuan" (jumlah menunggu) dihitung ulang dari backend.
			void invalidate('app:workspace');
			return true;
		}
		notify(
			t(
				`failure.${['checks_incomplete', 'invalid_transition', 'forbidden', 'validation_failed'].includes(result.code) ? result.code : 'generic'}`
			),
			CircleAlert
		);
		return false;
	}

	/** Cek manual (dokumen, PIC, NPSN saat direktori manual) & "bukan duplikat" disimpan ke backend. */
	async function toggleCheck(key: string) {
		if (!selected || locked || busy) return;
		const state = Object.fromEntries(checks.map((c) => [c.key, c.ok]));
		state[key] = !state[key];
		await run('checks', {
			id: selected.id,
			data: {
				docs_checked: Boolean(state.docs),
				contact_confirmed: Boolean(state.contact),
				npsn_checked: Boolean(state.npsn),
				duplicate_dismissed: Boolean(state.duplicate)
			}
		});
	}

	async function saveDraft(): Promise<boolean> {
		if (!selected || !dirty) return true;
		const seats = Number(draft.seats) || 0;
		return run('update', {
			id: selected.id,
			data: {
				institution_name: draft.institution_name.trim(),
				education_level: draft.education_level,
				timezone: draft.timezone,
				seats: isEvent ? (selected.seats ?? 0) : seats,
				participants_per_session: isEvent ? seats : (selected.participants_per_session ?? 0),
				address: draft.address.trim(),
				contact_name: draft.contact_name.trim(),
				contact_email: draft.contact_email.trim(),
				contact_phone: draft.contact_phone.trim()
			}
		});
	}

	function askDecide() {
		tried = true;
		if (Object.keys(errors).length) return;
		confirmOpen = true;
	}

	async function decide() {
		if (!selected) return;
		const item = selected;
		if (!(await saveDraft())) return;
		let ok: boolean;
		if (decision === 'approve') {
			ok = await run('approve', {
				id: item.id,
				data: {
					plan_code: plan?.code ?? '',
					trial: trialAllowed && trial,
					cluster_id: clusterId || undefined
				}
			});
			if (ok) notify(t('toast.approved', { name: draft.institution_name }));
		} else if (decision === 'revise') {
			ok = await run('revise', { id: item.id, data: { fields: revFields, note: revNote.trim() } });
			if (ok) notify(t('toast.revised', { email: draft.contact_email }), Send);
		} else {
			ok = await run('reject', { id: item.id, data: { reason: rejReason, note: rejNote.trim() } });
			if (ok) notify(t('toast.rejected'), CircleX);
		}
		// Dialog di-mount per konfirmasi (pola Kotak Persetujuan) agar status sibuknya selalu segar.
		confirmOpen = false;
		if (ok)
			tab =
				decision === 'approve'
					? 'approved'
					: decision === 'revise'
						? 'revision_requested'
						: 'rejected';
	}

	async function reopen() {
		if (!selected) return;
		const wasRevision = selected.status === 'revision_requested';
		if (await run('reopen', { id: selected.id })) {
			tab = 'submitted';
			notify(t(wasRevision ? 'toast.fixed' : 'toast.reopened'));
		}
	}

	const confirmContent = $derived.by(() => {
		if (!selected) return null;
		if (decision === 'approve') {
			const cluster = queue?.clusters.find((c) => c.id === clusterId)?.code ?? '—';
			return {
				tone: 'primary' as const,
				icon: Database,
				title: t('confirm.approve_title', { name: draft.institution_name }),
				message: t('confirm.approve_message', { cluster }),
				label: t('confirm.approve_label'),
				details: [
					{
						icon: Package,
						label: t('confirm.plan'),
						value: `${plan?.name ?? '—'}${trialAllowed && trial ? ` · ${t('confirm.trial')}` : ''}`
					},
					{ icon: Database, label: t('confirm.database'), value: dbName }
				] satisfies ConfirmDialogDetail[]
			};
		}
		if (decision === 'revise') {
			return {
				tone: 'primary' as const,
				icon: Send,
				title: t('confirm.revise_title'),
				message: t('confirm.revise_message'),
				label: t('confirm.revise_label'),
				details: [
					{ icon: ListChecks, label: t('confirm.fields'), value: revFields.join(', ') },
					{ icon: Mail, label: t('confirm.to'), value: draft.contact_email }
				] satisfies ConfirmDialogDetail[]
			};
		}
		return {
			tone: 'danger' as const,
			icon: CircleX,
			title: t('confirm.reject_title', { name: draft.institution_name }),
			message: t('confirm.reject_message'),
			label: t('confirm.reject_label'),
			details: [
				{ icon: MessageSquare, label: t('confirm.reason'), value: rejReason }
			] satisfies ConfirmDialogDetail[]
		};
	});

	const DECISIONS: readonly { key: Decision; icon: LucideIcon; tone: string }[] = [
		{ key: 'approve', icon: CircleCheck, tone: 'text-lms-success-text' },
		{ key: 'revise', icon: FilePen, tone: 'text-lms-interactive' },
		{ key: 'reject', icon: CircleX, tone: 'text-lms-danger-text' }
	];
	const inputClass = 'input lms-input lms-focus-ring h-10 text-sm read-only:bg-lms-surface-muted';
	const segButton = (on: boolean) => [
		'lms-focus-ring h-8 rounded-md px-3 text-[0.8125rem] font-semibold',
		on ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
	];
</script>

<svelte:head>
	<title>{t('head_title')} · FLIXARE</title>
</svelte:head>

{#if !queue}
	<div class="flex flex-col gap-4 pb-24">
		<StatePanel
			headingLevel={1}
			title={t(`state.${failure === 'forbidden' ? 'forbidden' : 'unavailable'}_title`)}
			description={t(`state.${failure === 'forbidden' ? 'forbidden' : 'unavailable'}_text`)}
			tone={failure === 'forbidden' ? 'warning' : 'error'}
		/>
	</div>
{:else}
	<div
		class="text-lms-foreground flex flex-col gap-4 pb-28"
		data-screen-label="04c Pengajuan Tenant"
	>
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div class="flex flex-col gap-1.5">
				<span class="text-lms-link font-mono text-xs font-semibold tracking-[0.1em]"
					>{t('eyebrow')}</span
				>
				<h1 class="text-[26px] leading-[34px] font-bold">{t('title')}</h1>
				<span class="text-lms-muted text-sm">{t('desc')}</span>
			</div>
			<span
				class="bg-lms-surface border-lms-border text-lms-muted flex h-9 items-center gap-2 rounded-full border px-3.5 text-[0.8125rem] font-semibold"
			>
				<Icon icon={Timer} size="sm" />{t('sla', { n: queue.sla_hours })}
			</span>
		</div>

		<div class="grid items-start gap-4 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
			<!-- Antrean -->
			<section
				class="lms-card flex flex-col overflow-hidden rounded-[14px]! p-0! shadow-none!"
				aria-label={t('queue_label')}
			>
				<div class="border-lms-border flex flex-col gap-2.5 border-b p-3">
					<label class="relative block">
						<span class="text-lms-muted absolute top-2.5 left-3"
							><Icon icon={Search} size="sm" /></span
						>
						<input
							type="search"
							bind:value={query}
							placeholder={t('search')}
							aria-label={t('search')}
							class="bg-lms-surface border-lms-border-strong lms-focus-ring h-[38px] w-full rounded-lg border ps-9 pe-3 text-[13px]"
						/>
					</label>
					<div
						class="bg-lms-surface-muted grid grid-cols-2 gap-1 rounded-lg p-1 sm:grid-cols-4 lg:grid-cols-2"
						role="tablist"
						aria-label={t('tabs_label')}
					>
						{#each TABS as key (key)}
							<button
								type="button"
								role="tab"
								aria-selected={tab === key}
								class={segButton(tab === key)}
								onclick={() => (tab = key)}
							>
								{t(`tab.${key}`)} · {items.filter((x) => x.status === key).length}
							</button>
						{/each}
					</div>
				</div>
				<ul class="flex max-h-[38rem] flex-col overflow-y-auto">
					{#each list as x (x.id)}
						{@const on = x.id === selectedId}
						<li>
							<button
								type="button"
								class={[
									'border-lms-border lms-focus-ring flex w-full flex-col gap-2 border-b px-3.5 py-3 text-left',
									on &&
										'bg-lms-interactive-subtle/50 shadow-[inset_3px_0_0_var(--color-lms-interactive)]'
								]}
								aria-current={on}
								onclick={() => (selectedId = x.id)}
							>
								<span class="flex items-start gap-2">
									<span class="flex min-w-0 flex-1 flex-col gap-0.5">
										<span class="truncate text-sm font-bold">{x.institution_name || '—'}</span>
										<span class="text-lms-muted truncate text-xs"
											>{x.npsn ? `NPSN ${x.npsn} · ` : ''}{typeLabel(x.tenant_type)} · {zoneLabel(
												x.timezone
											)}</span
										>
									</span>
									<span
										class={[
											'flex-none text-xs',
											x.status === 'submitted' && slaPct(x) >= SLA_WARN_RATIO * 100
												? 'text-lms-warning-text font-semibold'
												: 'text-lms-muted'
										]}>{ageLabel(x)}</span
									>
								</span>
								{#if x.status === 'submitted'}
									<span class="bg-lms-surface-muted h-1 overflow-hidden rounded-full">
										<span
											class={[
												'block h-full rounded-full',
												slaPct(x) >= 100
													? 'bg-lms-danger-text'
													: slaPct(x) >= SLA_WARN_RATIO * 100
														? 'bg-lms-warning-text'
														: 'bg-lms-progress'
											]}
											style:width="{slaPct(x)}%"
										></span>
									</span>
								{/if}
							</button>
						</li>
					{:else}
						<li class="text-lms-muted flex flex-col items-center gap-2 px-4 py-10 text-sm">
							<Icon icon={Inbox} />{t('empty')}
						</li>
					{/each}
				</ul>
			</section>

			<!-- Detail -->
			{#if selected}
				<section class="flex min-w-0 flex-col gap-4" aria-label={t('detail_label')}>
					<div class="lms-card flex items-center gap-3.5 rounded-[14px]! p-4! shadow-none!">
						<span
							class="bg-lms-interactive-subtle text-lms-interactive-subtle-text flex size-12 flex-none items-center justify-center rounded-xl text-base font-bold"
							>{initials(selected.institution_name)}</span
						>
						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="truncate text-lg font-bold">{selected.institution_name}</span>
							<span class="text-lms-muted text-xs">
								{typeLabel(selected.tenant_type)}{selected.education_level
									? ` · ${selected.education_level}`
									: ''} · {zoneLabel(selected.timezone)} · {t(
									isEvent ? 'head_participants' : 'head_students',
									{ n: draft.seats || '—' }
								)}
							</span>
						</span>
						<span
							class={[
								'rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-[0.06em]',
								STATUS_TONE[selected.status]
							]}>{t(`status.${selected.status}`)}</span
						>
					</div>

					{#if selected.status === 'revision_requested'}
						<div class="lms-tone-info flex flex-wrap items-start gap-3 rounded-xl px-4 py-3.5">
							<Icon icon={Mail} />
							<span class="flex flex-[1_1_15rem] flex-col gap-0.5 text-[0.8125rem]">
								<strong class="text-sm">{t('banner.revision_title')}</strong>
								{t('banner.revision_text', {
									fields: selected.revision_fields.join(', '),
									note: selected.revision_note
								})}
							</span>
							<button
								type="button"
								disabled={busy}
								class="lms-focus-ring h-9 rounded-lg border border-current px-3.5 text-[0.8125rem] font-semibold"
								onclick={reopen}>{t('banner.mark_fixed')}</button
							>
						</div>
					{:else if selected.status === 'rejected'}
						<div class="lms-tone-danger flex flex-wrap items-start gap-3 rounded-xl px-4 py-3.5">
							<Icon icon={CircleX} />
							<span class="flex flex-[1_1_15rem] flex-col gap-0.5 text-[0.8125rem]">
								<strong class="text-sm"
									>{t('banner.rejected_title', { date: longDate(selected.reviewed_at) })}</strong
								>
								{t('banner.rejected_text', {
									reason: selected.rejection_reason
								})}{selected.rejection_note ? `. ${selected.rejection_note}` : ''}
							</span>
							<button
								type="button"
								disabled={busy}
								class="lms-focus-ring h-9 rounded-lg border border-current px-3.5 text-[0.8125rem] font-semibold"
								onclick={reopen}>{t('banner.reopen')}</button
							>
						</div>
					{:else if selected.status === 'approved'}
						<div class="lms-tone-success flex items-start gap-3 rounded-xl px-4 py-3.5">
							<Icon icon={CircleCheck} />
							<span class="flex flex-col gap-0.5 text-[0.8125rem]">
								<strong class="text-sm"
									>{t('banner.approved_title', { date: longDate(selected.reviewed_at) })}</strong
								>
								{t(selected.trial ? 'banner.approved_trial' : 'banner.approved_paid', {
									plan: selected.plan_name || '—'
								})}
							</span>
						</div>
					{/if}

					{#if provisioning}
						<div class="lms-card flex flex-col gap-2 rounded-[14px]! p-4! shadow-none!">
							<div class="flex flex-wrap items-baseline justify-between gap-2">
								<span class="text-sm font-bold">{t('prov.title')}</span>
								<span class="text-lms-muted font-mono text-xs">{provisioning.title}</span>
							</div>
							{#each provisioning.steps as s (s.key)}
								<div
									class="border-lms-border flex items-center gap-3 border-t py-2 text-[0.8125rem]"
								>
									<span
										class={[
											'flex size-5.5 items-center justify-center rounded-full',
											s.done
												? 'bg-lms-progress text-lms-on-interactive'
												: s.running
													? 'border-lms-interactive text-lms-interactive border-[1.5px]'
													: 'border-lms-border-strong text-lms-muted border-[1.5px]'
										]}
										><Icon
											icon={s.done ? Check : s.running ? LoaderCircle : Circle}
											size="sm"
										/></span
									>
									<span class={['flex-1', s.running ? 'font-bold' : 'font-medium']}
										>{t(`prov.${s.key}`)}</span
									>
									<span class="text-lms-muted text-xs"
										>{s.done
											? t('prov.done')
											: s.running
												? t('prov.running')
												: t('prov.waiting')}</span
									>
								</div>
							{/each}
							{#if provisioning.awaitingPayment}<span class="text-lms-muted text-xs"
									>{t('prov.awaiting_payment')}</span
								>{/if}
							{#if provisioning.error}<span class="text-lms-warning-text text-xs"
									>{t('prov.retrying', { error: provisioning.error })}</span
								>{/if}
						</div>
					{/if}

					<!-- Data pengajuan -->
					<div class="lms-card flex flex-col gap-4 rounded-[14px]! p-5! shadow-none!">
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<h2 class="text-[0.9375rem] font-bold">{t('data.title')}</h2>
							<span class="text-lms-muted text-xs"
								>{t('data.submitted', { date: longDate(selected.submitted_at) })}</span
							>
						</div>
						<div
							class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] items-start gap-x-4 gap-y-3.5"
						>
							<label class="col-span-full flex flex-col gap-1.5" for="{uid}-name">
								<span class="text-[0.8125rem] font-semibold">{t('data.name')}</span>
								<input
									id="{uid}-name"
									bind:value={draft.institution_name}
									readonly={locked}
									class={[inputClass, errors.name && 'border-lms-danger-text!']}
								/>
								<span class={['text-xs', errors.name ? 'text-lms-danger-text' : 'text-lms-muted']}
									>{errors.name ?? t('data.name_hint')}</span
								>
							</label>
							{#if isSchool}
								<label class="flex flex-col gap-1.5" for="{uid}-npsn">
									<span class="text-[0.8125rem] font-semibold">NPSN</span>
									<input
										id="{uid}-npsn"
										value={selected.npsn}
										readonly
										class={[inputClass, 'font-mono']}
									/>
								</label>
								<div class="flex flex-col gap-1.5">
									<span class="text-[0.8125rem] font-semibold">{t('data.level')}</span>
									<div
										class="bg-lms-surface-muted flex gap-1 rounded-lg p-1"
										role="radiogroup"
										aria-label={t('data.level')}
									>
										{#each LEVELS as level (level)}
											<button
												type="button"
												role="radio"
												aria-checked={draft.education_level === level}
												disabled={locked}
												class={segButton(draft.education_level === level)}
												onclick={() => (draft.education_level = level)}>{level}</button
											>
										{/each}
									</div>
								</div>
							{/if}
							<div class="flex flex-col gap-1.5">
								<span class="text-[0.8125rem] font-semibold">{t('data.timezone')}</span>
								<div
									class="bg-lms-surface-muted flex gap-1 rounded-lg p-1"
									role="radiogroup"
									aria-label={t('data.timezone')}
								>
									{#each queue.timezones as zone (zone.code)}
										<button
											type="button"
											role="radio"
											aria-checked={draft.timezone === zone.code}
											disabled={locked}
											class={segButton(draft.timezone === zone.code)}
											onclick={() => (draft.timezone = zone.code)}>{zone.label}</button
										>
									{/each}
								</div>
							</div>
							<label class="flex flex-col gap-1.5" for="{uid}-seats">
								<span class="text-[0.8125rem] font-semibold"
									>{t(isEvent ? 'data.participants' : 'data.seats')}</span
								>
								<input
									id="{uid}-seats"
									inputmode="numeric"
									value={draft.seats}
									readonly={locked}
									oninput={(e) => {
										draft.seats = e.currentTarget.value.replace(/\D/g, '');
										e.currentTarget.value = draft.seats;
									}}
									class={[inputClass, errors.seats && 'border-lms-danger-text!']}
								/>
								{#if errors.seats}<span class="text-lms-danger-text text-xs">{errors.seats}</span
									>{/if}
							</label>
							<label class="col-span-full flex flex-col gap-1.5" for="{uid}-addr">
								<span class="text-[0.8125rem] font-semibold">{t('data.address')}</span>
								<input
									id="{uid}-addr"
									bind:value={draft.address}
									readonly={locked}
									class={inputClass}
								/>
							</label>
						</div>
						<div class="border-lms-border flex flex-col gap-3 border-t pt-4">
							<span class="text-lms-muted font-mono text-[11px] font-semibold tracking-[0.08em]"
								>{t('data.pic')}</span
							>
							<div
								class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] items-start gap-x-4 gap-y-3.5"
							>
								{#each [{ key: 'contact_name', err: errors.pic, label: t('data.pic_name'), type: 'text' }, { key: 'contact_email', err: errors.email, label: t('data.pic_email'), type: 'email' }, { key: 'contact_phone', err: errors.phone, label: t('data.pic_phone'), type: 'tel' }] as const as f (f.key)}
									<label class="flex flex-col gap-1.5" for="{uid}-{f.key}">
										<span class="text-[0.8125rem] font-semibold">{f.label}</span>
										<input
											id="{uid}-{f.key}"
											type={f.type}
											bind:value={draft[f.key]}
											readonly={locked}
											class={[inputClass, f.err && 'border-lms-danger-text!']}
										/>
										{#if f.err}<span class="text-lms-danger-text text-xs">{f.err}</span>{/if}
									</label>
								{/each}
							</div>
							<div class="flex flex-wrap gap-2">
								{#each selected.files as file (file.id)}
									<!-- eslint-disable svelte/no-navigation-without-resolve -- proxy berkas lewat resolve(); hanya query id ditambahkan -->
									<a
										href={`${resolve('/platform/pengajuan/file')}?id=${file.id}`}
										target="_blank"
										rel="noopener"
										class="border-lms-border bg-lms-background lms-focus-ring flex h-8.5 items-center gap-2 rounded-lg border px-3 text-[0.8125rem]"
									>
										<Icon icon={FileText} size="sm" />{file.kind === 'logo'
											? t('data.logo')
											: file.file_name}
									</a>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
								{:else}
									<span class="text-lms-muted flex items-center gap-2 text-[0.8125rem]"
										><Icon icon={FileText} size="sm" />{t('data.no_files')}</span
									>
								{/each}
							</div>
						</div>
					</div>

					<!-- Verifikasi -->
					<div class="lms-card flex flex-col gap-2 rounded-[14px]! p-5! shadow-none!">
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<h2 class="text-[0.9375rem] font-bold">{t('check.title')}</h2>
							<span
								class={[
									'text-xs font-semibold',
									okCount === checks.length
										? 'text-lms-success-text'
										: tried && decision === 'approve'
											? 'text-lms-danger-text'
											: 'text-lms-warning-text'
								]}>{t('check.note', { ok: okCount, total: checks.length })}</span
							>
						</div>
						{#each checks as c (c.key)}
							{@const manual = c.kind === 'manual'}
							{@const highlight = tried && decision === 'approve' && !c.ok}
							<div
								class={[
									'flex items-center gap-3 rounded-xl border px-3.5 py-3',
									highlight
										? 'border-lms-danger-text'
										: c.ok
											? 'border-lms-success-text/35 bg-lms-success-text/5'
											: 'border-lms-border'
								]}
							>
								<button
									type="button"
									role="checkbox"
									aria-checked={c.ok}
									aria-label={checkLabel(c.key)}
									disabled={!manual || locked || busy}
									class={[
										'lms-focus-ring flex size-6 flex-none items-center justify-center rounded-md border-[1.5px]',
										c.ok
											? 'bg-lms-progress border-lms-progress text-lms-on-interactive'
											: manual
												? 'border-lms-border-strong text-transparent'
												: 'border-lms-danger-text text-lms-danger-text'
									]}
									onclick={() => toggleCheck(c.key)}
									><Icon icon={c.ok || manual ? Check : X} size="sm" /></button
								>
								<span class="flex min-w-0 flex-1 flex-col gap-0.5">
									<span class="text-sm font-semibold">{checkLabel(c.key)}</span>
									<span class="text-lms-muted text-xs">{checkSub(c.key, c.ok)}</span>
								</span>
								<span class="text-lms-muted font-mono text-[10px] tracking-[0.08em]"
									>{t(manual ? 'check.manual' : 'check.auto')}</span
								>
								{#if c.key === 'duplicate' && !c.ok && !locked}
									<button
										type="button"
										disabled={busy}
										class="lms-focus-ring border-lms-border-strong flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold"
										onclick={() => toggleCheck('duplicate')}
										><Icon icon={Check} size="sm" />{t('check.not_duplicate')}</button
									>
								{/if}
							</div>
						{/each}
					</div>

					<!-- Keputusan -->
					{#if !locked}
						<div class="lms-card flex flex-col gap-4 rounded-[14px]! p-5! shadow-none!">
							<h2 class="text-[0.9375rem] font-bold">{t('decision.title')}</h2>
							<div
								class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-2.5"
								role="radiogroup"
								aria-label={t('decision.title')}
							>
								{#each DECISIONS as d (d.key)}
									<button
										type="button"
										role="radio"
										aria-checked={decision === d.key}
										class={[
											'lms-focus-ring flex items-center gap-3 rounded-xl border p-3 text-left',
											decision === d.key ? 'border-current bg-current/5' : 'border-lms-border',
											d.tone
										]}
										onclick={() => {
											decision = d.key;
											tried = false;
										}}
									>
										<Icon icon={d.icon} />
										<span class="flex flex-col gap-0.5">
											<span class="text-lms-foreground text-sm font-bold"
												>{t(`decision.${d.key}`)}</span
											>
											<span class="text-lms-muted text-xs">{t(`decision.${d.key}_sub`)}</span>
										</span>
									</button>
								{/each}
							</div>

							{#if decision === 'approve'}
								<div class="flex flex-col gap-4">
									<div class="flex flex-col gap-2">
										<span class="text-[0.8125rem] font-semibold">{t('decision.plan')}</span>
										<div
											class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-2"
											role="radiogroup"
											aria-label={t('decision.plan')}
										>
											{#each plans as p (p.code)}
												<button
													type="button"
													role="radio"
													aria-checked={p.code === plan?.code}
													class={[
														'lms-focus-ring flex flex-col gap-0.5 rounded-xl border p-3 text-left',
														p.code === plan?.code
															? 'border-lms-interactive bg-lms-interactive-subtle/50'
															: 'border-lms-border'
													]}
													onclick={() => (planCode = p.code)}
												>
													<span class="text-sm font-bold">{p.name}</span>
													<span class="text-lms-muted text-xs"
														>{money(p.price_idr)}{t(`unit.${p.pricing_model}`)}</span
													>
												</button>
											{/each}
										</div>
										<span class="text-lms-muted text-xs">{estimate}</span>
									</div>
									{#if trialAllowed}
										<button
											type="button"
											role="switch"
											aria-checked={trial}
											class="lms-focus-ring border-lms-border flex items-center gap-3 rounded-xl border p-3 text-left"
											onclick={() => (trial = !trial)}
										>
											<span
												class={[
													'relative h-5.5 w-10 flex-none rounded-full transition-colors',
													trial ? 'bg-lms-interactive' : 'bg-lms-input-border'
												]}
												><span
													class={[
														'absolute top-0.75 left-0.75 size-4 rounded-full bg-white shadow transition-transform',
														trial && 'translate-x-4.5'
													]}
												></span></span
											>
											<span class="flex flex-col gap-0.5">
												<span class="text-sm font-semibold">{t('decision.trial')}</span>
												<span class="text-lms-muted text-xs"
													>{trial
														? t('decision.trial_on', { n: plan?.trial_max_students ?? 0 })
														: t('decision.trial_off')}</span
												>
											</span>
										</button>
									{/if}
									<div class="flex flex-col gap-2">
										<span class="text-[0.8125rem] font-semibold">{t('decision.cluster')}</span>
										{#each queue.clusters as c (c.id)}
											{@const pct = Math.round((c.used_units / Math.max(1, c.max_units)) * 100)}
											<button
												type="button"
												role="radio"
												aria-checked={clusterId === c.id}
												disabled={c.status !== CLUSTER_AVAILABLE}
												class={[
													'lms-focus-ring flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left disabled:opacity-50',
													clusterId === c.id
														? 'border-lms-interactive bg-lms-interactive-subtle/50'
														: 'border-lms-border'
												]}
												onclick={() => (clusterId = c.id)}
											>
												<span class="w-28 flex-none font-mono text-[0.8125rem] font-semibold"
													>{c.code}</span
												>
												<span class="bg-lms-surface-muted h-1.5 flex-1 overflow-hidden rounded-full"
													><span
														class={[
															'block h-full rounded-full',
															pct >= CLUSTER_WARN_PCT ? 'bg-lms-warning-text' : 'bg-lms-interactive'
														]}
														style:width="{pct}%"
													></span></span
												>
												<span class="text-lms-muted text-xs"
													>{t('decision.cluster_note', {
														used: c.used_units,
														max: c.max_units,
														region: c.region
													})}{c.id === recommendedCluster()
														? ` · ${t('decision.recommended')}`
														: pct >= CLUSTER_WARN_PCT
															? ` · ${t('decision.almost_full')}`
															: ''}</span
												>
											</button>
										{/each}
									</div>
									<div
										class="bg-lms-background flex items-center gap-2 rounded-lg px-3 py-2.5 text-[0.8125rem]"
									>
										<Icon icon={Database} size="sm" /><span>{t('decision.db_name')}</span><span
											class="ms-auto font-mono font-semibold">{dbName}</span
										>
									</div>
								</div>
							{:else if decision === 'revise'}
								<div class="flex flex-col gap-3">
									<span class="text-[0.8125rem] font-semibold">{t('decision.rev_fields')}</span>
									<div class="flex flex-wrap gap-2">
										{#each queue.revision_fields as f (f)}
											{@const on = revFields.includes(f)}
											<button
												type="button"
												aria-pressed={on}
												class={[
													'lms-focus-ring flex h-8.5 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-semibold',
													on
														? 'border-lms-interactive bg-lms-interactive-subtle text-lms-foreground'
														: 'border-lms-border-strong text-lms-muted'
												]}
												onclick={() =>
													(revFields = on ? revFields.filter((x) => x !== f) : [...revFields, f])}
											>
												<Icon icon={on ? Check : Plus} size="sm" />{f}
											</button>
										{/each}
									</div>
									<label class="flex flex-col gap-1.5" for="{uid}-rev">
										<span class="text-[0.8125rem] font-semibold">{t('decision.rev_note')}</span>
										<textarea
											id="{uid}-rev"
											bind:value={revNote}
											rows="3"
											placeholder={t('decision.rev_ph')}
											class="input lms-input lms-focus-ring py-2.5 text-sm"></textarea>
										<span
											class={[
												'text-xs',
												tried && errors.rev ? 'text-lms-danger-text' : 'text-lms-muted'
											]}>{tried && errors.rev ? errors.rev : t('decision.rev_hint')}</span
										>
									</label>
								</div>
							{:else}
								<div class="grid gap-3">
									<label class="flex flex-col gap-1.5" for="{uid}-rej">
										<span class="text-[0.8125rem] font-semibold">{t('decision.rej_reason')}</span>
										<select
											id="{uid}-rej"
											bind:value={rejReason}
											class={[
												'input lms-input lms-focus-ring h-10 text-sm',
												tried && errors.rejReason && 'border-lms-danger-text!'
											]}
										>
											<option value="">{t('decision.rej_pick')}</option>
											{#each queue.reject_reasons as r (r)}<option value={r}>{r}</option>{/each}
										</select>
										{#if tried && errors.rejReason}<span class="text-lms-danger-text text-xs"
												>{errors.rejReason}</span
											>{/if}
									</label>
									<label class="flex flex-col gap-1.5" for="{uid}-rejn">
										<span class="text-[0.8125rem] font-semibold"
											>{t('decision.rej_note')}
											<span class="text-lms-muted font-normal"
												>({t(
													rejReason === OTHER_REASON ? 'decision.required' : 'decision.optional'
												)})</span
											></span
										>
										<textarea
											id="{uid}-rejn"
											bind:value={rejNote}
											rows="3"
											placeholder={t('decision.rej_ph')}
											class="input lms-input lms-focus-ring py-2.5 text-sm"></textarea>
										{#if tried && errors.rejNote}<span class="text-lms-danger-text text-xs"
												>{errors.rejNote}</span
											>{/if}
									</label>
								</div>
							{/if}
						</div>

						<div
							class="bg-lms-surface/95 border-lms-border sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur"
						>
							<span
								class={[
									'flex flex-1 items-center gap-2 text-[0.8125rem]',
									failing ? 'text-lms-danger-text' : 'text-lms-muted'
								]}
							>
								<Icon icon={failing ? CircleAlert : Info} size="sm" />
								{failing
									? (errors.checks ?? t('bar.fields', { n: fieldErrors }))
									: okCount === checks.length || decision !== 'approve'
										? t('bar.ready')
										: t('bar.checks_first')}
							</span>
							<button
								type="button"
								disabled={busy || !dirty}
								class="lms-focus-ring text-lms-muted h-10 rounded-lg px-3 text-[0.8125rem] font-semibold disabled:opacity-50"
								onclick={() => (draft = emptyDraft(selected))}>{t('bar.reset')}</button
							>
							<button
								type="button"
								disabled={busy}
								class={[
									'lms-focus-ring text-lms-on-interactive flex h-10 items-center gap-2 rounded-lg px-4 text-[0.8125rem] font-semibold',
									decision === 'reject' ? 'bg-lms-danger-text' : 'bg-lms-interactive'
								]}
								onclick={askDecide}
							>
								<Icon
									icon={decision === 'approve' ? Database : decision === 'revise' ? Send : CircleX}
									size="sm"
								/>{t(`bar.go_${decision}`)}
							</button>
						</div>
					{/if}
				</section>
			{:else}
				<StatePanel title={t('none_title')} description={t('none_text')} />
			{/if}
		</div>
	</div>

	{#if confirmContent && confirmOpen}
		<ConfirmDialog
			bind:open={confirmOpen}
			tone={confirmContent.tone}
			icon={confirmContent.icon}
			title={confirmContent.title}
			message={confirmContent.message}
			details={confirmContent.details}
			confirmLabel={confirmContent.label}
			confirmIcon={Check}
			busyLabel={t('confirm.busy')}
			cancelLabel={t('confirm.cancel')}
			onconfirm={decide}
		/>
	{/if}
	<Toast message={toast?.text ?? null} icon={toast?.icon} />
{/if}
