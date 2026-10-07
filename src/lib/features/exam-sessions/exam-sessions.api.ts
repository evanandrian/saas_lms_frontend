import {
	getExamSession,
	joinExamSession,
	startExamParticipant,
	type ExamParticipant,
	type ExamSessionPublic,
	type JoinExamSessionRequest
} from '$lib/api/generated/lms';
import { callPublic, type BackendContext } from '$lib/api/backend-call';

/** Feature API peserta tamu sesi ujian (SAD F11) — server-only, endpoint publik tanpa akun. */
export const findSession = (ctx: BackendContext, code: string) =>
	callPublic<ExamSessionPublic>(ctx, (init) => getExamSession(code, init));

export const joinSession = (ctx: BackendContext, code: string, body: JoinExamSessionRequest) =>
	callPublic<ExamParticipant>(ctx, (init) => joinExamSession(code, body, init));

export const startParticipant = (ctx: BackendContext, code: string, participantId: string) =>
	callPublic<ExamParticipant>(ctx, (init) => startExamParticipant(code, participantId, init));
