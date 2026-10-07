import {
	cancelAccountRequest,
	cancelEmailChange,
	checkPasswordResetToken,
	createDataExport,
	disableTwoFactor,
	dismissAccountRequest,
	getAccountOverview,
	regenerateBackupCodes,
	requestAccountDeletion,
	resendEmailVerification,
	resendPasswordOtp,
	revokeOtherSessions,
	revokeSession,
	sendPasswordResetLink,
	sendTestNotification,
	setupTwoFactor,
	startAccountLink,
	startPasswordChange,
	unlinkAccount,
	updateAccountProfile,
	updateNotificationPreferences,
	updatePrivacy,
	updateSecurityAlerts,
	uploadAccountRequestDocument,
	verifyAccountEmail,
	verifyPasswordOtp,
	verifyTwoFactor,
	type AccountArea,
	type AccountOverview,
	type BackupCodesResult,
	type ChangePasswordRequest,
	type DocumentUpload,
	type ExportRequest,
	type OAuthProvider,
	type PasswordChallenge,
	type PasswordChangeResult,
	type PrivacyRequest,
	type ProfileResult,
	type ResetTokenStatus,
	type SecurityAlertsRequest,
	type TwoFactorSetup,
	type UpdateNotificationsRequest,
	type UpdateProfileRequest
} from '$lib/api/generated/lms';
import {
	backendFailure,
	backendUnavailable,
	callBackend,
	fetchBackendFile,
	type BackendContext,
	type BackendFailure,
	type BackendFailureResult,
	type BackendResult
} from '$lib/api/backend-call';

/**
 * Feature API Pengaturan Akun (ADR-021) — server-only (load/form action). Pemanggilan, penerusan
 * perangkat klien, dan pemetaan error memakai `$lib/api/backend-call`.
 */
export type AccountApiContext = BackendContext;
export type AccountFailure = BackendFailure;
export type AccountFailureResult = BackendFailureResult;
export type AccountResult<T> = BackendResult<T>;

const call = callBackend;

/** Berkas biner akun (foto profil, unduh data, lampiran pengajuan sendiri). */
export const fetchAccountFile = (ctx: AccountApiContext, path: `/api/v1/account/${string}`) =>
	fetchBackendFile(ctx, path);

export const loadAccountOverview = (ctx: AccountApiContext, area: AccountArea) =>
	call<AccountOverview>(ctx, (init) => getAccountOverview({ area }, init));

export const saveAccountProfile = (
	ctx: AccountApiContext,
	area: AccountArea,
	body: UpdateProfileRequest
) => call<ProfileResult>(ctx, (init) => updateAccountProfile(body, { area }, init));

export const resendEmailLink = (ctx: AccountApiContext, area: AccountArea) =>
	call<AccountOverview>(ctx, (init) => resendEmailVerification({ area }, init));

export const cancelPendingEmail = (ctx: AccountApiContext, area: AccountArea) =>
	call<AccountOverview>(ctx, (init) => cancelEmailChange({ area }, init));

/** Pengajuan milik sendiri di Kotak Persetujuan (batalkan, tutup kartu, unggah dokumen diminta). */
export const cancelRequest = (ctx: AccountApiContext, area: AccountArea, requestId: string) =>
	call<AccountOverview>(ctx, (init) => cancelAccountRequest(requestId, { area }, init));

export const dismissRequest = (ctx: AccountApiContext, area: AccountArea, requestId: string) =>
	call<AccountOverview>(ctx, (init) => dismissAccountRequest(requestId, { area }, init));

export const uploadRequestDocument = (
	ctx: AccountApiContext,
	area: AccountArea,
	requestId: string,
	body: DocumentUpload
) =>
	call<AccountOverview>(ctx, (init) =>
		uploadAccountRequestDocument(requestId, body, { area }, init)
	);

/** Publik: tautan verifikasi email tidak butuh sesi. */
export async function verifyEmailToken(
	fetcher: typeof fetch,
	baseUrl: string,
	token: string
): Promise<AccountResult<{ email: string }>> {
	try {
		const response = await verifyAccountEmail({ token }, { baseUrl, fetch: fetcher });
		if (response.status === 200) return { ok: true, data: response.data.data };
		return backendFailure(response.status, response.data);
	} catch {
		return backendUnavailable('unavailable');
	}
}

