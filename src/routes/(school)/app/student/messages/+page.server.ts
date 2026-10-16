import {
	announcementFeedActions,
	loadFeed
} from '$lib/features/announcements/announcements.server';
import { loadStudent } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext } from '$lib/features/dashboards/dashboards.server';
import type { Actions, PageServerLoad } from './$types';
import type { StudentMessagesPageData, ConversationChannel } from './messages.types';

export const load: PageServerLoad = async (event) => {
	// Tab "Pengumuman" membaca feed pengumuman sekolah (bukan kanal contoh).
	const [res, { feed }] = await Promise.all([
		loadStudent(dashboardsContext(event)),
		loadFeed(event)
	]);

	const className = res.ok && res.data?.class_name ? res.data.class_name : 'XI-A';
	const userName =
		res.ok && res.data?.viewer?.full_name ? res.data.viewer.full_name : 'Dimas Surya Pratama';

	const channels: ConversationChannel[] = [
		{
			id: 'ch-homeroom',
			name: 'Dra. Endang Sulastri, M.Pd.',
			roleLabel: 'Wali Kelas XI-A',
			avatarInitials: 'ES',
			unreadCount: 1,
			lastMessage: 'Surat izin olimpiade OSN Matematika sudah ibu setujui ya Dimas.',
			lastMessageTime: '10:45',
			isOnline: true,
			messages: [
				{
					id: 'm-01',
					sender: 'student',
					senderName: userName,
					text: 'Selamat pagi Bu Endang, saya sudah mengunggah surat tugas delegasi lomba OSN melalui menu presensi.',
					timestamp: '09:15'
				},
				{
					id: 'm-02',
					sender: 'teacher',
					senderName: 'Dra. Endang Sulastri, M.Pd.',
					text: 'Selamat pagi Dimas. Baik, surat izin olimpiade OSN Matematika sudah ibu setujui ya Dimas. Selamat berjuang membawa nama baik sekolah!',
					timestamp: '10:45'
				}
			]
		},
		{
			id: 'ch-math',
			name: 'Bambang Sudibyo, M.Pd.',
			roleLabel: 'Guru Matematika',
			avatarInitials: 'BS',
			unreadCount: 0,
			lastMessage: 'Kuis Fungsi Kuadrat dibuka sampai jam 08:30 WIB pagi ini.',
			lastMessageTime: 'Kemarin',
			isOnline: false,
			messages: [
				{
					id: 'm-10',
					sender: 'teacher',
					senderName: 'Bambang Sudibyo, M.Pd.',
					text: 'Anak-anak kelas XI-A, silakan pelajari kembali Bab 2. Kuis Fungsi Kuadrat dibuka sampai jam 08:30 WIB pagi ini.',
					timestamp: 'Kemarin 07:30'
				},
				{
					id: 'm-11',
					sender: 'student',
					senderName: userName,
					text: 'Baik Pak Bambang, terima kasih infonya.',
					timestamp: 'Kemarin 07:35'
				}
			]
		},
		{
			id: 'ch-bio',
			name: 'Dr. Retno Wulandari',
			roleLabel: 'Guru Biologi',
			avatarInitials: 'RW',
			unreadCount: 0,
			lastMessage: 'Laporan praktikum osmosis kelompokmu sudah dinilai (92/100).',
			lastMessageTime: '06 Okt',
			isOnline: true,
			messages: [
				{
					id: 'm-20',
					sender: 'teacher',
					senderName: 'Dr. Retno Wulandari',
					text: 'Laporan praktikum osmosis kelompokmu sudah dinilai (92/100). Sangat lengkap pembahasannya!',
					timestamp: '06 Okt 14:20'
				}
			]
		}
	];

	const data: StudentMessagesPageData = {
		className,
		studentName: userName,
		channels
	};

	return {
		messagesData: data,
		feed
	};
};

export const actions: Actions = announcementFeedActions;
