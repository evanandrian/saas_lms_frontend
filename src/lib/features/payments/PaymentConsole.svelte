<script lang="ts">
	import type { PlatformPaymentList, PlatformPaymentSummary, UnpaidInvoiceList, UnpaidInvoice } from './payments.model';
	import type { BackendFailure } from '$lib/api/backend-call';
	import { invalidateAll } from '$app/navigation';
	import { runPageAction } from '$lib/utils/page-action';
	
	let { list, unpaid, failure }: { list: PlatformPaymentList | null, unpaid: UnpaidInvoiceList | null, failure: BackendFailure | null } = $props();

	let items = $derived(list?.items || []);
	let invs = $derived(unpaid?.items || []);
	let selId = $state('');
	let mode = $state<'verify' | 'new'>('verify');
	let tab = $state<'pending' | 'all' | 'succeeded' | 'failed'>('pending');
	
	let cPending = $derived(items.filter(x => x.status === 'pending').length);
	let cAll = $derived(items.length);
	let cSucc = $derived(items.filter(x => x.status === 'succeeded').length);
	let cFail = $derived(items.filter(x => x.status === 'failed').length);
	
	let q = $state('');
	let act = $state<'verify' | 'reject'>('verify');
	let rej = $state('');
	let tried = $state(false);
	let confirm = $state(false);
	let matching = $state(false);
	let toast = $state<{text: string, icon: string} | null>(null);
	
	const rp = (n: number) => 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
	const mix = (c: string, p: number) => `color-mix(in oklch, ${c} ${p}%, var(--color-lms-surface))`;
	const BLUE = 'var(--color-lms-interactive)', GREEN = '#3FAE78';
	const METHOD: Record<string, string[]> = { manual_transfer: ['Transfer manual','icon-landmark'], gateway: ['Gateway','icon-hash'] };
	const ST: Record<string, string[]> = { pending: ['PERLU VERIFIKASI','var(--warn-tint)','var(--warn-ink)'], succeeded: ['TERVERIFIKASI','var(--green-tint)','var(--green-ink)'], failed: ['DITOLAK','var(--err-tint)','var(--err-ink)'], expired: ['KEDALUWARSA','var(--color-lms-border)','var(--color-lms-muted)'] };
	
	let p = $derived(items.find(x => x.id === selId) || items[0]);
	let I = $derived(invs.find(i => i.invoice_number === p?.invoice_number) || { invoice_number: p?.invoice_number, tenant_name: p?.tenant_name, total_idr: p?.amount_idr || 0, paid_amount_idr: 0 });
	let left = $derived((I.total_idr || 0) - (I.paid_amount_idr || 0));
	let diff = $derived((p?.amount_idr || 0) - left);
	let pending = $derived(p?.status === 'pending');
	let st = $derived(p ? (ST[p.status] || ST['expired']) : ST['pending']);
	let ql = $derived(q.toLowerCase());
	let filteredList = $derived(items.filter(x => (tab === 'all' || x.status === tab) && (x.id + ' ' + x.invoice_number + ' ' + x.reference + ' ' + x.tenant_name).toLowerCase().includes(ql)));

	function showToast(text: string, icon = 'icon-circle-check') {
		toast = {text, icon};
		setTimeout(() => { toast = null; }, 4000);
	}

	async function doVerify() {
		if (!p) return;
		const res = await runPageAction('verify', { invoiceId: p.invoice_id, paymentId: p.id });
		if (res.ok) {
			showToast('Pembayaran diverifikasi.');
			await invalidateAll();
			confirm = false;
		}
	}
	async function doReject() {
		if (!p) return;
		const res = await runPageAction('reject', { invoiceId: p.invoice_id, paymentId: p.id, reason: rej });
		if (res.ok) {
			showToast('Pembayaran ditolak.', 'icon-circle-x');
			await invalidateAll();
			confirm = false;
		}
	}
	
	let blank = { inv: '', amount: '' as string | number, date: new Date().toISOString().slice(0, 10), method: 'manual_transfer', bank: '', ref: '', file: '' };
	let f = $state(blank);
	
	let fE = $derived.by(() => {
		const E: Record<string, string> = {};
		const fI = invs.find(i => i.id === f.inv);
		if (!fI) E.inv = 'Pilih invoice yang dibayar.';
		if (!(+f.amount > 0)) E.amount = 'Isi jumlah yang diterima.';
		if (!f.date) E.date = 'Isi tanggal.';
		if (f.method === 'manual_transfer' && f.bank.trim().length < 3) E.bank = 'Isi bank dan nama pengirim.';
		if (f.method === 'manual_transfer' && f.ref.trim().length < 4) E.ref = 'Isi nomor referensi.';
		return E;
	});
	let nfE = $derived(Object.keys(fE).length);
	
	async function saveNew() {
		if (nfE) { tried = true; return; }
		const res = await runPageAction('record', { 
			invoiceId: f.inv, 
			payment: { 
				amount_idr: +f.amount, 
				paid_date: f.date, 
				bank_account_id: '00000000-0000-0000-0000-000000000000', // Mock bank
				sender_name: f.bank, 
				reference: f.ref 
			} 
		});
		if (res.ok) {
			showToast('Pembayaran dicatat.');
			mode = 'verify';
			await invalidateAll();
		}
	}
