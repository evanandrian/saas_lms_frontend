<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Check from '@lucide/svelte/icons/check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Download from '@lucide/svelte/icons/download';
	import FileCheck from '@lucide/svelte/icons/file-check';
	import FileDown from '@lucide/svelte/icons/file-down';
	import History from '@lucide/svelte/icons/history';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import UserRound from '@lucide/svelte/icons/user-round';
	import type { AccountPageState } from '../account.state.svelte';
	import { daysLeft, hoursLeft, isDecided, readDocument } from '../account.requests';
	import RequestUpload from './RequestUpload.svelte';
	import {
		DEFAULT_EXPORT_SELECTION,
		EXPORT_FORMATS,
		PHONE_VISIBILITIES,
		type ExportCategory,
		type ExportFormat
	} from '../account.model';
	import Switch from './Switch.svelte';
	import { card, cardTitle, fieldLabel, segment, segmented } from './styles';

	interface Props {
		page: AccountPageState;
		exportUrl: (id: string) => string;
		errorText: (code: string) => string;
	}

	let { page, exportUrl, errorText }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`account.privacy.${key}`, params);

	const CATEGORY_ICON = {
		profile: UserRound,
		logins: History,
		activity: BookOpen,
		messages: MessageSquare
	} as const;

	const privacy = $derived(page.overview.privacy);
	const approver = $derived(i18n.t(`account.approver.${page.overview.context.approver}`));
	let privacyBusy = $state(false);
	let selection = $state<ExportCategory[]>(
		DEFAULT_EXPORT_SELECTION.filter((c) => page.overview.export.categories.includes(c))
	);
	let format = $state<ExportFormat>('json');
	let preparing = $state(false);
	let deletionBusy = $state(false);

	/** Berkas siap bila salinan terakhir sama dengan pilihan saat ini (pilihan berubah → minta ulang). */
	const ready = $derived.by(() => {
		const latest = page.overview.export.latest;
		if (!latest || latest.format !== format) return null;
		const same =
			latest.categories.length === selection.length &&
			latest.categories.every((c) => selection.includes(c));
		return same ? latest : null;
	});

	async function savePrivacy(patch: Partial<typeof privacy>) {
		if (privacyBusy) return;
		privacyBusy = true;
		const outcome = await page.run('privacy', { ...privacy, ...patch });
		privacyBusy = false;
		page.say(outcome.ok ? t('saved') : errorText(outcome.code), outcome.ok ? undefined : CircleX);
	}

	function toggleCategory(c: ExportCategory) {
		selection = selection.includes(c) ? selection.filter((x) => x !== c) : [...selection, c];
	}

	async function prepare() {
		if (!selection.length || preparing) return;
		preparing = true;
		const outcome = await page.run('exportCreate', { categories: selection, format });
		preparing = false;
		if (!outcome.ok) page.say(errorText(outcome.code), CircleX);
	}

	const deletionRequest = $derived(page.overview.deletion_request);
	/** Kartu penghapusan akun mengikuti status pengajuan di Kotak Persetujuan (referensi v2). */
	type DeletionCard = { key: string; params: Record<string, string | number>; danger: boolean };
	const deletionCard = $derived.by((): DeletionCard => {
		const r = deletionRequest;
		if (!r) return { key: 'none', params: { approver }, danger: true };
		if (r.status === 'need_docs') {
			return {
				key: 'need_docs',
				params: {
					docs: r.docs_requested.join(', '),
					note: r.docs_note ? ` · "${r.docs_note}"` : ''
				},
				danger: false
			};
		}
		if (r.status === 'approved') {
			const days = r.effective_at
				? Math.max(0, daysLeft(hoursLeft({ due_at: r.effective_at }, page.now)))
				: 0;
			return { key: 'approved', params: { who: r.decided_by, days }, danger: false };
		}
		if (r.status === 'declined')
			return { key: 'declined', params: { reason: r.decision_note || '-' }, danger: false };
		return { key: 'pending', params: { approver }, danger: false };
	});

	async function deletion() {
		const r = deletionRequest;
		if (!r) {
			page.confirm = 'delete';
			return;
		}
		if (deletionBusy) return;
		deletionBusy = true;
		const decided = isDecided(r);
		const outcome = await page.run(decided ? 'requestDismiss' : 'requestCancel', { id: r.id });
		deletionBusy = false;
		if (!outcome.ok) page.say(errorText(outcome.code), CircleX);
		else if (!decided) page.say(t('deletion_cancelled'), Undo2);
	}

	async function uploadDeletionDocument(file: File) {
		const r = deletionRequest;
		if (!r) return;
		const read = await readDocument(file);
		if (!read.ok) {
			page.say(i18n.t(`account.requests.upload_${read.reason}`), CircleX);
			return;
		}
		deletionBusy = true;
		const outcome = await page.run('requestUpload', { id: r.id, file: read.file });
		deletionBusy = false;
		page.say(
			outcome.ok ? i18n.t('account.requests.uploaded') : errorText(outcome.code),
			outcome.ok ? FileCheck : CircleX
		);
	}
</script>

