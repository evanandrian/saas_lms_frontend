---
description: Aturan pemanggilan API, penanganan form, dan pemetaan error (BackendFailure) di sisi klien.
trigger: always_on
---

# Data Fetching & Error Handling

FLIXARE menjembatani *server-side routing* SvelteKit dengan aksi pemanggilan API spesifik. Hindari penggunaan `fetch()` bawaan secara manual di komponen kecuali dalam konteks koneksi *third-party*.

## 1. Menggunakan `runPageAction`
Seluruh pengiriman formulir klien ke server harus menggunakan utilitas terpusat: `runPageAction<T>(name, body)`.
*Action* SvelteKit (`+page.server.ts`) menangani *request* dan memvalidasinya, lalu merespons dengan hasil standar SvelteKit yang telah kita rangkum.

```svelte
<script lang="ts">
    import { runPageAction } from '$lib/utils/page-action';

    let busy = $state(false);
    
    async function simpanData() {
        busy = true;
        const result = await runPageAction<{ id: string }>('submitForm', { foo: 'bar' });
        busy = false;

        if (result.ok) {
            // Sukses
            console.log(result.data.id);
        } else {
            // Gagal, tampilkan issue ke input atau toast
            console.error(result.code, result.issues);
        }
    }
</script>
```

## 2. Pemetaan Kode Error (BackendFailure)
Jangan me-*render* `result.code` mentah langsung kepada pengguna.
- Tangkap *error code* ke dalam variabel reaktif (seperti `failure`).
- Petakan ke pesan pengguna melalui berkas terjemahan i18n (`t('failure.' + failure)`).
- Jika ada kesalahan validasi (*field-level errors*), baca dari `result.issues` dan berikan indikasi visual (garis merah, pesan pembantu) pada *input field* spesifik.

## 3. Penggunaan `<Toast>`
Selalu berikan umpan balik positif apabila suatu mutasi (POST/PUT/DELETE) berhasil, menggunakan *toast notification* yang seragam. Simpan durasi *toast* pendek (misal 5 detik).
