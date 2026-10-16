<!-- Anggota ekskul tahun ajaran aktif: daftar, keluarkan, tambah murid terpilih / seluruh kelas / per tingkat (ekskul wajib). -->
<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import { useI18n } from '$lib/i18n';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import {
		PREFIX,
		emptyPicks,
		gradeMembersConfirm,
		gradeMembersPayload,
		gradeMembersSnapshot,
		memberCandidates,
		pickedIds,
		picksFor,
		togglePick,
		type GradeMembersSelection
	} from '../school-admin.model';
	import type {
		SchoolExtraMembersView,
		SchoolGradeOption,
		SchoolStudentRow
	} from '../school-admin.types';

	interface Props {
		open: boolean;
		name: string;
		/** null = sedang memuat. */
		view: SchoolExtraMembersView | null;
		students: readonly SchoolStudentRow[];
		classes: readonly { id: string; name: string }[];
		/** Ekskul wajib → bagian "Tambah per tingkat" tampil. */
		mandatory: boolean;
		/** Tingkat yang bisa dipilih (punya kelas di tahun ajaran aktif). */
		grades: readonly SchoolGradeOption[];
		busy: boolean;
		onclose: () => void;
		/** Daftar murid eksplisit yang dicentang (bukan "semua"). */
		onadd: (studentIds: string[]) => void;
		onaddclass: (classId: string) => void;
		/** Sekali tambah per tingkat / semua murid (bukan aturan tersimpan). */
		onaddgrades: (selection: GradeMembersSelection) => void | Promise<void>;
		onremove: (studentId: string) => void;
	}
	let {
		open,
		name,
		view,
		students,
		classes,
		mandatory,
		grades,
		busy,
		onclose,
		onadd,
		onaddclass,
		onaddgrades,
		onremove
	}: Props = $props();

	const i18n = useI18n();
	const t = (k: string, p?: Record<string, string | number>) => i18n.t(`${PREFIX}.extras.${k}`, p);

	let query = $state('');
	let picks = $state(emptyPicks());
	let classId = $state('');
	let gradePicks = $state<Record<string, boolean>>({});
	let allStudents = $state(false);
	/** Salinan pilihan saat "Tambahkan" diklik; dialog konfirmasi terbuka selama terisi. */
	let pendingGrades = $state<GradeMembersSelection | null>(null);
	const gradeSelection = $derived<GradeMembersSelection>({
		gradeLevelIds: grades.filter((g) => gradePicks[g.id] === true).map((g) => g.id),
		allStudents
	});
	const extraId = $derived(view?.extra_id ?? '');
	/** Pilihan ekskul ini (ganti ekskul → kosong); bertahan saat pencarian berubah. */
	const current = $derived(picksFor(picks, extraId));
	const candidates = $derived(view ? memberCandidates(students, view.members, query) : []);
	const selected = $derived(view ? pickedIds(current, students, view.members) : []);
	const hiddenSelected = $derived(
		selected.length - candidates.filter((s) => current.ids[s.id] === true).length
	);

	// Data anggota baru (setelah tambah/hapus/ganti ekskul) → reset pilihan kelas. Pilihan murid
	// yang baru ditambahkan otomatis gugur karena sudah menjadi anggota.
	$effect(() => {
		void view;
		classId = '';
		gradePicks = {};
		allStudents = false;
	});
	// Ganti ekskul / drawer ditutup → kosongkan pencarian.
	$effect(() => {
		void name;
		if (!open) query = '';
	});
</script>

<Drawer
	bind:open={
		() => open,
		(v) => {
			if (!v) onclose();
		}
	}
	label={t('members_title', { name })}
	closeLabel={i18n.t(`${PREFIX}.common.close`)}
