<script lang="ts">
	import { invalidate } from '$app/navigation';
	import ConfirmDialog, { type ConfirmDialogDetail } from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { useI18n } from '$lib/i18n';
	import { runPageAction } from '$lib/utils/page-action';
	import type { LucideIcon } from '@lucide/svelte';
	import AlarmClock from '@lucide/svelte/icons/alarm-clock';
	import Check from '@lucide/svelte/icons/check';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import FileImage from '@lucide/svelte/icons/file-image';
	import FileText from '@lucide/svelte/icons/file-text';
	import FileUp from '@lucide/svelte/icons/file-up';
	import IdCard from '@lucide/svelte/icons/id-card';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Info from '@lucide/svelte/icons/info';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import Pause from '@lucide/svelte/icons/pause';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Timer from '@lucide/svelte/icons/timer';
	import User from '@lucide/svelte/icons/user';
	import UserPen from '@lucide/svelte/icons/user-pen';
	import UserX from '@lucide/svelte/icons/user-x';
	import X from '@lucide/svelte/icons/x';
	import { onMount, untrack } from 'svelte';
	import type { BulkApproveResult } from '$lib/api/generated/lms';
	import {
		DECISIONS,
		DOCUMENT_OPTIONS,
		INBOX_TABS,
		OTHER_REASON,
		OTHER_REASON_MIN,
		REJECT_OPTIONS,
		REQUEST_KINDS,
		ago,
		deadlineChip,
		hoursLeft,
		inTab,
		initials,
		isDone,
		isNew,
		logTime,
		sortItems,
		type Decision,
		type Inbox as InboxData,
		type InboxItem,
		type InboxTab,
		type RequestKind
	} from '../approvals.model';

	export interface ApprovalsPageData {
		area: 'platform' | 'school_admin';
		inbox: InboxData | null;
		failure: string | null;
	}

	interface Props {
		data: ApprovalsPageData;
		/** Proxy lampiran (rute SvelteKit; token tetap di cookie HttpOnly). */
		documentPath: string;
	}

	let { data, documentPath }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`approvals.${key}`, params);

	const KIND_ICON: Record<RequestKind, LucideIcon> = {
		name: UserPen,
		identity: IdCard,
		deletion: UserX
	};
	const CHIP_ICON: Record<string, LucideIcon> = {
		approved: Check,
		declined: X,
		waiting: Pause,
		self: User,
		overdue_days: AlarmClock,
		overdue_hours: AlarmClock,
		left_hours: Timer,
		left_days: Timer
	};
	const TOAST_MS = 5000;
	/** Badge menu "Persetujuan" di layout ikut diperbarui setelah keputusan. */
	const APPROVALS_DEPENDENCY = 'app:approvals';
	const TICK_MS = 60_000;

	let inbox = $state<InboxData | null>(untrack(() => data.inbox));
	let tab = $state<InboxTab>('pending');
	let types = $state<RequestKind[]>([]);
	let query = $state('');
	let openId = $state<string | null>(null);
	let decision = $state<Decision>('approve');
	let rejectKey = $state('');
	let note = $state('');
	let docsRequested = $state<string[]>([]);
	let selected = $state<string[]>([]);
	let tried = $state(false);
	let busy = $state(false);
	let confirm = $state<{ kind: 'approve' | 'reject' | 'bulk'; id?: string } | null>(null);
	let preview = $state<{ id: string; name: string; type: string } | null>(null);
	let toast = $state<{ text: string; icon: LucideIcon } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	let now = $state(Date.now());

	onMount(() => {
		const interval = setInterval(() => (now = Date.now()), TICK_MS);
		return () => {
			clearInterval(interval);
			clearTimeout(toastTimer);
		};
	});

	function say(text: string, icon: LucideIcon = CircleCheck) {
		clearTimeout(toastTimer);
		toast = { text, icon };
		toastTimer = setTimeout(() => (toast = null), TOAST_MS);
	}

	const role = $derived(inbox?.approver_role ?? 'school_admin');
	const items = $derived(inbox?.items ?? []);
	const pending = $derived(items.filter((x) => x.status === 'pending'));
	const waitingDocs = $derived(items.filter((x) => x.status === 'need_docs'));
	const done = $derived(items.filter(isDone));
	const overdue = $derived(pending.filter((x) => !x.self && hoursLeft(x, now) < 0).length);
	const list = $derived(
		sortItems(
			items.filter(
				(x) =>
					inTab(x, tab) &&
					(!types.length || types.includes(x.kind as RequestKind)) &&
					x.requester.name.toLowerCase().includes(query.trim().toLowerCase())
			),
			tab,
			now
		)
	);
	const selectable = $derived(list.filter((x) => tab === 'pending' && !x.self));
	const allOn = $derived(selectable.length > 0 && selectable.every((x) => selected.includes(x.id)));
	const opened = $derived(list.find((x) => x.id === openId) ?? null);

	const kindLabel = (k: string) => t(`kind.${k}`);
	function fieldLabel(x: InboxItem): string {
		if (x.kind === 'name') return i18n.t('account.profile.full_name');
		if (x.kind === 'identity') return i18n.t(`account.identity.${x.identity_kind}.label`);
		return t('deletion_field');
	}
	const fromValue = (x: InboxItem) => (x.kind === 'deletion' ? t('deletion_from') : x.from || '—');
	const toValue = (x: InboxItem) => (x.kind === 'deletion' ? t('deletion_to') : x.to);
	const rejectLabel = (k: string) => t(`reject.${k}`);
	const docLabel = (k: string) => t(`docs.${k}`);

	function chipLabel(x: InboxItem): string {
		const c = deadlineChip(x, now);
		return 'n' in c ? t(`chip.${c.key}`, { n: c.n }) : t(`chip.${c.key}`);
	}

	function agoLabel(iso: string): string {
		const a = ago(iso, now);
		return a.key === 'just_now' ? t('ago.just_now') : t(`ago.${a.key}`, { n: a.n });
	}

	function logLabel(action: string, detail: string): string {
		if (action === 'approved' && detail === 'massal') return t('log.approved_bulk');
		return detail ? t(`log.${action}_detail`, { detail }) : t(`log.${action}`);
	}

	function toggle(id: string) {
		if (openId === id) {
			openId = null;
			return;
		}
		openId = id;
		decision = 'approve';
		rejectKey = '';
		note = '';
		docsRequested = [];
		tried = false;
	}

	const actError = $derived.by(() => {
		if (!tried) return '';
		if (decision === 'reject' && !rejectKey) return t('error.reject_reason');
		if (
			decision === 'reject' &&
			rejectKey === OTHER_REASON &&
			note.trim().length < OTHER_REASON_MIN
		) {
			return t('error.reject_note', { n: OTHER_REASON_MIN });
		}
		if (decision === 'docs' && !docsRequested.length) return t('error.docs');
		return '';
	});
	const valid = $derived(
		!(
			decision === 'reject' &&
			(!rejectKey || (rejectKey === OTHER_REASON && note.trim().length < OTHER_REASON_MIN))
		) && !(decision === 'docs' && !docsRequested.length)
	);

	function declineReason(): string {
		const n = note.trim();
		if (rejectKey === OTHER_REASON) return n;
		return rejectLabel(rejectKey) + (n ? `. ${n}` : '');
	}

	async function submit(x: InboxItem) {
		if (!valid) {
			tried = true;
			return;
		}
		if (decision === 'docs') {
			await decide(x, 'docs');
			return;
		}
		confirm = { kind: decision, id: x.id };
	}

	async function decide(x: InboxItem, kind: Decision) {
		if (busy) return;
		busy = true;
		const outcome =
			kind === 'approve'
				? await runPageAction<InboxData>('approve', { id: x.id, note: note.trim() })
				: kind === 'reject'
					? await runPageAction<InboxData>('decline', { id: x.id, reason: declineReason() })
					: await runPageAction<InboxData>('requestDocs', {
							id: x.id,
							documents: docsRequested.map(docLabel),
							note: note.trim()
						});
		busy = false;
		confirm = null;
		if (!outcome.ok) {
			say(errorText(outcome.code), CircleX);
			return;
		}
		inbox = outcome.data;
		void invalidate(APPROVALS_DEPENDENCY);
		openId = null;
		selected = selected.filter((id) => id !== x.id);
		say(
			t(`toast.${kind}`, { name: x.requester.name }),
			kind === 'reject' ? CircleX : kind === 'docs' ? FileUp : CircleCheck
		);
	}

	async function bulkApprove() {
		if (busy) return;
		busy = true;
		const outcome = await runPageAction<BulkApproveResult>('bulkApprove', { ids: selected });
		busy = false;
		confirm = null;
		if (!outcome.ok) {
			say(errorText(outcome.code), CircleX);
			return;
		}
		inbox = outcome.data.inbox;
		void invalidate(APPROVALS_DEPENDENCY);
		selected = [];
		openId = null;
		say(t('toast.bulk', { n: outcome.data.approved }), CheckCheck);
	}

	const KNOWN_ERRORS = new Set([
		'self_review',
		'nothing_pending',
		'not_found',
		'forbidden',
		'unauthenticated',
		'unavailable'
	]);
	const errorText = (code: string) => t(`errors.${KNOWN_ERRORS.has(code) ? code : 'generic'}`);

	const confirmContent = $derived.by(() => {
		if (!confirm) return null;
		if (confirm.kind === 'bulk') {
			const xs = pending.filter((x) => selected.includes(x.id));
			return {
				tone: 'primary' as const,
				icon: CheckCheck,
				title: t('confirm.bulk_title', { n: xs.length }),
				message: t('confirm.bulk_message'),
				label: t('confirm.bulk_label'),
				details: xs.slice(0, 4).map((x): ConfirmDialogDetail => ({
					icon: KIND_ICON[x.kind as RequestKind],
					label: `${x.requester.name} · APV-${x.number}`,
					value: toValue(x)
				}))
			};
		}
		const x = items.find((y) => y.id === confirm?.id);
		if (!x) return null;
		return confirm.kind === 'reject'
			? {
					tone: 'danger' as const,
					icon: CircleX,
					title: t('confirm.reject_title', { name: x.requester.name }),
					message: t('confirm.reject_message'),
					label: t('confirm.reject_label'),
					details: [{ icon: MessageSquare, label: t('confirm.reason'), value: declineReason() }]
				}
			: {
					tone: 'primary' as const,
					icon: CircleCheck,
					title: t('confirm.approve_title', { name: x.requester.name }),
					message: t(`effect.${x.kind}`),
					label: t('confirm.approve_label'),
					details: [
						{ icon: KIND_ICON[x.kind as RequestKind], label: fieldLabel(x), value: toValue(x) }
					]
				};
	});

	async function doConfirm() {
		if (!confirm) return;
		if (confirm.kind === 'bulk') return bulkApprove();
		const x = items.find((y) => y.id === confirm?.id);
		if (x) await decide(x, confirm.kind);
	}

	const docUrl = (id: string) => `${documentPath}?id=${encodeURIComponent(id)}&area=${data.area}`;
