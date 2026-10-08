<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import type { MasterDataFailure } from '$lib/features/master-data/master-data.api';
	import {
		MASTER_DEFINITIONS,
		MASTER_SECTIONS,
		MASTER_STATUSES,
		NOTIFICATION_VARIABLES,
		PLATFORM_TENANT_CODE,
		blankDraft,
		buildCsv,
		codeType,
		draftFromRecord,
		fillTemplate,
		masterDefinition,
		normalizeCode,
		permissionKey,
		toSaveRequest,
		totalUsage,
		validateDraft,
		type FieldError,
		type FieldKey,
		type MasterDraft,
		type MasterField,
		type MasterIssue,
		type MasterKind,
		type MasterRecord,
		type MasterStatus,
		type MasterUsage
	} from '$lib/features/master-data/master-data.model';
	import { useI18n } from '$lib/i18n';
	import type { LucideIcon } from '@lucide/svelte';
	import Bell from '@lucide/svelte/icons/bell';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Download from '@lucide/svelte/icons/download';
	import Hash from '@lucide/svelte/icons/hash';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import X from '@lucide/svelte/icons/x';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { tick, untrack } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`master_data.${key}`, params);

	const ACCENT = '#4169E1';
	const FLASH = '#3FAE78';
	const TOAST_MS = 2600;
	const mix = (color: string, percent: number) =>
		`color-mix(in oklch, ${color} ${percent}%, var(--color-lms-surface))`;

	const simulate = untrack(() => data.simulate);
	// Salinan kerja: diganti data server setelah setiap simpan (usage antar-master ikut berubah).
	let masters = $state(untrack(() => (data.masters ? structuredClone(data.masters) : null)));
	$effect(() => {
		if (!simulate && data.masters) masters = structuredClone(data.masters);
	});

	type StatusFilter = 'all' | MasterStatus;
	let kind = $state<MasterKind>('institution');
	let masterQuery = $state('');
	let query = $state('');
	let statusFilter = $state<StatusFilter>('all');
	let flashCode = $state<string | null>(null);
	let toast = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	// Panel ubah (referensi drawer kanan).
	let isOpen = $state(false);
	let isNew = $state(false);
	let draft = $state<MasterDraft>(blankDraft());
	let original = $state<MasterDraft>(blankDraft());
	/** Kunci permission mengikuti modul & aksi sampai diubah manual (referensi `_auto`). */
	let keyAuto = $state(false);
	let originalRecord = $state<MasterRecord | null>(null);
	let tried = $state(false);
	let isSaving = $state(false);
	let failure = $state<MasterDataFailure | null>(null);
	let serverErrors = $state<Partial<Record<FieldKey, FieldError>>>({});
	let panel = $state<HTMLDialogElement | null>(null);

	type ConfirmKind = 'discard' | 'delete';
	let confirmKind = $state<ConfirmKind | null>(null);
	let isConfirmOpen = $state(false);
	let saveForm = $state<HTMLFormElement | null>(null);
	let deleteForm = $state<HTMLFormElement | null>(null);

	const definition = $derived(masterDefinition(kind));
	const masterName = $derived(t(`masters.${kind}.name`));
	const rowsAll = $derived(masters?.[kind] ?? []);
	const q = $derived(query.trim().toLowerCase());
	const rows = $derived(
		rowsAll.filter(
			(r) =>
				(statusFilter === 'all' || r.status === statusFilter) &&
				(!q || `${r.name} ${r.code}`.toLowerCase().includes(q))
		)
	);
	const mq = $derived(masterQuery.trim().toLowerCase());
	const sections = $derived(
		MASTER_SECTIONS.map((section) => ({
			section,
			items: MASTER_DEFINITIONS.filter(
				(m) =>
					m.section === section &&
					(!mq ||
						`${t(`masters.${m.kind}.name`)} ${t(`masters.${m.kind}.sub`)}`
							.toLowerCase()
							.includes(mq))
			)
		})).filter((s) => s.items.length)
	);

	function say(message: string) {
		clearTimeout(toastTimer);
		toast = message;
		toastTimer = setTimeout(() => {
			toast = null;
			flashCode = null;
		}, TOAST_MS);
	}

	function pickMaster(next: MasterKind) {
		kind = next;
		query = '';
		statusFilter = 'all';
		closePanel();
	}

	// ---------- tampilan nilai ----------
	/** Contoh data pratinjau template (referensi SAMPLE). */
	const SAMPLE = $derived(
		Object.fromEntries(NOTIFICATION_VARIABLES.map((v) => [v, t(`sample.${v}`)]))
	);
	const CHANNEL_ICON: Record<string, LucideIcon> = {
		in_app: Bell,
		email: Mail,
		push: Smartphone,
		whatsapp: MessageCircle
	};
	const dateFormat = $derived(
		new Intl.DateTimeFormat(i18n.locale, { day: 'numeric', month: 'short', year: 'numeric' })
	);

	function refName(source: MasterKind, code: string): string {
		if (source === 'institution' && code === PLATFORM_TENANT_CODE) return t('platform_tenant');
		return masters?.[source].find((r) => r.code === code)?.name ?? code;
	}

	function formatDate(value: string): string {
		return value ? dateFormat.format(new Date(`${value}T00:00:00`)) : '';
	}

	function display(key: FieldKey | 'status', r: MasterRecord): string {
		if (key === 'status') return t(`status.${r.status}`);
		const field = definition.fields.find((f) => f.key === key);
		const value = r[key];
		if (value === undefined || value === null || value === '') return '';
		if (field?.source) return refName(field.source, String(value));
		if (Array.isArray(value))
			return value.map((v) => t(`options.${field?.optionGroup}.${v}`)).join(', ');
		if (typeof value === 'boolean') return t(value ? 'yes' : 'no');
		if (field?.type === 'date') return formatDate(String(value));
		if (field?.optionGroup) return t(`options.${field.optionGroup}.${value}`);
		return String(value);
	}

	function rowMeta(r: MasterRecord): string {
		const parts = definition.meta
			.map((key) =>
				key === 'sort_order' && r.sort_order !== undefined
					? t('order', { n: r.sort_order })
					: display(key, r)
			)
			.filter(Boolean);
		return parts.join(' · ') || '—';
	}

	const STATUS_TONE: Record<MasterStatus, string> = {
		active: 'lms-tone-success',
		inactive: 'lms-tone-warning',
		archived: 'bg-lms-surface-muted text-lms-muted'
	};

	function usageText(usage: readonly MasterUsage[]): string {
		return usage.map((u) => t(`usage.${u.entity}`, { count: u.count })).join(', ');
	}

	// ---------- panel ----------
	const errors = $derived({
		...validateDraft(kind, draft, isNew, isNew ? rowsAll : []),
		...serverErrors
	});
	const errorCount = $derived(Object.keys(errors).length);
	const dirty = $derived(isOpen && JSON.stringify(draft) !== JSON.stringify(original));
	const usedBy = $derived(originalRecord ? usageText(originalRecord.usage) : '');
	const isUsed = $derived(!!originalRecord && totalUsage(originalRecord) > 0);

	function visibleError(key: FieldKey): FieldError | undefined {
		const error = errors[key];
		if (!error) return undefined;
		const raw = draft[key];
		const value = typeof raw === 'string' ? raw.trim() : raw;
		const filled = Array.isArray(value) ? value.length > 0 : !!value;
		return tried || error.key === 'server' || (filled && error.key !== 'required')
			? error
			: undefined;
	}

	function errorText(error: FieldError): string {
		if (error.key === 'server') return error.message ?? '';
		return t(`errors.${error.key}`, { other: error.other ?? '' });
	}

	/** Label kode/kunci di konfirmasi & eyebrow (pengguna = email, permission/template = kunci). */
	function codeLabel(): string {
		return t(`fields.${kind}.code`);
	}

	function openRecord(r: MasterRecord) {
		isNew = false;
		originalRecord = r;
		draft = draftFromRecord(r);
		original = draftFromRecord(r);
		keyAuto = false;
		showPanel();
	}

	function openNew() {
		isNew = true;
		originalRecord = null;
		draft = blankDraft(kind);
		original = blankDraft(kind);
		keyAuto = kind === 'permission';
		showPanel();
	}

	function showPanel() {
		tried = false;
		failure = null;
		serverErrors = {};
		isOpen = true;
		panel?.showModal();
	}

	function closePanel() {
		isOpen = false;
		panel?.close();
	}

	/** Tutup dengan konfirmasi bila ada perubahan (referensi `close`). */
	function requestClose() {
		if (dirty) openConfirm('discard');
		else closePanel();
	}

	function setField(key: FieldKey, value: string | boolean | string[]) {
		(draft as unknown as Record<string, typeof value>)[key] = value;
		if (serverErrors[key]) delete serverErrors[key];
		if (kind !== 'permission' || !isNew) return;
		if (key === 'code') keyAuto = false;
		else if ((key === 'module' || key === 'action') && keyAuto) {
			draft.code = permissionKey(draft.module, draft.action);
			delete serverErrors.code;
		}
	}

	/** Nilai teks isian (input/select/textarea); isian toggle & chips dirender terpisah. */
	function textValue(key: FieldKey): string {
		const value = draft[key];
		return typeof value === 'string' ? value : '';
	}

	function toggleChannel(channel: string) {
		const on = draft.channels.includes(channel);
		setField(
			'channels',
			on ? draft.channels.filter((c) => c !== channel) : [...draft.channels, channel]
		);
	}

	function insertVariable(variable: string) {
		setField('body', `${draft.body.replace(/\s*$/, '')} {{${variable}}}`.trimStart());
	}

	function openConfirm(next: ConfirmKind) {
		confirmKind = next;
		isConfirmOpen = true;
	}

	function askDelete() {
		if (isUsed) {
			say(t('toast.in_use', { usage: usedBy }));
			return;
		}
		openConfirm('delete');
	}

	async function handleConfirm() {
		if (confirmKind === 'discard') closePanel();
		if (confirmKind === 'delete') {
			if (simulate) applyDeleted(original.code, original.name);
			else deleteForm?.requestSubmit();
		}
		confirmKind = null;
	}

	// ---------- simpan / hapus ----------
	function applySaved(record: MasterRecord, wasNew: boolean) {
		closePanel();
		flashCode = record.code;
		if (statusFilter !== 'all' && statusFilter !== record.status) statusFilter = 'all';
		say(t(wasNew ? 'toast.created' : 'toast.saved', { name: record.name }));
		if (simulate && masters) {
			let list = masters[kind];
			// Periode berjalan sebelumnya otomatis dilepas (referensi).
			if (kind === 'academic_year' && record.is_current)
				list = list.map((r) => (r.code === record.code ? r : { ...r, is_current: false }));
			const index = list.findIndex((r) => r.code === record.code);
			if (index >= 0) list[index] = record;
			else list.push(record);
			masters[kind] = list;
		} else {
			void invalidateAll();
		}
	}

	function applyDeleted(code: string, name: string) {
		closePanel();
		say(t('toast.deleted', { name }));
		if (simulate && masters) masters[kind] = masters[kind].filter((r) => r.code !== code);
		else void invalidateAll();
	}

	function handleFailure(result: Record<string, unknown> | undefined) {
		const reason = (result?.reason as MasterDataFailure | undefined) ?? 'unavailable';
		const issues = (result?.issues as MasterIssue[] | undefined) ?? [];
		if (reason === 'validation' && issues.length) {
			// Pengguna: backend menamai isian kunci `email`, form memakai `code`.
			const fieldOf = (field: string) =>
				codeType(kind) === 'email' && field === 'email' ? 'code' : field;
			serverErrors = Object.fromEntries(
				issues.map((issue) => [fieldOf(issue.field), { key: 'server', message: issue.message }])
			);
			tried = true;
			failure = null;
			void focusFirstError();
			return;
		}
		if (reason === 'in_use') {
			const usage = (result?.usage as MasterUsage[] | undefined) ?? [];
			say(t('toast.in_use', { usage: usageText(usage) || t('usage.other') }));
			return;
		}
		failure = reason;
	}

	/** Arahkan pengguna ke isian pertama yang ditolak (bisa berada di luar area panel yang terlihat). */
	async function focusFirstError() {
		await tick();
		const field = panel?.querySelector<HTMLElement>('[aria-invalid="true"]');
		field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
		field?.focus({ preventScroll: true });
	}

	function save() {
		tried = true;
		if (Object.keys(validateDraft(kind, draft, isNew, isNew ? rowsAll : [])).length) {
			void focusFirstError();
			return;
		}
		if (simulate) {
			const body = toSaveRequest(kind, draft, isNew);
			const base = originalRecord ?? { usage: [] as MasterUsage[] };
			applySaved(
				{
					...base,
					...body,
					code: isNew ? draft.code : original.code,
					updated_at: new Date().toISOString()
				} as MasterRecord,
				isNew
			);
			return;
		}
		saveForm?.requestSubmit();
	}

	const submitSave: SubmitFunction = ({ formData }) => {
		const wasNew = isNew;
		formData.set('kind', kind);
		formData.set('code', original.code);
		formData.set('body', JSON.stringify(toSaveRequest(kind, draft, wasNew)));
		isSaving = true;
		return async ({ result }) => {
			isSaving = false;
			if (result.type === 'success') applySaved(result.data?.record as MasterRecord, wasNew);
			else if (result.type === 'failure') handleFailure(result.data);
			else failure = 'unavailable';
		};
	};

	const submitDelete: SubmitFunction = ({ formData }) => {
		const { code, name } = original;
		formData.set('kind', kind);
		formData.set('code', code);
		isSaving = true;
		return async ({ result }) => {
			isSaving = false;
			if (result.type === 'success') applyDeleted(code, name);
			else if (result.type === 'failure') handleFailure(result.data);
			else failure = 'unavailable';
		};
	};

	function exportCsv() {
		const csv = buildCsv(
			kind,
			rowsAll,
			(key) => (key === 'status' ? t('status_label') : t(`fields.${kind}.${key}`)),
			display
		);
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = `flixare-${kind}.csv`;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		say(t('toast.csv', { name: masterName, count: rowsAll.length }));
	}

	const barState = $derived.by((): { tone: string; icon: LucideIcon; text: string } => {
		if (tried && errorCount)
			return {
				tone: 'text-lms-danger-text',
				icon: CircleAlert,
				text: t('bar.errors', { count: errorCount })
			};
		if (failure)
			return { tone: 'text-lms-danger-text', icon: CircleAlert, text: t(`failure.${failure}`) };
		if (dirty) return { tone: 'text-lms-warning-text', icon: Pencil, text: t('bar.dirty') };
		return {
			tone: 'text-lms-muted',
			icon: CircleCheck,
			text: isNew ? t('bar.new') : t('bar.clean')
		};
	});

	function selectOptions(field: MasterField): { value: string; label: string }[] {
		if (field.options)
			return field.options.map((o) => ({
				value: o,
				label: t(`options.${field.optionGroup}.${o}`)
			}));
		if (!field.source || !masters) return [];
		const current = draft[field.key];
		const options = masters[field.source]
			.filter((r) => r.status !== 'archived' || r.code === current)
			.map((r) => ({
				value: r.code,
				label:
					r.status === 'active' ? r.name : `${r.name} (${t(`status.${r.status}`).toLowerCase()})`
			}));
		// Tenant platform tidak tampil di master Institusi, tetapi sah untuk akun platform.
		if (field.source === 'institution')
			options.unshift({ value: PLATFORM_TENANT_CODE, label: t('platform_tenant') });
		return options;
	}

	const preview = $derived({
		subject: fillTemplate(draft.subject, SAMPLE) || t('preview.subject_empty'),
		body: fillTemplate(draft.body, SAMPLE) || t('preview.body_empty'),
		channels: t('preview.channels', {
			channels: draft.channels.map((c) => t(`options.channels.${c}`)).join(', ') || '—'
		})
	});

	const confirmContent = $derived(
		confirmKind === 'discard'
			? {
					icon: Undo2,
					title: t('confirm.discard_title'),
					message: t('confirm.discard_message', { name: original.name || t('new_data') }),
					label: t('confirm.discard_confirm'),
					cancel: t('confirm.discard_cancel'),
					details: []
				}
			: {
					icon: Trash2,
					title: t('confirm.delete_title', { name: original.name }),
					message: t('confirm.delete_message', { master: masterName.toLowerCase() }),
					label: t('confirm.delete_confirm'),
					cancel: t('confirm.cancel'),
					details: original.code ? [{ icon: Hash, label: codeLabel(), value: original.code }] : []
				}
	);
