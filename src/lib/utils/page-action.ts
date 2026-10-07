import { deserialize } from '$app/forms';

/** Hasil form action halaman yang dipanggil terprogram (pola kegagalan `BackendFailureResult`). */
export type PageActionOutcome<T> =
	| { ok: true; data: T }
	| {
			ok: false;
			reason: string;
			code: string;
			issues: { field: string; code: string }[];
			remaining: number | null;
			retryAt: string | null;
	  };

type FailureData = Partial<Extract<PageActionOutcome<never>, { ok: false }>>;

/**
 * Memanggil form action halaman ini (`?/<nama>`) secara terprogram — cara resmi SvelteKit
 * (`deserialize` + header `x-sveltekit-action`). Action mengembalikan `{ result }` saat berhasil.
 */
export async function runPageAction<T>(
	name: string,
	body?: unknown
): Promise<PageActionOutcome<T>> {
	const form = new FormData();
	if (body !== undefined) form.set('body', JSON.stringify(body));
	try {
		const response = await fetch(`?/${name}`, {
			method: 'POST',
			body: form,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await response.text());
		if (result.type === 'success') {
			return { ok: true, data: (result.data as { result: T } | undefined)?.result as T };
		}
		const data = (result.type === 'failure' ? result.data : undefined) as FailureData | undefined;
		return {
			ok: false,
			reason: data?.reason ?? 'unavailable',
			code: data?.code ?? 'internal_error',
			issues: data?.issues ?? [],
			remaining: data?.remaining ?? null,
			retryAt: data?.retryAt ?? null
		};
	} catch {
		return {
			ok: false,
			reason: 'unavailable',
			code: 'unavailable',
			issues: [],
			remaining: null,
			retryAt: null
		};
	}
}
