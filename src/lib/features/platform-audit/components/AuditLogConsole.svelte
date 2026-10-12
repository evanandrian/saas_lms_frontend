<script lang="ts">
	import type { BackendFailure, BackendIssue } from '$lib/api/backend-call';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { useI18n } from '$lib/i18n';
	import { formatDate } from '$lib/utils/format';
	import { initialsOf } from '$lib/utils/initials';
	import type { LucideIcon } from '@lucide/svelte';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Copy from '@lucide/svelte/icons/copy';
	import Download from '@lucide/svelte/icons/download';
	import Funnel from '@lucide/svelte/icons/funnel';
	import Info from '@lucide/svelte/icons/info';
	import Search from '@lucide/svelte/icons/search';
	import Shield from '@lucide/svelte/icons/shield';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ShieldEllipsis from '@lucide/svelte/icons/shield-ellipsis';
	import { onDestroy, onMount } from 'svelte';
	import { AuditLogState, type ChainBadge, type NoticeIcon } from '../audit-log.state.svelte';
	import {
		AUDIT_RANGES,
		AUDIT_SEVERITIES,
		MAX_QUERY_LENGTH,
		PAGE_SIZE,
		PREFIX,
		SEVERITY_ACTIVE,
		SEVERITY_DOT,
		SEVERITY_TONE,
		actionLabel,
		actorName,
		actorOptionName,
		avatarTone,
		formatTime,
		moduleLabel,
		noteText,
		type AuditFilters
	} from '../platform-audit.model';
	import type { AuditEntry, AuditList } from '../platform-audit.types';

	interface Props {
		filters: AuditFilters;
		list: AuditList | null;
		failure: BackendFailure | null;
		issues: BackendIssue[];
	}

	let { filters, list, failure, issues }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

	// Data awal dari load server; perubahan berikutnya lewat aksi halaman.
	// svelte-ignore state_referenced_locally
	const audit = new AuditLogState({ filters, list, failure, issues });

	onMount(() => void audit.verifyChain());
	onDestroy(() => audit.dispose());

	const NOTICE_ICON: Record<NoticeIcon, LucideIcon> = {
		success: CircleCheck,
		copy: Copy,
		download: Download,
		info: Info,
		error: CircleAlert
	};
	const CHAIN_ICON: Record<ChainBadge, LucideIcon> = {
		verified: ShieldCheck,
		pending: Shield,
		broken: ShieldAlert,
		checking: ShieldEllipsis,
		unavailable: Shield
	};
	const CHAIN_TONE: Record<ChainBadge, string> = {
		verified: 'text-lms-success-text',
		pending: 'text-lms-muted',
		broken: 'text-lms-danger-text',
		checking: 'text-lms-muted',
		unavailable: 'text-lms-muted'
	};

	const chipBase =
		'lms-focus-ring flex h-[30px] items-center gap-1.5 rounded-full border-[1.5px] px-2.5 text-xs font-semibold transition-colors';
	const chipIdle = 'border-lms-input-border bg-lms-surface text-lms-muted';
	const fieldClass =
		'bg-lms-surface lms-focus-ring h-[42px] w-full rounded-[10px] border-[1.5px] px-3 text-sm transition-colors';
	const smallButton =
		'border-lms-border-strong bg-lms-surface lms-focus-ring hover:bg-lms-surface-muted flex h-[34px] items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold';
	const gridCols = 'grid-cols-[130px_150px_minmax(0,1fr)_96px]';

	const s = $derived(audit.selected);
	const noticeText = $derived(audit.notice ? t(audit.notice.key, audit.notice.params) : null);

	function chainText(badge: ChainBadge) {
		const c = audit.chain;
		if (badge === 'pending' && c.state === 'ok') return t('chain.pending', { last: c.lastSeq });
		if (badge === 'broken' && c.state === 'broken') return t('chain.broken', { seq: c.brokenSeq });
		return t(`chain.${badge}`);
	}

	function meta(entry: AuditEntry) {
		const who = actorName(i18n.t, entry.actor);
		return [
			[
				t('meta.time'),
				t('meta.time_value', {
					date: formatDate(entry.at, i18n.locale),
					time: formatTime(entry.at, i18n.locale)
				})
			],
			[
				t('meta.actor'),
				entry.actor.email && entry.actor.email !== who ? `${who} · ${entry.actor.email}` : who
			],
			[t('meta.module'), moduleLabel(i18n.t, entry.module)],
			[t('meta.ip'), entry.ip || '—'],
			[t('meta.device'), entry.device === 'service' ? t('device_service') : entry.device || '—'],
			[t('meta.request_id'), entry.request_id || '—']
		] as const;
	}
