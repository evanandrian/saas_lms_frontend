import { fetchStudents, fetchSubscription } from '$lib/features/school-admin/school-admin.api';
import { context, loadView, studentsActions } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** 05d Murid: murid aktif dihitung terhadap kursi langganan (student_m, class_student_m). */
export const load: PageServerLoad = async (event) => {
	const [students, subscription] = await Promise.all([
		loadView(event, fetchStudents),
		fetchSubscription(context(event))
	]);
	return { ...students, subscription: subscription.ok ? subscription.data : null };
};

export const actions: Actions = studentsActions;
