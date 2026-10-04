<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Package from '@lucide/svelte/icons/package';
	import Receipt from '@lucide/svelte/icons/receipt';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Server from '@lucide/svelte/icons/server';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import Settings from '@lucide/svelte/icons/settings';
	import Users from '@lucide/svelte/icons/users';
	import Home from '@lucide/svelte/icons/home';

	const ICON_MAP: Record<string, any> = { 
		'layout-dashboard': LayoutDashboard, 
		'inbox': Inbox, 
		'building-2': Building2, 
		'package': Package, 
		'receipt': Receipt, 
		'wallet': Wallet, 
		'server': Server, 
		'scroll-text': ScrollText, 
		'settings': Settings, 
		'users': Users,
		'home': Home 
	};

	let { data }: { data: PageData } = $props();

	let role = $state('Platform Admin');
	let filterType = $state('all');
	let searchQuery = $state('');

	// Use deeply reactive state
	let menus = $state(JSON.parse(JSON.stringify(data.menus || [])));
	let selectedMenu = $state<any>(null);
	let showSaveBar = $state(false);
	let showIconDropdown = $state(false);

	function selectMenu(menu: any, group?: any) {
		selectedMenu = menu;
	}

	function handleAddGroup() {
		const newGroup = {
			id: 'group-' + Date.now(),
			type: 'group',
			name: 'Grup Baru',
			description: 'Grup navigasi baru',
			icon: 'layout-dashboard',
			position: menus.length + 1,
			isVisible: true,
			roles: ['Platform Admin'],
			children: []
		};
		menus = [...menus, newGroup];
		selectMenu(menus[menus.length - 1]);
		showSaveBar = true;
	}

	function handleAddItem() {
		let parentGroup = selectedMenu?.type === 'group' ? selectedMenu : menus.find((g: any) => g.children?.some((c: any) => c.id === selectedMenu?.id));
		if (!parentGroup) {
			if (menus.length === 0) return;
			parentGroup = menus[0];
		}
		const newItem = {
			id: 'item-' + Date.now(),
			type: 'item',
			name: 'Menu Baru',
			url: '/app/baru',
			icon: 'layout-dashboard',
			position: (parentGroup.children?.length || 0) + 1,
			isVisible: true,
			targetBlank: false,
			roles: ['Platform Admin']
		};
		if (!parentGroup.children) parentGroup.children = [];
		parentGroup.children = [...parentGroup.children, newItem];
		selectMenu(parentGroup.children[parentGroup.children.length - 1]);
		showSaveBar = true;
	}

	function handleDelete() {
		if (!selectedMenu) return;
		if (selectedMenu.type === 'group') {
			menus = menus.filter((m: any) => m.id !== selectedMenu.id);
		} else {
			const parent = menus.find((g: any) => g.children?.some((c: any) => c.id === selectedMenu.id));
			if (parent && parent.children) {
				parent.children = parent.children.filter((c: any) => c.id !== selectedMenu.id);
			}
		}
		selectedMenu = null;
		showSaveBar = true;
	}

	$effect(() => {
		// When selectedMenu deeply changes, show save bar
		if (selectedMenu) {
			showSaveBar = true;
		}
	});
</script>

<svelte:head>
	<title>Konfigurasi Menu & Navigasi - Platform</title>
</svelte:head>

<div class="head">
	<div>
		<h1>Konfigurasi Menu & Navigasi</h1>
		<p>Bangun struktur navigasi workspace secara fleksibel. Tentukan grup menu, sub menu, URL, urutan, visibilitas, target halaman, dan peran yang dapat melihat setiap menu.</p>
	</div>
	<div class="actions">
		<button class="btn sm" id="reset">↺ Atur ulang</button>
		<button class="btn primary sm" id="saveTop">Simpan perubahan</button>
	</div>
</div>

<div class="context">
	<div class="ctx">
		<div class="school">PL</div>
		<div>
			<b>Platform Global</b>
			<small>Konfigurasi navigasi default untuk semua penyewa</small>
		</div>
	</div>
	<select class="select role" bind:value={role}>
		<option>Orang tua</option>
		<option>Admin Sekolah</option>
		<option>Guru</option>
		<option>Siswa</option>
		<option>Kepala Sekolah</option>
		<option>Platform Admin</option>
	</select>
