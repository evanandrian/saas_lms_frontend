<script lang="ts">
	import type { TenantResponse } from './tenant-management.model';
	import type { BackendFailure } from '$lib/api/backend-call';
	import { invalidateAll } from '$app/navigation';
	import { runPageAction } from '$lib/utils/page-action';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	
	let { list, failure }: { list: TenantResponse[] | null, failure: BackendFailure | null } = $props();

	let items = $derived(list || []);
	let selId = $state('');
	let mode = $state<'view'>('view');
	let tab = $state<'all' | 'active' | 'trial' | 'suspended'>('all');
	
	let cAll = $derived(items.length);
	let cActive = $derived(items.filter(x => x.lifecycle_status === 'active').length);
	let cTrial = $derived(items.filter(x => x.lifecycle_status === 'trial').length);
	let cSuspended = $derived(items.filter(x => x.lifecycle_status === 'suspended').length);
	
	let q = $state('');
	let act = $state<'suspend' | 'activate' | ''>('');
	let confirm = $state(false);
	let toast = $state<{text: string, icon: string} | null>(null);
	
	const mix = (c: string, p: number) => `color-mix(in oklch, ${c} ${p}%, var(--color-lms-surface))`;
	const BLUE = 'var(--color-lms-interactive)', GREEN = '#3FAE78', RED = '#D33C3C';
	const ST: Record<string, string[]> = { 
		active: ['AKTIF','var(--color-lms-success-subtle)','var(--color-lms-success-text)'], 
		trial: ['TRIAL','var(--color-lms-interactive-subtle)','var(--color-lms-interactive-subtle-text)'], 
		suspended: ['DITANGGUHKAN','var(--color-lms-danger-subtle)','var(--color-lms-danger-text)'], 
		pending_payment: ['PENDING','var(--color-lms-warning-subtle)','var(--color-lms-warning-text)'],
		trial_expired: ['EXPIRED','var(--color-lms-danger-subtle)','var(--color-lms-danger-text)'],
		overdue: ['OVERDUE','var(--color-lms-warning-subtle)','var(--color-lms-warning-text)']
	};
	const ACCS = ['#0B7F82','#A8620A','#6D4AE0','#2A8A5D','#4169E1','#C2410C'];
	const ini = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
	const hashStr = (s: string) => s.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
	
	let p = $derived(items.find(x => x.id === selId) || items[0]);
	let st = $derived(p ? (ST[p.lifecycle_status] || ST['pending_payment']) : ST['pending_payment']);
	let ql = $derived(q.toLowerCase());
	let filteredList = $derived(items.filter(x => (tab === 'all' || x.lifecycle_status === tab) && (x.id + ' ' + x.code + ' ' + x.name).toLowerCase().includes(ql)));

	function getRenewalDate(p: TenantResponse) {
		if (!p.created_at) return '—';
		const d = new Date(p.created_at);
		if (p.billing_cycle === 'year') {
			d.setFullYear(d.getFullYear() + 1);
		} else {
			d.setMonth(d.getMonth() + 1);
		}
		return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function showToast(text: string, icon = 'icon-circle-check') {
		toast = {text, icon};
		setTimeout(() => { toast = null; }, 4000);
	}

	async function doSuspend() {
		if (!p) return;
		const res = await runPageAction('suspend', { tenantId: p.id });
		if (res.ok) {
			showToast('Tenant berhasil ditangguhkan.');
			act = '';
			await invalidateAll();
		}
	}
	
	let toggle2fa = $state(false);
	let toggleSso = $state(false);
	let toggleWa = $state(false);

	async function doActivate() {
		if (!p) return;
		const res = await runPageAction('activate', { tenantId: p.id });
		if (res.ok) {
			showToast('Tenant berhasil diaktifkan kembali.', 'icon-circle-check');
			act = '';
			await invalidateAll();
		}
	}

	async function saveChanges() {
		const btn = document.getElementById('btn-save');
		if (btn) {
			const oldText = btn.innerHTML;
			btn.innerHTML = '<i class="icon-save"></i>Menyimpan...';
			btn.style.opacity = '0.7';
			
			setTimeout(() => {
				btn.innerHTML = oldText;
				btn.style.opacity = '1';
				showToast('Perubahan berhasil disimpan!', 'icon-circle-check');
			}, 500);
		}
	}
</script>

<div style="display:flex;flex-direction:column;gap:16px;padding-bottom:96px;color:var(--color-lms-foreground);font-family:'Sora',system-ui,sans-serif">
  <HeroBanner
    eyebrow="OPERASIONAL · TENANT"
    title="Tenant"
    description="Kelola identitas, kontak, langganan, dan akses setiap lembaga yang sudah aktif."
    actionsPlacement="end"
  >
    {#snippet actions()}
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="display:flex;flex-direction:column;gap:4px;padding:12px 20px;background:var(--color-lms-surface-muted);border:1px solid var(--color-lms-border);border-radius:12px">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.08em;color:var(--color-lms-muted)">TOTAL</span>
          <span style="font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--color-lms-foreground)">{cAll}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;padding:12px 20px;background:var(--color-lms-success-subtle);border:1px solid var(--color-lms-border);border-radius:12px">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.08em;color:var(--color-lms-success-text)">AKTIF</span>
          <span style="font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--color-lms-success-text)">{cActive}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;padding:12px 20px;background:var(--color-lms-danger-subtle);border:1px solid var(--color-lms-border);border-radius:12px">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.08em;color:var(--color-lms-danger-text)">PERLU TINDAKAN</span>
          <span style="font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--color-lms-danger-text)">{cSuspended}</span>
        </div>
      </div>
    {/snippet}
  </HeroBanner>
  
  {#if failure}
  <div style="background:#fee2e2;color:#b91c1c;padding:16px;border-radius:8px;font-size:14px">
    <strong>Gagal mengambil data dari server:</strong> {failure}
  </div>
  {/if}
  <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
    <div style="flex:0 1 290px;min-width:240px;max-height:calc(100vh - 120px);position:sticky;top:84px;overflow:auto;background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;display:flex;flex-direction:column">
      <div style="padding:12px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--color-lms-border)">
        <span style="position:relative;display:block"><i class="icon-search" style="position:absolute;left:12px;top:11px;color:var(--color-lms-muted)"></i><input bind:value={q} placeholder="Cari nama, kode tenant" style="width:100%;height:38px;border:1px solid var(--color-lms-border-strong);border-radius:8px;padding:0 12px 0 36px;font-size:13px;color:var(--color-lms-foreground);background:var(--color-lms-surface);outline:none"></span>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px;padding:3px;border-radius:8px;background:var(--color-lms-surface-muted)">
          {#each [['all','Semua',cAll],['active','Aktif',cActive],['trial','Trial',cTrial],['suspended','Ditolak/Suspend',cSuspended]] as [k, l, c]}
            <button onclick={() => tab = k as any} style="height:30px;border:none;border-radius:6px;background:{tab === k ? 'var(--color-lms-surface)' : 'transparent'};color:{tab === k ? 'var(--color-lms-foreground)' : 'var(--color-lms-muted)'};box-shadow:{tab === k ? '0 1px 3px rgba(15,24,56,.16)' : 'none'};font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">{l} &middot; {c}</button>
          {/each}
        </div>
      </div>
      {#each filteredList as it}
        {@const sel = mode === 'view' && it.id === selId}
        {@const s2 = ST[it.lifecycle_status] || ST['pending_payment']}
        {@const avBg = ACCS[Math.abs(hashStr(it.id)) % ACCS.length]}
        <button onclick={() => { selId = it.id; mode = 'view'; act = ''; }} style="text-align:left;border:none;border-bottom:1px solid var(--color-lms-border);background:{sel ? mix(BLUE, 8) : 'transparent'};padding:12px 14px;display:flex;gap:10px;align-items:center;cursor:pointer;color:var(--color-lms-foreground);box-shadow:{sel ? 'inset 3px 0 0 ' + BLUE : 'none'}">
          <span style="width:34px;height:34px;border-radius:8px;background:{avBg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex:none">{ini(it.name)}</span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px"><span style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{it.name}</span><span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--color-lms-muted)">{it.code} &middot; {it.plan_name ? it.plan_name : 'Standard'}</span></span>
          <span style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span style="font-size:10px;font-weight:700;letter-spacing:0.04em;padding:4px 8px;border-radius:999px;background:{s2?.[1]};color:{s2?.[2]}">{s2?.[0]}</span></span>
        </button>
      {/each}
      {#if filteredList.length === 0}
        <div style="padding:28px 16px;text-align:center;font-size:13px;color:var(--color-lms-muted);display:flex;flex-direction:column;gap:6px;align-items:center"><i class="icon-circle-check" style="font-size:22px;color:var(--green-ink)"></i>Tidak ada tenant di sini.</div>
      {/if}
    </div>

    <div style="flex:1 1 440px;min-width:0;display:flex;flex-direction:column;gap:14px">
      {#if mode === 'view' && p}
        {@const avBgDetail = ACCS[Math.abs(hashStr(p.id)) % ACCS.length]}
        {@const stDet = ST[p.lifecycle_status] || ST['pending_payment']}
        <div style="background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px">

          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
            <span style="width:48px;height:48px;border-radius:12px;background:{avBgDetail};color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex:none">{ini(p.name)}</span>
            <div style="flex:1 1 220px;display:flex;flex-direction:column;gap:4px;min-width:0"><span style="font-size:18px;font-weight:700">{p.name}</span><span style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--color-lms-muted)">{p.code} &middot; {p.plan_name ? p.plan_name : 'Standard'}</span></div>
            <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;padding:4px 10px;border-radius:999px;background:{stDet?.[1]};color:{stDet?.[2]}">{stDet?.[0]}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:12px">
            <div style="display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:10px;background:var(--color-lms-surface-muted);border:1px solid var(--color-lms-border)">
              <span style="font-size:12px;color:var(--color-lms-muted)">Kursi terpakai</span>
              <span style="font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--color-lms-foreground)">0 / {p.seat_count || 0}</span>
              <span style="height:4px;border-radius:99px;background:var(--color-lms-surface);overflow:hidden"><span style="display:block;height:100%;width:0%;background:var(--color-lms-interactive)"></span></span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:10px;background:var(--color-lms-surface-muted);border:1px solid var(--color-lms-border)">
              <span style="font-size:12px;color:var(--color-lms-muted)">Penyimpanan</span>
              <span style="font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--color-lms-foreground)">0 / {p.seat_count ? (p.seat_count * 0.5) : 50} GB</span>
              <span style="height:4px;border-radius:99px;background:var(--color-lms-surface);overflow:hidden"><span style="display:block;height:100%;width:0%;background:var(--color-lms-interactive)"></span></span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:10px;background:var(--color-lms-surface-muted);border:1px solid var(--color-lms-border)">
              <span style="font-size:12px;color:var(--color-lms-muted)">Login terakhir</span>
              <span style="font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--color-lms-foreground)">—</span>
              <span style="height:4px;border-radius:99px;background:var(--color-lms-surface);overflow:hidden"><span style="display:block;height:100%;width:0%;background:var(--color-lms-interactive)"></span></span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:10px;background:var(--color-lms-surface-muted);border:1px solid var(--color-lms-border)">
              <span style="font-size:12px;color:var(--color-lms-muted)">Invoice terakhir</span>
              <span style="font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--color-lms-foreground)">—</span>
              <span style="height:4px;border-radius:99px;background:var(--color-lms-surface);overflow:hidden"><span style="display:block;height:100%;width:0%;background:var(--color-lms-interactive)"></span></span>
            </div>
          </div>
        </div>

        <div style="background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px">
          <span style="font-size:16px;font-weight:700">Identitas lembaga</span>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:14px 16px;align-items:start">
            <label style="display:flex;flex-direction:column;gap:6px;grid-column:1/-1">
              <span style="font-size:13px;font-weight:600">Nama lembaga</span>
              <input value={p.name} style="height:42px;border:1.5px solid var(--color-lms-border);border-radius:10px;padding:0 12px;font-size:14px;color:var(--color-lms-foreground);background:var(--color-lms-surface);outline:none;width:100%">
            </label>
            <label style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:600">NPSN</span>
              <input value={p.npsn || ''} readonly style="height:42px;border:1.5px solid var(--color-lms-border);border-radius:10px;padding:0 12px;font-family:'IBM Plex Mono',monospace;font-size:14px;color:var(--color-lms-muted);background:var(--color-lms-surface-muted);outline:none;width:100%">
              <span style="font-size:12px;color:var(--color-lms-muted)">Terkunci setelah tenant aktif</span>
            </label>
            <div style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:600">Zona waktu</span>
              <div style="display:flex;gap:2px;padding:3px;border-radius:10px;background:var(--color-lms-surface-muted)">
                <button style="flex:1;height:36px;border:none;border-radius:8px;background:{p.timezone === 'Asia/Jakarta' || !p.timezone ? 'var(--color-lms-surface)' : 'transparent'};color:{p.timezone === 'Asia/Jakarta' || !p.timezone ? 'var(--color-lms-foreground)' : 'var(--color-lms-muted)'};box-shadow:{p.timezone === 'Asia/Jakarta' || !p.timezone ? '0 1px 3px rgba(15,24,56,.16)' : 'none'};font-size:12px;font-weight:600;cursor:pointer">WIB</button>
                <button style="flex:1;height:36px;border:none;border-radius:8px;background:{p.timezone === 'Asia/Makassar' ? 'var(--color-lms-surface)' : 'transparent'};color:{p.timezone === 'Asia/Makassar' ? 'var(--color-lms-foreground)' : 'var(--color-lms-muted)'};box-shadow:{p.timezone === 'Asia/Makassar' ? '0 1px 3px rgba(15,24,56,.16)' : 'none'};font-size:12px;font-weight:600;cursor:pointer">WITA</button>
                <button style="flex:1;height:36px;border:none;border-radius:8px;background:{p.timezone === 'Asia/Jayapura' ? 'var(--color-lms-surface)' : 'transparent'};color:{p.timezone === 'Asia/Jayapura' ? 'var(--color-lms-foreground)' : 'var(--color-lms-muted)'};box-shadow:{p.timezone === 'Asia/Jayapura' ? '0 1px 3px rgba(15,24,56,.16)' : 'none'};font-size:12px;font-weight:600;cursor:pointer">WIT</button>
              </div>
              <span style="font-size:12px;color:var(--color-lms-muted)">Dipakai untuk jadwal ujian dan presensi</span>
            </div>
            <label style="display:flex;flex-direction:column;gap:6px;grid-column:1/-1">
              <span style="font-size:13px;font-weight:600">Alamat</span>
              <input value={p.address || ''} style="height:42px;border:1.5px solid var(--color-lms-border);border-radius:10px;padding:0 12px;font-size:14px;color:var(--color-lms-foreground);background:var(--color-lms-surface);outline:none;width:100%">
            </label>
            <label style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:600">Nama PIC</span>
              <input value={p.contact_name || ''} style="height:42px;border:1.5px solid var(--color-lms-border);border-radius:10px;padding:0 12px;font-size:14px;color:var(--color-lms-foreground);background:var(--color-lms-surface);outline:none;width:100%">
            </label>
            <label style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:600">Email PIC</span>
              <input value={p.email || ''} type="email" style="height:42px;border:1.5px solid var(--color-lms-border);border-radius:10px;padding:0 12px;font-size:14px;color:var(--color-lms-foreground);background:var(--color-lms-surface);outline:none;width:100%">
              <span style="font-size:12px;color:var(--color-lms-muted)">Dipakai untuk invoice dan notifikasi</span>
            </label>
            <label style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:600">Telepon PIC</span>
              <input value={p.phone || ''} inputmode="tel" style="height:42px;border:1.5px solid var(--color-lms-border);border-radius:10px;padding:0 12px;font-size:14px;color:var(--color-lms-foreground);background:var(--color-lms-surface);outline:none;width:100%">
            </label>
          </div>
        </div>

        <div style="background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap">
            <span style="font-size:16px;font-weight:700">Langganan</span>
            <span style="font-size:12px;color:var(--color-lms-muted)">Perpanjangan berikutnya {getRenewalDate(p)}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:14px 16px;align-items:start">
            <label style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:600">Paket</span>
              <select value={p.plan_name || ''} style="height:42px;border:1.5px solid var(--color-lms-border);border-radius:10px;padding:0 10px;font-size:14px;color:var(--color-lms-foreground);background:var(--color-lms-surface)">
                <option value="">—</option>
                {#if p.plan_name}
                  <option value={p.plan_name}>{p.plan_name}</option>
                {/if}
              </select>
            </label>
            <label style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:600">Kursi murid</span>
              <span style="display:flex;border:1.5px solid var(--color-lms-border);border-radius:10px;overflow:hidden;background:var(--color-lms-surface)">
                <button onclick={() => p.seat_count = Math.max(0, (p.seat_count||0)-1)} style="width:40px;border:none;background:var(--color-lms-surface-muted);color:var(--color-lms-foreground);cursor:pointer;font-size:16px"><i class="icon-minus"></i></button>
                <input value={p.seat_count || 0} inputmode="numeric" style="flex:1;min-width:0;height:39px;border:none;padding:0 12px;font-size:15px;font-weight:600;text-align:center;color:var(--color-lms-foreground);background:transparent;outline:none;font-variant-numeric:tabular-nums">
                <button onclick={() => p.seat_count = (p.seat_count||0)+1} style="width:40px;border:none;background:var(--color-lms-surface-muted);color:var(--color-lms-foreground);cursor:pointer;font-size:16px"><i class="icon-plus"></i></button>
              </span>
              <span style="font-size:12px;color:var(--color-lms-muted)">{p.seat_count || 0} murid aktif · sisa 0 kursi</span>
            </label>
            <div style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:600">Siklus tagihan</span>
              <div style="display:flex;gap:2px;padding:3px;border-radius:10px;background:var(--color-lms-surface-muted)">
                <button onclick={() => p.billing_cycle = 'month'} style="flex:1;height:36px;border:none;border-radius:8px;background:{p.billing_cycle === 'month' ? 'var(--color-lms-surface)' : 'transparent'};color:{p.billing_cycle === 'month' ? 'var(--color-lms-foreground)' : 'var(--color-lms-muted)'};box-shadow:{p.billing_cycle === 'month' ? '0 1px 3px rgba(15,24,56,.16)' : 'none'};font-size:12px;font-weight:600;cursor:pointer">Bulanan</button>
                <button onclick={() => p.billing_cycle = 'year'} style="flex:1;height:36px;border:none;border-radius:8px;background:{p.billing_cycle === 'year' || !p.billing_cycle ? 'var(--color-lms-surface)' : 'transparent'};color:{p.billing_cycle === 'year' || !p.billing_cycle ? 'var(--color-lms-foreground)' : 'var(--color-lms-muted)'};box-shadow:{p.billing_cycle === 'year' || !p.billing_cycle ? '0 1px 3px rgba(15,24,56,.16)' : 'none'};font-size:12px;font-weight:600;cursor:pointer">Tahunan (hemat 2 bln)</button>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:16px;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:10px;background:var(--color-lms-surface-muted);flex-wrap:wrap">
            {#if true}
              {@const basePrice = (p.seat_count || 0) * (p.plan_price || 0) * (p.billing_cycle === 'year' ? 10 : 1)}
              {@const ppn = Math.floor(basePrice * 0.11)}
              {@const totalWithTax = basePrice + ppn}
              {@const cycleLabel = p.billing_cycle === 'year' ? 'tahun' : 'bulan'}
              <span style="display:flex;flex-direction:column;gap:2px">
                <span style="font-size:12px;color:var(--color-lms-muted)">Total tagihan berikutnya ({cycleLabel})</span>
                <span style="font-size:20px;font-weight:700;font-variant-numeric:tabular-nums">Rp{new Intl.NumberFormat('id-ID').format(totalWithTax)}</span>
              </span>
              <span style="font-size:12px;line-height:18px;color:var(--color-lms-muted);max-width:360px">
                <b>Detail:</b> {p.seat_count || 0} kursi &times; Rp{new Intl.NumberFormat('id-ID').format(p.plan_price || 0)}
                {#if p.billing_cycle === 'year'}&times; 10 bln (hemat 2 bln){/if}
                = Rp{new Intl.NumberFormat('id-ID').format(basePrice)} (Subtotal) + Rp{new Intl.NumberFormat('id-ID').format(ppn)} (PPN 11%).
              </span>
            {/if}
          </div>
        </div>

        <div style="background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px">
          <span style="font-size:16px;font-weight:700">Akses &amp; domain</span>
          <label style="display:flex;flex-direction:column;gap:6px">
            <span style="font-size:13px;font-weight:600">Subdomain</span>
            <span style="display:flex;border:1.5px solid var(--color-lms-border);border-radius:10px;overflow:hidden;background:var(--color-lms-surface);max-width:460px">
              <input value="" style="flex:1;min-width:0;height:39px;border:none;padding:0 12px;font-family:'IBM Plex Mono',monospace;font-size:14px;color:var(--color-lms-foreground);background:transparent;outline:none">
              <span style="padding:0 12px;display:flex;align-items:center;font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--color-lms-muted);background:var(--color-lms-surface-muted)">.flixare.id</span>
            </span>
            <span style="font-size:12px;color:var(--color-lms-muted);display:flex;gap:6px;align-items:center"><i class="icon-globe"></i>Belum diatur</span>
          </label>
          <div style="display:flex;flex-direction:column;gap:10px">
            <!-- 2FA -->
            <button onclick={() => toggle2fa = !toggle2fa} style="display:flex;gap:12px;align-items:center;border:none;background:none;padding:0;cursor:pointer;color:var(--color-lms-foreground);text-align:left">
              <span style="width:40px;height:22px;border-radius:99px;background:{toggle2fa ? 'var(--color-lms-success-text)' : 'var(--color-lms-border)'};position:relative;flex:none;transition:background .2s">
                <span style="position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transform:{toggle2fa ? 'translateX(18px)' : 'translateX(0)'};transition:transform .2s"></span>
              </span>
              <span style="display:flex;flex-direction:column;gap:2px">
                <span style="font-size:14px;font-weight:600">Wajibkan verifikasi 2 langkah untuk admin</span>
                <span style="font-size:12px;color:var(--color-lms-muted)">Admin sekolah memasukkan kode OTP setiap masuk dari perangkat baru.</span>
              </span>
            </button>
            <!-- SSO -->
            <button onclick={() => toggleSso = !toggleSso} style="display:flex;gap:12px;align-items:center;border:none;background:none;padding:0;cursor:pointer;color:var(--color-lms-foreground);text-align:left">
              <span style="width:40px;height:22px;border-radius:99px;background:{toggleSso ? 'var(--color-lms-success-text)' : 'var(--color-lms-border)'};position:relative;flex:none;transition:background .2s">
                <span style="position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transform:{toggleSso ? 'translateX(18px)' : 'translateX(0)'};transition:transform .2s"></span>
              </span>
              <span style="display:flex;flex-direction:column;gap:2px">
                <span style="font-size:14px;font-weight:600">Masuk dengan Google Workspace</span>
                <span style="font-size:12px;color:var(--color-lms-muted)">Guru dan murid bisa masuk memakai akun belajar.id atau Google sekolah.</span>
              </span>
            </button>
            <!-- WhatsApp -->
            <button onclick={() => toggleWa = !toggleWa} style="display:flex;gap:12px;align-items:center;border:none;background:none;padding:0;cursor:pointer;color:var(--color-lms-foreground);text-align:left">
              <span style="width:40px;height:22px;border-radius:99px;background:{toggleWa ? 'var(--color-lms-success-text)' : 'var(--color-lms-border)'};position:relative;flex:none;transition:background .2s">
                <span style="position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transform:{toggleWa ? 'translateX(18px)' : 'translateX(0)'};transition:transform .2s"></span>
              </span>
              <span style="display:flex;flex-direction:column;gap:2px">
                <span style="font-size:14px;font-weight:600">Notifikasi WhatsApp</span>
                <span style="font-size:12px;color:var(--color-lms-muted)">Pengingat tugas dan presensi ke orang tua.</span>
              </span>
            </button>
          </div>
        </div>

        {#if p.lifecycle_status === 'suspended'}
          <div style="background:var(--color-lms-surface);border:1px solid var(--color-lms-success-subtle);border-radius:12px;padding:20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <span style="flex:1 1 260px;display:flex;flex-direction:column;gap:4px">
              <span style="font-size:16px;font-weight:700;color:var(--color-lms-foreground)">Aktifkan tenant kembali</span>
              <span style="font-size:13px;line-height:20px;color:var(--color-lms-muted)">Buka kembali akses untuk semua pengguna tenant ini.</span>
            </span>
            <button onclick={() => act = 'activate'} style="height:42px;padding:0 16px;border:1.5px solid var(--color-lms-success-text);background:transparent;color:var(--color-lms-success-text);border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;display:flex;gap:8px;align-items:center"><i class="icon-circle-check"></i>Aktifkan...</button>
          </div>
        {:else}
          <div style="background:var(--color-lms-surface);border:1px solid var(--color-lms-danger-subtle);border-radius:12px;padding:20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <span style="flex:1 1 260px;display:flex;flex-direction:column;gap:4px">
              <span style="font-size:16px;font-weight:700;color:var(--color-lms-foreground)">Tangguhkan tenant</span>
              <span style="font-size:13px;line-height:20px;color:var(--color-lms-muted)">Semua pengguna tenant ini tidak bisa masuk sampai diaktifkan kembali. Data tidak dihapus.</span>
            </span>
            <button onclick={() => act = 'suspend'} style="height:42px;padding:0 16px;border:1.5px solid var(--color-lms-danger-text);background:transparent;color:var(--color-lms-danger-text);border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;display:flex;gap:8px;align-items:center"><i class="icon-ban"></i>Tangguhkan...</button>
          </div>
        {/if}

        <div style="position:sticky;bottom:76px;z-index:5;background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:12px 12px 12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;box-shadow:0 18px 40px -24px rgba(15,24,56,0.4)">
          <span style="flex:1 1 200px;font-size:13px;color:var(--color-lms-muted);display:flex;gap:8px;align-items:center"><i class="icon-circle-check"></i>Semua perubahan tersimpan</span>
          {#if act !== ''}
            <button onclick={() => { if(act==='suspend') doSuspend(); else doActivate(); }} style="height:42px;padding:0 18px;border:none;background:{act === 'activate' ? GREEN : '#D33C3C'};color:#fff;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;display:flex;gap:8px;align-items:center"><i class="{act === 'activate' ? 'icon-circle-check' : 'icon-slash'}"></i>Konfirmasi {act === 'activate' ? 'Aktifkan' : 'Tangguhkan'}</button>
          {:else}
            <button style="height:42px;padding:0 16px;border:1px solid var(--color-lms-border);background:var(--color-lms-surface);color:var(--color-lms-foreground);border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">Batalkan</button>
            <button id="btn-save" onclick={saveChanges} style="height:42px;padding:0 18px;border:none;background:var(--color-lms-interactive);color:#fff;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;display:flex;gap:8px;align-items:center"><i class="icon-save"></i>Simpan perubahan</button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  {#if toast}
    <div style="position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:80;background:var(--color-lms-foreground);color:var(--color-lms-surface);border-radius:12px;padding:12px 16px;display:flex;gap:10px;align-items:center;font-size:14px;box-shadow:0 18px 40px -16px rgba(10,16,41,0.5);max-width:calc(100vw - 32px)"><i class="{toast.icon}"></i><span>{toast.text}</span></div>
  {/if}
</div>
