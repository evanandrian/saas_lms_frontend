import {
	ACCOUNT_GROUP_CODE,
	insertNavigationItem,
	type NavigationGroup,
	type NavigationRole
} from '$lib/features/navigation/navigation.model';
import { APP_PATHS } from '$lib/utils/app-paths';

/** Peran backend (`workspace.user.role_code`) pemilik tenant guru pribadi: satu-satunya yang melihat Tagihan. */
export const PERSONAL_OWNER_ROLE = 'PERSONAL_OWNER';
const BILLING_ITEM_CODE = 'tagihan';
const BILLING_ICON = 'receipt';

/** Susunan sidebar area guru mengikuti tampilan aktif: wali kelas punya area menu sendiri. */
export function teacherSidebarRole(activeView: string | null | undefined): NavigationRole {
	return activeView === 'homeroom' ? 'homeroom' : 'teacher';
}

export interface TeacherSidebarOptions {
	homeroomView: boolean;
	roleCode: string | undefined;
	billingLabel: string;
}

/**
 * Susunan sidebar guru + menu "Tagihan" bersyarat (bukan data Menu & navigasi): hanya tampilan guru mapel
 * dan hanya untuk PERSONAL_OWNER, di grup Akun sebelum Pengaturan.
 */
export function teacherSidebarGroups(
	groups: readonly NavigationGroup[],
	{ homeroomView, roleCode, billingLabel }: TeacherSidebarOptions
): readonly NavigationGroup[] {
	if (homeroomView || roleCode !== PERSONAL_OWNER_ROLE) return groups;
	return insertNavigationItem(groups, ACCOUNT_GROUP_CODE, {
		id: `teacher:${BILLING_ITEM_CODE}`,
		code: BILLING_ITEM_CODE,
		name: billingLabel,
		icon: BILLING_ICON,
		route: APP_PATHS.TEACHER_BILLING,
		target: 'same',
		hidden: false,
		badge: 'none'
	});
}
