<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { RegistrationState, SignupCatalog, SignupCity } from '$lib/api/generated/lms';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { runPageAction, type PageActionOutcome } from '$lib/utils/page-action';
	import type { Snippet } from 'svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CloudCheck from '@lucide/svelte/icons/cloud-check';
	import Info from '@lucide/svelte/icons/info';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import X from '@lucide/svelte/icons/x';
	import { REG_STEPS, SETUP_STEPS, rupiah, type WizardStep } from '../registration.model';
	import { RegistrationWizard, type Challenge } from '../registration.state.svelte';
	import AccountStep from './steps/AccountStep.svelte';
	import ApprovalStep from './steps/ApprovalStep.svelte';
	import ClassesStep from './steps/ClassesStep.svelte';
	import DoneStep from './steps/DoneStep.svelte';
	import ImportStep from './steps/ImportStep.svelte';
	import InstitutionStep from './steps/InstitutionStep.svelte';
	import OtpStep from './steps/OtpStep.svelte';
	import PaymentStep from './steps/PaymentStep.svelte';
	import PlanStep from './steps/PlanStep.svelte';
	import ProfileStep from './steps/ProfileStep.svelte';
	import ProvisioningStep from './steps/ProvisioningStep.svelte';
	import SubjectsStep from './steps/SubjectsStep.svelte';
	import YearStep from './steps/YearStep.svelte';

	interface Props {
		catalog: SignupCatalog;
		registration: RegistrationState | null;
		cities: SignupCity[];
		challenge: Challenge | null;
		/** Aksi header dari route (mis. toggle tema; komponen layout tidak diimpor di lapisan fitur). */
		headerActions?: Snippet;
	}

	let { catalog, registration, cities, challenge, headerActions }: Props = $props();

	const i18n = useI18n();
	const MAIN_ID = 'main-content';
	/** Status yang ditunggu dari backend (persetujuan, pembayaran via webhook, provisioning) dipantau berkala. */
	const POLL_MS = 4000;
	const WIDE_RAIL_PX = 1000;

	// svelte-ignore state_referenced_locally
	const wizard = new RegistrationWizard(catalog, registration, cities, challenge);
	let savedAt = $state<Date | null>(null);
	let failure = $state<string | null>(null);
	let width = $state(1280);

	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
	const app = $derived(wizard.server?.application ?? null);
	const tenant = $derived(wizard.server?.tenant ?? null);
	const invoice = $derived(wizard.server?.invoice ?? null);
	const tenantReady = $derived(tenant?.lifecycle === 'trial' || tenant?.lifecycle === 'active');
	const regPos = $derived((REG_STEPS as readonly string[]).indexOf(wizard.step));
	const setupList = $derived(SETUP_STEPS[wizard.type]);
	const setupPos = $derived(setupList.indexOf(wizard.step));

	/** Hasil aksi: status backend diterapkan; isian invalid dari backend ditampilkan per isian. */
	async function act<T>(name: string, body?: unknown): Promise<PageActionOutcome<T>> {
		wizard.busy = true;
		failure = null;
		const result = await runPageAction<T>(name, body);
		wizard.busy = false;
		if (result.ok) {
			wizard.serverIssues = [];
			const data = result.data as unknown as RegistrationState | undefined;
			if (data && typeof data === 'object' && 'account' in data) {
				wizard.apply(data);
				savedAt = new Date();
			}
		} else {
			wizard.serverIssues = result.issues.map((issue) => ({
				field: fieldName(issue.field),
				code: issue.code
			}));
			failure = result.code;
		}
		return result;
	}

	/** Kode error backend tenantreg (`writeError`) + kode tantangan OTP; selain itu pesan umum. */
	const FAILURE_CODES = [
		'email_taken',
		'invalid_code',
		'too_many_attempts',
		'resend_too_soon',
		'challenge_expired',
		'no_application',
		'application_locked',
		'invalid_transition',
		'checks_incomplete',
		'tenant_not_ready',
		'gateway_unavailable',
		'forbidden',
		'unavailable'
	];
	const failureMessage = (code: string) =>
		t(`failure.${FAILURE_CODES.includes(code) ? code : 'generic'}`);

	/** Nama isian backend → isian form. */
	function fieldName(field: string): string {
		const map: Record<string, string> = {
			full_name: 'fullName',
			institution_name: 'institutionName',
			province_code: 'province',
			city_code: 'city',
			teaching_fields: 'teachingFields',
			participants_per_session: 'participants',
			principal_name: 'principalName',
			principal_nip: 'principalNip',
			phone: wizard.index >= REG_STEPS.length ? 'telp' : 'phone'
		};
		return map[field] ?? field;
	}

	// ===== Validasi per langkah (referensi validate()) =====

	const validation = $derived.by((): { ok: boolean; reason: string } => {
		const e = wizard.errors;
		const pick = (keys: string[]) => {
			const k = keys.find((key) => e[key]);
			return k ? { ok: false, reason: t(`errors.${e[k]}`) } : { ok: true, reason: '' };
		};
		switch (wizard.step) {
			case 'akun': {
				const r = pick(['fullName', 'email', 'phone', 'password']);
				return r.ok && !wizard.agree ? { ok: false, reason: t('reason.agree') } : r;
			}
			case 'otp':
				return wizard.server?.application
					? { ok: true, reason: '' }
					: { ok: false, reason: t(wizard.otpError ? 'reason.otp_wrong' : 'reason.otp_enter') };
			case 'lembaga':
				if (wizard.type === 'school' && wizard.npsnStatus === 'checking')
					return { ok: false, reason: t('reason.npsn_checking') };
				return pick(
					wizard.type === 'school'
						? ['npsn', 'institutionName', 'address', 'province', 'city']
						: wizard.type === 'personal'
							? ['institutionName', 'teachingFields', 'province', 'city']
							: ['institutionName', 'participants', 'province', 'city']
				);
			case 'paket':
				return { ok: Boolean(wizard.plan), reason: wizard.plan ? '' : t('reason.plan') };
			case 'bayar': {
				if (wizard.trialOn && app?.status === 'draft') return { ok: true, reason: '' };
				if (invoice?.status === 'paid') return { ok: true, reason: '' };
				if (app?.status === 'submitted' && !invoice)
					return { ok: false, reason: t('reason.awaiting_approval') };
				if (app?.status === 'revision_requested')
					return { ok: false, reason: t('reason.revision') };
				return {
					ok: false,
					reason: t(wizard.server?.payment ? 'reason.awaiting_payment' : 'reason.create_invoice')
				};
			}
			case 'persetujuan':
				if (app?.status === 'rejected') return { ok: false, reason: t('reason.rejected') };
				if (app?.status === 'revision_requested')
					return { ok: false, reason: t('reason.revision') };
				return app?.status === 'approved' && invoice?.status === 'paid'
					? { ok: true, reason: '' }
					: { ok: false, reason: t('reason.awaiting_approval') };
			case 'provisioning':
				return tenantReady
					? { ok: true, reason: '' }
					: { ok: false, reason: t('reason.provisioning') };
			case 'profil':
				return pick(
					wizard.type === 'school'
						? ['principalName', 'principalNip', 'telp']
						: wizard.type === 'event'
							? ['coordinator', 'telp']
							: ['telp', 'about']
				);
			case 'tahun':
				return pick(['g2', 'e1', 'e2']);
			case 'kelas':
				if (!wizard.rombel) return { ok: false, reason: t('reason.rombel') };
				return pick(['capacity']);
			case 'mapel':
				if (!wizard.enabledSubjects.length) return { ok: false, reason: t('reason.subjects') };
				return wizard.badKktp.length
					? { ok: false, reason: t('reason.kktp', { name: wizard.badKktp[0]?.name ?? '' }) }
					: { ok: true, reason: '' };
			default:
				return { ok: true, reason: '' };
		}
	});

	const tried = $derived(Boolean(wizard.tried[wizard.step]));

	const nextLabel = $derived.by(() => {
		switch (wizard.step) {
			case 'akun':
				return t('next.akun');
			case 'otp':
				return t('next.otp');
			case 'lembaga':
				return t('next.lembaga');
			case 'paket':
				return wizard.trialOn ? t('next.otp') : t('next.paket_paid');
			case 'bayar':
				return wizard.trialOn && app?.status === 'draft' ? t('next.bayar_trial') : t('next.otp');
			case 'persetujuan':
				return t('next.persetujuan');
			case 'provisioning':
				return t('next.provisioning');
			case 'guru':
			case 'murid':
				return t('next.skip');
			case 'selesai':
				return t('next.selesai');
			default:
				return t('next.save');
		}
	});

	const okNote = $derived.by(() => {
		const preview = wizard.preview;
		switch (wizard.step) {
			case 'akun':
				return t('ok.akun');
			case 'otp':
				return t('ok.otp');
			case 'paket':
				return wizard.trialOn
					? t('ok.paket_trial')
					: t('ok.paket_paid', { total: rupiah(preview?.total ?? 0, i18n.locale) });
			case 'bayar':
				return wizard.trialOn ? t('ok.bayar_trial') : t('ok.bayar_paid');
			case 'persetujuan':
				return t('ok.persetujuan');
			case 'provisioning':
				return t('ok.provisioning');
			case 'guru':
				return t('ok.guru');
			case 'murid':
				return t('ok.murid');
			case 'selesai':
				return t('ok.selesai');
			default:
				return t('ok.valid');
		}
	});

	const head = $derived.by(() => {
		const step = wizard.step;
		const inst = wizard.institutionName.trim() || t('head.your_institution');
		const kicker =
			regPos >= 0
				? t('head.kicker_reg', { n: regPos + 1, total: REG_STEPS.length })
				: t('head.kicker_setup', { n: setupPos + 1, total: setupList.length });
		const typed = ['lembaga', 'paket', 'profil', 'kelas', 'persetujuan'].includes(step)
			? `${step}_${wizard.type}`
			: step;
		const variant = step === 'bayar' ? (wizard.trialOn ? 'bayar_trial' : 'bayar_paid') : typed;
		return {
			kicker,
			title: t(`head.${variant}.title`, { institution: inst, level: wizard.level }),
			desc: t(`head.${variant}.desc`, { institution: inst, level: wizard.level })
		};
	});

	async function goStep(step: WizardStep) {
		const idx = wizard.steps.indexOf(step);
		if (idx > wizard.maxIndex) wizard.maxIndex = idx;
		wizard.step = step;
		if (typeof window !== 'undefined') window.scrollTo(0, 0);
	}

	async function persistStep(step: WizardStep) {
		if (wizard.server?.application) {
			const result = await act<RegistrationState>('step', { step });
			if (!result.ok) return false;
		}
		await goStep(step);
		return true;
	}

	async function next() {
		const v = validation;
		if (!v.ok || wizard.busy) {
			wizard.tried = { ...wizard.tried, [wizard.step]: true };
			return;
		}
		const list = wizard.steps;
		const following = list[wizard.index + 1];
		switch (wizard.step) {
			case 'akun': {
				const result = await act<Challenge>('account', {
					tenant_type: wizard.type,
					full_name: wizard.fullName.trim(),
					email: wizard.email.trim(),
					phone: wizard.phone,
					password: wizard.password,
					agree: wizard.agree
				});
				if (result.ok) {
					wizard.challenge = result.data;
					wizard.otp = '';
					wizard.otpError = null;
					await goStep('otp');
				} else if (result.code === 'email_taken') {
					wizard.serverIssues = [{ field: 'email', code: 'email_taken' }];
				}
				return;
			}
			case 'otp':
				await persistStep('lembaga');
				return;
			case 'lembaga': {
				const result = await act<RegistrationState>('institution', institutionBody(false));
				if (result.ok) await goStep('paket');
				return;
			}
			case 'paket': {
				const plan = wizard.plan;
				if (!plan) return;
				const saved = await act<RegistrationState>('plan', {
					plan_code: plan.code,
					seats: wizard.seats,
					cycle: plan.pricing_model === 'package' ? 'one_time' : wizard.cycle,
					trial: wizard.trialOn
				});
				if (!saved.ok) return;
				// Berbayar: pengajuan dikirim sekarang (sekolah ditinjau dulu; guru & sesi disetujui otomatis).
				if (!wizard.trialOn && app?.status !== 'approved') {
					const submitted = await act<RegistrationState>('submit');
					if (!submitted.ok) return;
				}
				await goStep('bayar');
				return;
			}
			case 'bayar':
				if (wizard.trialOn && app?.status === 'draft') {
					const submitted = await act<RegistrationState>('submit');
					if (submitted.ok) await goStep('persetujuan');
					return;
				}
				await persistStep('persetujuan');
				return;
			case 'profil':
				await saveSetup('profil', {
					principal_name: wizard.setup.principalName.trim(),
					principal_nip: wizard.setup.principalNip,
					about: wizard.setup.about.trim(),
					coordinator: wizard.setup.coordinator.trim(),
					phone: wizard.setup.phone,
					website: wizard.setup.website.trim()
				});
				return;
			case 'tahun':
				await saveSetup('tahun', {
					academic_year: wizard.setup.academicYear,
					semesters: wizard.setup.semesters
				});
				return;
			case 'kelas':
				await saveSetup('kelas', {
					scheme: wizard.setup.scheme,
					capacity: Number(wizard.setup.capacity),
					grades: wizard.setup.grades
				});
				return;
			case 'mapel':
				await saveSetup('mapel', {
					subjects: wizard.setup.subjects.map((s) => ({ ...s, kktp: Number(s.kktp) }))
				});
				return;
			case 'selesai': {
				const result = await act<RegistrationState>('step', { step: 'done' });
				if (result.ok) await goto(resolve('/register/finish'));
				return;
			}
			default:
				if (following) await persistStep(following);
		}
	}

	async function saveSetup(step: string, data: unknown) {
		const result = await act<RegistrationState>('setup', { step, data });
		if (result.ok) {
			const idx = wizard.steps.indexOf(step as WizardStep);
			const following = wizard.steps[idx + 1];
			if (following) await goStep(following);
		}
	}

	function institutionBody(partial: boolean) {
		return {
			tenant_type: wizard.type,
			institution_name: wizard.institutionName.trim(),
			npsn: wizard.npsn,
			education_level: wizard.level,
			ownership: wizard.ownership,
			address: wizard.address.trim(),
			province_code: wizard.province,
			city_code: wizard.city,
			timezone: wizard.timezone,
			teaching_fields: wizard.teachingFields,
			organizer_kind: wizard.organizerKind,
			participants_per_session: Number(wizard.participants) || 0,
			partial
		};
	}

	function back() {
		const prev = wizard.steps[wizard.index - 1];
		if (prev && wizard.index - 1 >= wizard.lockIndex) void goStep(prev);
	}

	// Status yang menunggu pihak lain (persetujuan, webhook pembayaran, provisioning) dimuat ulang berkala.
	$effect(() => {
		const waiting =
			(wizard.step === 'bayar' && app?.status === 'submitted') ||
			(wizard.step === 'persetujuan' &&
				(app?.status === 'submitted' || invoice?.status !== 'paid')) ||
			(wizard.step === 'provisioning' && !tenantReady);
		if (!waiting) return;
		const timer = setInterval(() => void act<RegistrationState>('refresh'), POLL_MS);
		return () => clearInterval(timer);
	});

	const phases = $derived(
		[
			{ label: t('phase.reg'), keys: [...REG_STEPS] as string[] },
			{ label: t('phase.setup'), keys: [...setupList] }
		].map((phase) => ({
			label: phase.label,
			items: phase.keys.map((key, j) => {
				const gi = wizard.steps.indexOf(key as WizardStep);
				const current = key === wizard.step;
				const done = gi < wizard.index || (gi < wizard.maxIndex && !current);
				const reach = gi <= wizard.maxIndex && gi >= wizard.lockIndex && !current;
				return {
					key: key as WizardStep,
					mark: done && !current ? '✓' : String(j + 1),
					current,
					done,
					reach,
					reached: gi <= wizard.maxIndex
				};
			})
		}))
	);
