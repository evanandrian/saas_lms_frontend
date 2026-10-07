<script lang="ts">
	import type { RegistrationState } from '$lib/api/generated/lms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import type { PageActionOutcome } from '$lib/utils/page-action';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import Clock from '@lucide/svelte/icons/clock';
	import Copy from '@lucide/svelte/icons/copy';
	import Hourglass from '@lucide/svelte/icons/hourglass';
	import Landmark from '@lucide/svelte/icons/landmark';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Mail from '@lucide/svelte/icons/mail';
	import QrCode from '@lucide/svelte/icons/qr-code';
	import Receipt from '@lucide/svelte/icons/receipt';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Users from '@lucide/svelte/icons/users';
	import Zap from '@lucide/svelte/icons/zap';
	import { BANK_LABELS, rupiah, trialEndPreview } from '../../registration.model';
	import type { RegistrationWizard } from '../../registration.state.svelte';

	interface Props {
		wizard: RegistrationWizard;
		act: <T>(name: string, body?: unknown) => Promise<PageActionOutcome<T>>;
	}

	let { wizard, act }: Props = $props();
	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
	const money = (n: number) => rupiah(n, i18n.locale);
	const COPIED_MS = 3000;
	const GUIDES = ['atm', 'mobile', 'internet'] as const;
	const GUIDE_STEPS = 3;

	let now = $state(Date.now());
	let copied = $state(false);
	let checking = $state(false);
	let guideOpen = $state<number>(0);

	const app = $derived(wizard.server?.application ?? null);
	const invoice = $derived(wizard.server?.invoice ?? null);
	const payment = $derived(wizard.server?.payment ?? null);
	const quote = $derived(app?.quote ?? null);
	const plan = $derived(wizard.plan);
	const locale = $derived(i18n.locale === 'en' ? 'en-US' : 'id-ID');
	const zone = $derived(
		wizard.catalog.timezones.find((z) => z.code === wizard.timezone)?.label ?? ''
	);
	const isTrial = $derived(wizard.trialOn && (!invoice || invoice.is_trial));
	const waitingApproval = $derived(!isTrial && !invoice && app?.status === 'submitted');
	const channels = $derived(wizard.catalog.payment_channels.filter((c) => c.startsWith('va_')));
	const channel = $derived(wizard.payMethod === 'qris' ? 'qris' : wizard.bank);
	const activePayment = $derived(
		payment &&
			payment.channel === channel &&
			payment.status !== 'expired' &&
			payment.status !== 'failed'
			? payment
			: null
	);
	const paid = $derived(invoice?.status === 'paid');
	const expiresIn = $derived(
		activePayment?.expires_at
			? Math.max(0, Math.floor((new Date(activePayment.expires_at).getTime() - now) / 1000))
			: 0
	);
	const trialEnd = $derived(
		plan ? trialEndPreview(new Date(), plan.trial_length ?? 0, plan.trial_unit) : null
	);

	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	const hms = (s: number) =>
		[Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
			.map((v) => String(v).padStart(2, '0'))
			.join(':');
	const fmtDate = (d: Date) =>
		d.toLocaleDateString(locale, {
			weekday: 'long',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		}) +
		' ' +
		t('payment.at') +
		' ' +
		d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
	const grouped = (v: string) => v.replace(/(\d{4})(?=\d)/g, '$1 ');

	async function createPayment() {
		await act<RegistrationState>('payment', { channel });
	}

	async function check() {
		checking = true;
		await act<RegistrationState>('paymentCheck');
		checking = false;
	}

	async function copy(value: string) {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			setTimeout(() => (copied = false), COPIED_MS);
		} catch {
			copied = false;
		}
	}

	const summary = $derived(
		quote
			? [
					{ k: t('plan.sum_plan'), v: quote.plan_name },
					...(wizard.type === 'school'
						? [{ k: t('plan.sum_seats'), v: `× ${quote.quantity.toLocaleString(locale)}` }]
						: []),
					...(quote.period_months
						? [
								{
									k: t('plan.sum_period'),
									v:
										quote.period_months === 12
											? t('plan.period_year', { billed: quote.billed_months })
											: t('plan.period_month')
								}
							]
						: []),
					{ k: t('plan.sum_subtotal'), v: money(invoice?.subtotal_idr ?? quote.subtotal_idr) },
					{ k: t('plan.sum_vat'), v: money(invoice?.tax_idr ?? quote.tax_idr) },
					{ k: t('plan.sum_total'), v: money(invoice?.total_idr ?? quote.total_idr), strong: true }
				]
			: []
	);
</script>

