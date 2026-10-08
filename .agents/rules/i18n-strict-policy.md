---
description: Pedoman ketat melarang hardcode teks bahasa Indonesia pada antarmuka; kewajiban menggunakan i18n.
trigger: always_on
---

# i18n (Internationalization) Strict Policy

FLIXARE dirancang secara *multi-language* sejak awal (Indonesia dan Inggris). Tidak boleh ada teks UI statis yang di-*hardcode* di dalam *codebase* `saas_lms_frontend`.

## 1. Aturan Dasar
**DILARANG KERAS:**
```svelte
<h1>Pengaturan Akun</h1>
<button>Simpan Data</button>
```

**WAJIB DIGUNAKAN:**
```svelte
<script lang="ts">
    import { useI18n } from '$lib/i18n';
    const i18n = useI18n();
    const t = (key: string, params?: any) => i18n.t(`settings.${key}`, params);
</script>

<h1>{t('title')}</h1>
<button>{i18n.t('common.actions.save')}</button>
```

## 2. Ekstraksi ke File Terjemahan
Jika Anda membutuhkan kalimat baru, anggap kalimat tersebut telah tersedia di berkas terjemahan JSON di *backend* / *assets* atau tulis dengan ekspektasi terjemahannya akan ditambahkan kemudian.
Gunakan *namespace* yang sesuai (contoh: awalan `dashboard.platform.`, `invoices.`, `account.`).

## 3. Parameter Interpolasi
Jangan menyatukan teks secara manual untuk angka atau nama. Gunakan *parameter interpolation*.

**Salah:**
`{t('welcome')} {user.name} !`

**Benar:**
`{t('welcome_message', { name: user.name })}`
