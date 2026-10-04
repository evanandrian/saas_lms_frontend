import type { LucideIcon } from '@lucide/svelte';
import Armchair from '@lucide/svelte/icons/armchair';
import Award from '@lucide/svelte/icons/award';
import BookOpen from '@lucide/svelte/icons/book-open';
import Building2 from '@lucide/svelte/icons/building-2';
import CalendarCheck from '@lucide/svelte/icons/calendar-check';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import CalendarRange from '@lucide/svelte/icons/calendar-range';
import CalendarX from '@lucide/svelte/icons/calendar-x';
import ChartLine from '@lucide/svelte/icons/chart-line';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
import ClipboardList from '@lucide/svelte/icons/clipboard-list';
import FileClock from '@lucide/svelte/icons/file-clock';
import FilePenLine from '@lucide/svelte/icons/file-pen-line';
import FileText from '@lucide/svelte/icons/file-text';
import FileUp from '@lucide/svelte/icons/file-up';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import Megaphone from '@lucide/svelte/icons/megaphone';
import School from '@lucide/svelte/icons/school';
import UserPlus from '@lucide/svelte/icons/user-plus';
import UserX from '@lucide/svelte/icons/user-x';
import Users from '@lucide/svelte/icons/users';
import Wallet from '@lucide/svelte/icons/wallet';

/**
 * Ikon yang dapat dirujuk data (fixture kini, API kelak) lewat kunci string,
 * karena data dari `load` server harus dapat diserialisasi. Ikon navigasi diimpor langsung oleh route.
 */
export const UI_ICONS = {
	armchair: Armchair,
	award: Award,
	'book-open': BookOpen,
	building: Building2,
	'calendar-check': CalendarCheck,
	'calendar-clock': CalendarClock,
	'calendar-range': CalendarRange,
	'calendar-x': CalendarX,
	'chart-line': ChartLine,
	'circle-check': CircleCheck,
	'clipboard-check': ClipboardCheck,
	'clipboard-list': ClipboardList,
	'file-clock': FileClock,
	'file-pen-line': FilePenLine,
	'file-text': FileText,
	'file-up': FileUp,
	'graduation-cap': GraduationCap,
	megaphone: Megaphone,
	school: School,
	'user-plus': UserPlus,
	'user-x': UserX,
	users: Users,
	wallet: Wallet
} as const satisfies Record<string, LucideIcon>;

export type UiIconKey = keyof typeof UI_ICONS;
