import {
	NEW_GROUP_DEFAULTS,
	NEW_ITEM_DEFAULTS,
	validateTree,
	type NavigationBadge,
	type NavigationGroupInput,
	type NavigationIssue,
	type NavigationLayout,
	type NavigationRole,
	type NavigationTarget,
	type NodeErrors
} from './navigation.model';

/**
 * State editor Menu & navigasi (cermin logika referensi MenuMaster): pohon kerja per peran,
 * snapshot tersimpan, pilihan, pencarian, dan status validasi. Perubahan bersifat lokal sampai
 * "Simpan sidebar"; penyimpanan, log, dan validasi final dilakukan backend.
 */
export interface EditorItem {
	uid: string;
	id?: string;
	name: string;
	icon: string;
	route: string;
	target: NavigationTarget;
	hidden: boolean;
	badge: NavigationBadge;
}

export interface EditorGroup {
	uid: string;
	id?: string;
	name: string;
	icon: string;
	route: string;
	show_label: boolean;
	default_open: boolean;
	clickable: boolean;
	hidden: boolean;
	items: EditorItem[];
}

export interface EditorSelection {
	gid: string | null;
	mid: string | null;
}

export type GroupToggleKey = 'show_label' | 'default_open' | 'clickable';
type RoleMap<T> = Record<NavigationRole, T>;

let uidCounter = 0;
const newUid = (prefix: string) => `new-${prefix}${++uidCounter}`;

function fromLayout(layout: NavigationLayout): EditorGroup[] {
	return layout.groups.map((g) => ({
		uid: g.id,
		id: g.id,
		name: g.name,
		icon: g.icon,
		route: g.route,
		show_label: g.show_label,
		default_open: g.default_open,
		clickable: g.clickable,
		hidden: g.hidden,
		items: g.items.map((m) => ({
			uid: m.id,
			id: m.id,
			name: m.name,
			icon: m.icon,
			route: m.route,
			target: m.target,
			hidden: m.hidden,
			badge: m.badge
		}))
	}));
}

const clone = <T>(value: T): T => structuredClone($state.snapshot(value) as T);

function swap<T>(list: T[], a: number, b: number) {
	const first = list[a] as T;
	list[a] = list[b] as T;
	list[b] = first;
}

function firstSelection(tree: readonly EditorGroup[]): EditorSelection {
	const first = tree[0];
	return first ? { gid: first.uid, mid: first.items[0]?.uid ?? null } : { gid: null, mid: null };
}

export class NavigationEditor {
	role = $state<NavigationRole>('platform');
	trees = $state({} as RoleMap<EditorGroup[]>);
	saved = $state({} as RoleMap<EditorGroup[]>);
	versions = $state({} as RoleMap<number>);
	savedAt = $state({} as Partial<RoleMap<string>>);
	sel = $state<EditorSelection>({ gid: null, mid: null });
	collapsed = $state<Record<string, boolean>>({});
	query = $state('');
	/** Simpan sudah dicoba → semua error ditampilkan (referensi `tried`). */
	tried = $state(false);
	/** Error dari backend (422) per uid, ditampilkan sampai node diubah lagi. */
	serverErrors = $state<Record<string, NodeErrors>>({});

	constructor(layouts: RoleMap<NavigationLayout>, initialRole: NavigationRole = 'platform') {
		for (const [role, layout] of Object.entries(layouts) as [NavigationRole, NavigationLayout][]) {
			this.trees[role] = fromLayout(layout);
			this.saved[role] = fromLayout(layout);
			this.versions[role] = layout.version;
		}
		this.role = initialRole;
		this.sel = this.initialSelection(this.trees[initialRole]);
	}

	/** Referensi membuka "Menu & navigasi" terpilih di peran platform; selain itu node pertama. */
	private initialSelection(tree: EditorGroup[]): EditorSelection {
		for (const g of tree) {
			const m = g.items.find((item) => item.route === '/settings/navigation');
			if (m) return { gid: g.uid, mid: m.uid };
		}
		return firstSelection(tree);
	}

