<script lang="ts">
	import { resolve } from '$app/paths';
	import type {
		SchoolAttendanceView,
		SchoolDashboardView
	} from '$lib/features/school-admin/school-admin.types';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		ATTENDANCE_HIGH,
		ATTENDANCE_MID,
		PREFIX,
		REQUIRED_SECTIONS,
		SEAT_SEGMENTS,
		attendanceBand,
		percent,
		storageUsage
	} from '$lib/features/school-admin/school-admin.model';
	import { workspaceGreeting } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { dayOfMonth, formatLongDate, formatWeekdayShort } from '$lib/utils/clock';
	import { formatDate, formatNumber, intlLocale } from '$lib/utils/format';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import DoorOpen from '@lucide/svelte/icons/door-open';
	import FileUp from '@lucide/svelte/icons/file-up';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.dashboard.${key}`, params);
	const reasonId = $props.id();
	const REPORT_RANK = { draft: 0, submitted: 1, approved: 2, locked: 3 } as const;

	// svelte-ignore state_referenced_locally
	let view = $state<SchoolDashboardView | null>(data.view);
	const editor = createRecordEditor<SchoolDashboardView>(i18n.t, (v) => (view = v));
	let selectedRoom = $state('');

	const greeting = $derived(workspaceGreeting(data.workspace, i18n.t));
	// Periode sapaan dihitung di server (load) agar SSR dan hidrasi konsisten.
	const greetingKey = $derived(data.greetingKey);
	const dateLocale = $derived(intlLocale(i18n.locale));
	const rooms = $derived(view?.floors.flatMap((f) => f.rooms) ?? []);
	const room = $derived(
		rooms.find((r) => r.class_id === selectedRoom) ??
			rooms.find((r) => !r.filled) ??
			rooms[0] ??
			null
	);
	const setup = $derived(view?.setup);
	const requiredLeft = $derived(Boolean(setup && setup.req_done < setup.req_total));
	const setupPct = $derived(setup ? percent(setup.done, setup.total) : 0);
	const reminded = $derived(Boolean(view?.reminded_at));

	const BAND_CLASSES = {
		high: 'lms-scale-high border border-transparent',
		mid: 'lms-scale-mid border border-transparent',
		low: 'lms-scale-low border border-transparent',
		unfilled: 'border-[1.5px] border-dashed border-lms-danger-text text-lms-danger-text',
		holiday: 'border border-lms-border bg-lms-surface-muted text-lms-muted'
	} as const;
	const ABSENCE_CLASSES: Record<string, string> = {
		sick: 'bg-lms-interactive-subtle text-lms-link',
		permit: 'lms-tone-warning',
		absent: 'lms-tone-danger'
	};
	const legend = $derived([
		{ band: 'high', label: i18n.t('dashboard.school.legend_high', { value: ATTENDANCE_HIGH }) },
		{
			band: 'mid',
			label: i18n.t('dashboard.school.legend_mid', {
				min: ATTENDANCE_MID,
				max: ATTENDANCE_HIGH - 1
			})
		},
		{ band: 'low', label: i18n.t('dashboard.school.legend_low', { value: ATTENDANCE_MID }) },
		{ band: 'unfilled', label: i18n.t('dashboard.school.legend_unfilled') }
	] as const);

	/** Alur rapor dari report_card_t: tiap tahap = jumlah kelas yang sudah mencapainya. */
	const pipeline = $derived.by(() => {
		const rows = view?.reports.rows ?? [];
		const reached = (rank: number) =>
			rows.filter((r) => REPORT_RANK[r.status as keyof typeof REPORT_RANK] >= rank).length;
		return [
			{
				label: t('step_locked_subjects'),
				count: rows.filter((r) => r.subjects > 0 && r.locked_subjects >= r.subjects).length
			},
			{ label: t('step_submitted'), count: reached(REPORT_RANK.submitted) },
			{ label: t('step_approved'), count: reached(REPORT_RANK.approved) },
			{ label: t('step_published'), count: reached(REPORT_RANK.locked) }
		];
	});
	const seatSegments = $derived(
		view && view.seats.seats ? Math.round((view.seats.used / view.seats.seats) * SEAT_SEGMENTS) : 0
	);
	const storage = $derived(view ? storageUsage(view.usage, i18n.locale) : null);
	/** Kelas yang sudah diingatkan dari panel kelas pada sesi ini (selain pengingat massal `reminded_at`). */
	let remindedRooms = $state<string[]>([]);
	const roomReminded = (classId: string) => reminded || remindedRooms.includes(classId);

	/** Tindak lanjut yang bisa langsung dijalankan di Beranda (tanpa memilih data). */
	const TODO_INLINE: Record<string, () => Promise<void>> = {
		attendance: () => remind()
	};

	/** Tujuan tombol tindak lanjut (path sudah lewat resolve()). */
	const TODO_LINK: Record<string, string> = {
		attendance: resolve(APP_PATHS.SCHOOL_ADMIN_ATTENDANCE),
		homeroom: resolve(APP_PATHS.SCHOOL_ADMIN_CLASSES),
		teachers_invite: resolve(APP_PATHS.SCHOOL_ADMIN_TEACHERS),
		guardians_invite: resolve(APP_PATHS.SCHOOL_ADMIN_GUARDIANS),
		report_draft: resolve(APP_PATHS.SCHOOL_ADMIN_REPORTS),
		teachers_inactive: resolve(APP_PATHS.SCHOOL_ADMIN_TEACHERS),
		invoice: resolve(APP_PATHS.SCHOOL_ADMIN_BILLING)
	};

	const importHref = `${resolve(APP_PATHS.SCHOOL_ADMIN_STUDENTS)}?import=1`;
	const sectionHref = (key: string, required: boolean) =>
		required
			? resolve(APP_PATHS.SCHOOL_ADMIN_SETUP)
			: `${resolve(APP_PATHS.SCHOOL_ADMIN_SETUP)}?section=${key}`;

	async function remind(classId?: string) {
		const out = await editor.run<SchoolAttendanceView>(
			'remindAttendance',
			classId ? { classId } : {}
		);
		if (!out) return;
		if (classId) remindedRooms = [...remindedRooms, classId];
		editor.notify(t(classId ? 'reminded_room_toast' : 'reminded_toast'));
		const fresh = await editor.run<SchoolDashboardView>('dashboard', {});
		if (fresh) view = fresh;
	}
</script>

<!-- Struktur mengikuti FLIXARE App v4 layar "05 Dashboard Sekolah"; seluruh angka dari backend. -->
<div class="flex min-w-0 flex-col gap-5">
	{#if !view}
		<StatePanel
			headingLevel={1}
			tone="error"
			title={i18n.t(`${PREFIX}.common.load_failed`)}
			description={i18n.t(`${PREFIX}.failure.${data.failure}`)}
		/>
	{:else}
		{#if setup && setup.done < setup.total}
			<section
				aria-label={t('setup_label')}
				class="lms-card flex flex-col gap-3 rounded-xl! border-[1.5px] p-4 shadow-none! {requiredLeft
					? 'border-lms-danger-text'
					: 'border-lms-border'}"
			>
				<div class="flex flex-wrap items-center gap-4">
					<span
						class="relative flex size-14 flex-none items-center justify-center rounded-full"
						style:background="conic-gradient(var(--color-lms-interactive) {setupPct * 3.6}deg,
						var(--color-lms-surface-muted) 0deg)"
					>
						<span
							class="bg-lms-surface flex size-11 items-center justify-center rounded-full text-sm font-bold tabular-nums"
							>{setupPct}%</span
						>
					</span>
					<div class="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
						<span class="flex flex-wrap items-center gap-2 text-base font-bold">
							{requiredLeft ? t('setup_title_required') : t('setup_title_optional')}
							<span
								class="rounded-full px-2 py-0.5 text-[11px] font-bold {requiredLeft
									? 'lms-tone-danger'
									: 'lms-tone-warning'}"
								>{t('setup_pill', { done: setup.done, total: setup.total })}</span
							>
						</span>
						<span class="text-lms-muted text-[13px]">
							{requiredLeft
								? t('setup_sub_required')
								: t('setup_sub_optional', {
										list: setup.missing
											.map((k) => i18n.t(`${PREFIX}.sections.${k}.title`).toLowerCase())
											.join(', ')
									})}
						</span>
					</div>
					<a
						href={resolve(APP_PATHS.SCHOOL_ADMIN_SETUP)}
						class="lms-action-primary lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-bold"
						>{requiredLeft ? t('setup_btn_required') : t('setup_btn_optional')}<Icon
							icon={ArrowRight}
							size="sm"
						/></a
					>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each setup.missing as key (key)}
						{@const required = (REQUIRED_SECTIONS as readonly string[]).includes(key)}
						<!-- eslint-disable svelte/no-navigation-without-resolve -- href dibentuk dari path yang sudah lewat resolve(); hanya query -->
						<a
							href={sectionHref(key, required)}
							class="lms-focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold {required
								? 'border-lms-danger-text text-lms-danger-text'
								: 'border-lms-border-strong'}"
						>
							{#if required}<Icon icon={CircleAlert} size="sm" />{/if}{i18n.t(
								`${PREFIX}.sections.${key}.title`
							)}
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{/each}
				</div>
			</section>
		{/if}

		<HeroBanner
			eyebrow={[
				formatLongDate(view.today, dateLocale),
				view.year ? `TA ${view.year}` : '',
				view.term ? (view.term === 1 ? t('term_odd') : t('term_even')) : ''
			]
				.filter(Boolean)
				.join(' · ')}
			title={i18n.t(`dashboard.greeting.${greetingKey}`, { name: greeting })}
			description={t('hero_sub', {
				school: view.school,
				plan: view.plan || '—',
				classes: view.classes,
				filled: view.filled
			})}
			help="help.school_admin_dashboard"
		>
			{#snippet actions()}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- href dibentuk dari path yang sudah lewat resolve(); hanya query -->
				<a
					href={importHref}
					class="lms-focus-ring inline-flex h-10 items-center gap-2 btn-base bg-lms-on-hero text-lms-brand-deep-neutral hover:bg-lms-on-hero/90 rounded-[10px] px-4 text-[13px] font-semibold"
					><Icon icon={FileUp} size="sm" />{i18n.t('dashboard.school.import_students')}</a
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
				<a
					href={resolve(APP_PATHS.SCHOOL_ADMIN_TEACHERS)}
					class="lms-focus-ring inline-flex h-10 items-center gap-2 btn-base border-lms-on-hero/25 text-lms-on-hero hover:bg-lms-on-hero/10 rounded-[10px] border px-4 text-[13px] font-semibold"
					><Icon icon={UserPlus} size="sm" />{i18n.t('dashboard.school.invite_teacher')}</a
				>
				<a
					href={resolve(APP_PATHS.SCHOOL_ADMIN_ANNOUNCEMENTS)}
					class="lms-focus-ring inline-flex h-10 items-center gap-2 btn-base border-lms-on-hero/25 text-lms-on-hero hover:bg-lms-on-hero/10 rounded-[10px] border px-4 text-[13px] font-semibold"
					><Icon icon={Megaphone} size="sm" />{i18n.t('dashboard.school.announcement')}</a
				>
			{/snippet}
			{#snippet aside()}
				{#if view?.trial}
					{@const trial = view.trial}
					<section
						class="lms-hero-raised flex flex-col gap-3.5 p-5"
						aria-label={i18n.t('dashboard.school.trial')}
					>
						<p class="flex items-center justify-between gap-2">
							<span class="text-lms-on-hero-muted text-[11px] font-bold tracking-[0.16em]"
								>{i18n.t('dashboard.school.trial')}</span
							>
							<span
								class="bg-lms-progress/22 text-lms-on-hero-progress rounded-full px-2.5 py-1 text-xs font-semibold"
								>{i18n.t('dashboard.school.trial_day', {
									day: trial.day_no,
									total: trial.days.length
								})}</span
							>
						</p>
						<ol class="flex gap-2" aria-label={i18n.t('dashboard.school.trial_days_label')}>
							{#each trial.days as day, index (day)}
								{@const past = index + 1 < trial.day_no}
								{@const today = index + 1 === trial.day_no}
								<li
									class={[
										'flex min-w-0 flex-1 flex-col items-center overflow-hidden rounded-lg',
										today
											? 'bg-lms-on-hero/14 border-lms-on-hero/60 border-[1.5px]'
											: 'bg-lms-on-hero/5 border-lms-on-hero/14 border',
										past && 'opacity-55'
									]}
								>
									<span
										class={[
											'w-full py-0.75 text-center text-[10px] font-bold tracking-[0.06em]',
											today ? 'bg-lms-interactive' : 'bg-lms-on-hero/12'
										]}>{formatWeekdayShort(day, dateLocale)}</span
									>
									<span class={['pt-1 pb-1.5 text-lg font-bold', past && 'line-through']}
										>{dayOfMonth(day)}</span
									>
								</li>
							{/each}
						</ol>
						<p class="text-lms-on-hero-muted text-[0.8125rem] leading-[1.2rem]">
							{t('trial_ends', {
								date: formatDate(trial.ends_at, i18n.locale, {
									weekday: 'long',
									hour: '2-digit',
									minute: '2-digit'
								}),
								used: view.seats.used,
								limit: view.seats.seats
							})}
						</p>
						<div class="flex flex-wrap gap-2">
							<a
								href={resolve(APP_PATHS.SCHOOL_ADMIN_ACTIVATE)}
								class="lms-focus-ring inline-flex h-9 items-center bg-lms-on-hero text-lms-brand-deep-neutral hover:bg-lms-on-hero/90 rounded-lg px-3.5 text-[13px] font-bold"
								>{i18n.t('dashboard.school.pay_activate')}</a
							>
							<a
								href={resolve(APP_PATHS.SCHOOL_ADMIN_BILLING)}
								class="lms-focus-ring inline-flex h-9 items-center border-lms-on-hero/25 text-lms-on-hero hover:bg-lms-on-hero/10 rounded-lg border px-3.5 text-[13px] font-semibold"
								>{i18n.t('dashboard.school.view_bill')}</a
							>
						</div>
					</section>
				{/if}
			{/snippet}
		</HeroBanner>

		<div class="grid gap-4 xl:grid-cols-3">
			<section
				class="lms-card flex min-w-0 flex-col gap-4 rounded-xl! p-5 shadow-none! xl:col-span-2"
				aria-labelledby="{reasonId}-attendance"
			>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 id="{reasonId}-attendance" class="text-base font-bold">
							{i18n.t('dashboard.school.attendance')}
						</h2>
						<p class="text-lms-muted text-[0.8125rem]">
							{view.holiday ? t('holiday') : i18n.t('dashboard.school.attendance_hint')}
						</p>
					</div>
					<ul class="text-lms-muted flex flex-wrap gap-3 text-[11px]">
						{#each legend as item (item.band)}
							<li class="flex items-center gap-1.25">
								<span class={['size-2.5 rounded-xs', BAND_CLASSES[item.band]]} aria-hidden="true"
								></span>{item.label}
							</li>
						{/each}
					</ul>
				</div>
				{#if view.floors.length}
					<div class="relative overflow-x-auto p-1">
						<div class="flex min-w-140 flex-col gap-2.5">
							{#each view.floors as floor (floor.grade)}
								<div class="flex items-stretch gap-2.5">
									<p
										class="border-lms-border text-lms-muted flex w-16 flex-none flex-col justify-center border-r-2 pr-2 text-xs"
									>
										<span class="text-lms-foreground text-sm font-bold"
											>{i18n.t('dashboard.school.grade', { grade: floor.label })}</span
										>
										{i18n.t('dashboard.school.grade_classes', { count: floor.rooms.length })}
									</p>
									<div class="grid flex-1 grid-cols-7 gap-1.5">
										{#each floor.rooms as r (r.class_id)}
											{@const band = view.holiday ? 'holiday' : attendanceBand(r.pct ?? null)}
											{@const selected = r.class_id === room?.class_id}
											<button
												type="button"
												class={[
													'lms-focus-ring flex h-15.5 flex-col items-start justify-between rounded-md px-2 py-1.75 text-left transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5',
													BAND_CLASSES[band],
													selected &&
														'ring-lms-interactive ring-offset-lms-surface -translate-y-0.5 ring-2 ring-offset-2'
												]}
												aria-pressed={selected}
												onclick={() => (selectedRoom = r.class_id)}
											>
												<span class="text-[11px] font-bold whitespace-nowrap">{r.name}</span>
												<span class="text-[0.9375rem] font-bold tabular-nums"
													>{view.holiday
														? t('holiday_tile')
														: r.pct === null || r.pct === undefined
															? roomReminded(r.class_id)
																? i18n.t('dashboard.school.room_reminded')
																: i18n.t('dashboard.school.room_unfilled')
															: `${r.pct}%`}</span
												>
											</button>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<p class="text-lms-muted py-6 text-center text-sm">
						{t('no_classes')}
						<a class="text-lms-link font-semibold" href={resolve(APP_PATHS.SCHOOL_ADMIN_SETUP)}
							>{t('setup_btn_required')}</a
						>
					</p>
				{/if}
			</section>

			{#if room}
				<section
					class="lms-card flex min-w-0 flex-col gap-3.5 rounded-xl! p-5 shadow-none!"
					aria-labelledby="{reasonId}-room"
					aria-live="polite"
				>
					<div class="flex items-start justify-between gap-3">
						<div>
							<span class="text-lms-muted font-mono text-[11px] tracking-[0.14em]"
								>{i18n.t('dashboard.school.class')}</span
							>
							<h2 id="{reasonId}-room" class="text-[1.625rem] leading-tight font-bold">
								{room.name}
							</h2>
							<p class="text-lms-muted text-[0.8125rem]">
								{room.homeroom
									? i18n.t('dashboard.school.homeroom', { name: room.homeroom })
									: t('no_homeroom')}
							</p>
						</div>
						<span
							class="bg-lms-interactive-subtle text-lms-interactive inline-flex size-10 items-center justify-center rounded-[10px]"
							aria-hidden="true"><Icon icon={DoorOpen} /></span
						>
					</div>
					{#if room.filled}
						<div class="flex flex-col gap-2">
							<p class="flex items-baseline gap-1.5">
								<span class="text-[2.125rem] leading-none font-bold tabular-nums"
									>{room.present}/{room.students}</span
								>
								<span class="text-lms-muted text-sm"
									>{i18n.t('dashboard.school.students_present')}</span
								>
							</p>
							<div class="bg-lms-surface-muted h-2 overflow-hidden rounded-full" aria-hidden="true">
								<div
									class="bg-lms-interactive h-full rounded-full"
									style:width="{room.pct ?? 0}%"
								></div>
							</div>
						</div>
						<ul>
							{#each room.absent as a, index (`${a.name}-${index}`)}
								<li
									class="border-lms-border flex items-center justify-between border-t py-2.25 text-[0.8125rem]"
								>
									<span>{a.name}</span>
									<span
										class={[
											'rounded-full px-2 py-0.75 text-[11px] font-bold',
											ABSENCE_CLASSES[a.status]
										]}>{i18n.t(`dashboard.school.absence.${a.status}`)}</span
									>
								</li>
							{:else}
								<li class="text-lms-progress-text flex items-center gap-2 pt-1.5 text-[0.8125rem]">
									<Icon icon={CircleCheck} size="sm" />{i18n.t('dashboard.school.all_present')}
								</li>
							{/each}
						</ul>
					{:else if !view.holiday}
						<div
							class="border-lms-danger-text flex flex-col gap-2.5 rounded-[10px] border-[1.5px] border-dashed p-3.5"
						>
							<p class="text-lms-danger-text text-sm font-bold">
								{i18n.t('dashboard.school.unfilled_title')}
							</p>
							<p class="text-lms-muted text-[0.8125rem] leading-[1.2rem]">
								{i18n.t('dashboard.school.unfilled_body_before')}
							</p>
							<button
								type="button"
								class={[
									'lms-focus-ring flex h-9.5 items-center justify-center gap-2 rounded-lg text-[0.8125rem] font-semibold disabled:cursor-not-allowed disabled:opacity-60',
									roomReminded(room.class_id)
										? 'bg-lms-progress/12 text-lms-progress-text'
										: 'lms-action-primary'
								]}
								disabled={roomReminded(room.class_id) || editor.busy || !room.homeroom}
								onclick={() => remind(room.class_id)}
							>
								<Icon
									icon={roomReminded(room.class_id) ? Check : BellRing}
									size="sm"
								/>{roomReminded(room.class_id)
									? i18n.t('dashboard.school.reminded')
									: i18n.t('dashboard.school.remind', { name: room.homeroom })}
							</button>
						</div>
					{/if}
					<a
						href={resolve(APP_PATHS.SCHOOL_ADMIN_ATTENDANCE)}
						class="text-lms-link mt-auto text-[13px] font-semibold"
						>{i18n.t('dashboard.school.open_attendance')}</a
					>
				</section>
			{/if}
		</div>

		<div class="grid gap-4 xl:grid-cols-3">
			<section
				class="lms-card flex min-w-0 flex-col gap-4 rounded-xl! p-5 shadow-none! xl:col-span-2"
				aria-labelledby="{reasonId}-report"
			>
				<div>
					<h2 id="{reasonId}-report" class="text-base font-bold">
						{t('report_title', { term: view.term === 2 ? t('term_even') : t('term_odd') })}
					</h2>
					<p class="text-lms-muted text-[0.8125rem]">
						{t('report_meta', { classes: view.reports.rows.length })}
					</p>
				</div>
				<ol class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8.125rem),1fr))] gap-2">
					{#each pipeline as step, index (step.label)}
						<li
							class={[
								'flex flex-col gap-2.5 rounded-lg p-3.5',
								step.count > 0 ? 'bg-lms-interactive-subtle' : 'bg-lms-background'
							]}
						>
							<span class="text-lms-muted font-mono text-[11px]"
								>{i18n.t('dashboard.school.report_step', { step: index + 1 })}</span
							>
							<span
								class={[
									'text-[1.625rem] leading-none font-bold tabular-nums',
									step.count === 0 ? 'text-lms-muted' : 'text-lms-foreground'
								]}
								>{step.count}<span class="text-lms-muted text-[0.8125rem] font-semibold">
									/{view.reports.rows.length}</span
								></span
							>
							<span class="text-xs leading-[1.0625rem]">{step.label}</span>
							<span class="flex flex-wrap gap-0.5" aria-hidden="true">
								{#each view.reports.rows as reportRow, i (reportRow.class_id)}<span
										class={[
											'size-1.5 rounded-[1px]',
											i < step.count ? 'bg-lms-interactive' : 'bg-lms-input-border'
										]}
									></span>{/each}
							</span>
						</li>
					{/each}
				</ol>
				<a
					href={resolve(APP_PATHS.SCHOOL_ADMIN_REPORTS)}
					class="text-lms-link text-[13px] font-semibold">{t('open_reports')}</a
				>
			</section>

			<section
				class="lms-card flex min-w-0 flex-col gap-4 rounded-xl! p-5 shadow-none!"
				aria-labelledby="{reasonId}-seats"
			>
				<div class="flex items-start justify-between gap-3">
					<div>
						<h2 id="{reasonId}-seats" class="text-base font-bold">
							{i18n.t('dashboard.school.seats')}
						</h2>
						<p class="text-lms-muted text-[0.8125rem]">
							{i18n.t('dashboard.school.seats_plan', { plan: view.plan || '—' })}
						</p>
					</div>
					<a
						href={resolve(APP_PATHS.SCHOOL_ADMIN_SUBSCRIPTION)}
						class="text-lms-link text-[13px] font-semibold"
						>{i18n.t('dashboard.school.add_seats')}</a
					>
				</div>
				<p class="flex items-baseline gap-1.5">
					<span class="text-4xl font-bold tracking-tight tabular-nums"
						>{formatNumber(view.seats.used, i18n.locale)}</span
					>
					<span class="text-lms-muted text-[0.9375rem]"
						>{view.seats.seats
							? i18n.t('dashboard.school.seats_used', {
									capacity: formatNumber(view.seats.seats, i18n.locale)
								})
							: t('no_seat_limit')}</span
					>
				</p>
				<div
					class="grid grid-cols-20 gap-0.75"
					role="img"
					aria-label={i18n.t('dashboard.school.seats_label', {
						used: view.seats.used,
						capacity: view.seats.seats
					})}
				>
					{#each Array.from({ length: SEAT_SEGMENTS }, (_, i) => i) as segment (segment)}
						<span
							class={[
								'h-3 rounded-t-xs rounded-b-[1px]',
								segment < seatSegments ? 'bg-lms-interactive' : 'bg-lms-surface-muted'
							]}
						></span>
					{/each}
				</div>
				<dl class="border-lms-border flex flex-col gap-2.5 border-t pt-3 text-[0.8125rem]">
					<div class="flex justify-between gap-2">
						<dt class="text-lms-muted">{i18n.t('dashboard.school.active_students')}</dt>
						<dd class="font-semibold tabular-nums">
							{formatNumber(view.usage.students_active_7d, i18n.locale)} · {percent(
								view.usage.students_active_7d,
								view.usage.students_total
							)}%
						</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-lms-muted">{i18n.t('dashboard.school.active_teachers')}</dt>
						<dd class="font-semibold tabular-nums">
							{i18n.t('dashboard.school.teachers_value', {
								active: view.usage.teachers_active_7d,
								total: view.usage.teachers_total
							})}
						</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-lms-muted">{i18n.t('dashboard.school.storage')}</dt>
						<dd class="font-semibold tabular-nums">
							{storage?.quota
								? i18n.t('dashboard.school.storage_of_quota', {
										used: storage.used,
										quota: storage.quota,
										pct: storage.pct ?? 0
									})
								: i18n.t('dashboard.school.storage_used', { used: storage?.used ?? '0' })}
						</dd>
					</div>
				</dl>
			</section>
		</div>

		<section
			class="lms-card flex min-w-0 flex-col gap-1 rounded-xl! p-5 shadow-none!"
			aria-labelledby="{reasonId}-follow-up"
		>
			<div class="mb-2 flex items-baseline justify-between">
				<h2 id="{reasonId}-follow-up" class="text-base font-bold">
					{i18n.t('dashboard.school.follow_up')}
				</h2>
				<span class="text-lms-muted text-xs"
					>{i18n.t('dashboard.school.follow_up_left', { count: view.todo.length })}</span
				>
			</div>
			<ul class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,26.25rem),1fr))] gap-x-7">
				{#each view.todo as item, index (`${item.kind}-${index}`)}
					<li class="border-lms-border flex items-start gap-3 border-t py-3">
						<span class="text-lms-warning-text mt-px"><Icon icon={CircleAlert} size="sm" /></span>
						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="text-sm font-semibold"
								>{t(`todo_${item.kind}_title`, { count: item.count, ref: item.ref })}</span
							>
							<span class="text-lms-muted text-xs"
								>{t(`todo_${item.kind}_sub`, {
									count: item.count,
									ref: item.ref,
									extra: item.extra || '—'
								})}</span
							>
						</span>
						{#if TODO_INLINE[item.kind]}
							<button
								type="button"
								class="text-lms-link lms-focus-ring mt-0.5 text-xs font-semibold disabled:opacity-50"
								disabled={editor.busy || reminded}
								onclick={() => TODO_INLINE[item.kind]?.()}
								>{reminded
									? i18n.t('dashboard.school.reminded')
									: t(`todo_${item.kind}_inline`)}</button
							>
						{:else}
							<!-- eslint-disable svelte/no-navigation-without-resolve -- href dibentuk dari path yang sudah lewat resolve(); hanya query -->
							<a
								href={TODO_LINK[item.kind] ?? resolve(APP_PATHS.SCHOOL_ADMIN_HOME)}
								class="text-lms-link mt-0.5 text-xs font-semibold"
								>{t(`todo_${item.kind}_action`)}</a
							>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/if}
					</li>
				{:else}
					<li class="text-lms-progress-text flex items-center gap-2 py-3 text-sm">
						<Icon icon={CircleCheck} size="sm" />{t('todo_empty')}
					</li>
				{/each}
			</ul>
		</section>
		<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
	{/if}
</div>
