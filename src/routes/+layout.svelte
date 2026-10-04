<script lang="ts">
	import '../app.css';
	import { setI18n } from '$lib/i18n';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// `<html lang>` diisi SSR (hooks.server.ts); locale tidak berubah di klien.
	setI18n(() => data.locale);
</script>

{@render children()}
