<script lang="ts">
	import Archive from '@lucide/svelte/icons/archive';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import {
		ARCHIVE_REASON_MAX,
		BODY_MAX,
		GENERAL_AUDIENCES,
		PREFIX,
		STATUS_TABS,
		TITLE_MAX,
		announcementBody,
		announcementErrors,
		appendUnique,
		archiveReasonError,
		audienceFromKey,
		audienceKey,
		audienceText,
		cleanLine,
		cleanMultiline,
		emptyForm,
		formOf,
		formatAnnouncementTime,
		statusActions,
		type AnnouncementAction,
		type AnnouncementForm,
		type StatusTab
	} from '$lib/features/announcements/announcements.model';
	import type {
		SchoolAnnouncement,
		SchoolAnnouncementsView
	} from '$lib/features/announcements/announcements.types';
	import FieldBox from '$lib/features/school-admin/components/FieldBox.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		charCount,
		inputClass,
		inputMaxLength,
		PREFIX as SCHOOL_PREFIX
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);
	const STATUS_TONE: Record<string, string> = {
		draft: 'bg-lms-surface-muted text-lms-foreground',
		pending: 'lms-tone-warning',
		published: 'lms-tone-success',
		rejected: 'lms-tone-danger',
		archived: 'bg-lms-surface-muted text-lms-muted'
	};
	/** 409/404: data di layar basi → muat ulang tab aktif. */
	const RELOAD_CODES = new Set(['announcement_invalid_transition', 'announcement_not_found']);

	let view = $state<SchoolAnnouncementsView | null>(untrack(() => data.view));
	let tab = $state<StatusTab>('all');
	let form = $state<AnnouncementForm>(emptyForm());
	let confirm = $state<{ kind: 'delete' | 'archive'; item: SchoolAnnouncement } | null>(null);
	let archiveReason = $state('');
	let archiveTouched = $state(false);
	let loadingMore = $state(false);
	/** Ganti tab/muat ulang sedang berjalan (muat-lebih-banyak dinonaktifkan). */
	let switching = $state(false);
	/** Nomor permintaan daftar terakhir: respons permintaan lama (tab/urutan basi) dibuang. */
	let listRequest = 0;
	/** Pengumuman yang sedang diubah/diperbaiki (null = pengumuman baru). */
	let editing = $state<SchoolAnnouncement | null>(null);
	const editor = createRecordEditor<SchoolAnnouncementsView>(i18n.t, (v) => (view = v));

	const archiveError = $derived(archiveReasonError(archiveReason, i18n.t));
	const items = $derived(view?.items ?? []);
	const stats = $derived([
		{ label: t('admin.stat_pending'), value: view?.counts.pending ?? 0 },
		{ label: t('admin.stat_published'), value: view?.counts.published ?? 0 },
		{ label: t('admin.stat_draft'), value: view?.counts.draft ?? 0 }
	]);

	async function reload(nextTab: StatusTab = tab) {
		const request = ++listRequest;
		switching = true;
		const out = await editor.run<SchoolAnnouncementsView>('list', {
			status: nextTab === 'all' ? '' : nextTab
		});
		if (request !== listRequest) return; // sudah ada klik tab/muat ulang yang lebih baru
		switching = false;
		if (!out) return;
		tab = nextTab;
		view = out;
	}

	async function loadMore() {
		if (!view?.next_cursor || switching) return;
		const request = listRequest;
		const forTab = tab;
		loadingMore = true;
		const out = await editor.run<SchoolAnnouncementsView>('list', {
			status: forTab === 'all' ? '' : forTab,
			cursor: view.next_cursor
		});
		loadingMore = false;
		// Tab berganti/daftar dimuat ulang selama memuat: halaman lanjutan milik daftar lama → buang.
		if (!out || !view || request !== listRequest || forTab !== tab) return;
		view = { ...out, items: appendUnique(view.items, out.items) };
	}

	function resetForm() {
		form = emptyForm();
		editing = null;
		editor.show(null);
		editor.close();
	}

	function startEdit(item: SchoolAnnouncement) {
		form = formOf(item);
		editing = item;
		editor.show(item.id);
	}

	/**
	 * Gagal: galat field dari editor.run; 409/404 → daftar dimuat ulang dan formulir ditutup bila
	 * pengumuman yang gagal (`id`) sedang diubah (statusnya sudah berubah, simpan berikutnya pasti 409).
	 */
	async function afterFailure(id: string | null) {
		if (!RELOAD_CODES.has(editor.lastCode)) return;
		await reload();
		if (id && editor.editId === id) resetForm();
	}

	async function save(submit: boolean) {
		const errors = announcementErrors(form, i18n.t);
		editor.setErrors(errors);
		if (Object.keys(errors).length) return;
		const saved = await editor.run<SchoolAnnouncement>('save', {
			id: editor.editId ?? '',
			data: announcementBody(form)
		});
		if (!saved) return afterFailure(editor.editId);
		// Simpan berikutnya = ubah draf ini (tanpa duplikat bila pengajuan gagal).
		editing = saved;
		editor.show(saved.id);
		if (submit && !(await editor.run<SchoolAnnouncement>('submit', { id: saved.id }))) {
			const stale = RELOAD_CODES.has(editor.lastCode);
			await reload();
			if (stale) resetForm();
			return;
		}
		resetForm();
		await reload();
		editor.notify(t(submit ? 'admin.toast.submitted' : 'admin.toast.saved'));
	}

	async function act(action: AnnouncementAction, item: SchoolAnnouncement) {
		if (action === 'edit' || action === 'fix') return startEdit(item);
		if (action === 'delete' || action === 'archive') {
			archiveReason = '';
			archiveTouched = false;
			confirm = { kind: action, item };
			return;
		}
		const out = await editor.run<SchoolAnnouncement>(action, { id: item.id });
		if (!out) return afterFailure(item.id);
		// Diajukan/ditarik dari kartunya saat sedang diubah: formulir lama basi → tutup.
		if (editor.editId === item.id) resetForm();
		await reload();
		editor.notify(t(action === 'submit' ? 'admin.toast.submitted' : 'admin.toast.withdrawn'));
	}

	async function confirmAction() {
		if (!confirm) return;
		const { kind, item } = confirm;
		const ok =
			kind === 'delete'
				? await editor.run('remove', { id: item.id })
				: await editor.run('archive', { id: item.id, reason: cleanLine(archiveReason) });
		confirm = null;
		if (ok === null) return afterFailure(item.id);
		if (editor.editId === item.id) resetForm();
		await reload();
		editor.notify(t(kind === 'delete' ? 'admin.toast.deleted' : 'admin.toast.archived'));
	}

	const tabCount = (key: StatusTab) => view?.counts[key] ?? 0;
	const counter = (n: number, max: number) => t('admin.counter', { n, max });
