<script lang="ts" generics="T extends string">
	/** Kontrol segmen (referensi: latar card2, opsi aktif card + bayangan). */
	interface Props {
		options: readonly { value: T; label: string }[];
		value: T;
		label: string;
		onchange: (value: T) => void;
		full?: boolean;
		size?: 'sm' | 'md';
	}

	let { options, value, label, onchange, full = true, size = 'md' }: Props = $props();
</script>

<div
	class={['bg-lms-surface-muted flex gap-0.5 rounded-[10px] p-0.75', !full && 'self-start']}
	role="group"
	aria-label={label}
>
	{#each options as option (option.value)}
		<button
			type="button"
			aria-pressed={option.value === value}
			class={[
				'lms-focus-ring rounded-lg px-3.5 font-semibold whitespace-nowrap',
				full && 'flex-1',
				size === 'sm' ? 'h-8 text-xs' : 'h-9.5 text-[0.8125rem]',
				option.value === value
					? 'bg-lms-surface text-lms-foreground shadow-[0_1px_3px_rgba(15,24,56,0.15)]'
					: 'text-lms-muted'
			]}
			onclick={() => onchange(option.value)}>{option.label}</button
		>
	{/each}
</div>
