<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import type { AccountPageState } from '../account.state.svelte';
	import { clientLabel, loginTime } from '../account.model';
	import { segment, segmented } from './styles';

	interface Props {
		page: AccountPageState;
	}

	let { page }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`account.history.${key}`, params);

	const FILTERS = ['all', 'ok', 'fail'] as const;
	let filter = $state<(typeof FILTERS)[number]>('all');

	const logins = $derived(
		page.overview.logins.filter(
			(l) => filter === 'all' || (filter === 'ok' ? l.result === 'success' : l.result === 'failure')
		)
	);

	function title(result: string, method: string, reason: string) {
		if (result === 'success')
			return method === 'password' ? t('ok') : t('ok_with', { provider: t(`provider.${method}`) });
		return t(`fail.${reason || 'wrong_password'}`);
	}

	function when(iso: string) {
		const r = loginTime(iso, new Date(page.now));
		return r.key === 'date' ? r.time : t(r.key, { time: r.time });
	}

	function notMe() {
		page.tab = 'password';
		page.say(t('not_me_toast'), ShieldAlert);
	}
</script>

<section class="bg-lms-surface border-lms-border flex flex-col overflow-hidden rounded-xl border">
	<div
		class="border-lms-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"
	>
		<h2 class="text-base font-bold">{t('title')}</h2>
		<div class={segmented} role="radiogroup" aria-label={t('title')}>
			{#each FILTERS as f (f)}
				<button
					type="button"
					role="radio"
					aria-checked={filter === f}
					class="{segment(filter === f)} h-8 px-3"
					onclick={() => (filter = f)}>{t(`filter.${f}`)}</button
				>
			{/each}
		</div>
	</div>
	{#each logins as l (l.id)}
		{@const ok = l.result === 'success'}
		<div
			class="border-lms-border flex flex-wrap items-center gap-3.5 border-b px-5 py-3 {ok
				? ''
				: 'bg-lms-danger-subtle/40'}"
		>
			<span class={ok ? 'text-lms-success-text' : 'text-lms-danger-text'}
				><Icon icon={ok ? CircleCheck : CircleX} /></span
			>
			<span class="flex flex-[1_1_220px] flex-col gap-0.5">
				<span class="text-sm font-semibold">{title(l.result, l.method, l.reason)}</span>
				<span class="text-lms-muted text-xs"
					>{[clientLabel(l.client, i18n.t('account.unknown_device')), l.ip]
						.filter(Boolean)
						.join(' · ')}</span
				>
			</span>
			<span class="text-lms-muted font-mono text-xs">{when(l.created_at)}</span>
			{#if !ok}
				<button
					type="button"
					class="lms-focus-ring border-lms-danger-text text-lms-danger-text h-8 rounded-lg border px-3 text-xs font-semibold"
					onclick={notMe}>{t('not_me')}</button
				>
			{/if}
		</div>
	{/each}
	{#if logins.length === 0}
		<div class="text-lms-muted p-7 text-center text-[13px]">
			{t(filter === 'fail' ? 'empty_fail' : 'empty')}
		</div>
	{/if}
</section>
