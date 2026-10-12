---
description: Setiap halaman ber-HeroBanner wajib punya tombol panduan halaman (fungsi, kegunaan, cara pakai, catatan) yang membuka modal; konten dari i18n id/en.
trigger: always_on
---

# Page Help Pattern (Panduan Halaman)

Setiap halaman yang memakai `HeroBanner` **wajib** menyediakan panduan halaman. Panduan ini berupa tombol bulat kecil di pojok kanan atas `HeroBanner` yang membuka modal berisi penjelasan halaman. Tujuannya agar pengguna paham fungsi halaman dan cara memakainya tanpa perlu bertanya ke tim support.

## 1. Cakupan

- **Wajib**: semua halaman yang merender `HeroBanner`, baik langsung maupun lewat pembungkus seperti `ModuleShell`.
- **Halaman dengan hero buatan sendiri** (`<section>` + logogram manual): migrasikan dulu ke `HeroBanner` (`children` untuk kartu statistik), lalu isi `help`.
- **Dikecualikan**: halaman auth (`login`, `join`, `activate`, `invite`, `verify-email`, `logged-out`) dan halaman tanpa `HeroBanner` karena alasan desain.

## 2. Cara Pakai

Isi prop `help` dengan **kunci i18n literal** (string, bukan ekspresi):

```svelte
<HeroBanner
	eyebrow={t('students.eyebrow')}
	title={t('students.title')}
	description={t('students.desc')}
	actionsPlacement="end"
	help="help.school_admin_students"
/>
```

Untuk pembungkus, teruskan prop-nya: `<ModuleShell ... help="help.school_admin_students">`.

Komponen fitur yang dipakai lintas peran boleh memilih topik dengan ternary berisi **literal** (agar tetap terbaca test), mis. `help={ui.isParent ? 'help.learner_reports_guardian' : 'help.learner_reports_student'}`. Jangan menyusun kunci dengan template string.

Jangan membuat tombol atau modal bantuan sendiri. Komponen `PageHelp` (`$lib/components/ui/PageHelp.svelte`) dirender otomatis oleh `HeroBanner`, sudah memakai warna `lms-on-hero`, native `<dialog>` (fokus terkurung, Esc menutup, fokus kembali ke tombol), dan ruang cadangan agar tidak menabrak `actions` atau `aside`.

## 3. Struktur Konten i18n

Tambahkan ke `src/lib/i18n/id.json` **dan** `en.json` (paritas wajib, lihat `i18n-strict-policy.md`) di bawah namespace `help`:

```json
"help": {
	"school_admin_students": {
		"purpose": "1–2 kalimat: halaman ini untuk apa dan siapa penggunanya.",
		"features": {
			"add": "Satu kemampuan per poin, diawali kata kerja.",
			"find": "..."
		},
		"steps": {
			"s1": "Langkah alur utama, berurutan.",
			"s2": "..."
		},
		"tips": {
			"delete": "Opsional: batasan, peringatan, atau syarat penting."
		}
	}
}
```

| Kunci | Wajib | Ditampilkan sebagai |
|---|---|---|
| `purpose` | Ya | Paragraf "Fungsi halaman" |
| `features` | Ya | Daftar poin "Yang bisa dilakukan" |
| `steps` | Ya | Daftar bernomor "Cara penggunaan" (urut sesuai JSON) |
| `tips` | Tidak | Kotak "Catatan penting" (disembunyikan bila kosong) |

- Penamaan topik: `<area>_<halaman>` dalam snake_case, mis. `platform_tenant`, `teacher_grades`, `student_tasks`.
- `features`, `steps`, dan `tips` berupa **objek** `{ "<id>": "teks" }`, bukan array. Urutan tampil mengikuti urutan di JSON. Gunakan id non-angka (`s1`, `add`) agar urutan terjaga.

## 4. Aturan Penulisan Konten

- **Akurat terhadap kode**: hanya jelaskan fitur yang benar-benar berfungsi. Jangan menjanjikan aksi yang masih dummy atau belum terhubung ke backend.
- **Pakai label UI persis**: sebut tombol, tab, dan kolom sesuai teks di layar, dalam tanda kutip, mis. klik "Tambah murid".
- **Sudut pandang pengguna halaman**: gunakan "Anda" untuk admin/guru/platform, dan "kamu" untuk halaman murid (selaras dengan copy halaman murid).
- **Ringkas**: `purpose` 1–2 kalimat, `features` 3–6 poin, `steps` 3–7 langkah, `tips` 0–4 poin.
- **Jaga sinkron**: setiap perubahan fitur, label, atau alur halaman **wajib** disertai pembaruan teks `help.<topik>` di kedua locale pada perubahan yang sama.

## 5. Penegakan Otomatis

`tests/page-help.test.ts` (dijalankan `pnpm test`) gagal bila:

- ada `<HeroBanner>` atau `<ModuleShell>` tanpa prop `help` berisi kunci `help.<topik>` (literal atau ternary literal);
- kunci `purpose`, `features`, atau `steps` hilang di salah satu locale.

Tidak ada daftar pengecualian: halaman baru wajib langsung memakai `help` beserta kontennya.
