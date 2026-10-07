<script lang="ts">
	import { resolve } from '$app/paths';
	import type { NpsnResult, RegistrationState, SignupCity } from '$lib/api/generated/lms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import type { PageActionOutcome } from '$lib/utils/page-action';
	import Check from '@lucide/svelte/icons/check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import FileText from '@lucide/svelte/icons/file-text';
	import Hash from '@lucide/svelte/icons/hash';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Upload from '@lucide/svelte/icons/upload';
	import { FILE_LIMITS, RULES, onlyDigits } from '../../registration.model';
	import type { RegistrationWizard } from '../../registration.state.svelte';
	import Field from '../Field.svelte';
	import Segmented from '../Segmented.svelte';

	interface Props {
		wizard: RegistrationWizard;
		tried: boolean;
		act: <T>(name: string, body?: unknown) => Promise<PageActionOutcome<T>>;
	}

	let { wizard, tried, act }: Props = $props();
	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
	const LEVELS = ['SD', 'SMP', 'SMA', 'SMK'] as const;
	const AUTOSAVE_MS = 1500;
	let fileError = $state<string | null>(null);
	let uploading = $state(false);

	const errors = $derived(wizard.errors);
	const err = (key: string, value: string | string[]) => {
		const code = tried || value.length > 0 ? errors[key] : undefined;
		return code ? t(`errors.${code}`) : undefined;
	};
	const editable = $derived(
		!wizard.server?.application ||
			['draft', 'revision_requested'].includes(wizard.server.application.status)
	);
	const files = $derived(wizard.server?.application?.files ?? []);
	const logo = $derived(files.find((f) => f.kind === 'logo'));
	const documents = $derived(files.filter((f) => f.kind === 'document'));
	const zoneOptions = $derived(
		wizard.catalog.timezones.map((z) => ({ value: z.code, label: z.label }))
	);
	const instLabel = $derived(t(`institution.name_${wizard.type}`));
	const instPh = $derived(t(`institution.name_ph_${wizard.type}`));

	async function onNpsn(e: Event & { currentTarget: HTMLInputElement }) {
		const v = onlyDigits(e.currentTarget.value, RULES.npsnDigits);
		e.currentTarget.value = v;
		wizard.npsn = v;
		if (v.length < RULES.npsnDigits) {
			wizard.npsnStatus = null;
			return;
		}
		wizard.npsnStatus = 'checking';
		const result = await act<NpsnResult>('npsn', { npsn: v });
		if (wizard.npsn !== v) return;
		if (!result.ok) {
			wizard.npsnStatus = 'manual';
			return;
		}
		wizard.npsnStatus = result.data.status;
		const school = result.data.school;
		if (result.data.status === 'found' && school) {
			wizard.institutionName = school.name;
			if (school.education_level) wizard.level = school.education_level;
			if (school.ownership === 'negeri' || school.ownership === 'swasta')
				wizard.ownership = school.ownership;
			wizard.address = school.address;
			if (school.province_code) await pickProvince(school.province_code, school.city_code);
		}
	}

	async function pickProvince(code: string, city = '') {
		wizard.province = code;
		wizard.city = city;
		wizard.timezone =
			wizard.catalog.provinces.find((p) => p.code === code)?.timezone ?? wizard.timezone;
		wizard.cities = [];
		if (!code) return;
		const result = await act<SignupCity[]>('cities', { province: code });
		if (result.ok && wizard.province === code) wizard.cities = result.data;
	}

	function toggleField(field: string) {
		wizard.teachingFields = wizard.teachingFields.includes(field)
			? wizard.teachingFields.filter((f) => f !== field)
			: [...wizard.teachingFields, field];
	}

	async function upload(kind: 'logo' | 'document', e: Event & { currentTarget: HTMLInputElement }) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		fileError = null;
		const types: readonly string[] =
			kind === 'logo' ? FILE_LIMITS.logoTypes : FILE_LIMITS.documentTypes;
		const max = kind === 'logo' ? FILE_LIMITS.logoBytes : FILE_LIMITS.documentBytes;
		if (!types.includes(file.type) || file.size > max) {
			fileError = t(kind === 'logo' ? 'institution.logo_invalid' : 'institution.document_invalid');
			return;
		}
		uploading = true;
		const data = await toBase64(file);
		const result = await act<RegistrationState>('upload', {
			kind,
			file_name: file.name,
			content_type: file.type,
			data_base64: data
		});
		uploading = false;
		if (!result.ok)
			fileError = t(kind === 'logo' ? 'institution.logo_invalid' : 'institution.document_invalid');
	}

	function toBase64(file: File): Promise<string> {
		return new Promise((ok, fail) => {
			const reader = new FileReader();
			reader.onload = () => ok(String(reader.result).split(',')[1] ?? '');
			reader.onerror = () => fail(reader.error);
			reader.readAsDataURL(file);
		});
	}

	// Draf tersimpan otomatis (referensi "Draf tersimpan HH.MM"): simpan sebagian tanpa validasi kelengkapan.
	$effect(() => {
		// Dibaca agar efek bergantung pada semua isian draf.
		void JSON.stringify([
			wizard.institutionName,
			wizard.npsn,
			wizard.level,
			wizard.ownership,
			wizard.address,
			wizard.province,
			wizard.city,
			wizard.timezone,
			wizard.teachingFields,
			wizard.organizerKind,
			wizard.participants
		]);
		if (!editable || !wizard.server?.application) return;
		const timer = setTimeout(() => {
			if (wizard.busy) return;
			void act<RegistrationState>('institution', {
				tenant_type: wizard.type,
				institution_name: wizard.institutionName.trim(),
				npsn:
					wizard.npsn.length === RULES.npsnDigits && wizard.npsnStatus !== 'used'
						? wizard.npsn
						: '',
				education_level: wizard.level,
				ownership: wizard.ownership,
				address: wizard.address.trim(),
				province_code: wizard.province,
				city_code: wizard.city,
				timezone: wizard.timezone,
				teaching_fields: wizard.teachingFields,
				organizer_kind: wizard.organizerKind,
				participants_per_session: Number(wizard.participants) || 0,
				partial: true
			});
		}, AUTOSAVE_MS);
		return () => clearTimeout(timer);
	});

	const npsnChip = $derived.by(() => {
		switch (wizard.npsnStatus) {
			case 'checking':
				return { text: t('institution.npsn_checking'), icon: LoaderCircle, cls: 'lms-tone-info' };
			case 'found':
				return { text: t('institution.npsn_found'), icon: CircleCheck, cls: 'lms-tone-success' };
			case 'used':
				return { text: t('institution.npsn_used'), icon: CircleX, cls: 'lms-tone-danger' };
			case 'manual':
				return { text: t('institution.npsn_manual'), icon: Pencil, cls: 'lms-tone-warning' };
			default:
				return {
					text: `${wizard.npsn.length}/${RULES.npsnDigits}`,
					icon: Hash,
					cls: 'bg-lms-surface-muted text-lms-muted'
				};
		}
	});
	const npsnNote = $derived(
		err('npsn', wizard.npsn) ??
			(wizard.npsnStatus === 'found'
				? t('institution.npsn_note_found')
				: wizard.npsnStatus === 'manual'
					? t('institution.npsn_note_manual')
					: t('institution.npsn_note_example'))
	);
