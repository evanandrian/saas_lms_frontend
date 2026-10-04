<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { useI18n } from '$lib/i18n';
	import { formatHourMinute, greetingPeriod } from '$lib/utils/clock';
	import { createDashboardClock } from '$lib/utils/dashboard-clock.svelte';
	import type { LucideIcon } from '@lucide/svelte';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Package from '@lucide/svelte/icons/package';
	import Receipt from '@lucide/svelte/icons/receipt';
	import {
		CLUSTER_SEGMENTS,
		PERIOD_KEYS,
		PROVISIONING_LOG_LIMIT,
		applicationAge,
		clusterUsage,
		formatMillions,
		formatPercentOneDecimal,
		invoiceShares,
		latestClosedIndex,
		revenueBars,
		revenueTrend,
		slaStatus,
		type ChurnLevel,
		type InvoiceStatus,
		type PeriodKey,
		type ProvisioningEntry,
		type ProvisioningStatus,
		type TenantApplication
	} from './platform-dashboard';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const reasonId = $props.id();
	const LOCALE = 'id-ID';
	const TOAST_SECONDS = 6;
	/** Simulasi provisioning (dev): selesai setelah 4 detik, 4 tahap (referensi). */
	const PROVISIONING_SIM_SECONDS = 4;
	const PROVISIONING_SIM_STEPS = 4;

	const SLA_BAR_CLASSES = {
		breach: 'bg-error-600',
		warning: 'bg-warning-500',
		ok: 'bg-lms-progress'
	} as const;
	const INVOICE_CLASSES: Record<InvoiceStatus, string> = {
		paid: 'bg-lms-progress',
		unpaid: 'bg-lms-interactive',
		overdue: 'bg-warning-500'
	};
	const CHURN_CLASSES: Record<ChurnLevel, string> = {
		high: 'text-lms-danger-text',
		medium: 'text-lms-warning-text',
		low: 'text-lms-muted'
	};
	const LOG_STATUS_CLASSES: Record<ProvisioningStatus, string> = {
		OK: 'text-lms-on-hero-progress',
		RETRY: 'text-lms-on-hero-warning',
		RUN: 'text-lms-on-hero'
	};

	const clock = createDashboardClock(() => data.dashboard?.clockStartSeconds ?? null);
	// svelte-ignore state_referenced_locally
	let period = $state<PeriodKey>(data.dashboard?.defaultPeriod ?? '30');
	// svelte-ignore state_referenced_locally
	let revenueIndex = $state(latestClosedIndex(data.dashboard?.revenue ?? []));
	let decided = $state<string[]>([]);
	let provisioning = $state<{ id: string; database: string; startedAt: number }[]>([]);
	let toast = $state<{ message: string; icon: LucideIcon; until: number; undoId: string } | null>(
		null
	);

	const dashboard = $derived(data.dashboard);
	const applications = $derived(
		(dashboard?.applications ?? []).filter((application) => !decided.includes(application.id))
	);
	const ageLabel = (hours: number) => {
		const age = applicationAge(hours);
		return i18n.t(`dashboard.platform.age_${age.unit}`, { count: age.value });
	};
	const oldestAge = $derived(
		applications.length ? ageLabel(Math.max(...applications.map((item) => item.ageHours))) : ''
	);
	const overdueCount = $derived(
		dashboard?.invoices.find((invoice) => invoice.status === 'overdue')?.count ?? 0
	);
	const metrics = $derived.by(() => {
		if (!dashboard) return [];
		const base = dashboard.metricsByPeriod[period].map((metric) => ({
			...metric,
			toneClass: metric.tone === 'progress' ? 'text-lms-on-hero-progress' : 'text-lms-on-hero-muted'
		}));
		const queueMetric = {
			label: i18n.t('dashboard.platform.metric_applications'),
			value: String(applications.length),
			note: applications.length
				? i18n.t('dashboard.platform.metric_applications_note', {
						age: oldestAge,
						sla: dashboard.slaHours
					})
				: i18n.t('dashboard.platform.queue_empty_note'),
			toneClass: 'text-lms-on-hero-warning'
		};
		// Posisi kartu pengajuan mengikuti referensi (urutan ke-4).
		return [...base.slice(0, 3), queueMetric, ...base.slice(3)];
	});
	const clusters = $derived(
		(dashboard?.clusters ?? []).map((cluster, index) =>
			clusterUsage(
				// Database baru hasil simulasi ditempatkan di cluster pertama (referensi).
				index === 0 ? { ...cluster, usedUnits: cluster.usedUnits + provisioning.length } : cluster,
				dashboard?.clusterCapacityUnits ?? 1,
				dashboard?.clusterWarningPercent ?? 100
			)
		)
	);
	const logLines = $derived.by((): ProvisioningEntry[] => {
		const dateLabel = dashboard
			? `${dashboard.date.slice(8, 10)}.${dashboard.date.slice(5, 7)}`
			: '';
		const simulated = provisioning.map((entry, index): ProvisioningEntry => {
			const elapsed = clock.elapsed - entry.startedAt;
			const done = elapsed >= PROVISIONING_SIM_SECONDS;
			const startSeconds = (dashboard?.clockStartSeconds ?? 0) + entry.startedAt;
			return {
				id: `sim-${entry.id}`,
				timeLabel: `${dateLabel} ${formatHourMinute(startSeconds, ':')}`,
				status: done ? 'OK' : 'RUN',
				database: entry.database,
				durationLabel: done
					? `2m${String(10 + (index + 1) * 7).padStart(2, '0')}s`
					: i18n.t('dashboard.platform.provisioning_step', {
							step: Math.min(PROVISIONING_SIM_STEPS, elapsed + 1)
						})
			};
		});
		return [...simulated, ...(dashboard?.provisioningLog ?? [])].slice(0, PROVISIONING_LOG_LIMIT);
	});
	const bars = $derived(revenueBars(dashboard?.revenue ?? []));
	const trend = $derived(revenueTrend(dashboard?.revenue ?? []));
	const selectedRevenue = $derived(bars[revenueIndex] ?? null);
	const billing = $derived(invoiceShares(dashboard?.invoices ?? []));
	const visibleToast = $derived(toast && clock.elapsed < toast.until ? toast : null);
	const simulationNote = $derived(i18n.t('dashboard.teacher.simulation_note'));

	function decide(application: TenantApplication, approved: boolean) {
		decided = [...decided, application.id];
		if (approved) {
			provisioning = [
				{ id: application.id, database: application.databaseName, startedAt: clock.elapsed },
				...provisioning
			];
		}
		toast = {
			message: `${i18n.t(
				approved ? 'dashboard.platform.toast_approved' : 'dashboard.platform.toast_rejected',
				{ name: application.name }
			)} ${simulationNote}`,
			icon: approved ? CircleCheck : CircleX,
			until: clock.elapsed + TOAST_SECONDS,
			undoId: application.id
		};
	}

	function undo() {
		if (!toast) return;
		const { undoId } = toast;
		decided = decided.filter((id) => id !== undoId);
		provisioning = provisioning.filter((entry) => entry.id !== undoId);
		toast = null;
	}
