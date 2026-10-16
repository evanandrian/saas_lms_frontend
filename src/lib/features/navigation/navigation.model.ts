import type {
	AccountWorkspace,
	NavigationBadge,
	NavigationGroup,
	NavigationGroupInput,
	NavigationItem,
	NavigationLayout,
	NavigationRole,
	NavigationTarget
} from '$lib/api/generated/lms';
import { BUILT_APP_PATHS } from '$lib/utils/app-paths';
import type { LucideIcon } from '@lucide/svelte';
import Award from '@lucide/svelte/icons/award';
import Bell from '@lucide/svelte/icons/bell';
import BookMarked from '@lucide/svelte/icons/book-marked';
import BookOpen from '@lucide/svelte/icons/book-open';
import Building2 from '@lucide/svelte/icons/building';
import CalendarCheck from '@lucide/svelte/icons/calendar-check';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import CalendarRange from '@lucide/svelte/icons/calendar-range';
import ChartColumn from '@lucide/svelte/icons/chart-column';
import ChartLine from '@lucide/svelte/icons/chart-line';
import ChartNoAxesColumn from '@lucide/svelte/icons/chart-no-axes-column';
import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
import ClipboardList from '@lucide/svelte/icons/clipboard-list';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Database from '@lucide/svelte/icons/database';
import FilePenLine from '@lucide/svelte/icons/file-pen-line';
import FileQuestion from '@lucide/svelte/icons/file-question-mark';
import FileText from '@lucide/svelte/icons/file-text';
import Folder from '@lucide/svelte/icons/folder';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
import History from '@lucide/svelte/icons/history';
import House from '@lucide/svelte/icons/house';
import Inbox from '@lucide/svelte/icons/inbox';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Library from '@lucide/svelte/icons/library';
import Link from '@lucide/svelte/icons/link';
import ListTree from '@lucide/svelte/icons/list-tree';
import Megaphone from '@lucide/svelte/icons/megaphone';
import MessageCircle from '@lucide/svelte/icons/message-circle';
import MessageSquare from '@lucide/svelte/icons/message-square';
import Network from '@lucide/svelte/icons/network';
import NotebookPen from '@lucide/svelte/icons/notebook-pen';
import Package from '@lucide/svelte/icons/package';
import Receipt from '@lucide/svelte/icons/receipt';
import Scale from '@lucide/svelte/icons/scale';
import ScanQrCode from '@lucide/svelte/icons/scan-qr-code';
import School from '@lucide/svelte/icons/school';
import ScrollText from '@lucide/svelte/icons/scroll-text';
import Server from '@lucide/svelte/icons/server';
import Settings from '@lucide/svelte/icons/settings';
import ShieldAlert from '@lucide/svelte/icons/shield-alert';
import Stamp from '@lucide/svelte/icons/stamp';
import Star from '@lucide/svelte/icons/star';
import Table from '@lucide/svelte/icons/table';
import Trophy from '@lucide/svelte/icons/trophy';
import UserCheck from '@lucide/svelte/icons/user-check';
import UserPlus from '@lucide/svelte/icons/user-plus';
import Users from '@lucide/svelte/icons/users';
import Wallet from '@lucide/svelte/icons/wallet';
import type { Pathname } from '$app/types';

export type {
	NavigationBadge,
	NavigationGroup,
	NavigationGroupInput,
	NavigationIssue,
	NavigationItem,
	NavigationItemInput,
	NavigationLayout,
	NavigationRole,
	NavigationTarget
} from '$lib/api/generated/lms';

/** Tab peran berurutan dengan warna aksen (referensi MenuMaster ROLES). Label lewat i18n `navigation.roles.<key>`. */
export const NAVIGATION_ROLES: readonly { key: NavigationRole; accent: string }[] = [
	{ key: 'platform', accent: '#4169E1' },
	{ key: 'school_admin', accent: '#0B7F82' },
	{ key: 'principal', accent: '#7A3E9D' },
	{ key: 'teacher', accent: '#A8620A' },
	{ key: 'homeroom', accent: '#B4532A' },
	{ key: 'student', accent: '#6D4AE0' },
	{ key: 'guardian', accent: '#2A8A5D' }
];

export function isNavigationRole(value: string): value is NavigationRole {
	return NAVIGATION_ROLES.some((role) => role.key === value);
}

