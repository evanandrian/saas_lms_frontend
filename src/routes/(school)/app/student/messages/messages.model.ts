/** Tab halaman pesan murid. */
export const MESSAGE_TABS = ['all', 'teachers', 'announcements'] as const;
export type MessageTab = (typeof MESSAGE_TABS)[number];

const isMessageTab = (value: string | null): value is MessageTab =>
	(MESSAGE_TABS as readonly (string | null)[]).includes(value);

/** Tab awal dari `?tab=` (tautan email pengumuman); hanya kunci yang dikenal, selain itu "Semua". */
export function messageTabFromUrl(url: URL): MessageTab {
	const tab = url.searchParams.get('tab');
	return isMessageTab(tab) ? tab : 'all';
}
