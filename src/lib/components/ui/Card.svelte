<script lang="ts">
	import type { Snippet } from 'svelte';

	type CardTone = 'default' | 'hero';
	type CardPadding = 'md' | 'flush';
	type HeadingLevel = 2 | 3;

	interface Props {
		title?: string;
		description?: string;
		headingLevel?: HeadingLevel;
		tone?: CardTone;
		/** `flush` untuk daftar yang mengatur padding barisnya sendiri. */
		padding?: CardPadding;
		/** Aksi/tautan di kanan judul. */
		actions?: Snippet;
		children: Snippet;
	}

	let {
		title,
		description,
		headingLevel = 2,
		tone = 'default',
		padding = 'md',
		actions,
		children
	}: Props = $props();

	const headingId = $props.id();
	const TONE_CLASSES: Record<CardTone, string> = {
		default: 'lms-card',
		hero: 'lms-hero rounded-3xl'
	};
</script>

<section
	class={['flex h-full min-w-0 flex-col', TONE_CLASSES[tone], padding === 'md' ? 'p-5.5' : 'py-5']}
	aria-labelledby={title ? headingId : undefined}
>
	{#if title}
		<div class={['mb-4 flex items-start justify-between gap-3', padding === 'flush' && 'px-5.5']}>
			<div class="min-w-0">
				<svelte:element
					this={`h${headingLevel}`}
					id={headingId}
					class="text-lms-body font-semibold"
				>
					{title}
				</svelte:element>
				{#if description}
					<p
						class={tone === 'hero' ? 'text-lms-body-sm text-lms-on-hero-muted' : 'lms-text-helper'}
					>
						{description}
					</p>
				{/if}
			</div>
			{#if actions}
				<div class="shrink-0">{@render actions()}</div>
			{/if}
		</div>
	{/if}
	<!-- Isi meregang mengisi tinggi kartu (baris grid sejajar, referensi). -->
	<div class="flex min-h-0 flex-1 flex-col">{@render children()}</div>
</section>
