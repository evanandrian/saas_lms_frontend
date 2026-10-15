<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import {
		PREFIX,
		REMIND_MESSAGE_MAX,
		defaultRecipientPick,
		remindBody,
		selectedRecipientIds
	} from '$lib/features/school-admin/school-admin.model';
	import type { SchoolReportPendingView } from '$lib/features/school-admin/school-admin.types';
	import { useI18n } from '$lib/i18n';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import Mail from '@lucide/svelte/icons/mail';

	interface Props {
		open: boolean;
		className: string;
		pending: SchoolReportPendingView | null;
		busy: boolean;
		onsend: (body: { message?: string; recipient_ids?: string[] }) => void;
	}

	let { open = $bindable(false), className, pending, busy, onsend }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.reports.remind_dialog.${key}`, params);

	let message = $state('');
	// Checkbox UI bersama hanya mendukung `bind:checked` → pilihan disimpan per teacher_id.
	// Terisi lewat $effect setelah render pertama, jadi binding memakai fallback `?? false`.
	let picked = $state<Record<string, boolean>>({});
	const selected = $derived(selectedRecipientIds(pending?.recipients ?? [], picked));

	// Dibuka untuk kelas lain / data pending baru tiba → pilihan awal = semua penerima ber-email.
	$effect(() => {
		if (open) {
			picked = defaultRecipientPick(pending?.recipients ?? []);
			message = '';
		}
	});
</script>

<Drawer
	bind:open
	label={t('title', { class: className })}
	closeLabel={i18n.t(`${PREFIX}.reports.remind_dialog.close`)}
>
	<div class="flex flex-col gap-4 p-2">
		<h2 class="text-base font-bold">{t('title', { class: className })}</h2>
		{#if !pending}
			<StatePanel loading title={t('loading')} />
		{:else}
			<section class="flex flex-col gap-2">
				<h3 class="text-sm font-bold">{t('pending_title', { count: pending.items.length })}</h3>
				{#if pending.items.length}
					<ul class="border-lms-border flex flex-col rounded-xl border">
						{#each pending.items as it (it.subject_id)}
							<li
								class="border-lms-border flex justify-between gap-3 px-4 py-2.5 text-[13px] not-first:border-t"
							>
								<span class="font-semibold">{it.subject_name}</span>
								<span class="text-lms-muted truncate">{it.teacher_name || t('no_teacher')}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-lms-muted text-[13px]">{t('pending_none')}</p>
				{/if}
			</section>

			<section class="flex flex-col gap-2">
				<h3 class="text-sm font-bold">{t('recipients_title')}</h3>
				{#each pending.recipients as r (r.teacher_id)}
					<Checkbox
						name={`recipient-${r.teacher_id}`}
						bind:checked={
							() => picked[r.teacher_id] ?? false,
							(v) => (picked = { ...picked, [r.teacher_id]: v })
						}
						disabled={!r.has_email}
						label={r.has_email
							? r.homeroom
								? t('recipient_homeroom', { name: r.name })
								: r.name
							: t('recipient_no_email', { name: r.name })}
					/>
				{:else}
					<p class="text-lms-muted text-[13px]">{t('recipients_none')}</p>
				{/each}
			</section>

			<label class="flex flex-col gap-1.5">
				<span class="text-[13px] font-semibold">{t('message_label')}</span>
				<textarea
					class="border-lms-border bg-lms-surface lms-focus-ring min-h-24 rounded-[10px] border p-3 text-sm"
					maxlength={REMIND_MESSAGE_MAX}
					placeholder={t('message_placeholder')}
					bind:value={message}></textarea>
				<span class="text-lms-muted self-end text-xs tabular-nums"
					>{message.length}/{REMIND_MESSAGE_MAX}</span
				>
			</label>

			<p class="text-lms-muted flex items-center gap-2 text-xs">
				<Icon icon={Mail} size="sm" />{t('channel_email')}
			</p>

			<!-- recipient_ids selalu eksplisit; tanpa pilihan tombol nonaktif (BE: kosong = wali kelas saja). -->
			<button
				type="button"
				class="lms-action-primary lms-focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-50"
				disabled={busy || !selected.length}
				onclick={() => onsend(remindBody(message, selected))}
				><Icon icon={BellRing} size="sm" />{t('send', { count: selected.length })}</button
			>
		{/if}
	</div>
</Drawer>
