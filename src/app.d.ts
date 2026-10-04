// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SessionState } from '$lib/auth/session';
import type { Locale } from '$lib/i18n';
import type { ColorMode } from '$lib/utils/color-mode';
import type { HostContext } from '$lib/utils/host-context';

declare global {
	namespace App {
		interface Error {
			message: string;
			/** Kode error stabil dari backend (SAD §10.2), bila ada. */
			code?: string;
		}
		interface Locals {
			host: HostContext;
			locale: Locale;
			colorMode: ColorMode;
			session: SessionState;
		}
	}
}

export {};
