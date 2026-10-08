<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import type { PlansFailure } from '$lib/features/plans/plans.api';
	import {
		DEFAULT_MODEL,
		FEATURE_GROUPS,
		FREE_MONTHS,
		LIMITS_BY_MODEL,
		PLAN_STATUSES,
		PLAN_TENANT_TYPES,
		PROCTORING,
		RECURRING_MODELS,
		SESSION_LIMITS,
		SESSION_MINUTES,
		TAX_MODES,
		TRIAL_UNITS,
		blankDraft,
		draftFromPlan,
		formatRupiah,
		tierIssues,
		toSaveRequest,
		validateDraft,
		type LimitKey,
		type MasterIssue,
		type Plan,
		type PlanDraft,
		type PlanFeature,
		type PlanField,
		type PlanStatus,
		type PlanTenantType,
		type SessionLimitKey
	} from '$lib/features/plans/plans.model';
	import { useI18n } from '$lib/i18n';
	import type { LucideIcon } from '@lucide/svelte';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Hash from '@lucide/svelte/icons/hash';
	import Info from '@lucide/svelte/icons/info';
	import Layers from '@lucide/svelte/icons/layers';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Rocket from '@lucide/svelte/icons/rocket';
	import Search from '@lucide/svelte/icons/search';
	import Tag from '@lucide/svelte/icons/tag';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { tick, untrack } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`plans.${key}`, params);

	const ACCENT = '#4169E1';
	const TOAST_MS = 2600;
	/** Paket terpilih saat halaman dibuka (referensi `selId: 2`). */
	const INITIAL_CODE = 'SCH_STANDARD';
	const DESCRIPTION_MAX = 80;
	const mix = (color: string, percent: number) =>
		`color-mix(in oklch, ${color} ${percent}%, var(--color-lms-surface))`;

	const simulate = untrack(() => data.simulate);
	// Salinan kerja: diganti data server setelah simpan/hapus.
	let plans = $state<Plan[] | null>(
		untrack(() => (data.plans ? structuredClone(data.plans) : null))
	);
	$effect(() => {
		if (!simulate && data.plans) plans = structuredClone(data.plans);
	});

	type TypeFilter = 'all' | PlanTenantType;
	let query = $state('');
	let typeFilter = $state<TypeFilter>('all');

	const initial = untrack(() => plans?.find((p) => p.code === INITIAL_CODE) ?? plans?.[0] ?? null);
	/** Kode tersimpan paket yang sedang diubah; `null` = paket baru. */
	let selectedCode = $state<string | null>(initial?.code ?? null);
	let draft = $state<PlanDraft>(initial ? draftFromPlan(initial) : blankDraft());
	let original = $state(JSON.stringify(initial ? draftFromPlan(initial) : blankDraft()));
	let tried = $state(false);
	let isSaving = $state(false);
	let failure = $state<PlansFailure | null>(null);
	let serverErrors = $state<Partial<Record<string, string>>>({});
	let savedAt = $state<string | null>(null);
	let toast = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	let editor = $state<HTMLDivElement | null>(null);

	type ConfirmKind = 'publish' | 'delete';
	let confirmKind = $state<ConfirmKind | null>(null);
	let isConfirmOpen = $state(false);
	let saveForm = $state<HTMLFormElement | null>(null);
	let deleteForm = $state<HTMLFormElement | null>(null);
	/** Status yang dikirim submit berikutnya (Simpan = status draf; Publikasikan = Aktif). */
	let submitStatus = $state<PlanStatus>('draft');

	const q = $derived(query.trim().toLowerCase());
	const list = $derived(
		(plans ?? []).filter(
			(p) =>
				(typeFilter === 'all' || p.tenant_type_code === typeFilter) &&
				`${p.code} ${p.name}`.toLowerCase().includes(q)
		)
	);
	const savedPlan = $derived(plans?.find((p) => p.code === selectedCode) ?? null);
	const isPackage = $derived(draft.pricing_model === 'package');
	const unit = $derived(t(`price.unit.${draft.pricing_model}`));
	const errors = $derived(validateDraft(draft, plans ?? [], selectedCode));
	const errorCount = $derived(
		Object.keys(errors).length + Object.keys(serverErrors).filter((k) => !(k in errors)).length
	);
	const dirty = $derived(JSON.stringify(draft) !== original);
	const isPublished = $derived(draft.status === 'active' && savedPlan?.status === 'active');
	const issues = $derived(tierIssues(draft));

	/** Pesan galat isian: referensi menampilkan galat kode selalu, isian lain setelah mencoba simpan. */
	function fieldError(field: PlanField | string): string {
		const server = serverErrors[field];
		if (server) return server;
		const key = errors[field as PlanField];
		if (!key || (!tried && field !== 'code')) return '';
		return t(`errors.${key}`);
	}

	function say(message: string) {
		clearTimeout(toastTimer);
		toast = message;
		toastTimer = setTimeout(() => (toast = null), TOAST_MS);
	}

	function load(plan: Plan | null) {
		selectedCode = plan?.code ?? null;
		draft = plan ? draftFromPlan(plan) : blankDraft();
		original = JSON.stringify(draft);
		tried = false;
		failure = null;
		serverErrors = {};
	}

	function patch(values: Partial<PlanDraft>) {
		Object.assign(draft, values);
		for (const key of Object.keys(values)) delete serverErrors[key === 'price' ? 'price_idr' : key];
	}

	const digits = (value: string) => value.replace(/\D/g, '');

	function pickType(type: PlanTenantType) {
		patch({
			tenant_type_code: type,
			pricing_model: DEFAULT_MODEL[type],
			trial_enabled: type !== 'event'
		});
	}

	function setTier(index: number, key: 'from' | 'price', value: string) {
		const tier = draft.tiers[index];
		if (tier) tier[key] = digits(value);
		delete serverErrors.tiers;
	}

	function addTier() {
		const last = draft.tiers.at(-1);
		draft.tiers.push({ from: String(last ? Number(last.from) * 2 || 10 : 5), price: '' });
	}

	function toggleFeature(feature: PlanFeature) {
		patch({
			features: draft.features.includes(feature)
				? draft.features.filter((f) => f !== feature)
				: [...draft.features, feature]
		});
	}

	function discount(price: string): string {
		const base = Number(draft.price);
		const tier = Number(price);
		return base && tier && tier < base ? `−${Math.round((1 - tier / base) * 100)}%` : '–';
	}

	const tierExample = $derived.by(() => {
		const last = draft.tiers.at(-1);
		if (!last || !Number(last.from) || !Number(last.price)) return t('tiers.hint');
		return t('tiers.example', {
			n: last.from,
			price: formatRupiah(last.price),
			total: formatRupiah(Number(last.from) * Number(last.price))
		});
	});

	const yearNote = $derived(
		Number(draft.free_months)
			? t('price.year_note_bonus', { months: 12 - Number(draft.free_months) })
			: t('price.year_note')
	);

	const LIMIT_UNIT: Record<LimitKey | SessionLimitKey, string> = {
		min_seats: 'students',
		max_seats: 'students',
		max_teachers: 'accounts',
		storage_gb: 'gb',
		email_invites_per_month: 'per_month',
		max_participants_per_session: 'people',
		max_parallel_sessions: 'schedules',
		session_gap_minutes: 'minutes'
	};
	const LIMIT_PLACEHOLDER: Partial<Record<LimitKey | SessionLimitKey, string>> = {
		min_seats: '0',
		max_participants_per_session: '300',
		max_parallel_sessions: '1',
		session_gap_minutes: '0'
	};

	function limitLabel(key: LimitKey | SessionLimitKey): string {
		return key === 'max_seats' && draft.pricing_model === 'flat'
			? t('limits.max_seats_flat')
			: t(`limits.${key}`);
	}

	const preview = $derived({
		name: draft.name || t('preview.name'),
		price: formatRupiah(draft.price),
		description: draft.description || t('preview.desc_empty'),
		features: [
			...draft.features.slice(0, 4).map((f) => t(`features.${f}`)),
			...(draft.features.length > 4
				? [t('preview.more', { count: draft.features.length - 4 })]
				: [])
		],
		tiers: draft.tiers
			.filter((tier) => Number(tier.from) && Number(tier.price))
			.map((tier) => ({
				label: t('preview.tier', { n: tier.from }),
				price: formatRupiah(tier.price) + t('price.unit.package')
			})),
		session: t('preview.session', {
			minutes: draft.session_minutes,
			max: draft.max_participants_per_session || '–',
			proctor: t(`sessions.proctor.${draft.proctoring}`).toLowerCase()
		}),
		trial: isPackage
			? ''
			: draft.trial_enabled
				? t('preview.trial', {
						length: draft.trial_length,
						unit: t(`trial.unit.${draft.trial_unit}`),
						max: draft.trial_max_students
					})
				: t('preview.no_trial')
	});

	const barState = $derived.by((): { tone: string; icon: LucideIcon; text: string } => {
		if (tried && errorCount)
			return {
				tone: 'text-lms-danger-text',
				icon: CircleAlert,
				text: t('bar.errors', { count: errorCount })
			};
		if (failure)
			return { tone: 'text-lms-danger-text', icon: CircleAlert, text: t(`failure.${failure}`) };
		if (dirty) return { tone: 'text-lms-warning-text', icon: Pencil, text: t('bar.dirty') };
		return {
			tone: 'text-lms-muted',
			icon: CircleCheck,
			text: savedAt ? t('bar.saved', { time: savedAt }) : t('bar.clean')
		};
	});

	// ---------- simpan / publikasi / hapus ----------
	async function focusFirstError() {
		await tick();
		const field = editor?.querySelector<HTMLElement>('[aria-invalid="true"]');
		field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
		field?.focus({ preventScroll: true });
	}

	function canSubmit(): boolean {
		tried = true;
		if (Object.keys(errors).length) {
			void focusFirstError();
			return false;
		}
		return true;
	}

	function save(status: PlanStatus = draft.status) {
		if (!canSubmit()) return;
		submitStatus = status;
		if (simulate) {
			applySaved(simulatedPlan(status), status);
			return;
		}
		saveForm?.requestSubmit();
	}

	function askPublish() {
		if (canSubmit()) openConfirm('publish');
	}

	function askDelete() {
		if (draft.subscription_count > 0) {
			say(t('toast.in_use', { count: draft.subscription_count }));
			return;
		}
		openConfirm('delete');
	}

	function openConfirm(kind: ConfirmKind) {
		confirmKind = kind;
		isConfirmOpen = true;
	}

	async function handleConfirm() {
		const kind = confirmKind;
		confirmKind = null;
		if (kind === 'publish') save('active');
		if (kind === 'delete') {
			if (simulate) applyDeleted(selectedCode ?? '', draft.name);
			else deleteForm?.requestSubmit();
		}
	}

	function simulatedPlan(status: PlanStatus): Plan {
		const body = toSaveRequest(draft, status);
		return {
			...(savedPlan ?? {}),
			...body,
			min_seats: body.min_seats ?? null,
			max_seats: body.max_seats ?? null,
			max_teachers: body.max_teachers ?? null,
			storage_gb: body.storage_gb ?? null,
			email_invites_per_month: body.email_invites_per_month ?? null,
			max_participants_per_session: body.max_participants_per_session ?? null,
			session_minutes: body.session_minutes ?? null,
			max_parallel_sessions: body.max_parallel_sessions ?? null,
			session_gap_minutes: body.session_gap_minutes ?? null,
			trial_length: body.trial_length ?? null,
			trial_unit: body.trial_unit ?? null,
			trial_max_students: body.trial_max_students ?? null,
			subscription_count: draft.subscription_count,
			updated_at: new Date().toISOString()
		} as Plan;
	}

	function applySaved(plan: Plan, status: PlanStatus) {
		const wasPublish = status === 'active' && savedPlan?.status !== 'active';
		if (plans) {
			const index = plans.findIndex((p) => p.code === selectedCode);
			if (index >= 0) plans[index] = plan;
			else plans.push(plan);
		}
		load(plan);
		savedAt = new Date().toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' });
		say(t(wasPublish ? 'toast.published' : 'toast.saved', { name: plan.name }));
		if (!simulate) void invalidateAll();
	}

	function applyDeleted(code: string, name: string) {
		if (plans) plans = plans.filter((p) => p.code !== code);
		load(plans?.[0] ?? null);
		say(t('toast.deleted', { name }));
		if (!simulate) void invalidateAll();
	}

	function handleFailure(result: Record<string, unknown> | undefined) {
		const reason = (result?.reason as PlansFailure | undefined) ?? 'unavailable';
		const fieldIssues = (result?.issues as MasterIssue[] | undefined) ?? [];
		if (reason === 'validation' && fieldIssues.length) {
			serverErrors = Object.fromEntries(
				fieldIssues.map((issue) => [
					issue.field === 'price_idr' ? 'price' : issue.field,
					issue.message
				])
			);
			tried = true;
			failure = null;
			void focusFirstError();
			return;
		}
		if (reason === 'in_use') {
			say(t('toast.in_use', { count: Number(result?.subscriptions ?? 0) }));
			return;
		}
		failure = reason;
	}

	const submitSave: SubmitFunction = ({ formData }) => {
		const status = submitStatus;
		formData.set('code', selectedCode ?? '');
		formData.set('body', JSON.stringify(toSaveRequest(draft, status)));
		isSaving = true;
		return async ({ result }) => {
			isSaving = false;
			if (result.type === 'success') applySaved(result.data?.plan as Plan, status);
			else if (result.type === 'failure') handleFailure(result.data);
			else failure = 'unavailable';
		};
	};

	const submitDelete: SubmitFunction = ({ formData }) => {
		const code = selectedCode ?? '';
		const name = draft.name;
		formData.set('code', code);
		isSaving = true;
		return async ({ result }) => {
			isSaving = false;
			if (result.type === 'success') applyDeleted(code, name);
			else if (result.type === 'failure') handleFailure(result.data);
			else failure = 'unavailable';
		};
	};

	const confirmContent = $derived(
		confirmKind === 'delete'
			? {
					tone: 'danger' as const,
					icon: Trash2,
					title: t('confirm.delete_title', { name: draft.name }),
					message: t('confirm.delete_message'),
					label: t('confirm.delete_label'),
					busy: t('confirm.delete_busy'),
					details: [{ icon: Hash, label: t('confirm.code'), value: selectedCode ?? '' }]
				}
			: {
					tone: 'primary' as const,
					icon: Rocket,
					title: isPublished
						? t('confirm.apply_title')
						: t('confirm.publish_title', { name: draft.name || t('confirm.fallback_name') }),
					message: isPublished
						? t('confirm.apply_message')
						: t('confirm.publish_message', {
								type: t(`type.${draft.tenant_type_code}`).toLowerCase()
							}),
					label: isPublished ? t('confirm.apply_label') : t('confirm.publish_label'),
					busy: t('confirm.busy'),
					details: [
						{ icon: Tag, label: t('confirm.price'), value: formatRupiah(draft.price) + unit },
						{
							icon: Layers,
							label: t('confirm.features'),
							value: t('confirm.features_value', { count: draft.features.length })
						},
						{
							icon: Building2,
							label: t('confirm.customers'),
							value: String(draft.subscription_count)
						}
					]
				}
	);

	const STATUS_TONE: Record<PlanStatus, string> = {
		active: 'lms-tone-success',
		draft: 'lms-tone-warning',
		archived: 'bg-lms-surface-muted text-lms-muted'
	};

	const inputClass = (error: string, extra = '') => [
		'bg-lms-surface lms-focus-ring h-[42px] w-full min-w-0 rounded-[10px] border-[1.5px] px-3 text-sm',
		error ? 'border-lms-danger-text' : 'border-lms-border-strong',
		extra
	];
	const groupClass = (error: string) => [
		'bg-lms-surface flex overflow-hidden rounded-[10px] border-[1.5px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--color-lms-focus)',
		error ? 'border-lms-danger-text' : 'border-lms-border-strong'
	];
