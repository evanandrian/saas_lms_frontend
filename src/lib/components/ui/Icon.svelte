<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';

	type IconSize = 'sm' | 'md' | 'lg';

	interface Props {
		/** Komponen ikon dari `@lucide/svelte/icons/<nama>` (keputusan FE-04 D1). */
		icon: LucideIcon;
		size?: IconSize;
		/** Label aksesibel bila ikon membawa makna sendiri. Tanpa label: dekoratif (`aria-hidden`). */
		label?: string;
	}

	let { icon: IconComponent, size = 'md', label }: Props = $props();

	// Spesifikasi ikon FLIXARE (Brand Guidelines §10): grid 24, outline, stroke rounded 1,75 @24.
	const STROKE_WIDTH = 1.75;
	const SIZE_PX: Record<IconSize, number> = { sm: 16, md: 20, lg: 24 };
</script>

<IconComponent
	size={SIZE_PX[size]}
	strokeWidth={STROKE_WIDTH}
	aria-hidden={label ? undefined : 'true'}
	aria-label={label}
	role={label ? 'img' : undefined}
	focusable="false"
	class="shrink-0"
/>
