<script lang="ts">
	import { resolve } from '$app/paths';
	import coreWhite from '$lib/assets/brand/flixare-core-white.png';
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import ColorModeToggle from '$lib/components/layout/ColorModeToggle.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { runPageAction } from '$lib/utils/page-action';
	import type {
		ExamParticipant,
		ExamSessionPublic
	} from '$lib/features/exam-sessions/exam-sessions.model';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Info from '@lucide/svelte/icons/info';
	import Layers from '@lucide/svelte/icons/layers';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Timer from '@lucide/svelte/icons/timer';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const MAIN_CONTENT_ID = 'main-content';
	const CODE_LENGTH = 6;
	const CODE_SLOTS = Array.from({ length: CODE_LENGTH }, (_, index) => index);
	const MIN_NAME_LENGTH = 3;
	const MIN_CONTACT_LENGTH = 6;
	const CHECK_KEYS = ['connection', 'alone', 'timer'] as const;
	const COUNTDOWN_SECONDS = 3;
	const BARCODE_BARS = 28;
	const SECONDS_PER_HOUR = 3600;
	const SECONDS_PER_MINUTE = 60;
	const formId = $props.id();

	let code = $state('');
	let isCodeFocused = $state(false);
	let name = $state('');
	let contact = $state('');
	let school = $state('');
	let checks = $state<Record<(typeof CHECK_KEYS)[number], boolean>>({
		connection: false,
		alone: false,
		timer: false
	});
	let now = $state(Date.now());
	/** null = belum mulai; 0..2 = hitung mundur; 3 = mulai. */
	let elapsed = $state<number | null>(null);
	let overlay = $state<HTMLElement | null>(null);

	let found = $state<ExamSessionPublic | null>(null);
	let lookup = $state<'idle' | 'checking' | 'not_found' | 'unavailable' | 'closed'>('idle');
	let participant = $state<ExamParticipant | null>(null);
	let joinError = $state<string | null>(null);
	let joining = $state(false);

	const isComplete = $derived(code.length === CODE_LENGTH);
	const session = $derived(
		isComplete && found?.code === code && found.status === 'open' ? found : null
	);
	const isLookupUnavailable = $derived(lookup === 'unavailable');
	const isInvalid = $derived(isComplete && (lookup === 'not_found' || lookup === 'closed'));
	const timeFormat = $derived(
		new Intl.DateTimeFormat(i18n.locale === 'en' ? 'en-US' : 'id-ID', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: found?.timezone || 'Asia/Jakarta'
		})
	);
	const zoneLabel = $derived(
		(
			{ 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' } as Record<
				string,
				string
			>
		)[found?.timezone ?? ''] ?? ''
	);
	const windowLabel = $derived(
		session
			? i18n.t('auth.join.window', {
					start: timeFormat.format(new Date(session.opens_at)),
					end: timeFormat.format(new Date(session.closes_at)),
					zone: zoneLabel
				})
			: ''
	);
	const closesLabel = $derived(
		session
			? i18n.t('auth.join.closes_label', {
					time: timeFormat.format(new Date(session.closes_at)),
					zone: zoneLabel
				})
			: ''
	);

	// Kode lengkap → cari sesi di backend (direktori kode sesi lintas penyelenggara).
	$effect(() => {
		if (!isComplete) {
			found = null;
			lookup = 'idle';
			return;
		}
		const typed = code;
		lookup = 'checking';
		void runPageAction<ExamSessionPublic>('lookup', { code: typed }).then((result) => {
			if (code !== typed) return;
			if (result.ok) {
				found = result.data;
				lookup = result.data.status === 'open' ? 'idle' : 'closed';
			} else {
				found = null;
				lookup = result.reason === 'not_found' ? 'not_found' : 'unavailable';
			}
		});
	});
	const hasParticipantData = $derived(
		name.trim().length >= MIN_NAME_LENGTH && contact.trim().length >= MIN_CONTACT_LENGTH
	);
	const allChecked = $derived(CHECK_KEYS.every((key) => checks[key]));
	const isReady = $derived(session !== null && hasParticipantData && allChecked);

	// Nomor peserta diterbitkan backend saat bergabung (urutan per sesi).
	const participantNumber = $derived(participant?.number ?? null);
	const barcode = $derived.by(() => {
		const seed = participantNumber ?? code ?? 'FLIXARE';
		return Array.from({ length: BARCODE_BARS }, (_, index) => {
			const charCode = seed.charCodeAt(index % Math.max(seed.length, 1)) || 70;
			return ((charCode * (index + 3)) % 3) + 1;
		});
	});

	const closesIn = $derived.by(() => {
		if (!session) return '';
		const closeTime = new Date(session.closes_at).getTime();
		const seconds = Math.max(0, Math.floor((closeTime - now) / 1000));
		const pad = (value: number) => String(value).padStart(2, '0');
		return [
			Math.floor(seconds / SECONDS_PER_HOUR),
			Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
			seconds % SECONDS_PER_MINUTE
		]
			.map(pad)
			.join(':');
	});

	const status = $derived.by(() => {
		if (elapsed !== null) return 'running';
		if (isReady) return 'ready';
		if (session) return 'data';
		return 'waiting';
	});
	const startLabel = $derived(
		isReady
			? i18n.t('auth.join.start')
			: !session
				? i18n.t('auth.join.start_need_code')
				: !hasParticipantData
					? i18n.t('auth.join.start_need_data')
					: i18n.t('auth.join.start_need_checks')
	);

	$effect(() => {
		if (!session) return;
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	// Hitung mundur 3-2-1 lalu "Selamat mengerjakan" (simulasi tampilan; pengerjaan soal belum ada).
	$effect(() => {
		if (elapsed === null || elapsed >= COUNTDOWN_SECONDS) return;
		const timer = setTimeout(() => (elapsed = (elapsed ?? 0) + 1), 1000);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (elapsed !== null) overlay?.focus();
	});

	function handleCodeInput(event: Event & { currentTarget: HTMLInputElement }) {
		code = event.currentTarget.value
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
			.slice(0, CODE_LENGTH);
		event.currentTarget.value = code;
	}

	// Bergabung (nomor peserta & kuota dicek backend, BR-43) lalu mulai waktu pengerjaan (BR-40).
	async function handleStart(event: SubmitEvent) {
		event.preventDefault();
		if (!isReady || joining) return;
		joining = true;
		joinError = null;
		const joined =
			participant ??
			(await runPageAction<ExamParticipant>('join', {
				code,
				name: name.trim(),
				contact: contact.trim(),
				school: school.trim(),
				consents: CHECK_KEYS.map((key) => checks[key])
			}).then((result) => {
				if (result.ok) return result.data;
				joinError =
					result.code === 'SESSION_FULL'
						? 'full'
						: result.code === 'session_closed'
							? 'closed'
							: 'failed';
				return null;
			}));
		if (joined) {
			participant = joined;
			const started = await runPageAction<ExamParticipant>('start', {
				code,
				participantId: joined.id
			});
			if (started.ok) {
				participant = started.data;
				elapsed = 0;
			} else {
				joinError = 'failed';
			}
		}
		joining = false;
	}

	function boxClass(index: number): string {
		if (session) return 'border-lms-progress bg-lms-progress/10';
		if (isInvalid) return 'border-error-500 bg-error-500/5';
		if (isCodeFocused && index === Math.min(code.length, CODE_LENGTH - 1))
			return 'border-lms-interactive bg-lms-surface';
		return code[index]
			? 'border-lms-input-border bg-lms-surface'
			: 'border-lms-border bg-lms-surface';
	}

	function stepClass(state: 'done' | 'active' | 'pending'): string {
		if (state === 'done') return 'bg-lms-progress text-lms-on-interactive';
		if (state === 'active') return 'bg-lms-foreground text-lms-background';
		return 'bg-lms-input-border text-lms-surface';
	}
</script>

<svelte:head>
	<title>{i18n.t('auth.join.page_title')}</title>
</svelte:head>

<a
	href={`#${MAIN_CONTENT_ID}`}
	class="btn lms-action-primary lms-focus-ring sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
>
	{i18n.t('common.shell.skip_to_content')}
</a>

<!-- Struktur mengikuti referensi FLIXARE App v3.html layar 01b (peserta ujian terbuka). -->
<div class="bg-lms-background text-lms-foreground flex min-h-dvh flex-col">
	<header
		class="border-lms-border bg-lms-surface flex min-h-17 flex-wrap items-center justify-between gap-4 border-b px-4 py-3 md:px-8"
	>
		<div class="flex items-center gap-3.5">
			<BrandLogo expression="core" />
			<span
				class="border-lms-input-border text-lms-muted border-s ps-3.5 font-mono text-[11px] tracking-[0.14em] uppercase"
			>
				{i18n.t('auth.join.header_tag')}
			</span>
		</div>
		<div class="flex items-center gap-4">
			<p class="text-lms-body-sm text-lms-muted">
				{i18n.t('auth.join.have_account')}
				<a href={resolve(APP_PATHS.LOGIN)} class="text-lms-link lms-focus-ring font-semibold">
					{i18n.t('auth.join.sign_in')}
				</a>
			</p>
			<ColorModeToggle />
		</div>
	</header>

	<main
		id={MAIN_CONTENT_ID}
		tabindex="-1"
		class="mx-auto flex w-full max-w-280 flex-1 flex-wrap items-start gap-8 px-5 pt-10 pb-20 focus:outline-none"
	>
		<form
			id={formId}
			class="flex min-w-0 flex-[1_1_35rem] flex-col gap-4"
			onsubmit={handleStart}
			novalidate
		>
			<div class="mb-2 flex flex-col gap-2">
				<p class="text-lms-link font-mono text-xs font-semibold tracking-[0.16em] uppercase">
					{i18n.t('auth.join.eyebrow')}
				</p>
				<h1 class="text-lms-h2 tracking-tight">{i18n.t('auth.join.title')}</h1>
				<p class="text-lms-muted max-w-130">{i18n.t('auth.join.description')}</p>
			</div>

			<!-- Langkah 1: kode sesi -->
			<section class="border-lms-border bg-lms-surface flex flex-col gap-4 rounded-xl border p-5">
				<div class="flex items-center gap-3">
					<span
						class={[
							'text-lms-body-sm inline-flex size-7 items-center justify-center rounded-full font-bold',
							stepClass(session ? 'done' : 'active')
						]}
						aria-hidden="true"
					>
						{#if session}<Icon icon={Check} size="sm" />{:else}1{/if}
					</span>
					<h2 class="flex-1 font-bold">{i18n.t('auth.join.step_code')}</h2>
					<span
						class={[
							'text-lms-caption font-semibold',
							session
								? 'text-lms-progress-text'
								: isInvalid
									? 'text-lms-danger-text'
									: 'text-lms-muted'
						]}
					>
						{session
							? i18n.t('auth.join.chip_found')
							: isInvalid
								? i18n.t('auth.join.chip_invalid')
								: i18n.t('auth.join.chip_count', { count: code.length })}
					</span>
				</div>
				<label
					class="has-focus-visible:outline-lms-focus relative block cursor-text rounded-xl has-focus-visible:outline-2 has-focus-visible:outline-offset-4"
				>
					<span class="grid grid-cols-6 gap-2" aria-hidden="true">
						{#each CODE_SLOTS as index (index)}
							<span
								class={[
									'flex h-17 items-center justify-center rounded-xl border-2 font-mono text-3xl font-semibold transition-colors',
									boxClass(index)
								]}
							>
								{code[index] ?? ''}
								{#if isCodeFocused && !session && index === code.length}
									<span class="bg-lms-interactive h-7.5 w-0.5 motion-safe:animate-pulse"></span>
								{/if}
							</span>
						{/each}
					</span>
					<input
						value={code}
						oninput={handleCodeInput}
						onfocus={() => (isCodeFocused = true)}
						onblur={() => (isCodeFocused = false)}
						maxlength={CODE_LENGTH}
						autocomplete="off"
						autocapitalize="characters"
						spellcheck="false"
						aria-label={i18n.t('auth.join.code_label')}
						aria-describedby={`${formId}-code-message`}
						class="absolute inset-0 h-full w-full cursor-text text-base opacity-0"
					/>
				</label>
				<div class="text-lms-body-sm flex flex-wrap justify-between gap-3">
					<p
						id={`${formId}-code-message`}
						class={[
							'flex items-center gap-2',
							session
								? 'text-lms-progress-text'
								: isInvalid
									? 'text-lms-danger-text'
									: 'text-lms-muted'
						]}
						aria-live="polite"
					>
						<Icon icon={session ? CircleCheck : isInvalid ? CircleX : Info} size="sm" />
						{session
							? i18n.t('auth.join.msg_found')
							: isInvalid
								? i18n.t(lookup === 'closed' ? 'auth.join.msg_closed' : 'auth.join.msg_not_found')
								: isComplete && isLookupUnavailable
									? i18n.t('auth.join.msg_unavailable')
									: lookup === 'checking'
										? i18n.t('auth.join.msg_checking')
										: i18n.t('auth.join.msg_hint')}
					</p>
					{#if data.exampleCode}
						{@const sample = data.exampleCode}
						<p class="text-lms-muted">
							{i18n.t('auth.join.example')}
							<button
								type="button"
								class="text-lms-link lms-focus-ring font-mono font-semibold"
								onclick={() => (code = sample)}
							>
								{sample}
							</button>
						</p>
					{/if}
				</div>
			</section>

			<!-- Langkah 2: detail sesi -->
			<section
				class={[
					'border-lms-border bg-lms-surface flex flex-col gap-4 rounded-xl border p-5 transition-opacity',
					!session && 'opacity-85'
				]}
			>
				<div class="flex items-center gap-3">
					<span
						class={[
							'text-lms-body-sm inline-flex size-7 items-center justify-center rounded-full font-bold',
							stepClass(session ? 'active' : 'pending')
						]}
						aria-hidden="true">2</span
					>
					<h2 class="font-bold">{i18n.t('auth.join.step_details')}</h2>
				</div>
				{#if session}
					<div class="flex flex-col gap-3.5">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="text-lms-h4">{session.title}</p>
								<p class="lms-text-helper">{session.organizer} · {windowLabel}</p>
							</div>
							<span
								class="lms-tone-success flex items-center gap-2 rounded-full px-2.5 py-1.5 font-mono text-xs font-semibold uppercase"
							>
								<span class="bg-lms-progress size-2 rounded-full"></span>
								{i18n.t('auth.join.closes_in', { time: closesIn })}
							</span>
						</div>
						<ul class="text-lms-body-sm flex flex-wrap gap-4.5 font-semibold">
							<li class="flex items-center gap-1.5">
								<span class="text-lms-interactive"><Icon icon={Timer} size="sm" /></span>
								{i18n.t('auth.join.minutes', { count: session.duration_minutes })}
							</li>
							<li class="flex items-center gap-1.5">
								<span class="text-lms-interactive"><Icon icon={ListChecks} size="sm" /></span>
								{i18n.t('auth.join.questions', { count: session.question_count })}
							</li>
							<li class="flex items-center gap-1.5">
								<span class="text-lms-interactive"><Icon icon={Layers} size="sm" /></span>
								{i18n.t('auth.join.subtests', { count: session.sections.length })}
							</li>
						</ul>
						<ol class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{#each session.sections as subtest, index (subtest.name)}
								<li
									class="border-lms-border text-lms-body-sm flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5"
								>
									<span class="text-lms-muted font-mono text-[11px]"
										>{String(index + 1).padStart(2, '0')}</span
									>
									<span class="flex-1">{subtest.name}</span>
									<span class="text-lms-muted font-mono text-[11px]">{subtest.minutes}'</span>
								</li>
							{/each}
						</ol>
					</div>
				{:else}
					<p class="lms-text-helper">{i18n.t('auth.join.details_pending')}</p>
				{/if}
			</section>

			<!-- Langkah 3: data peserta -->
			<fieldset
				class={[
					'border-lms-border bg-lms-surface flex flex-col gap-4.5 rounded-xl border p-5 transition-opacity',
					!session && 'opacity-85'
				]}
				disabled={!session}
			>
				<legend class="contents">
					<span class="flex items-center gap-3">
						<span
							class={[
								'text-lms-body-sm inline-flex size-7 items-center justify-center rounded-full font-bold',
								stepClass(isReady ? 'done' : session ? 'active' : 'pending')
							]}
							aria-hidden="true">3</span
						>
						<span class="font-bold">{i18n.t('auth.join.step_participant')}</span>
					</span>
				</legend>
				<div class="grid gap-3.5 sm:grid-cols-2">
					<label class="flex flex-col gap-1.5 sm:col-span-2">
						<span class="text-lms-muted text-[11px] font-bold tracking-widest uppercase">
							{i18n.t('auth.join.name')}
						</span>
						<input
							bind:value={name}
							name="name"
							autocomplete="name"
							required
							placeholder={i18n.t('auth.join.name_placeholder')}
							class="input lms-input lms-focus-ring h-11"
						/>
					</label>
					<label class="flex flex-col gap-1.5">
						<span class="text-lms-muted text-[11px] font-bold tracking-widest uppercase">
							{i18n.t('auth.join.contact')}
						</span>
						<input
							bind:value={contact}
							name="contact"
							required
							placeholder={i18n.t('auth.join.contact_placeholder')}
							class="input lms-input lms-focus-ring h-11"
						/>
					</label>
					<label class="flex flex-col gap-1.5">
						<span class="text-lms-muted text-[11px] font-bold tracking-widest uppercase">
							{i18n.t('auth.join.school')}
							<span class="font-normal tracking-normal normal-case"
								>{i18n.t('auth.join.optional')}</span
							>
						</span>
						<input
							bind:value={school}
							name="school"
							autocomplete="organization"
							placeholder={i18n.t('auth.join.school_placeholder')}
							class="input lms-input lms-focus-ring h-11"
						/>
					</label>
				</div>
				<div class="flex flex-col gap-2">
					<p class="text-lms-muted text-[11px] font-bold tracking-widest uppercase">
						{i18n.t('auth.join.before_start')}
					</p>
					{#each CHECK_KEYS as key (key)}
						<label
							class={[
								'text-lms-body-sm has-focus-visible:outline-lms-focus flex cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
								checks[key]
									? 'border-lms-progress/40 bg-lms-progress/7'
									: 'border-lms-border bg-lms-surface'
							]}
						>
							<input type="checkbox" class="sr-only" bind:checked={checks[key]} />
							<span
								class={[
									'inline-flex size-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px]',
									checks[key]
										? 'border-lms-progress bg-lms-progress text-lms-on-interactive'
										: 'border-lms-input-border'
								]}
								aria-hidden="true"
							>
								{#if checks[key]}<Icon icon={Check} size="sm" />{/if}
							</span>
							{i18n.t(`auth.join.checks.${key}`)}
						</label>
					{/each}
				</div>
				<button
					type="submit"
					class={[
						'lms-focus-ring flex h-13 items-center justify-center gap-2.5 rounded-xl text-base font-bold transition-colors',
						isReady
							? 'lms-action-primary'
							: 'bg-lms-surface-muted text-lms-muted cursor-not-allowed'
					]}
					aria-disabled={!isReady || joining}
					aria-busy={joining}
				>
					{startLabel}<Icon icon={ArrowRight} size="sm" />
				</button>
				{#if joinError}
					<p class="text-lms-danger-text flex items-center gap-2 text-sm" role="alert">
						<Icon icon={CircleX} size="sm" />{i18n.t(`auth.join.error_${joinError}`)}
					</p>
				{/if}
			</fieldset>
		</form>

		<!-- Tiket peserta: nomor diterbitkan backend saat bergabung -->
		<aside class="sticky top-6 flex min-w-70 flex-[0_1_21.25rem] flex-col gap-3.5">
			<p class="text-lms-muted font-mono text-[11px] tracking-[0.16em] uppercase">
				{i18n.t('auth.join.ticket_caption')}
			</p>
			<div
				class={[
					'bg-lms-hero text-lms-on-hero rounded-[20px] shadow-2xl motion-safe:transition-transform motion-safe:duration-400',
					isReady || elapsed !== null ? 'rotate-0' : session ? '-rotate-1' : '-rotate-2'
				]}
			>
				<div class="relative flex flex-col gap-4.5 overflow-hidden rounded-t-[20px] p-6">
					<img
						src={logogramColor}
						alt=""
						aria-hidden="true"
						class="pointer-events-none absolute -top-12.5 -right-15 w-55 max-w-none opacity-8"
					/>
					<div class="relative flex items-center justify-between">
						<img src={coreWhite} alt="FLIXARE" class="h-5 w-auto object-contain" />
						<span class="text-lms-on-hero-muted font-mono text-[10px] tracking-[0.16em] uppercase">
							{i18n.t('auth.join.ticket_admit')}
						</span>
					</div>
					<div class="relative flex flex-col gap-1">
						<span class="text-lms-on-hero-muted font-mono text-[10px] tracking-[0.14em] uppercase">
							{i18n.t('auth.join.ticket_session')}
						</span>
						<span class="text-lms-h4 font-bold">
							{session?.title ?? i18n.t('auth.join.ticket_waiting')}
						</span>
						<span class="text-lms-caption text-lms-on-hero-muted">
							{session
								? `${session.organizer} · ${closesLabel}`
								: i18n.t('auth.join.ticket_waiting_org')}
						</span>
					</div>
					<dl class="relative grid grid-cols-2 gap-3.5">
						{#each [{ key: 'ticket_name', value: name.trim() }, { key: 'ticket_contact', value: contact.trim() }, { key: 'ticket_number', value: participantNumber }, { key: 'ticket_duration', value: session ? i18n.t( 'auth.join.minutes', { count: session.duration_minutes } ) : null }] as row (row.key)}
							<div class="flex min-w-0 flex-col gap-0.5">
								<dt
									class="text-lms-on-hero-muted font-mono text-[10px] tracking-[0.12em] uppercase"
								>
									{i18n.t(`auth.join.${row.key}`)}
								</dt>
								<dd
									class={[
										'text-lms-body-sm truncate font-semibold',
										!row.value && 'text-lms-on-hero-muted'
									]}
								>
									{row.value || '—'}
								</dd>
							</div>
						{/each}
					</dl>
				</div>
				<div
					class="border-lms-on-hero/25 relative mx-4.5 h-0 border-t-2 border-dashed"
					aria-hidden="true"
				>
					<span class="bg-lms-background absolute -top-3 -left-7.5 size-6 rounded-full"></span>
					<span class="bg-lms-background absolute -top-3 -right-7.5 size-6 rounded-full"></span>
				</div>
				<div class="flex items-center justify-between gap-3 px-6 pt-4.5 pb-5.5">
					<span class="flex flex-col gap-0.5">
						<span class="text-lms-on-hero-muted font-mono text-[10px] tracking-[0.12em] uppercase">
							{i18n.t('auth.join.ticket_status')}
						</span>
						<span
							class={[
								'font-mono text-[13px] font-semibold uppercase',
								status === 'waiting'
									? 'text-lms-on-hero-muted'
									: status === 'data'
										? 'text-warning-300'
										: 'text-lms-on-hero-progress'
							]}
						>
							{i18n.t(`auth.join.status_${status}`)}
						</span>
					</span>
					<span class="flex h-8.5 gap-0.5" aria-hidden="true">
						{#each barcode as width, index (index)}
							<span class="bg-lms-on-hero opacity-85" style:width="{width}px"></span>
						{/each}
					</span>
				</div>
			</div>
			<p class="text-lms-caption text-lms-muted">{i18n.t('auth.join.ticket_note')}</p>
		</aside>
	</main>
</div>

{#if elapsed !== null && session}
	<div
		bind:this={overlay}
		class="lms-hero-screen fixed inset-0 z-90 flex flex-col items-center justify-center gap-4.5 overflow-hidden p-6 text-center focus:outline-none"
		role="dialog"
		aria-modal="true"
		aria-labelledby={`${formId}-overlay-title`}
		tabindex="-1"
	>
		<img
			src={logogramColor}
			alt=""
			aria-hidden="true"
			class="pointer-events-none absolute top-1/2 left-1/2 w-155 max-w-none -translate-x-1/2 -translate-y-1/2 opacity-5"
		/>
		{#if elapsed < COUNTDOWN_SECONDS}
			<p
				id={`${formId}-overlay-title`}
				class="text-lms-on-hero-muted relative font-mono text-[13px] tracking-[0.2em] uppercase"
			>
				{i18n.t('auth.join.countdown_label')}
			</p>
			<p class="relative text-[11.25rem] leading-none font-bold tabular-nums" aria-live="assertive">
				{COUNTDOWN_SECONDS - elapsed}
			</p>
			<p class="text-lms-on-hero-muted relative">
				{i18n.t('auth.join.countdown_meta', {
					title: session.title,
					minutes: session.duration_minutes
				})}
			</p>
		{:else}
			<h2 id={`${formId}-overlay-title`} class="text-lms-h2 relative" aria-live="assertive">
				{i18n.t('auth.join.begun_title', { name: name.trim().split(/\s+/)[0] ?? '' })}
			</h2>
			<p class="text-lms-on-hero-muted relative max-w-120">
				{i18n.t('auth.join.begun_description', { number: participantNumber ?? '—' })}
			</p>
			<a
				href={resolve(APP_PATHS.LOGIN)}
				class="btn bg-lms-on-hero text-lms-brand-deep-neutral lms-focus-ring relative mt-2 h-10 rounded-[10px] px-4 font-semibold"
			>
				{i18n.t('auth.join.back_to_login')}
			</a>
		{/if}
	</div>
{/if}
