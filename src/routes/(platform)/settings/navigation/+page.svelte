<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import ConfirmDialog, { type ConfirmDialogDetail } from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { NavigationFailure } from '$lib/features/navigation/navigation.api';
	import {
		NavigationEditor,
		type EditorGroup,
		type EditorItem,
		type GroupToggleKey
	} from '$lib/features/navigation/navigation-editor.svelte';
	import {
		NAME_MAX_LENGTH,
		NAVIGATION_BADGES,
		NAVIGATION_ICON_KEYS,
		NAVIGATION_ROLES,
		NAVIGATION_TARGETS,
		isExternalRoute,
		navigationIcon,
		normalizeRoute,
		type FieldError,
		type NavigationIssue,
		type NavigationLayout,
		type NavigationRole
	} from '$lib/features/navigation/navigation.model';
	import { useI18n } from '$lib/i18n';
	import type { LucideIcon } from '@lucide/svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import Layers from '@lucide/svelte/icons/layers';
	import Link from '@lucide/svelte/icons/link';
	import List from '@lucide/svelte/icons/list';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Search from '@lucide/svelte/icons/search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`navigation.${key}`, params);

	const editor = untrack(() => (data.layouts ? new NavigationEditor(data.layouts) : null));
	const simulate = untrack(() => data.simulate);

	type ConfirmKind = 'delete' | 'reset';
	let confirmKind = $state<ConfirmKind | null>(null);
	let isConfirmOpen = $state(false);
	let isSaving = $state(false);
	let failure = $state<NavigationFailure | null>(null);
	let resetForm = $state<HTMLFormElement | null>(null);

	const timeLabel = () =>
		new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

	// ---------- turunan tampilan (cermin renderVals referensi) ----------
	const role = $derived(editor?.role ?? 'platform');
	const accent = $derived(NAVIGATION_ROLES.find((r) => r.key === role)?.accent ?? '#4169E1');
	const roleLabel = $derived(t(`roles.${role}`));
	const tree = $derived(editor?.tree ?? []);
	const errors = $derived(editor?.errors ?? {});
	const errorCount = $derived(Object.keys(errors).length);
	const tried = $derived(editor?.tried ?? false);
	const dirty = $derived(editor?.isDirty() ?? false);
	const totalItems = $derived(tree.reduce((sum, g) => sum + g.items.length, 0));
	const hiddenItems = $derived(
		tree.reduce(
			(sum, g) => sum + (g.hidden ? g.items.length : g.items.filter((m) => m.hidden).length),
			0
		)
	);
	const query = $derived((editor?.query ?? '').trim().toLowerCase());
	const tenant = $derived(
		data.preview?.tenants[role] ?? {
			initials: role === 'platform' ? 'FX' : 'SK',
			name: role === 'platform' ? 'FLIXARE Console' : t('preview.school'),
			host: role === 'platform' ? `platform.${data.rootDomain}` : `<sekolah>.${data.rootDomain}`
		}
	);

	const mix = (percent: number) =>
		`color-mix(in oklch, ${accent} ${percent}%, var(--color-lms-surface))`;
	const selectedStyle = (selected: boolean) =>
		selected ? `background:${mix(12)};box-shadow:inset 3px 0 0 ${accent}` : '';

	/** Error nama/rute ditampilkan setelah simpan dicoba; rute tidak valid/duplikat langsung tampil (referensi). */
	function visibleError(uid: string, field: 'name' | 'route'): FieldError | undefined {
		const error = errors[uid]?.[field];
		if (!error) return undefined;
		if (tried || error.key === 'server') return error;
		return field === 'route' && error.key !== 'route_required' ? error : undefined;
	}

	function errorText(error: FieldError | undefined): string {
		if (!error) return '';
		if (error.key === 'server') return error.message ?? '';
		return t(`errors.${error.key}`, { other: error.other ?? '' });
	}

	const visibleTree = $derived(
		tree
			.map((g, gi) => {
				const groupHit = g.name.toLowerCase().includes(query);
				const items = g.items
					.map((m, mi) => ({ m, mi }))
					.filter(
						({ m }) => !query || groupHit || `${m.name} ${m.route}`.toLowerCase().includes(query)
					);
				if (query && !groupHit && !items.length) return null;
				return { g, gi, items, expanded: query ? true : !editor?.collapsed[g.uid] };
			})
			.filter((entry) => entry !== null)
	);

	function groupMeta(g: EditorGroup): string {
		let meta = t('tree.count', { count: g.items.length });
		if (g.clickable) meta += ` · ${g.route || t('tree.route_empty')}`;
		if (g.hidden) meta += ` · ${t('tree.hidden')}`;
		else if (!g.show_label) meta += ` · ${t('tree.no_title')}`;
		return meta;
	}

	const selectedGroup = $derived(editor?.selectedGroup);
	const selectedItem = $derived(editor?.selectedItem);
	const node = $derived<EditorGroup | EditorItem | undefined>(selectedItem ?? selectedGroup);
	const nameError = $derived(node ? visibleError(node.uid, 'name') : undefined);
	const routeError = $derived(node ? visibleError(node.uid, 'route') : undefined);
	const showRoute = $derived(!!selectedItem || !!selectedGroup?.clickable);
	const routeHost = $derived(
		node?.route && isExternalRoute(node.route) ? node.route : tenant.host + (node?.route || '/…')
	);

	const GROUP_TOGGLES: GroupToggleKey[] = ['show_label', 'default_open', 'clickable'];

	// Pratinjau sidebar: grup tampil bila punya menu tampil atau bisa diklik (referensi `pv`).
	const preview = $derived(
		tree
			.filter((g) => !g.hidden && (g.items.some((m) => !m.hidden) || g.clickable))
			.map((g) => ({
				g,
				showLabel: g.show_label || !g.default_open,
				closed: !g.default_open,
				items: g.default_open || !g.show_label ? g.items.filter((m) => !m.hidden) : []
			}))
	);
	const badgeSample = (badge: string) =>
		data.preview?.badgeSamples[badge as keyof typeof data.preview.badgeSamples];

	const barState = $derived.by(
		(): { tone: 'error' | 'warn' | 'muted'; icon: LucideIcon; text: string } => {
			if (tried && errorCount)
				return { tone: 'error', icon: CircleAlert, text: t('bar.errors', { count: errorCount }) };
			if (failure) return { tone: 'error', icon: CircleAlert, text: t(`failure.${failure}`) };
			if (dirty) return { tone: 'warn', icon: Pencil, text: t('bar.dirty', { role: roleLabel }) };
			const savedAt = editor?.savedAt[role];
			if (savedAt)
				return { tone: 'muted', icon: CircleCheck, text: t('bar.saved', { time: savedAt }) };
			return { tone: 'muted', icon: CircleCheck, text: t('bar.clean') };
		}
	);
	const TONE_CLASS = {
		error: 'text-lms-danger-text',
		warn: 'text-lms-warning-text',
		muted: 'text-lms-muted'
	};

	const confirmContent = $derived.by(
		(): {
			icon: LucideIcon;
			title: string;
			message: string;
			label: string;
			details: ConfirmDialogDetail[];
		} | null => {
			if (confirmKind === 'reset') {
				return {
					icon: RotateCcw,
					title: t('confirm.reset_title'),
					message: t('confirm.reset_message', { role: roleLabel }),
					label: t('confirm.reset_confirm'),
					details: [
						{
							icon: Layers,
							label: t('confirm.current_layout'),
							value: t('summary', { groups: tree.length, items: totalItems })
						}
					]
				};
			}
			if (confirmKind === 'delete' && node && selectedGroup) {
				return selectedItem
					? {
							icon: Trash2,
							title: t('confirm.delete_item_title', { name: selectedItem.name }),
							message: t('confirm.delete_item_message', { role: roleLabel }),
							label: t('confirm.delete_confirm'),
							details: [{ icon: Link, label: t('editor.route'), value: selectedItem.route || '—' }]
						}
					: {
							icon: Trash2,
							title: t('confirm.delete_group_title', { name: selectedGroup.name }),
							message: t('confirm.delete_group_message', {
								role: roleLabel,
								count: selectedGroup.items.length
							}),
							label: t('confirm.delete_confirm'),
							details: [
								{
									icon: List,
									label: t('confirm.items_deleted'),
									value: String(selectedGroup.items.length)
								}
							]
						};
			}
			return null;
		}
	);

	function openConfirm(kind: ConfirmKind) {
		confirmKind = kind;
		isConfirmOpen = true;
	}

	async function handleConfirm() {
		if (!editor) return;
		if (confirmKind === 'delete') editor.deleteSelected();
		if (confirmKind === 'reset') {
			if (simulate) applyResult(defaultLayoutFor(editor.role));
			else resetForm?.requestSubmit();
		}
		confirmKind = null;
	}

	function defaultLayoutFor(r: NavigationRole): NavigationLayout {
		const layout = data.layouts?.[r];
		return { ...(layout as NavigationLayout), version: (editor?.versions[r] ?? 0) + 1 };
	}

	function applyResult(layout: NavigationLayout) {
		editor?.applySaved(layout, timeLabel());
		failure = null;
		// Sidebar platform dibaca dari susunan ini → muat ulang layout agar langsung berlaku.
		if (layout.role === 'platform' && !simulate) void invalidate('app:navigation');
	}

	function handleFailure(data: Record<string, unknown> | undefined) {
		const reason = (data?.reason as NavigationFailure | undefined) ?? 'unavailable';
		const issues = (data?.issues as NavigationIssue[] | undefined) ?? [];
		if (reason === 'validation' && issues.length) {
			editor?.applyServerIssues(issues);
			failure = null;
			return;
		}
		failure = reason;
	}

	const submitSave: SubmitFunction = ({ formData, cancel }) => {
		const payload = editor?.prepareSave();
		if (!editor || !payload) {
			cancel();
			return;
		}
		if (simulate) {
			cancel();
			applySimulatedSave();
			return;
		}
		formData.set('role', payload.role);
		formData.set('version', String(payload.version));
		formData.set('groups', JSON.stringify(payload.groups));
		isSaving = true;
		return async ({ result }) => {
			isSaving = false;
			if (result.type === 'success') applyResult(result.data?.layout as NavigationLayout);
			else if (result.type === 'failure') handleFailure(result.data);
			else failure = 'unavailable';
		};
	};

	const submitReset: SubmitFunction = ({ formData }) => {
		formData.set('role', role);
		formData.set('version', String(editor?.versions[role] ?? 0));
		isSaving = true;
		return async ({ result }) => {
			isSaving = false;
			if (result.type === 'success') applyResult(result.data?.layout as NavigationLayout);
			else if (result.type === 'failure') handleFailure(result.data);
			else failure = 'unavailable';
		};
	};

	/** Dev tanpa backend: simpan hanya ke state lokal (ID baru diberi ID sementara). */
	function applySimulatedSave() {
		if (!editor) return;
		const r = editor.role;
		const groups = editor.tree.map((g) => ({
			id: g.id ?? g.uid,
			code: g.uid,
			name: g.name.trim(),
			icon: g.icon,
			route: g.clickable ? g.route : '',
			show_label: g.show_label,
			default_open: g.default_open,
			clickable: g.clickable,
			hidden: g.hidden,
			items: g.items.map((m) => ({
				id: m.id ?? m.uid,
				code: m.uid,
				name: m.name.trim(),
				icon: m.icon,
				route: m.route,
				target: m.target,
				hidden: m.hidden,
				badge: m.badge
			}))
		}));
		applyResult({
			role: r,
			version: editor.versions[r] + 1,
			updated_at: new Date().toISOString(),
			groups
		});
	}

	function handleRoleChange(next: NavigationRole) {
		editor?.setRole(next);
		failure = null;
	}
