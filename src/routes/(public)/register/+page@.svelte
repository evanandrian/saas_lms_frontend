<script lang="ts">
	import ColorModeToggle from '$lib/components/layout/ColorModeToggle.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import RegisterWizard from '$lib/features/registration/components/RegisterWizard.svelte';
	import { useI18n } from '$lib/i18n';
	import type { PageProps } from './$types';

	/** Daftar & berlangganan: chrome sendiri (header + rail langkah) sesuai referensi, tanpa AppShell. */
	let { data }: PageProps = $props();
	const i18n = useI18n();
</script>

<svelte:head><title>{i18n.t('register.page_title')}</title></svelte:head>

{#if data.catalog}
	<RegisterWizard
		catalog={data.catalog}
		registration={data.registration}
		cities={data.cities}
		challenge={data.challenge}
	>
		{#snippet headerActions()}<ColorModeToggle />{/snippet}
	</RegisterWizard>
{:else}
	<main class="mx-auto flex min-h-dvh max-w-xl items-center px-4">
		<StatePanel
			headingLevel={1}
			title={i18n.t('register.unavailable_title')}
			description={i18n.t('register.unavailable_description')}
		/>
	</main>
{/if}