	get tree(): EditorGroup[] {
		return this.trees[this.role] ?? [];
	}

	get errors(): Record<string, NodeErrors> {
		return { ...validateTree(this.tree), ...this.serverErrors };
	}

	isDirty(role: NavigationRole = this.role): boolean {
		return JSON.stringify(this.trees[role]) !== JSON.stringify(this.saved[role]);
	}

	get selectedGroup(): EditorGroup | undefined {
		return this.tree.find((g) => g.uid === this.sel.gid);
	}

	get selectedItem(): EditorItem | undefined {
		return this.sel.mid ? this.selectedGroup?.items.find((m) => m.uid === this.sel.mid) : undefined;
	}

	select(gid: string, mid: string | null) {
		this.sel = { gid, mid };
	}

	setRole(role: NavigationRole) {
		this.role = role;
		this.sel = firstSelection(this.trees[role]);
		this.tried = false;
		this.query = '';
		this.serverErrors = {};
	}

	toggleCollapsed(gid: string) {
		this.collapsed[gid] = !this.collapsed[gid];
	}

	/** Mengubah node terpilih (grup atau menu). */
	patch(change: Partial<EditorGroup> & Partial<EditorItem>) {
		const node = this.selectedItem ?? this.selectedGroup;
		if (!node) return;
		Object.assign(node, change);
		if (this.serverErrors[node.uid]) delete this.serverErrors[node.uid];
	}

	moveGroup(index: number, delta: number) {
		const tree = this.tree;
		const target = index + delta;
		if (target < 0 || target >= tree.length) return;
		swap(tree, index, target);
	}

	moveItem(gid: string, index: number, delta: number) {
		const items = this.tree.find((g) => g.uid === gid)?.items;
		const target = index + delta;
		if (!items || target < 0 || target >= items.length) return;
		swap(items, index, target);
	}

	toggleHidden(gid: string, mid: string | null) {
		const g = this.tree.find((x) => x.uid === gid);
		const node = mid ? g?.items.find((m) => m.uid === mid) : g;
		if (node) node.hidden = !node.hidden;
	}

	addGroup() {
		const uid = newUid('g');
		this.tree.push({
			uid,
			...NEW_GROUP_DEFAULTS,
			route: '',
			show_label: true,
			default_open: true,
			clickable: false,
			hidden: false,
			items: []
		});
		this.sel = { gid: uid, mid: null };
		this.query = '';
	}

	addItem(gid?: string) {
		const targetGid = gid ?? this.sel.gid ?? this.tree[0]?.uid;
		const g = this.tree.find((x) => x.uid === targetGid);
		if (!g) return this.addGroup();
		const uid = newUid('m');
		g.items.push({
			uid,
			...NEW_ITEM_DEFAULTS,
			route: '',
			target: 'same',
			hidden: false,
			badge: 'none'
		});
		this.sel = { gid: g.uid, mid: uid };
		this.collapsed[g.uid] = false;
		this.query = '';
	}

	/** Pindahkan menu terpilih ke akhir grup lain (referensi "Grup induk"). */
	moveToGroup(newGid: string) {
		const { gid, mid } = this.sel;
		if (!mid || newGid === gid) return;
		const from = this.tree.find((g) => g.uid === gid);
		const to = this.tree.find((g) => g.uid === newGid);
		const index = from?.items.findIndex((m) => m.uid === mid) ?? -1;
		if (!from || !to || index < 0) return;
		to.items.push(...from.items.splice(index, 1));
		this.sel = { gid: newGid, mid };
		this.collapsed[newGid] = false;
	}

	/** Hapus node terpilih dari pohon kerja; baru permanen setelah disimpan. */
	deleteSelected() {
		const { gid, mid } = this.sel;
		if (mid) {
			const g = this.tree.find((x) => x.uid === gid);
			if (g) g.items = g.items.filter((m) => m.uid !== mid);
			this.sel = { gid, mid: null };
			return;
		}
		this.trees[this.role] = this.tree.filter((g) => g.uid !== gid);
		this.sel = firstSelection(this.trees[this.role]);
	}