</script>

<svelte:head>
	<title>{t('head_title')} · FLIXARE</title>
</svelte:head>

{#snippet segmented<T extends string>(
	options: readonly T[],
	current: string,
	label: (value: T) => string,
	onpick: (value: T) => void,
	labelledby: string,
	extra = '',
	nowrap = false
)}
	<div
		class={['bg-lms-surface-muted flex gap-0.5 rounded-[10px] p-[3px]', extra]}
		role="radiogroup"
		aria-labelledby={labelledby}
	>
		{#each options as option (option)}
			{@const active = current === option}
			<button
				type="button"
				role="radio"
				aria-checked={active}
				class={[
					'lms-focus-ring min-h-9 min-w-0 flex-[1_1_0] rounded-lg p-1.5 text-center text-xs leading-tight font-semibold',
					nowrap ? 'whitespace-nowrap' : 'break-words',
					active ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
				]}
				onclick={() => onpick(option)}>{label(option)}</button
			>
		{/each}
	</div>
{/snippet}

{#snippet toggle(on: boolean, size: 'md' | 'sm' = 'md')}
	<span
		class={[
			'relative shrink-0 rounded-full transition-colors',
			size === 'md' ? 'h-[22px] w-10' : 'h-5 w-[34px]',
			on ? 'bg-lms-interactive' : 'bg-lms-border-strong'
		]}
		aria-hidden="true"
	>
		<span
			class={[
				'absolute top-[3px] left-[3px] rounded-full bg-white transition-transform',
				size === 'md' ? 'size-4' : 'size-3.5',
				on && (size === 'md' ? 'translate-x-[18px]' : 'translate-x-4')
			]}
		></span>
	</span>
{/snippet}

{#snippet limitField(key: LimitKey | SessionLimitKey, note = '', error = '')}
	{@const id = `plan-${key}`}
	<div class="flex flex-col gap-1.5">
		<label for={id} class="text-[13px] font-semibold">{limitLabel(key)}</label>
		<span class={groupClass(error)}>
			<input
				{id}
				inputmode="numeric"
				value={draft[key]}
				placeholder={LIMIT_PLACEHOLDER[key] ?? t('limits.unlimited')}
				aria-invalid={!!error}
				oninput={(e) => {
					e.currentTarget.value = digits(e.currentTarget.value);
					patch({ [key]: e.currentTarget.value });
				}}
				class="h-[39px] min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums outline-none"
			/>
			<span class="bg-lms-surface-muted text-lms-muted flex items-center px-2.5 text-xs"
				>{t(`limits.unit.${LIMIT_UNIT[key]}`)}</span
			>
		</span>
		<span class={['text-xs', error ? 'text-lms-danger-text' : 'text-lms-muted']}
			>{error || note}</span
		>
	</div>
{/snippet}

<!-- Referensi: FLIXARE App v3 · layar "04b Master Paket Langganan" (PlanMaster). -->
<div class="text-lms-foreground flex flex-col gap-4 pb-24 leading-[normal]">
	<HeroBanner
		eyebrow={t('eyebrow')}
		title={t('title')}
		description={t('description')}
		actionsPlacement="end"
	>
		{#snippet actions()}
			{#if plans}
				<button
					type="button"
					class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero lms-focus-ring flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
					onclick={() => load(null)}
				>
					<Icon icon={Plus} size="sm" />{t('new_plan')}
				</button>
			{/if}
		{/snippet}
	</HeroBanner>

	{#if simulate}
		<div
			class="lms-tone-warning flex items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] leading-[19px]"
			role="status"
		>
			<Icon icon={CircleAlert} size="sm" /><span>{t('simulation')}</span>
		</div>
	{/if}

	{#if !plans}
		<div
			class="border-lms-input-border bg-lms-surface text-lms-muted rounded-xl border border-dashed px-5 py-10 text-center text-sm"
			role="alert"
		>
			{t(`failure.${data.failure ?? 'unavailable'}`)}
		</div>
	{:else}
		<div class="flex flex-wrap items-start gap-4">
			<!-- Daftar paket -->
			<nav
				class="bg-lms-surface border-lms-border flex max-h-[calc(100vh-120px)] min-w-60 flex-[0_1_260px] flex-col overflow-auto rounded-xl border lg:sticky lg:top-21"
				aria-label={t('list_label')}
			>
				<div class="border-lms-border flex flex-col gap-2.5 border-b p-3">
					<label class="relative block">
						<span class="sr-only">{t('search')}</span>
						<span class="text-lms-muted pointer-events-none absolute top-[11px] left-3"
							><Icon icon={Search} size="sm" /></span
						>
						<input
							type="search"
							bind:value={query}
							placeholder={t('search')}
							class="border-lms-border-strong bg-lms-surface lms-focus-ring h-[38px] w-full rounded-lg border ps-9 pe-3 text-[13px]"
						/>
					</label>
					{@render segmented(
						['all', ...PLAN_TENANT_TYPES] as TypeFilter[],
						typeFilter,
						(v) => t(`filter.${v}`),
						(v) => (typeFilter = v),
						'plan-filter-label',
						'',
						true
					)}
					<span id="plan-filter-label" class="sr-only">{t('filter_label')}</span>
				</div>
				{#each list as p (p.code)}
					{@const selected = p.code === selectedCode}
					<button
						type="button"
						class="border-lms-border lms-focus-ring flex items-center gap-2.5 border-b px-3.5 py-3 text-start"
						style={selected
							? `background:${mix(ACCENT, 8)};box-shadow:inset 3px 0 0 ${ACCENT}`
							: ''}
						aria-current={selected ? 'true' : undefined}
						onclick={() => load(p)}
					>
						<span class="flex min-w-0 flex-1 flex-col gap-[3px]">
							<span class="text-sm font-bold">{p.name} · {t(`type.${p.tenant_type_code}`)}</span>
							<span class="text-lms-muted truncate font-mono text-[11px]"
								>{p.code} · {formatRupiah(p.price_idr)}{t(`price.unit.${p.pricing_model}`)}</span
							>
						</span>
						<span
							class={[
								'rounded-full px-2 py-[3px] text-[10px] font-bold tracking-wide',
								STATUS_TONE[p.status]
							]}>{t(`status.${p.status}`)}</span
						>
					</button>
				{/each}
				{#if !list.length}
					<p class="text-lms-muted px-3.5 py-6 text-center text-[13px]">{t('empty')}</p>
				{/if}
			</nav>

			<!-- Editor paket -->
			<div class="flex min-w-0 flex-[1_1_380px] flex-col gap-3.5" bind:this={editor}>
				<!-- Identitas -->
				<section class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="text-base font-bold">{t('identity.title')}</h2>
						<span class="text-lms-muted text-xs"
							>{draft.subscription_count
								? t('identity.usage', { count: draft.subscription_count })
								: t('identity.usage_none')}</span
						>
					</div>
					<div
						class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] items-start gap-x-4 gap-y-3.5"
					>
						<div class="flex flex-col gap-1.5">
							<label for="plan-code" class="text-[13px] font-semibold">{t('identity.code')}</label>
							<input
								id="plan-code"
								value={draft.code}
								placeholder={t('identity.code_ph')}
								readonly={draft.subscription_count > 0}
								aria-invalid={!!fieldError('code')}
								oninput={(e) => {
									e.currentTarget.value = e.currentTarget.value
										.toUpperCase()
										.replace(/[^A-Z0-9_]/g, '');
									patch({ code: e.currentTarget.value });
								}}
								class={inputClass(
									fieldError('code'),
									`font-mono ${draft.subscription_count > 0 ? 'bg-lms-surface-muted text-lms-muted' : ''}`
								)}
							/>
							<span
								class={['text-xs', fieldError('code') ? 'text-lms-danger-text' : 'text-lms-muted']}
								>{fieldError('code') || t('identity.code_hint')}</span
							>
						</div>
						<div class="flex flex-col gap-1.5">
							<label for="plan-name" class="text-[13px] font-semibold">{t('identity.name')}</label>
							<input
								id="plan-name"
								value={draft.name}
								aria-invalid={!!fieldError('name')}
								oninput={(e) => patch({ name: e.currentTarget.value })}
								class={inputClass(fieldError('name'))}
							/>
							<span class="text-lms-danger-text text-xs">{fieldError('name')}</span>
						</div>
						<div class="flex flex-col gap-1.5">
							<label for="plan-badge" class="text-[13px] font-semibold"
								>{t('identity.badge')}
								<span class="text-lms-muted font-normal">{t('identity.optional')}</span></label
							>
							<input
								id="plan-badge"
								value={draft.badge}
								maxlength="40"
								placeholder={t('identity.badge_ph')}
								oninput={(e) => patch({ badge: e.currentTarget.value })}
								class={inputClass(fieldError('badge'))}
							/>
						</div>
						<div class="flex flex-col gap-1.5">
							<span id="plan-type-label" class="text-[13px] font-semibold"
								>{t('identity.type')}</span
							>
							{@render segmented(
								PLAN_TENANT_TYPES,
								draft.tenant_type_code,
								(v) => t(`type.${v}`),
								pickType,
								'plan-type-label'
							)}
						</div>
						<div class="flex flex-col gap-1.5">
							<span id="plan-status-label" class="text-[13px] font-semibold"
								>{t('identity.status')}</span
							>
							{@render segmented(
								PLAN_STATUSES,
								draft.status,
								(v) => t(`status.${v}`),
								(v) => patch({ status: v }),
								'plan-status-label'
							)}
						</div>
						<div class="col-span-full flex flex-col gap-1.5">
							<label for="plan-description" class="text-[13px] font-semibold"
								>{t('identity.description')}</label
							>
							<input
								id="plan-description"
								value={draft.description}
								maxlength={DESCRIPTION_MAX}
								oninput={(e) => patch({ description: e.currentTarget.value })}
								class={inputClass(fieldError('description'))}
							/>
							<span class="text-lms-muted text-end text-xs"
								>{draft.description.length}/{DESCRIPTION_MAX}</span
							>
						</div>
					</div>
				</section>

				<!-- Harga -->
				<section class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5">
					<h2 id="plan-price-title" class="text-base font-bold">{t('price.title')}</h2>
					{#if draft.tenant_type_code !== 'event'}
						{@render segmented(
							RECURRING_MODELS,
							draft.pricing_model,
							(v) => t(`price.model.${v}`),
							(v) => patch({ pricing_model: v }),
							'plan-price-title',
							'self-start flex-wrap'
						)}
					{/if}
					<div
						class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] items-start gap-x-4 gap-y-3.5"
					>
						<div class="flex flex-col gap-1.5">
							<label for="plan-price" class="text-[13px] font-semibold"
								>{t('price.price', { unit: t(`price.unit_label.${draft.pricing_model}`) })}</label
							>
							<span class={groupClass(fieldError('price'))}>
								<span
									class="bg-lms-surface-muted text-lms-muted flex items-center px-2.5 text-[13px]"
									>Rp</span
								>
								<input
									id="plan-price"
									inputmode="numeric"
									value={draft.price}
									aria-invalid={!!fieldError('price')}
									oninput={(e) => {
										e.currentTarget.value = digits(e.currentTarget.value);
										patch({ price: e.currentTarget.value });
									}}
									class="h-[39px] min-w-0 flex-1 bg-transparent px-3 text-[15px] font-semibold tabular-nums outline-none"
								/>
							</span>
							<span class="text-lms-danger-text text-xs">{fieldError('price')}</span>
						</div>
						{#if !isPackage}
							<div class="flex flex-col gap-1.5">
								<label for="plan-free-months" class="text-[13px] font-semibold"
									>{t('price.yearly')}</label
								>
								<select
									id="plan-free-months"
									value={draft.free_months}
									onchange={(e) => patch({ free_months: e.currentTarget.value })}
									class={inputClass('')}
								>
									{#each FREE_MONTHS as months (months)}
										<option value={months}>{t(`price.free_months.${months}`)}</option>
									{/each}
								</select>
								<span class="text-lms-muted text-xs">{yearNote}</span>
							</div>
						{/if}
						<div class="flex flex-col gap-1.5">
							<span id="plan-tax-label" class="text-[13px] font-semibold">{t('price.tax')}</span>
							{@render segmented(
								TAX_MODES,
								draft.tax_mode,
								(v) => t(`price.tax_mode.${v}`),
								(v) => patch({ tax_mode: v }),
								'plan-tax-label'
							)}
						</div>
					</div>

					{#if isPackage}
						<div class="border-lms-border flex flex-col gap-2.5 border-t pt-4">
							<div class="flex flex-wrap items-baseline justify-between gap-3">
								<h3 class="text-sm font-bold">{t('tiers.title')}</h3>
								<span
									class={[
										'text-xs',
										fieldError('tiers') ? 'text-lms-danger-text' : 'text-lms-muted'
									]}
									>{fieldError('tiers') ||
										(draft.tiers.length
											? t('tiers.count', { count: draft.tiers.length + 1 })
											: t('tiers.none'))}</span
								>
							</div>
							<div
								class="text-lms-muted grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_64px_36px] items-center gap-x-2.5 font-mono text-[11px] tracking-wider"
							>
								<span>{t('tiers.from')}</span><span>{t('tiers.price')}</span><span class="text-end"
									>{t('tiers.discount')}</span
								><span></span>
							</div>
							<div
								class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_64px_36px] items-center gap-x-2.5"
							>
								<span
									class="bg-lms-surface-muted text-lms-muted flex h-10 items-center rounded-[10px] px-3 text-sm tabular-nums"
									>{t('tiers.one_session')}</span
								>
								<span
									class="bg-lms-surface-muted text-lms-muted flex h-10 items-center rounded-[10px] px-3 text-sm tabular-nums"
									>{formatRupiah(draft.price)}</span
								>
								<span class="text-lms-muted text-end text-xs">{t('tiers.base')}</span><span></span>
							</div>
							{#each draft.tiers as tier, index (index)}
								{@const issue = issues[index]}
								<div
									class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_64px_36px] items-center gap-x-2.5"
								>
									<span class={groupClass(tried && issue?.from ? 'x' : '')}>
										<input
											inputmode="numeric"
											aria-label={t('tiers.from')}
											aria-invalid={tried && !!issue?.from}
											value={tier.from}
											oninput={(e) => setTier(index, 'from', e.currentTarget.value)}
											class="h-[37px] min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums outline-none"
										/>
										<span
											class="bg-lms-surface-muted text-lms-muted flex items-center px-2.5 text-xs"
											>{t('tiers.sessions_suffix')}</span
										>
									</span>
									<span class={groupClass(tried && issue?.price ? 'x' : '')}>
										<span
											class="bg-lms-surface-muted text-lms-muted flex items-center px-2.5 text-[13px]"
											>Rp</span
										>
										<input
											inputmode="numeric"
											aria-label={t('tiers.price')}
											aria-invalid={tried && !!issue?.price}
											value={tier.price}
											oninput={(e) => setTier(index, 'price', e.currentTarget.value)}
											class="h-[37px] min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold tabular-nums outline-none"
										/>
									</span>
									<span class="text-lms-success-text text-end text-[13px] font-bold tabular-nums"
										>{discount(tier.price)}</span
									>
									<button
										type="button"
										class="border-lms-border-strong bg-lms-surface text-lms-muted lms-focus-ring flex size-9 items-center justify-center rounded-lg border"
										title={t('tiers.remove')}
										aria-label={t('tiers.remove')}
										onclick={() => draft.tiers.splice(index, 1)}
									>
										<Icon icon={Trash2} size="sm" />
									</button>
								</div>
							{/each}
							<button
								type="button"
								class="border-lms-border-strong text-lms-interactive lms-focus-ring flex h-9 items-center gap-1.5 self-start rounded-lg border border-dashed px-3 text-[13px] font-semibold"
								onclick={addTier}
							>
								<Icon icon={Plus} size="sm" />{t('tiers.add')}
							</button>
							<span class="text-lms-muted text-xs">{tierExample}</span>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={draft.allow_topup}
							class="border-lms-border lms-focus-ring flex items-center gap-3 border-t pt-4 text-start"
							onclick={() => patch({ allow_topup: !draft.allow_topup })}
						>
							{@render toggle(draft.allow_topup)}
							<span class="flex flex-col gap-0.5">
								<span class="text-sm font-bold">{t('topup.title')}</span>
								<span class="text-lms-muted text-xs"
									>{draft.allow_topup
										? t('topup.on', { price: formatRupiah(draft.price) })
										: t('topup.off')}</span
								>
							</span>
						</button>
					{/if}
				</section>

				{#if !isPackage}
					<!-- Batas pemakaian -->
					<section
						class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5"
					>
						<h2 class="text-base font-bold">{t('limits.title')}</h2>
						<div
							class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] items-start gap-x-4 gap-y-3.5"
						>
							{#each LIMITS_BY_MODEL[draft.pricing_model] as key (key)}
								{@render limitField(key, '', key === 'max_seats' ? fieldError('max_seats') : '')}
							{/each}
						</div>
					</section>
				{:else}
					<!-- Aturan sesi -->
					<section
						class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5"
					>
						<h2 class="text-base font-bold">{t('sessions.title')}</h2>
						<div
							class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] items-start gap-x-4 gap-y-3.5"
						>
							<div class="flex flex-col gap-1.5">
								<span id="plan-duration-label" class="text-[13px] font-semibold"
									>{t('sessions.duration')}</span
								>
								{@render segmented(
									SESSION_MINUTES,
									draft.session_minutes,
									(v) => t('sessions.minutes', { n: v }),
									(v) => patch({ session_minutes: v }),
									'plan-duration-label'
								)}
								<span class="text-lms-muted text-xs">{t('sessions.duration_note')}</span>
							</div>
							<div class="flex flex-col gap-1.5">
								<span id="plan-proctor-label" class="text-[13px] font-semibold"
									>{t('sessions.proctoring')}</span
								>
								<div
									class="bg-lms-surface-muted grid grid-cols-2 gap-0.5 rounded-[10px] p-[3px]"
									role="radiogroup"
									aria-labelledby="plan-proctor-label"
								>
									{#each PROCTORING as option (option)}
										{@const active = draft.proctoring === option}
										<button
											type="button"
											role="radio"
											aria-checked={active}
											class={[
												'lms-focus-ring min-h-9 min-w-0 rounded-lg p-1.5 text-center text-xs leading-tight font-semibold break-words',
												active ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
											]}
											onclick={() => patch({ proctoring: option })}
											>{t(`sessions.proctor.${option}`)}</button
										>
									{/each}
								</div>
								<span class="text-lms-muted text-xs"
									>{t(`sessions.proctor_note.${draft.proctoring}`)}</span
								>
							</div>
						</div>
						<div
							class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] items-start gap-x-4 gap-y-3.5"
						>
							{#each SESSION_LIMITS as key (key)}
								{@render limitField(
									key,
									key === 'max_parallel_sessions'
										? t('sessions.parallel_note')
										: key === 'session_gap_minutes'
											? t('sessions.gap_note')
											: '',
									key === 'session_gap_minutes' ? '' : fieldError(key)
								)}
							{/each}
						</div>
						<div
							class="bg-lms-surface-muted text-lms-muted flex items-start gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px] leading-5"
						>
							<span class="text-lms-interactive mt-0.5"><Icon icon={Info} size="sm" /></span>
							<span>{t('sessions.info')}</span>
						</div>
					</section>
				{/if}

				{#if !isPackage}
					<!-- Trial -->
					<section
						class="bg-lms-surface border-lms-border flex flex-col gap-4 rounded-xl border p-5"
					>
						<button
							type="button"
							role="switch"
							aria-checked={draft.trial_enabled}
							class="lms-focus-ring flex items-center gap-3 self-start rounded-lg text-start"
							onclick={() => patch({ trial_enabled: !draft.trial_enabled })}
						>
							{@render toggle(draft.trial_enabled)}
							<span class="text-base font-bold">{t('trial.title')}</span>
						</button>
						{#if draft.trial_enabled}
							<div
								class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] items-start gap-x-4 gap-y-3.5"
							>
								<div class="flex flex-col gap-1.5">
									<label for="plan-trial-length" class="text-[13px] font-semibold"
										>{t('trial.duration')}</label
									>
									<span class="flex gap-1.5">
										<input
											id="plan-trial-length"
											inputmode="numeric"
											value={draft.trial_length}
											aria-invalid={!!fieldError('trial_length')}
											oninput={(e) => {
												e.currentTarget.value = digits(e.currentTarget.value);
												patch({ trial_length: e.currentTarget.value });
											}}
											class={inputClass(fieldError('trial_length'), 'w-[70px]! flex-none')}
										/>
										<select
											aria-label={t('trial.unit_label')}
											value={draft.trial_unit}
											onchange={(e) =>
												patch({ trial_unit: e.currentTarget.value as PlanDraft['trial_unit'] })}
											class={inputClass('', 'flex-1')}
										>
											{#each TRIAL_UNITS as option (option)}
												<option value={option}>{t(`trial.unit.${option}`)}</option>
											{/each}
										</select>
									</span>
									<span class="text-lms-danger-text text-xs">{fieldError('trial_length')}</span>
								</div>
								<div class="flex flex-col gap-1.5">
									<label for="plan-trial-max" class="text-[13px] font-semibold"
										>{t('trial.max')}</label
									>
									<input
										id="plan-trial-max"
										inputmode="numeric"
										value={draft.trial_max_students}
										aria-invalid={!!fieldError('trial_max_students')}
										oninput={(e) => {
											e.currentTarget.value = digits(e.currentTarget.value);
											patch({ trial_max_students: e.currentTarget.value });
										}}
										class={inputClass(fieldError('trial_max_students'))}
									/>
									<span class="text-lms-danger-text text-xs"
										>{fieldError('trial_max_students')}</span
									>
								</div>
							</div>
							<div class="flex flex-col gap-2.5">
								{#each ['trial_manual_approval', 'trial_one_per_npsn'] as const as rule (rule)}
									{@const on = draft[rule]}
									<button
										type="button"
										role="checkbox"
										aria-checked={on}
										class="lms-focus-ring flex items-center gap-3 self-start rounded-md text-start text-[13px]"
										onclick={() => patch({ [rule]: !on })}
									>
										<span
											class={[
												'flex size-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] text-white',
												on
													? 'bg-lms-interactive border-lms-interactive'
													: 'border-lms-border-strong'
											]}
										>
											{#if on}<Icon icon={Check} size="sm" />{/if}
										</span>
										<span class="flex flex-col">
											<span class="font-semibold">{t(`trial.${rule}`)}</span>
											<span class="text-lms-muted text-xs">{t(`trial.${rule}_sub`)}</span>
										</span>
									</button>
								{/each}
							</div>
						{/if}
					</section>
				{/if}

				<!-- Fitur -->
				<section
					class="bg-lms-surface border-lms-border flex flex-col gap-3.5 rounded-xl border p-5"
				>
					<div class="flex items-baseline justify-between gap-3">
						<h2 class="text-base font-bold">{t('features.title')}</h2>
						<span
							id="plan-features-note"
							class={[
								'text-xs',
								fieldError('features') ? 'text-lms-danger-text' : 'text-lms-muted'
							]}
							>{fieldError('features') ||
								t('features.count', { count: draft.features.length })}</span
						>
					</div>
					<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-4">
						{#each FEATURE_GROUPS as group (group.group)}
							<div class="flex flex-col gap-2">
								<span class="text-lms-muted font-mono text-[11px] tracking-widest"
									>{t(`features.groups.${group.group}`)}</span
								>
								{#each group.features as feature (feature)}
									{@const on = draft.features.includes(feature)}
									<button
										type="button"
										role="switch"
										aria-checked={on}
										aria-invalid={!!fieldError('features') || undefined}
										class="lms-focus-ring flex items-center gap-2.5 rounded-[10px] border px-3 py-[9px] text-start text-[13px] font-semibold transition-colors"
										style={on
											? `background:${mix(ACCENT, 6)};border-color:${mix(ACCENT, 35)}`
											: 'background:var(--color-lms-surface);border-color:var(--color-lms-border)'}
										onclick={() => toggleFeature(feature)}
									>
										{@render toggle(on, 'sm')}{t(`features.${feature}`)}
									</button>
								{/each}
							</div>
						{/each}
					</div>
				</section>

				<!-- Pratinjau -->
				<section
					class="bg-lms-surface border-lms-border flex flex-wrap items-start gap-5 rounded-xl border p-5"
				>
					<div class="flex flex-[1_1_220px] flex-col gap-1.5">
						<h2 class="text-base font-bold">{t('preview.title')}</h2>
						<p class="text-lms-muted text-[13px] leading-5">{t('preview.desc')}</p>
					</div>
					<div
						class="relative flex min-w-[220px] flex-[0_1_260px] flex-col gap-2.5 rounded-[14px] border-2 p-[18px]"
						style="border-color:{ACCENT};background:{mix(ACCENT, 6)}"
					>
						{#if draft.badge}
							<span
								class="absolute -top-2.5 left-4 rounded-full px-2 py-[3px] text-[10px] font-bold tracking-wider text-white"
								style="background:{ACCENT}">{draft.badge}</span
							>
						{/if}
						<span class="text-base font-bold">{preview.name}</span>
						<span
							><span class="text-[22px] font-bold tabular-nums">{preview.price}</span><span
								class="text-lms-muted text-xs"
							>
								{unit}</span
							></span
						>
						{#if isPackage}
							<span class="flex flex-col gap-1">
								{#each preview.tiers as tier (tier.label)}
									<span class="text-lms-muted flex justify-between text-xs"
										><span>{tier.label}</span><span
											class="text-lms-foreground font-semibold tabular-nums">{tier.price}</span
										></span
									>
								{/each}
							</span>
							<span class="text-lms-muted text-[11px]">{preview.session}</span>
						{/if}
						<span class="text-lms-muted text-xs">{preview.description}</span>
						<span class="border-lms-border flex flex-col gap-1.5 border-t pt-2.5">
							{#each preview.features as feature (feature)}
								<span class="flex items-center gap-2 text-xs"
									><span class="text-lms-progress"><Icon icon={Check} size="sm" /></span
									>{feature}</span
								>
							{/each}
						</span>
						{#if preview.trial}
							<span class="text-lms-success-text text-[11px] font-semibold">{preview.trial}</span>
						{/if}
					</div>
				</section>

				<!-- Bar simpan -->
				<div
					class="bg-lms-surface border-lms-border sticky bottom-4 z-5 flex flex-wrap items-center gap-2.5 rounded-xl border py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_rgba(15,24,56,0.4)]"
				>
					{#if selectedCode}
						<button
							type="button"
							class={[
								'border-lms-border-strong bg-lms-surface text-lms-danger-text lms-focus-ring flex size-[42px] items-center justify-center rounded-[10px] border',
								draft.subscription_count > 0 && 'opacity-40'
							]}
							aria-label={t('bar.delete')}
							title={draft.subscription_count > 0 ? t('bar.delete_blocked') : t('bar.delete')}
							disabled={isSaving}
							onclick={askDelete}
						>
							<Icon icon={Trash2} size="sm" />
						</button>
					{/if}
					<span
						class={['flex flex-[1_1_200px] items-center gap-2 text-[13px]', barState.tone]}
						role="status"
					>
						<Icon icon={barState.icon} size="sm" />{barState.text}
					</span>
					<button
						type="button"
						class="border-lms-border-strong bg-lms-surface lms-focus-ring h-[42px] rounded-[10px] border px-4 text-sm font-semibold"
						disabled={isSaving}
						aria-busy={isSaving && submitStatus !== 'active'}
						onclick={() => save()}
					>
						{isSaving ? t('bar.saving') : t('bar.save')}
					</button>
					<button
						type="button"
						class="lms-action-primary lms-focus-ring flex h-[42px] items-center gap-2 rounded-[10px] px-[18px] text-sm font-bold"
						disabled={isSaving}
						onclick={askPublish}
					>
						<Icon icon={Rocket} size="sm" />{isPublished ? t('bar.apply') : t('bar.publish')}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<Toast message={toast} />

{#if confirmKind}
	<ConfirmDialog
		bind:open={isConfirmOpen}
		tone={confirmContent.tone}
		icon={confirmContent.icon}
		title={confirmContent.title}
		message={confirmContent.message}
		details={confirmContent.details}
		confirmLabel={confirmContent.label}
		confirmIcon={Check}
		busyLabel={confirmContent.busy}
		cancelLabel={t('confirm.cancel')}
		keyHint={t('confirm.key_hint')}
		onconfirm={handleConfirm}
	/>
{/if}

<form
	method="POST"
	action="?/{selectedCode ? 'update' : 'create'}"
	use:enhance={submitSave}
	bind:this={saveForm}
	hidden
></form>
<form
	method="POST"
	action="?/delete"
	use:enhance={submitDelete}
	bind:this={deleteForm}
	hidden
></form>
