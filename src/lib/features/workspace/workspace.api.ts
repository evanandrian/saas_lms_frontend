import {
	getAccountWorkspace,
	type AccountArea,
	type AccountWorkspace
} from '$lib/api/generated/lms';
import { callBackend, type BackendContext } from '$lib/api/backend-call';

/** Feature API identitas workspace (ADR-021) — server-only. Area diverifikasi backend dari keanggotaan aktif. */
export const loadWorkspaceIdentity = (ctx: BackendContext, area: AccountArea) =>
	callBackend<AccountWorkspace>(ctx, (init) => getAccountWorkspace({ area }, init));
