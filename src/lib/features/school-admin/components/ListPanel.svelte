<script lang="ts" module>
	export interface ListRow {
		id: string;
		initials: string;
		name: string;
		code: string;
		meta: string;
		extra: string;
		extraTone?: 'default' | 'muted' | 'warning';
		status: { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' };
	}
	export interface BulkAction {
		text: string;
		action: string;
		busy?: boolean;
		onclick: () => void;
	}
</script>

<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import FileUp from '@lucide/svelte/icons/file-up';
	import Mail from '@lucide/svelte/icons/mail';
	import Search from '@lucide/svelte/icons/search';
	import type { Snippet } from 'svelte';
	import StatusPill from './StatusPill.svelte';
	import TabBar, { type TabItem } from './TabBar.svelte';

	interface Props {
		heads: readonly string[];
		rows: readonly ListRow[];
		query: string;
		searchPlaceholder: string;
		searchLabel: string;
		tabs?: readonly TabItem[];
		tab?: string;
		tabsLabel?: string;
		bulk?: BulkAction | null;
		emptyText: string;
		importLabel?: string;
		footNote: string;
		filters?: Snippet;
		onquery: (value: string) => void;
		ontab?: (key: string) => void;
		onopen: (id: string) => void;
		onimport?: () => void;
	}

	let {
		heads,
		rows,
		query,
		searchPlaceholder,
		searchLabel,
		tabs = [],
		tab = 'all',
		tabsLabel = '',
		bulk = null,
		emptyText,
		importLabel,
		footNote,
		filters,
		onquery,
		ontab,
		onopen,
		onimport
	}: Props = $props();

	const COLS = 'minmax(0,1.5fr) minmax(0,1.3fr) minmax(0,1.1fr) 110px';
	const EXTRA_TONE = {
		default: 'text-lms-foreground/80',
		muted: 'text-lms-muted',
		warning: 'text-lms-warning-text'
	} as const;
</script>

<!-- Panel daftar (referensi v4 05a–05e): pencarian, filter, tab, aksi massal, baris, kosong. -->
<div class="lms-card flex flex-col rounded-xl">
	<div class="border-lms-border flex flex-wrap items-center gap-2.5 border-b px-4 py-3">
		<label class="relative block flex-[1_1_220px]">
			<span class="sr-only">{searchLabel}</span>
			<span class="text-lms-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
				><Icon icon={Search} size="sm" /></span
			>
			<input
				type="search"
				value={query}
				placeholder={searchPlaceholder}
				class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-[38px] w-full rounded-lg pr-3 pl-9 text-[13px]"
				oninput={(e) => onquery(e.currentTarget.value)}
			/>
		</label>
		{#if filters}{@render filters()}{/if}
		{#if tabs.length && ontab}<TabBar
				items={tabs}
				value={tab}
				label={tabsLabel}
				onchange={ontab}
			/>{/if}
	</div>
	{#if bulk}
		<div
			class="border-lms-border bg-lms-surface-muted flex flex-wrap items-center gap-2.5 border-b px-4 py-2.5"
		>
			<span class="text-lms-interactive"><Icon icon={Mail} size="sm" /></span>
			<span class="text-lms-foreground/80 flex-[1_1_240px] text-[13px]">{bulk.text}</span>
			<button
				type="button"
				class="lms-action-primary lms-focus-ring h-[34px] rounded-lg px-3.5 text-xs font-bold disabled:opacity-60"
				disabled={bulk.busy}
				onclick={bulk.onclick}>{bulk.action}</button
			>
		</div>
	{/if}
	<div class="overflow-x-auto">
		<div class="min-w-[640px]">
			<div
				class="border-lms-border text-lms-muted grid gap-3.5 border-b px-4 py-[9px] font-mono text-[10px] tracking-[0.1em]"
				style:grid-template-columns={COLS}
			>
				{#each heads as head, i (i)}<span>{head}</span>{/each}
			</div>
			{#each rows as row (row.id)}
				<button
					type="button"
					class="border-lms-border hover:bg-lms-surface-muted lms-focus-ring grid w-full items-center gap-3.5 border-b px-4 py-[11px] text-left"
					style:grid-template-columns={COLS}
					onclick={() => onopen(row.id)}
				>
					<span class="flex min-w-0 items-center gap-2.5">
						<span
							class="bg-lms-interactive-subtle text-lms-interactive flex size-[34px] flex-none items-center justify-center rounded-full text-xs font-bold"
							>{row.initials}</span
						>
						<span class="flex min-w-0 flex-col gap-px">
							<span class="truncate text-sm font-semibold">{row.name}</span>
							<span class="text-lms-muted truncate font-mono text-[11px]">{row.code}</span>
						</span>
					</span>
					<span class="text-lms-muted truncate text-[13px]">{row.meta}</span>
					<span class="truncate text-[13px] {EXTRA_TONE[row.extraTone ?? 'default']}"
						>{row.extra}</span
					>
					<StatusPill tone={row.status.tone} label={row.status.label} />
				</button>
			{/each}
		</div>
	</div>
	{#if !rows.length}
		<div class="flex flex-col items-center gap-3 px-4 py-9 text-center">
			<span class="text-lms-muted text-sm">{emptyText}</span>
			{#if onimport && importLabel}
				<button
					type="button"
					class="lms-action-secondary lms-focus-ring inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold"
					onclick={onimport}><Icon icon={FileUp} size="sm" />{importLabel}</button
				>
			{/if}
		</div>
	{/if}
	<div class="text-lms-muted px-4 py-2.5 text-xs">{footNote}</div>
</div>