export const beginPasswordChange = (ctx: AccountApiContext, body: ChangePasswordRequest) =>
	call<PasswordChallenge>(ctx, (init) => startPasswordChange(body, init));

export const resendPasswordCode = (ctx: AccountApiContext, challengeId: string) =>
	call<PasswordChallenge>(ctx, (init) =>
		resendPasswordOtp({ challenge_id: challengeId, code: '' }, init)
	);

export const confirmPasswordCode = (
	ctx: AccountApiContext,
	area: AccountArea,
	challengeId: string,
	code: string
) =>
	call<PasswordChangeResult>(ctx, (init) =>
		verifyPasswordOtp({ challenge_id: challengeId, code }, { area }, init)
	);

export const requestResetLink = (ctx: AccountApiContext, area: AccountArea, returnPath: string) =>
	call<AccountOverview>(ctx, (init) =>
		sendPasswordResetLink({ return_path: returnPath }, { area }, init)
	);

export const checkResetLink = (ctx: AccountApiContext, token: string) =>
	call<ResetTokenStatus>(ctx, (init) => checkPasswordResetToken({ token }, init));

export const prepareTwoFactor = (ctx: AccountApiContext, method: 'app' | 'whatsapp') =>
	call<TwoFactorSetup>(ctx, (init) => setupTwoFactor({ method }, init));

export const confirmTwoFactor = (ctx: AccountApiContext, area: AccountArea, code: string) =>
	call<BackupCodesResult>(ctx, (init) => verifyTwoFactor({ code }, { area }, init));

export const renewBackupCodes = (ctx: AccountApiContext, area: AccountArea) =>
	call<BackupCodesResult>(ctx, (init) => regenerateBackupCodes({ area }, init));

export const turnOffTwoFactor = (ctx: AccountApiContext, area: AccountArea) =>
	call<AccountOverview>(ctx, (init) => disableTwoFactor({ area }, init));

export const saveSecurityAlerts = (
	ctx: AccountApiContext,
	area: AccountArea,
	body: SecurityAlertsRequest
) => call<AccountOverview>(ctx, (init) => updateSecurityAlerts(body, { area }, init));

export const signOutSession = (ctx: AccountApiContext, area: AccountArea, sessionId: string) =>
	call<AccountOverview>(ctx, (init) => revokeSession(sessionId, { area }, init));

export const signOutOtherSessions = (ctx: AccountApiContext, area: AccountArea) =>
	call<AccountOverview>(ctx, (init) => revokeOtherSessions({ area }, init));

export const saveNotificationPreferences = (
	ctx: AccountApiContext,
	area: AccountArea,
	body: UpdateNotificationsRequest
) => call<AccountOverview>(ctx, (init) => updateNotificationPreferences(body, { area }, init));

export const sendNotificationTest = (ctx: AccountApiContext, area: AccountArea) =>
	call<AccountOverview>(ctx, (init) => sendTestNotification({ area }, init));

export const beginAccountLink = (
	ctx: AccountApiContext,
	area: AccountArea,
	provider: OAuthProvider,
	returnTo: string
) =>
	call<{ authorize_url: string }>(ctx, (init) =>
		startAccountLink(provider, { return_to: returnTo }, { area }, init)
	);

export const removeAccountLink = (
	ctx: AccountApiContext,
	area: AccountArea,
	provider: OAuthProvider
) => call<AccountOverview>(ctx, (init) => unlinkAccount(provider, { area }, init));

export const savePrivacy = (ctx: AccountApiContext, area: AccountArea, body: PrivacyRequest) =>
	call<AccountOverview>(ctx, (init) => updatePrivacy(body, { area }, init));

export const prepareDataExport = (ctx: AccountApiContext, area: AccountArea, body: ExportRequest) =>
	call<AccountOverview>(ctx, (init) => createDataExport(body, { area }, init));

export const submitDeletionRequest = (ctx: AccountApiContext, area: AccountArea) =>
	call<AccountOverview>(ctx, (init) => requestAccountDeletion({ area }, init));
