<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { BackendFailure } from '$lib/api/backend-call';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { useI18n } from '$lib/i18n';
	import type { LucideIcon } from '@lucide/svelte';
	import Bell from '@lucide/svelte/icons/bell';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Database from '@lucide/svelte/icons/database';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Info from '@lucide/svelte/icons/info';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plug from '@lucide/svelte/icons/plug';
	import PlugZap from '@lucide/svelte/icons/plug-zap';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Wrench from '@lucide/svelte/icons/wrench';
	import { onDestroy } from 'svelte';
	import { ClusterConsoleState, type SaveOutcome } from '../cluster-console.svelte';
	import {
		BACKUP_SCHEDULES,
		CAPACITY_SEGMENTS,
		INPUT_STATUSES,
		LIVE_FIELDS,
		RETENTION_DAYS,
		SSL_MODES,
		WARN_MAX,
		WARN_MIN,
		WARN_STEP,
		aboveWarning,
		filledSegments,
		formatBytes,
		formatJakartaTime,
		regionLabel,
		relativeTime,
		usagePct,
		warnAt,
		type ClusterDraft,
		type ClusterErrorField,
		type ClusterInputStatus,
		type ClusterList,
		type ClusterStatus,
		type ClusterView
	} from '../clusters.model';

	/**
	 * Cluster DB (referensi "04g Cluster DB"): kartu kapasitas per cluster, form identitas/koneksi/
	 * kapasitas/backup, status penerimaan, dan database terbesar. Semua data dari backend; kata sandi
	 * admin tidak pernah dikirim balik (hanya `has_password`).
	 */
	interface Props {
		list: ClusterList | null;
		failure: BackendFailure | null;
	}

	let { list, failure }: Props = $props();

	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`clusters.${key}`, params);
	const TOAST_MS = 5000;

	// svelte-ignore state_referenced_locally
	const ui = list ? new ClusterConsoleState(list) : null;

	let toast = $state<{ text: string; icon: LucideIcon } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	let maintenanceOpen = $state(false);
	let discardOpen = $state(false);
	let pendingSwitch = $state<(() => void) | null>(null);
	let now = $state(Date.now());

	onDestroy(() => clearTimeout(toastTimer));

	function notify(text: string, icon: LucideIcon = CircleCheck) {
		toast = { text, icon };
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), TOAST_MS);
	}

	/** Pindah cluster / cluster baru: tanya dulu bila ada perubahan belum disimpan. */
	function guard(next: () => void) {
		if (ui?.dirty) {
			pendingSwitch = () => next();
			discardOpen = true;
			return;
		}
		next();
	}

	function pick(c: ClusterView) {
		if (!ui || c.id === ui.selectedId) return;
		guard(() => ui.select(c.id));
	}

	function startNew() {
		if (!ui || ui.isNew) return;
		guard(() => ui.startNew());
	}

	function confirmDiscard() {
		pendingSwitch?.();
		pendingSwitch = null;
	}

	function handleOutcome(outcome: SaveOutcome) {
		if (outcome.kind === 'saved') notify(t('toast.saved', { name: outcome.code }));
		else if (outcome.kind === 'unchanged') notify(t('toast.unchanged'), Info);
		else if (outcome.kind === 'confirm_maintenance') maintenanceOpen = true;
		else if (outcome.kind === 'failed') notify(t(outcome.reason), CircleAlert);
	}

	async function save() {
		if (!ui) return;
		handleOutcome(await ui.save());
	}

	async function confirmMaintenance() {
		if (!ui) return;
		handleOutcome(await ui.commit());
	}

	async function runTest() {
		if (!ui) return;
		await ui.runTest();
		now = Date.now();
	}

	const digits = (v: string) => v.replace(/\D/g, '');
	const normalizeCode = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]/g, '');

	function onText(key: 'code' | 'host' | 'admin_user' | 'password', e: Event) {
		if (!ui) return;
		const input = e.currentTarget as HTMLInputElement;
		const value = key === 'code' ? normalizeCode(input.value) : input.value;
		input.value = value;
		ui.setField(key, value);
	}

	function onDigits(key: 'port' | 'max_databases' | 'pool_size', e: Event) {
		if (!ui) return;
		const input = e.currentTarget as HTMLInputElement;
		const value = digits(input.value);
		input.value = value;
		ui.setField(key, value);
	}

	/** Pesan error isian: isian "live" langsung, lainnya setelah simpan ditekan (referensi). */
	function fieldError(field: ClusterErrorField): string {
		if (!ui) return '';
		const key = ui.errors[field];
		if (!key) return '';
		const visible =
			ui.tried ||
			LIVE_FIELDS.includes(field) ||
			(field !== 'test' && ui.serverErrors[field as keyof ClusterDraft] !== undefined);
		return visible ? t(`errors.${key}`, { n: ui.used }) : '';
	}

	// ===== Tampilan =====

	const STATUS_DOT: Record<ClusterStatus, string> = {
		available: 'bg-lms-progress',
		full: 'bg-lms-warning-text',
		draining: 'bg-lms-warning-text',
		maintenance: 'bg-lms-danger-text',
		retired: 'bg-lms-muted'
	};
	const STATUS_TEXT: Record<ClusterStatus, string> = {
		available: 'text-lms-success-text',
		full: 'text-lms-warning-text',
		draining: 'text-lms-warning-text',
		maintenance: 'text-lms-danger-text',
		retired: 'text-lms-muted'
	};
	const OPTION_TONE: Record<ClusterInputStatus, { on: string; radio: string }> = {
		available: {
			on: 'border-lms-success-text bg-lms-success-subtle',
			radio: 'border-[6px] border-lms-success-text'
		},
		draining: {
			on: 'border-lms-warning-text bg-lms-warning-subtle',
			radio: 'border-[6px] border-lms-warning-text'
		},
		maintenance: {
			on: 'border-lms-danger-text bg-lms-danger-subtle',
			radio: 'border-[6px] border-lms-danger-text'
		}
	};

	const isNew = $derived(ui?.isNew ?? true);
	const draft = $derived(ui?.draft);
	const max = $derived(Number(draft?.max_databases) || 0);
	const used = $derived(ui?.used ?? 0);
	const pct = $derived(usagePct(used, max || 1));
	const overWarn = $derived(draft ? aboveWarning(used, max || 1, draft.warn_pct) : false);
	const region = $derived(ui?.region ?? null);
	const showFullBadge = $derived(ui?.selected?.status === 'full');

	const testView = $derived.by(() => {
		if (!ui || !draft) return null;
		const test = ui.test;
		const endpoint = `${draft.host || '—'}:${draft.port || '—'}`;
		const failedTest = ui.tried && !!ui.errors.test;
		if (!test) {
			const last = ui.selected?.last_connected_at ?? null;
			return {
				title: isNew
					? t('test.untested')
					: last
						? t('test.last', { when: relativeTime(last, now, i18n.locale) })
						: t('test.never'),
				sub: endpoint,
				icon: !isNew && last ? CircleCheck : Plug,
				iconTone: !isNew && last ? 'text-lms-success-text' : 'text-lms-muted',
				box: ['bg-lms-background', failedTest ? 'border-lms-danger-text' : 'border-lms-border'],
				spin: false
			};
		}
		if (test.phase === 'running')
			return {
				title: t('test.running'),
				sub: t('test.running_sub'),
				icon: LoaderCircle,
				iconTone: 'text-lms-interactive',
				box: ['bg-lms-background', 'border-lms-border'],
				spin: true
			};
		if (test.phase === 'ok')
			return {
				title: t('test.ok'),
				sub: t('test.ok_sub', {
					version: test.version,
					ms: test.latencyMs,
					ssl: test.ssl ? draft.ssl_mode : t('test.ssl_off')
				}),
				icon: CircleCheck,
				iconTone: 'text-lms-success-text',
				box: ['lms-tone-success', 'border-transparent'],
				spin: false
			};
		return {
			title: t('test.failed'),
			sub: t(test.reason),
			icon: CircleX,
			iconTone: 'text-lms-danger-text',
			box: ['lms-tone-danger', 'border-transparent'],
			spin: false
		};
	});

	const lastBackup = $derived.by(() => {
		const b = ui?.selected?.last_backup;
		if (!b) return t('backup.none');
		return t('backup.last', {
			time: formatJakartaTime(b.finished_at ?? b.started_at, i18n.locale),
			size: formatBytes(b.size_bytes, i18n.locale),
			status: t(`backup_status.${b.status}`)
		});
	});

	const barState = $derived.by((): { text: string; icon: LucideIcon; tone: string } => {
		if (!ui) return { text: '', icon: Info, tone: '' };
		const count = ui.errorCount;
		if (ui.tried && count)
			return {
				text:
					ui.errors.test && count === 1 ? t('errors.test_required') : t('bar.errors', { n: count }),
				icon: CircleAlert,
				tone: 'text-lms-danger-text'
			};
		if (ui.dirty) return { text: t('bar.unsaved'), icon: Pencil, tone: 'text-lms-warning-text' };
		return { text: t('bar.saved'), icon: CircleCheck, tone: 'text-lms-muted' };
	});

	const inputBase =
		'lms-focus-ring h-[42px] w-full min-w-0 rounded-[10px] border-[1.5px] px-3 text-sm';
	const selectBase =
		'bg-lms-surface lms-focus-ring h-[42px] w-full rounded-[10px] border-[1.5px] px-2.5 text-sm border-lms-input-border';
	const suffixBox =
		'bg-lms-surface flex overflow-hidden rounded-[10px] border-[1.5px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lms-focus';
	const borderFor = (error: string) =>
		error ? 'border-lms-danger-text' : 'border-lms-input-border';
	const hintTone = (error: string) => (error ? 'text-lms-danger-text' : 'text-lms-muted');
