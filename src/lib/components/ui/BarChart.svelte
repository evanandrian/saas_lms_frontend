<script lang="ts">
	export interface BarDatum {
		label: string;
		value: number;
		/** Teks nilai yang ditampilkan (sudah diformat pemakai). */
		display: string;
	}

	/**
	 * `last` = batang terakhir disorot (mis. hari ini); `muted-last` = batang terakhir redup (periode
	 * berjalan belum lengkap, referensi pendapatan bulanan); `none` = semua sama.
	 */
	type BarEmphasis = 'last' | 'muted-last' | 'none';
	type BarHeight = 'md' | 'lg';

	interface Props {
		/** Ringkasan untuk pembaca layar (caption tabel data). */
		caption: string;
		data: readonly BarDatum[];
		emphasis?: BarEmphasis;
		showValues?: boolean;
		/** Garis bantu horizontal (referensi: tiap 50px). */
		gridlines?: boolean;
		height?: BarHeight;
	}

	let {
		caption,
		data,
		emphasis = 'last',
		showValues = true,
		gridlines = false,
		height = 'md'
	}: Props = $props();

	const MIN_BAR_PERCENT = 4;
	const HEIGHT_CLASSES: Record<BarHeight, string> = { md: 'h-44', lg: 'h-52.5' };
	const max = $derived(Math.max(...data.map((d) => d.value), 0));
	const heightOf = (value: number) =>
		max > 0 ? Math.max(MIN_BAR_PERCENT, (value / max) * 100) : 0;

	function barClass(index: number): string {
		const isLast = index === data.length - 1;
		if (emphasis === 'last') return isLast ? 'bg-lms-interactive' : 'bg-lms-interactive-muted';
		if (emphasis === 'muted-last')
			return isLast ? 'bg-lms-interactive-muted' : 'bg-lms-interactive';
		return 'bg-lms-interactive';
	}
</script>

<figure class="min-w-0">
	<!-- Visual dekoratif; data yang sama tersedia dalam tabel sr-only. -->
	<div
		class={[
			'flex items-end gap-3.5 pt-2',
			HEIGHT_CLASSES[height],
			gridlines &&
				'bg-[repeating-linear-gradient(to_top,var(--color-lms-border)_0_1px,transparent_1px_50px)]'
		]}
		aria-hidden="true"
	>
		{#each data as datum, index (datum.label)}
			<div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
				{#if showValues}
					<span class="text-lms-caption font-semibold tabular-nums">{datum.display}</span>
				{/if}
				<span
					class={['w-full max-w-13 rounded-t-[10px] rounded-b-sm', barClass(index)]}
					style:height="{heightOf(datum.value)}%"
				></span>
				<span class="lms-text-caption truncate">{datum.label}</span>
			</div>
		{/each}
	</div>
	<!-- sr-only pada pembungkus: <table> mengabaikan width 1px sehingga dapat menyebabkan overflow horizontal. -->
	<div class="sr-only">
		<table>
			<caption>{caption}</caption>
			<tbody>
				{#each data as datum (datum.label)}
					<tr><th scope="row">{datum.label}</th><td>{datum.display}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</figure>
