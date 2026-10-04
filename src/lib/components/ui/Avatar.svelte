<script lang="ts">
	type AvatarSize = 'sm' | 'md';
	type AvatarTone = 'brand' | 'subtle' | 'deep';
	/** `rounded` = persegi membulat (inisial lembaga/pengajuan di referensi). */
	type AvatarShape = 'circle' | 'rounded';

	interface Props {
		/** Inisial (maks. 2 huruf). */
		initials: string;
		size?: AvatarSize;
		tone?: AvatarTone;
		shape?: AvatarShape;
		/** Label aksesibel bila nama tidak tampil di dekatnya; tanpa label, avatar dekoratif. */
		label?: string;
	}

	let { initials, size = 'md', tone = 'brand', shape = 'circle', label }: Props = $props();

	const SIZE_CLASSES: Record<AvatarSize, string> = {
		sm: 'size-8 text-lms-caption',
		md: 'size-10 text-lms-body-sm'
	};
	const TONE_CLASSES: Record<AvatarTone, string> = {
		brand: 'lms-action-primary',
		subtle: 'lms-tone-info',
		// Avatar pengguna di header (referensi): Deep Neutral + putih (14.69:1).
		deep: 'bg-lms-brand-deep-neutral text-lms-on-hero'
	};
</script>

<span
	class={[
		'inline-flex shrink-0 items-center justify-center font-semibold',
		shape === 'circle' ? 'rounded-full' : 'rounded-xl',
		SIZE_CLASSES[size],
		TONE_CLASSES[tone]
	]}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	{initials.slice(0, 2)}
</span>