</script>

{#if !ui || !draft}
	<div class="flex flex-col gap-4 pb-24">
		<StatePanel
			headingLevel={1}
			title={t(`state.${failure === 'forbidden' ? 'forbidden' : 'unavailable'}_title`)}
			description={t(`state.${failure === 'forbidden' ? 'forbidden' : 'unavailable'}_text`)}
			tone={failure === 'forbidden' ? 'warning' : 'error'}
		>
			{#snippet actions()}
				{#if failure !== 'forbidden'}
					<button
						type="button"
						class="btn lms-action-primary lms-focus-ring h-10 rounded-[10px] px-4 text-sm font-semibold"
						onclick={() => invalidateAll()}>{t('state.retry')}</button
					>
				{/if}
			{/snippet}
		</StatePanel>
	</div>
{:else}
	{@const codeError = fieldError('code')}
	{@const hostError = fieldError('host')}
	{@const portError = fieldError('port')}
	{@const userError = fieldError('admin_user')}
	{@const passError = fieldError('password')}
	{@const regionError = fieldError('region_code')}
	{@const maxError = fieldError('max_databases')}
	{@const poolError = fieldError('pool_size')}
	{@const warnError = fieldError('warn_pct')}
	<div class="text-lms-foreground flex flex-col gap-4 pb-24" data-screen-label="04g Cluster DB">
		<HeroBanner
			eyebrow={t('eyebrow')}
			title={t('title')}
			description={t('desc')}
			actionsPlacement="end"
			help="help.platform_clusters"
		>
			{#snippet actions()}
				<button
					type="button"
					class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero lms-focus-ring flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
					onclick={startNew}
				>
					<Icon icon={Plus} size="sm" />{t('new')}
				</button>
			{/snippet}
		</HeroBanner>

		<!-- Kartu cluster -->
		{#if ui.items.length}
			<div
				class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3"
				role="list"
				aria-label={t('cards_label')}
			>
				{#each ui.items as c (c.id)}
					{@const p = usagePct(c.used_databases, c.max_databases)}
					{@const warn = aboveWarning(c.used_databases, c.max_databases, c.warn_pct)}
					{@const on = c.id === ui.selectedId}
					{@const filled = filledSegments(p)}
					<div role="listitem" class="min-w-0">
						<button
							type="button"
							aria-current={on}
							class={[
								'bg-lms-surface text-lms-foreground lms-focus-ring flex w-full flex-col gap-2.5 rounded-xl border-[1.5px] p-4 text-left',
								on
									? 'border-lms-interactive ring-lms-interactive/20 ring-[3px]'
									: 'border-lms-border'
							]}
							onclick={() => pick(c)}
						>
							<span class="flex w-full items-center justify-between gap-2">
								<span class="truncate font-mono text-sm font-semibold">{c.code}</span>
								{#if c.status === 'full'}
									<span
										class="lms-tone-warning rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap"
										>{t('status.full')}</span
									>
								{:else}
									<span
										class={[
											'flex items-center gap-1.5 text-[11px] font-bold whitespace-nowrap',
											STATUS_TEXT[c.status]
										]}
									>
										<span class={['size-2 rounded-full', STATUS_DOT[c.status]]}></span>
										{t(`status.${c.status}`)}
									</span>
								{/if}
							</span>
							<span class="text-lms-muted text-xs">{regionLabel(c.region_name, c.region_zone)}</span
							>
							<span class="grid w-full grid-cols-20 gap-0.5" aria-hidden="true">
								{#each Array.from({ length: CAPACITY_SEGMENTS }, (_, i) => i) as i (i)}
									<span
										class={[
											'h-3.5 rounded-[2px]',
											i < filled
												? warn
													? 'bg-lms-warning-text'
													: 'bg-lms-interactive'
												: 'bg-lms-surface-muted'
										]}
									></span>
								{/each}
							</span>
							<span class="flex w-full justify-between text-xs">
								<span class="text-lms-muted"
									>{t('card.databases', { used: c.used_databases, max: c.max_databases })}</span
								>
								<span class={['font-bold', warn ? 'text-lms-warning-text' : '']}>{p}%</span>
							</span>
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<StatePanel title={t('empty_title')} description={t('empty_text')} />
		{/if}

		<div class="flex flex-wrap items-start gap-4">
			<div class="flex min-w-0 flex-[1_1_440px] flex-col gap-3.5">
				<!-- Identitas -->
				<section class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="text-base font-bold">{t('identity.title')}</h2>
						<span class="text-lms-muted text-xs"
							>{isNew ? t('identity.new') : t('identity.count', { n: used })}</span
						>
					</div>
					<div
						class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] items-start gap-x-4 gap-y-3.5"
					>
						<label class="flex min-w-0 flex-col gap-1.5">
							<span class="text-[13px] font-semibold">{t('field.code')}</span>
							<input
								value={draft.code}
								readonly={!isNew}
								placeholder={t('field.code_ph')}
								autocomplete="off"
								spellcheck="false"
								aria-invalid={!!codeError}
								oninput={(e) => onText('code', e)}
								class={[
									inputBase,
									'font-mono',
									isNew ? 'bg-lms-surface' : 'bg-lms-surface-muted text-lms-muted',
									borderFor(codeError)
								]}
							/>
							<span class={['text-xs', hintTone(codeError)]}
								>{codeError ||
									(isNew ? t('field.code_hint_new') : t('field.code_hint_locked'))}</span
							>
						</label>
						<label class="flex min-w-0 flex-col gap-1.5">
							<span class="text-[13px] font-semibold">{t('field.region')}</span>
							<select
								value={draft.region_code}
								aria-invalid={!!regionError}
								onchange={(e) => ui.setField('region_code', e.currentTarget.value)}
								class={[selectBase, regionError && 'border-lms-danger-text']}
							>
								{#if !draft.region_code}
									<option value="">{t('field.region_choose')}</option>
								{/if}
								{#each ui.regions as r (r.code)}
									<option value={r.code}>{regionLabel(r.name, r.zone)}</option>
								{/each}
							</select>
							<span
								class={[
									'text-xs',
									regionError
										? 'text-lms-danger-text'
										: region?.outside_indonesia
											? 'text-lms-warning-text'
											: 'text-lms-muted'
								]}
							>
								{regionError ||
									(region?.outside_indonesia
										? t('field.region_outside')
										: t('field.region_inside'))}
							</span>
						</label>
						<label class="flex min-w-0 flex-col gap-1.5">
							<span class="text-[13px] font-semibold">{t('field.version')}</span>
							<input
								value={ui.pgVersion || t('field.version_unknown')}
								readonly
								class={[
									inputBase,
									'bg-lms-surface-muted border-lms-input-border font-mono',
									ui.pgVersion ? '' : 'text-lms-muted'
								]}
							/>
							<span class="text-lms-muted text-xs">{t('field.version_hint')}</span>
						</label>
					</div>
				</section>

				<!-- Koneksi -->
				<section class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5">
					<h2 class="text-base font-bold">{t('connection.title')}</h2>
					<div
						class="grid grid-cols-[minmax(0,3fr)_minmax(90px,1fr)] items-start gap-x-4 gap-y-3.5"
					>
						<label class="flex min-w-0 flex-col gap-1.5">
							<span class="text-[13px] font-semibold">{t('field.host')}</span>
							<input
								value={draft.host}
								placeholder={t('field.host_ph')}
								autocomplete="off"
								spellcheck="false"
								aria-invalid={!!hostError}
								oninput={(e) => onText('host', e)}
								class={[inputBase, 'bg-lms-surface font-mono text-[13px]', borderFor(hostError)]}
							/>
							<span class="text-lms-danger-text text-xs">{hostError}</span>
						</label>
						<label class="flex min-w-0 flex-col gap-1.5">
							<span class="text-[13px] font-semibold">{t('field.port')}</span>
							<input
								value={draft.port}
								inputmode="numeric"
								autocomplete="off"
								aria-invalid={!!portError}
								oninput={(e) => onDigits('port', e)}
								class={[inputBase, 'bg-lms-surface font-mono text-[13px]', borderFor(portError)]}
							/>
							<span class="text-lms-danger-text text-xs">{portError}</span>
						</label>
					</div>
					<div
						class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] items-start gap-x-4 gap-y-3.5"
					>
						<label class="flex min-w-0 flex-col gap-1.5">
							<span class="text-[13px] font-semibold">{t('field.user')}</span>
							<input
								value={draft.admin_user}
								placeholder={t('field.user_ph')}
								autocomplete="off"
								spellcheck="false"
								aria-invalid={!!userError}
								oninput={(e) => onText('admin_user', e)}
								class={[inputBase, 'bg-lms-surface font-mono text-[13px]', borderFor(userError)]}
							/>
							<span class="text-lms-danger-text text-xs">{userError}</span>
						</label>
						<div class="flex min-w-0 flex-col gap-1.5">
							<label for="{uid}-password" class="text-[13px] font-semibold"
								>{t('field.password')}</label
							>
							<span class={[suffixBox, borderFor(passError)]}>
								<input
									id="{uid}-password"
									value={draft.password}
									type={ui.showPassword ? 'text' : 'password'}
									autocomplete="new-password"
									placeholder={isNew || !ui.selected?.has_password
										? t('field.password_ph_new')
										: t('field.password_ph_saved')}
									aria-invalid={!!passError}
									aria-describedby="{uid}-password-hint"
									oninput={(e) => onText('password', e)}
									class="h-[39px] min-w-0 flex-1 bg-transparent px-3 font-mono text-[13px] outline-none"
								/>
								<button
									type="button"
									class="bg-lms-surface-muted text-lms-muted lms-focus-ring flex w-10 items-center justify-center"
									aria-label={ui.showPassword ? t('field.password_hide') : t('field.password_show')}
									aria-pressed={ui.showPassword}
									onclick={() => (ui.showPassword = !ui.showPassword)}
								>
									<Icon icon={ui.showPassword ? EyeOff : Eye} size="sm" />
								</button>
							</span>
							<span id="{uid}-password-hint" class={['text-xs', hintTone(passError)]}
								>{passError ||
									(isNew ? t('field.password_hint_new') : t('field.password_hint_keep'))}</span
							>
						</div>
						<label class="flex min-w-0 flex-col gap-1.5">
							<span class="text-[13px] font-semibold">{t('field.ssl')}</span>
							<select
								value={draft.ssl_mode}
								onchange={(e) =>
									ui.setField('ssl_mode', e.currentTarget.value as ClusterDraft['ssl_mode'])}
								class={selectBase}
							>
								{#each SSL_MODES as mode (mode)}
									<option value={mode}>{t(`ssl_option.${mode}`)}</option>
								{/each}
							</select>
							<span
								class={[
									'text-xs',
									draft.ssl_mode === 'disable' ? 'text-lms-danger-text' : 'text-lms-muted'
								]}>{t(`ssl_hint.${draft.ssl_mode}`)}</span
							>
						</label>
					</div>
					{#if testView}
						<div
							class={[
								'flex flex-wrap items-center gap-3 rounded-[10px] border px-3.5 py-3',
								...testView.box
							]}
							aria-live="polite"
						>
							<span class={[testView.iconTone, testView.spin && 'animate-spin']}>
								<Icon icon={testView.icon} />
							</span>
							<span class="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
								<span class="text-lms-foreground text-sm font-semibold">{testView.title}</span>
								<span class="text-lms-muted font-mono text-xs break-all">{testView.sub}</span>
							</span>
							<button
								type="button"
								class="border-lms-border-strong bg-lms-surface text-lms-foreground lms-focus-ring flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-[13px] font-semibold"
								disabled={ui.test?.phase === 'running'}
								onclick={runTest}
							>
								<Icon icon={PlugZap} size="sm" />{t('test.run')}
							</button>
						</div>
					{/if}
				</section>

				<!-- Kapasitas -->
				<section class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5">
					<h2 class="text-base font-bold">{t('capacity.title')}</h2>
					<div
						class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] items-start gap-x-4 gap-y-3.5"
					>
						<div class="flex min-w-0 flex-col gap-1.5">
							<label for="{uid}-max" class="text-[13px] font-semibold">{t('field.max')}</label>
							<span class={[suffixBox, borderFor(maxError)]}>
								<input
									id="{uid}-max"
									value={draft.max_databases}
									inputmode="numeric"
									autocomplete="off"
									aria-invalid={!!maxError}
									aria-describedby="{uid}-max-hint"
									oninput={(e) => onDigits('max_databases', e)}
									class="h-[39px] min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums outline-none"
								/>
								<span class="bg-lms-surface-muted text-lms-muted flex items-center px-2.5 text-xs"
									>{t('field.max_unit')}</span
								>
							</span>
							<span id="{uid}-max-hint" class={['text-xs', hintTone(maxError)]}
								>{maxError || t('field.max_hint', { n: Math.max(0, max - used) })}</span
							>
						</div>
						<div class="flex min-w-0 flex-col gap-1.5">
							<label for="{uid}-pool" class="text-[13px] font-semibold">{t('field.pool')}</label>
							<span class={[suffixBox, borderFor(poolError)]}>
								<input
									id="{uid}-pool"
									value={draft.pool_size}
									inputmode="numeric"
									autocomplete="off"
									aria-invalid={!!poolError}
									oninput={(e) => onDigits('pool_size', e)}
									class="h-[39px] min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums outline-none"
								/>
								<span class="bg-lms-surface-muted text-lms-muted flex items-center px-2.5 text-xs"
									>{t('field.pool_unit')}</span
								>
							</span>
							<span class="text-lms-danger-text text-xs">{poolError}</span>
						</div>
					</div>
					<label class="flex flex-col gap-2">
						<span class="flex justify-between gap-3 text-[13px]">
							<span class="font-semibold">{t('field.warn')}</span>
							<span class="text-lms-warning-text font-bold">{draft.warn_pct}%</span>
						</span>
						<input
							type="range"
							min={WARN_MIN}
							max={WARN_MAX}
							step={WARN_STEP}
							value={draft.warn_pct}
							aria-invalid={!!warnError}
							oninput={(e) => ui.setField('warn_pct', Number(e.currentTarget.value))}
							class="lms-focus-ring accent-lms-interactive w-full"
						/>
						<span
							class="bg-lms-surface-muted relative block h-3.5 overflow-hidden rounded-full"
							aria-hidden="true"
						>
							<span
								class={[
									'absolute inset-y-0 left-0 rounded-full transition-[width] duration-300',
									overWarn ? 'bg-lms-warning-text' : 'bg-lms-interactive'
								]}
								style:width="{Math.min(100, pct)}%"
							></span>
							<span
								class="bg-lms-warning-text absolute inset-y-0 w-0.5"
								style:left="calc({draft.warn_pct}% - 1px)"
							></span>
						</span>
						<span class={['text-xs', warnError ? 'text-lms-danger-text' : 'text-lms-muted']}>
							{warnError ||
								(overWarn
									? t('capacity.over', { pct })
									: t('capacity.under', { pct, n: warnAt(max, draft.warn_pct) }))}
						</span>
					</label>
				</section>

				<!-- Backup -->
				<section class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5">
					<h2 class="text-base font-bold">{t('backup.title')}</h2>
					<div
						class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] items-start gap-x-4 gap-y-3.5"
					>
						<div class="flex min-w-0 flex-col gap-1.5">
							<span id="{uid}-schedule" class="text-[13px] font-semibold"
								>{t('field.schedule')}</span
							>
							<div
								class="bg-lms-surface-muted flex gap-0.5 rounded-[10px] p-[3px]"
								role="radiogroup"
								aria-labelledby="{uid}-schedule"
							>
								{#each BACKUP_SCHEDULES as option (option)}
									{@const active = draft.backup_schedule === option}
									<button
										type="button"
										role="radio"
										aria-checked={active}
										class={[
											'lms-focus-ring h-9 flex-1 rounded-lg px-1.5 text-xs font-semibold whitespace-nowrap',
											active ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
										]}
										onclick={() => ui.setField('backup_schedule', option)}
									>
										{t(`schedule.${option}`)}
									</button>
								{/each}
							</div>
						</div>
						<label class="flex min-w-0 flex-col gap-1.5">
							<span class="text-[13px] font-semibold">{t('field.retention')}</span>
							<select
								value={draft.backup_retention_days}
								onchange={(e) =>
									ui.setField(
										'backup_retention_days',
										Number(e.currentTarget.value) as ClusterDraft['backup_retention_days']
									)}
								class={selectBase}
							>
								{#each RETENTION_DAYS as days (days)}
									<option value={days}>{t('field.retention_days', { n: days })}</option>
								{/each}
							</select>
						</label>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={draft.pitr}
						class="lms-focus-ring flex items-center gap-3 rounded-lg text-left"
						onclick={() => ui.setField('pitr', !draft.pitr)}
					>
						<span
							class={[
								'relative h-[22px] w-10 shrink-0 rounded-full transition-colors',
								draft.pitr ? 'bg-lms-interactive' : 'bg-lms-input-border'
							]}
						>
							<span
								class={[
									'bg-lms-surface absolute top-[3px] left-[3px] size-4 rounded-full shadow-sm transition-transform',
									draft.pitr && 'translate-x-[18px]'
								]}
							></span>
						</span>
						<span class="flex flex-col gap-0.5">
							<span class="text-sm font-semibold">{t('field.pitr')}</span>
							<span class="text-lms-muted text-xs">{t('field.pitr_sub')}</span>
						</span>
					</button>
					<span class="text-lms-muted text-xs">{isNew ? t('backup.none') : lastBackup}</span>
				</section>

				<!-- Bar simpan -->
				<div
					class="lms-card sticky bottom-19 z-20 flex flex-wrap items-center gap-2.5 rounded-[14px]! py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--color-lms-brand-deep-neutral)_40%,transparent)]!"
				>
					<span
						class={['flex flex-[1_1_200px] items-center gap-2 text-[13px]', barState.tone]}
						aria-live="polite"
					>
						<Icon icon={barState.icon} size="sm" />{barState.text}
					</span>
					<button
						type="button"
						class="border-lms-border-strong bg-lms-surface lms-focus-ring h-[42px] rounded-[10px] border px-4 text-sm font-semibold"
						disabled={ui.busy}
						onclick={() => ui.reset()}
					>
						{t('reset')}
					</button>
					<button
						type="button"
						class="btn lms-action-primary lms-focus-ring flex h-[42px] items-center gap-2 rounded-[10px] px-[18px] text-sm font-bold"
						disabled={ui.busy}
						aria-busy={ui.busy}
						onclick={save}
					>
						<Icon icon={Save} size="sm" />{ui.busy
							? t('saving')
							: isNew
								? t('save_new')
								: t('save')}
					</button>
				</div>
			</div>

			<aside class="flex min-w-[260px] flex-[0_1_320px] flex-col gap-3.5 lg:sticky lg:top-21">
				<!-- Status penerimaan -->
				<section
					class="bg-lms-surface border-lms-border flex flex-col gap-3 rounded-xl border p-[18px]"
				>
					<h2 id="{uid}-status" class="text-[15px] font-bold">{t('status_title')}</h2>
					<div class="flex flex-col gap-3" role="radiogroup" aria-labelledby="{uid}-status">
						{#each INPUT_STATUSES as option (option)}
							{@const active = draft.status === option}
							<button
								type="button"
								role="radio"
								aria-checked={active}
								class={[
									'text-lms-foreground lms-focus-ring flex items-start gap-2.5 rounded-[10px] border-[1.5px] px-3 py-2.5 text-left',
									active ? OPTION_TONE[option].on : 'border-lms-border bg-lms-surface'
								]}
								onclick={() => ui.setField('status', option)}
							>
								<span
									class={[
										'bg-lms-surface mt-px size-[18px] flex-none rounded-full',
										active ? OPTION_TONE[option].radio : 'border-lms-input-border border-2'
									]}
								></span>
								<span class="flex flex-col gap-0.5">
									<span class="flex flex-wrap items-center gap-1.5 text-[13px] font-bold"
										>{t(`status.${option}`)}{#if option === 'available' && showFullBadge}<span
												class="lms-tone-warning rounded-full px-2 py-px text-[10px] font-bold"
												>{t('status.full')}</span
											>{/if}</span
									>
									<span class="text-lms-muted text-xs leading-[17px]"
										>{t(`status_sub.${option}`)}</span
									>
								</span>
							</button>
						{/each}
					</div>
				</section>

				<!-- Database terbesar -->
				<section
					class="bg-lms-surface border-lms-border flex flex-col gap-2.5 rounded-xl border p-[18px]"
				>
					<div class="flex items-baseline justify-between gap-2">
						<h2 class="text-[15px] font-bold">{t('dbs.title')}</h2>
						<span class="text-lms-muted text-xs">{t('dbs.total', { n: used })}</span>
					</div>
					{#if ui.databases.phase === 'loading'}
						<span class="text-lms-muted flex items-center gap-2 text-[13px]" aria-live="polite">
							<span class="animate-spin"><Icon icon={LoaderCircle} size="sm" /></span>{t(
								'dbs.loading'
							)}
						</span>
					{:else if ui.databases.phase === 'failed'}
						<span class="text-lms-danger-text flex items-start gap-2 text-[13px]">
							<Icon icon={CircleAlert} size="sm" />{t(ui.databases.reason)}
						</span>
					{:else if ui.databases.phase === 'ready' && ui.databases.items.length}
						<ul class="flex flex-col">
							{#each ui.databases.items as db (db.db_name)}
								<li class="border-lms-border flex flex-col gap-1 border-b py-2">
									<span class="flex justify-between gap-2">
										<span class="truncate font-mono text-xs font-semibold">{db.db_name}</span>
										<span class="text-xs font-bold whitespace-nowrap tabular-nums"
											>{formatBytes(db.size_bytes, i18n.locale)}</span
										>
									</span>
									<span class="text-lms-muted text-[11px]">{db.tenant_name || db.tenant_code}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<span class="text-lms-muted text-[13px]">{t('dbs.empty')}</span>
					{/if}
				</section>
			</aside>
		</div>
	</div>

	<ConfirmDialog
		bind:open={maintenanceOpen}
		tone="danger"
		icon={Wrench}
		title={t('confirm.maint_title', { name: draft.code })}
		message={t('confirm.maint_message', { n: used })}
		details={[
			{ icon: Database, label: t('confirm.maint_db'), value: String(used) },
			{ icon: Bell, label: t('confirm.maint_notify'), value: t('confirm.maint_notify_value') }
		]}
		confirmLabel={t('confirm.maint_label')}
		confirmIcon={Check}
		busyLabel={t('confirm.busy')}
		cancelLabel={t('confirm.cancel')}
		keyHint={t('confirm.key_hint')}
		onconfirm={confirmMaintenance}
	/>
	<ConfirmDialog
		bind:open={discardOpen}
		tone="danger"
		icon={Trash2}
		title={t('confirm.discard_title')}
		message={t('confirm.discard_message', {
			name: isNew ? t('confirm.discard_new') : draft.code
		})}
		confirmLabel={t('confirm.discard_confirm')}
		busyLabel={t('confirm.discard_busy')}
		cancelLabel={t('confirm.discard_cancel')}
		keyHint={t('confirm.key_hint')}
		onconfirm={confirmDiscard}
	/>
{/if}

<Toast message={toast?.text ?? null} icon={toast?.icon} />
