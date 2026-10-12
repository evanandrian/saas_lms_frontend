<script lang="ts" module>
	export interface TabItem {
		key: string;
		label: string;
		count?: number;
		alert?: boolean;
	}
</script>

<script lang="ts">
	interface Props {
		items: readonly TabItem[];
		value: string;
		label: string;
		onchange: (key: string) => void;
	}
	let { items, value, label, onchange }: Props = $props();
</script>

<div
	role="tablist"
	aria-label={label}
	class="bg-lms-surface-muted flex flex-wrap gap-0.5 rounded-lg p-[3px]"
>
	{#each items as item (item.key)}
		<button
			type="button"
			role="tab"
			aria-selected={item.key === value}
			class="lms-focus-ring flex h-[30px] items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold whitespace-nowrap {item.key ===
			value
				? 'bg-lms-surface text-lms-foreground shadow-sm'
				: 'text-lms-muted'}"
			onclick={() => onchange(item.key)}
		>
			{item.label}
			{#if item.count !== undefined}
				<span
					class="tabular-nums {item.alert && item.count
						? 'text-lms-danger-text'
						: 'text-lms-muted/70'}">{item.count}</span
				>
			{/if}
		</button>
	{/each}
</div>