</script>

<svelte:head>
	<title>{t('head_title')} · FLIXARE</title>
</svelte:head>

{#if !inbox}
	<div class="flex flex-col gap-4 pb-24">
		<StatePanel
			title={t(
				`failure.${data.failure === 'forbidden' ? 'forbidden' : data.failure === 'unauthenticated' ? 'unauthenticated' : 'unavailable'}.title`
			)}
			description={t(
				`failure.${data.failure === 'forbidden' ? 'forbidden' : data.failure === 'unauthenticated' ? 'unauthenticated' : 'unavailable'}.text`
			)}
			tone={data.failure === 'unavailable' ? 'error' : 'warning'}
			headingLevel={1}
		/>
	</div>
{:else}
	<div
		class="text-lms-foreground flex flex-col gap-4 pb-28"
		data-screen-label="11 Kotak Persetujuan"
	>
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div class="flex flex-col gap-1.5">
				<span class="text-lms-link font-mono text-xs font-semibold tracking-[0.1em]"
					>{t('eyebrow', { role: t(`role_tag.${role}`) })}</span
				>
				<h1 class="text-[26px] leading-[34px] font-bold">{t('title')}</h1>
				<span class="text-lms-muted text-sm"
					>{t(`desc.${role}`, { tenant: inbox.tenant_name })}</span
				>
			</div>
			<dl class="flex flex-wrap gap-5">
				{#each [['pending', pending.filter((x) => !x.self).length], ['overdue', overdue], ['docs', waitingDocs.length]] as const as [key, value] (key)}
					<div class="flex flex-col gap-0.5">
						<dt class="text-lms-muted font-mono text-[11px] tracking-[0.08em]">
							{t(`stat.${key}`)}
						</dt>
						<dd
							class="text-[22px] font-bold tabular-nums {key === 'overdue' && value
								? 'text-lms-danger-text'
								: ''}"
						>
							{value}
						</dd>
					</div>
				{/each}
			</dl>
		</div>

		<section
			class="bg-lms-surface border-lms-border flex flex-col overflow-hidden rounded-xl border"
		>
			<div class="border-lms-border flex flex-wrap items-center gap-3 border-b px-4 py-3.5">
				<div class="bg-lms-surface-muted flex gap-0.5 rounded-[10px] p-[3px]" role="tablist">
					{#each INBOX_TABS as key (key)}
						{@const count =
							key === 'pending'
								? pending.length
								: key === 'docs'
									? waitingDocs.length
									: done.length}
						<button
							type="button"
							role="tab"
							aria-selected={tab === key}
							class="lms-focus-ring h-[34px] rounded-lg px-3.5 text-[13px] font-semibold whitespace-nowrap {tab ===
							key
								? 'bg-lms-surface text-lms-foreground shadow-sm'
								: 'text-lms-muted'}"
							onclick={() => {
								tab = key;
								openId = null;
								selected = [];
							}}>{t(`tab.${key}`, { n: count })}</button
						>
					{/each}
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#each REQUEST_KINDS as kind (kind)}
						{@const on = types.includes(kind)}
						<button
							type="button"
							aria-pressed={on}
							class="lms-focus-ring flex h-[30px] items-center gap-1.5 rounded-full border-[1.5px] px-2.5 text-xs font-semibold {on
								? 'border-lms-interactive bg-lms-interactive-subtle text-lms-foreground'
								: 'border-lms-border-strong bg-lms-surface text-lms-muted'}"
							onclick={() => (types = on ? types.filter((k) => k !== kind) : [...types, kind])}
							><Icon icon={KIND_ICON[kind]} size="sm" />{kindLabel(kind)}</button
						>
					{/each}
				</div>
				<span class="flex-1"></span>
				<label class="relative block min-w-45 flex-[0_1_240px]">
					<span class="text-lms-muted absolute top-2.5 left-3"
						><Icon icon={Search} size="sm" /></span
					>
					<input
						type="search"
						placeholder={t('search')}
						aria-label={t('search')}
						class="bg-lms-surface border-lms-border-strong lms-focus-ring h-[38px] w-full rounded-lg border ps-9 pe-3 text-[13px]"
						bind:value={query}
					/>
				</label>
			</div>

			<div class="overflow-x-auto">
				<div class="min-w-[860px]" role="table" aria-label={t('title')}>
					<div
						class="bg-lms-background border-lms-border text-lms-muted grid grid-cols-[44px_minmax(180px,1.3fr)_150px_minmax(200px,1.6fr)_110px_130px_36px] items-center gap-3 border-b px-4 py-2.5 font-mono text-[11px] tracking-[0.08em]"
						role="row"
					>
						<span role="columnheader">
							{#if tab === 'pending' && selectable.length}
								<button
									type="button"
									role="checkbox"
									aria-checked={allOn}
									aria-label={t('select_all')}
									class="lms-focus-ring text-lms-on-interactive flex size-5 items-center justify-center rounded-[5px] border-[1.5px] {allOn
										? 'bg-lms-interactive border-lms-interactive'
										: 'border-lms-border-strong'}"
									onclick={() => (selected = allOn ? [] : selectable.map((x) => x.id))}
									><span class={allOn ? '' : 'opacity-0'}><Icon icon={Check} size="sm" /></span
									></button
								>
							{/if}
						</span>
						<span role="columnheader">{t('col.requester')}</span>
						<span role="columnheader">{t('col.kind')}</span>
						<span role="columnheader">{t('col.change')}</span>
						<span role="columnheader">{t('col.submitted')}</span>
						<span role="columnheader">{tab === 'done' ? t('col.decision') : t('col.deadline')}</span
						>
						<span role="columnheader"></span>
					</div>

					{#each list as x (x.id)}
						{@const isOpen = openId === x.id}
						{@const on = selected.includes(x.id)}
						{@const chip = deadlineChip(x, now)}
						<div
							class="border-lms-border border-b {isOpen
								? 'bg-lms-interactive-subtle/40 shadow-[inset_3px_0_0_var(--color-lms-interactive)]'
								: on
									? 'bg-lms-interactive-subtle/60'
									: ''}"
							role="rowgroup"
						>
							<div
								class="grid grid-cols-[44px_minmax(180px,1.3fr)_150px_minmax(200px,1.6fr)_110px_130px_36px] items-center gap-3 px-4 py-3"
								role="row"
							>
								<span class="flex" role="cell">
									{#if tab === 'pending' && !x.self}
										<button
											type="button"
											role="checkbox"
											aria-checked={on}
											aria-label={t('select', { name: x.requester.name })}
											class="lms-focus-ring text-lms-on-interactive flex size-5 items-center justify-center rounded-[5px] border-[1.5px] {on
												? 'bg-lms-interactive border-lms-interactive'
												: 'border-lms-border-strong'}"
											onclick={() =>
												(selected = on ? selected.filter((y) => y !== x.id) : [...selected, x.id])}
											><span class={on ? '' : 'opacity-0'}><Icon icon={Check} size="sm" /></span
											></button
										>
									{/if}
								</span>
								<button
									type="button"
									class="lms-focus-ring flex min-w-0 items-center gap-2.5 text-start"
									aria-expanded={isOpen}
									onclick={() => toggle(x.id)}
								>
									<span
										class="bg-lms-interactive text-lms-on-interactive flex size-8 flex-none items-center justify-center rounded-full text-[11px] font-bold"
										aria-hidden="true">{initials(x.requester.name)}</span
									>
									<span class="flex min-w-0 flex-col gap-0.5">
										<span class="flex flex-wrap items-center gap-1.5 text-sm font-bold"
											>{x.requester.name}
											{#if isNew(x, now)}<span
													class="bg-lms-interactive text-lms-on-interactive rounded-full px-1.5 py-px text-[9px] font-bold"
													>{t('new')}</span
												>{/if}</span
										>
										<span class="text-lms-muted truncate text-xs"
											>{x.requester.role_name} · APV-{x.number}</span
										>
									</span>
								</button>
								<span class="flex" role="cell"
									><span
										class="bg-lms-surface-muted flex items-center gap-1.5 rounded-full px-[9px] py-[3px] text-[11px] font-bold whitespace-nowrap"
										><Icon icon={KIND_ICON[x.kind as RequestKind]} size="sm" />{kindLabel(
											x.kind
										)}</span
									></span
								>
								<span class="flex min-w-0 flex-col gap-0.5 text-[13px]" role="cell">
									<span class="text-lms-muted text-xs">{fieldLabel(x)}</span>
									<span class="truncate"
										><span class="text-lms-muted line-through">{fromValue(x)}</span>
										<span class="text-lms-muted">→</span> <b>{toValue(x)}</b></span
									>
								</span>
								<span class="flex flex-col gap-0.5 text-xs" role="cell">
									<span>{agoLabel(x.created_at)}</span>
									{#if x.documents.length}
										<span class="text-lms-muted flex items-center gap-1"
											><Icon icon={Paperclip} size="sm" />{t('attachments', {
												n: x.documents.length
											})}</span
										>
									{/if}
								</span>
								<span class="flex" role="cell"
									><span
										class="flex items-center gap-1.5 rounded-full px-[9px] py-[3px] text-[11px] font-bold whitespace-nowrap {chip.tone}"
										><Icon icon={CHIP_ICON[chip.key] ?? Timer} size="sm" />{chipLabel(x)}</span
									></span
								>
								<button
									type="button"
									aria-label={t('details')}
									aria-expanded={isOpen}
									class="lms-focus-ring border-lms-border-strong bg-lms-surface text-lms-muted flex size-8 items-center justify-center rounded-lg border"
									onclick={() => toggle(x.id)}
									><Icon icon={isOpen ? ChevronUp : ChevronDown} size="sm" /></button
								>
							</div>

							{#if isOpen && opened}
								<div class="flex flex-wrap items-start gap-5 ps-[72px] pe-4 pt-1 pb-[18px]">
									<div class="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
										<div
											class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2.5"
										>
											<div class="lms-tone-danger flex flex-col gap-1 rounded-lg px-3 py-2.5">
												<span class="font-mono text-[10px] tracking-[0.08em]">{t('current')}</span>
												<span class="text-lms-foreground text-sm [overflow-wrap:anywhere]"
													>{fromValue(x)}</span
												>
											</div>
											<div class="lms-tone-success flex flex-col gap-1 rounded-lg px-3 py-2.5">
												<span class="font-mono text-[10px] tracking-[0.08em]">{t('proposed')}</span>
												<span
													class="text-lms-foreground text-sm font-semibold [overflow-wrap:anywhere]"
													>{toValue(x)}</span
												>
											</div>
										</div>
										<div class="flex flex-col gap-1">
											<span class="text-lms-muted text-xs font-semibold">{t('reason')}</span>
											<span class="text-sm leading-[21px]">{x.reason || '—'}</span>
										</div>
										<div class="flex flex-wrap items-center gap-2">
											<span class="text-lms-muted text-xs font-semibold"
												>{t('attachments_label')}</span
											>
											{#each x.documents as d (d.id)}
												<button
													type="button"
													class="lms-focus-ring border-lms-border bg-lms-background flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs"
													onclick={() =>
														(preview = { id: d.id, name: d.file_name, type: d.content_type })}
													><span class="text-lms-link"
														><Icon
															icon={d.content_type === 'application/pdf' ? FileText : FileImage}
															size="sm"
														/></span
													>{d.file_name}</button
												>
											{:else}
												<span class="text-lms-muted text-xs">{t('no_attachments')}</span>
											{/each}
										</div>
										<span class="text-lms-muted flex items-start gap-1.5 text-xs leading-[18px]"
											><span class="mt-0.5"><Icon icon={Info} size="sm" /></span>{t(
												`effect.${x.kind}`
											)}{x.status === 'need_docs'
												? ' ' + t('requested', { docs: x.docs_requested.join(', ') })
												: ''}</span
										>
										<div class="border-lms-border flex flex-col gap-1.5 border-t pt-2.5">
											<span class="text-lms-muted text-xs font-semibold">{t('history')}</span>
											{#each x.log as l, i (i)}
												<span class="flex items-baseline gap-2 text-xs"
													><span class="text-lms-muted min-w-24 font-mono"
														>{logTime(l.created_at)}</span
													><span><b>{l.actor}</b> · {logLabel(l.action, l.detail)}</span></span
												>
											{/each}
										</div>
									</div>

									<div
										class="bg-lms-surface border-lms-border flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-xl border p-4"
									>
										{#if x.self}
											<span class="text-lms-muted text-[13px] leading-5">{t('self_note')}</span>
										{:else if isDone(x)}
											<span class="flex flex-col gap-1">
												<span
													class="text-sm font-bold {x.status === 'approved'
														? 'text-lms-success-text'
														: 'text-lms-danger-text'}"
													>{t(`done.${x.status}`, { name: x.decided_by })}</span
												>
												<span class="text-lms-muted text-[13px]"
													>{x.decided_at ? logTime(x.decided_at) : ''}{x.decision_note
														? ' · ' + x.decision_note
														: ''}</span
												>
											</span>
										{:else if x.status === 'need_docs'}
											<span class="text-lms-muted text-[13px] leading-5"
												>{t('waiting_docs', { docs: x.docs_requested.join(', ') })}</span
											>
										{:else}
											<div
												class="bg-lms-surface-muted grid grid-cols-3 gap-0.5 rounded-[10px] p-[3px]"
												role="radiogroup"
											>
												{#each DECISIONS as d (d)}
													<button
														type="button"
														role="radio"
														aria-checked={decision === d}
														class="lms-focus-ring min-h-9 rounded-lg p-1 text-xs leading-tight font-semibold {decision ===
														d
															? 'bg-lms-surface text-lms-foreground shadow-sm'
															: 'text-lms-muted'}"
														onclick={() => {
															decision = d;
															tried = false;
														}}>{t(`decision.${d}`)}</button
													>
												{/each}
											</div>
											{#if decision === 'approve'}
												<label class="flex flex-col gap-1.5">
													<span class="text-[13px] font-semibold"
														>{t('note_label')}
														<span class="text-lms-muted font-normal">{t('optional')}</span></span
													>
													<textarea
														rows="2"
														class="bg-lms-surface border-lms-border-strong lms-focus-ring resize-y rounded-[10px] border-[1.5px] px-3 py-2.5 text-sm"
														bind:value={note}></textarea>
												</label>
											{:else if decision === 'reject'}
												<div class="flex flex-col gap-2">
													<span class="text-[13px] font-semibold">{t('reject_label')}</span>
													<div class="flex flex-wrap gap-1.5">
														{#each REJECT_OPTIONS[x.kind as RequestKind] as r (r)}
															<button
																type="button"
																aria-pressed={rejectKey === r}
																class="lms-focus-ring h-8 rounded-full border-[1.5px] px-2.5 text-xs font-semibold {rejectKey ===
																r
																	? 'border-lms-danger-text bg-lms-danger-subtle'
																	: 'border-lms-border-strong bg-lms-surface'}"
																onclick={() => (rejectKey = r)}>{rejectLabel(r)}</button
															>
														{/each}
													</div>
												</div>
												<label class="flex flex-col gap-1.5">
													<span class="text-[13px] font-semibold"
														>{t('explain')}
														<span class="text-lms-muted font-normal"
															>{rejectKey === OTHER_REASON ? t('required') : t('optional')}</span
														></span
													>
													<textarea
														rows="2"
														placeholder={t('explain_placeholder')}
														class="bg-lms-surface lms-focus-ring resize-y rounded-[10px] border-[1.5px] px-3 py-2.5 text-sm {tried &&
														rejectKey === OTHER_REASON &&
														note.trim().length < OTHER_REASON_MIN
															? 'border-lms-danger-text'
															: 'border-lms-border-strong'}"
														bind:value={note}></textarea>
												</label>
											{:else}
												<div class="flex flex-col gap-2">
													<span class="text-[13px] font-semibold">{t('docs_label')}</span>
													<div class="flex flex-wrap gap-1.5">
														{#each DOCUMENT_OPTIONS[x.kind as RequestKind] as d (d)}
															{@const sel = docsRequested.includes(d)}
															<button
																type="button"
																aria-pressed={sel}
																class="lms-focus-ring flex h-8 items-center gap-1 rounded-full border-[1.5px] px-2.5 text-xs font-semibold {sel
																	? 'border-lms-interactive bg-lms-interactive-subtle'
																	: 'border-lms-border-strong bg-lms-surface'}"
																onclick={() =>
																	(docsRequested = sel
																		? docsRequested.filter((y) => y !== d)
																		: [...docsRequested, d])}
																><Icon icon={sel ? Check : Plus} size="sm" />{docLabel(d)}</button
															>
														{/each}
													</div>
												</div>
												<label class="flex flex-col gap-1.5">
													<span class="text-[13px] font-semibold"
														>{t('message')}
														<span class="text-lms-muted font-normal">{t('optional')}</span></span
													>
													<textarea
														rows="2"
														placeholder={t('message_placeholder')}
														class="bg-lms-surface border-lms-border-strong lms-focus-ring resize-y rounded-[10px] border-[1.5px] px-3 py-2.5 text-sm"
														bind:value={note}></textarea>
												</label>
												<span class="text-lms-muted text-xs">{t('docs_pause')}</span>
											{/if}
											<span class="text-lms-danger-text text-xs" role="alert">{actError}</span>
											<button
												type="button"
												disabled={busy}
												class="lms-focus-ring text-lms-on-interactive flex h-[42px] items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-bold disabled:opacity-60 {decision ===
												'reject'
													? 'bg-lms-danger-text'
													: decision === 'docs'
														? 'bg-lms-interactive'
														: 'bg-lms-success-text'}"
												onclick={() => submit(x)}
											>
												<Icon
													icon={decision === 'reject'
														? CircleX
														: decision === 'docs'
															? FileUp
															: CircleCheck}
													size="sm"
												/>
												{t(`submit.${decision}`)}
											</button>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/each}

					{#if list.length === 0}
						<div
							class="text-lms-muted flex flex-col items-center gap-2 px-4 py-12 text-center text-sm"
						>
							<span class="text-lms-muted"><Icon icon={Inbox} size="lg" /></span>
							{t(`empty.${tab}`)}
						</div>
					{/if}
				</div>
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
				<span class="text-lms-muted text-xs">{t('sla_note', { hours: inbox.sla_hours })}</span>
			</div>
		</section>

		{#if selected.length && tab === 'pending'}
			<div
				class="bg-lms-hero text-lms-on-hero sticky bottom-19 z-6 flex flex-wrap items-center gap-3 rounded-xl py-3 ps-[18px] pe-3 shadow-2xl"
			>
				<span class="flex-[1_1_200px] text-sm font-semibold"
					>{t('selected', { n: selected.length })}</span
				>
				<button
					type="button"
					class="lms-focus-ring h-10 rounded-[10px] border border-current px-3.5 text-[13px] font-semibold"
					onclick={() => (selected = [])}>{t('clear_selection')}</button
				>
				<button
					type="button"
					class="lms-focus-ring bg-lms-success-text text-lms-on-interactive flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-bold"
					onclick={() => (confirm = { kind: 'bulk' })}
					><Icon icon={CheckCheck} size="sm" />{t('approve_selected')}</button
				>
			</div>
		{/if}
	</div>

	{#if preview}
		<div
			class="fixed inset-0 z-90 flex items-center justify-center bg-[rgba(10,16,41,0.7)] p-4"
			role="presentation"
			onclick={() => (preview = null)}
			onkeydown={(e) => e.key === 'Escape' && (preview = null)}
		>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="bg-lms-surface text-lms-foreground flex w-[min(100%,720px)] flex-col gap-3 rounded-[14px] p-4"
				role="dialog"
				aria-modal="true"
				aria-label={preview.name}
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
			>
				<div class="flex items-center justify-between gap-2.5">
					<span class="truncate text-sm font-bold">{preview.name}</span>
					<button
						type="button"
						aria-label={t('close')}
						class="lms-focus-ring border-lms-border-strong text-lms-muted flex size-[34px] items-center justify-center rounded-lg border"
						onclick={() => (preview = null)}><Icon icon={X} size="sm" /></button
					>
				</div>
				{#if preview.type === 'application/pdf'}
					<iframe
						title={preview.name}
						src={docUrl(preview.id)}
						class="border-lms-border h-[70vh] w-full rounded-[10px] border"
					></iframe>
				{:else}
					<img
						src={docUrl(preview.id)}
						alt={preview.name}
						class="border-lms-border max-h-[70vh] w-full rounded-[10px] border object-contain"
					/>
				{/if}
			</div>
		</div>
	{/if}

	{#if confirmContent}
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
			onconfirm={doConfirm}
		/>
	{/if}
	<Toast message={toast?.text ?? null} icon={toast?.icon} />
{/if}
