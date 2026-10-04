<script lang="ts">
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
</script>

<PageContainer heading={i18n.t('auth.context.title')}>
	<p class="lms-text-helper max-w-prose">{i18n.t('auth.context.description')}</p>
	<!-- Daftar berasal dari Dashboard Routing Policy (hanya konteks sah di host ini); tujuan ditentukan server. -->
	<ul class="grid max-w-2xl gap-3">
		{#each data.contexts as context (context.id)}
			<li>
				<form method="POST" action="?/select">
					<input type="hidden" name="membershipId" value={context.id} />
					<button
						type="submit"
						class="lms-card lms-focus-ring hover:border-lms-interactive flex w-full items-center gap-3 p-4 text-start"
					>
						<span class="flex-1 font-semibold">{context.label}</span>
						<span class="sr-only">{i18n.t('auth.context.open')}</span>
						<Icon icon={ChevronRight} size="sm" />
					</button>
				</form>
			</li>
		{/each}
	</ul>
</PageContainer>