</script>

<!-- Audit log platform (referensi FLIXARE App v4 "04h Audit Log"): catatan perubahan konsol, append-only. -->
<div class="text-lms-foreground flex flex-col gap-4 pb-24" data-screen-label="04h Audit Log">
	<HeroBanner
		eyebrow={t('eyebrow')}
		title={t('title')}
		description={t('desc')}
		actionsPlacement="end"
		help="help.platform_audit_log"
	>
		{#snippet actions()}
			{#if !audit.failure}
				<button
					type="button"
					class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero hover:bg-lms-on-hero/14 lms-focus-ring flex h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold disabled:opacity-60"
					disabled={audit.exporting}
					aria-busy={audit.exporting}
					onclick={() => void audit.exportCsv()}
				>
					<Icon icon={Download} size="sm" />{t('export', { count: audit.total })}
				</button>
			{/if}
		{/snippet}
	</HeroBanner>

	{#if audit.failure}
		<StatePanel
			tone="error"
			title={audit.failure === 'forbidden' ? t('forbidden_title') : t('load_failed')}
			description={t(`failure.${audit.failure}`)}
		/>
	{:else}
		<!-- Filter -->
		<section class="lms-card flex flex-col gap-3.5 rounded-xl p-4" aria-label={t('filters')}>
			<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] items-end gap-3">
				<label class="col-span-full flex min-w-0 flex-col gap-1.5">
					<span class="text-[13px] font-semibold">{t('search')}</span>
					<span class="relative block">
						<span class="text-lms-muted pointer-events-none absolute top-[13px] left-3">
							<Icon icon={Search} size="sm" />
						</span>
						<input
							type="search"
							class="{fieldClass} border-lms-input-border ps-9"
							placeholder={t('search_ph')}
							maxlength={MAX_QUERY_LENGTH}
							value={audit.filters.q}
							oninput={(e) => audit.setQuery(e.currentTarget.value)}
						/>
					</span>
				</label>
				<label class="flex min-w-0 flex-col gap-1.5">
					<span class="text-[13px] font-semibold">{t('actor_label')}</span>
					<select
						class="{fieldClass} border-lms-input-border px-2.5"
						value={audit.filters.actor}
						onchange={(e) => audit.setActor(e.currentTarget.value)}
					>
						<option value="">{t('actor_all')}</option>
						{#each audit.actors as option (option.key)}
							<option value={option.key}>{actorOptionName(i18n.t, option)}</option>
						{/each}
						{#if audit.filters.actor && !audit.actors.some((a) => a.key === audit.filters.actor)}
							<option value={audit.filters.actor}>{audit.filters.actor}</option>
						{/if}
					</select>
				</label>
				<div class="flex min-w-0 flex-col gap-1.5">
					<span class="text-[13px] font-semibold" id="audit-range-label">{t('range_label')}</span>
					<div
						class="bg-lms-surface-muted flex gap-0.5 rounded-[10px] p-[3px]"
						role="group"
						aria-labelledby="audit-range-label"
					>
						{#each AUDIT_RANGES as range (range)}
							{@const on = audit.filters.range === range}
							<button
								type="button"
								class={[
									'lms-focus-ring h-9 flex-1 rounded-lg px-1 text-xs font-semibold whitespace-nowrap',
									on ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
								]}
								aria-pressed={on}
								onclick={() => audit.setRange(range)}>{t(`range.${range}`)}</button
							>
						{/each}
					</div>
				</div>
			</div>

			{#if audit.filters.range === 'custom'}
				<div class="flex flex-wrap items-end gap-3">
					<label class="flex flex-col gap-1.5">
						<span class="text-[13px] font-semibold">{t('from')}</span>
						<input
							type="date"
							class="{fieldClass} border-lms-input-border"
							value={audit.filters.from}
							max={audit.filters.to || undefined}
							onchange={(e) => audit.setDate('from', e.currentTarget.value)}
						/>
					</label>
					<label class="flex flex-col gap-1.5">
						<span class="text-[13px] font-semibold">{t('to')}</span>
						<input
							type="date"
							class="{fieldClass} {audit.rangeIssue
								? 'border-lms-danger-text'
								: 'border-lms-input-border'}"
							value={audit.filters.to}
							min={audit.filters.from || undefined}
							aria-invalid={Boolean(audit.rangeIssue)}
							aria-describedby={audit.rangeIssue ? 'audit-range-error' : undefined}
							onchange={(e) => audit.setDate('to', e.currentTarget.value)}
						/>
					</label>
					{#if audit.rangeIssue}
						<span id="audit-range-error" role="alert" class="text-lms-danger-text pb-3 text-xs"
							>{t(`errors.${audit.rangeIssue}`)}</span
						>
					{/if}
				</div>
			{/if}

			<div class="flex flex-wrap items-center gap-4">
				<div class="flex flex-wrap items-center gap-1.5" role="group" aria-labelledby="audit-mod">
					<span id="audit-mod" class="text-lms-muted me-0.5 text-xs font-semibold"
						>{t('module_label')}</span
					>
					{#each audit.modules as code (code)}
						{@const on = audit.filters.modules.includes(code)}
						<button
							type="button"
							class={[
								chipBase,
								on
									? 'border-lms-interactive bg-lms-interactive-subtle text-lms-foreground'
									: chipIdle
							]}
							aria-pressed={on}
							onclick={() => audit.toggleModule(code)}>{moduleLabel(i18n.t, code)}</button
						>
					{/each}
				</div>
				<div class="flex flex-wrap items-center gap-1.5" role="group" aria-labelledby="audit-sev">
					<span id="audit-sev" class="text-lms-muted me-0.5 text-xs font-semibold"
						>{t('severity_label')}</span
					>
					{#each AUDIT_SEVERITIES as code (code)}
						{@const on = audit.filters.severities.includes(code)}
						<button
							type="button"
							class={[chipBase, on ? `${SEVERITY_ACTIVE[code]} text-lms-foreground` : chipIdle]}
							aria-pressed={on}
							onclick={() => audit.toggleSeverity(code)}
						>
							<span class="size-2 rounded-full {SEVERITY_DOT[code]}" aria-hidden="true"></span>
							{t(`severity.${code}`)}
						</button>
					{/each}
				</div>
				<button
					type="button"
					class={[
						chipBase,
						'text-lms-foreground',
						audit.filters.failed
							? 'border-lms-danger-text bg-lms-danger-subtle'
							: 'border-lms-input-border bg-lms-surface'
					]}
					aria-pressed={audit.filters.failed}
					onclick={() => audit.toggleFailed()}
				>
					<span class="text-lms-danger-text"><Icon icon={CircleX} size="sm" /></span>
					{t('failed_only')}
				</button>
				{#if audit.hasFilters}
					<button
						type="button"
						class="text-lms-link lms-focus-ring h-[30px] rounded-md px-2.5 text-xs font-semibold hover:underline"
						onclick={() => audit.clearFilters()}>{t('clear_all')}</button
					>
				{/if}
			</div>
		</section>

		<div class="flex flex-wrap items-start gap-4">
			<!-- Daftar catatan -->
			<section
				class="lms-card flex min-w-0 flex-[1_1_520px] flex-col overflow-hidden rounded-xl"
				aria-label={t('list_label')}
				aria-busy={audit.busy}
			>
				<div class="overflow-x-auto">
					<div class={['min-w-[620px] transition-opacity', audit.busy && 'opacity-60']}>
						<div
							class="border-lms-border bg-lms-background text-lms-muted grid {gridCols} gap-3.5 border-b px-4 py-2.5 font-mono text-[11px] tracking-[0.08em] uppercase"
							aria-hidden="true"
						>
							<span>{t('col.time')}</span><span>{t('col.actor')}</span><span>{t('col.action')}</span
							><span class="text-right">{t('col.severity')}</span>
						</div>
						{#each audit.items as entry (entry.id)}
							{@const on = entry.id === audit.selectedId}
							{@const who = actorName(i18n.t, entry.actor)}
							<button
								type="button"
								class={[
									'border-lms-border lms-focus-ring grid w-full items-center gap-3.5 border-b px-4 py-3 text-left transition-colors focus-visible:-outline-offset-2',
									gridCols,
									on
										? 'bg-lms-interactive-subtle/70 shadow-[inset_3px_0_0_var(--color-lms-interactive)]'
										: 'hover:bg-lms-surface-muted/60'
								]}
								aria-pressed={on}
								onclick={() => audit.select(entry.id)}
							>
								<span class="flex flex-col gap-0.5">
									<span class="font-mono text-xs font-semibold tabular-nums"
										>{formatTime(entry.at, i18n.locale)}</span
									>
									<span class="text-lms-muted text-[11px]">{formatDate(entry.at, i18n.locale)}</span
									>
								</span>
								<span class="flex min-w-0 items-center gap-2">
									<span
										class="flex size-[26px] flex-none items-center justify-center rounded-full text-[10px] font-bold {avatarTone(
											entry.actor
										)}"
										aria-hidden="true">{initialsOf(who)}</span
									>
									<span class="truncate text-[13px]">{who}</span>
								</span>
								<span class="flex min-w-0 flex-col gap-0.5">
									<span class="flex items-center gap-1.5 text-[13px] font-semibold">
										{#if !entry.success}
											<span class="text-lms-danger-text"
												><Icon icon={CircleX} size="sm" label={t('result.fail')} /></span
											>
										{/if}
										<span class="truncate">{actionLabel(i18n.t, entry.action)}</span>
									</span>
									<span class="text-lms-muted truncate text-xs"
										><span class="font-mono text-[11px] uppercase"
											>{moduleLabel(i18n.t, entry.module)}</span
										>{entry.entity_label ? ` · ${entry.entity_label}` : ''}</span
									>
								</span>
								<span
									class="justify-self-end rounded-full px-2 py-[3px] text-[10px] font-bold tracking-[0.04em] uppercase {SEVERITY_TONE[
										entry.severity
									]}">{t(`severity.${entry.severity}`)}</span
								>
							</button>
						{/each}
					</div>
				</div>

				{#if !audit.items.length}
					<div class="p-4">
						<StatePanel
							title={audit.hasFilters ? t('empty_filtered_title') : t('empty_title')}
							description={audit.hasFilters ? t('empty_filtered_desc') : t('empty_desc')}
							loading={audit.busy}
						>
							{#snippet actions()}
								{#if audit.hasFilters}
									<button type="button" class={smallButton} onclick={() => audit.clearFilters()}
										>{t('clear')}</button
									>
								{/if}
							{/snippet}
						</StatePanel>
					</div>
				{/if}

				<div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
					<span class="text-lms-muted text-xs" aria-live="polite"
						>{t('showing', { shown: audit.items.length, total: audit.total })}</span
					>
					{#if audit.hasMore}
						<button
							type="button"
							class="{smallButton} text-[13px] disabled:opacity-60"
							disabled={audit.loadingMore || audit.busy}
							aria-busy={audit.loadingMore}
							onclick={() => void audit.loadMore()}
							>{audit.loadingMore ? t('loading') : t('load_more', { count: PAGE_SIZE })}</button
						>
					{/if}
				</div>
			</section>

			<!-- Detail catatan -->
			<aside
				class="lms-card sticky top-21 flex min-w-[280px] flex-[0_1_360px] flex-col gap-4 rounded-xl p-[18px]"
				aria-label={t('detail_label')}
			>
				{#if s}
					{@const badge = audit.chainBadge(s)}
					{@const note = noteText(i18n.t, s)}
					<div class="flex flex-col gap-1.5">
						<span class="text-lms-muted font-mono text-[11px] tracking-[0.08em]">{s.ref}</span>
						<h2 class="text-base leading-[23px] font-bold">{actionLabel(i18n.t, s.action)}</h2>
						{#if s.entity_label}
							<span class="text-lms-muted text-[13px] break-words">{s.entity_label}</span>
						{/if}
					</div>
					<div class="flex flex-wrap gap-2">
						<span
							class="rounded-full px-2.5 py-[3px] text-[11px] font-bold uppercase {SEVERITY_TONE[
								s.severity
							]}">{t(`severity.${s.severity}`)}</span
						>
						<span
							class="rounded-full px-2.5 py-[3px] text-[11px] font-bold uppercase {s.success
								? 'lms-tone-success'
								: 'lms-tone-danger'}">{s.success ? t('result.ok') : t('result.fail')}</span
						>
					</div>

					{#if s.diff.length}
						<div class="flex flex-col gap-2">
							<h3 class="text-[13px] font-bold">{t('changes')}</h3>
							{#each s.diff as change, index (`${change.field}-${index}`)}
								<div
									class="border-lms-border bg-lms-background flex flex-col gap-1 rounded-lg border p-2.5"
								>
									<span class="text-lms-muted font-mono text-[11px]">{change.field}</span>
									<span
										class="lms-tone-danger rounded px-1.5 py-[3px] font-mono text-xs [overflow-wrap:anywhere] line-through"
										><span class="sr-only">{t('before')}: </span>{change.before || '—'}</span
									>
									<span
										class="lms-tone-success rounded px-1.5 py-[3px] font-mono text-xs [overflow-wrap:anywhere]"
										><span class="sr-only">{t('after')}: </span>{change.after || '—'}</span
									>
								</div>
							{/each}
						</div>
					{/if}

					{#if note}
						<p
							class="bg-lms-surface-muted rounded-lg px-3 py-2.5 text-[13px] leading-5 break-words"
						>
							{note}
						</p>
					{/if}

					<dl
						class="border-lms-border grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 border-t pt-3 text-xs"
					>
						{#each meta(s) as [label, value] (label)}
							<dt class="text-lms-muted">{label}</dt>
							<dd class="text-right font-mono [overflow-wrap:anywhere]">{value}</dd>
						{/each}
					</dl>

					<div class="flex items-center gap-2 text-xs {CHAIN_TONE[badge]}" aria-live="polite">
						<Icon icon={CHAIN_ICON[badge]} size="sm" />{chainText(badge)}
					</div>

					<div class="flex flex-wrap gap-2">
						<button type="button" class={smallButton} onclick={() => void audit.copyRef(s)}
							><Icon icon={Copy} size="sm" />{t('copy_id')}</button
						>
						<button type="button" class={smallButton} onclick={() => audit.showActorActivity(s)}
							><Icon icon={Funnel} size="sm" />{t('actor_activity')}</button
						>
					</div>
				{:else}
					<p class="text-lms-muted px-2 py-6 text-center text-[13px]">{t('no_selection')}</p>
				{/if}
			</aside>
		</div>
	{/if}
</div>

<Toast message={noticeText} icon={audit.notice ? NOTICE_ICON[audit.notice.icon] : undefined} />
