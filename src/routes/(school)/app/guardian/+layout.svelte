<script lang="ts">
	import RoleWorkspaceLayout from '../RoleWorkspaceLayout.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<RoleWorkspaceLayout {data} area="guardian">
	{@render children()}
</RoleWorkspaceLayout>