/** Pilihan ikon editor (referensi MenuMaster ICONS); harus sama dengan daftar backend. */
export const NAVIGATION_ICONS = {
	house: House,
	'layout-dashboard': LayoutDashboard,
	inbox: Inbox,
	'building-2': Building2,
	package: Package,
	database: Database,
	'list-tree': ListTree,
	receipt: Receipt,
	wallet: Wallet,
	server: Server,
	'scroll-text': ScrollText,
	school: School,
	users: Users,
	'graduation-cap': GraduationCap,
	'heart-handshake': HeartHandshake,
	'calendar-range': CalendarRange,
	'calendar-check': CalendarCheck,
	'calendar-clock': CalendarClock,
	'file-text': FileText,
	'credit-card': CreditCard,
	settings: Settings,
	'book-open': BookOpen,
	'clipboard-list': ClipboardList,
	'clipboard-check': ClipboardCheck,
	'file-question': FileQuestion,
	'chart-line': ChartLine,
	'message-square': MessageSquare,
	megaphone: Megaphone,
	award: Award,
	folder: Folder,
	bell: Bell,
	star: Star,
	'book-marked': BookMarked,
	network: Network,
	scale: Scale,
	trophy: Trophy,
	'user-plus': UserPlus,
	'user-check': UserCheck,
	stamp: Stamp,
	history: History,
	'chart-column': ChartColumn,
	table: Table,
	'message-circle': MessageCircle,
	'notebook-pen': NotebookPen,
	'calendar-days': CalendarDays,
	// Guru, wali kelas, murid, orang tua (referensi FLIXARE App v5).
	library: Library,
	'file-pen-line': FilePenLine,
	'chart-no-axes-column': ChartNoAxesColumn,
	'scan-qr-code': ScanQrCode,
	'shield-alert': ShieldAlert,
	link: Link
} as const satisfies Record<string, LucideIcon>;

export type NavigationIconKey = keyof typeof NAVIGATION_ICONS;
export const NAVIGATION_ICON_KEYS = Object.keys(NAVIGATION_ICONS) as NavigationIconKey[];

export function navigationIcon(key: string): LucideIcon {
	return NAVIGATION_ICONS[key as NavigationIconKey] ?? Link;
}

export const NAVIGATION_BADGES: readonly NavigationBadge[] = [
	'none',
	'apps',
	'approvals',
	'tasks',
	'msgs',
	'due'
];
export const NAVIGATION_TARGETS: readonly NavigationTarget[] = ['same', 'new'];

