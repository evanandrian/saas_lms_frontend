<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import type { AccountPageState } from '../account.state.svelte';
	import { PROVIDER_MARK, type OAuthProvider } from '../account.model';
	import { card } from './styles';

	interface Props {
		page: AccountPageState;
		errorText: (code: string) => string;
	}

	let { page, errorText }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`account.linked.${key}`, params);

	let busy = $state<OAuthProvider | null>(null);

	/** Hubungkan → jendela persetujuan penyedia (OAuth), kembali lewat `/oauth/callback`. */
	async function connect(provider: OAuthProvider) {
		if (busy) return;
		busy = provider;
		const outcome = await page.call<{ authorize_url: string }>('linkStart', { provider });
		if (outcome.ok) {
			window.location.assign(outcome.data.authorize_url);
			return;
		}
		busy = null;
		page.say(errorText(outcome.code), CircleX);
	}
</script>

<section class="{card} gap-1">
	<h2 class="mb-1 text-base font-bold">{t('title')}</h2>
	<span class="text-lms-muted mb-2 text-[13px]">{t('sub')}</span>
	{#each page.overview.linked as p (p.provider)}
		<div class="border-lms-border flex flex-wrap items-center gap-3.5 border-t py-3.5">
			<span
				class="bg-lms-surface-muted flex size-10 flex-none items-center justify-center rounded-[10px] text-[15px] font-bold"
				>{PROVIDER_MARK[p.provider]}</span
			>
			<span class="flex flex-[1_1_220px] flex-col gap-0.5">
				<span class="text-sm font-bold">{t(`name.${p.provider}`)}</span>
				<span class="text-xs {p.email ? 'text-lms-success-text' : 'text-lms-muted'}"
					>{p.email
						? t('connected_as', { email: p.email })
						: p.configured
							? t(`desc.${p.provider}`)
							: t('not_configured')}</span
				>
			</span>
			{#if p.email}
				<button
					type="button"
					class="lms-focus-ring border-lms-danger-text text-lms-danger-text h-9 rounded-lg border bg-transparent px-3.5 text-[13px] font-semibold"
					onclick={() => (page.confirm = `unlink:${p.provider}`)}>{t('disconnect')}</button
				>
			{:else}
				<button
					type="button"
					class="lms-focus-ring bg-lms-interactive text-lms-on-interactive border-lms-interactive h-9 rounded-lg border px-3.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!p.configured || busy !== null}
					onclick={() => connect(p.provider)}>{t('connect')}</button
				>
			{/if}
		</div>
	{/each}
</section>
