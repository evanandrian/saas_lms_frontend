<script lang="ts">
	type SpinnerSize = 'sm' | 'md';

	interface Props {
		/** Label aksesibel. Tanpa label, spinner dekoratif (`aria-hidden`) — konteks memberi nama. */
		label?: string;
		size?: SpinnerSize;
	}

	let { label, size = 'sm' }: Props = $props();

	const SIZE_CLASSES: Record<SpinnerSize, string> = {
		sm: 'size-4',
		md: 'size-6'
	};
</script>

<span
	class={[
		'inline-block shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin',
		SIZE_CLASSES[size]
	]}
	role={label ? 'status' : undefined}
	aria-hidden={label ? undefined : 'true'}
>
	{#if label}
		<span class="sr-only">{label}</span>
	{/if}
</span>