export const NAME_MAX_LENGTH = 28;
const NAME_MIN_LENGTH = 2;
const ROUTE_PATTERN = /^(\/[a-z0-9\-/]*(#[a-z0-9-]+)?|https?:\/\/\S+)$/;

export const NEW_GROUP_DEFAULTS = { name: 'Grup baru', icon: 'folder' } as const;
export const NEW_ITEM_DEFAULTS = { name: 'Menu baru', icon: 'link' } as const;

export function isExternalRoute(route: string): boolean {
	return /^https?:\/\//.test(route);
}

/** Normalisasi input rute seperti referensi: rute internal huruf kecil, spasi → tanda hubung. */
export function normalizeRoute(value: string): string {
	const trimmed = value.trim();
	return isExternalRoute(trimmed) ? trimmed : trimmed.toLowerCase().replace(/\s+/g, '-');
}

/** `server` = ditolak backend; pesan dari `message` (backend tetap otoritas validasi). */
export type FieldErrorKey =
	'name_short' | 'route_required' | 'route_invalid' | 'route_duplicate' | 'server';
export interface FieldError {
	key: FieldErrorKey;
	/** Nama node lain untuk `route_duplicate`. */
	other?: string;
	message?: string;
}
export type NodeErrors = Partial<Record<'name' | 'route', FieldError>>;

interface EditorNodeLike {
	uid: string;
	name: string;
	route: string;
}
interface EditorGroupLike extends EditorNodeLike {
	clickable: boolean;
	items: readonly EditorNodeLike[];
}

/**
 * Validasi UX (cermin aturan backend `plan.go`; backend tetap otoritas).
 * Hasil per `uid` node editor.
 */
export function validateTree(groups: readonly EditorGroupLike[]): Record<string, NodeErrors> {
	const routes = new Map<string, EditorNodeLike[]>();
	const register = (node: EditorNodeLike) => {
		if (!node.route) return;
		routes.set(node.route, [...(routes.get(node.route) ?? []), node]);
	};
	for (const g of groups) {
		if (g.clickable) register(g);
		g.items.forEach(register);
	}
	const errors: Record<string, NodeErrors> = {};
	const check = (node: EditorNodeLike, needsRoute: boolean) => {
		const e: NodeErrors = {};
		if ([...node.name.trim()].length < NAME_MIN_LENGTH) e.name = { key: 'name_short' };
		if (needsRoute) {
			const sameRoute = routes.get(node.route) ?? [];
			if (!node.route) e.route = { key: 'route_required' };
			else if (!ROUTE_PATTERN.test(node.route)) e.route = { key: 'route_invalid' };
			else if (sameRoute.length > 1)
				e.route = { key: 'route_duplicate', other: sameRoute.find((n) => n !== node)?.name };
		}
		if (e.name || e.route) errors[node.uid] = e;
	};
	for (const g of groups) {
		check(g, g.clickable);
		g.items.forEach((item) => check(item, true));
	}
	return errors;
}

/** Susunan yang tampil di sidebar (cermin `visibleOnly` backend) — dipakai pratinjau dan fallback. */
export function visibleGroups(groups: readonly NavigationGroup[]): NavigationGroup[] {
	return groups
		.filter((g) => !g.hidden)
		.map((g) => ({ ...g, items: g.items.filter((item) => !item.hidden) }))
		.filter((g) => g.items.length > 0 || g.clickable);
}

export function toSaveInput(layout: Pick<NavigationLayout, 'groups'>): NavigationGroupInput[] {
	return layout.groups.map((g) => ({
		id: g.id,
		name: g.name,
		icon: g.icon,
		route: g.route,
		show_label: g.show_label,
		default_open: g.default_open,
		clickable: g.clickable,
		hidden: g.hidden,
		items: g.items.map((item) => ({
			id: item.id,
			name: item.name,
			icon: item.icon,
			route: item.route,
			target: item.target,
			hidden: item.hidden,
			badge: item.badge
		}))
	}));
}

/** Kode grup Akun pada susunan bawaan (`defaults.go`): tempat menu bersyarat di luar data Menu & navigasi. */
export const ACCOUNT_GROUP_CODE = 'grp-akun';
const SETTINGS_ITEM_CODE = 'pengaturan';

/**
 * Sisipkan menu bersyarat yang bukan bagian data Menu & navigasi (mis. "Tagihan" pemilik tenant guru pribadi)
 * ke grup `groupCode`, tepat sebelum menu Pengaturan. Grup itu dihapus/diganti owner → grup terakhir;
 * susunan kosong → satu grup tanpa judul. Masukan tidak diubah.
 */
export function insertNavigationItem(
	groups: readonly NavigationGroup[],
	groupCode: string,
	item: NavigationItem
): NavigationGroup[] {
	if (groups.length === 0) {
		return [
			{
				id: item.id,
				code: groupCode,
				name: '',
				icon: item.icon,
				route: '',
				show_label: false,
				default_open: true,
				clickable: false,
				hidden: false,
				items: [item]
			}
		];
	}
	const found = groups.findIndex((g) => g.code === groupCode);
	const target = found >= 0 ? found : groups.length - 1;
	return groups.map((group, index) => {
		if (index !== target) return group;
		const settings = group.items.findIndex((i) => i.code === SETTINGS_ITEM_CODE);
		const at = settings >= 0 ? settings : group.items.length;
		return { ...group, items: [...group.items.slice(0, at), item, ...group.items.slice(at)] };
	});
}

/** Rute menu dapat menunjuk seksi halaman (`/app/admin/principal#presensi`, cermin `plan.go`). */
export function splitRoute(route: string): { path: string; hash?: string } {
	const index = route.indexOf('#');
	if (index < 0) return { path: route };
	const path = route.slice(0, index);
	const hash = route.slice(index + 1);
	return hash ? { path, hash } : { path };
}

/**
 * Bentuk entri sidebar; sengaja dideklarasikan di sini (feature tidak boleh mengimpor komponen layout,
 * FE-02) dan harus tetap kompatibel struktural dengan `WorkspaceNavItem`/`WorkspaceNavGroup`.
 */
export interface WorkspaceNavItem {
	label: string;
	icon: LucideIcon;
	href?: Pathname;
	externalHref?: string;
	newTab?: boolean;
	hash?: string;
	badge?: number;
	dot?: boolean;
}
export interface WorkspaceNavGroup {
	label: string;
	showLabel: boolean;
	defaultOpen: boolean;
	items: WorkspaceNavItem[];
}

export interface WorkspaceNavOptions {
	/** Angka badge per kode badge backend (`apps`, `approvals`, …); `none` tidak pernah tampil. */
	badges: Partial<Record<string, number | undefined>>;
	/** Penanda titik per kode item (mis. data setup belum lengkap). */
	dots?: Partial<Record<string, boolean>>;
	/** Rute yang sudah dibangun; rute lain tampil nonaktif (FE-04 D6), bukan menuju 404. */
	builtPaths: ReadonlySet<string>;
}

/** Susunan Menu & navigasi (backend) → entri sidebar `WorkspaceShell`. Dipakai semua area. */
export function toWorkspaceNav(
	groups: readonly NavigationGroup[],
	{ badges, dots = {}, builtPaths }: WorkspaceNavOptions
): WorkspaceNavGroup[] {
	return groups.map((group) => ({
		label: group.name,
		showLabel: group.show_label,
		defaultOpen: group.default_open,
		items: group.items.map((item): WorkspaceNavItem => {
			const external = isExternalRoute(item.route);
			const { path, hash } = external
				? { path: item.route, hash: undefined }
				: splitRoute(item.route);
			const isBuilt = !external && builtPaths.has(path);
			return {
				label: item.name,
				icon: navigationIcon(item.icon),
				href: isBuilt ? (path as Pathname) : undefined,
				hash: isBuilt ? hash : undefined,
				externalHref: external ? item.route : undefined,
				newTab: item.target === 'new',
				badge: item.badge === 'none' ? undefined : badges[item.badge] || undefined,
				dot: Boolean(dots[item.code])
			};
		})
	}));
}

/** `toWorkspaceNav` dengan badge dari workspace (kosong bila belum termuat) dan rute yang sudah dibangun. */
export function workspaceNav(
	groups: readonly NavigationGroup[],
	workspace: AccountWorkspace | null
): WorkspaceNavGroup[] {
	return toWorkspaceNav(groups, { badges: workspace?.badges ?? {}, builtPaths: BUILT_APP_PATHS });
}
