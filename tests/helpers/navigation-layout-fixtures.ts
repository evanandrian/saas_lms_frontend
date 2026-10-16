import type { RequestEvent } from '@sveltejs/kit';
import { vi, type Mock } from 'vitest';
import type { NavigationGroup, NavigationRole } from '$lib/features/navigation/navigation.model';

/** Susunan sidebar palsu dari backend; dipakai tes untuk memastikan layout meneruskannya apa adanya. */
export const backendGroups: NavigationGroup[] = [
	{
		id: 'g1',
		code: 'grp-backend',
		name: 'Dari backend',
		icon: 'house',
		route: '',
		show_label: false,
		default_open: true,
		clickable: false,
		hidden: false,
		items: []
	}
];

/** RequestEvent minimal untuk `load` layout server; `depends` dikembalikan agar bisa diasersi. */
export function layoutEvent(path: string) {
	const depends = vi.fn();
	const event = {
		depends,
		fetch: vi.fn(),
		cookies: { get: vi.fn(), set: vi.fn() },
		url: new URL(`http://localhost${path}`)
	} as unknown as RequestEvent;
	return { event, depends };
}

/** Peran terakhir yang diminta ke API sidebar (argumen ke-2 panggilan terakhir mock). */
export const lastRequestedRole = (loadNavigationSidebar: Mock): NavigationRole =>
	loadNavigationSidebar.mock.calls.at(-1)![1];

/** Ringkas susunan sidebar menjadi pasangan [kode grup, kode item]. */
export const codes = (groups: readonly NavigationGroup[]) =>
	groups.map((g) => [g.code, g.items.map((i) => i.code)]);
