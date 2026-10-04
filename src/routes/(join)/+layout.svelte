<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import { useI18n } from '$lib/i18n';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const i18n = useI18n();
</script>

<AppShell title={i18n.t('join.shell.title')}>
	{@render children()}
</AppShell>
