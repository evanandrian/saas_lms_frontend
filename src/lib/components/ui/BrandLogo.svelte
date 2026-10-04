<script lang="ts">
	// Artwork FLIXARE dari Logo Set interim PNG (salinan byte-identik; wordmark berstatus interim, Brand Guidelines §19). JANGAN diganti teks, digambar ulang, diwarnai ulang,
	// atau diberi efek (Brand Guidelines §14). Varian White hanya untuk latar gelap.
	import coreColor from '$lib/assets/brand/flixare-core-color.png';
	import coreWhite from '$lib/assets/brand/flixare-core-white.png';
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import logogramWhite from '$lib/assets/brand/flixare-logogram-white.png';

	/**
	 * Ekspresi logo (Brand Guidelines §05): `core` = symbol + wordmark, `compact` = symbol saja,
	 * `responsive` = compact di layar sempit dan core mulai breakpoint `md`. Tagline tidak dipakai di product UI.
	 */
	type BrandLogoExpression = 'responsive' | 'core' | 'compact';

	/** Breakpoint perpindahan compact → core untuk `responsive` (default `md`, perilaku FE-03R). */
	type BrandLogoWideFrom = 'md' | 'lg';

	interface Props {
		expression?: BrandLogoExpression;
		wideFrom?: BrandLogoWideFrom;
	}

	let { expression = 'responsive', wideFrom = 'md' }: Props = $props();

	const BRAND_NAME = 'FLIXARE';
	const CORE_SIZE = { width: 3210, height: 900 } as const;
	const LOGOGRAM_SIZE = { width: 1720, height: 1800 } as const;
	// Sama dengan breakpoint Tailwind `md` (48rem) dan `lg` (64rem); tidak ada breakpoint baru.
	const MEDIA_WIDE_BY_BREAKPOINT: Record<BrandLogoWideFrom, string> = {
		md: '(min-width: 48rem)',
		lg: '(min-width: 64rem)'
	};
	/** Pasangan aset per tema; varian White dipilih oleh variant `dark` (mode pengguna atau OS, FE-05R). */
	const VARIANTS = [
		{ core: coreColor, logogram: logogramColor, visibility: 'dark:hidden' },
		{ core: coreWhite, logogram: logogramWhite, visibility: 'hidden dark:block' }
	] as const;

	const usesCoreFallback = $derived(expression === 'core');
	const mediaWide = $derived(MEDIA_WIDE_BY_BREAKPOINT[wideFrom]);
</script>

<!--
	Tinggi 28px: di atas minimum usulan (core 24px, symbol 16px — §06). Clear space ≈ 0,29 × tinggi symbol
	dipenuhi oleh padding/gap pemakai. Varian White tampil di mode gelap (pilihan pengguna atau OS); varian
	yang tidak aktif `display: none` sehingga tidak masuk pohon aksesibilitas.
-->
<!-- shrink-0 + object-contain: logo tidak boleh terdistorsi saat ruang header menyempit. -->
{#each VARIANTS as variant (variant.visibility)}
	<picture class={['shrink-0', variant.visibility]}>
		{#if expression === 'responsive'}
			<source media={mediaWide} srcset={variant.core} {...CORE_SIZE} />
		{/if}
		{#if usesCoreFallback}
			<img
				src={variant.core}
				alt={BRAND_NAME}
				{...CORE_SIZE}
				class="h-7 w-auto object-contain"
				decoding="async"
			/>
		{:else}
			<img
				src={variant.logogram}
				alt={BRAND_NAME}
				{...LOGOGRAM_SIZE}
				class="h-7 w-auto object-contain"
				decoding="async"
			/>
		{/if}
	</picture>
{/each}