</script>

<svelte:head>
	<title>{t('title')} · FLIXARE</title>
</svelte:head>

<!-- Referensi: FLIXARE App v3 · layar "04c Menu & Navigasi" (MenuMaster). -->
<!-- line-height `normal` mengikuti referensi (body referensi tidak menetapkan line-height). -->
<div class="text-lms-foreground flex flex-col gap-4 leading-[normal]">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-1.5">
			<span class="text-lms-interactive font-mono text-xs font-semibold tracking-widest"
				>{t('eyebrow')}</span
			>
			<h1 class="text-[26px] leading-[34px] font-bold">{t('title')}</h1>
			<p class="text-lms-muted max-w-180 text-sm text-pretty">{t('description')}</p>
		</div>
		{#if editor}
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="border-lms-border-strong bg-lms-surface lms-focus-ring flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-sm font-semibold"
					onclick={() => editor.addGroup()}
				>
					<Icon icon={FolderPlus} size="sm" />{t('actions.new_group')}
				</button>
				<button
					type="button"
					class="lms-action-primary lms-focus-ring flex h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold"
					onclick={() => editor.addItem()}
				>
					<Icon icon={Plus} size="sm" />{t('actions.new_item')}
				</button>
			</div>
		{/if}
	</div>

	{#if simulate}
		<div
			class="lms-tone-warning flex items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] leading-[19px]"
			role="status"
		>
			<Icon icon={TriangleAlert} size="sm" /><span>{t('simulation')}</span>
		</div>
	{/if}

	{#if !editor}
		<div
			class="border-lms-input-border bg-lms-surface text-lms-muted rounded-xl border border-dashed px-5 py-10 text-center text-sm"
			role="alert"
		>
			{t(`failure.${data.failure ?? 'unavailable'}`)}
		</div>
	{:else}
		<!-- Tab peran + ringkasan -->
		<div
			class="bg-lms-surface border-lms-border flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
		>
			<div
				class="bg-lms-surface-muted flex flex-wrap gap-0.5 rounded-[10px] p-[3px]"
				role="tablist"
				aria-label={t('roles_label')}
			>
				{#each NAVIGATION_ROLES as r (r.key)}
					{@const active = r.key === role}
					<button
						type="button"
						role="tab"
						aria-selected={active}
						class={[
							'lms-focus-ring flex h-[34px] items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold whitespace-nowrap',
							active ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
						]}
						onclick={() => handleRoleChange(r.key)}
					>
						<span class="size-2 rounded-full" style:background={r.accent}></span>
						{t(`roles.${r.key}`)}
						{#if editor.isDirty(r.key)}
							<span class="bg-lms-warning-text size-1.5 rounded-full" title={t('unsaved')}></span>
							<span class="sr-only">({t('unsaved')})</span>
						{/if}
					</button>
				{/each}
			</div>
			<span class="text-lms-muted text-[13px]">
				{t('summary', { groups: tree.length, items: totalItems })}{hiddenItems
					? ` · ${t('summary_hidden', { count: hiddenItems })}`
					: ''}
			</span>
		</div>

		<div class="flex flex-wrap items-start gap-4">
			<!-- Pohon grup & menu -->
			<div
				class="bg-lms-surface border-lms-border flex min-w-[280px] flex-[1_1_320px] flex-col rounded-xl border"
			>
				<div class="border-lms-border flex flex-col gap-2 border-b p-3">
					<label class="relative block">
						<span class="sr-only">{t('tree.search_label')}</span>
						<span class="text-lms-muted pointer-events-none absolute top-[11px] left-3"
							><Icon icon={Search} size="sm" /></span
						>
						<input
							type="search"
							bind:value={editor.query}
							placeholder={t('tree.search')}
							class="border-lms-input-border bg-lms-surface lms-focus-ring h-[38px] w-full rounded-lg border ps-9 pe-3 text-[13px]"
						/>
					</label>
					<span class="text-lms-muted text-xs">{t('tree.hint')}</span>
				</div>
				<div class="flex flex-col gap-1 p-2">
					{#each visibleTree as { g, gi, items, expanded } (g.uid)}
						{@const selected = editor.sel.gid === g.uid && !editor.sel.mid}
						<div class="flex flex-col gap-0.5">
							<div
								class={[
									'flex items-center gap-2 rounded-lg py-1.5 ps-1 pe-1.5',
									g.hidden && 'opacity-50'
								]}
								style={selectedStyle(selected)}
							>
								<button
									type="button"
									class="text-lms-muted lms-focus-ring flex size-[26px] shrink-0 items-center justify-center rounded-md"
									aria-label={t('tree.toggle_group')}
									aria-expanded={expanded}
									onclick={() => editor.toggleCollapsed(g.uid)}
								>
									<Icon icon={expanded ? ChevronDown : ChevronRight} size="sm" />
								</button>
								<button
									type="button"
									class="lms-focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-md text-start"
									aria-current={selected ? 'true' : undefined}
									onclick={() => editor.select(g.uid, null)}
								>
									<span
										class="bg-lms-surface-muted text-lms-foreground flex size-[30px] shrink-0 items-center justify-center rounded-lg"
									>
										<Icon icon={navigationIcon(g.icon)} size="sm" />
									</span>
									<span class="flex min-w-0 flex-1 flex-col gap-0.5">
										<span class="flex items-center gap-1.5 text-[13px] font-bold">
											<span class="truncate">{g.name || t('untitled')}</span>
											{#if tried && errors[g.uid]}<span
													class="bg-lms-danger-text size-[7px] shrink-0 rounded-full"
													aria-label={t('has_error')}
												></span>{/if}
										</span>
										<span class="text-lms-muted truncate text-[11px]">{groupMeta(g)}</span>
									</span>
								</button>
								<span class="flex shrink-0">
									{@render rowButton(ChevronUp, t('tree.move_up'), gi === 0, () =>
										editor.moveGroup(gi, -1)
									)}
									{@render rowButton(ChevronDown, t('tree.move_down'), gi === tree.length - 1, () =>
										editor.moveGroup(gi, 1)
									)}
									{@render rowButton(
										g.hidden ? EyeOff : Eye,
										t('tree.toggle_visibility'),
										false,
										() => editor.toggleHidden(g.uid, null)
									)}
									{@render rowButton(Plus, t('tree.add_item'), false, () => editor.addItem(g.uid))}
								</span>
							</div>
							{#if expanded}
								<div
									class="border-lms-input-border ms-4 flex flex-col gap-0.5 border-s border-dashed ps-3"
								>
									{#each items as { m, mi } (m.uid)}
										{@const itemSelected = editor.sel.mid === m.uid}
										{@const itemError = errors[m.uid] && (tried || !!visibleError(m.uid, 'route'))}
										<div
											class={[
												'flex items-center gap-2 rounded-lg px-1.5 py-[5px]',
												(m.hidden || g.hidden) && 'opacity-50'
											]}
											style={selectedStyle(itemSelected)}
										>
											<button
												type="button"
												class="lms-focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-md text-start"
												aria-current={itemSelected ? 'true' : undefined}
												onclick={() => editor.select(g.uid, m.uid)}
											>
												<span class="text-lms-muted flex w-5 shrink-0 justify-center"
													><Icon icon={navigationIcon(m.icon)} size="sm" /></span
												>
												<span class="flex min-w-0 flex-1 flex-col gap-px">
													<span class="flex items-center gap-1.5 text-[13px] font-semibold">
														<span class="truncate">{m.name || t('untitled')}</span>
														{#if m.badge !== 'none'}
															<span
																class="bg-lms-surface-muted text-lms-muted rounded-full px-1.5 py-px text-[10px] font-bold"
																>{badgeSample(m.badge) ?? '•'}</span
															>
														{/if}
														{#if m.target === 'new'}<span class="text-lms-muted"
																><Icon
																	icon={ExternalLink}
																	size="sm"
																	label={t('editor.target_new')}
																/></span
															>{/if}
														{#if itemError}<span
																class="bg-lms-danger-text size-[7px] shrink-0 rounded-full"
																aria-label={t('has_error')}
															></span>{/if}
													</span>
													<span
														class={[
															'truncate font-mono text-[11px]',
															m.route ? 'text-lms-muted' : 'text-lms-warning-text'
														]}
													>
														{m.route || t('tree.route_missing')}
													</span>
												</span>
											</button>
											<span class="flex shrink-0">
												{@render rowButton(ChevronUp, t('tree.move_up'), mi === 0, () =>
													editor.moveItem(g.uid, mi, -1)
												)}
												{@render rowButton(
													ChevronDown,
													t('tree.move_down'),
													mi === g.items.length - 1,
													() => editor.moveItem(g.uid, mi, 1)
												)}
												{@render rowButton(
													m.hidden ? EyeOff : Eye,
													t('tree.toggle_visibility'),
													false,
													() => editor.toggleHidden(g.uid, m.uid)
												)}
											</span>
										</div>
									{/each}
									{#if !g.items.length}
										<button
											type="button"
											class="border-lms-border-strong text-lms-muted lms-focus-ring flex h-[34px] items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs"
											onclick={() => editor.addItem(g.uid)}
										>
											<Icon icon={Plus} size="sm" />{t('tree.add_first')}
										</button>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
					{#if query && !visibleTree.length}
						<span class="text-lms-muted px-3 py-6 text-center text-[13px]"
							>{t('tree.no_result', { query: editor.query })}</span
						>
					{/if}
				</div>
			</div>

			<!-- Editor node terpilih -->
			<div class="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5">
				{#if node && selectedGroup}
					<div
						class="bg-lms-surface border-lms-border flex flex-col gap-[18px] rounded-xl border p-5"
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="flex min-w-0 flex-col gap-1">
								<span class="text-lms-muted font-mono text-[11px] tracking-widest">
									{selectedItem
										? t('editor.kind_item', { group: selectedGroup.name.toUpperCase() })
										: t('editor.kind_group', { count: selectedGroup.items.length })}
								</span>
								<h2 class="flex flex-wrap items-center gap-2.5 text-lg font-bold">
									{node.name || t('untitled')}
									<span
										class={[
											'rounded-full px-2 py-[3px] text-[10px] font-bold tracking-wide',
											node.hidden ? 'bg-lms-surface-muted text-lms-muted' : 'lms-tone-success'
										]}
									>
										{node.hidden ? t('status.hidden') : t('status.shown')}
									</span>
								</h2>
							</div>
							<button
								type="button"
								class="border-lms-border-strong bg-lms-surface text-lms-danger-text lms-focus-ring flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold"
								onclick={() => openConfirm('delete')}
							>
								<Icon icon={Trash2} size="sm" />{selectedItem
									? t('editor.delete_item')
									: t('editor.delete_group')}
							</button>
						</div>

						{#if !selectedItem && !selectedGroup.items.length && !selectedGroup.clickable}
							<div
								class="lms-tone-warning flex items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] leading-[19px]"
							>
								<Icon icon={TriangleAlert} size="sm" /><span>{t('editor.empty_group_warning')}</span
								>
							</div>
						{/if}

						<div
							class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] items-start gap-x-4 gap-y-3.5"
						>
							<label class="flex flex-col gap-1.5">
								<span class="text-[13px] font-semibold"
									>{selectedItem ? t('editor.name_item') : t('editor.name_group')}</span
								>
								<input
									value={node.name}
									oninput={(e) => editor.patch({ name: e.currentTarget.value })}
									maxlength={NAME_MAX_LENGTH}
									aria-invalid={!!nameError}
									class={[
										'bg-lms-surface lms-focus-ring h-[42px] w-full rounded-[10px] border-[1.5px] px-3 text-sm',
										nameError ? 'border-lms-danger-text' : 'border-lms-input-border'
									]}
								/>
								<span class={['text-xs', nameError ? 'text-lms-danger-text' : 'text-lms-muted']}>
									{nameError
										? errorText(nameError)
										: t('editor.chars_left', { count: NAME_MAX_LENGTH - node.name.length })}
								</span>
							</label>
							<div class="flex flex-col gap-1.5">
								<span class="text-[13px] font-semibold">{t('editor.status')}</span>
								{@render segmented(
									[
										{ key: 'show', label: t('status.shown'), icon: Eye },
										{ key: 'hide', label: t('status.hide'), icon: EyeOff }
									],
									node.hidden ? 'hide' : 'show',
									(k) => editor.patch({ hidden: k === 'hide' })
								)}
							</div>
							{#if selectedItem}
								<label class="flex flex-col gap-1.5">
									<span class="text-[13px] font-semibold">{t('editor.parent')}</span>
									<select
										value={selectedGroup.uid}
										onchange={(e) => editor.moveToGroup(e.currentTarget.value)}
										class="border-lms-input-border bg-lms-surface lms-focus-ring h-[42px] w-full rounded-[10px] border-[1.5px] px-2.5 text-sm"
									>
										{#each tree as option (option.uid)}<option value={option.uid}
												>{option.name || t('untitled')}</option
											>{/each}
									</select>
									<span class="text-lms-muted text-xs">{t('editor.parent_hint')}</span>
								</label>
								<div class="flex flex-col gap-1.5">
									<span class="text-[13px] font-semibold">{t('editor.target')}</span>
									{@render segmented(
										NAVIGATION_TARGETS.map((k) => ({ key: k, label: t(`editor.target_${k}`) })),
										selectedItem.target,
										(k) => editor.patch({ target: k as EditorItem['target'] })
									)}
								</div>
							{/if}
							{#if showRoute}
								<label class="col-span-full flex flex-col gap-1.5">
									<span class="text-[13px] font-semibold">{t('editor.route')}</span>
									<input
										value={node.route}
										onchange={(e) => editor.patch({ route: normalizeRoute(e.currentTarget.value) })}
										placeholder={t('editor.route_placeholder')}
										aria-invalid={!!routeError}
										class={[
											'bg-lms-surface lms-focus-ring h-[42px] w-full rounded-[10px] border-[1.5px] px-3 font-mono text-sm',
											routeError ? 'border-lms-danger-text' : 'border-lms-input-border'
										]}
									/>
									<span class={['text-xs', routeError ? 'text-lms-danger-text' : 'text-lms-muted']}>
										{routeError ? errorText(routeError) : t('editor.address', { host: routeHost })}
									</span>
								</label>
							{/if}
							{#if selectedItem}
								<div class="col-span-full flex flex-col gap-1.5">
									<span class="text-[13px] font-semibold">{t('editor.badge')}</span>
									{@render segmented(
										NAVIGATION_BADGES.map((k) => ({ key: k, label: t(`badges.${k}`) })),
										selectedItem.badge,
										(k) => editor.patch({ badge: k as EditorItem['badge'] }),
										true
									)}
								</div>
							{/if}
						</div>

						<div class="flex flex-col gap-2">
							<span class="text-[13px] font-semibold" id="navigation-icon-label"
								>{t('editor.icon')}</span
							>
							<div
								class="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5"
								role="radiogroup"
								aria-labelledby="navigation-icon-label"
							>
								{#each NAVIGATION_ICON_KEYS as key (key)}
									{@const on = key === node.icon}
									<button
										type="button"
										role="radio"
										aria-checked={on}
										aria-label={key}
										title={key}
										class={[
											'lms-focus-ring flex h-10 items-center justify-center rounded-lg border-[1.5px]',
											on ? '' : 'border-lms-border bg-lms-surface text-lms-muted'
										]}
										style={on ? `border-color:${accent};background:${mix(14)};color:${accent}` : ''}
										onclick={() => editor.patch({ icon: key })}
									>
										<Icon icon={navigationIcon(key)} size="sm" />
									</button>
								{/each}
							</div>
						</div>

						{#if !selectedItem}
							<div class="border-lms-border flex flex-col gap-3 border-t pt-4">
								<span class="text-[13px] font-semibold">{t('editor.group_behavior')}</span>
								{#each GROUP_TOGGLES as key (key)}
									{@const on = selectedGroup[key]}
									<button
										type="button"
										role="switch"
										aria-checked={on}
										class="lms-focus-ring flex items-center gap-3 rounded-md text-start"
										onclick={() => editor.patch({ [key]: !on })}
									>
										<span
											class={[
												'relative h-[22px] w-10 shrink-0 rounded-full transition-colors',
												on ? 'bg-lms-interactive' : 'bg-lms-input-border'
											]}
										>
											<span
												class={[
													'absolute top-[3px] left-[3px] size-4 rounded-full bg-white transition-transform',
													on && 'translate-x-[18px]'
												]}
											></span>
										</span>
										<span class="flex flex-col gap-px">
											<span class="text-[13px] font-semibold">{t(`toggles.${key}`)}</span>
											<span class="text-lms-muted text-xs">{t(`toggles.${key}_hint`)}</span>
										</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<div
						class="border-lms-input-border bg-lms-surface text-lms-muted rounded-xl border border-dashed px-5 py-10 text-center text-sm"
					>
						{t('editor.empty')}
					</div>
				{/if}
			</div>

			<!-- Pratinjau sidebar -->
			<div class="flex min-w-[230px] flex-[0_1_250px] flex-col gap-2 lg:sticky lg:top-21">
				<span class="text-lms-muted font-mono text-[11px] tracking-widest"
					>{t('preview.title', { role: roleLabel.toUpperCase() })}</span
				>
				<div
					class="bg-lms-surface border-lms-border flex flex-col overflow-hidden rounded-xl border"
				>
					<div class="border-lms-border flex h-[52px] items-center gap-2.5 border-b px-3.5">
						<span
							class="flex size-7 items-center justify-center rounded-lg text-[11px] font-bold text-white"
							style:background={accent}>{tenant.initials}</span
						>
						<span class="flex flex-col">
							<span class="text-xs font-bold">{tenant.name}</span>
							<span class="text-lms-muted text-[10px]">{roleLabel}</span>
						</span>
					</div>
					<nav
						class="flex flex-col gap-0.5 p-2"
						aria-label={t('preview.title', { role: roleLabel })}
					>
						{#each preview as entry (entry.g.uid)}
							<div class="flex flex-col gap-px pt-1.5">
								{#if entry.showLabel}
									<button
										type="button"
										class="text-lms-muted lms-focus-ring flex items-center justify-between rounded-md px-2.5 py-1 text-start text-[10px] font-bold tracking-widest uppercase"
										onclick={() => editor.select(entry.g.uid, null)}
									>
										{entry.g.name}
										{#if entry.closed}<Icon icon={ChevronRight} size="sm" />{/if}
									</button>
								{/if}
								{#each entry.items as m (m.uid)}
									{@const active = m.uid === editor.sel.mid}
									<button
										type="button"
										class={[
											'lms-focus-ring flex h-[34px] items-center gap-2.5 rounded-[7px] px-2.5 text-start text-[13px]',
											active ? 'text-lms-foreground font-semibold' : 'text-lms-muted'
										]}
										style={active ? `background:${mix(14)}` : ''}
										onclick={() => editor.select(entry.g.uid, m.uid)}
									>
										<span style:color={active ? accent : undefined}
											><Icon icon={navigationIcon(m.icon)} size="sm" /></span
										>
										<span class="min-w-0 flex-1 truncate">{m.name}</span>
										{#if m.badge !== 'none'}
											<span
												class="rounded-full px-[7px] py-px text-[10px] font-bold text-white"
												style:background={accent}>{badgeSample(m.badge) ?? '•'}</span
											>
										{/if}
									</button>
								{/each}
							</div>
						{/each}
					</nav>
				</div>
				<span class="text-lms-muted text-xs">
					{hiddenItems ? t('preview.hidden_note', { count: hiddenItems }) : t('preview.click_note')}
				</span>
			</div>
		</div>

		<!-- Bar simpan -->
		<div
			class="bg-lms-surface border-lms-border sticky bottom-4 z-5 flex flex-wrap items-center gap-2.5 rounded-xl border py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_rgba(15,24,56,0.4)]"
		>
			<span
				class={['flex flex-[1_1_220px] items-center gap-2 text-[13px]', TONE_CLASS[barState.tone]]}
				role="status"
			>
				<Icon icon={barState.icon} size="sm" />{barState.text}
			</span>
			<button
				type="button"
				class="text-lms-muted lms-focus-ring flex h-[42px] items-center gap-1.5 rounded-[10px] px-3.5 text-[13px] font-semibold"
				disabled={isSaving}
				onclick={() => openConfirm('reset')}
			>
				<Icon icon={RotateCcw} size="sm" />{t('actions.reset')}
			</button>
			{#if dirty}
				<button
					type="button"
					class="border-lms-border-strong bg-lms-surface lms-focus-ring h-[42px] rounded-[10px] border px-4 text-sm font-semibold"
					disabled={isSaving}
					onclick={() => {
						editor.discard();
						failure = null;
					}}
				>
					{t('actions.discard')}
				</button>
			{/if}
			<form method="POST" action="?/save" use:enhance={submitSave}>
				<button
					type="submit"
					class="lms-action-primary lms-focus-ring flex h-[42px] items-center gap-2 rounded-[10px] px-[18px] text-sm font-bold"
					aria-busy={isSaving}
					disabled={isSaving}
				>
					<Icon icon={Check} size="sm" />{isSaving
						? t('actions.saving')
						: t('actions.save', { role: roleLabel })}
				</button>
			</form>
			<form
				method="POST"
				action="?/reset"
				use:enhance={submitReset}
				bind:this={resetForm}
				hidden
			></form>
		</div>

		{#if confirmContent}
			<ConfirmDialog
				bind:open={isConfirmOpen}
				icon={confirmContent.icon}
				title={confirmContent.title}
				message={confirmContent.message}
				details={confirmContent.details}
				confirmLabel={confirmContent.label}
				confirmIcon={Check}
				busyLabel={t('confirm.busy')}
				cancelLabel={t('confirm.cancel')}
				keyHint={t('confirm.key_hint')}
				onconfirm={handleConfirm}
			/>
		{/if}
	{/if}
</div>

{#snippet rowButton(icon: LucideIcon, label: string, dimmed: boolean, onclick: () => void)}
	<button
		type="button"
		class={[
			'text-lms-muted hover:bg-lms-surface-muted hover:text-lms-foreground lms-focus-ring flex size-7 items-center justify-center rounded-md',
			dimmed && 'opacity-30'
		]}
		aria-label={label}
		title={label}
		{onclick}
	>
		<Icon {icon} size="sm" />
	</button>
{/snippet}

{#snippet segmented(
	options: { key: string; label: string; icon?: LucideIcon }[],
	current: string,
	onpick: (key: string) => void,
	wrap = false
)}
	<div
		class={['bg-lms-surface-muted flex gap-0.5 rounded-[10px] p-[3px]', wrap && 'flex-wrap']}
		role="radiogroup"
	>
		{#each options as option (option.key)}
			{@const active = option.key === current}
			<button
				type="button"
				role="radio"
				aria-checked={active}
				class={[
					'lms-focus-ring flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold whitespace-nowrap',
					wrap ? 'h-[34px] flex-auto px-2.5' : 'h-9 flex-1',
					active ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
				]}
				onclick={() => onpick(option.key)}
			>
				{#if option.icon}<Icon icon={option.icon} size="sm" />{/if}{option.label}
			</button>
		{/each}
	</div>
{/snippet}
