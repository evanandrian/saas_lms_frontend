<script lang="ts">
	import { afterNavigate, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { LucideIcon } from '@lucide/svelte';
	import BellOff from '@lucide/svelte/icons/bell-off';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Download from '@lucide/svelte/icons/download';
	import FileCheck from '@lucide/svelte/icons/file-check';
	import FileDown from '@lucide/svelte/icons/file-down';
	import History from '@lucide/svelte/icons/history';
	import Lock from '@lucide/svelte/icons/lock';
	import LockOpen from '@lucide/svelte/icons/lock-open';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import School from '@lucide/svelte/icons/school';
	import Search from '@lucide/svelte/icons/search';
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
	import {
		AUDIT_ACTOR_ROLES,
		AUDIT_CATEGORIES,
		AUDIT_EXPORT_ERROR_PARAM,
		AUDIT_QUERY_MAX,
		PREFIX,
		auditExportErrorMessage,
		auditExportQuery,
		auditExportRangeValid,
		auditRoleLabel,
		inputClass,
		localIsoDate,
		type AuditActorRole,
		type AuditCategory
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { formatDateTime } from '$lib/utils/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

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
		'report.notify_failed': { icon: BellOff, tone: 'danger' },
		'academic_year.create': { icon: CalendarRange, tone: 'success' },
		'academic_year.update': { icon: CalendarRange, tone: 'info' },
		'academic_year.delete': { icon: Trash2, tone: 'danger' },
		'class.create': { icon: School, tone: 'success' },
		'class.update': { icon: School, tone: 'info' },
		'class.delete': { icon: Trash2, tone: 'danger' },
		'attendance.remind': { icon: BellRing, tone: 'info' },
		'report.remind': { icon: BellRing, tone: 'info' },
		'export.audit_log': { icon: FileDown, tone: 'warning' }
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
	const SEARCH_DEBOUNCE_MS = 300;

	// svelte-ignore state_referenced_locally
	let items = $state<SchoolAuditEntry[]>(data.view?.items ?? []);
	// svelte-ignore state_referenced_locally
	let nextBefore = $state(data.view?.next_before ?? '');
	let category = $state<AuditCategory | 'all'>('all');
	let from = $state('');
	let to = $state('');
	let q = $state('');
	let actorRole = $state<AuditActorRole | ''>('');
	let loadingMore = $state(false);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	/** Nomor permintaan daftar terakhir; respons usang (filter berganti cepat) diabaikan. */
	let listSeq = 0;
	const editor = createRecordEditor<SchoolAuditView>(i18n.t, () => {});
	$effect(() => () => clearTimeout(searchTimer));

	const rangeError = $derived(from && to && from > to ? t('audit.range_invalid') : '');
	const filter = $derived({
		category: category === 'all' ? ('' as const) : category,
		from,
		to,
		q,
		actorRole
	});
	const filtered = $derived(
		category !== 'all' || Boolean(from) || Boolean(to) || Boolean(q.trim()) || Boolean(actorRole)
	);
	const exportHref = $derived(
		`${resolve(APP_PATHS.SCHOOL_ADMIN_AUDIT_EXPORT)}?${auditExportQuery(filter)}`
	);

	// PF7(b): proxy ekspor mengembalikan galat backend sebagai `?export_error=<kode>` → Toast, lalu query dibersihkan.
	afterNavigate(() => {
		const code = page.url.searchParams.get(AUDIT_EXPORT_ERROR_PARAM);
		if (!code) return;
		editor.notify(auditExportErrorMessage(i18n.t, code), true);
		const url = new URL(page.url);
		url.searchParams.delete(AUDIT_EXPORT_ERROR_PARAM);
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- path halaman yang sama, hanya query galat
		replaceState(url, {});
	});

	const roleLabel = (role: string) => auditRoleLabel(i18n.t, role);
	const atLabel = (iso: string) =>
		formatDateTime(iso, i18n.locale, {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});

	function onSearch() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => void reload(), SEARCH_DEBOUNCE_MS);
	}

	/** PF7(a): rentang ekspor > 90 hari ditolak sebelum unduhan dimulai. */
	function onExport(event: MouseEvent) {
		if (auditExportRangeValid(from, to, localIsoDate())) return;
		event.preventDefault();
		editor.notify(t('errors.audit_export_range_invalid'), true);
	}

	const styleOf = (action: string) =>
		ACTION_STYLE[action] ??
		(action.startsWith('planning.')
			? { icon: ClipboardList, tone: 'info' as Tone }
			: FALLBACK_STYLE);

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
		if (ACTION_STYLE[entry.action] || entry.action.startsWith('planning.')) {
			const key = `audit.action.${entry.action}`;
			const text = t(key, params);
			// Entitas planning baru tanpa terjemahan → kalimat umum, bukan kunci mentah.
			if (text !== `${PREFIX}.${key}`) return text;
		}
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
		return { ...filter, before };
	}

	async function reload() {
		clearTimeout(searchTimer);
		if (rangeError) return;
		const seq = ++listSeq;
		const view = await editor.run<SchoolAuditView>('list', filterBody());
		if (!view || seq !== listSeq) return;
		items = view.items;
		nextBefore = view.next_before;
	}

	async function loadMore() {
		if (!nextBefore || loadingMore) return;
		loadingMore = true;
		const seq = listSeq;
		const view = await editor.run<SchoolAuditView>('list', filterBody(nextBefore));
		loadingMore = false;
		if (!view || seq !== listSeq) return;
		items = [...items, ...view.items];
		nextBefore = view.next_before;
	}

	function resetFilters() {
		category = 'all';
		from = '';
		to = '';
		q = '';
		actorRole = '';
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
				items={[
					{ key: 'all', label: t('audit.category.all') },
					...AUDIT_CATEGORIES.map((key) => ({ key, label: t(`audit.category.${key}`) }))
				]}
				onchange={(key) => {
					category = key as AuditCategory | 'all';
					void reload();
				}}
			/>
			<div class="flex flex-wrap items-end gap-3">
				<label class="flex flex-[2_1_220px] flex-col gap-1.5">
					<span class="text-[13px] font-semibold">{t('audit.search')}</span>
					<span class="relative flex items-center">
						<span class="text-lms-muted pointer-events-none absolute left-3"
							><Icon icon={Search} size="sm" /></span
						>
						<input
							type="search"
							class="{inputClass('')} pl-9"
							maxlength={AUDIT_QUERY_MAX}
							placeholder={t('audit.search_placeholder')}
							bind:value={q}
							oninput={onSearch}
						/>
					</span>
				</label>
				<label class="flex flex-[1_1_160px] flex-col gap-1.5">
					<span class="text-[13px] font-semibold">{t('audit.role_label')}</span>
					<select class={inputClass('')} bind:value={actorRole} onchange={reload}>
						<option value="">{t('audit.role_all')}</option>
						{#each AUDIT_ACTOR_ROLES as role (role)}
							<option value={role}>{t(`audit.role.${role}`)}</option>
						{/each}
					</select>
				</label>
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
				<!-- eslint-disable svelte/no-navigation-without-resolve -- path ekspor sudah lewat resolve(); hanya query filter -->
				<a
					href={exportHref}
					data-sveltekit-reload
					aria-disabled={Boolean(rangeError)}
					onclick={onExport}
					class="lms-action-secondary lms-focus-ring inline-flex h-[42px] items-center gap-2 rounded-[10px] px-3 text-[13px] font-semibold aria-disabled:pointer-events-none aria-disabled:opacity-50"
					><Icon icon={Download} size="sm" />{t('audit.export')}</a
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
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
			<div class="flex flex-col gap-4">
				<div class="lms-card overflow-x-auto rounded-xl" aria-busy={editor.busy}>
					<table class="w-full min-w-[820px] text-[13px]">
						<thead>
							<tr
								class="border-lms-border text-lms-muted border-b text-left font-mono text-[10px] tracking-[0.1em]"
							>
								<th class="px-4 py-2.5">{t('audit.head_time')}</th>
								<th class="px-4 py-2.5">{t('audit.head_actor')}</th>
								<th class="px-4 py-2.5">{t('audit.head_role')}</th>
								<th class="px-4 py-2.5">{t('audit.head_action')}</th>
							</tr>
						</thead>
						<tbody>
							{#each items as entry (entry.id)}
								{@const style = styleOf(entry.action)}
								<tr class="border-lms-border border-b align-top last:border-b-0">
									<td class="text-lms-muted px-4 py-3 whitespace-nowrap tabular-nums"
										>{atLabel(entry.at)}</td
									>
									<td class="px-4 py-3 font-semibold">{entry.actor_name || t('audit.system')}</td>
									<td class="px-4 py-3">{roleLabel(entry.actor_role)}</td>
									<td class="px-4 py-3">
										<div class="flex items-start gap-2.5">
											<span
												class="flex size-7 shrink-0 items-center justify-center rounded-full {TONE_CLASS[
													style.tone
												]}"><Icon icon={style.icon} size="sm" /></span
											>
											<div class="flex min-w-0 flex-col gap-1">
												<span class="font-semibold break-words">{sentence(entry)}</span>
												{#if detail(entry, 'reason')}
													<span class="text-lms-muted break-words"
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
											</div>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

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
