<script lang="ts">
	export type HeatLevel = 'high' | 'mid' | 'low' | 'none';

	export interface HeatCell {
		/** Teks utama sel (angka/hari) — selalu tampil, sehingga makna tidak bergantung warna. */
		label: string;
		/** Teks kecil di bawah label (mis. kode presensi). */
		sub?: string;
		/** Tingkat ditentukan oleh data/pemakai, bukan komponen. */
		level: HeatLevel;
		/** Sorot sel (mis. hari ini). */
		emphasized?: boolean;
	}

	export interface HeatRow {
		header: string;
		cells: readonly (HeatCell | null)[];
		emphasized?: boolean;
	}

	export interface HeatLegendItem {
		level: HeatLevel;
		label: string;
	}

	interface Props {
		caption: string;
		columns: readonly string[];
		rows: readonly HeatRow[];
		legend?: readonly HeatLegendItem[];
		/** Sembunyikan header baris (mis. kalender). */
		hideRowHeaders?: boolean;
	}

	let { caption, columns, rows, legend, hideRowHeaders = false }: Props = $props();

	const LEVEL_CLASSES: Record<HeatLevel, string> = {
		high: 'lms-scale-high',
		mid: 'lms-scale-mid',
		low: 'lms-scale-low',
		none: 'border border-dashed border-lms-input-border'
	};
</script>

<div class="min-w-0 space-y-3">
	<!-- Tabel semantik dengan scroll horizontal terkendali agar halaman tidak overflow. -->
	<div class="overflow-x-auto">
		<table class="w-full border-separate border-spacing-1 text-center">
			<caption class="sr-only">{caption}</caption>
			<thead>
				<tr>
					<td class={hideRowHeaders ? 'w-0 p-0' : undefined}></td>
					{#each columns as column (column)}
						<th scope="col" class="lms-text-caption px-1 font-normal">{column}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.header)}
					<tr>
						<!-- Header baris yang disembunyikan tetap ada untuk pembaca layar, tanpa memakan lebar kolom. -->
						<th
							scope="row"
							class={[
								'text-lms-body-sm text-start whitespace-nowrap',
								row.emphasized ? 'font-semibold' : 'font-normal',
								hideRowHeaders ? 'w-0 p-0' : 'w-24 pe-3'
							]}
						>
							<span class={hideRowHeaders ? 'sr-only' : undefined}>{row.header}</span>
						</th>
						{#each row.cells as cell, index (index)}
							{#if cell}
								<td
									class={[
										'text-lms-body-sm min-w-12 rounded-base px-2 py-1.5 font-semibold',
										LEVEL_CLASSES[cell.level],
										cell.emphasized && 'outline-lms-interactive outline-2 -outline-offset-2'
									]}
								>
									{cell.label}
									{#if cell.sub}<span class="block text-lms-caption">{cell.sub}</span>{/if}
								</td>
							{:else}
								<td></td>
							{/if}
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if legend?.length}
		<ul class="lms-text-caption flex flex-wrap gap-4">
			{#each legend as item (item.label)}
				<li class="flex items-center gap-1.5">
					<span class={['size-3 rounded-sm', LEVEL_CLASSES[item.level]]} aria-hidden="true"></span>
					{item.label}
				</li>
			{/each}
		</ul>
	{/if}
</div>
