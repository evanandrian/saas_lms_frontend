<script lang="ts">
	import Badge from './Badge.svelte';

	export type TimelineState = 'done' | 'current' | 'upcoming';

	export interface TimelineItem {
		id: string;
		time: string;
		title: string;
		meta?: string;
		status?: string;
		state: TimelineState;
	}

	interface Props {
		label: string;
		items: readonly TimelineItem[];
	}

	let { label, items }: Props = $props();

	// Status tertulis selalu tampil; warna node hanya penguat.
	const NODE_CLASSES: Record<TimelineState, string> = {
		done: 'bg-lms-brand-growth-green border-lms-brand-growth-green',
		current: 'bg-lms-interactive border-lms-interactive',
		upcoming: 'bg-lms-surface border-lms-input-border'
	};
	const BADGE_TONE = { done: 'success', current: 'info', upcoming: 'neutral' } as const;
</script>

<ol class="space-y-0" aria-label={label}>
	{#each items as item, index (item.id)}
		<li
			class="relative flex gap-3 pb-5 last:pb-0"
			aria-current={item.state === 'current' ? 'step' : undefined}
		>
			{#if index < items.length - 1}
				<span class="bg-lms-border absolute top-5 bottom-0 left-[9px] w-0.5" aria-hidden="true"
				></span>
			{/if}
			<span
				class={['relative mt-0.5 size-5 shrink-0 rounded-full border-2', NODE_CLASSES[item.state]]}
				aria-hidden="true"
			></span>
			<div class="flex min-w-0 flex-1 items-start justify-between gap-3">
				<div class="min-w-0">
					<p class="text-lms-body-sm font-semibold">{item.time}</p>
					<p class="font-semibold">{item.title}</p>
					{#if item.meta}<p class="lms-text-helper">{item.meta}</p>{/if}
				</div>
				{#if item.status}
					<Badge tone={BADGE_TONE[item.state]}>{item.status}</Badge>
				{/if}
			</div>
		</li>
	{/each}
</ol>
