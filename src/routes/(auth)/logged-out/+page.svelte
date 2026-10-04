<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import coreWhite from '$lib/assets/brand/flixare-core-white.png';
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import ColorModeToggle from '$lib/components/layout/ColorModeToggle.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS, LOGIN_MODE_PARAM, LOGIN_MODES } from '$lib/utils/app-paths';
	import { initialsOf } from '$lib/utils/initials';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Lock from '@lucide/svelte/icons/lock';
	import Timer from '@lucide/svelte/icons/timer';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const REDIRECT_SECONDS = 10;
	const MINUTES_PER_HOUR = 60;
	const RING_LENGTH = 252;
	const CHECK_LENGTH = 50;

	let secondsLeft = $state(REDIRECT_SECONDS);
	let isPaused = $state(false);
	let isRevealed = $state(false);

	const notice = $derived(data.notice);
	const role = $derived(notice?.area ? i18n.t(`auth.roles_lower.${notice.area}`) : null);
	const greeting = $derived(
		!notice
			? i18n.t('auth.logged_out.greeting_generic')
			: role
				? i18n.t('auth.logged_out.greeting', { name: notice.name, role })
				: i18n.t('auth.logged_out.greeting_no_role', { name: notice.name })
	);
	const duration = $derived.by(() => {
		const minutes = notice?.durationMinutes;
		if (!minutes) return null;
		return minutes >= MINUTES_PER_HOUR
			? i18n.t('auth.logged_out.duration_hours', {
					hours: Math.floor(minutes / MINUTES_PER_HOUR),
					minutes: minutes % MINUTES_PER_HOUR
				})
			: i18n.t('auth.logged_out.duration_minutes', { minutes });
	});

	// Animasi masuk (centang & daftar) setelah hidrasi; tanpa animasi bila prefers-reduced-motion.
	$effect(() => {
		requestAnimationFrame(() => (isRevealed = true));
	});

	// Pengalihan otomatis 10 detik; dapat dijeda (WCAG 2.2.1).
	$effect(() => {
		if (isPaused) return;
		if (secondsLeft <= 0) {
			const base = resolve(APP_PATHS.LOGIN);
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(notice ? `${base}?${LOGIN_MODE_PARAM}=${LOGIN_MODES.REAUTH}` : base);
			return;
		}
		const timer = setTimeout(() => (secondsLeft -= 1), 1000);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>{i18n.t('auth.logged_out.page_title')}</title>
</svelte:head>

<!-- Struktur mengikuti referensi FLIXARE App v3.html layar 09 (Keluar). -->
<div class="lms-hero-screen relative isolate flex min-h-dvh flex-col overflow-hidden">
	<img
		src={logogramColor}
		alt=""
		aria-hidden="true"
		class={[
			'pointer-events-none absolute -right-40 -bottom-45 -z-10 w-160 max-w-none opacity-6 motion-safe:transition-transform motion-safe:duration-1400',
			isRevealed ? '-rotate-8 scale-100' : 'rotate-6 scale-88'
		]}
	/>
	<header class="flex items-center justify-between gap-4 px-5 py-7 md:px-16">
		<img src={coreWhite} alt="FLIXARE" class="h-7 w-auto object-contain" />
		<ColorModeToggle />
	</header>

	<main class="flex flex-1 items-center justify-center px-5 pt-3 pb-10">
		<div class="flex w-full max-w-130 flex-col gap-6.5">
			<svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
				<circle cx="44" cy="44" r="40" fill="none" class="stroke-lms-on-hero/15" stroke-width="4" />
				<circle
					cx="44"
					cy="44"
					r="40"
					fill="none"
					class="stroke-lms-on-hero-progress motion-safe:transition-[stroke-dashoffset] motion-safe:duration-800"
					stroke-width="4"
					stroke-linecap="round"
					transform="rotate(-90 44 44)"
					stroke-dasharray={RING_LENGTH}
					stroke-dashoffset={isRevealed ? 0 : RING_LENGTH}
				/>
				<path
					d="M28 45 L39 56 L61 33"
					fill="none"
					class="stroke-lms-on-hero motion-safe:transition-[stroke-dashoffset] motion-safe:delay-700 motion-safe:duration-450"
					stroke-width="5"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-dasharray={CHECK_LENGTH}
					stroke-dashoffset={isRevealed ? 0 : CHECK_LENGTH}
				/>
			</svg>

			<div class="flex flex-col gap-2.5">
				<h1 class="text-lms-h2 md:text-lms-h1 tracking-tight">{i18n.t('auth.logged_out.title')}</h1>
				<p class="text-lms-on-hero-muted text-lms-body">{greeting}</p>
			</div>

			<ul class="flex flex-col gap-2">
				{#each [{ icon: Lock, text: i18n.t('auth.logged_out.item_closed') }, ...(duration ? [{ icon: Timer, text: i18n.t( 'auth.logged_out.item_duration', { duration } ) }] : [])] as item, index (item.text)}
					<li
						class={[
							'border-lms-on-hero/10 bg-lms-on-hero/6 text-lms-body-sm flex items-center gap-3 rounded-xl border px-3.5 py-3 motion-safe:transition-[opacity,transform] motion-safe:duration-450',
							isRevealed
								? 'translate-y-0 opacity-100'
								: 'motion-safe:translate-y-3 motion-safe:opacity-0'
						]}
						style:transition-delay="{900 + index * 150}ms"
					>
						<span class="text-lms-on-hero-progress shrink-0"><Icon icon={item.icon} /></span>
						{item.text}
					</li>
				{/each}
			</ul>

			{#if notice}
				<div class="lms-hero-raised flex flex-wrap items-center gap-3.5 p-4">
					<span
						class="bg-lms-interactive inline-flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
						aria-hidden="true"
					>
						{initialsOf(notice.name)}
					</span>
					<span class="flex min-w-0 flex-[1_1_11rem] flex-col gap-0.5">
						<span class="font-bold">{notice.name}</span>
						{#if notice.email}
							<span class="text-lms-on-hero-muted truncate font-mono text-xs">{notice.email}</span>
						{/if}
					</span>
					<div class="flex flex-wrap gap-2">
						<a
							href="{resolve(APP_PATHS.LOGIN)}?{LOGIN_MODE_PARAM}={LOGIN_MODES.REAUTH}"
							class="btn bg-lms-on-hero text-lms-brand-deep-neutral lms-focus-ring h-10 gap-2 rounded-[10px] px-4 font-semibold"
						>
							{i18n.t('auth.logged_out.login_again')}<Icon icon={ArrowRight} size="sm" />
						</a>
						<a
							href="{resolve(APP_PATHS.LOGIN)}?{LOGIN_MODE_PARAM}={LOGIN_MODES.OTHER}"
							class="btn border-lms-on-hero/25 text-lms-on-hero hover:bg-lms-on-hero/10 lms-focus-ring h-10 rounded-[10px] border px-4 font-semibold"
						>
							{i18n.t('auth.logged_out.other_account')}
						</a>
					</div>
				</div>
			{:else}
				<div class="flex flex-wrap gap-2">
					<a
						href={resolve(APP_PATHS.LOGIN)}
						class="btn bg-lms-on-hero text-lms-brand-deep-neutral lms-focus-ring h-10 gap-2 rounded-[10px] px-4 font-semibold"
					>
						{i18n.t('auth.login.submit')}<Icon icon={ArrowRight} size="sm" />
					</a>
				</div>
			{/if}

			<div class="flex flex-col gap-2">
				<div class="text-lms-body-sm text-lms-on-hero-muted flex justify-between gap-3">
					<p aria-live="polite">
						{isPaused
							? i18n.t('auth.logged_out.redirect_paused')
							: i18n.t('auth.logged_out.redirect_in', { seconds: secondsLeft })}
					</p>
					<button
						type="button"
						class="text-lms-on-hero lms-focus-ring font-semibold underline"
						onclick={() => (isPaused = !isPaused)}
					>
						{isPaused ? i18n.t('auth.logged_out.resume') : i18n.t('auth.logged_out.stay')}
					</button>
				</div>
				<div class="bg-lms-on-hero/12 h-1 overflow-hidden rounded-full" aria-hidden="true">
					<div
						class="bg-lms-on-hero h-full rounded-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
						style:width="{(secondsLeft / REDIRECT_SECONDS) * 100}%"
					></div>
				</div>
			</div>
		</div>
	</main>

	<p
		class="text-lms-caption text-lms-on-hero-muted px-5 pb-10 font-semibold tracking-[0.22em] uppercase md:px-16"
	>
		{i18n.t('brand.tagline')}
	</p>
</div>