{#if isTrial}
	<section class="lms-card flex flex-col gap-4.5 rounded-[14px]! p-6 shadow-none!">
		<div class="flex flex-wrap items-center gap-4">
			<span class="text-[2.75rem] font-bold tracking-tight">Rp0</span>
			<span class="text-lms-muted flex-[1_1_16.25rem] text-sm leading-5.25">
				{t('payment.trial_today')}
				<strong class="text-lms-foreground"
					>{trialEnd ? `${fmtDate(trialEnd)} ${zone}` : '—'}</strong
				>.
			</span>
		</div>
		<div class="grid grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))] gap-2.5">
			{#each [{ icon: Users, title: t( 'payment.fact_students', { n: plan?.trial_max_students ?? 0 } ), sub: t('payment.fact_students_sub') }, wizard.type === 'school' ? { icon: Mail, title: t('payment.fact_invites'), sub: t('payment.fact_invites_sub') } : { icon: Zap, title: t('payment.fact_auto'), sub: t('payment.fact_auto_sub') }, { icon: Sparkles, title: t('payment.fact_ai'), sub: t('payment.fact_ai_sub') }] as fact (fact.title)}
				<div class="border-lms-border flex flex-col gap-1 rounded-xl border p-3.5">
					<span class="text-lms-interactive"><Icon icon={fact.icon} /></span>
					<span class="text-[0.8125rem] font-bold">{fact.title}</span>
					<span class="text-lms-muted text-xs leading-4.25">{fact.sub}</span>
				</div>
			{/each}
		</div>
		<span class="text-lms-muted text-xs leading-4.5"
			>{t('payment.first_bill', {
				total: money(quote?.total_idr ?? wizard.preview?.total ?? 0)
			})}</span
		>
	</section>
{:else if waitingApproval || app?.status === 'revision_requested'}
	<section class="lms-card flex flex-col gap-3 rounded-[14px]! p-6 shadow-none!">
		<span class="text-lms-interactive"><Icon icon={Hourglass} /></span>
		<h2 class="text-base font-bold">
			{t(app?.status === 'revision_requested' ? 'payment.revision_title' : 'payment.waiting_title')}
		</h2>
		<p class="text-lms-muted text-[0.8125rem] leading-5">
			{t(app?.status === 'revision_requested' ? 'payment.revision_body' : 'payment.waiting_body')}
		</p>
	</section>
{:else}
	<div class="flex flex-wrap items-start gap-4">
		<section
			class="lms-card flex min-w-0 flex-[1_1_26.25rem] flex-col gap-4.5 rounded-[14px]! p-5.5 shadow-none!"
		>
			<div
				class="bg-lms-surface-muted flex gap-0.5 rounded-[10px] p-0.75"
				role="group"
				aria-label={t('payment.method')}
			>
				{#each [{ value: 'va' as const, label: t('payment.va'), icon: Landmark }, { value: 'qris' as const, label: 'QRIS', icon: QrCode }] as m (m.value)}
					<button
						type="button"
						aria-pressed={wizard.payMethod === m.value}
						disabled={paid}
						class={[
							'lms-focus-ring flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[0.8125rem] font-semibold',
							wizard.payMethod === m.value
								? 'bg-lms-surface text-lms-foreground shadow-[0_1px_3px_rgba(15,24,56,0.15)]'
								: 'text-lms-muted'
						]}
						onclick={() => (wizard.payMethod = m.value)}
					>
						<Icon icon={m.icon} size="sm" />{m.label}
					</button>
				{/each}
			</div>
			{#if wizard.payMethod === 'va'}
				<div
					class="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2"
					role="radiogroup"
					aria-label={t('payment.bank')}
				>
					{#each channels as c (c)}
						<button
							type="button"
							role="radio"
							aria-checked={wizard.bank === c}
							disabled={paid}
							class={[
								'lms-focus-ring h-11.5 rounded-[10px] text-sm font-bold',
								wizard.bank === c
									? 'border-lms-interactive bg-lms-interactive-subtle border-2'
									: 'border-lms-input-border bg-lms-surface border'
							]}
							onclick={() => (wizard.bank = c)}>{BANK_LABELS[c] ?? c}</button
						>
					{/each}
				</div>
			{/if}
			{#if !activePayment && !paid}
				<button
					type="button"
					class="lms-action-deep lms-focus-ring flex h-11.5 items-center justify-center gap-2 rounded-[10px] text-sm font-bold"
					disabled={wizard.busy}
					onclick={createPayment}
				>
					<Icon icon={Receipt} size="sm" />
					{wizard.payMethod === 'va'
						? t('payment.create_va', { bank: BANK_LABELS[wizard.bank] ?? '' })
						: t('payment.create_qris')}
				</button>
			{:else}
				<div
					class={[
						'flex flex-col gap-3.5 rounded-xl border-[1.5px] p-4.5 transition-colors',
						paid
							? 'border-lms-progress bg-lms-success-subtle'
							: 'border-lms-input-border bg-lms-surface'
					]}
				>
					<div class="text-lms-muted flex flex-wrap justify-between gap-2.5 text-xs">
						<span class="font-mono">{invoice?.number}</span>
						<span
							class={[
								'flex items-center gap-1.5 font-semibold',
								paid ? 'text-lms-success-text' : 'text-lms-warning-text'
							]}
						>
							<Icon icon={paid ? Check : Clock} size="sm" />{paid
								? t('payment.paid_short')
								: t('payment.valid_for', { time: hms(expiresIn) })}
						</span>
					</div>
					{#if activePayment && activePayment.channel !== 'qris'}
						<div class="flex flex-col gap-1.5">
							<span class="text-lms-muted text-xs">
								{activePayment.biller_code
									? t('payment.bill_key', {
											bank: BANK_LABELS[activePayment.channel] ?? '',
											code: activePayment.biller_code
										})
									: t('payment.va_number', { bank: BANK_LABELS[activePayment.channel] ?? '' })}
							</span>
							<div class="flex flex-wrap items-center gap-2.5">
								<span class="font-mono text-2xl font-semibold tracking-wider"
									>{grouped(activePayment.va_number)}</span
								>
								<button
									type="button"
									class="border-lms-input-border bg-lms-surface lms-focus-ring flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold"
									onclick={() => copy(activePayment.va_number)}
								>
									<Icon icon={copied ? Check : Copy} size="sm" />{copied
										? t('payment.copied')
										: t('payment.copy')}
								</button>
							</div>
						</div>
					{:else if activePayment}
						<div class="flex flex-wrap items-center gap-4">
							{#if activePayment.qr_image_url}
								<img
									src={activePayment.qr_image_url}
									alt={t('payment.qris_alt')}
									class="border-lms-input-border size-37 rounded-xl border bg-white p-1.5"
								/>
							{:else}
								<span
									class="border-lms-input-border text-lms-muted flex size-37 flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed p-2.5 text-center text-xs"
									><Icon icon={QrCode} />{t('payment.qris_placeholder')}</span
								>
							{/if}
							<span class="text-lms-muted flex-[1_1_10rem] text-[0.8125rem] leading-5"
								>{t('payment.qris_hint')}</span
							>
						</div>
					{/if}
					<div
						class="border-lms-input-border flex items-baseline justify-between border-t border-dashed pt-3"
					>
						<span class="text-lms-muted text-[0.8125rem]">{t('payment.amount')}</span>
						<span class="text-[1.375rem] font-bold tabular-nums"
							>{money(invoice?.total_idr ?? 0)}</span
						>
					</div>
					{#if paid}
						<p class="text-lms-success-text flex items-center gap-2.5 text-sm font-bold">
							<Icon icon={BadgeCheck} />{t('payment.paid', {
								time: invoice?.paid_at
									? new Date(invoice.paid_at).toLocaleTimeString(locale, {
											hour: '2-digit',
											minute: '2-digit'
										})
									: '',
								zone
							})}
						</p>
					{:else}
						<button
							type="button"
							class="border-lms-interactive text-lms-link bg-lms-surface lms-focus-ring flex h-10.5 items-center justify-center gap-2 rounded-[10px] border-[1.5px] text-[0.8125rem] font-bold"
							aria-busy={checking}
							onclick={check}
						>
							<Icon icon={checking ? LoaderCircle : RefreshCw} size="sm" />{checking
								? t('payment.checking')
								: t('payment.check')}
						</button>
					{/if}
				</div>
				{#if wizard.payMethod === 'va' && !paid}
					<div class="flex flex-col">
						{#each GUIDES as guide, i (guide)}
							<div class="border-lms-border border-t">
								<button
									type="button"
									class="lms-focus-ring flex w-full items-center justify-between px-0.5 py-3 text-[0.8125rem] font-semibold"
									aria-expanded={guideOpen === i}
									onclick={() => (guideOpen = guideOpen === i ? -1 : i)}
								>
									{t('payment.guide', { via: t(`payment.guide_${guide}`) })}<span
										class="text-lms-muted"
										><Icon icon={guideOpen === i ? ChevronUp : ChevronDown} size="sm" /></span
									>
								</button>
								{#if guideOpen === i}
									<ol
										class="text-lms-muted mb-3 flex list-decimal flex-col gap-1.5 ps-5.5 text-[0.8125rem] leading-4.75"
									>
										{#each Array.from({ length: GUIDE_STEPS }, (_, n) => n + 1) as n (n)}<li>
												{t(`payment.guide_${guide}_${n}`)}
											</li>{/each}
									</ol>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</section>
		<aside
			class="lms-card flex min-w-60 flex-[0_1_17.5rem] flex-col gap-2.5 rounded-[14px]! p-4.5 text-[0.8125rem] shadow-none!"
		>
			<span class="text-lms-muted text-[11px] font-bold tracking-[0.12em] uppercase"
				>{t('payment.summary')}</span
			>
			{#each summary as row (row.k)}
				<div class="flex justify-between gap-2">
					<span class="text-lms-muted">{row.k}</span><span
						class={['text-right tabular-nums', row.strong ? 'font-bold' : 'font-medium']}
						>{row.v}</span
					>
				</div>
			{/each}
		</aside>
	</div>
{/if}
