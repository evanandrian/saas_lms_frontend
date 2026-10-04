<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<!-- Layar autentikasi tanpa shell aplikasi: split layar penuh sesuai referensi FLIXARE App.html (FE-05R). -->
{@render children()}
