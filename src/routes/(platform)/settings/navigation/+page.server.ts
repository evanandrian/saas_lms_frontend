import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Initialize with dummy data matching the reference
	const menus = [
		{
			id: 'beranda',
			type: 'group',
			name: 'Beranda',
			description: 'Grup navigasi utama workspace',
			icon: 'layout-dashboard',
			position: 1,
			isVisible: true,
			roles: ['Platform Admin'],
			children: [
				{ id: 'dashboard', type: 'item', name: 'Dashboard', url: '/console', icon: 'layout-dashboard', position: 1, isVisible: true, roles: ['Platform Admin'] },
				{ id: 'applications', type: 'item', name: 'Aplikasi', url: '/console/applications', icon: 'inbox', position: 2, isVisible: true, roles: ['Platform Admin'] },
				{ id: 'tenants', type: 'item', name: 'Penyewa', url: '/console/tenants', icon: 'building-2', position: 3, isVisible: true, roles: ['Platform Admin'] },
				{ id: 'plans', type: 'item', name: 'Paket Langganan', url: '/console/plans', icon: 'package', position: 4, isVisible: true, roles: ['Platform Admin'] },
				{ id: 'invoices', type: 'item', name: 'Tagihan', url: '/console/invoices', icon: 'receipt', position: 5, isVisible: true, roles: ['Platform Admin'] },
				{ id: 'payments', type: 'item', name: 'Pembayaran', url: '/console/payments', icon: 'wallet', position: 6, isVisible: true, roles: ['Platform Admin'] },
				{ id: 'clusters', type: 'item', name: 'Klaster', url: '/console/clusters', icon: 'server', position: 7, isVisible: true, roles: ['Platform Admin'] },
				{ id: 'audit', type: 'item', name: 'Audit Log', url: '/console/audit', icon: 'scroll-text', position: 8, isVisible: true, roles: ['Platform Admin'] }
			]
		},
		{
			id: 'settings',
			type: 'group',
			name: 'Pengaturan',
			description: 'Grup untuk konfigurasi workspace dan akun',
			icon: 'settings',
			position: 2,
			isVisible: true,
			roles: ['Platform Admin'],
			children: [
				{ id: 'menu-nav', type: 'item', name: 'Menu & Navigasi', url: '/settings/navigation', icon: 'layout-dashboard', position: 1, isVisible: true, roles: ['Platform Admin'] },
				{ id: 'roles', type: 'item', name: 'Peran & Akses', url: '/settings/roles', icon: 'users', position: 2, isVisible: true, roles: ['Platform Admin'] },
				{ id: 'configuration', type: 'item', name: 'Konfigurasi', url: '/settings/configuration', icon: 'settings', position: 3, isVisible: true, roles: ['Platform Admin'] }
			]
		}
	];

	return {
		menus
	};
};