</script>

<!-- Struktur & data contoh mengikuti FLIXARE App v3.html layar 04 (FE-07). -->
<div class="flex min-w-0 flex-col gap-4">
	{#if dashboard}
		{@const actionsDisabled = !data.canSimulate}
		<p id={reasonId} class="sr-only">{i18n.t('common.state.action_unavailable')}</p>

		<HeroBanner
			eyebrow={`${i18n.t(
				dashboard.servicesHealthy
					? 'dashboard.platform.services_normal'
					: 'dashboard.platform.services_degraded'
			)} · ${i18n.t('dashboard.platform.snapshot', { time: dashboard.snapshotLabel })}`}
			eyebrowStatus={dashboard.servicesHealthy ? 'ok' : 'warning'}
			title={i18n.t(`dashboard.greeting.${greetingPeriod(clock.nowSeconds)}`, {
				name: dashboard.greetingName
			})}
			description={applications.length
				? i18n.t('dashboard.platform.summary', {
						count: applications.length,
						age: oldestAge,
						overdue: overdueCount
					})
				: i18n.t('dashboard.platform.summary_empty', { overdue: overdueCount })}
			actionsPlacement="end"
		>
			{#snippet actions()}
				<div
					class="bg-lms-on-hero/8 border-lms-on-hero/14 flex gap-0.5 rounded-xl border p-0.75"
					role="group"
					aria-label={i18n.t('dashboard.platform.period_label')}
				>
					{#each PERIOD_KEYS as key (key)}
						<button
							type="button"
							class={[
								'lms-focus-ring h-8.5 rounded-[9px] px-3 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors',
								period === key
									? 'bg-lms-on-hero text-lms-brand-deep-neutral'
									: 'text-lms-on-hero-muted hover:text-lms-on-hero'
							]}
							aria-pressed={period === key}
							onclick={() => (period = key)}
						>
							{i18n.t(`dashboard.platform.periods.${key}`)}
						</button>
					{/each}
				</div>
				<Button variant="on-hero" disabled aria-describedby={reasonId}>
					<Icon icon={Package} size="sm" />{i18n.t('dashboard.platform.manage_plans')}
				</Button>
			{/snippet}
			<ul
				class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
				aria-label={i18n.t('dashboard.platform.metrics_label')}
			>
				{#each metrics as metric (metric.label)}
					<li class="lms-hero-raised flex flex-col gap-1 px-4.5 py-4 leading-tight">
						<span class="text-lms-on-hero-muted font-mono text-[11px] tracking-widest">
							{metric.label}
						</span>
						<span class="text-[1.625rem] leading-tight font-bold tracking-tight tabular-nums">
							{metric.value}
						</span>
						<span class={['text-xs', metric.toneClass]}>{metric.note}</span>
					</li>
				{/each}
			</ul>
		</HeroBanner>

		<div class="grid gap-4 xl:grid-cols-3">
			<section
				class="lms-card flex min-w-0 flex-col overflow-hidden rounded-xl! shadow-none! xl:col-span-2"
				aria-labelledby="{reasonId}-queue"
			>
				<div
					class="border-lms-border flex flex-wrap items-center justify-between gap-3 border-b px-4.5 py-3.5"
				>
					<h2 id="{reasonId}-queue" class="text-[0.9375rem] font-bold">
						{i18n.t('dashboard.platform.queue')}
					</h2>
					<span class="text-lms-muted font-mono text-[11px]">
						{i18n.t('dashboard.platform.queue_meta', {
							count: applications.length,
							sla: dashboard.slaHours
						})}
					</span>
				</div>
				{#if applications.length}
					<div class="relative overflow-x-auto">
						<div role="table" aria-labelledby="{reasonId}-queue" class="min-w-150">
							<div
								role="row"
								class="bg-lms-background border-lms-border text-lms-muted grid grid-cols-[110px_minmax(0,1fr)_70px_150px] gap-3.5 border-b px-4.5 py-2 font-mono text-[11px] tracking-[0.08em]"
							>
								<span role="columnheader">{i18n.t('dashboard.platform.col_age')}</span>
								<span role="columnheader">{i18n.t('dashboard.platform.col_institution')}</span>
								<span role="columnheader" class="text-right">
									{i18n.t('dashboard.platform.col_students')}
								</span>
								<span role="columnheader"
									><span class="sr-only">{i18n.t('dashboard.platform.col_actions')}</span></span
								>
							</div>
							{#each applications as application (application.id)}
								{@const sla = slaStatus(application.ageHours, dashboard.slaHours)}
								<div
									role="row"
									class="border-lms-border hover:bg-lms-background grid grid-cols-[110px_minmax(0,1fr)_70px_150px] items-center gap-3.5 border-b px-4.5 py-3"
								>
									<span role="cell" class="flex flex-col gap-1.25">
										<span
											class={[
												'font-mono text-xs font-semibold',
												sla.tone === 'ok' ? 'text-lms-muted' : 'text-lms-warning-text'
											]}
										>
											{ageLabel(application.ageHours)}
											<span class="sr-only">
												· {i18n.t('dashboard.platform.sla_used', { percent: sla.percent })}</span
											>
										</span>
										<span
											class="bg-lms-surface-muted block h-1 overflow-hidden rounded-xs"
											aria-hidden="true"
										>
											<span
												class={['block h-full', SLA_BAR_CLASSES[sla.tone]]}
												style:width="{sla.percent}%"
											></span>
										</span>
									</span>
									<span role="cell" class="flex min-w-0 flex-col gap-0.5">
										<span
											class="flex flex-wrap items-center gap-2 text-sm leading-tight font-semibold"
										>
											{application.name}
											<span
												class="border-lms-input-border rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em]"
											>
												{application.typeLabel}
											</span>
										</span>
										<span class="text-lms-muted truncate font-mono text-[11px]">
											{application.meta}
										</span>
									</span>
									<span role="cell" class="text-right text-[0.8125rem] tabular-nums">
										{application.students === null
											? '—'
											: application.students.toLocaleString(LOCALE)}
									</span>
									<span role="cell" class="flex justify-end gap-1.5">
										<button
											type="button"
											class="border-lms-input-border bg-lms-surface text-lms-danger-text lms-focus-ring h-7.5 rounded-[5px] border px-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
											disabled={actionsDisabled}
											aria-describedby={actionsDisabled ? reasonId : undefined}
											onclick={() => decide(application, false)}
										>
											{i18n.t('dashboard.platform.reject')}<span class="sr-only">
												{application.name}</span
											>
										</button>
										<button
											type="button"
											class="lms-action-primary lms-focus-ring h-7.5 rounded-[5px] px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
											disabled={actionsDisabled}
											aria-describedby={actionsDisabled ? reasonId : undefined}
											onclick={() => decide(application, true)}
										>
											{i18n.t('dashboard.platform.approve')}<span class="sr-only">
												{application.name}</span
											>
										</button>
									</span>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<p class="text-lms-muted px-4.5 py-8 text-center text-sm">
						{i18n.t('dashboard.platform.queue_empty')}
					</p>
				{/if}
			</section>

			<section
				class="lms-card flex min-w-0 flex-col gap-4 rounded-xl! px-4.5 py-4 shadow-none!"
				aria-labelledby="{reasonId}-clusters"
			>
				<div class="flex items-center justify-between">
					<h2 id="{reasonId}-clusters" class="text-[0.9375rem] font-bold">
						{i18n.t('dashboard.platform.clusters')}
					</h2>
					<span class="text-lms-muted font-mono text-[11px]">
						{i18n.t('dashboard.platform.cluster_unit', {
							capacity: dashboard.clusterCapacityUnits
						})}
					</span>
				</div>
				<ul class="flex flex-col gap-4">
					{#each clusters as cluster (cluster.name)}
						<li class="flex flex-col gap-1.5">
							<p class="flex justify-between font-mono text-xs">
								<span class="font-semibold">{cluster.name}</span>
								<span class="text-lms-muted">
									{cluster.usedUnits} ·
									<span
										class={[
											'font-semibold',
											cluster.warning ? 'text-lms-warning-text' : 'text-lms-foreground'
										]}>{cluster.percent}%</span
									>
								</span>
							</p>
							<span
								class="flex gap-0.5"
								role="img"
								aria-label={i18n.t('dashboard.platform.cluster_usage', {
									name: cluster.name,
									used: cluster.usedUnits,
									capacity: dashboard.clusterCapacityUnits,
									percent: cluster.percent
								})}
							>
								{#each Array.from({ length: CLUSTER_SEGMENTS }, (_, index) => index) as segment (segment)}
									<span
										class={[
											'h-4 flex-1 rounded-xs transition-colors duration-300',
											segment < cluster.filledSegments
												? cluster.warning
													? 'bg-warning-500'
													: 'bg-lms-interactive'
												: 'bg-lms-surface-muted'
										]}
									></span>
								{/each}
							</span>
						</li>
					{/each}
				</ul>
				<div class="mt-1 flex flex-col gap-2">
					<h3 class="text-[0.8125rem] font-bold">
						{i18n.t('dashboard.platform.provisioning')}
						<span class="text-lms-muted font-normal">
							{i18n.t('dashboard.platform.provisioning_target', {
								minutes: dashboard.provisioningTargetMinutes
							})}
						</span>
					</h3>
					<ol
						class="bg-lms-hero text-lms-on-hero overflow-x-auto rounded-md px-3.5 py-3 font-mono text-[11.5px] leading-5.25"
					>
						{#each logLines as line (line.id)}
							<li class="flex gap-2.5 whitespace-nowrap">
								<span class="text-lms-on-hero-muted">{line.timeLabel}</span>
								<span class={['w-11.5', LOG_STATUS_CLASSES[line.status]]}>{line.status}</span>
								<span class="flex-1">{line.database}</span>
								<span class="text-lms-on-hero-muted">{line.durationLabel}</span>
							</li>
						{/each}
					</ol>
				</div>
			</section>
		</div>

		<div class="grid gap-4 xl:grid-cols-3">
			<section
				class="lms-card flex min-w-0 flex-col gap-3.5 rounded-xl! px-4.5 py-4 shadow-none! xl:col-span-2"
				aria-labelledby="{reasonId}-revenue"
			>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 id="{reasonId}-revenue" class="text-[0.9375rem] font-bold">
							{i18n.t('dashboard.platform.revenue')}
						</h2>
						<p class="text-lms-muted text-xs">{i18n.t('dashboard.platform.revenue_hint')}</p>
					</div>
					{#if trend}
						<span
							class={[
								'font-mono text-xs font-semibold',
								trend.percent >= 0 ? 'text-lms-progress-text' : 'text-lms-danger-text'
							]}
						>
							{i18n.t(
								trend.percent >= 0
									? 'dashboard.platform.revenue_up'
									: 'dashboard.platform.revenue_down',
								{
									percent: formatPercentOneDecimal(Math.abs(trend.percent), LOCALE),
									month: trend.previousLabel
								}
							)}
						</span>
					{/if}
				</div>
				<div
					class="flex h-42.5 items-end gap-2.5 bg-[repeating-linear-gradient(to_top,var(--color-lms-border)_0_1px,transparent_1px_42px)]"
				>
					{#each bars as bar, index (bar.label)}
						{@const selected = index === revenueIndex}
						<button
							type="button"
							class="lms-focus-ring text-lms-foreground flex h-full flex-1 flex-col items-center justify-end gap-1.5"
							aria-pressed={selected}
							onclick={() => (revenueIndex = index)}
						>
							<span class={['font-mono text-[11px]', selected && 'font-bold']}>
								{formatMillions(bar.amountMillions, LOCALE)}
							</span>
							<span
								class={[
									'w-full max-w-11 rounded-t-[3px] transition-colors',
									selected
										? 'bg-lms-interactive'
										: bar.inProgress
											? 'bg-lms-interactive-muted'
											: 'bg-lms-interactive/40'
								]}
								style:height="{bar.heightPx}px"
							></span>
							<span class={['text-lms-muted font-mono text-[11px]', selected && 'font-bold']}>
								{bar.label}
							</span>
						</button>
					{/each}
				</div>
				{#if selectedRevenue}
					<p
						class="bg-lms-background flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-mono text-xs"
						aria-live="polite"
					>
						<span class="text-lms-interactive"><Icon icon={Receipt} size="sm" /></span>
						{i18n.t('dashboard.platform.revenue_detail', {
							month: selectedRevenue.label,
							year: dashboard.revenueYear,
							amount: formatMillions(selectedRevenue.amountMillions, LOCALE),
							invoices: selectedRevenue.paidInvoices
						})}{selectedRevenue.inProgress
							? ` · ${i18n.t('dashboard.platform.revenue_in_progress')}`
							: ''}
					</p>
				{/if}
			</section>

			<section
				class="lms-card flex min-w-0 flex-col gap-3 rounded-xl! px-4.5 py-4 shadow-none!"
				aria-labelledby="{reasonId}-billing"
			>
				<div class="flex items-baseline justify-between">
					<h2 id="{reasonId}-billing" class="text-[0.9375rem] font-bold">
						{i18n.t('dashboard.platform.billing', { month: dashboard.billingMonthLabel })}
					</h2>
					<span class="text-lms-muted font-mono text-[11px]">
						{i18n.t('dashboard.platform.billing_count', { count: billing.totalCount })}
					</span>
				</div>
				<div class="flex h-2.5 gap-0.5 overflow-hidden rounded-xs" aria-hidden="true">
					{#each billing.items as invoice (invoice.status)}
						<span class={INVOICE_CLASSES[invoice.status]} style:width="{invoice.sharePercent}%"
						></span>
					{/each}
				</div>
				<ul class="flex flex-col gap-3">
					{#each billing.items as invoice (invoice.status)}
						<li class="flex items-center justify-between text-[0.8125rem]">
							<span class="flex items-center gap-2">
								<span
									class={['size-2 rounded-xs', INVOICE_CLASSES[invoice.status]]}
									aria-hidden="true"
								></span>
								{i18n.t(`dashboard.platform.invoice_status.${invoice.status}`)}
								<span class="text-lms-muted">({invoice.count})</span>
							</span>
							<span class="font-mono font-semibold">
								{i18n.t('dashboard.platform.amount_millions', {
									amount: formatMillions(invoice.amountMillions, LOCALE)
								})}
							</span>
						</li>
					{/each}
				</ul>
				<h3 class="border-lms-border mt-2 border-t pt-3 text-[0.8125rem] font-bold">
					{i18n.t('dashboard.platform.churn')}
				</h3>
				<ul class="flex flex-col gap-3">
					{#each dashboard.churn as risk (risk.name)}
						<li class="flex items-center gap-2.5">
							<span
								class={[
									'w-13 font-mono text-[10px] font-semibold tracking-[0.06em]',
									CHURN_CLASSES[risk.level]
								]}
							>
								{i18n.t(`dashboard.platform.churn_level.${risk.level}`)}
							</span>
							<span class="flex min-w-0 flex-1 flex-col leading-tight">
								<span class="text-[0.8125rem] font-semibold">{risk.name}</span>
								<span class="text-lms-muted text-[11px]">{risk.reason}</span>
							</span>
						</li>
					{/each}
				</ul>
			</section>
		</div>

		<Toast
			message={visibleToast?.message ?? null}
			icon={visibleToast?.icon}
			action={visibleToast ? { label: i18n.t('dashboard.platform.undo'), onclick: undo } : null}
		/>
	{:else}
		<StatePanel
			headingLevel={1}
			title={i18n.t('common.state.no_data_title')}
			description={i18n.t('common.state.no_data_description')}
		/>
	{/if}
</div>
