<script lang="ts">
	interface Props {
		on: boolean;
		/** Terkunci (mis. email keamanan selalu aktif). */
		locked?: boolean;
	}

	let { on, locked = false }: Props = $props();
</script>

<!-- Sakelar referensi 40×22, kenop 16. Interaksi ditangani tombol induk. -->
<span
	class={[
		'relative block h-[22px] w-10 flex-none rounded-full transition-colors',
		on ? 'bg-lms-interactive' : 'bg-lms-border-strong',
		locked && 'opacity-55'
	]}
	aria-hidden="true"
>
	<span
		class={[
			'absolute top-[3px] left-[3px] size-4 rounded-full bg-lms-on-interactive transition-transform',
			on && 'translate-x-[18px]'
		]}
	></span>
</span>
