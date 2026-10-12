<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import BellOff from '@lucide/svelte/icons/bell-off';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import FileCheck from '@lucide/svelte/icons/file-check';
	import History from '@lucide/svelte/icons/history';
	import Lock from '@lucide/svelte/icons/lock';
	import LockOpen from '@lucide/svelte/icons/lock-open';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Send from '@lucide/svelte/icons/send';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Unlink from '@lucide/svelte/icons/unlink';
	import UserCheck from '@lucide/svelte/icons/user-check';
	import UserX from '@lucide/svelte/icons/user-x';
	import type {
		SchoolAuditEntry,
		SchoolAuditView
	} from '$lib/features/school-admin/school-admin.types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import TabBar from '$lib/features/school-admin/components/TabBar.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import { PREFIX, inputClass } from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { formatDateTime } from '$lib/utils/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

	const CATEGORIES = ['all', 'person', 'guardian', 'account', 'report'] as const;
	type Category = (typeof CATEGORIES)[number];
	type Tone = 'danger' | 'warning' | 'success' | 'info';

	/** Ikon & nada per aksi audit (backend `Audit*`); aksi tak dikenal → riwayat umum. */
	const ACTION_STYLE: Record<string, { icon: LucideIcon; tone: Tone }> = {
		'person.delete': { icon: Trash2, tone: 'danger' },
		'person.deactivate': { icon: UserX, tone: 'warning' },
		'person.reactivate': { icon: UserCheck, tone: 'success' },
		'guardian.unlink': { icon: Unlink, tone: 'warning' },
		'account.invite': { icon: Send, tone: 'info' },
		'report.grades_lock': { icon: Lock, tone: 'info' },
		'report.submit': { icon: FileCheck, tone: 'info' },
		'report.approve': { icon: CircleCheck, tone: 'success' },
		'report.return': { icon: Undo2, tone: 'warning' },
		'report.lock': { icon: Lock, tone: 'success' },
		'report.unlock': { icon: LockOpen, tone: 'warning' },
		'report.notify_failed': { icon: BellOff, tone: 'danger' }
	};
	const FALLBACK_STYLE = { icon: History, tone: 'info' as Tone };
	const TONE_CLASS: Record<Tone, string> = {
		danger: 'lms-tone-danger',
		warning: 'lms-tone-warning',
		success: 'lms-tone-success',
		info: 'lms-tone-info'
	};
	const ENTITIES = ['teacher', 'student', 'guardian', 'teachers', 'students', 'guardians', 'class'];
	/** Detail angka undangan yang ditampilkan sebagai chip (urutan tampil). */
	const INVITE_COUNTS = ['sent', 'linked', 'codes', 'skipped', 'failed'] as const;
	const MS_PER_DAY = 86_400_000;

	// svelte-ignore state_referenced_locally
	let items = $state<SchoolAuditEntry[]>(data.view?.items ?? []);
	// svelte-ignore state_referenced_locally
	let nextBefore = $state(data.view?.next_before ?? '');
	let category = $state<Category>('all');
	let from = $state('');
	let to = $state('');
	let loadingMore = $state(false);
	const editor = createRecordEditor<SchoolAuditView>(i18n.t, () => {});

	const rangeError = $derived(from && to && from > to ? t('audit.range_invalid') : '');
	const filtered = $derived(category !== 'all' || Boolean(from) || Boolean(to));

	type Group = { key: string; label: string; entries: SchoolAuditEntry[] };
	const groups = $derived.by(() => {
		const out: Group[] = [];
		for (const entry of items) {
			const key = dayKey(entry.at);
			const last = out.at(-1);
			if (last?.key === key) last.entries.push(entry);
			else out.push({ key, label: dayLabel(entry.at, key), entries: [entry] });
		}
		return out;
	});

	function dayKey(iso: string) {
		const d = new Date(iso);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function dayLabel(iso: string, key: string) {
		if (key === dayKey(new Date().toISOString())) return t('audit.today');
		if (key === dayKey(new Date(Date.now() - MS_PER_DAY).toISOString()))
			return t('audit.yesterday');
		return formatDateTime(iso, i18n.locale, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	const timeOf = (iso: string) =>
		formatDateTime(iso, i18n.locale, { hour: '2-digit', minute: '2-digit' });

	const detail = (entry: SchoolAuditEntry, key: string) => {
		const value = entry.details[key];
		return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
	};
	const count = (entry: SchoolAuditEntry, key: string) => Number(entry.details[key]) || 0;

	function entityLabel(type: string) {
		return ENTITIES.includes(type) ? t(`audit.entity.${type}`) : t('audit.entity.generic');
	}

	function sentence(entry: SchoolAuditEntry) {
		const params = {
			subject: entry.subject || '—',
			entity: entityLabel(entry.entity_type),
			student: detail(entry, 'student') || '—',
			subject_name: detail(entry, 'subject_name') || '—'
		};
		if (ACTION_STYLE[entry.action]) return t(`audit.action.${entry.action}`, params);
		return t('audit.action.generic', { ...params, action: entry.action });
	}

	/** Chip detail (NIS/NIP, jumlah undangan, alasan, versi) — hanya nilai yang ada. */
	function chips(entry: SchoolAuditEntry) {
		const out: { key: string; text: string; tone?: Tone }[] = [];
		for (const key of ['nip', 'nis', 'version', 'students'] as const) {
			const value = detail(entry, key);
			if (value) out.push({ key, text: t(`audit.detail.${key}`, { value }) });
		}
		if (entry.action === 'account.invite') {
			for (const key of INVITE_COUNTS) {
				const value = count(entry, key);
				if (value)
					out.push({
						key,
						text: t(`audit.detail.${key}`, { count: value }),
						tone: key === 'failed' ? 'danger' : undefined
					});
			}
		}
		return out;
	}

	function filterBody(before = '') {
		return { category: category === 'all' ? '' : category, from, to, before };
	}

	async function reload() {
		if (rangeError) return;
		const view = await editor.run<SchoolAuditView>('list', filterBody());
		if (!view) return;
		items = view.items;
		nextBefore = view.next_before;
	}

	async function loadMore() {
		if (!nextBefore || loadingMore) return;
		loadingMore = true;
		const view = await editor.run<SchoolAuditView>('list', filterBody(nextBefore));
		loadingMore = false;
		if (!view) return;
		items = [...items, ...view.items];
		nextBefore = view.next_before;
	}

	function resetFilters() {
		category = 'all';
		from = '';
		to = '';
		void reload();
	}
</script>

<svelte:head><title>{t('audit.title')} · FLIXARE</title></svelte:head>

{#if !data.view}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('audit.eyebrow')}
		title={t('audit.title')}
		description={t('audit.desc')}
		help="help.school_admin_audit"
	>
		<section class="lms-card flex flex-col gap-3 rounded-xl p-4" aria-label={t('common.filter')}>
			<TabBar
				label={t('audit.category_label')}
				value={category}
				items={CATEGORIES.map((key) => ({ key, label: t(`audit.category.${key}`) }))}
				onchange={(key) => {
					category = key as Category;
					void reload();
				}}
			/>
			<div class="flex flex-wrap items-end gap-3">
				<label class="flex flex-[1_1_150px] flex-col gap-1.5">
					<span class="text-[13px] font-semibold">{t('audit.from')}</span>
					<input
						type="date"
						class={inputClass(rangeError)}
						bind:value={from}
						max={to || undefined}
						aria-invalid={Boolean(rangeError)}
						onchange={reload}
					/>
				</label>
				<label class="flex flex-[1_1_150px] flex-col gap-1.5">
					<span class="text-[13px] font-semibold">{t('audit.to')}</span>
					<input
						type="date"
						class={inputClass(rangeError)}
						bind:value={to}
						min={from || undefined}
						aria-invalid={Boolean(rangeError)}
						onchange={reload}
					/>
				</label>
				{#if filtered}
					<button
						type="button"
						class="lms-action-ghost lms-focus-ring inline-flex h-[42px] items-center gap-2 rounded-[10px] px-3 text-[13px] font-semibold"
						disabled={editor.busy}
						onclick={resetFilters}><Icon icon={RotateCcw} size="sm" />{t('audit.reset')}</button
					>
				{/if}
			</div>
			{#if rangeError}
				<span role="alert" class="text-lms-danger-text text-xs">{rangeError}</span>
			{/if}
		</section>

		{#if !items.length}
			<StatePanel
				title={filtered ? t('audit.empty_filtered_title') : t('audit.empty_title')}
				description={filtered ? t('audit.empty_filtered_desc') : t('audit.empty_desc')}
				loading={editor.busy}
			/>
		{:else}
			<div class="flex flex-col gap-4" aria-busy={editor.busy}>
				{#each groups as group (group.key)}
					<section class="flex flex-col gap-2" aria-label={group.label}>
						<h2 class="text-lms-muted px-1 text-xs font-semibold tracking-[0.06em] uppercase">
							{group.label}
						</h2>
						<ol class="lms-card flex flex-col rounded-xl">
							{#each group.entries as entry (entry.id)}
								{@const style = ACTION_STYLE[entry.action] ?? FALLBACK_STYLE}
								<li class="border-lms-border flex items-start gap-3 px-4 py-3 not-first:border-t">
									<span
										class="flex size-9 shrink-0 items-center justify-center rounded-full {TONE_CLASS[
											style.tone
										]}"><Icon icon={style.icon} size="sm" /></span
									>
									<div class="flex min-w-0 flex-1 flex-col gap-1">
										<span class="text-sm font-semibold break-words">{sentence(entry)}</span>
										{#if detail(entry, 'reason')}
											<span class="text-lms-muted text-[13px] break-words"
												>{t('audit.detail.reason', { value: detail(entry, 'reason') })}</span
											>
										{/if}
										{#if chips(entry).length}
											<div class="flex flex-wrap gap-1.5">
												{#each chips(entry) as chip (chip.key)}
													<span
														class="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums {chip.tone
															? TONE_CLASS[chip.tone]
															: 'bg-lms-surface-muted text-lms-muted'}">{chip.text}</span
													>
												{/each}
											</div>
										{/if}
										<span class="text-lms-muted text-xs"
											>{t('audit.by', {
												actor: entry.actor_name || t('audit.system'),
												time: timeOf(entry.at)
											})}</span
										>
									</div>
								</li>
							{/each}
						</ol>
					</section>
				{/each}

				{#if nextBefore}
					<button
						type="button"
						class="lms-action-secondary lms-focus-ring h-10 self-center rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-50"
						disabled={loadingMore || editor.busy}
						onclick={loadMore}>{loadingMore ? t('audit.loading') : t('audit.load_more')}</button
					>
				{:else}
					<p class="text-lms-muted text-center text-xs">{t('audit.end')}</p>
				{/if}
			</div>
		{/if}
	</ModuleShell>
{/if}

<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
