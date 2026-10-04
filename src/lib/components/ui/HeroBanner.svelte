<script lang="ts">
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import type { Snippet } from 'svelte';

	/**
	 * Posisi watermark persis referensi FLIXARE App.html (FE-05R):
	 * `corner` = kanan bawah (right -60, bottom -90, 340px); `top` = atas tengah (left 38%, top -60, 300px; layar guru).
	 */
	type HeroWatermark = 'corner' | 'top';
	/** `below` = aksi di bawah deskripsi; `end` = aksi sejajar kanan judul (layar platform). */
	type HeroActionsPlacement = 'below' | 'end';

	interface Props {
		/** Konteks kecil di atas judul (tanggal, semester). */
		eyebrow?: string;
		/** `status`: eyebrow mono huruf besar dengan titik status (layar platform). */
		eyebrowStatus?: 'ok' | 'warning';
		/** Lanjutan eyebrow (mis. jam berjalan), dipisah " · ". */
		eyebrowTrail?: Snippet;
		/** Judul halaman (h1). */
		title: string;
		description?: string;
		actions?: Snippet;
		actionsPlacement?: HeroActionsPlacement;
		/** Panel samping (mis. masa trial, agenda berikutnya). */
		aside?: Snippet;
		/** Baris tambahan di bawah judul (mis. kartu KPI kaca). */
		children?: Snippet;
		watermark?: HeroWatermark;
	}

	let {
		eyebrow,
		eyebrowStatus,
		eyebrowTrail,
		title,
		description,
		actions,
		actionsPlacement = 'below',
		aside,
		children,
		watermark = 'corner'
	}: Props = $props();

	const EYEBROW_SEPARATOR = ' · ';

	const WATERMARK_CLASSES: Record<HeroWatermark, string> = {
		corner: '-right-15 -bottom-22.5 w-85',
		top: 'left-[38%] -top-15 w-75'
	};
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<!--
	Hero produk sesuai referensi (FE-05R): gradient radial brand (`lms-hero`), radius 24px, watermark
	logogram berwarna 6% (dekoratif, `aria-hidden`, terpotong hero).
-->
<section
	class={[
		'lms-hero relative isolate grid items-center gap-6 overflow-hidden rounded-3xl p-5.5 md:p-8',
		aside && 'lg:grid-cols-2'
	]}
>
	<img
		src={logogramColor}
		alt=""
		aria-hidden="true"
		draggable="false"
		class={[
			'pointer-events-none absolute -z-10 max-w-none opacity-6 select-none',
			WATERMARK_CLASSES[watermark]
		]}
	/>
	<div
		class={[
			'flex min-w-0 flex-col gap-5',
			actionsPlacement === 'end' &&
				'md:flex-row md:flex-wrap md:items-end md:justify-between xl:flex-nowrap'
		]}
	>
		<div class={['flex min-w-0 flex-col gap-2.5', actionsPlacement === 'end' && 'xl:flex-1']}>
			{#if eyebrow}
				<p
					class={eyebrowStatus
						? 'text-lms-on-hero-muted flex items-center gap-2 font-mono text-xs tracking-[0.06em]'
						: 'text-lms-body-sm text-lms-on-hero-muted font-semibold'}
				>
					{#if eyebrowStatus}
						<span
							class={[
								'size-2 shrink-0 rounded-full ring-4',
								eyebrowStatus === 'ok'
									? 'bg-lms-progress ring-lms-progress/25'
									: 'bg-lms-on-hero-warning ring-lms-on-hero-warning/25'
							]}
							aria-hidden="true"
						></span>
					{/if}
					{eyebrow}{#if eyebrowTrail}{EYEBROW_SEPARATOR}{@render eyebrowTrail()}{/if}
				</p>
			{/if}
			<h1 class="text-lms-h3 md:text-lms-h2 tracking-tight">{title}</h1>
			{#if description}
				<!-- 15/23px sesuai referensi v3. -->
				<p
					class={[
						'text-lms-on-hero-muted text-[0.9375rem] leading-[1.4375rem]',
						aside && 'max-w-110'
					]}
				>
					{description}
				</p>
			{/if}
		</div>
		{#if actions}
			<div
				class={[
					'flex flex-wrap items-center gap-2',
					actionsPlacement === 'below' ? 'pt-1' : 'flex-none'
				]}
			>
				{@render actions()}
			</div>
		{/if}
	</div>
	{#if aside}
		<div class="min-w-0">{@render aside()}</div>
	{/if}
	{#if children}
		<div class="min-w-0">{@render children()}</div>
	{/if}
</section>
