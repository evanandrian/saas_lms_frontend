<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import googleMark from '$lib/assets/third-party/google-g.svg';
	import type { WorkspaceArea } from '$lib/auth/access-context';
	import ColorModeToggle from '$lib/components/layout/ColorModeToggle.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import type { LucideIcon } from '@lucide/svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import ArrowBigUp from '@lucide/svelte/icons/arrow-big-up';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import ClipboardPen from '@lucide/svelte/icons/clipboard-pen';
	import CornerDownRight from '@lucide/svelte/icons/corner-down-right';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import FileText from '@lucide/svelte/icons/file-text';
	import Flame from '@lucide/svelte/icons/flame';
	import Info from '@lucide/svelte/icons/info';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import LockKeyhole from '@lucide/svelte/icons/lock-keyhole';
	import Mail from '@lucide/svelte/icons/mail';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import Ticket from '@lucide/svelte/icons/ticket';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const i18n = useI18n();
	const reasonId = $props.id();
	const MAIN_CONTENT_ID = 'main-content';
	const currentYear = new Date().getFullYear();

	/** Pratinjau panel brand per peran (referensi v3): nilai ilustrasi, bukan data. */
	const PREVIEW_ROLES = ['school', 'teacher', 'student', 'guardian'] as const;
	type PreviewRole = (typeof PREVIEW_ROLES)[number];
	type PreviewBadge = 'ok' | 'warn' | 'xp';
	const PREVIEW_META: Record<
		PreviewRole,
		{ progress: number; icon: LucideIcon; badge: PreviewBadge }
	> = {
		school: { progress: 95, icon: FileText, badge: 'warn' },
		teacher: { progress: 82, icon: ClipboardPen, badge: 'ok' },
		student: { progress: 72, icon: Flame, badge: 'xp' },
		guardian: { progress: 95, icon: NotebookPen, badge: 'warn' }
	};
	const PREVIEW_BADGE_CLASSES: Record<PreviewBadge, string> = {
		ok: 'bg-lms-progress/25 text-lms-on-hero-progress',
		warn: 'bg-warning-500/30 text-lms-on-hero',
		xp: 'bg-warning-400 text-lms-brand-deep-neutral'
	};
	const AREA_TO_PREVIEW: Partial<Record<WorkspaceArea, PreviewRole>> = {
		school_admin: 'school',
		teacher: 'teacher',
		student: 'student',
		guardian: 'guardian'
	};
	const PREVIEW_INTERVAL_MS = 6000;
	const EMAIL_PATTERN = /@.+\..+/;
	const MIN_SUGGESTION_LENGTH = 2;

	// Nilai awal dari hasil aksi gagal (email dipertahankan); selanjutnya dikelola lokal.
	// svelte-ignore state_referenced_locally
	let email = $state(form?.email ?? data.reauthEmail ?? '');
	let password = $state('');
	// Pengenalan akun hanya saat dev (keputusan FE-06); data dimuat server, produksi selalu null.
	const devAccounts = $derived(data.devAccounts);
	let isPasswordVisible = $state(false);
	let isCapsLockOn = $state(false);
	let phase = $state<'idle' | 'checking' | 'opening'>('idle');
	let loginError = $derived(form?.error ?? null);

	let previewRole = $state<PreviewRole>('teacher');
	let isPreviewPinned = $state(false);
	let isPreviewHeld = $state(false);
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	const typedEmail = $derived(email.trim().toLowerCase());
	const account = $derived(devAccounts?.find((item) => item.email === typedEmail) ?? null);
	const suggestion = $derived(
		!account && typedEmail.length >= MIN_SUGGESTION_LENGTH
			? (devAccounts?.find((item) => item.email.startsWith(typedEmail)) ?? null)
			: null
	);
	const isUnknownEmail = $derived(
		devAccounts !== null && !account && !suggestion && EMAIL_PATTERN.test(typedEmail)
	);
	const accountRole = $derived(account ? i18n.t(`auth.roles_lower.${account.area}`) : null);
	const submitLabel = $derived.by(() => {
		if (phase === 'checking') return i18n.t('auth.login.checking');
		if (phase === 'opening')
			return accountRole
				? i18n.t('auth.login.opening', { role: accountRole })
				: i18n.t('auth.login.opening_generic');
		return accountRole
			? i18n.t('auth.login.submit_as', { role: accountRole })
			: i18n.t('auth.login.submit');
	});
	const submitProgress = $derived(phase === 'checking' ? 45 : phase === 'opening' ? 100 : 0);

	// Akun dikenali → pratinjau peran yang sama dan rotasi berhenti.
	$effect(() => {
		const role = account ? AREA_TO_PREVIEW[account.area] : undefined;
		if (role) {
			previewRole = role;
			isPreviewPinned = true;
		}
	});

	// Rotasi otomatis pratinjau; berhenti saat dipilih, di-hover/fokus, atau prefers-reduced-motion (WCAG 2.2.2).
	const isPreviewRotating = $derived(!isPreviewPinned && !isPreviewHeld && !reducedMotion.current);
	$effect(() => {
		if (!isPreviewRotating) return;
		const current = previewRole;
		const timer = setTimeout(() => {
			previewRole =
				PREVIEW_ROLES[(PREVIEW_ROLES.indexOf(current) + 1) % PREVIEW_ROLES.length] ?? 'school';
		}, PREVIEW_INTERVAL_MS);
		return () => clearTimeout(timer);
	});

	function handleEmailKeydown(event: KeyboardEvent) {
		if (event.key === 'Tab' && !event.shiftKey && suggestion) {
			event.preventDefault();
			email = suggestion.email;
		}
	}

	function handleCapsLock(event: KeyboardEvent) {
		isCapsLockOn = event.getModifierState('CapsLock');
	}

	function handleClearAccount() {
		email = '';
		password = '';
		loginError = null;
	}

	function handleSelectPreview(role: PreviewRole) {
		previewRole = role;
		isPreviewPinned = true;
	}