</script>

<svelte:head><title>{t('admin.title')} · FLIXARE</title></svelte:head>

{#if !view || !data.options}
	<StatePanel
		tone="error"
		title={i18n.t(`${SCHOOL_PREFIX}.common.load_failed`)}
		description={i18n.t(`${SCHOOL_PREFIX}.failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('admin.eyebrow')}
		title={t('admin.title')}
		description={t('admin.desc')}
		{stats}
		help="help.school_admin_announcements"
	>
		<div class="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
			<section class="flex min-w-0 flex-col gap-3">
				<div
					class="bg-lms-surface-muted flex flex-wrap gap-0.5 rounded-[10px] p-[3px]"
					role="tablist"
				>
					{#each STATUS_TABS as key (key)}
						<button
							type="button"
							role="tab"
							aria-selected={tab === key}
							class="lms-focus-ring h-[34px] rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap {tab ===
							key
								? 'bg-lms-surface text-lms-foreground shadow-sm'
								: 'text-lms-muted'}"
							onclick={() => reload(key)}
							>{t('admin.tab', { label: t(`status.${key}`), n: tabCount(key) })}</button
						>
					{/each}
				</div>
				{#each items as item (item.id)}
					<article
						class="border-lms-border bg-lms-surface flex flex-col gap-2 rounded-xl border p-4 text-[13px]"
					>
						<div class="flex items-start gap-2">
							<h2 class="flex-1 text-sm font-bold [overflow-wrap:anywhere]">{item.title}</h2>
							<span
								class="rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide {STATUS_TONE[
									item.status
								]}">{t(`status.${item.status}`)}</span
							>
						</div>
						<p class="line-clamp-3 leading-5 whitespace-pre-line [overflow-wrap:anywhere]">
							{item.body}
						</p>
						<span class="text-lms-muted text-xs"
							>{t('admin.meta', {
								audience: audienceText(i18n.t, item),
								time: formatAnnouncementTime(item.created_at),
								author: item.author_name || '—'
							})}</span
						>
						{#if item.published_at}
							<span class="text-lms-muted text-xs"
								>{t('admin.published_meta', {
									time: formatAnnouncementTime(item.published_at),
									reviewer: item.reviewer_name || '—'
								})}</span
							>
						{/if}
						{#if item.review_reason && (item.status === 'rejected' || item.status === 'draft')}
							<div class="lms-tone-danger flex flex-col gap-0.5 rounded-lg px-3 py-2 text-xs">
								<span class="font-bold">{t('admin.review_note')}</span>
								<span class="whitespace-pre-line"
									>{t(`reject_reason.${item.review_reason}`)}{item.review_note
										? ` — ${item.review_note}`
										: ''}</span
								>
							</div>
						{/if}
						{#if item.status === 'archived' && item.archive_reason}
							<div class="bg-lms-surface-muted flex flex-col gap-0.5 rounded-lg px-3 py-2 text-xs">
								<span class="font-bold">{t('admin.archive_reason')}</span>
								<span>{item.archive_reason}</span>
							</div>
						{/if}
						{#if statusActions(item.status).length}
							<div class="flex flex-wrap gap-2 pt-1">
								{#each statusActions(item.status) as action (action)}
									<button
										type="button"
										disabled={editor.busy}
										class="lms-focus-ring h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-60 {action ===
											'delete' || action === 'archive'
											? 'text-lms-danger-text border-lms-border border'
											: 'lms-action-secondary'}"
										onclick={() => act(action, item)}>{t(`admin.action.${action}`)}</button
									>
								{/each}
							</div>
						{/if}
					</article>
				{:else}
					<StatePanel title={tab === 'all' ? t('empty') : t('admin.empty_tab')} />
				{/each}
				{#if view.next_cursor}
					<button
						type="button"
						disabled={loadingMore || switching}
						class="lms-action-secondary lms-focus-ring h-10 self-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-60"
						onclick={loadMore}>{loadingMore ? t('loading') : t('load_more')}</button
					>
				{/if}
			</section>

			<section
				class="bg-lms-surface border-lms-border flex flex-col gap-3.5 rounded-xl border p-5 min-[1100px]:sticky min-[1100px]:top-4"
				aria-labelledby="ann-form-title"
			>
				<h2 id="ann-form-title" class="text-base font-bold">
					{editing
						? t(editing.status === 'rejected' ? 'admin.form_fix' : 'admin.form_edit')
						: t('admin.form_new')}
				</h2>
				<FieldBox
					label={t('admin.field_title')}
					for="ann-title"
					required
					error={editor.errors.title}
					note={counter(charCount(cleanLine(form.title)), TITLE_MAX)}
				>
					<input
						id="ann-title"
						maxlength={inputMaxLength(TITLE_MAX)}
						aria-invalid={!!editor.errors.title}
						class={inputClass(editor.errors.title)}
						bind:value={form.title}
						oninput={() => editor.clearError('title')}
					/>
				</FieldBox>
				<FieldBox
					label={t('admin.field_body')}
					for="ann-body"
					required
					error={editor.errors.body}
					note={counter(charCount(cleanMultiline(form.body)), BODY_MAX)}
				>
					<textarea
						id="ann-body"
						rows="7"
						maxlength={inputMaxLength(BODY_MAX)}
						aria-invalid={!!editor.errors.body}
						class="{inputClass(editor.errors.body)} h-auto! resize-y py-2.5"
						bind:value={form.body}
						oninput={() => editor.clearError('body')}></textarea>
				</FieldBox>
				<FieldBox
					label={t('admin.field_audience')}
					for="ann-audience"
					required
					error={editor.errors.audience ?? editor.errors.grade_level_id ?? editor.errors.class_id}
				>
					<select
						id="ann-audience"
						aria-invalid={!!(
							editor.errors.audience ??
							editor.errors.grade_level_id ??
							editor.errors.class_id
						)}
						class={inputClass(
							editor.errors.audience ?? editor.errors.grade_level_id ?? editor.errors.class_id
						)}
						value={audienceKey(form)}
						onchange={(e) => {
							form = { ...form, ...audienceFromKey(e.currentTarget.value) };
							for (const f of ['audience', 'grade_level_id', 'class_id']) editor.clearError(f);
						}}
					>
						<option value="">{t('admin.audience_placeholder')}</option>
						<optgroup label={t('admin.group_general')}>
							{#each GENERAL_AUDIENCES as a (a)}<option value={a}>{t(`audience.${a}`)}</option
								>{/each}
						</optgroup>
						{#if data.options.grades.length}
							<optgroup label={t('admin.group_grades')}>
								{#each data.options.grades as g (g.id)}
									<option value={`grade:${g.id}`}
										>{t('audience.guardian_grade_of', { label: g.label })}</option
									>
								{/each}
							</optgroup>
						{/if}
						{#if data.options.classes.length}
							<optgroup label={t('admin.group_classes')}>
								{#each data.options.classes as c (c.id)}
									<option value={`class:${c.id}`}
										>{t('audience.class_of', { label: c.label })}</option
									>
								{/each}
							</optgroup>
						{/if}
					</select>
				</FieldBox>
				<div class="flex flex-wrap gap-2 pt-1">
					<button
						type="button"
						disabled={editor.busy}
						class="lms-action-secondary lms-focus-ring h-10 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-60"
						onclick={() => save(false)}>{t('admin.save_draft')}</button
					>
					<button
						type="button"
						disabled={editor.busy}
						class="lms-action-primary lms-focus-ring h-10 rounded-[10px] px-4 text-[13px] font-bold disabled:opacity-60"
						onclick={() => save(true)}>{t('admin.submit')}</button
					>
					{#if editor.editId}
						<button
							type="button"
							class="lms-focus-ring text-lms-muted h-10 rounded-[10px] px-3 text-[13px] font-semibold"
							onclick={resetForm}>{t('admin.cancel_edit')}</button
						>
					{/if}
				</div>
			</section>
		</div>
	</ModuleShell>

	{#if confirm}
		<ConfirmDialog
			bind:open={
				() => confirm !== null,
				(open) => {
					if (!open) confirm = null;
				}
			}
			tone="danger"
			icon={confirm.kind === 'delete' ? Trash2 : Archive}
			title={t(confirm.kind === 'delete' ? 'admin.delete_title' : 'admin.archive_title', {
				title: confirm.item.title
			})}
			message={t(confirm.kind === 'delete' ? 'admin.delete_message' : 'admin.archive_message')}
			confirmLabel={t(confirm.kind === 'delete' ? 'admin.action.delete' : 'admin.action.archive')}
			busyLabel={confirm.kind === 'delete'
				? i18n.t(`${SCHOOL_PREFIX}.common.deleting`)
				: t('admin.archiving')}
			cancelLabel={i18n.t(`${SCHOOL_PREFIX}.common.cancel`)}
			onconfirm={confirmAction}
			confirmDisabled={confirm.kind === 'archive' && archiveError !== ''}
		>
			{#snippet options()}
				{#if confirm?.kind === 'archive'}
					<label class="flex flex-col gap-1.5 text-start">
						<span class="text-[13px] font-semibold">{t('admin.archive_reason_label')}</span>
						<input
							maxlength={inputMaxLength(ARCHIVE_REASON_MAX)}
							aria-invalid={!!archiveError}
							aria-describedby={archiveError ? 'ann-archive-reason-error' : undefined}
							class={inputClass(archiveTouched ? archiveError : '')}
							bind:value={archiveReason}
							oninput={() => (archiveTouched = true)}
						/>
						{#if archiveError}
							<span
								id="ann-archive-reason-error"
								class="text-lms-danger-text text-xs"
								role={archiveTouched ? 'alert' : undefined}>{archiveError}</span
							>
						{/if}
					</label>
				{/if}
			{/snippet}
		</ConfirmDialog>
	{/if}
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