<section class="{card} gap-3.5">
	<h2 class={cardTitle}>{t('title')}</h2>
	<label class="flex max-w-105 flex-col gap-1.5">
		<span class={fieldLabel}>{t('phone_visibility')}</span>
		<select
			class="bg-lms-surface border-lms-border-strong lms-focus-ring h-[42px] rounded-[10px] border-[1.5px] px-2.5 text-sm"
			value={privacy.phone_visibility}
			disabled={privacyBusy}
			onchange={(e) =>
				savePrivacy({
					phone_visibility: e.currentTarget.value as (typeof PHONE_VISIBILITIES)[number]
				})}
		>
			{#each PHONE_VISIBILITIES as v (v)}
				<option value={v}>{t(`visibility.${v}`)}</option>
			{/each}
		</select>
	</label>
	{#each ['show_photo', 'show_online'] as const as key (key)}
		<button
			type="button"
			role="switch"
			aria-checked={privacy[key]}
			class="lms-focus-ring flex items-center gap-3 text-start"
			disabled={privacyBusy}
			onclick={() => savePrivacy({ [key]: !privacy[key] })}
		>
			<Switch on={privacy[key]} />
			<span class="flex flex-col gap-0.5">
				<span class="text-sm font-semibold">{t(`${key}.label`)}</span>
				<span class="text-lms-muted text-xs">{t(`${key}.sub`)}</span>
			</span>
		</button>
	{/each}
</section>

<section class="{card} gap-3.5">
	<h2 class={cardTitle}>{t('export_title')}</h2>
	<span class="text-lms-muted text-[13px]">{t('export_sub')}</span>
	<div class="flex flex-wrap gap-2">
		{#each page.overview.export.categories as c (c)}
			{@const on = selection.includes(c)}
			<button
				type="button"
				aria-pressed={on}
				class="lms-focus-ring flex h-[34px] items-center gap-1.5 rounded-full border-[1.5px] px-3 text-[13px] font-semibold {on
					? 'border-lms-interactive bg-lms-interactive-subtle'
					: 'border-lms-border-strong bg-lms-surface'}"
				onclick={() => toggleCategory(c)}
				><Icon icon={on ? Check : CATEGORY_ICON[c]} size="sm" />{t(`category.${c}`)}</button
			>
		{/each}
	</div>
	<div class="flex flex-wrap items-center gap-3">
		<div class={segmented} role="radiogroup" aria-label={t('format')}>
			{#each EXPORT_FORMATS as f (f)}
				<button
					type="button"
					role="radio"
					aria-checked={format === f}
					class="{segment(format === f)} h-[34px] w-16 font-bold"
					onclick={() => (format = f)}>{f.toUpperCase()}</button
				>
			{/each}
		</div>
		{#if preparing}
			<span
				class="bg-lms-surface-muted text-lms-muted flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-bold"
				><span class="animate-spin"><Icon icon={LoaderCircle} size="sm" /></span>{t(
					'preparing'
				)}</span
			>
			<span class="text-lms-muted text-xs">{t('preparing_note')}</span>
		{:else if ready}
			<!-- Berkas lampiran dari proxy server (Content-Disposition: attachment); halaman tidak berpindah. -->
			<button
				type="button"
				class="lms-focus-ring lms-tone-success flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-bold"
				onclick={() => window.location.assign(exportUrl(ready.id))}
				><Icon icon={Download} size="sm" />{t('download')}</button
			>
			<span class="text-lms-success-text text-xs">{t('ready_note')}</span>
		{:else}
			<button
				type="button"
				class="lms-focus-ring flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-bold {selection.length
					? 'bg-lms-interactive text-lms-on-interactive'
					: 'bg-lms-surface-muted text-lms-muted cursor-not-allowed'}"
				onclick={prepare}><Icon icon={FileDown} size="sm" />{t('request')}</button
			>
			<span class="text-xs {selection.length ? 'text-lms-muted' : 'text-lms-danger-text'}"
				>{selection.length ? t('selected', { count: selection.length }) : t('select_one')}</span
			>
		{/if}
	</div>
</section>

<section
	class="bg-lms-surface border-lms-danger-subtle flex flex-wrap items-center gap-4 rounded-xl border p-5"
>
	<span class="flex flex-[1_1_260px] flex-col gap-1">
		<h2 class={cardTitle}>{t(`deletion.${deletionCard.key}.title`)}</h2>
		<span class="text-lms-muted text-[13px] leading-5"
			>{t(`deletion.${deletionCard.key}.text`, deletionCard.params)}</span
		>
	</span>
	{#if deletionRequest?.status === 'need_docs'}
		<RequestUpload
			label={i18n.t('account.requests.upload')}
			size="md"
			busy={deletionBusy}
			onfile={uploadDeletionDocument}
		/>
	{/if}
	<button
		type="button"
		class="lms-focus-ring h-[42px] rounded-[10px] border-[1.5px] bg-transparent px-4 text-sm font-bold {deletionCard.danger
			? 'border-lms-danger-text text-lms-danger-text'
			: 'border-lms-foreground text-lms-foreground'}"
		disabled={deletionBusy}
		onclick={deletion}>{t(`deletion.${deletionCard.key}.action`)}</button
	>
</section>
