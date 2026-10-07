<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Tablet from '@lucide/svelte/icons/tablet';
	import type { AccountPageState } from '../account.state.svelte';
	import { activeAgo, clientLabel } from '../account.model';
	import { buttonDanger, buttonSecondary, card, cardTitle } from './styles';

	interface Props {
		page: AccountPageState;
		errorText: (code: string) => string;
	}

	let { page, errorText }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`account.sessions.${key}`, params);

	const KIND_ICON = { desktop: Monitor, mobile: Smartphone, tablet: Tablet } as const;
	let busyId = $state<string | null>(null);

	const sessions = $derived(page.overview.sessions);
	const hasOthers = $derived(sessions.some((s) => !s.current));

	function meta(ip: string, lastActive: string) {
		const ago = activeAgo(lastActive, new Date(page.now));
		const when = ago.key === 'now' ? t('active_now') : t(`active_${ago.key}`, { count: ago.count });
		return [ip, when].filter(Boolean).join(' · ');
	}

	async function kick(id: string, label: string) {
		if (busyId) return;
		busyId = id;
		const outcome = await page.run('sessionRevoke', { id });
		busyId = null;
		page.say(
			outcome.ok ? t('kicked', { device: label }) : errorText(outcome.code),
			outcome.ok ? LogOut : CircleX
		);
	}
</script>

<section class="{card} gap-1">
	<div class="mb-2 flex flex-wrap items-center justify-between gap-3">
		<h2 class={cardTitle}>{t('title')}</h2>
		{#if hasOthers}
			<button
				type="button"
				class="{buttonDanger} h-9 rounded-lg px-3.5 text-[13px]"
				onclick={() => (page.confirm = 'sessions')}>{t('logout_all')}</button
			>
		{/if}
	</div>
	{#each sessions as s (s.id)}
		{@const label = clientLabel(s.client, i18n.t('account.unknown_device'))}
		<div class="border-lms-border flex flex-wrap items-center gap-3.5 border-b py-3">
			<span
				class="bg-lms-surface-muted text-lms-muted flex size-10 flex-none items-center justify-center rounded-[10px]"
				><Icon icon={KIND_ICON[s.client.kind]} /></span
			>
			<span class="flex flex-[1_1_220px] flex-col gap-0.5">
				<span class="flex flex-wrap items-center gap-2 text-sm font-bold"
					>{label}
					{#if s.current}<span
							class="lms-tone-success rounded-full px-[7px] py-0.5 text-[10px] font-bold"
							>{t('this_device')}</span
						>{/if}</span
				>
				<span class="text-lms-muted text-xs">{meta(s.ip, s.last_active_at)}</span>
			</span>
			{#if !s.current}
				<button
					type="button"
					class="{buttonSecondary} h-[34px] rounded-lg px-3 text-xs"
					disabled={busyId === s.id}
					onclick={() => kick(s.id, label)}>{t('kick')}</button
				>
			{/if}
		</div>
	{/each}
	<span class="text-lms-muted mt-2 text-xs"
		>{t('idle', { days: page.overview.session_idle_days })}</span
	>
</section>