</script>

<svelte:head>
	<title>{t('title')} · FLIXARE</title>
</svelte:head>

<!-- Referensi: FLIXARE App v3 · layar "04d Master Data Platform" (DataMaster). -->
<div class="text-lms-foreground flex flex-col gap-4 leading-[normal]">
	<HeroBanner
		eyebrow={t('eyebrow')}
		title={t('title')}
		description={t('description')}
	/>

	{#if simulate}
		<div
			class="lms-tone-warning flex items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] leading-[19px]"
			role="status"
		>
			<Icon icon={CircleAlert} size="sm" /><span>{t('simulation')}</span>
		</div>
	{/if}

	{#if !masters}
		<div
			class="border-lms-input-border bg-lms-surface text-lms-muted rounded-xl border border-dashed px-5 py-10 text-center text-sm"
			role="alert"
		>
			{t(`failure.${data.failure ?? 'unavailable'}`)}
		</div>
	{:else}
		<div class="flex flex-wrap items-start gap-4">
			<!-- Daftar master -->
			<nav
				class="bg-lms-surface border-lms-border flex max-h-[calc(100vh-120px)] min-w-[230px] flex-[0_1_250px] flex-col overflow-auto rounded-xl border lg:sticky lg:top-21"
				aria-label={t('masters_label')}
			>
				<div class="border-lms-border border-b p-3">
					<label class="relative block">
						<span class="sr-only">{t('search_master')}</span>
						<span class="text-lms-muted pointer-events-none absolute top-[11px] left-3"
							><Icon icon={Search} size="sm" /></span
						>
						<input
							type="search"
							bind:value={masterQuery}
							placeholder={t('search_master')}
							class="border-lms-input-border bg-lms-surface lms-focus-ring h-[38px] w-full rounded-lg border ps-9 pe-3 text-[13px]"
						/>
					</label>
				</div>
				{#each sections as { section, items } (section)}
					<div class="flex flex-col py-1.5">
						<span class="text-lms-muted px-3.5 pt-2 pb-1 font-mono text-[10px] tracking-[0.12em]"
							>{t(`sections.${section}`)}</span
						>
						{#each items as m (m.kind)}
							{@const selected = m.kind === kind}
							<button
								type="button"
								class="lms-focus-ring flex items-center gap-2.5 px-3.5 py-[9px] text-start"
								style={selected
									? `background:${mix(ACCENT, 8)};box-shadow:inset 3px 0 0 ${ACCENT}`
									: ''}
								aria-current={selected ? 'true' : undefined}
								onclick={() => pickMaster(m.kind)}
							>
								<span
									class={[
										'flex size-[30px] shrink-0 items-center justify-center rounded-lg',
										!selected && 'bg-lms-surface-muted text-lms-muted'
									]}
									style={selected ? `background:${mix(ACCENT, 16)};color:${ACCENT}` : ''}
								>
									<Icon icon={m.icon} size="sm" />
								</span>
								<span class="flex min-w-0 flex-1 flex-col gap-px">
									<span class="text-[13px] font-semibold">{t(`masters.${m.kind}.name`)}</span>
									<span class="text-lms-muted text-[11px]">{t(`masters.${m.kind}.sub`)}</span>
								</span>
								<span class="text-lms-muted text-[11px] font-semibold tabular-nums"
									>{masters[m.kind].length}</span
								>
							</button>
						{/each}
					</div>
				{/each}
			</nav>

			<!-- Tabel master terpilih -->
			<div class="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5">
				<div class="bg-lms-surface border-lms-border flex flex-col rounded-xl border">
					<div
						class="border-lms-border flex flex-wrap items-start justify-between gap-3 border-b px-5 py-[18px]"
					>
						<div class="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
							<h2 class="text-lg font-bold">{masterName}</h2>
							<p class="text-lms-muted text-[13px] text-pretty">{t(`masters.${kind}.desc`)}</p>
						</div>
						<div class="flex gap-2">
							<button
								type="button"
								class="border-lms-border-strong bg-lms-surface lms-focus-ring flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-[13px] font-semibold"
								onclick={exportCsv}
							>
								<Icon icon={Download} size="sm" />{t('export_csv')}
							</button>
							<button
								type="button"
								class="lms-action-primary lms-focus-ring flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold"
								onclick={openNew}
							>
								<Icon icon={Plus} size="sm" />{t('add', { name: masterName.toLowerCase() })}
							</button>
						</div>
					</div>
					<div class="border-lms-border flex flex-wrap items-center gap-2.5 border-b px-5 py-3">
						<label class="relative block flex-[1_1_220px]">
							<span class="sr-only">{t('search_rows')}</span>
							<span class="text-lms-muted pointer-events-none absolute top-[11px] left-3"
								><Icon icon={Search} size="sm" /></span
							>
							<input
								type="search"
								bind:value={query}
								placeholder={t('search_rows')}
								class="border-lms-input-border bg-lms-surface lms-focus-ring h-[38px] w-full rounded-lg border ps-9 pe-3 text-[13px]"
							/>
						</label>
						<div
							class="bg-lms-surface-muted flex gap-0.5 rounded-lg p-[3px]"
							role="radiogroup"
							aria-label={t('status_label')}
						>
							{#each ['all', ...MASTER_STATUSES] as StatusFilter[] as option (option)}
								{@const active = statusFilter === option}
								<button
									type="button"
									role="radio"
									aria-checked={active}
									class={[
										'lms-focus-ring h-[30px] rounded-md px-2.5 text-xs font-semibold whitespace-nowrap',
										active ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
									]}
									onclick={() => (statusFilter = option)}
								>
									{option === 'all' ? t('filter_all') : t(`status.${option}`)}
									{option === 'all'
										? rowsAll.length
										: rowsAll.filter((r) => r.status === option).length}
								</button>
							{/each}
						</div>
					</div>
					<div class="flex flex-col">
						{#each rows as r (r.code)}
							<button
								type="button"
								class={[
									'border-lms-border hover:bg-lms-surface-muted lms-focus-ring grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)_auto_20px] items-center gap-3.5 border-b px-5 py-3 text-start',
									r.status === 'archived' && 'opacity-70'
								]}
								style={flashCode === r.code ? `background:${mix(FLASH, 12)}` : ''}
								onclick={() => openRecord(r)}
							>
								<span class="flex min-w-0 flex-col gap-0.5">
									<span class="flex flex-wrap items-center gap-2 text-sm font-semibold"
										>{r.name}{#if r.is_current}<span
												class="bg-lms-interactive-subtle text-lms-link rounded-full px-[7px] py-0.5 text-[10px] font-bold"
												>{t('current')}</span
											>{/if}{#if r.pending}<span
												class="bg-lms-surface-muted text-lms-muted rounded-full px-[7px] py-0.5 text-[10px] font-bold"
												>{t('pending')}</span
											>{/if}</span
									>
									<span class="text-lms-muted truncate font-mono text-[11px]">{r.code}</span>
								</span>
								<span class="text-lms-muted line-clamp-2 min-w-0 text-[13px]">{rowMeta(r)}</span>
								<span
									class={[
										'rounded-full px-2 py-[3px] text-[10px] font-bold tracking-wide',
										STATUS_TONE[r.status]
									]}>{t(`status.${r.status}`)}</span
								>
								<span class="text-lms-muted"><Icon icon={ChevronRight} size="sm" /></span>
							</button>
						{/each}
						{#if !rows.length}
							<div class="flex flex-col items-center gap-2.5 px-5 py-9 text-center">
								<span class="text-lms-muted text-sm"
									>{rowsAll.length ? t('empty_filtered') : t('empty')}</span
								>
								<button
									type="button"
									class="border-lms-border-strong bg-lms-surface lms-focus-ring h-9 rounded-lg border px-3.5 text-[13px] font-semibold"
									onclick={() => {
										query = '';
										statusFilter = 'all';
									}}
								>
									{t('clear_filter')}
								</button>
							</div>
						{/if}
					</div>
					<div class="text-lms-muted px-5 py-2.5 text-xs">
						{t('footnote', { shown: rows.length, total: rowsAll.length })}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Saat panel (dialog modal, top layer) terbuka, toast dirender di dalam panel agar tidak tertutup backdrop. -->
<Toast message={isOpen ? null : toast} />

<!-- Panel ubah/tambah (referensi drawer kanan 540px). Dialog native: fokus terkurung, ESC = tutup (dengan konfirmasi). -->
<dialog
	bind:this={panel}
	class="bg-lms-surface text-lms-foreground border-lms-border m-0 ms-auto h-dvh outline-none max-h-dvh w-[min(540px,100vw)] max-w-none border-s p-0 leading-[normal] shadow-[-24px_0_60px_-30px_rgba(10,16,41,0.6)] backdrop:bg-[rgba(10,16,41,0.45)]"
	aria-labelledby="master-panel-title"
	oncancel={(e) => {
		e.preventDefault();
		requestClose();
	}}
	onclick={(e) => {
		if (e.target === panel) requestClose();
	}}
>
	{#if isOpen}
		<div class="flex h-full flex-col">
			<div class="border-lms-border flex items-start gap-3 border-b px-5 py-[18px]">
				<div class="flex min-w-0 flex-1 flex-col gap-1">
					<span class="text-lms-muted font-mono text-[11px] tracking-widest">
						{masterName.toUpperCase()} · {isNew ? t('panel.new_eyebrow') : original.code}
					</span>
					<h2 id="master-panel-title" class="text-lg font-bold">
						{isNew ? t('add', { name: masterName.toLowerCase() }) : original.name || t('untitled')}
					</h2>
					<span class="text-lms-muted text-xs">
						{isNew
							? t('panel.required_hint')
							: usedBy
								? t('panel.used_by', { usage: usedBy })
								: t('panel.unused')}
					</span>
				</div>
				<button
					type="button"
					class="bg-lms-surface-muted text-lms-muted lms-focus-ring flex size-9 items-center justify-center rounded-lg"
					aria-label={t('panel.close')}
					onclick={requestClose}
				>
					<Icon icon={X} size="sm" />
				</button>
			</div>

			<div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-auto p-5">
				<div class="grid grid-cols-2 items-start gap-3.5">
					{#each definition.fields as field (field.key)}
						{@const error = visibleError(field.key)}
						{@const id = `master-field-${field.key}`}
						{@const locked = field.key === 'code' && !isNew}
						<div class={['flex min-w-0 flex-col gap-1.5', field.full && 'col-span-full']}>
							<label for={id} id="{id}-label" class="text-[13px] font-semibold">
								{t(`fields.${kind}.${field.key}`)}{#if field.required}<span
										class="text-lms-danger-text ms-1"
										aria-hidden="true">*</span
									>{/if}
							</label>
							{#if field.type === 'textarea'}
								<textarea
									{id}
									rows="3"
									value={textValue(field.key)}
									oninput={(e) => setField(field.key, e.currentTarget.value)}
									aria-invalid={!!error}
									aria-required={field.required}
									class={[
										'bg-lms-surface lms-focus-ring w-full resize-y rounded-[10px] border-[1.5px] px-3 py-2.5 text-sm leading-[21px]',
										error ? 'border-lms-danger-text' : 'border-lms-input-border'
									]}></textarea>
							{:else if field.type === 'select'}
								<select
									{id}
									value={textValue(field.key)}
									onchange={(e) => setField(field.key, e.currentTarget.value)}
									aria-invalid={!!error}
									aria-required={field.required}
									class={[
										'bg-lms-surface lms-focus-ring h-[42px] w-full rounded-[10px] border-[1.5px] px-2.5 text-sm',
										error ? 'border-lms-danger-text' : 'border-lms-input-border'
									]}
								>
									<option value=""
										>{field.optional
											? t(`fields.${kind}.${field.key}_none`)
											: t('choose', {
													label: t(`fields.${kind}.${field.key}`).toLowerCase()
												})}</option
									>
									{#each selectOptions(field) as option (option.value)}<option value={option.value}
											>{option.label}</option
										>{/each}
								</select>
							{:else if field.type === 'seg'}
								<div
									class="bg-lms-surface-muted flex flex-wrap gap-0.5 rounded-[10px] p-[3px]"
									role="radiogroup"
									aria-labelledby="{id}-label"
								>
									{#each field.options ?? [] as option (option)}
										{@const active = draft[field.key] === option}
										<button
											type="button"
											role="radio"
											aria-checked={active}
											class={[
												'lms-focus-ring h-9 flex-auto rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap',
												active ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
											]}
											onclick={() => setField(field.key, option)}
										>
											{t(`options.${field.optionGroup}.${option}`)}
										</button>
									{/each}
								</div>
							{:else if field.type === 'chips'}
								<div class="flex flex-wrap gap-1.5" role="group" aria-labelledby="{id}-label">
									{#each field.options ?? [] as option (option)}
										{@const on = draft.channels.includes(option)}
										<button
											type="button"
											aria-pressed={on}
											class={[
												'lms-focus-ring flex h-[34px] items-center gap-1.5 rounded-full border-[1.5px] px-3 text-xs font-semibold',
												on
													? 'border-lms-interactive bg-lms-interactive-subtle text-lms-link'
													: 'border-lms-border-strong bg-lms-surface text-lms-muted'
											]}
											onclick={() => toggleChannel(option)}
										>
											<Icon icon={CHANNEL_ICON[option] ?? Bell} size="sm" />{t(
												`options.${field.optionGroup}.${option}`
											)}
										</button>
									{/each}
								</div>
							{:else if field.type === 'toggle'}
								<button
									{id}
									type="button"
									role="switch"
									aria-checked={draft.is_current}
									class="lms-focus-ring flex items-center gap-3 rounded-lg py-1.5 text-start"
									onclick={() => setField(field.key, !draft.is_current)}
								>
									<span
										class={[
											'relative h-[22px] w-10 shrink-0 rounded-full transition-colors',
											draft.is_current ? 'bg-lms-interactive' : 'bg-lms-input-border'
										]}
									>
										<span
											class={[
												'absolute top-[3px] left-[3px] size-4 rounded-full bg-white transition-transform',
												draft.is_current && 'translate-x-[18px]'
											]}
										></span>
									</span>
									<span class="text-[13px]">{t(`fields.${kind}.${field.key}_on`)}</span>
								</button>
							{:else}
								<input
									{id}
									type={field.type === 'email' || field.type === 'tel' || field.type === 'date'
										? field.type
										: 'text'}
									inputmode={field.type === 'number' ? 'numeric' : undefined}
									autocomplete="off"
									value={textValue(field.key)}
									readonly={locked}
									placeholder={field.placeholder ? t(`fields.${kind}.${field.key}_ph`) : ''}
									oninput={(e) => {
										const raw = e.currentTarget.value;
										const value =
											field.key === 'code'
												? normalizeCode(kind, raw)
												: field.type === 'number'
													? raw.replace(/\D/g, '')
													: raw;
										e.currentTarget.value = value;
										setField(field.key, value);
									}}
									aria-invalid={!!error}
									aria-required={field.required}
									class={[
										'lms-focus-ring h-[42px] w-full min-w-0 rounded-[10px] border-[1.5px] px-3 text-sm',
										(field.type === 'code' || field.type === 'key') && 'font-mono',
										locked ? 'bg-lms-surface-muted text-lms-muted' : 'bg-lms-surface',
										error ? 'border-lms-danger-text' : 'border-lms-input-border'
									]}
								/>
							{/if}
							<span
								class={[
									'text-xs leading-[17px]',
									error ? 'text-lms-danger-text' : 'text-lms-muted'
								]}
							>
								{#if error}{errorText(error)}{:else if locked}{t(
										'panel.code_locked'
									)}{:else if field.help}{t(`fields.${kind}.${field.key}_help`)}{/if}
							</span>
						</div>
					{/each}
				</div>

				{#if kind === 'notification_template'}
					<div class="bg-lms-surface-muted flex flex-col gap-2.5 rounded-xl p-3.5">
						<span class="text-[13px] font-semibold">{t('variables')}</span>
						<div class="flex flex-wrap gap-1.5">
							{#each NOTIFICATION_VARIABLES as variable (variable)}
								<button
									type="button"
									class="border-lms-border-strong bg-lms-surface lms-focus-ring h-[30px] rounded-md border px-2.5 font-mono text-xs"
									onclick={() => insertVariable(variable)}>{`{{${variable}}}`}</button
								>
							{/each}
						</div>
						<span class="text-lms-muted pt-1.5 font-mono text-[10px] tracking-[0.12em]"
							>{t('preview.label')}</span
						>
						<div
							class="bg-lms-surface border-lms-border flex items-start gap-3 rounded-[10px] border px-3.5 py-3"
						>
							<span
								class="bg-lms-interactive-subtle text-lms-link flex size-8 shrink-0 items-center justify-center rounded-lg"
								><Icon icon={Bell} size="sm" /></span
							>
							<span class="flex min-w-0 flex-col gap-[3px]">
								<span class="text-[13px] font-bold">{preview.subject}</span>
								<span class="text-lms-muted text-[13px] leading-[19px]">{preview.body}</span>
								<span class="text-lms-muted text-[11px]">{preview.channels}</span>
							</span>
						</div>
					</div>
				{/if}

				<div class="border-lms-border flex flex-col gap-1.5 border-t pt-4">
					<span class="text-[13px] font-semibold" id="master-status-label">{t('status_label')}</span
					>
					<div
						class="bg-lms-surface-muted flex gap-0.5 rounded-[10px] p-[3px]"
						role="radiogroup"
						aria-labelledby="master-status-label"
					>
						{#each MASTER_STATUSES as option (option)}
							{@const active = draft.status === option}
							<button
								type="button"
								role="radio"
								aria-checked={active}
								class={[
									'lms-focus-ring h-9 flex-1 rounded-lg text-xs font-semibold',
									active ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
								]}
								onclick={() => (draft.status = option)}
							>
								{t(`status.${option}`)}
							</button>
						{/each}
					</div>
					<span class="text-lms-muted text-xs">{t(`status_note.${draft.status}`)}</span>
				</div>
			</div>

			<div
				class="border-lms-border bg-lms-surface flex flex-wrap items-center gap-2 border-t px-5 py-3"
			>
				{#if !isNew}
					<button
						type="button"
						class={[
							'border-lms-border-strong bg-lms-surface text-lms-danger-text lms-focus-ring flex size-[42px] items-center justify-center rounded-[10px] border',
							isUsed && 'opacity-40'
						]}
						aria-label={t('panel.delete')}
						title={isUsed ? t('panel.delete_blocked') : t('panel.delete')}
						disabled={isSaving}
						onclick={askDelete}
					>
						<Icon icon={Trash2} size="sm" />
					</button>
				{/if}
				<span
					class={['flex flex-[1_1_140px] items-center gap-1.5 text-xs', barState.tone]}
					role="status"
				>
					<Icon icon={barState.icon} size="sm" />{barState.text}
				</span>
				<button
					type="button"
					class="border-lms-border-strong bg-lms-surface lms-focus-ring h-[42px] rounded-[10px] border px-4 text-sm font-semibold"
					disabled={isSaving}
					onclick={requestClose}
				>
					{t('panel.cancel')}
				</button>
				<button
					type="button"
					class="lms-action-primary lms-focus-ring flex h-[42px] items-center gap-2 rounded-[10px] px-[18px] text-sm font-bold"
					aria-busy={isSaving}
					disabled={isSaving}
					onclick={save}
				>
					<Icon icon={Check} size="sm" />{isSaving ? t('panel.saving') : t('panel.save')}
				</button>
			</div>
		</div>
	{/if}

	<Toast message={isOpen ? toast : null} />

	{#if confirmKind}
		<ConfirmDialog
			bind:open={isConfirmOpen}
			icon={confirmContent.icon}
			title={confirmContent.title}
			message={confirmContent.message}
			details={confirmContent.details}
			confirmLabel={confirmContent.label}
			confirmIcon={Check}
			busyLabel={t('confirm.busy')}
			cancelLabel={confirmContent.cancel}
			keyHint={t('confirm.key_hint')}
			onconfirm={handleConfirm}
		/>
	{/if}
</dialog>

<form
	method="POST"
	action="?/{isNew ? 'create' : 'update'}"
	use:enhance={submitSave}
	bind:this={saveForm}
	hidden
></form>
<form
	method="POST"
	action="?/delete"
	use:enhance={submitDelete}
	bind:this={deleteForm}
	hidden
></form>