>
	<div class="flex flex-col gap-4 p-2">
		<h2 class="text-base font-bold">{t('members_title', { name })}</h2>
		{#if !view}
			<StatePanel loading title={t('members_loading')} />
		{:else}
			<section class="flex flex-col gap-2">
				<h3 class="text-sm font-bold">{t('members_count', { count: view.members.length })}</h3>
				<ul class="border-lms-border flex max-h-64 flex-col overflow-auto rounded-xl border">
					{#each view.members as m (m.student_id)}
						<li
							class="border-lms-border flex items-center gap-3 px-4 py-2 text-[13px] not-first:border-t"
						>
							<span class="flex-1 font-semibold">{m.name}</span>
							<span class="text-lms-muted text-xs">{m.class_name || '—'} · {m.nis}</span>
							<button
								type="button"
								aria-label={t('member_remove', { name: m.name })}
								class="lms-action-ghost lms-focus-ring flex size-7 items-center justify-center rounded-md"
								disabled={busy}
								onclick={() => onremove(m.student_id)}><Icon icon={Trash2} size="sm" /></button
							>
						</li>
					{:else}<li class="text-lms-muted p-4 text-sm">{t('members_empty')}</li>{/each}
				</ul>
			</section>
			{#if mandatory}
				<section class="flex flex-col gap-2">
					<h3 class="text-sm font-bold">{t('add_grades_title')}</h3>
					<p class="text-lms-muted text-xs">{t('add_grades_note')}</p>
					{#if grades.length}
						<div class="flex flex-wrap gap-x-4 gap-y-1">
							{#each grades as g (g.id)}
								<Checkbox
									name={`grade-${g.id}`}
									label={i18n.t(`${PREFIX}.planning.grade`, { grade: g.grade })}
									disabled={busy || allStudents}
									bind:checked={
										() => gradePicks[g.id] ?? false,
										(v) => (gradePicks = { ...gradePicks, [g.id]: v })
									}
								/>
							{/each}
						</div>
					{:else}<p class="text-lms-muted text-sm">{t('no_grades')}</p>{/if}
					<Checkbox
						name="grade-all"
						label={t('all_students')}
						disabled={busy}
						bind:checked={allStudents}
					/>
					<button
						type="button"
						class="lms-action-secondary lms-focus-ring h-9 self-start rounded-lg px-3 text-xs font-semibold disabled:opacity-50"
						disabled={busy || !gradeMembersPayload(gradeSelection)}
						onclick={() => (pendingGrades = gradeMembersSnapshot(gradeSelection))}
						>{t('add_grades')}</button
					>
				</section>
			{/if}
			<section class="flex flex-col gap-2">
				<h3 class="text-sm font-bold">{t('add_class_title')}</h3>
				<div class="flex gap-2">
					<select
						aria-label={t('add_class_title')}
						bind:value={classId}
						class="lms-input lms-focus-ring border-lms-input-border h-9 flex-1 rounded-lg border-[1.5px] px-2 text-sm"
					>
						<option value="">{i18n.t(`${PREFIX}.common.not_set_option`)}</option>
						{#each classes as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
					</select>
					<button
						type="button"
						class="lms-action-secondary lms-focus-ring h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-50"
						disabled={busy || !classId}
						onclick={() => onaddclass(classId)}>{t('add_class')}</button
					>
				</div>
			</section>
			<section class="flex flex-col gap-2">
				<h3 class="text-sm font-bold">{t('add_students_title')}</h3>
				<input
					type="search"
					bind:value={query}
					placeholder={t('search_students')}
					aria-label={t('search_students')}
					class="lms-input lms-focus-ring border-lms-input-border h-9 rounded-lg border-[1.5px] px-3 text-sm"
				/>
				<div
					class="border-lms-border flex max-h-64 flex-col gap-1 overflow-auto rounded-xl border p-2"
				>
					{#each candidates as s (s.id)}
						<Checkbox
							name={`member-${s.id}`}
							label={`${s.name} · ${s.class_name || '—'} · ${s.nis}`}
							disabled={busy}
							bind:checked={
								() => current.ids[s.id] ?? false, (v) => (picks = togglePick(current, s.id, v))
							}
						/>
					{:else}<p class="text-lms-muted p-2 text-sm">{t('no_candidates')}</p>{/each}
				</div>
				{#if hiddenSelected > 0}
					<p class="text-lms-muted text-xs">{t('selected_hidden', { count: hiddenSelected })}</p>
				{/if}
				<button
					type="button"
					class="lms-action-primary lms-focus-ring h-10 self-start rounded-[10px] px-4 text-sm font-semibold disabled:opacity-50"
					disabled={busy || !selected.length}
					onclick={() => onadd([...selected])}
					>{t('add_selected', { count: selected.length })}</button
				>
			</section>
		{/if}
	</div>
</Drawer>

<ConfirmDialog
	bind:open={
		() => pendingGrades !== null,
		(v) => {
			if (!v) pendingGrades = null;
		}
	}
	tone="primary"
	icon={UserPlus}
	title={t('add_grades_confirm_title')}
	message={pendingGrades ? gradeMembersConfirm(i18n.t, pendingGrades, grades, name) : ''}
	confirmLabel={t('add_grades')}
	busyLabel={t('adding')}
	cancelLabel={i18n.t(`${PREFIX}.common.cancel`)}
	onconfirm={() => (pendingGrades ? onaddgrades(pendingGrades) : undefined)}
/>
