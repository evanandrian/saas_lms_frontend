<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import type { SchoolAttendanceView } from '$lib/features/school-admin/school-admin.types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ModuleShell, {
		type ModuleStat
	} from '$lib/features/school-admin/components/ModuleShell.svelte';
	import TabBar from '$lib/features/school-admin/components/TabBar.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		ATTENDANCE_HIGH,
		ATTENDANCE_MID,
		PREFIX,
		attendanceReminderMessage,
		shiftDate
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { formatDate, formatDateTime, formatNumber } from '$lib/utils/format';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import Check from '@lucide/svelte/icons/check';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ClockAlert from '@lucide/svelte/icons/clock-alert';
	import Eye from '@lucide/svelte/icons/eye';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

	// Data mengikuti URL (?mode=&date=); hasil "Ingatkan" menimpa tampilan lokal sampai data berganti
	// (derived yang bisa ditimpa: kembali ke `data.view` setiap kali load menghasilkan data baru).
	let latest = $derived<SchoolAttendanceView | null>(data.view);
	const view = $derived(latest);
	const editor = createRecordEditor<SchoolAttendanceView>(i18n.t, (v) => (latest = v));

	const daily = $derived(view?.mode !== 'semester');
	const rows = $derived(view?.rows ?? []);
	const filled = $derived(rows.filter((r) => r.filled));
	const unfilled = $derived(daily && !view?.holiday ? rows.filter((r) => !r.filled) : []);
	const total = (r: { present: number; sick: number; permit: number; absent: number }) =>
		r.present + r.sick + r.permit + r.absent;
	const sum = $derived(
		filled.reduce(
			(a, r) => ({
				n: a.n + total(r),
				h: a.h + r.present,
				s: a.s + r.sick,
				i: a.i + r.permit,
				a: a.a + r.absent
			}),
			{ n: 0, h: 0, s: 0, i: 0, a: 0 }
		)
	);
	const pctText = (part: number, whole: number) =>
		whole
			? `${formatNumber((part / whole) * 100, i18n.locale, { maximumFractionDigits: 1 })}%`
			: '—';

	const stats = $derived.by((): ModuleStat[] => {
		if (!view) return [];
		if (daily && view.holiday)
			return [{ label: t('attendance.holiday'), value: t('attendance.sunday') }];
		if (daily)
			return [
				{
					label: t('attendance.stat_filled'),
					value: `${filled.length} / ${rows.length}`,
					bar: rows.length ? (filled.length / rows.length) * 100 : 0
				},
				{ label: t('attendance.stat_presence'), value: pctText(sum.h, sum.n), tone: 'success' },
				{ label: t('attendance.stat_sick_permit'), value: `${sum.s} · ${sum.i}` },
				{ label: t('attendance.stat_absent'), value: sum.a, tone: sum.a ? 'danger' : 'default' }
			];
		return [
			{
				label: t('attendance.stat_term'),
				value: view.term === 1 ? t('years.term_odd') : view.term === 2 ? t('years.term_even') : '—',
				sub: view.term_start
					? t('attendance.term_range', {
							from: formatDate(view.term_start, i18n.locale),
							days: view.school_days
						})
					: ''
			},
			{ label: t('attendance.stat_avg'), value: pctText(sum.h, sum.n), tone: 'success' },
			{
				label: t('attendance.stat_risk', { days: 3 }),
				value: view.absent_risk,
				tone: view.absent_risk ? 'danger' : 'default',
				sub: t('attendance.risk_sub')
			}
		];
	});

	function go(params: Record<string, string>) {
		const q = new URLSearchParams(params).toString();
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- path sudah lewat resolve(); hanya query tanggal/mode
		void goto(`${resolve(APP_PATHS.SCHOOL_ADMIN_ATTENDANCE)}${q ? `?${q}` : ''}`, {
			noScroll: true
		});
	}
	const isToday = $derived(view ? view.date >= view.today : true);
	const dayLabel = $derived(
		view
			? `${view.date === view.today ? `${t('attendance.today')} · ` : ''}${formatDateTime(view.date, i18n.locale, { weekday: 'long', day: 'numeric', month: 'short' })}`
			: ''
	);
	const reminded = $derived(Boolean(view?.reminded_at));

	async function remind() {
		const out = await editor.run<SchoolAttendanceView>('remind', {});
		if (out) {
			latest = out;
			// Toast dari hasil nyata backend (wali kelas diantrekan + kelas dilewati), bukan jumlah kelas kosong.
			editor.notify(attendanceReminderMessage(i18n.t, out.reminder));
		}
	}

	const COLS = 'minmax(0,1.4fr) 64px 64px 64px 64px minmax(0,1.2fr)';
</script>

<svelte:head><title>{t('attendance.title')} · FLIXARE</title></svelte:head>

