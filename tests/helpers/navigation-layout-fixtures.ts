import type { RequestEvent } from '@sveltejs/kit';
import { vi } from 'vitest';
import type { NavigationGroup } from '$lib/features/navigation/navigation.model';

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
