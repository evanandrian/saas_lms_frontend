import { dev } from '$app/environment';
import type { BackendResult } from '$lib/api/backend-call';
import { clientMeta } from '$lib/auth/finish-login';
import {
	findSession,
	joinSession,
	startParticipant
} from '$lib/features/exam-sessions/exam-sessions.api';
import { assertHostKind } from '$lib/utils/host-context';
import { fail, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const HTTP_STATUS: Record<string, number> = { not_found: 404, conflict: 409, validation: 422 };

export const load: PageServerLoad = async ({ locals }) => {
	// Peserta tamu ujian terbuka (SAD F11): host publik/tenant; dev memakai host gabungan.
	assertHostKind(locals.host, ['public', 'tenant', 'unified']);
	// Kode sesi demo dari seed hanya ditawarkan saat dev (pola FE-04 D2).
	return { exampleCode: dev ? (await import('./sessions.fixture')).DEMO_SESSION_CODE : null };
};

function context(event: RequestEvent) {
	return {
		fetch: event.fetch,
		cookies: event.cookies,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
	};
}

async function readBody(event: RequestEvent): Promise<Record<string, unknown> | null> {
	try {
		const form = await event.request.formData();
		const body: unknown = JSON.parse(String(form.get('body') ?? 'null'));
		return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

function respond<T>(result: BackendResult<T>) {
	if (result.ok) return { result: result.data };
	return fail(HTTP_STATUS[result.reason] ?? 503, {
		reason: result.reason,
		code: result.code,
		issues: result.issues,
		remaining: null,
		retryAt: null
	});
}

export const actions: Actions = {
	lookup: async (event) => {
		const body = await readBody(event);
		return respond(await findSession(context(event), String(body?.code ?? '')));
	},
	join: async (event) => {
		const body = await readBody(event);
		return respond(
			await joinSession(context(event), String(body?.code ?? ''), {
				name: String(body?.name ?? ''),
				contact: String(body?.contact ?? ''),
				school: String(body?.school ?? ''),
				consents: Array.isArray(body?.consents) ? body.consents.map(Boolean) : []
			})
		);
	},
	start: async (event) => {
		const body = await readBody(event);
		return respond(
			await startParticipant(
				context(event),
				String(body?.code ?? ''),
				String(body?.participantId ?? '')
			)
		);
	}
};
