<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import X from '@lucide/svelte/icons/x';
	import { onMount } from 'svelte';
	import { InviteJobPoller } from '../invite-job-poller.svelte';
	import { PREFIX, percent } from '../school-admin.model';
	import ActivationCodes from './ActivationCodes.svelte';

	interface Props {
		/** Id job undangan massal (`SchoolInviteResult.job_ids`). Ganti id → remount (`{#key}`). */
		jobIds: readonly string[];
		/** Dipanggil sekali saat semua job selesai (berhasil/gagal) agar halaman menyegarkan daftar. */
		ondone?: () => void;
		/** Tutup panel (tombol tampil setelah semua job selesai). */
		ondismiss?: () => void;
	}
	let { jobIds, ondone, ondismiss }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.invite_job.${key}`, params);

	const KINDS: readonly string[] = ['teachers', 'students', 'guardians'];

	const poller = new InviteJobPoller({
		jobIds: () => jobIds,
		ondone: () => ondone?.(),
		t: i18n.t
	});

	const kindLabel = (kind: string | undefined) =>
		kind && KINDS.includes(kind) ? t(`kind.${kind}`) : t('kind.generic');

	onMount(() => poller.start());
</script>

<!-- Progres undangan massal (> 50 akun diproses worker): polling tiap ~2 detik sampai selesai. -->
<section
	class="lms-card flex flex-col gap-4 rounded-xl p-4"
	aria-label={t('title')}
	aria-busy={!poller.finished && !poller.pollStopped}
>
	<div class="flex flex-wrap items-start gap-3">
		<span
			class="flex size-9 shrink-0 items-center justify-center rounded-full {poller.finished
				? 'lms-tone-success'
				: 'lms-tone-info'}"
		>
			<Icon icon={poller.finished ? CircleCheck : LoaderCircle} size="sm" />
		</span>
		<div class="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
			<span class="text-[0.9375rem] font-bold"
				>{poller.finished ? t('title_done') : t('title')}</span
			>
			<span class="text-lms-muted text-xs">{poller.finished ? t('note_done') : t('note')}</span>
		</div>
		{#if (poller.finished || poller.pollStopped) && ondismiss}
			<button
				type="button"
				class="lms-action-ghost lms-focus-ring inline-flex size-8 items-center justify-center rounded-lg"
				aria-label={i18n.t(`${PREFIX}.common.close`)}
				onclick={ondismiss}><Icon icon={X} size="sm" /></button
			>
		{/if}
	</div>

	{#each poller.list as { id, job } (id)}
		{@const pct = job ? percent(job.done, job.total) : 0}
		<div class="border-lms-border flex flex-col gap-2 rounded-lg border p-3">
			<div class="flex flex-wrap items-center justify-between gap-2 text-[13px]">
				<span class="font-semibold">{kindLabel(job?.kind)}</span>
				<span
					class="rounded-full px-2 py-0.5 text-[11px] font-semibold {job?.status === 'failed'
						? 'lms-tone-danger'
						: job?.status === 'succeeded'
							? 'lms-tone-success'
							: 'lms-tone-info'}">{t(`status.${job?.status ?? 'queued'}`)}</span
				>
			</div>
			<div
				class="bg-lms-surface-muted h-2 overflow-hidden rounded-full"
				role="progressbar"
				aria-label={t('progress_label', { kind: kindLabel(job?.kind) })}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={pct}
			>
				<div
					class="h-full rounded-full transition-[width] duration-500 {job?.status === 'failed'
						? 'bg-lms-danger-text'
						: job?.status === 'succeeded'
							? 'bg-lms-success-text'
							: 'bg-lms-interactive'}"
					style:width="{pct}%"
				></div>
			</div>
			<div class="text-lms-muted flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
				<span>{t('progress', { done: job?.done ?? 0, total: job?.total ?? 0 })}</span>
				<span>{t('count_sent', { count: job?.sent ?? 0 })}</span>
				<span>{t('count_linked', { count: job?.linked ?? 0 })}</span>
				<span>{t('count_skipped', { count: job?.skipped ?? 0 })}</span>
				{#if job?.failed}
					<span class="text-lms-danger-text">{t('count_failed', { count: job.failed })}</span>
				{/if}
			</div>
			{#if job?.status === 'failed'}
				<p role="alert" class="lms-tone-danger flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
					<Icon icon={CircleAlert} size="sm" />
					<!-- `job.error` sengaja tidak ditampilkan: hanya kode stabil (`job_failed`), bukan pesan untuk pengguna. -->
					<span>{t('failed_note')}</span>
				</p>
			{/if}
		</div>
	{/each}

	{#if poller.pollError}
		<p role="status" class="text-lms-warning-text text-xs">
			{t(poller.pollStopped ? 'poll_stopped' : 'poll_error', { message: poller.pollError })}
		</p>
	{/if}

	{#if poller.finished && poller.codes.length}
		<div class="flex flex-col gap-1.5">
			<ActivationCodes codes={poller.codes} />
			<span class="text-lms-muted text-xs">{t('codes_note')}</span>
		</div>
	{/if}
</section>
