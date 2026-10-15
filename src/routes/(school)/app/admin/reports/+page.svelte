<script lang="ts">
	import { resolve } from '$app/paths';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import type {
		SchoolReportPendingView,
		SchoolReportsView
	} from '$lib/features/school-admin/school-admin.types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ReportRemindDialog from '$lib/features/school-admin/components/ReportRemindDialog.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import StatusPill from '$lib/features/school-admin/components/StatusPill.svelte';
	import TabBar from '$lib/features/school-admin/components/TabBar.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		PREFIX,
		REPORT_STATUSES,
		percent,
		type ReportStatus
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import Check from '@lucide/svelte/icons/check';
	import Download from '@lucide/svelte/icons/download';
	import Eye from '@lucide/svelte/icons/eye';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

	// svelte-ignore state_referenced_locally
	let view = $state<SchoolReportsView | null>(data.view);
	const editor = createRecordEditor<SchoolReportsView>(i18n.t, (v) => (view = v));
	let tab = $state<'all' | ReportStatus>('all');

	const TONE = {
		draft: 'neutral',
		submitted: 'info',
		approved: 'success',
		locked: 'success'
	} as const;
	const VALUE_TONE = {
		draft: 'default',
		submitted: 'default',
		approved: 'success',
		locked: 'success'
	} as const;

	const rows = $derived((view?.rows ?? []).filter((r) => tab === 'all' || r.status === tab));
	const stats = $derived(
		REPORT_STATUSES.map((s) => ({
			label: t(`reports.status_${s}`),
			value: view?.counts[s] ?? 0,
			tone: VALUE_TONE[s]
		}))
	);
	const tabs = $derived([
		{ key: 'all', label: t('common.all'), count: view?.rows.length ?? 0 },
		...REPORT_STATUSES.map((s) => ({
			key: s,
			label: t(`reports.status_${s}`),
			count: view?.counts[s] ?? 0
		}))
	]);

	let remindTarget = $state<{ classId: string; name: string; homeroom: string } | null>(null);
	let remindOpen = $state(false);
	let pending = $state<SchoolReportPendingView | null>(null);

	async function openRemind(classId: string, name: string, homeroom: string) {
		remindTarget = { classId, name, homeroom };
		pending = null;
		remindOpen = true;
		pending = await editor.run<SchoolReportPendingView>('pending', { id: classId });
		if (!pending) remindOpen = false;
	}

	async function sendRemind(body: { message?: string; recipient_ids?: string[] }) {
		if (!remindTarget) return;
		const out = await editor.run<SchoolReportsView>('remind', {
			id: remindTarget.classId,
			message: body.message,
			recipientIds: body.recipient_ids
		});
		if (!out) return;
		view = out;
		editor.notify(t('reports.reminded', { count: body.recipient_ids?.length ?? 0 }));
		remindOpen = false;
	}

	const classPdfHref = (classId: string) =>
		`${resolve(APP_PATHS.SCHOOL_ADMIN_REPORT_PDF)}?${new URLSearchParams({ class: classId })}`;

	const COLS = 'minmax(0,1fr) minmax(0,1.4fr) minmax(0,1fr) 120px 200px';
</script>

<svelte:head><title>{t('reports.title')} · FLIXARE</title></svelte:head>

{#if !view}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('reports.eyebrow')}
		title={t('reports.title')}
		description={t('reports.desc')}
		{stats}
		help="help.school_admin_reports"
	>
		<div class="lms-card flex flex-col rounded-xl">
			<div class="border-lms-border flex flex-wrap items-center gap-2.5 border-b px-4 py-3">
				<TabBar
					label={t('common.filter')}
					value={tab}
					onchange={(k) => (tab = k as typeof tab)}
					items={tabs}
				/>
				<span class="flex-1"></span>
				<span class="text-lms-muted flex items-center gap-1.5 text-xs"
					><Icon icon={Eye} size="sm" />{t('reports.flow_note')}</span
				>
			</div>
			<div class="overflow-x-auto">
				<div class="min-w-[780px]">
					<div
						class="border-lms-border text-lms-muted grid gap-3 border-b px-4 py-[9px] font-mono text-[10px] tracking-[0.1em]"
						style:grid-template-columns={COLS}
					>
						<span>{t('reports.head_class')}</span><span>{t('reports.head_homeroom')}</span><span
							>{t('reports.head_locked')}</span
						><span>{t('reports.head_status')}</span><span></span>
					</div>
					{#each rows as r (r.class_id)}
						{@const status = r.status as ReportStatus}
						{@const reminded = Boolean(view.reminded[r.class_id])}
						<div
							class="border-lms-border grid items-center gap-3 border-b px-4 py-2.5 text-[13px]"
							style:grid-template-columns={COLS}
						>
							<span class="flex flex-col gap-px"
								><span class="font-bold">{r.name}</span><span class="text-lms-muted text-[11px]"
									>{t('reports.students', { count: r.students })}</span
								></span
							>
							<span
								class="truncate {r.homeroom ? 'text-lms-foreground/80' : 'text-lms-warning-text'}"
								>{r.homeroom || t('reports.no_homeroom')}</span
							>
							<span class="flex items-center gap-2">
								<span
									class="bg-lms-surface-muted h-1.5 min-w-10 flex-1 overflow-hidden rounded-full"
									><span
										class="bg-lms-interactive block h-full"
										style:width="{percent(r.locked_subjects, r.subjects)}%"
									></span></span
								>
								<span class="text-lms-muted text-xs tabular-nums"
									>{r.locked_subjects}/{r.subjects}</span
								>
							</span>
							<StatusPill tone={TONE[status]} label={t(`reports.status_${status}`)} />
							{#if status === 'draft'}
								<button
									type="button"
									class="lms-action-secondary lms-focus-ring inline-flex h-8 items-center gap-1.5 justify-self-end rounded-lg px-3 text-xs font-semibold disabled:opacity-50"
									disabled={reminded || editor.busy}
									onclick={() => openRemind(r.class_id, r.name, r.homeroom)}
									><Icon icon={reminded ? Check : BellRing} size="sm" />{reminded
										? t('reports.reminded_label')
										: t('reports.remind')}</button
								>
							{:else}
								<span class="flex flex-wrap items-center justify-end gap-1.5">
									<a
										href={resolve('/(school)/app/admin/reports/[classId]', { classId: r.class_id })}
										class="lms-action-secondary lms-focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
										><Icon icon={Eye} size="sm" />{t('reports.view')}</a
									>
									{#if status === 'locked'}
										<!-- eslint-disable svelte/no-navigation-without-resolve -- path PDF sudah lewat resolve(); hanya query kelas -->
										<a
											href={classPdfHref(r.class_id)}
											data-sveltekit-reload
											class="lms-action-secondary lms-focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
											><Icon icon={Download} size="sm" />{t('reports.download')}</a
										>
										<!-- eslint-enable svelte/no-navigation-without-resolve -->
									{/if}
								</span>
							{/if}
						</div>
					{:else}
						<p class="text-lms-muted px-4 py-9 text-center text-sm">
							{view.rows.length ? t('reports.empty_status') : t('reports.empty')}
						</p>
					{/each}
				</div>
			</div>
			<div class="text-lms-muted px-4 py-2.5 text-xs">{t('reports.foot')}</div>
		</div>
	</ModuleShell>
	<ReportRemindDialog
		bind:open={remindOpen}
		className={remindTarget?.name ?? ''}
		{pending}
		busy={editor.busy}
		onsend={sendRemind}
	/>
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