{#if !view}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('attendance.eyebrow')}
		title={t('attendance.title')}
		description={t('attendance.desc')}
		{stats}
		help="help.school_admin_attendance"
	>
		<div class="lms-card flex flex-col rounded-xl">
			<div class="border-lms-border flex flex-wrap items-center gap-2.5 border-b px-4 py-3">
				<TabBar
					label={t('attendance.mode')}
					value={daily ? 'day' : 'semester'}
					onchange={(k) => go(k === 'semester' ? { mode: 'semester' } : {})}
					items={[
						{ key: 'day', label: t('attendance.tab_day') },
						{ key: 'semester', label: t('attendance.tab_semester') }
					]}
				/>
				{#if daily}
					<div class="flex items-center gap-1">
						<button
							type="button"
							aria-label={t('attendance.prev_day')}
							class="lms-action-ghost lms-focus-ring flex size-8 items-center justify-center rounded-md"
							onclick={() => go({ date: shiftDate(view.date, -1) })}
							><Icon icon={ChevronLeft} size="sm" /></button
						>
						<span class="min-w-[170px] text-center text-[13px] font-semibold">{dayLabel}</span>
						<button
							type="button"
							aria-label={t('attendance.next_day')}
							class="lms-action-ghost lms-focus-ring flex size-8 items-center justify-center rounded-md disabled:opacity-40"
							disabled={isToday}
							onclick={() => go({ date: shiftDate(view.date, 1) })}
							><Icon icon={ChevronRight} size="sm" /></button
						>
					</div>
				{/if}
				<span class="flex-1"></span>
				<span class="text-lms-muted flex items-center gap-1.5 text-xs"
					><Icon icon={Eye} size="sm" />{t('attendance.monitor_only')}</span
				>
			</div>
			{#if unfilled.length}
				<div class="lms-tone-danger flex flex-wrap items-center gap-2.5 px-4 py-2.5 text-[13px]">
					<Icon icon={ClockAlert} size="sm" />
					<span class="flex-[1_1_260px]"
						><strong>{t('attendance.unfilled', { count: unfilled.length })}</strong>
						{unfilled.map((r) => r.name).join(', ')}</span
					>
					{#if view.date === view.today}
						<button
							type="button"
							class="lms-action-secondary lms-focus-ring inline-flex h-[34px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold disabled:opacity-60"
							disabled={reminded || editor.busy}
							onclick={remind}
							><Icon icon={reminded ? Check : BellRing} size="sm" />{reminded
								? t('attendance.reminded_label')
								: t('attendance.remind')}</button
						>
					{/if}
				</div>
			{/if}
			<div class="overflow-x-auto">
				<div class="min-w-[620px]">
					<div
						class="border-lms-border text-lms-muted grid gap-3 border-b px-4 py-[9px] font-mono text-[10px] tracking-[0.1em]"
						style:grid-template-columns={COLS}
					>
						<span>{t('attendance.head_class')}</span>
						<span>{daily ? t('attendance.head_present') : t('attendance.head_days')}</span>
						<span>{t('attendance.head_sick')}</span>
						<span>{t('attendance.head_permit')}</span>
						<span>{t('attendance.head_absent')}</span>
						<span>{daily ? t('attendance.head_presence') : t('attendance.head_avg')}</span>
					</div>
					{#each rows as r (r.class_id)}
						{@const n = total(r)}
						{@const pct = n ? (r.present / n) * 100 : 0}
						{@const threshold = daily ? ATTENDANCE_MID : ATTENDANCE_HIGH - 1}
						<div
							class="border-lms-border grid items-center gap-3 border-b px-4 py-2.5 text-[13px]"
							style:grid-template-columns={COLS}
						>
							<span class="flex min-w-0 flex-col gap-px"
								><span class="font-bold">{r.name}</span><span
									class="truncate text-[11px] {r.homeroom
										? 'text-lms-muted'
										: 'text-lms-warning-text'}">{r.homeroom || t('attendance.no_homeroom')}</span
								></span
							>
							{#if r.filled}
								<span class="font-semibold tabular-nums">{daily ? r.present : r.days}</span>
								<span class="text-lms-muted tabular-nums">{r.sick}</span>
								<span class="text-lms-muted tabular-nums">{r.permit}</span>
								<span
									class="tabular-nums {r.absent
										? 'text-lms-danger-text font-bold'
										: 'text-lms-muted'}">{r.absent}</span
								>
								<span class="flex items-center gap-2">
									<span
										class="bg-lms-surface-muted h-1.5 min-w-10 flex-1 overflow-hidden rounded-full"
										><span
											class="block h-full rounded-full {pct < threshold
												? 'bg-lms-warning-text'
												: 'bg-lms-success-text'}"
											style:width="{pct}%"
										></span></span
									>
									<span
										class="w-12 text-right text-xs font-semibold tabular-nums {pct < threshold
											? 'text-lms-warning-text'
											: ''}">{pctText(r.present, n)}</span
									>
								</span>
							{:else}
								{#each [0, 1, 2, 3] as i (i)}<span class="text-lms-muted">—</span>{/each}
								<span
									class="text-xs font-semibold {daily && !view.holiday
										? 'text-lms-danger-text'
										: 'text-lms-muted'}"
									>{daily && !view.holiday ? t('attendance.not_filled') : '—'}</span
								>
							{/if}
						</div>
					{:else}
						<p class="text-lms-muted px-4 py-9 text-center text-sm">{t('attendance.no_classes')}</p>
					{/each}
				</div>
			</div>
			<div class="text-lms-muted px-4 py-2.5 text-xs">{t('attendance.foot')}</div>
		</div>
	</ModuleShell>
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
