<script lang="ts">
	import { invalidate } from '$app/navigation';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import {
		failureMessage,
		fieldErrors,
		inputMaxLength
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { runPageAction } from '$lib/utils/page-action';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import {
		NOTE_MAX,
		PREFIX,
		REJECT_OTHER,
		REJECT_REASONS,
		approveNoteError,
		audienceText,
		formatAnnouncementTime,
		rejectErrors,
		type RejectReason
	} from '../announcements.model';
	import type { SchoolAnnouncement, SchoolAnnouncementPendingView } from '../announcements.types';

	interface Props {
		items: readonly SchoolAnnouncement[];
		/** Daftar menunggu terbaru setelah keputusan (atau setelah 409/404). */
		onchange: (items: SchoolAnnouncement[]) => void;
		notify: (message: string, error: boolean) => void;
	}

	let { items, onchange, notify }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.review.${key}`, params);
	/** Badge menu "Persetujuan" (layout admin) ikut diperbarui. */
	const APPROVALS_DEPENDENCY = 'app:approvals';
	const RELOAD_CODES = new Set(['announcement_invalid_transition', 'announcement_not_found']);

	let openId = $state<string | null>(null);
	let decision = $state<'approve' | 'reject'>('approve');
	let reason = $state<RejectReason | ''>('');
	let note = $state('');
	let errors = $state<Record<string, string>>({});
	let confirmOpen = $state(false);

	const opened = $derived(items.find((x) => x.id === openId) ?? null);

	function toggle(id: string) {
		openId = openId === id ? null : id;
		decision = 'approve';
		reason = '';
		note = '';
		errors = {};
	}

	function validate(): boolean {
		const noteError = approveNoteError(note, i18n.t);
		errors =
			decision === 'reject'
				? rejectErrors(reason, note, i18n.t)
				: noteError
					? { note: noteError }
					: {};
		return Object.keys(errors).length === 0;
	}

	async function refresh() {
		const out = await runPageAction<SchoolAnnouncementPendingView>('announcementsPending', {});
		if (out.ok) onchange(out.data.items);
		void invalidate(APPROVALS_DEPENDENCY);
	}

	async function decide() {
		const x = opened;
		if (!x) return;
		const out =
			decision === 'approve'
				? await runPageAction('announcementApprove', { id: x.id, note })
				: await runPageAction('announcementReject', { id: x.id, reasonCode: reason, note });
		confirmOpen = false;
		if (!out.ok) {
			errors = fieldErrors(i18n.t, out);
			notify(failureMessage(i18n.t, out), true);
			if (RELOAD_CODES.has(out.code)) await refresh();
			return;
		}
		notify(t(decision === 'approve' ? 'toast_approved' : 'toast_rejected'), false);
		openId = null;
		// Hapus segera: bila penyegaran gagal, pengumuman yang sudah diputuskan tidak tetap tampil.
		onchange(items.filter((item) => item.id !== x.id));
		await refresh();
	}
</script>

<section
	class="border-lms-border flex flex-col border-b"
	aria-label={t('section', { n: items.length })}
>
	<h3 class="bg-lms-background text-lms-muted px-4 py-2.5 font-mono text-[11px] tracking-[0.08em]">
		{t('section', { n: items.length })}
	</h3>
	{#each items as x (x.id)}
		{@const isOpen = openId === x.id}
		<div class="border-lms-border border-t px-4 py-3">
			<button
				type="button"
				class="lms-focus-ring flex w-full items-start gap-3 text-start"
				aria-expanded={isOpen}
				onclick={() => toggle(x.id)}
			>
				<span
					class="bg-lms-interactive text-lms-on-interactive flex size-8 flex-none items-center justify-center rounded-full"
					aria-hidden="true"><Icon icon={Megaphone} size="sm" /></span
				>
				<span class="flex min-w-0 flex-1 flex-col gap-0.5">
					<span class="text-sm font-bold [overflow-wrap:anywhere]">{x.title}</span>
					<span class="text-lms-muted text-xs"
						>{t('audience', { audience: audienceText(i18n.t, x) })} · {t('submitted', {
							time: x.submitted_at ? formatAnnouncementTime(x.submitted_at) : '—',
							author: x.author_name || '—'
						})}</span
					>
				</span>
				<span class="bg-lms-surface-muted rounded-full px-[9px] py-[3px] text-[11px] font-bold"
					>{t('kind')}</span
				>
				<span class="text-lms-muted"
					><Icon icon={isOpen ? ChevronUp : ChevronDown} size="sm" /></span
				>
			</button>
			{#if isOpen}
				<div class="flex flex-wrap items-start gap-5 pt-3 ps-11">
					<p
						class="min-w-0 flex-[1_1_320px] text-sm leading-[21px] whitespace-pre-line [overflow-wrap:anywhere]"
					>
						{x.body}
					</p>
					<div
						class="bg-lms-surface border-lms-border flex min-w-0 flex-[1_1_280px] flex-col gap-3 rounded-xl border p-4"
					>
						<div
							class="bg-lms-surface-muted grid grid-cols-2 gap-0.5 rounded-[10px] p-[3px]"
							role="radiogroup"
						>
							{#each ['approve', 'reject'] as const as d (d)}
								<button
									type="button"
									role="radio"
									aria-checked={decision === d}
									class="lms-focus-ring min-h-9 rounded-lg p-1 text-xs font-semibold {decision === d
										? 'bg-lms-surface text-lms-foreground shadow-sm'
										: 'text-lms-muted'}"
									onclick={() => {
										decision = d;
										errors = {};
									}}>{t(d)}</button
								>
							{/each}
						</div>
						{#if decision === 'reject'}
							<div class="flex flex-col gap-2" role="group" aria-label={t('reason_label')}>
								<span class="text-[13px] font-semibold">{t('reason_label')}</span>
								<div class="flex flex-wrap gap-1.5">
									{#each REJECT_REASONS as r (r)}
										<button
											type="button"
											aria-pressed={reason === r}
											class="lms-focus-ring h-8 rounded-full border-[1.5px] px-2.5 text-xs font-semibold {reason ===
											r
												? 'border-lms-danger-text bg-lms-danger-subtle'
												: 'border-lms-border-strong bg-lms-surface'}"
											onclick={() => {
												reason = r;
												errors = {};
											}}>{i18n.t(`${PREFIX}.reject_reason.${r}`)}</button
										>
									{/each}
								</div>
								{#if errors.reason_code}
									<span class="text-lms-danger-text text-xs" role="alert">{errors.reason_code}</span
									>
								{/if}
							</div>
						{/if}
						<label class="flex flex-col gap-1.5">
							<span class="text-[13px] font-semibold"
								>{t('note_label')}
								<span class="text-lms-muted font-normal"
									>{decision === 'reject' && reason === REJECT_OTHER
										? t('required')
										: t('optional')}</span
								></span
							>
							<textarea
								rows="3"
								maxlength={inputMaxLength(NOTE_MAX)}
								aria-invalid={!!errors.note}
								class="bg-lms-surface lms-focus-ring resize-y rounded-[10px] border-[1.5px] px-3 py-2.5 text-sm {errors.note
									? 'border-lms-danger-text'
									: 'border-lms-border-strong'}"
								bind:value={note}></textarea>
							{#if errors.note}
								<span class="text-lms-danger-text text-xs" role="alert">{errors.note}</span>
							{/if}
						</label>
						<button
							type="button"
							class="lms-focus-ring text-lms-on-interactive flex h-[42px] items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-bold {decision ===
							'reject'
								? 'bg-lms-danger-text'
								: 'bg-lms-success-text'}"
							onclick={() => {
								if (validate()) confirmOpen = true;
							}}
						>
							<Icon icon={decision === 'reject' ? CircleX : CircleCheck} size="sm" />{t(decision)}
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/each}
</section>

{#if opened}
	<ConfirmDialog
		bind:open={confirmOpen}
		tone={decision === 'reject' ? 'danger' : 'primary'}
		icon={decision === 'reject' ? CircleX : CircleCheck}
		title={t(decision === 'reject' ? 'confirm_reject_title' : 'confirm_approve_title', {
			title: opened.title
		})}
		message={t(decision === 'reject' ? 'confirm_reject_message' : 'confirm_approve_message')}
		confirmLabel={t(decision)}
		busyLabel={t('busy')}
		cancelLabel={t('cancel')}
		onconfirm={decide}
	/>
{/if}
