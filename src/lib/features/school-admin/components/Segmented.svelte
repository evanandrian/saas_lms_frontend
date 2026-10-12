<script lang="ts">
	interface Props {
		label: string;
		value: string;
		options: readonly { value: string; label: string }[];
		onchange: (value: string) => void;
	}
	let { label, value, options, onchange }: Props = $props();
</script>

<div
	role="radiogroup"
	aria-label={label}
	class="bg-lms-surface-muted flex gap-0.5 rounded-[10px] p-[3px]"
>
	{#each options as option (option.value)}
		<button
			type="button"
			role="radio"
			aria-checked={option.value === value}
			class="lms-focus-ring h-9 flex-1 rounded-lg px-2 text-xs font-semibold whitespace-nowrap {option.value ===
			value
				? 'bg-lms-surface text-lms-foreground shadow-sm'
				: 'text-lms-muted'}"
			onclick={() => onchange(option.value)}>{option.label}</button
		>
	{/each}
</div>