</script>

<svelte:head>
	<title>{i18n.t('auth.login.title')}</title>
</svelte:head>

<a
	href={`#${MAIN_CONTENT_ID}`}
	class="btn lms-action-primary lms-focus-ring sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
>
	{i18n.t('common.shell.skip_to_content')}
</a>

<!-- Split layar penuh sesuai referensi FLIXARE App v3.html layar 01; panel brand hanya ≥ lg. -->
<div class="bg-lms-background text-lms-foreground grid min-h-dvh lg:grid-cols-2">
	<div class="flex min-w-0 flex-col gap-10 px-6 py-7 sm:px-10 xl:px-16">
		<header class="flex items-center justify-between gap-4">
			<BrandLogo expression="core" />
			<ColorModeToggle />
		</header>

		<main
			id={MAIN_CONTENT_ID}
			tabindex="-1"
			class="flex flex-1 items-center justify-center focus:outline-none"
		>
			<div class="flex w-full max-w-110 flex-col gap-5">
				<div class="flex flex-col gap-2.5">
					<h1 class="text-lms-h2 tracking-tight">{i18n.t('auth.login.title')}</h1>
					<p class="text-lms-muted">{i18n.t('auth.login.subtitle')}</p>
				</div>

				{#if data.sessionEnded}
					<p
						class="preset-tonal-warning text-lms-body-sm flex items-start gap-2.5 rounded-[10px] px-3.5 py-2.5 font-semibold"
						role="status"
					>
						<span class="mt-0.5 shrink-0"><Icon icon={Info} size="sm" /></span>
						{i18n.t(`auth.login.session_ended.${data.sessionEnded}`)}
					</p>
				{/if}
				<!-- Masuk dengan Google menunggu kontrak auth backend (BLOCKED-02). -->
				<p id={reasonId} class="sr-only">{i18n.t('auth.login.google_unavailable')}</p>
				<Button variant="outline" size="lg" width="full" disabled aria-describedby={reasonId}>
					<img src={googleMark} alt="" class="size-4.5" />
					{i18n.t('auth.login.google')}
				</Button>

				<p class="lms-text-caption flex items-center gap-3">
					<span class="bg-lms-border h-px flex-1" aria-hidden="true"></span>
					{i18n.t('auth.login.or_email')}
					<span class="bg-lms-border h-px flex-1" aria-hidden="true"></span>
				</p>

				<form
					method="POST"
					action="?/login"
					class="flex flex-col gap-5"
					use:enhance={() => {
						phase = 'checking';
						loginError = null;
						return async ({ result, update }) => {
							if (result.type === 'redirect') {
								phase = 'opening';
								await update();
							} else {
								phase = 'idle';
								await update({ reset: false });
							}
						};
					}}
				>
					<div class="flex flex-col gap-2.5">
						<TextField
							label={i18n.t('auth.login.email')}
							name="email"
							type="email"
							autocomplete="username"
							placeholder={i18n.t('auth.login.email_placeholder')}
							size="lg"
							icon={Mail}
							highlighted={account !== null}
							onkeydown={handleEmailKeydown}
							bind:value={email}
						>
							{#snippet trailing()}
								{#if account}
									<span
										class="bg-lms-interactive text-lms-on-interactive me-1.5 inline-flex size-5.5 items-center justify-center rounded-full"
										aria-hidden="true"
									>
										<Icon icon={Check} size="sm" />
									</span>
								{/if}
							{/snippet}
						</TextField>

						{#if suggestion}
							<button
								type="button"
								class="border-lms-input-border bg-lms-background lms-focus-ring text-lms-body-sm flex items-center gap-2.5 rounded-[10px] border border-dashed px-3 py-2 text-start"
								onclick={() => (email = suggestion.email)}
							>
								<span class="text-lms-muted"><Icon icon={CornerDownRight} size="sm" /></span>
								<span class="min-w-0 flex-1 truncate">
									{i18n.t('auth.login.continue_with')} <strong>{suggestion.email}</strong>
								</span>
								<kbd
									class="border-lms-input-border text-lms-muted rounded border px-1.5 font-mono text-[10px]"
									>TAB</kbd
								>
							</button>
						{/if}

						<div
							class={[
								'grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none',
								account ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
							]}
							aria-live="polite"
						>
							<div class="overflow-hidden">
								{#if account}
									<div
										class="lms-tone-info border-lms-interactive/30 flex items-center gap-3 rounded-xl border px-3.5 py-3"
									>
										<Avatar initials={account.initials} />
										<span class="flex min-w-0 flex-1 flex-col gap-0.5">
											<span class="text-lms-body-sm font-bold">{account.name}</span>
											<span class="text-lms-caption">
												{i18n.t('auth.login.recognized')} ·
												<strong>{i18n.t(`auth.roles.${account.area}`)}</strong> · {account.tenant}
											</span>
										</span>
										<button
											type="button"
											class="text-lms-link lms-focus-ring text-lms-caption font-semibold whitespace-nowrap"
											onclick={handleClearAccount}
										>
											{i18n.t('auth.login.not_you')}
										</button>
									</div>
								{/if}
							</div>
						</div>

						{#if isUnknownEmail}
							<p class="text-lms-caption text-lms-warning-text flex gap-2">
								<span class="mt-0.5 shrink-0"><Icon icon={Info} size="sm" /></span>
								{i18n.t('auth.login.unknown_email')}
							</p>
						{/if}
					</div>

					<div class="flex flex-col gap-2">
						<TextField
							label={i18n.t('auth.login.password')}
							name="password"
							type={isPasswordVisible ? 'text' : 'password'}
							autocomplete="current-password"
							placeholder={i18n.t('auth.login.password_placeholder')}
							size="lg"
							icon={LockKeyhole}
							autofocus={Boolean(data.reauthEmail) && !form}
							onkeydown={handleCapsLock}
							onkeyup={handleCapsLock}
							bind:value={password}
						>
							{#snippet labelAside()}
								<!-- Pemulihan kata sandi belum memiliki kontrak (BLOCKED-02): teks, bukan tautan. -->
								<span class="text-lms-body-sm text-lms-muted font-semibold">
									{i18n.t('auth.login.forgot_password')}
									<span class="sr-only">({i18n.t('common.workspace.not_available_yet')})</span>
								</span>
							{/snippet}
							{#snippet trailing()}
								<button
									type="button"
									class="btn-icon btn-icon-sm lms-action-ghost lms-focus-ring"
									aria-label={isPasswordVisible
										? i18n.t('auth.login.hide_password')
										: i18n.t('auth.login.show_password')}
									aria-pressed={isPasswordVisible}
									onclick={() => (isPasswordVisible = !isPasswordVisible)}
								>
									<Icon icon={isPasswordVisible ? EyeOff : Eye} size="sm" />
								</button>
							{/snippet}
						</TextField>
						{#if isCapsLockOn}
							<p
								class="text-lms-caption text-lms-warning-text flex items-center gap-2"
								role="status"
							>
								<Icon icon={ArrowBigUp} size="sm" />{i18n.t('auth.login.caps_lock')}
							</p>
						{/if}
					</div>

					<Checkbox label={i18n.t('auth.login.remember')} name="remember" />

					{#if loginError}
						<p
							class="preset-tonal-error text-lms-body-sm flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 font-semibold"
							role="alert"
						>
							<Icon icon={CircleAlert} size="sm" />{i18n.t(`auth.login.errors.${loginError}`)}
						</p>
					{/if}

					<input type="hidden" name="redirectTo" value={data.redirectTo ?? ''} />
					<button
						type="submit"
						class="lms-action-primary lms-focus-ring text-lms-body relative h-12.5 overflow-hidden rounded-[10px] font-semibold"
						disabled={phase !== 'idle'}
						aria-busy={phase !== 'idle'}
					>
						<span
							class="bg-lms-on-interactive/20 absolute inset-y-0 left-0 transition-[width] duration-700 motion-reduce:transition-none"
							style:width="{submitProgress}%"
							aria-hidden="true"
						></span>
						<span class="relative flex items-center justify-center gap-2">
							{submitLabel}
							<span class={phase === 'idle' ? '' : 'motion-safe:animate-spin'}>
								<Icon icon={phase === 'idle' ? ArrowRight : LoaderCircle} size="sm" />
							</span>
						</span>
					</button>
				</form>
			</div>
		</main>

		<footer class="text-lms-muted flex flex-wrap justify-between gap-x-4 gap-y-2 text-[0.8125rem]">
			<p>
				{i18n.t('auth.login.no_account')}
				<!-- URL absolut ke host publik dibangun server; rel="external" = navigasi dokumen penuh. -->
				<a
					href={data.registerUrl}
					rel="external"
					class="text-lms-link lms-focus-ring font-semibold"
				>
					{i18n.t('auth.login.register_link')}
				</a>
			</p>
			{#if data.showTryoutLink}
				<a href={resolve(APP_PATHS.JOIN)} class="text-lms-link lms-focus-ring font-semibold">
					{i18n.t('auth.login.tryout_link')}
				</a>
			{:else}
				<p>{i18n.t('auth.login.copyright', { year: currentYear })}</p>
			{/if}
		</footer>
	</div>

	<!-- Panel brand (referensi v3): gradient brand, watermark berputar saat akun dikenali, pratinjau per peran. -->
	<div class="hidden p-4 lg:flex">
		<section
			class="lms-hero-panel relative isolate flex min-h-150 flex-1 flex-col justify-between gap-10 overflow-hidden rounded-[1.75rem] p-10 xl:p-14"
			aria-label={i18n.t('brand.tagline')}
		>
			<img
				src={logogramColor}
				alt=""
				aria-hidden="true"
				draggable="false"
				class={[
					'pointer-events-none absolute -right-30 -bottom-27.5 -z-10 w-130 max-w-none opacity-7 transition-transform duration-800 select-none motion-reduce:transition-none',
					account && '-rotate-10 scale-104'
				]}
			/>
			<p class="text-lms-caption text-lms-on-hero-muted font-semibold tracking-[0.22em] uppercase">
				{i18n.t('brand.tagline')}
			</p>

			<div
				class="flex w-full max-w-110 flex-col gap-3 self-center"
				role="group"
				aria-label={i18n.t('auth.login.preview_label')}
				onmouseenter={() => (isPreviewHeld = true)}
				onmouseleave={() => (isPreviewHeld = false)}
				onfocusin={() => (isPreviewHeld = true)}
				onfocusout={() => (isPreviewHeld = false)}
			>
				{#key previewRole}
					{@const meta = PREVIEW_META[previewRole]}
					{@const copy = (key: string) => i18n.t(`auth.login.preview.${previewRole}.${key}`)}
					<div class="lms-hero-raised flex flex-col gap-3 px-5 py-4.5">
						<span class="text-lms-body-sm text-lms-on-hero-muted">{copy('label')}</span>
						<span class="flex items-baseline gap-2.5">
							<span class="text-lms-h2 font-bold tabular-nums">{copy('value')}</span>
							<span class="text-lms-caption font-semibold">{copy('note')}</span>
						</span>
						<span
							class="bg-lms-on-hero/15 block h-2 overflow-hidden rounded-full"
							aria-hidden="true"
						>
							<span class="bg-lms-progress block h-full rounded-full" style:width="{meta.progress}%"
							></span>
						</span>
					</div>
					<div class="lms-hero-raised ms-12 flex items-center gap-4 px-4.5 py-3.5">
						<span class="min-w-11.5 shrink-0 font-bold whitespace-nowrap tabular-nums"
							>{copy('time')}</span
						>
						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="font-bold">{copy('title')}</span>
							<span class="text-lms-caption text-lms-on-hero-muted truncate">{copy('sub')}</span>
						</span>
						<span
							class={[
								'text-lms-caption rounded-full px-2.5 py-1 font-bold whitespace-nowrap',
								PREVIEW_BADGE_CLASSES[meta.badge]
							]}>{copy('badge')}</span
						>
					</div>
					<div class="lms-hero-raised me-9 flex items-center gap-3.5 px-4.5 py-3.5">
						<span
							class="bg-lms-interactive/45 inline-flex size-10 shrink-0 items-center justify-center rounded-[10px]"
						>
							<Icon icon={meta.icon} />
						</span>
						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="font-bold">{copy('next_title')}</span>
							<span class="text-lms-caption text-lms-on-hero-muted truncate"
								>{copy('next_sub')}</span
							>
						</span>
					</div>
				{/key}
				<div class="mt-2.5 flex flex-wrap gap-2">
					{#each PREVIEW_ROLES as role (role)}
						<button
							type="button"
							class={[
								'lms-focus-ring text-lms-body-sm relative h-8.5 overflow-hidden rounded-full border px-3.5 font-semibold transition-colors',
								role === previewRole
									? 'bg-lms-on-hero text-lms-brand-deep-neutral border-transparent'
									: 'border-lms-on-hero/25 text-lms-on-hero hover:bg-lms-on-hero/10'
							]}
							aria-pressed={role === previewRole}
							onclick={() => handleSelectPreview(role)}
						>
							{#if role === previewRole && isPreviewRotating}
								{#key previewRole}
									<span
										class="bg-lms-progress absolute bottom-0 left-0 h-0.5 animate-[lms-grow_6s_linear_forwards]"
										aria-hidden="true"
									></span>
								{/key}
							{/if}
							<span class="relative">{i18n.t(`auth.login.preview.${role}.tab`)}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-5.5">
				<p class="text-lms-h2 xl:text-lms-h1 max-w-130 text-balance">{i18n.t('brand.promise')}</p>
				{#if data.showTryoutLink}
					<a
						href={resolve(APP_PATHS.JOIN)}
						class="lms-focus-ring border-lms-on-hero/30 hover:border-lms-on-hero/55 hover:bg-lms-on-hero/5 flex items-center gap-3.5 self-start rounded-[14px] border border-dashed py-2.5 ps-4 pe-3 transition-colors"
					>
						<span class="text-lms-on-hero-progress"><Icon icon={Ticket} /></span>
						<span class="flex flex-col">
							<span class="text-lms-body-sm font-bold">{i18n.t('auth.login.tryout_title')}</span>
							<span class="text-lms-caption text-lms-on-hero-muted">
								{i18n.t('auth.login.tryout_description')}
							</span>
						</span>
						<span
							class="bg-lms-on-hero text-lms-brand-deep-neutral ms-1.5 inline-flex size-7.5 items-center justify-center rounded-lg"
						>
							<Icon icon={ArrowRight} size="sm" />
						</span>
					</a>
				{/if}
			</div>
		</section>
	</div>
</div>
