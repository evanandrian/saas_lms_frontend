<script lang="ts" module>
	import type { ImportWizardKind } from '../import-wizard.state.svelte';
	export type ImportKindProp = ImportWizardKind;
</script>

<script lang="ts">
	import type { SchoolImportRow } from '$lib/api/generated/lms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import { resolve } from '$app/paths';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { formatRupiah } from '$lib/utils/format';
	import Armchair from '@lucide/svelte/icons/armchair';
	import Ban from '@lucide/svelte/icons/ban';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Download from '@lucide/svelte/icons/download';
	import FileDown from '@lucide/svelte/icons/file-down';
	import FileUp from '@lucide/svelte/icons/file-up';
	import Info from '@lucide/svelte/icons/info';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import X from '@lucide/svelte/icons/x';
	import { onDestroy, onMount } from 'svelte';
	import { ImportWizardState, type SeatOffer } from '../import-wizard.state.svelte';
	import { PREFIX } from '../school-admin.model';
	import ActivationCodes from './ActivationCodes.svelte';
	import InviteJobProgress from './InviteJobProgress.svelte';
	import TabBar from './TabBar.svelte';

	interface Props {
		kind: ImportKindProp;
		/** Info prorata untuk tawaran tambah kursi (impor murid). */
		seatOffer?: SeatOffer | null;
		onclose: () => void;
		ondone: (saved: number) => void;
		/** Tambah kursi dari banner "Melebihi kursi"; mengembalikan true bila kursi langsung aktif (trial). */
		onbuyseats?: (seats: number) => Promise<boolean>;
	}

	let { kind, seatOffer = null, onclose, ondone, onbuyseats }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.import.${key}`, params);

	let dialog: HTMLDialogElement | undefined = $state();
	const wizard = new ImportWizardState({
		kind: () => kind,
		seatOffer: () => seatOffer,
		onbuyseats: () => onbuyseats,
		ondone: (saved) => ondone(saved),
		onclose: () => onclose(),
		t: i18n.t
	});

	onMount(() => {
		void wizard.loadSpec();
	});
	onDestroy(() => wizard.destroy());

	$effect(() => {
		dialog?.showModal();
	});

	const steps = $derived(
		[
			{ key: 'prep', label: t('step_prep'), icon: FileDown },
			{ key: 'preview', label: t('step_preview'), icon: ListChecks },
			{ key: 'done', label: t('step_done'), icon: Check }
		].map((s, i, all) => {
			const cur = all.findIndex((x) => x.key === wizard.step);
			return { ...s, reached: i <= cur, current: i === cur, past: i < cur };
		})
	);

	function statusOf(row: SchoolImportRow) {
		const check = wizard.checks.get(row.no);
		if (row.skip) return { label: t('row_skipped'), tone: 'lms-surface', icon: Ban };
		if (!check) return { label: '…', tone: 'muted', icon: Info };
		if (check.over) return { label: t('row_over'), tone: 'warning', icon: Armchair };
		const n = Object.keys(check.errors).length;
		if (n) return { label: t('row_errors', { count: n }), tone: 'danger', icon: CircleAlert };
		if (check.warn) return { label: t(`warn_${check.warn}`), tone: 'warning', icon: Info };
		return { label: t('row_valid'), tone: 'success', icon: Check };
	}
	const TONE: Record<string, string> = {
		'lms-surface': 'bg-lms-surface-muted text-lms-muted',
		muted: 'bg-lms-surface-muted text-lms-muted',
		warning: 'lms-tone-warning',
		danger: 'lms-tone-danger',
		success: 'lms-tone-success'
	};

	const templateHref = (format: 'xlsx' | 'csv') =>
		`${resolve(APP_PATHS.SCHOOL_ADMIN_IMPORT_TEMPLATE)}?kind=${kind}&format=${format}`;
</script>

<!-- Modal impor Excel/CSV (referensi v4 BigModal "ImportWizard"). -->
<dialog
	bind:this={dialog}
	aria-label={wizard.spec ? t('title', { title: wizard.spec.title.toLowerCase() }) : t('loading')}
	class="bg-lms-surface text-lms-foreground m-auto flex h-[min(860px,94dvh)] w-[min(1200px,96vw)] max-w-none flex-col overflow-hidden rounded-2xl p-0 shadow-2xl backdrop:bg-(--color-lms-hero)/45"
	{onclose}
>
	<div class="border-lms-border flex flex-wrap items-center gap-4 border-b px-6 py-4">
		<div class="flex min-w-0 flex-1 flex-col gap-0.5">
			<span class="text-lms-interactive font-mono text-[11px] tracking-[0.1em]">{t('eyebrow')}</span
			>
			<span class="text-lg font-bold"
				>{wizard.spec ? t('title', { title: wizard.spec.title.toLowerCase() }) : t('loading')}</span
			>
		</div>
		<ol class="flex flex-wrap items-center gap-3">
			{#each steps as s (s.key)}
				<li class="flex items-center gap-2">
					<span
						class="flex size-7 items-center justify-center rounded-full {s.reached
							? 'lms-action-primary'
							: 'bg-lms-surface-muted text-lms-muted'}"
						><Icon icon={s.past ? Check : s.icon} size="sm" /></span
					>
					<span class="text-[13px] {s.current ? 'font-bold' : 'text-lms-muted font-medium'}"
						>{s.label}</span
					>
				</li>
			{/each}
		</ol>
		<button
			type="button"
			aria-label={i18n.t(`${PREFIX}.common.close`)}
			class="bg-lms-surface-muted text-lms-muted lms-focus-ring flex size-9 items-center justify-center rounded-lg"
			onclick={onclose}><Icon icon={X} size="sm" /></button
		>
	</div>

	<div class="flex min-h-0 flex-1 flex-col overflow-auto">
		{#if wizard.specError}
			<p class="text-lms-danger-text p-6 text-sm">{wizard.specError}</p>
		{:else if !wizard.spec}
			<p class="text-lms-muted p-6 text-sm">{t('loading')}</p>
		{:else if wizard.step === 'prep'}
			<div class="grid gap-5 p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
				<div class="flex min-w-0 flex-col gap-3">
					<span class="text-sm font-bold">{t('format_title')}</span>
					{#if wizard.spec.note}<p class="text-lms-muted text-[13px]">{wizard.spec.note}</p>{/if}
					<div class="border-lms-border overflow-x-auto rounded-xl border">
						<table class="w-full min-w-[520px] text-left text-[13px]">
							<thead>
								<tr class="text-lms-muted font-mono text-[10px] tracking-[0.1em]">
									<th class="px-3 py-2">{t('col_column')}</th>
									<th class="px-3 py-2">{t('col_label')}</th>
									<th class="px-3 py-2">{t('col_example')}</th>
									<th class="px-3 py-2">{t('col_field')}</th>
								</tr>
							</thead>
							<tbody>
								{#each wizard.spec.columns as c, i (c.key)}
									{#if c.group && c.group !== wizard.spec.columns[i - 1]?.group}
										<tr
											><td colspan="4" class="bg-lms-surface-muted px-3 py-1.5 text-xs font-bold"
												>{c.group}</td
											></tr
										>
									{/if}
									<tr class="border-lms-border border-t">
										<td class="px-3 py-2 font-mono text-xs font-semibold"
											>{c.key}{#if c.required}<span class="text-lms-danger-text"> *</span>{/if}</td
										>
										<td class="px-3 py-2">{c.label}{c.format ? ` · ${c.format}` : ''}</td>
										<td class="text-lms-muted px-3 py-2 font-mono text-xs">{c.example || '—'}</td>
										<td class="text-lms-muted px-3 py-2 font-mono text-[11px]">{c.field}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
				<div class="flex min-w-0 flex-col gap-4">
					<div class="flex flex-col gap-2">
						<span class="text-sm font-bold">{t('template_title')}</span>
						<!-- eslint-disable svelte/no-navigation-without-resolve -- templateHref sudah lewat resolve(); hanya query kind & format -->
						<div class="flex flex-wrap gap-2">
							<a
								href={templateHref('xlsx')}
								class="lms-action-secondary lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-3.5 text-[13px] font-semibold"
								download><Icon icon={Download} size="sm" />{t('template_xlsx')}</a
							>
							<a
								href={templateHref('csv')}
								class="lms-action-secondary lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-3.5 text-[13px] font-semibold"
								download><Icon icon={Download} size="sm" />{t('template_csv')}</a
							>
						</div>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					</div>
					<label
						class="lms-focus-ring flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center {wizard.drag
							? 'border-lms-interactive bg-lms-interactive-subtle'
							: 'border-lms-border-strong'}"
						ondragover={(e) => {
							e.preventDefault();
							wizard.drag = true;
						}}
						ondragleave={() => (wizard.drag = false)}
						ondrop={(e) => {
							e.preventDefault();
							wizard.drag = false;
							void wizard.readFile(e.dataTransfer?.files[0]);
						}}
					>
						<span class="text-lms-interactive"><Icon icon={FileUp} /></span>
						<span class="text-sm font-semibold">{wizard.busy ? t('reading') : t('drop')}</span>
						<span class="text-lms-muted text-xs">{t('drop_hint')}</span>
						<input
							type="file"
							accept=".xlsx,.csv"
							class="sr-only"
							disabled={wizard.busy}
							onchange={(e) => {
								void wizard.readFile(e.currentTarget.files?.[0]);
								e.currentTarget.value = '';
							}}
						/>
					</label>
					{#if wizard.fileError}
						<p role="alert" class="lms-tone-danger rounded-lg px-3 py-2 text-[13px]">
							{wizard.fileError}
						</p>
					{/if}
				</div>
			</div>
		{:else if wizard.step === 'preview'}
			<div class="flex flex-wrap items-center gap-3 px-6 pt-4">
				<span class="text-sm font-semibold">{wizard.fileName}</span>
				<TabBar
					label={t('tabs_label')}
					value={wizard.tab}
					onchange={(k) => (wizard.tab = k as typeof wizard.tab)}
					items={[
						{ key: 'all', label: t('tab_all'), count: wizard.counts.all },
						{ key: 'err', label: t('tab_err'), count: wizard.counts.err, alert: true },
						{ key: 'ok', label: t('tab_ok'), count: wizard.counts.ok }
					]}
				/>
			</div>
			{#if wizard.overSeats > 0 && wizard.preview?.seats_avail !== null && wizard.preview?.seats_avail !== undefined}
				<div
					class="lms-tone-warning mx-6 mt-3 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-[13px]"
				>
					<Icon icon={Armchair} size="sm" />
					<span class="flex-[1_1_300px]"
						>{t('seat_text', {
							avail: wizard.preview.seats_avail,
							seats: wizard.preview.seats.seats,
							valid: wizard.counts.ok + wizard.overSeats,
							over: wizard.overSeats
						})}
						{seatOffer?.trial
							? t('seat_trial')
							: seatOffer
								? t('seat_prorata', {
										months: seatOffer.months,
										amount: formatRupiah(wizard.seatAmount, i18n.locale)
									})
								: ''}</span
					>
					{#if onbuyseats}
						<button
							type="button"
							class="bg-lms-warning-text text-lms-surface lms-focus-ring h-[34px] rounded-lg px-3.5 font-bold disabled:opacity-60"
							disabled={wizard.busy}
							onclick={() => wizard.buySeats()}
							>{seatOffer && !seatOffer.trial
								? t('seat_buy_amount', {
										count: wizard.overSeats,
										amount: formatRupiah(wizard.seatAmount, i18n.locale)
									})
								: t('seat_buy', { count: wizard.overSeats })}</button
						>
					{/if}
				</div>
			{/if}
			<div class="min-h-0 flex-1 overflow-auto px-6 py-3">
				<table class="w-max min-w-full text-left text-[13px]">
					<thead class="bg-lms-surface sticky top-0 z-10">
						<tr class="text-lms-muted font-mono text-[10px] tracking-[0.1em]">
							<th class="px-2 py-2">{t('col_row')}</th>
							<th class="px-2 py-2">{t('col_status')}</th>
							{#each wizard.spec.columns as c (c.key)}
								<th class="px-2 py-2 whitespace-nowrap"
									>{c.key}{#if c.required}<span class="text-lms-danger-text"> *</span>{/if}</th
								>
							{/each}
							<th class="px-2 py-2"><span class="sr-only">{t('col_action')}</span></th>
						</tr>
					</thead>
					<tbody>
						{#each wizard.visible as item (item.row.no)}
							{@const st = statusOf(item.row)}
							<tr class="border-lms-border border-t align-top {item.row.skip ? 'opacity-50' : ''}">
								<td class="text-lms-muted px-2 py-2 font-mono text-xs">{item.row.no}</td>
								<td class="px-2 py-2">
									<span
										class="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap {TONE[
											st.tone
										]}"><Icon icon={st.icon} size="sm" />{st.label}</span
									>
								</td>
								{#each wizard.spec.columns as c (c.key)}
									{@const err = wizard.cellError(item.row.no, c.key)}
									<td class="px-2 py-1.5">
										{#if err}
											<div class="flex w-[170px] flex-col gap-1">
												<input
													aria-label={`${c.key} ${item.row.no}`}
													value={item.row.values[c.key] ?? ''}
													class="lms-input lms-focus-ring border-[1.5px] border-lms-danger-text h-8 w-full rounded-md px-2 text-xs"
													oninput={(e) => wizard.setCell(item.index, c.key, e.currentTarget.value)}
												/>
												<span class="text-lms-danger-text text-[11px] leading-4">{err}</span>
											</div>
										{:else}
											<span
												class="block max-w-[200px] truncate whitespace-nowrap {item.row.values[
													c.key
												]
													? ''
													: 'text-lms-muted'}">{item.row.values[c.key] || '—'}</span
											>
										{/if}
									</td>
								{/each}
								<td class="px-2 py-1.5">
									<button
										type="button"
										class="lms-action-ghost lms-focus-ring flex size-8 items-center justify-center rounded-md"
										title={item.row.skip ? t('include') : t('exclude')}
										aria-label={item.row.skip ? t('include') : t('exclude')}
										onclick={() => wizard.toggleRow(item.index)}
										><Icon icon={item.row.skip ? RotateCcw : Ban} size="sm" /></button
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if !wizard.visible.length}
					<p class="text-lms-muted py-10 text-center text-sm">{t('no_rows')}</p>
				{/if}
			</div>
			{#if wizard.fileError}
				<p role="alert" class="lms-tone-danger mx-6 mb-2 rounded-lg px-3 py-2 text-[13px]">
					{wizard.fileError}
				</p>
			{/if}
		{:else if wizard.result}
			<div class="flex flex-col items-center gap-5 p-8 text-center">
				<span class="lms-tone-success flex size-14 items-center justify-center rounded-full"
					><Icon icon={Check} /></span
				>
				<div class="flex flex-col gap-1">
					<span class="text-xl font-bold">{t('done_title', { count: wizard.result.saved })}</span>
					<span class="text-lms-muted text-sm"
						>{wizard.result.invited
							? t('done_invited')
							: wizard.spec.invite
								? t('done_not_invited')
								: t('done_saved')}</span
					>
				</div>
				<div class="flex flex-wrap justify-center gap-3">
					<div class="lms-card flex min-w-[140px] flex-col rounded-xl px-5 py-3">
						<span class="text-lms-success-text text-2xl font-bold tabular-nums"
							>{wizard.result.saved}</span
						>
						<span class="text-lms-muted text-xs">{t('stat_saved')}</span>
					</div>
					<div class="lms-card flex min-w-[140px] flex-col rounded-xl px-5 py-3">
						<span
							class="text-2xl font-bold tabular-nums {wizard.result.skipped.length
								? 'text-lms-danger-text'
								: 'text-lms-muted'}">{wizard.result.skipped.length}</span
						>
						<span class="text-lms-muted text-xs">{t('stat_skipped')}</span>
					</div>
					{#if wizard.spec.invite && wizard.result.invite.queued}
						<div class="lms-card flex min-w-[140px] flex-col rounded-xl px-5 py-3">
							<span class="text-2xl font-bold tabular-nums">{wizard.result.invite.queued}</span>
							<span class="text-lms-muted text-xs"
								>{i18n.t(`${PREFIX}.invite_job.stat_queued`)}</span
							>
						</div>
					{:else if wizard.spec.invite}
						<div class="lms-card flex min-w-[140px] flex-col rounded-xl px-5 py-3">
							<span class="text-2xl font-bold tabular-nums"
								>{wizard.result.invite.sent +
									wizard.result.invite.linked +
									wizard.result.invite.codes.length}</span
							>
							<span class="text-lms-muted text-xs">{t('stat_invited')}</span>
						</div>
					{/if}
				</div>
				{#if wizard.result.invite.codes.length}
					<div class="w-full max-w-3xl text-left">
						<ActivationCodes codes={wizard.result.invite.codes} />
					</div>
				{/if}
				{#if wizard.result.invite.queued && wizard.result.invite.job_ids?.length}
					<!-- Undangan massal (> 50 akun) diproses worker; daftar disegarkan saat "Selesai". -->
					<div class="w-full max-w-3xl text-left">
						<InviteJobProgress jobIds={wizard.result.invite.job_ids} />
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if wizard.spec && wizard.step !== 'prep'}
		<div class="border-lms-border flex flex-wrap items-center gap-2 border-t px-6 py-3">
			{#if wizard.step === 'preview'}
				<span class="text-lms-muted flex-[1_1_240px] text-xs"
					>{wizard.counts.err
						? t('foot_errors', { count: wizard.counts.err })
						: t('foot_ready')}</span
				>
				{#if wizard.spec.invite}
					<span class="text-[13px] font-semibold">{t('invite_label')}</span>
					<TabBar
						label={t('invite_label')}
						value={wizard.inviteNow ? 'now' : 'later'}
						onchange={(k) => (wizard.inviteNow = k === 'now')}
						items={[
							{ key: 'now', label: t('invite_now') },
							{ key: 'later', label: t('invite_later') }
						]}
					/>
				{/if}
				<button
					type="button"
					class="lms-action-ghost lms-focus-ring h-10 rounded-[10px] px-3 text-[13px] font-semibold"
					onclick={() => wizard.reupload()}>{t('reupload')}</button
				>
				{#if wizard.counts.err || wizard.rows.some((r) => r.skip)}
					<button
						type="button"
						class="lms-action-secondary lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-[13px] font-semibold"
						onclick={() => wizard.downloadErrors()}
						><Icon icon={Download} size="sm" />{t('error_report')}</button
					>
				{/if}
				<button
					type="button"
					class="lms-action-primary lms-focus-ring h-10 rounded-[10px] px-4 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
					disabled={wizard.busy || !wizard.preview?.valid}
					onclick={() => wizard.commit()}
					>{t('commit', { count: wizard.preview?.valid ?? 0 })}</button
				>
			{:else}
				<span class="flex-1"></span>
				{#if wizard.result?.skipped.length}
					<button
						type="button"
						class="lms-action-secondary lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-[13px] font-semibold"
						onclick={() => wizard.downloadErrors()}
						><Icon icon={Download} size="sm" />{t('error_report')}</button
					>
				{/if}
				<button
					type="button"
					class="lms-action-primary lms-focus-ring h-10 rounded-[10px] px-4 text-[13px] font-bold"
					onclick={() => wizard.finish()}>{t('finish')}</button
				>
			{/if}
		</div>
	{/if}
</dialog>
