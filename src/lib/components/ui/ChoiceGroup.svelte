<script lang="ts">
	export interface ChoiceOption {
		value: string;
		title: string;
		description?: string;
		/** Baris tambahan yang ditekankan (mis. ringkasan harga dari data). */
		meta?: string;
		/** Daftar poin (mis. fitur paket dari data). */
		features?: readonly string[];
	}

	type ChoiceLayout = 'stack' | 'grid' | 'inline';

	interface Props {
		/** Judul grup (legend) — wajib untuk aksesibilitas. */
		legend: string;
		name: string;
		options: readonly ChoiceOption[];
		value?: string;
		/** `inline` = kontrol segmen ringkas (mis. zona waktu); `stack`/`grid` = kartu pilihan. */
		layout?: ChoiceLayout;
		disabled?: boolean;
		hint?: string;
	}

	let {
		legend,
		name,
		options,
		value = $bindable(''),
		layout = 'stack',
		disabled = false,
		hint
	}: Props = $props();

	const groupId = $props.id();
	const hintId = `${groupId}-hint`;

	const LAYOUT_CLASSES: Record<ChoiceLayout, string> = {
		stack: 'flex flex-col gap-3',
		grid: 'grid gap-3 md:grid-cols-3',
		inline: 'flex flex-wrap gap-2'
	};
</script>

<!-- Radio native di dalam label: navigasi panah, satu tab stop, dan state terbaca pembaca layar. -->
<fieldset aria-describedby={hint ? hintId : undefined} {disabled}>
	<legend class="lms-text-label mb-2">{legend}</legend>
	<div class={LAYOUT_CLASSES[layout]}>
		{#each options as option (option.value)}
			<label
				class={[
					'lms-card has-checked:border-lms-interactive has-focus-visible:outline-lms-focus relative flex cursor-pointer gap-3 has-checked:ring-1 has-checked:ring-(--color-lms-interactive) has-disabled:cursor-not-allowed has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
					layout === 'inline' ? 'items-center px-4 py-2' : 'items-start p-4'
				]}
			>
				<input
					type="radio"
					class={['radio', layout === 'inline' && 'sr-only']}
					{name}
					value={option.value}
					bind:group={value}
				/>
				<span class="min-w-0 space-y-1">
					<span class="block font-semibold">{option.title}</span>
					{#if option.description}
						<span class="lms-text-helper block">{option.description}</span>
					{/if}
					{#if option.meta}
						<span class="text-lms-body-sm text-lms-foreground block font-semibold">
							{option.meta}
						</span>
					{/if}
					{#if option.features?.length}
						<ul class="text-lms-body-sm list-disc space-y-1 ps-5 pt-1">
							{#each option.features as feature (feature)}
								<li>{feature}</li>
							{/each}
						</ul>
					{/if}
				</span>
			</label>
		{/each}
	</div>
	{#if hint}
		<p id={hintId} class="lms-text-helper mt-2">{hint}</p>
	{/if}
</fieldset>