	discard() {
		this.trees[this.role] = clone(this.saved[this.role]);
		this.sel = firstSelection(this.trees[this.role]);
		this.tried = false;
		this.serverErrors = {};
	}

	/**
	 * Validasi sebelum kirim. Bila ada error, pilih node bermasalah pertama (referensi `save`).
	 * @returns payload simpan, atau `null` bila masih ada error.
	 */
	prepareSave(): { role: NavigationRole; version: number; groups: NavigationGroupInput[] } | null {
		const errors = validateTree(this.tree);
		const firstUid = Object.keys(errors)[0];
		if (firstUid) {
			this.tried = true;
			this.focusNode(firstUid);
			return null;
		}
		return {
			role: this.role,
			version: this.versions[this.role],
			groups: this.tree.map((g) => ({
				...(g.id ? { id: g.id } : {}),
				name: g.name.trim(),
				icon: g.icon,
				route: g.clickable ? g.route : '',
				show_label: g.show_label,
				default_open: g.default_open,
				clickable: g.clickable,
				hidden: g.hidden,
				items: g.items.map((m) => ({
					...(m.id ? { id: m.id } : {}),
					name: m.name.trim(),
					icon: m.icon,
					route: m.route,
					target: m.target,
					hidden: m.hidden,
					badge: m.badge
				}))
			}))
		};
	}

	/** Terapkan hasil simpan/reset dari backend; pilihan dipertahankan bila node masih ada. */
	applySaved(layout: NavigationLayout, savedAtLabel: string, keepSelectionByPosition = true) {
		const role = layout.role;
		const positions = keepSelectionByPosition ? this.selectionPosition() : null;
		this.trees[role] = fromLayout(layout);
		this.saved[role] = fromLayout(layout);
		this.versions[role] = layout.version;
		this.savedAt[role] = savedAtLabel;
		this.tried = false;
		this.serverErrors = {};
		if (role !== this.role) return;
		const g = positions ? this.tree[positions.gi] : undefined;
		const m = g && positions && positions.mi !== null ? g.items[positions.mi] : undefined;
		this.sel = g ? { gid: g.uid, mid: m?.uid ?? null } : firstSelection(this.tree);
	}

	/** Petakan issue backend (`groups[1].items[0]`) ke node editor. */
	applyServerIssues(issues: readonly NavigationIssue[]) {
		const mapped: Record<string, NodeErrors> = {};
		for (const issue of issues) {
			const match = /^groups\[(\d+)\](?:\.items\[(\d+)\])?$/.exec(issue.path);
			if (!match) continue;
			const g = this.tree[Number(match[1])];
			const node = match[2] === undefined ? g : g?.items[Number(match[2])];
			if (!node || (issue.field !== 'name' && issue.field !== 'route')) continue;
			mapped[node.uid] = {
				...mapped[node.uid],
				[issue.field]: { key: 'server', message: issue.message }
			};
		}
		this.serverErrors = mapped;
		this.tried = true;
		const firstUid = Object.keys(mapped)[0];
		if (firstUid) this.focusNode(firstUid);
	}

	private focusNode(uid: string) {
		const g = this.tree.find((x) => x.uid === uid || x.items.some((m) => m.uid === uid));
		if (!g) return;
		this.sel = { gid: g.uid, mid: g.uid === uid ? null : uid };
		this.collapsed[g.uid] = false;
	}

	private selectionPosition(): { gi: number; mi: number | null } | null {
		const gi = this.tree.findIndex((g) => g.uid === this.sel.gid);
		const group = this.tree[gi];
		if (!group) return null;
		const mi = this.sel.mid ? group.items.findIndex((m) => m.uid === this.sel.mid) : -1;
		return { gi, mi: mi >= 0 ? mi : null };
	}
}
