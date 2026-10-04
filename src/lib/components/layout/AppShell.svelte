<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { useI18n } from '$lib/i18n';
	import ColorModeToggle from './ColorModeToggle.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Label area (mis. "Konsol Platform"); kosong untuk area publik. Logo memberi identitas FLIXARE. */
		title?: string;
		navigation?: Snippet;
		children: Snippet;
	}

	let { title, navigation, children }: Props = $props();

	const i18n = useI18n();
	const NAVIGATION_ID = 'lms-primary-navigation';
	const MAIN_CONTENT_ID = 'main-content';

	let isNavigationOpen = $state(false);

	function handleToggleNavigation() {
		isNavigationOpen = !isNavigationOpen;
	}

	afterNavigate(() => {
		isNavigationOpen = false;
	});
</script>

<a
	href={`#${MAIN_CONTENT_ID}`}
	class="btn lms-action-primary lms-focus-ring sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
>
	{i18n.t('common.shell.skip_to_content')}
</a>

{#if navigating.to}
	<div
		class="bg-lms-interactive fixed inset-x-0 top-0 z-50 h-1 motion-safe:animate-pulse"
		role="progressbar"
		aria-label={i18n.t('common.shell.loading')}
	></div>
{/if}

<div class="bg-lms-background text-lms-foreground flex min-h-screen flex-col">
	<header class="border-lms-border bg-lms-surface shadow-lms-raised sticky top-0 z-40 border-b">
		<!-- Header mengikuti gutter shell (FE-04R): logo rata kiri, tanpa container terpusat. -->
		<div class="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
			<div class="flex min-w-0 items-center gap-3">
				<BrandLogo />
				{#if title}
					<p class="text-lms-body truncate font-semibold">{title}</p>
				{/if}
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<ColorModeToggle />
				{#if navigation}
					<div class="md:hidden">
						<Button
							variant="ghost"
							size="sm"
							aria-expanded={isNavigationOpen}
							aria-controls={NAVIGATION_ID}
							onclick={handleToggleNavigation}
						>
							{i18n.t('common.shell.menu')}
						</Button>
					</div>
				{/if}
			</div>
		</div>
		{#if navigation}
			<nav
				id={NAVIGATION_ID}
				aria-label={i18n.t('common.shell.primary_navigation')}
				class={['md:block', isNavigationOpen ? 'block' : 'hidden']}
			>
				<div class="flex flex-col gap-1 px-4 pb-3 md:flex-row md:gap-2 md:px-6">
					{@render navigation()}
				</div>
			</nav>
		{/if}
	</header>

	<!-- Target skip link (tabindex -1, bukan elemen interaktif); outline landmark tidak ditampilkan. -->
	<main id={MAIN_CONTENT_ID} tabindex="-1" class="flex-1 focus:outline-none">
		{@render children()}
	</main>
</div>
