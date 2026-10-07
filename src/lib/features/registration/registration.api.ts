import {
	advanceRegistration,
	cancelRegistration,
	checkRegistrationPayment,
	deleteRegistrationFile,
	getRegistration,
	getSignupCatalog,
	listSignupCities,
	lookupRegistrationNpsn,
	resendSignupOtp,
	saveRegistrationInstitution,
	saveRegistrationPlan,
	saveRegistrationSetup,
	startRegistrationPayment,
	startSignupAccount,
	submitRegistration,
	uploadRegistrationFile,
	verifySignupOtp,
	type ClassSetup,
	type LoginResult,
	type NpsnResult,
	type ProfileSetup,
	type RegistrationState,
	type ResendSignupOtpRequest,
	type SaveInstitutionRequest,
	type SaveRegistrationPlanRequest,
	type SignupCatalog,
	type SignupCity,
	type SignupOtpChallenge,
	type StartPaymentRequest,
	type StartSignupAccountRequest,
	type SubjectsSetup,
	type UploadRegistrationFileRequest,
	type VerifySignupOtpRequest,
	type YearSetup
} from '$lib/api/generated/lms';
import {
	callBackend,
	callPublic,
	fetchBackendFile,
	type BackendContext
} from '$lib/api/backend-call';

/**
 * Feature API Daftar & berlangganan (ADR-021) — server-only. Langkah sebelum akun aktif memakai
 * endpoint publik; setelah OTP terverifikasi memakai token sesi pemohon (cookie HttpOnly).
 */
export type RegistrationApiContext = BackendContext;

export const loadSignupCatalog = (ctx: RegistrationApiContext) =>
	callPublic<SignupCatalog>(ctx, (init) => getSignupCatalog(init));

export const loadSignupCities = (ctx: RegistrationApiContext, province: string) =>
	callPublic<SignupCity[]>(ctx, (init) => listSignupCities({ province }, init));

export const beginSignup = (ctx: RegistrationApiContext, body: StartSignupAccountRequest) =>
	callPublic<SignupOtpChallenge>(ctx, (init) => startSignupAccount(body, init));

export const resendSignupCode = (ctx: RegistrationApiContext, body: ResendSignupOtpRequest) =>
	callPublic<SignupOtpChallenge>(ctx, (init) => resendSignupOtp(body, init));

export const confirmSignupCode = (ctx: RegistrationApiContext, body: VerifySignupOtpRequest) =>
	callPublic<LoginResult>(ctx, (init) => verifySignupOtp(body, init));

export const loadRegistration = (ctx: RegistrationApiContext) =>
	callBackend<RegistrationState>(ctx, (init) => getRegistration(init));

export const cancelOwnRegistration = (ctx: RegistrationApiContext) =>
	callBackend<{ cancelled?: boolean }>(ctx, (init) => cancelRegistration(init));

export const checkNpsn = (ctx: RegistrationApiContext, npsn: string) =>
	callBackend<NpsnResult>(ctx, (init) => lookupRegistrationNpsn(npsn, init));

export const saveInstitution = (ctx: RegistrationApiContext, body: SaveInstitutionRequest) =>
	callBackend<RegistrationState>(ctx, (init) => saveRegistrationInstitution(body, init));

export const savePlan = (ctx: RegistrationApiContext, body: SaveRegistrationPlanRequest) =>
	callBackend<RegistrationState>(ctx, (init) => saveRegistrationPlan(body, init));

export const uploadFile = (ctx: RegistrationApiContext, body: UploadRegistrationFileRequest) =>
	callBackend<RegistrationState>(ctx, (init) => uploadRegistrationFile(body, init));

export const removeFile = (ctx: RegistrationApiContext, fileId: string) =>
	callBackend<RegistrationState>(ctx, (init) => deleteRegistrationFile(fileId, init));

export const submitApplication = (ctx: RegistrationApiContext) =>
	callBackend<RegistrationState>(ctx, (init) => submitRegistration(init));

export const startPayment = (ctx: RegistrationApiContext, body: StartPaymentRequest) =>
	callBackend<RegistrationState>(ctx, (init) => startRegistrationPayment(body, init));

export const checkPayment = (ctx: RegistrationApiContext) =>
	callBackend<RegistrationState>(ctx, (init) => checkRegistrationPayment(init));

export const advanceStep = (ctx: RegistrationApiContext, step: string) =>
	callBackend<RegistrationState>(ctx, (init) => advanceRegistration({ step }, init));

/** Langkah setup awal yang disimpan ke database tenant. */
export type SetupStep = Parameters<typeof saveRegistrationSetup>[0];

export const saveSetup = (
	ctx: RegistrationApiContext,
	step: SetupStep,
	body: ProfileSetup | YearSetup | ClassSetup | SubjectsSetup
) => callBackend<RegistrationState>(ctx, (init) => saveRegistrationSetup(step, body, init));

/** Logo/dokumen pengajuan milik pemohon untuk pratinjau. */
export const fetchRegistrationFile = (ctx: RegistrationApiContext, fileId: string) =>
	fetchBackendFile(ctx, `/api/v1/registration/files/${encodeURIComponent(fileId)}`);
