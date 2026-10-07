<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Dot from '@lucide/svelte/icons/dot';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import type { RegistrationWizard } from '../../registration.state.svelte';

	interface Props {
		wizard: RegistrationWizard;
	}

	let { wizard }: Props = $props();
	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
	const TASKS = ['create_db', 'migrate', 'seed', 'admin', 'activate', 'welcome'] as const;
	/** Tampilan progres: tugas bergerak bertahap selama backend memproses; selesai hanya bila tenant aktif. */
	const SECONDS_PER_TASK = 1.5;
	const TARGET_SECONDS = 300;

	const startedAt = Date.now();
	let now = $state(Date.now());
	const tenant = $derived(wizard.server?.tenant ?? null);
	const done = $derived(tenant?.lifecycle === 'trial' || tenant?.lifecycle === 'active');
	const elapsed = $derived(Math.floor((now - startedAt) / 1000));
	const step = $derived(
		done ? TASKS.length : Math.min(TASKS.length - 1, Math.floor(elapsed / SECONDS_PER_TASK))
	);
	const pct = $derived(Math.round((step / TASKS.length) * 100));
	const locale = $derived(i18n.locale === 'en' ? 'en-US' : 'id-ID');

	$effect(() => {
		if (done) return;
		const timer = setInterval(() => (now = Date.now()), 500);
		return () => clearInterval(timer);
	});

	const mmss = (s: number) =>
		`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
</script>

<section class="lms-card flex flex-col gap-4.5 rounded-[14px]! p-6 shadow-none!">
	<div class="flex flex-wrap items-baseline justify-between gap-3">
		<span class="text-[2.5rem] font-bold tracking-tight tabular-nums">{pct}%</span>
		<span class="text-lms-muted font-mono text-xs"
			>{tenant?.db_name ?? '—'} · {t('provisioning.elapsed', {
				time: mmss(Math.min(elapsed, TARGET_SECONDS)),
				target: mmss(TARGET_SECONDS)
			})}</span
		>
	</div>
	<div
		class="bg-lms-surface-muted h-2 overflow-hidden rounded-full"
		role="progressbar"
		aria-valuenow={pct}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label={t('provisioning.label')}
	>
		<div
			class={[
				'h-full rounded-full transition-[width] duration-1000',
				done ? 'bg-lms-progress' : 'bg-lms-interactive'
			]}
			style:width="{pct}%"
		></div>
	</div>
	<ol class="flex flex-col">
		{#each TASKS as task, i (task)}
			{@const isDone = i < step}
			{@const current = i === step && !done}
			<li
				class={[
					'border-lms-border flex items-center gap-3 border-t py-2.5 transition-opacity',
					isDone || current ? 'opacity-100' : 'opacity-55'
				]}
			>
				<span
					class={[
						'flex size-6 flex-none items-center justify-center rounded-full',
						isDone
							? 'bg-lms-progress text-lms-on-interactive'
							: current
								? 'border-lms-interactive text-lms-interactive border-[1.5px]'
								: 'border-lms-input-border text-lms-muted border-[1.5px]'
					]}><Icon icon={isDone ? Check : current ? LoaderCircle : Dot} size="sm" /></span
				>
				<span class={['flex-1 text-sm', current ? 'font-bold' : 'font-medium']}>
					{t(`provisioning.task_${task}`, {
						kind: t(`provisioning.kind_${wizard.type}`),
						mode: t(
							wizard.server?.application?.trial
								? 'provisioning.mode_trial'
								: 'provisioning.mode_active'
						)
					})}
				</span>
				<span class="text-lms-muted font-mono text-[11px]"
					>{isDone
						? t('provisioning.done')
						: current
							? t('provisioning.running')
							: t('provisioning.queued')}</span
				>
			</li>
		{/each}
	</ol>
	{#if done}
		<div class="lms-tone-success flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm">
			<Icon icon={PartyPopper} />
			<span>
				<strong>{t('provisioning.active')}</strong>
				{tenant?.trial_ends_at
					? t('provisioning.trial_note', {
							date: new Date(tenant.trial_ends_at).toLocaleString(locale, {
								weekday: 'long',
								day: 'numeric',
								month: 'short',
								hour: '2-digit',
								minute: '2-digit'
							})
						})
					: t('provisioning.active_note')}
			</span>
		</div>
	{:else if tenant?.provision_failed}
		<div class="lms-tone-warning flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm">
			<Icon icon={CircleAlert} /><span>{t('provisioning.retrying')}</span>
		</div>
	{/if}
</section>