</div>

<div class="workspace">
	<section class="panel">
		<div class="panelhead">
			<div>
				<h2>Struktur menu</h2>
				<p>Susun hierarki dengan head grup → sub menu. Drag untuk mengubah urutan.</p>
			</div>
			<button class="btn primary sm" onclick={handleAddGroup}>＋ Tambah grup</button>
		</div>
		<div class="toolbar">
			<div class="search">
				<span>⌕</span>
				<input bind:value={searchQuery} placeholder="Cari nama menu atau URL..." />
			</div>
			<select class="select filter" bind:value={filterType}>
				<option value="all">Semua tipe</option>
				<option value="group">Head grup</option>
				<option value="item">Sub menu</option>
			</select>
			<button class="btn sm" onclick={handleAddItem}>＋ Sub menu</button>
		</div>
		<div class="tree">
			{#each menus as group}
				<div class="tree-group">
					<div 
						class="tree-row group {selectedMenu?.id === group.id ? 'selected' : ''}" 
						onclick={() => selectMenu(group)}
					>
						<button class="chev">⌄</button>
						<span class="drag">⋮⋮</span>
						<span class="treeicon"><Icon icon={ICON_MAP[group.icon || 'home']} size="sm" /></span>
						<div class="treename">
							[{group.position}] {group.name}
							<small>{group.description || 'Grup navigasi'}</small>
						</div>
						<span class="typebadge group">HEAD GRUP</span>
						<button class="rowmore">•••</button>
					</div>
					<div class="tree-children">
						{#each group.children || [] as item}
							<div 
								class="tree-row child {selectedMenu?.id === item.id ? 'selected' : ''}" 
								onclick={() => selectMenu(item, group)}
							>
								<button class="chev">•</button>
								<span class="drag">⋮⋮</span>
								<span class="treeicon"><Icon icon={ICON_MAP[item.icon || 'home']} size="sm" /></span>
								<div class="treename">
									[{item.position}] {item.name}
									<small>{item.url}</small>
								</div>
								<span class="typebadge">SUB MENU</span>
								<button class="rowmore">•••</button>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<div class="tree-footer">
			Contoh struktur: <b>Pengaturan</b> adalah head grup, sedangkan <b>Menu & Navigasi</b>, <b>Peran & Akses</b>, dan <b>Konfigurasi</b> adalah sub menu di bawahnya.
		</div>
	</section>

	<section class="panel formpanel">
		<div class="panelhead">
			<div>
				<h2>Detail menu</h2>
				<p>Pilih menu di sebelah kiri untuk mengedit, atau buat baru.</p>
			</div>
		</div>
		
		{#if selectedMenu}
		<div class="form">
			<div class="formtitle">
				<div>
					<h3>{selectedMenu.name || 'Menu Baru'}</h3>
					<p>ID: {selectedMenu.id}</p>
				</div>
				<div class="status {selectedMenu.isVisible ? 'on' : 'off'}">{selectedMenu.isVisible ? 'AKTIF' : 'NONAKTIF'}</div>
			</div>

			<div class="formgrid">
				<div class="field full">
					<label>Nama Menu</label>
					<input type="text" class="input" bind:value={selectedMenu.name} placeholder="Contoh: Beranda" />
				</div>
				<div class="field">
					<label>Tipe Menu</label>
					<div class="segment">
						<button class="seg {selectedMenu.type === 'group' ? 'active' : ''}" onclick={() => selectedMenu.type = 'group'}>Head Grup</button>
						<button class="seg {selectedMenu.type === 'item' ? 'active' : ''}" onclick={() => selectedMenu.type = 'item'}>Sub Menu</button>
					</div>
				</div>
				<div class="field">
					<label>Posisi / Urutan</label>
					<input type="number" class="input" bind:value={selectedMenu.position} />
				</div>
				
				<div class="field">
					<label>Ikon (Lucide)</label>
					<div class="relative custom-select-container" style="position: relative;" tabindex="-1" onfocusout={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) showIconDropdown = false; }}>
						<button type="button" class="input icon-select-trigger" style="display: flex; align-items: center; gap: 10px; width: 100%; cursor: pointer;" onclick={() => showIconDropdown = !showIconDropdown}>
							<Icon icon={ICON_MAP[selectedMenu.icon || 'home']} size="sm" />
							<span style="flex: 1; text-align: left;">{selectedMenu.icon}</span>
							<svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
						</button>
						{#if showIconDropdown}
							<ul class="icon-dropdown">
								{#each Object.keys(ICON_MAP) as ic}
									<li tabindex="0" onclick={() => { selectedMenu.icon = ic; showIconDropdown = false; }} onkeydown={(e) => { if (e.key === 'Enter') { selectedMenu.icon = ic; showIconDropdown = false; }}}>
										<Icon icon={ICON_MAP[ic]} size="sm" />
										{ic}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>

				{#if selectedMenu.type === 'item'}
					<div class="field full" style="margin-top: 10px">
						<label>URL / Path Navigasi</label>
						<input type="text" class="input" bind:value={selectedMenu.url} placeholder="Contoh: /app/beranda" />
						<div class="help">Harus diawali dengan garis miring (/) atau URL eksternal valid.</div>
					</div>
					<div class="field full">
						<label class="checkrow">
							<input type="checkbox" bind:checked={selectedMenu.targetBlank} />
							<div><b>Buka di tab baru</b><br>Centang jika ini tautan eksternal.</div>
						</label>
					</div>
				{/if}

				<div class="field full">
					<div class="subsection">
						<h4>Visibilitas & Akses Peran</h4>
						<p>Tentukan apakah menu ini terlihat, dan siapa saja yang bisa melihatnya.</p>
						
						<label class="checkrow" style="margin-bottom: 15px">
							<input type="checkbox" bind:checked={selectedMenu.isVisible} />
							<div><b>Tampilkan di Sidebar</b><br>Jika dimatikan, menu akan disembunyikan dari semua pengguna.</div>
						</label>

						<div class="permissionbox">
							<div class="permissionhead">
								<b>Bisa diakses oleh:</b>
								<button class="btn primary sm">Pilih Semua</button>
							</div>
							<div class="permission-list">
								{#each ['Orang tua', 'Admin Sekolah', 'Guru', 'Siswa', 'Kepala Sekolah', 'Platform Admin'] as r}
									<button 
										class="chip {selectedMenu.roles.includes(r) ? 'active' : ''}"
										onclick={() => {
											if (selectedMenu.roles.includes(r)) selectedMenu.roles = selectedMenu.roles.filter((x: string) => x !== r);
											else selectedMenu.roles = [...selectedMenu.roles, r];
										}}
									>
										{r}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<div class="field full">
					<div class="formactions">
						<div class="left">
							<button class="btn" style="color: var(--danger)" onclick={handleDelete}>Hapus menu</button>
						</div>
					</div>
				</div>
			</div>
		</div>
		{:else}
		<div style="padding: 40px; text-align: center; color: var(--muted); font-size: 13px">
			Pilih menu dari struktur di sebelah kiri untuk melihat detailnya.
		</div>
		{/if}
	</section>
</div>

<!-- Sticky Save Bar -->
<div class="savebar {showSaveBar ? 'show' : ''}">
	<div><span>Perubahan belum disimpan.</span></div>
	<div style="display: flex; gap: 10px;">
		<button class="btn sm" onclick={() => showSaveBar = false}>Batal</button>
		<button class="btn primary sm" onclick={() => { showSaveBar = false; alert('Berhasil disimpan'); }}>Simpan</button>
	</div>
</div>


<style>
* {box-sizing:border-box}

button,input,select,textarea{font:inherit}button{cursor:pointer}
.app{min-height:100vh;display:grid;grid-template-columns:248px 1fr}
.sidebar{background:var(--color-lms-surface);border-right:1px solid var(--color-lms-border);height:100vh;position:sticky;top:0;display:flex;flex-direction:column}
.brand{height:68px;border-bottom:1px solid var(--color-lms-border);display:flex;align-items:center;gap:10px;padding:0 22px;font-weight:800;letter-spacing:.04em}
.mark{width:27px;height:27px;position:relative}.mark:before,.mark:after{content:"";position:absolute;border-radius:8px;transform:rotate(-32deg)}
.mark:before{width:10px;height:22px;background:var(--color-lms-interactive);left:5px;top:4px}.mark:after{width:9px;height:15px;background:var(--color-lms-progress);right:2px;top:1px}.dot{position:absolute;width:6px;height:6px;background:var(--color-lms-progress);border-radius:50%;left:0;top:0}
.side{padding:20px 12px 0}.label{padding:0 10px 8px;color:var(--color-lms-muted);font-size:11px;font-weight:750;letter-spacing:.09em;text-transform:uppercase}
.nav{display:flex;gap:11px;align-items:center;padding:10px 11px;border-radius:9px;color:var(--color-lms-muted);text-decoration:none;font-weight:650;margin:2px 0}.nav:hover{background:var(--color-lms-background);color:var(--color-lms-foreground)}.nav.active{background:var(--color-lms-interactive-subtle);color:var(--color-lms-interactive)}.ico{width:19px;text-align:center}.bottom{margin-top:auto;padding:16px 12px;border-top:1px solid var(--color-lms-border)}
.main{min-width:0}.top{height:68px;background:var(--color-lms-surface);border-bottom:1px solid var(--color-lms-border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:20}.crumb{color:var(--color-lms-muted);font-size:13px}.crumb b{color:var(--color-lms-foreground)}.user{display:flex;align-items:center;gap:10px}.usertext{text-align:right;font-size:12px;line-height:1.3}.usertext span{display:block;color:var(--color-lms-muted);font-size:10px}.avatar{width:34px;height:34px;border-radius:50%;background:var(--color-lms-foreground);color:var(--color-lms-surface);display:grid;place-items:center;font-size:12px;font-weight:800}
.content{padding:28px 32px 105px;max-width:1540px;margin:auto}
.head{display:flex;justify-content:space-between;gap:20px;margin-bottom:20px}.head h1{margin:0 0 8px;font-size:28px;letter-spacing:-.03em}.head p{margin:0;color:var(--color-lms-muted);max-width:820px;line-height:1.65}.actions{display:flex;gap:9px;flex-shrink:0;align-items:flex-start}
.btn{border:1px solid var(--color-lms-border);background:var(--color-lms-surface);color:var(--color-lms-foreground);border-radius:9px;padding:10px 15px;font-weight:700}.btn:hover{background:var(--color-lms-background)}.btn.primary{background:var(--color-lms-interactive);border-color:var(--color-lms-interactive);color:var(--color-lms-on-interactive, #ffffff)}.btn.primary:hover{background:var(--color-lms-interactive-hover)}.btn.danger{color:var(--color-lms-danger-text);border-color:var(--color-lms-danger-text);background:var(--color-lms-surface)}.btn.sm{padding:7px 10px;font-size:12px}
.context{background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:14px 17px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}.ctx{display:flex;align-items:center;gap:12px}.school{width:38px;height:38px;border-radius:10px;background:var(--color-lms-interactive-subtle);color:var(--color-lms-interactive);display:grid;place-items:center;font-weight:800}.ctx small{display:block;color:var(--color-lms-muted);font-size:11px;margin-top:3px}.select{border:1px solid var(--color-lms-border);border-radius:8px;background:var(--color-lms-surface);color:var(--color-lms-foreground);padding:9px 11px;font-weight:650}.role{min-width:185px}
.workspace{display:grid;grid-template-columns:minmax(430px,1.15fr) minmax(420px,.85fr);gap:18px}
.panel{background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}.panelhead{padding:17px 19px;border-bottom:1px solid var(--color-lms-border);display:flex;justify-content:space-between;align-items:center;gap:12px}.panelhead h2{font-size:16px;margin:0 0 4px}.panelhead p{font-size:12px;color:var(--color-lms-muted);margin:0;line-height:1.5}
.toolbar{padding:12px 15px;border-bottom:1px solid var(--color-lms-border);display:flex;align-items:center;gap:8px;flex-wrap:wrap}.search{position:relative;flex:1;min-width:170px}.search input{width:100%;padding:9px 11px 9px 32px;border:1px solid var(--color-lms-border);border-radius:8px;outline:none}.search span{position:absolute;left:11px;top:9px;color:var(--color-lms-muted)}.filter{padding:9px 10px}
.tree{padding:15px}.tree-group{margin-bottom:7px}.tree-row{min-height:48px;display:grid;grid-template-columns:22px 22px 34px minmax(120px,1fr) auto 32px;gap:8px;align-items:center;border:1px solid transparent;border-radius:10px;padding:6px 8px;transition:.15s}.tree-row:hover{background:var(--color-lms-background);border-color:var(--color-lms-border)}.tree-row.selected{background:var(--color-lms-interactive-subtle);border-color:var(--color-lms-interactive)}.tree-row.group{background:var(--color-lms-surface)}.tree-row.child{margin-left:34px;grid-template-columns:22px 22px 32px minmax(120px,1fr) auto 32px}.tree-row.hidden{opacity:.55}
.chev{border:0;background:transparent;color:var(--color-lms-muted);width:22px;height:25px;font-size:14px}.drag{color:var(--color-lms-muted);cursor:grab;text-align:center}.treeicon{width:32px;height:32px;border-radius:8px;background:var(--color-lms-background);color:var(--color-lms-muted);display:grid;place-items:center;font-size:14px}.group .treeicon{background:var(--color-lms-interactive-subtle);color:var(--color-lms-interactive)}.treename{font-weight:750;min-width:0}.treename small{display:block;color:var(--color-lms-muted);font-size:10px;font-weight:500;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.typebadge{font-size:9px;padding:5px 7px;border-radius:6px;background:var(--color-lms-background);color:var(--color-lms-muted);font-weight:800}.typebadge.group{background:var(--color-lms-interactive-subtle);color:var(--color-lms-interactive)}.rowmore{border:0;background:transparent;color:var(--color-lms-muted);width:30px;height:30px;border-radius:7px}.rowmore:hover{background:var(--color-lms-background)}
.tree-footer{border-top:1px solid var(--color-lms-border);padding:13px 15px;color:var(--color-lms-muted);font-size:11px;line-height:1.5}
.form{padding:18px 20px}.formtitle{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:17px}.formtitle h3{font-size:15px;margin:0 0 4px}.formtitle p{font-size:11px;color:var(--color-lms-muted);margin:0;line-height:1.5}.status{font-size:10px;padding:5px 8px;border-radius:6px;font-weight:800;white-space:nowrap}.status.on{background:color-mix(in oklab, var(--color-lms-progress) 15%, transparent);color:var(--color-lms-progress)}.status.off{background:var(--color-lms-background);color:var(--color-lms-muted)}
.formgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.field.full{grid-column:1/-1}.field label{display:block;font-size:11px;font-weight:750;margin-bottom:6px}.input,.textarea{width:100%;border:1px solid var(--color-lms-border);border-radius:8px;padding:10px 11px;color:var(--color-lms-foreground);outline:none;background:var(--color-lms-surface)}.textarea{min-height:75px;resize:vertical}.input:focus,.textarea:focus,.select:focus{border-color:var(--color-lms-interactive);box-shadow:0 0 0 3px var(--color-lms-interactive-subtle)}.help{font-size:10px;color:var(--color-lms-muted);line-height:1.5;margin-top:5px}
.urlrow{display:grid;grid-template-columns:1fr auto;gap:8px}.urlok{border:1px solid var(--color-lms-progress);background:color-mix(in oklab, var(--color-lms-progress) 15%, transparent);color:var(--color-lms-progress);border-radius:8px;padding:0 11px;display:flex;align-items:center;font-size:11px;font-weight:750}
.segment{display:flex;border:1px solid var(--color-lms-border);border-radius:8px;padding:3px;background:var(--color-lms-background)}.seg{flex:1;border:0;background:transparent;padding:8px;border-radius:6px;color:var(--color-lms-muted);font-size:11px;font-weight:700}.seg.active{background:var(--color-lms-surface);color:var(--color-lms-interactive);box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.checkrow{display:flex;align-items:flex-start;gap:8px;font-size:11px;color:var(--color-lms-muted);line-height:1.5;margin:9px 0}.checkrow input{accent-color:var(--color-lms-interactive);margin-top:2px}
.permissionbox{border:1px solid var(--color-lms-border);border-radius:10px;padding:12px;margin-top:5px}.permissionhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.permissionhead b{font-size:11px}.permission-list{display:flex;flex-wrap:wrap;gap:7px}.chip{border:1px solid var(--color-lms-border);background:var(--color-lms-surface);color:var(--color-lms-muted);padding:7px 9px;border-radius:7px;font-size:10px;font-weight:700}.chip.active{background:var(--color-lms-interactive-subtle);border-color:var(--color-lms-interactive);color:var(--color-lms-interactive)}
.subsection{margin-top:18px;padding-top:17px;border-top:1px solid var(--color-lms-border)}.subsection h4{font-size:12px;margin:0 0 4px}.subsection>p{font-size:10px;color:var(--color-lms-muted);line-height:1.5;margin:0 0 11px}
.formactions{display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:16px;border-top:1px solid var(--color-lms-border)}.formactions .left{display:flex;gap:7px}.formactions .right{display:flex;gap:7px}
.previewbox{margin-top:16px;border:1px solid var(--color-lms-border);border-radius:11px;background:var(--color-lms-background);padding:12px}.previewlabel{font-size:10px;color:var(--color-lms-muted);font-weight:750;margin-bottom:8px}.urlpreview{background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:8px;padding:10px;font-size:11px;color:var(--color-lms-foreground);word-break:break-all}.urlpreview b{color:var(--color-lms-interactive)}
.savebar{position:fixed;left:248px;right:0;bottom:0;background:color-mix(in oklab, var(--color-lms-surface) 95%, transparent);backdrop-filter:blur(8px);border-top:1px solid var(--color-lms-border);padding:12px 32px;display:flex;align-items:center;justify-content:space-between;transform:translateY(110%);transition:.2s;z-index:30}.savebar.show{transform:none}.savebar span{font-size:12px;color:var(--color-lms-muted)}.savebar b{color:var(--color-lms-foreground)}
.toast{position:fixed;right:24px;bottom:75px;background:var(--color-lms-foreground);color:var(--color-lms-surface);padding:11px 14px;border-radius:9px;font-size:12px;opacity:0;transform:translateY(8px);transition:.2s;z-index:70}.toast.show{opacity:1;transform:none}
.modalback{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:60}.modalback.open{display:flex}.modal{width:min(520px,calc(100vw - 30px));background:var(--color-lms-surface);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,0.2);overflow:hidden}.modalhead{padding:18px 20px;border-bottom:1px solid var(--color-lms-border);display:flex;justify-content:space-between}.modalhead h3{margin:0;font-size:15px}.close{border:0;background:none;font-size:20px;color:var(--color-lms-muted)}.modal.modalfoot{padding:13px 20px;border-top:1px solid var(--color-lms-border);display:flex;justify-content:flex-end;gap:8px}
.notice{padding:11px 12px;border-radius:9px;background:color-mix(in oklab, var(--color-lms-warning-text) 15%, transparent);color:var(--color-lms-warning-text);font-size:10px;line-height:1.5;margin-bottom:14px}.danger{padding:11px 12px;border-radius:9px;background:color-mix(in oklab, var(--color-lms-danger-text) 15%, transparent);color:var(--color-lms-danger-text);font-size:10px;line-height:1.5;margin-top:12px;display:none}
@media(max-width:1100px){.workspace{grid-template-columns:1fr}.preview-hide{display:none}}
@media(max-width:800px){.app{grid-template-columns:1fr}.sidebar{display:none}.top{padding:0 16px}.usertext{display:none}.content{padding:22px 16px 100px}.head{display:block}.actions{margin-top:15px}.context{flex-direction:column;align-items:flex-start}.role{width:100%}.formgrid{grid-template-columns:1fr}.field.full{grid-column:auto}.savebar{left:0;padding:11px 16px}.tree-row,.tree-row.child{grid-template-columns:22px 22px 32px minmax(100px,1fr) 30px}.typebadge{display:none}.workspace{display:block}.formpanel{margin-top:18px}}

.icon-dropdown {
	position: absolute;
	top: calc(100% + 4px);
	left: 0;
	right: 0;
	background: var(--color-lms-surface);
	border: 1px solid var(--color-lms-border);
	border-radius: 8px;
	box-shadow: 0 4px 15px rgba(0,0,0,0.05);
	max-height: 200px;
	overflow-y: auto;
	z-index: 100;
	margin: 0;
	padding: 4px;
	list-style: none;
}
.icon-dropdown li {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 12px;
	border-radius: 6px;
	cursor: pointer;
	font-size: 11px;
	color: var(--color-lms-foreground);
}
.icon-dropdown li:hover {
	background: var(--color-lms-background);
}

</style>