</script>

<svelte:window bind:innerWidth={width} />

<a
	href={`#${MAIN_ID}`}
	class="btn lms-action-primary lms-focus-ring sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
>
	{i18n.t('common.shell.skip_to_content')}
</a>

<!-- Struktur mengikuti FLIXARE App v3.html layar "02 Daftar & Berlangganan". -->
<div class="bg-lms-background text-lms-foreground flex min-h-dvh flex-col">
	<header
		class="border-lms-border bg-lms-surface flex min-h-17 flex-wrap items-center justify-between gap-4 border-b px-4 py-3 md:px-8"
	>
		<div class="flex items-center gap-3.5">
			<BrandLogo expression="core" />
			<span
				class="border-lms-input-border text-lms-muted border-s ps-3.5 font-mono text-[11px] tracking-[0.14em] uppercase"
			>
				{regPos >= 0
					? t('header.reg', { n: regPos + 1, total: REG_STEPS.length })
					: t('header.setup', { n: setupPos + 1, total: setupList.length })}
			</span>
		</div>
		<div class="flex items-center gap-3.5">
			<span class="text-lms-muted hidden items-center gap-1.5 text-xs sm:flex">
				<Icon icon={CloudCheck} size="sm" />
				{savedAt
					? t('header.saved_at', {
							time: savedAt.toLocaleTimeString(i18n.locale === 'en' ? 'en-US' : 'id-ID', {
								hour: '2-digit',
								minute: '2-digit'
							})
						})
					: t('header.autosave')}
			</span>
			{@render headerActions?.()}
			<a
				href={resolve(APP_PATHS.LOGIN)}
				class="btn border-lms-input-border bg-lms-surface lms-focus-ring h-9 gap-1.5 rounded-lg border px-3 text-[0.8125rem] font-semibold"
			>
				<Icon icon={X} size="sm" />{t('header.exit')}
			</a>
		</div>
	</header>
	<div class="bg-lms-border h-0.75" aria-hidden="true">
		<div
			class="bg-lms-interactive h-full transition-[width] duration-400"
			style:width="{Math.round(((wizard.index + 1) / wizard.steps.length) * 100)}%"
		></div>
	</div>

	<div class="mx-auto flex w-full max-w-295 flex-1 flex-wrap items-start gap-8 px-5 pt-8 pb-10">
		{#if width >= WIDE_RAIL_PX}
			<aside
				class="sticky top-6 flex flex-[0_0_15rem] flex-col gap-5.5"
				aria-label={t('rail_label')}
			>
				{#each phases as phase (phase.label)}
					<div class="flex flex-col gap-0.5">
						<span class="text-lms-muted mb-1.5 font-mono text-[11px] tracking-[0.14em] uppercase"
							>{phase.label}</span
						>
						<ol class="flex flex-col gap-0.5">
							{#each phase.items as item (item.key)}
								<li>
									<button
										type="button"
										class={[
											'lms-focus-ring flex w-full items-center gap-3 rounded-[10px] px-2 py-1.75 text-left transition-colors',
											item.current && 'bg-lms-interactive-subtle',
											item.reach ? 'cursor-pointer' : 'cursor-default',
											!item.reached && !item.current && 'opacity-60'
										]}
										aria-current={item.current ? 'step' : undefined}
										disabled={!item.reach}
										onclick={() => goStep(item.key)}
									>
										<span
											class={[
												'flex size-6 flex-none items-center justify-center rounded-full text-[11px] font-bold',
												item.current
													? 'bg-lms-interactive text-lms-on-interactive'
													: item.done
														? 'bg-lms-progress text-lms-on-interactive'
														: 'border-lms-input-border text-lms-muted border-[1.5px]'
											]}>{item.mark}</span
										>
										<span class="flex min-w-0 flex-col">
											<span class={['text-[0.8125rem]', item.current ? 'font-bold' : 'font-medium']}
												>{t(`meta.${item.key}.label`)}</span
											>
											<span class="text-lms-muted text-[11px]">{t(`meta.${item.key}.sub`)}</span>
										</span>
									</button>
								</li>
							{/each}
						</ol>
					</div>
				{/each}
				<div
					class="border-lms-input-border flex flex-col gap-1.5 rounded-xl border border-dashed p-3.5"
				>
					<span class="text-[0.8125rem] font-bold">{t('help.title')}</span>
					<span class="text-lms-muted text-xs leading-4.5">{t('help.body')}</span>
				</div>
			</aside>
		{/if}

		<main
			id={MAIN_ID}
			tabindex="-1"
			class="flex min-w-0 flex-[1_1_26.25rem] flex-col gap-5 focus:outline-none"
		>
			{#if width < WIDE_RAIL_PX}
				<div class="lms-card flex flex-col gap-2.5 rounded-xl! p-3.5 shadow-none!">
					<div class="flex gap-1" aria-hidden="true">
						{#each wizard.steps as key, i (key)}
							<span
								class={[
									'h-1.5 flex-1 rounded-full',
									i < wizard.index
										? 'bg-lms-progress'
										: i === wizard.index
											? 'bg-lms-interactive'
											: 'bg-lms-border'
								]}
							></span>
						{/each}
					</div>
					<div class="flex justify-between gap-2 text-xs">
						<span class="font-bold"
							>{t(`meta.${wizard.step}.label`)} · {wizard.index + 1}/{wizard.steps.length}</span
						>
						<span class="text-lms-muted">
							{t('compact_next', {
								step: wizard.steps[wizard.index + 1]
									? t(`meta.${wizard.steps[wizard.index + 1]}.label`)
									: '—'
							})}
						</span>
					</div>
				</div>
			{/if}

			<div class="flex flex-col gap-1.5">
				<span
					class="text-lms-interactive font-mono text-xs font-semibold tracking-[0.12em] uppercase"
					>{head.kicker}</span
				>
				<h1 class="text-[1.875rem] leading-9.5 font-bold tracking-tight">{head.title}</h1>
				<p class="text-lms-muted max-w-160 text-[0.9375rem] leading-5.75">{head.desc}</p>
			</div>

			{#if wizard.step === 'akun'}
				<AccountStep {wizard} {tried} />
			{:else if wizard.step === 'otp'}
				<OtpStep
					{wizard}
					{act}
					onBack={() => goStep('akun')}
					onVerified={() => goStep('lembaga')}
				/>
			{:else if wizard.step === 'lembaga'}
				<InstitutionStep {wizard} {tried} {act} />
			{:else if wizard.step === 'paket'}
				<PlanStep {wizard} />
			{:else if wizard.step === 'bayar'}
				<PaymentStep {wizard} {act} />
			{:else if wizard.step === 'persetujuan'}
				<ApprovalStep {wizard} {act} onEdit={() => goStep('lembaga')} />
			{:else if wizard.step === 'provisioning'}
				<ProvisioningStep {wizard} />
			{:else if wizard.step === 'profil'}
				<ProfileStep {wizard} {tried} />
			{:else if wizard.step === 'tahun'}
				<YearStep {wizard} />
			{:else if wizard.step === 'kelas'}
				<ClassesStep {wizard} {tried} />
			{:else if wizard.step === 'mapel'}
				<SubjectsStep {wizard} />
			{:else if wizard.step === 'guru' || wizard.step === 'murid'}
				<ImportStep {wizard} kind={wizard.step} />
			{:else if wizard.step === 'selesai'}
				<DoneStep {wizard} />
			{/if}

			<div
				class="lms-card sticky bottom-19 z-20 flex flex-wrap items-center gap-3 rounded-[14px]! py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_rgba(15,24,56,0.4)]!"
			>
				{#if wizard.index - 1 >= wizard.lockIndex && wizard.index > 0}
					<button
						type="button"
						class="btn border-lms-input-border bg-lms-surface lms-focus-ring h-11 gap-2 rounded-[10px] border px-4 text-sm font-semibold"
						onclick={back}
					>
						<Icon icon={ArrowLeft} size="sm" />{t('back')}
					</button>
				{/if}
				<span
					class={[
						'flex flex-[1_1_12.5rem] items-center gap-2 text-[0.8125rem] leading-4.75',
						validation.ok
							? 'text-lms-muted'
							: tried || failure
								? 'text-lms-danger-text'
								: 'text-lms-muted'
					]}
					aria-live="polite"
				>
					<Icon
						icon={validation.ok && !failure ? CircleCheck : tried || failure ? CircleAlert : Info}
						size="sm"
					/>
					{failure && failure !== 'validation_failed'
						? failureMessage(failure)
						: validation.ok
							? okNote
							: validation.reason}
				</span>
				<button
					type="button"
					class={[
						'btn lms-focus-ring h-11 gap-2 rounded-[10px] px-5 text-sm font-bold transition-colors',
						validation.ok && !wizard.busy
							? 'lms-action-primary'
							: 'bg-lms-surface-muted text-lms-muted cursor-not-allowed'
					]}
					aria-disabled={!validation.ok || wizard.busy}
					aria-busy={wizard.busy}
					onclick={next}
				>
					{nextLabel}<Icon
						icon={wizard.step === 'selesai' ? LayoutDashboard : ArrowRight}
						size="sm"
					/>
				</button>
			</div>
		</main>
	</div>
</div>