</script>

<div style="display:flex;flex-direction:column;gap:16px;padding-bottom:96px;color:var(--color-lms-foreground);font-family:'Sora',system-ui,sans-serif">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap">
    <div style="display:flex;flex-direction:column;gap:6px"><span style="font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.1em;color:var(--color-lms-interactive);font-weight:600">KEUANGAN · PEMBAYARAN</span><span style="font-size:26px;line-height:34px;font-weight:700">Pembayaran</span><span style="font-size:14px;color:var(--color-lms-muted)">Verifikasi bukti transfer dan catat pembayaran manual. VA dan QRIS terverifikasi otomatis.</span></div>
    <button onclick={() => { mode = 'new'; f = {...blank}; tried = false; }} style="height:40px;padding:0 16px;border:none;background:var(--color-lms-interactive);color:#fff;border-radius:10px;font-size:14px;font-weight:600;display:flex;gap:8px;align-items:center;cursor:pointer"><i class="icon-plus"></i>Catat pembayaran</button>
  </div>
  
  {#if failure}
  <div style="background:#fee2e2;color:#b91c1c;padding:16px;border-radius:8px;font-size:14px">
    <strong>Gagal mengambil data dari server:</strong> {failure}
  </div>
  {/if}
  <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
    <div style="flex:0 1 290px;min-width:240px;max-height:calc(100vh - 120px);position:sticky;top:84px;overflow:auto;background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;display:flex;flex-direction:column">
      <div style="padding:12px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--color-lms-border)">
        <span style="position:relative;display:block"><i class="icon-search" style="position:absolute;left:12px;top:11px;color:var(--color-lms-muted)"></i><input bind:value={q} placeholder="Cari tenant, invoice, referensi" style="width:100%;height:38px;border:1px solid var(--color-lms-border-strong);border-radius:8px;padding:0 12px 0 36px;font-size:13px;color:var(--color-lms-foreground);background:var(--color-lms-surface);outline:none"></span>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px;padding:3px;border-radius:8px;background:var(--color-lms-surface-muted)">
          {#each [['pending','Verifikasi',cPending],['all','Semua',cAll],['succeeded','Terverifikasi',cSucc],['failed','Ditolak',cFail]] as [k, l, c]}
            <button onclick={() => tab = k as any} style="height:30px;border:none;border-radius:6px;background:{tab === k ? 'var(--color-lms-surface)' : 'transparent'};color:{tab === k ? 'var(--color-lms-foreground)' : 'var(--color-lms-muted)'};box-shadow:{tab === k ? '0 1px 3px rgba(15,24,56,.16)' : 'none'};font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">{l} &middot; {c}</button>
          {/each}
        </div>
      </div>
      {#each filteredList as it}
        {@const sel = mode === 'verify' && it.id === selId}
        {@const s2 = ST[it.status] || ST['expired']}
        {@const methodInfo = METHOD[it.method] || ['Lainnya', 'icon-circle']}
        <button onclick={() => { selId = it.id; mode = 'verify'; act = 'verify'; rej = ''; tried = false; }} style="text-align:left;border:none;border-bottom:1px solid var(--color-lms-border);background:{sel ? mix(BLUE, 8) : 'transparent'};padding:12px 14px;display:flex;gap:10px;align-items:center;cursor:pointer;color:var(--color-lms-foreground);box-shadow:{sel ? 'inset 3px 0 0 ' + BLUE : 'none'}">
          <span style="width:34px;height:34px;border-radius:8px;background:var(--color-lms-surface-muted);color:var(--color-lms-muted);display:flex;align-items:center;justify-content:center;flex:none"><i class="{methodInfo[1]}" style="font-size:16px"></i></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px"><span style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{it.tenant_name}</span><span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--color-lms-muted)">{methodInfo[0]} · {new Date(it.paid_at).toLocaleDateString('id-ID')}</span></span>
          <span style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span style="font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap">{rp(it.amount_idr)}</span><span style="font-size:10px;font-weight:700;letter-spacing:0.04em;padding:2px 7px;border-radius:999px;background:{s2?.[1]};color:{s2?.[2]}">{s2?.[0]}</span></span>
        </button>
      {/each}
      {#if filteredList.length === 0}
        <div style="padding:28px 16px;text-align:center;font-size:13px;color:var(--color-lms-muted);display:flex;flex-direction:column;gap:6px;align-items:center"><i class="icon-circle-check" style="font-size:22px;color:var(--green-ink)"></i>Tidak ada pembayaran di sini.</div>
      {/if}
    </div>

    <div style="flex:1 1 440px;min-width:0;display:flex;flex-direction:column;gap:14px">
      {#if mode === 'verify' && p}
        <div style="background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px">
          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
            <div style="flex:1 1 220px;display:flex;flex-direction:column;gap:4px;min-width:0"><span style="font-size:18px;font-weight:700">{p.tenant_name}</span><span style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--color-lms-muted)">{p.id.split('-')[0]} · {p.invoice_number}</span></div>
            <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;padding:4px 10px;border-radius:999px;background:{st?.[1]};color:{st?.[2]}">{st?.[0]}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:12px">
            <div style="display:flex;flex-direction:column;gap:4px;padding:12px;border-radius:10px;background:var(--color-lms-surface-muted);border:1px solid var(--color-lms-border)"><span style="font-size:12px;color:var(--color-lms-muted)">Sisa tagihan</span><span style="font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--color-lms-foreground)">{rp(pending ? left : I.total_idr)}</span></div>
            <div style="display:flex;flex-direction:column;gap:4px;padding:12px;border-radius:10px;background:var(--color-lms-surface-muted);border:1px solid var(--color-lms-border)"><span style="font-size:12px;color:var(--color-lms-muted)">Dibayar</span><span style="font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--color-lms-foreground)">{rp(p.amount_idr)}</span></div>
            <div style="display:flex;flex-direction:column;gap:4px;padding:12px;border-radius:10px;background:{!pending ? 'var(--color-lms-surface-muted)' : diff === 0 ? 'var(--green-tint)' : 'var(--warn-tint)'};border:1px solid transparent"><span style="font-size:12px;color:var(--color-lms-muted)">Selisih</span><span style="font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;color:{!pending ? 'var(--color-lms-muted)' : diff === 0 ? 'var(--green-ink)' : 'var(--warn-ink)'}">{!pending ? '—' : diff === 0 ? 'Rp0' : (diff > 0 ? '+' : '−') + rp(Math.abs(diff))}</span></div>
          </div>
        </div>

        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:stretch">
          <div style="flex:1 1 260px;background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px">
            <span style="font-size:16px;font-weight:700">Bukti pembayaran</span>
            {#if p.has_proof}
              <a href="/platform/invoice/proof?id={p.id}" target="_blank" style="aspect-ratio:3/4;max-height:340px;border-radius:10px;border:1px solid var(--color-lms-border);background:repeating-linear-gradient(135deg, var(--color-lms-surface-muted) 0 10px, var(--color-lms-surface) 10px 20px);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:var(--color-lms-muted)"><i class="icon-image" style="font-size:22px"></i><span style="font-family:'IBM Plex Mono',monospace;font-size:11px">{p.proof_name}</span></a>
            {:else}
              <div style="padding:24px;border-radius:10px;background:var(--color-lms-surface-muted);font-size:13px;color:var(--color-lms-muted);text-align:center">Pembayaran tidak memiliki bukti terlampir.</div>
            {/if}
          </div>
          <div style="flex:1 1 260px;background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px">
            <span style="font-size:16px;font-weight:700">Detail transfer</span>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 14px;font-size:13px">
              <span style="color:var(--color-lms-muted)">Metode</span><span style="font-weight:600;text-align:right">{p?.method ? (METHOD[p.method]?.[0] ?? p.method) : '—'}</span>
              <span style="color:var(--color-lms-muted)">Waktu</span><span style="font-weight:600;text-align:right">{p?.paid_at ? new Date(p.paid_at).toLocaleString('id-ID') : '—'}</span>
              <span style="color:var(--color-lms-muted)">Pengirim</span><span style="font-weight:600;text-align:right">{p.bank_account || '—'}</span>
              <span style="color:var(--color-lms-muted)">Referensi</span><span style="font-weight:600;text-align:right">{p.reference || '—'}</span>
            </div>
          </div>
        </div>

        {#if pending}
          <div style="background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:14px">
            <span style="font-size:16px;font-weight:700">Tindakan</span>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:8px">
              {#each [['verify','Verifikasi','Catat ke invoice','icon-circle-check',GREEN],['reject','Tolak','Minta tenant kirim ulang','icon-circle-x','#D33C3C']] as [k, label, sub, icon, c]}
                <button onclick={() => act = k as any} style="text-align:left;border:1.5px solid {act === k ? c : 'var(--color-lms-border)'};background:{act === k ? mix(c || '', 8) : 'var(--color-lms-surface)'};border-radius:10px;padding:12px 14px;display:flex;gap:10px;align-items:center;cursor:pointer;color:var(--color-lms-foreground)"><i class="{icon}" style="font-size:18px;color:{c}"></i><span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:700">{label}</span><span style="font-size:12px;color:var(--color-lms-muted)">{sub}</span></span></button>
              {/each}
            </div>
            {#if act === 'reject'}
              <div style="display:flex;flex-direction:column;gap:8px"><span style="font-size:13px;font-weight:600">Alasan penolakan</span><div style="display:flex;gap:8px;flex-wrap:wrap">
                {#each ['Bukti tidak terbaca','Jumlah tidak sesuai','Tidak ada di mutasi','Rekening tujuan salah'] as r}
                  <button onclick={() => rej = r} style="height:34px;padding:0 12px;border:1.5px solid {rej === r ? '#D33C3C' : 'var(--color-lms-border-strong)'};background:{rej === r ? mix('#D33C3C', 8) : 'var(--color-lms-surface)'};color:var(--color-lms-foreground);border-radius:999px;font-size:13px;font-weight:600;cursor:pointer">{r}</button>
                {/each}
              </div><span style="font-size:12px;color:{tried && !rej ? 'var(--err-ink)' : 'var(--color-lms-muted)'}">Pilih alasan penolakan.</span></div>
            {/if}
          </div>
          <div style="position:sticky;bottom:0;z-index:5;background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:12px 12px 12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;box-shadow:0 18px 40px -24px rgba(15,24,56,0.4)">
            <button onclick={() => { if(act==='reject' && !rej){ tried=true; return; } if(act==='verify') doVerify(); else doReject(); }} style="height:42px;padding:0 18px;border:none;background:{act === 'verify' ? BLUE : '#D33C3C'};color:#fff;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;display:flex;gap:8px;align-items:center"><i class="{act === 'verify' ? 'icon-circle-check' : 'icon-circle-x'}"></i>{act === 'verify' ? 'Verifikasi pembayaran' : 'Tolak pembayaran'}</button>
          </div>
        {/if}
      {/if}

      {#if mode === 'new'}
        <div style="background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:20px">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline">
            <span style="font-size:16px;font-weight:700">Catat pembayaran manual</span>
            <span style="font-size:12px;color:var(--color-lms-muted)">Untuk transfer yang dikonfirmasi di luar sistem</span>
          </div>
          
          <div style="display:flex;flex-direction:column;gap:10px">
            <span style="font-size:13px;font-weight:700">Invoice yang dibayar</span>
            {#if invs.length === 0}
              <div style="padding:24px;text-align:center;color:var(--color-lms-muted);background:var(--color-lms-surface-muted);border-radius:10px;font-size:13px">Tidak ada invoice yang belum dibayar.</div>
            {:else}
              <div style="display:flex;flex-direction:column;gap:8px">
                {#each invs as o}
                  <button onclick={() => { f.inv = o.id; f.amount = (o.total_idr - o.paid_amount_idr); }} style="text-align:left;border:1px solid {f.inv === o.id ? 'var(--color-lms-interactive)' : (tried && fE.inv ? '#ef4444' : 'var(--color-lms-border)')};background:var(--color-lms-surface);border-radius:8px;padding:12px 16px;display:flex;gap:16px;align-items:center;cursor:pointer;color:var(--color-lms-foreground);box-shadow:{f.inv === o.id ? '0 0 0 1px var(--color-lms-interactive)' : 'none'}">
                    <span style="width:16px;height:16px;border-radius:50%;border:1.5px solid {f.inv === o.id ? 'var(--color-lms-interactive)' : 'var(--color-lms-border-strong)'};background:{f.inv === o.id ? 'var(--color-lms-interactive)' : 'transparent'};display:flex;align-items:center;justify-content:center;flex:none"><span style="width:6px;height:6px;border-radius:50%;background:#fff;display:{f.inv === o.id ? 'block' : 'none'}"></span></span>
                    <span style="flex:1;display:flex;flex-direction:column;gap:2px;min-width:0">
                      <span style="font-size:14px;font-weight:600">{o.tenant_name}</span>
                      <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--color-lms-muted)">{o.invoice_number} &middot; {new Date(o.due_at).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'})}</span>
                    </span>
                    <span style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
                      <span style="font-size:14px;font-weight:700">Rp{rp(o.total_idr - o.paid_amount_idr)}</span>
                      <span style="font-size:11px;color:var(--color-lms-muted)">belum dibayar</span>
                    </span>
                  </button>
                {/each}
              </div>
            {/if}
            {#if tried && fE.inv}<span style="font-size:12px;color:#ef4444">{fE.inv}</span>{/if}
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px;align-items:start">
            <div style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:700">Jumlah diterima</span>
              <span style="display:flex;border:1px solid {tried && fE.amount ? '#ef4444' : 'var(--color-lms-border)'};border-radius:8px;overflow:hidden;background:var(--color-lms-surface)">
                <span style="padding:0 12px;display:flex;align-items:center;font-size:13px;font-weight:600;color:var(--color-lms-muted);background:var(--color-lms-surface-muted)">Rp</span>
                <input bind:value={f.amount} type="number" style="flex:1;min-width:0;height:40px;border:none;padding:0 12px;font-size:14px;font-weight:600;color:var(--color-lms-foreground);background:transparent;outline:none;font-variant-numeric:tabular-nums">
                <button onclick={() => { const i = invs.find(x => x.id === f.inv); if (i) f.amount = (i.total_idr - i.paid_amount_idr); }} style="padding:0 12px;border:none;border-left:1px solid var(--color-lms-border);background:var(--color-lms-surface);color:var(--color-lms-interactive);font-size:12px;font-weight:700;cursor:pointer">Bayar penuh</button>
              </span>
              <div style="display:flex;justify-content:space-between">
                <span style="font-size:12px;color:var(--color-lms-muted)">Sesuai nominal di bukti transfer</span>
                {#if tried && fE.amount}<span style="font-size:12px;color:#ef4444">{fE.amount}</span>{/if}
              </div>
            </div>
            
            <label style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:700">Tanggal diterima</span>
              <span style="position:relative;display:block">
                <input type="date" bind:value={f.date} style="height:42px;border:1px solid {tried && fE.date ? '#ef4444' : 'var(--color-lms-border)'};border-radius:8px;padding:0 12px;font-size:14px;color:var(--color-lms-foreground);background:var(--color-lms-surface);outline:none;width:100%;font-family:inherit">
              </span>
              {#if tried && fE.date}<span style="font-size:12px;color:#ef4444">{fE.date}</span>{/if}
            </label>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px">
            <span style="font-size:13px;font-weight:700">Metode</span>
            <div style="display:flex;background:var(--color-lms-surface-muted);border-radius:8px;padding:4px;gap:2px">
              {#each ['Transfer bank', 'Virtual account', 'QRIS', 'Tunai / cek'] as m}
                {@const mapped = m === 'Transfer bank' ? 'manual_transfer' : m === 'Virtual account' ? 'va' : m === 'QRIS' ? 'qris' : 'cash'}
                <button onclick={() => f.method = mapped} style="flex:1;height:36px;border:none;border-radius:6px;background:{f.method === mapped ? 'var(--color-lms-surface)' : 'transparent'};color:{f.method === mapped ? 'var(--color-lms-foreground)' : 'var(--color-lms-muted)'};font-size:13px;font-weight:700;cursor:pointer;box-shadow:{f.method === mapped ? '0 1px 3px rgba(15,24,56,.1)' : 'none'}">{m}</button>
              {/each}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px;align-items:start">
            <label style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:700">Bank pengirim</span>
              <input bind:value={f.bank} placeholder="mis. BRI a.n. Yayasan Bina Ilmu" style="height:42px;border:1px solid {tried && fE.bank ? '#ef4444' : 'var(--color-lms-border)'};border-radius:8px;padding:0 12px;font-size:14px;color:var(--color-lms-foreground);background:var(--color-lms-surface);outline:none;width:100%">
              {#if tried && fE.bank}<span style="font-size:12px;color:#ef4444">{fE.bank}</span>{/if}
            </label>
            <label style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:13px;font-weight:700">No. referensi</span>
              <input bind:value={f.ref} placeholder="Nomor transaksi di bukti" style="height:42px;border:1px solid {tried && fE.ref ? '#ef4444' : 'var(--color-lms-border)'};border-radius:8px;padding:0 12px;font-family:'IBM Plex Mono',monospace;font-size:14px;color:var(--color-lms-foreground);background:var(--color-lms-surface);outline:none;width:100%">
              {#if tried && fE.ref}<span style="font-size:12px;color:#ef4444">{fE.ref}</span>{/if}
            </label>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px">
            <span style="font-size:13px;font-weight:700">Bukti <span style="font-weight:400;color:var(--color-lms-muted)">(JPG, PNG, PDF &middot; maks. 5 MB)</span></span>
            <div style="border:1.5px dashed var(--color-lms-border-strong);border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center;background:var(--color-lms-surface-muted)">
              <div style="display:flex;align-items:center;gap:12px;color:var(--color-lms-interactive);font-size:13px;font-weight:600">
                <i class="icon-upload" style="font-size:18px"></i> Seret berkas ke sini atau pilih dari perangkat
              </div>
              <button style="height:32px;padding:0 16px;border:1px solid var(--color-lms-border);background:var(--color-lms-surface);color:var(--color-lms-foreground);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">Pilih berkas</button>
            </div>
          </div>
        </div>
        <div style="position:sticky;bottom:0;z-index:5;background:var(--color-lms-surface);border:1px solid var(--color-lms-border);border-top:none;border-bottom-left-radius:12px;border-bottom-right-radius:12px;padding:16px 24px;display:flex;gap:12px;justify-content:flex-end;box-shadow:0 -4px 20px rgba(0,0,0,0.02)">
          <button onclick={() => mode = 'verify'} style="height:42px;padding:0 24px;border:1px solid var(--color-lms-border-strong);background:var(--color-lms-surface);color:var(--color-lms-foreground);border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Batal</button>
          <button onclick={saveNew} style="height:42px;padding:0 32px;border:none;background:var(--color-lms-interactive);color:#fff;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;display:flex;gap:8px;align-items:center">Simpan pembayaran</button>
        </div>
      {/if}
    </div>
  </div>
  {#if toast}
    <div style="position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:80;background:var(--color-lms-foreground);color:var(--color-lms-surface);border-radius:12px;padding:12px 16px;display:flex;gap:10px;align-items:center;font-size:14px;box-shadow:0 18px 40px -16px rgba(10,16,41,0.5);max-width:calc(100vw - 32px)"><i class="{toast.icon}"></i><span>{toast.text}</span></div>
  {/if}
</div>