</script>

<section class="lms-card flex flex-col gap-5 rounded-[14px]! p-6 shadow-none!">
	{#if wizard.type === 'school'}
		<div
			class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] items-start gap-x-4.5 gap-y-4"
		>
			<div class="flex flex-col gap-1.5">
				<label for="{uid}-npsn" class="text-[0.8125rem] font-semibold"
					>{t('institution.npsn')}</label
				>
				<span class="relative block">
					<input
						id="{uid}-npsn"
						value={wizard.npsn}
						oninput={onNpsn}
						inputmode="numeric"
						placeholder={t('institution.npsn_ph')}
						disabled={!editable}
						class="input lms-input lms-focus-ring h-11 font-mono text-[1.0625rem] tracking-[0.18em]"
						aria-invalid={Boolean(err('npsn', wizard.npsn))}
					/>
					<span
						class={[
							'absolute top-2.25 right-2 flex items-center gap-1.25 rounded-full px-2 py-1 text-[11px] font-bold',
							npsnChip.cls
						]}
					>
						<Icon icon={npsnChip.icon} size="sm" />{npsnChip.text}
					</span>
				</span>
				<span
					class={[
						'text-xs leading-4.25',
						err('npsn', wizard.npsn)
							? 'text-lms-danger-text'
							: wizard.npsnStatus === 'found'
								? 'text-lms-success-text'
								: wizard.npsnStatus === 'manual'
									? 'text-lms-warning-text'
									: 'text-lms-muted'
					]}>{npsnNote}</span
				>
			</div>
			<div class="flex flex-col gap-1.5">
				<span class="text-[0.8125rem] font-semibold">{t('institution.level')}</span>
				<Segmented
					options={LEVELS.map((l) => ({ value: l, label: l }))}
					value={wizard.level}
					label={t('institution.level')}
					onchange={(v) => editable && (wizard.level = v)}
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<span class="text-[0.8125rem] font-semibold">{t('institution.ownership')}</span>
				<Segmented
					options={[
						{ value: 'negeri' as const, label: t('institution.negeri') },
						{ value: 'swasta' as const, label: t('institution.swasta') }
					]}
					value={wizard.ownership}
					label={t('institution.ownership')}
					onchange={(v) => editable && (wizard.ownership = v)}
				/>
			</div>
		</div>
	{/if}
	<div
		class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] items-start gap-x-4.5 gap-y-4"
	>
		<Field
			label={instLabel}
			for="{uid}-inst"
			error={err('institutionName', wizard.institutionName)}
			wide
		>
			<input
				id="{uid}-inst"
				bind:value={wizard.institutionName}
				placeholder={instPh}
				disabled={!editable}
				class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
			/>
		</Field>
		{#if wizard.type === 'school'}
			<Field
				label={t('institution.address')}
				for="{uid}-addr"
				error={err('address', wizard.address)}
				wide
			>
				<textarea
					id="{uid}-addr"
					bind:value={wizard.address}
					rows="2"
					placeholder={t('institution.address_ph')}
					disabled={!editable}
					class="input lms-input lms-focus-ring resize-y py-2.5 text-[0.9375rem] leading-5.5"
				></textarea>
			</Field>
		{/if}
		{#if wizard.type === 'personal'}
			<div class="col-span-full flex flex-col gap-2">
				<span class="text-[0.8125rem] font-semibold">{t('institution.fields')}</span>
				<div class="flex flex-wrap gap-2" role="group" aria-label={t('institution.fields')}>
					{#each wizard.catalog.teaching_fields as field (field)}
						{@const on = wizard.teachingFields.includes(field)}
						<button
							type="button"
							aria-pressed={on}
							disabled={!editable}
							class={[
								'lms-focus-ring flex h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-[0.8125rem] font-semibold',
								on
									? 'border-lms-interactive bg-lms-interactive-subtle'
									: 'border-lms-input-border bg-lms-surface text-lms-muted'
							]}
							onclick={() => toggleField(field)}
						>
							<Icon icon={on ? Check : Plus} size="sm" />{field}
						</button>
					{/each}
				</div>
				{#if tried && errors.teachingFields}
					<span class="text-lms-danger-text text-xs" role="alert"
						>{t(`errors.${errors.teachingFields}`)}</span
					>
				{/if}
			</div>
		{/if}
		{#if wizard.type === 'event'}
			<Field label={t('institution.organizer_kind')} for="{uid}-kind">
				<select
					id="{uid}-kind"
					bind:value={wizard.organizerKind}
					disabled={!editable}
					class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
				>
					{#each wizard.catalog.organizer_kinds as kind (kind)}<option value={kind}>{kind}</option
						>{/each}
				</select>
			</Field>
			<Field
				label={t('institution.participants')}
				for="{uid}-pps"
				error={err('participants', wizard.participants)}
			>
				<input
					id="{uid}-pps"
					inputmode="numeric"
					value={wizard.participants}
					oninput={(e) => {
						wizard.participants = onlyDigits(e.currentTarget.value, 4);
						e.currentTarget.value = wizard.participants;
					}}
					placeholder={t('institution.participants_ph')}
					disabled={!editable}
					class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
				/>
			</Field>
		{/if}
		<Field
			label={t('institution.province')}
			for="{uid}-prov"
			error={tried ? err('province', '') : undefined}
		>
			<select
				id="{uid}-prov"
				value={wizard.province}
				onchange={(e) => pickProvince(e.currentTarget.value)}
				disabled={!editable}
				class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
			>
				<option value="">{t('institution.province_ph')}</option>
				{#each wizard.catalog.provinces as p (p.code)}<option value={p.code}>{p.name}</option
					>{/each}
			</select>
		</Field>
		<Field
			label={t('institution.city')}
			for="{uid}-city"
			error={tried ? err('city', '') : undefined}
		>
			<select
				id="{uid}-city"
				bind:value={wizard.city}
				disabled={!editable || !wizard.province}
				class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
			>
				<option value=""
					>{wizard.province ? t('institution.city_ph') : t('institution.city_ph_province')}</option
				>
				{#each wizard.cities as c (c.code)}<option value={c.code}>{c.name}</option>{/each}
			</select>
		</Field>
		<div class="flex flex-col gap-1.5">
			<span class="text-[0.8125rem] font-semibold">{t('institution.timezone')}</span>
			<Segmented
				options={zoneOptions}
				value={wizard.timezone}
				label={t('institution.timezone')}
				onchange={(v) => editable && (wizard.timezone = v)}
			/>
			<span class="text-lms-muted text-xs">{t('institution.timezone_hint')}</span>
		</div>
	</div>
	<div class="border-lms-border flex flex-wrap items-center gap-4 border-t pt-4.5">
		<span
			class="border-lms-input-border bg-lms-surface-muted flex size-18 flex-none items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-dashed"
		>
			{#if logo}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- proxy berkas sudah lewat resolve() -->
				<img
					src={`${resolve('/register/file')}?id=${logo.id}`}
					alt={t('institution.logo')}
					class="h-full w-full object-contain"
				/>
			{:else}
				<span class="text-lms-muted"><Icon icon={ImagePlus} /></span>
			{/if}
		</span>
		<span class="flex flex-[1_1_12.5rem] flex-col gap-0.75">
			<span class="text-sm font-semibold"
				>{t('institution.logo')}
				<span class="text-lms-muted font-normal">({t('optional')})</span></span
			>
			<span class="text-lms-muted text-xs">{t('institution.logo_hint')}</span>
		</span>
		<label
			class={[
				'btn border-lms-input-border bg-lms-surface lms-focus-ring h-9.5 cursor-pointer gap-2 rounded-lg border px-3.5 text-[0.8125rem] font-semibold',
				(!editable || uploading) && 'pointer-events-none opacity-60'
			]}
		>
			<Icon icon={Upload} size="sm" />{logo
				? t('institution.logo_replace')
				: t('institution.logo_upload')}
			<input
				type="file"
				accept={FILE_LIMITS.logoTypes.join(',')}
				class="sr-only"
				onchange={(e) => upload('logo', e)}
				disabled={!editable}
			/>
		</label>
	</div>
	<div class="border-lms-border flex flex-col gap-2.5 border-t pt-4.5">
		<div class="flex flex-wrap items-center gap-3">
			<span class="flex flex-[1_1_12.5rem] flex-col gap-0.75">
				<span class="text-sm font-semibold"
					>{t('institution.documents')}
					<span class="text-lms-muted font-normal">({t('optional')})</span></span
				>
				<span class="text-lms-muted text-xs">{t('institution.documents_hint')}</span>
			</span>
			<label
				class={[
					'btn border-lms-input-border bg-lms-surface lms-focus-ring h-9.5 cursor-pointer gap-2 rounded-lg border px-3.5 text-[0.8125rem] font-semibold',
					(!editable || uploading) && 'pointer-events-none opacity-60'
				]}
			>
				<Icon icon={Upload} size="sm" />{t('institution.documents_add')}
				<input
					type="file"
					accept={FILE_LIMITS.documentTypes.join(',')}
					class="sr-only"
					onchange={(e) => upload('document', e)}
					disabled={!editable}
				/>
			</label>
		</div>
		{#if documents.length}
			<ul class="flex flex-wrap gap-2">
				{#each documents as doc (doc.id)}
					<li
						class="border-lms-border bg-lms-background flex h-8.5 items-center gap-2 rounded-lg border ps-3 pe-1 text-[0.8125rem]"
					>
						<span class="text-lms-interactive"><Icon icon={FileText} size="sm" /></span>
						<!-- eslint-disable svelte/no-navigation-without-resolve -- proxy berkas sudah lewat resolve(); hanya query id ditambahkan -->
						<a
							href={`${resolve('/register/file')}?id=${doc.id}`}
							target="_blank"
							rel="noopener"
							class="lms-focus-ring max-w-50 truncate">{doc.file_name}</a
						>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{#if editable}
							<button
								type="button"
								class="text-lms-muted hover:text-lms-danger-text lms-focus-ring flex size-7 items-center justify-center"
								aria-label={t('institution.document_remove', { name: doc.file_name })}
								onclick={() => act('removeFile', { id: doc.id })}
							>
								<Icon icon={Trash2} size="sm" />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		{#if fileError}<span class="text-lms-danger-text text-xs" role="alert">{fileError}</span>{/if}
	</div>
</section>
