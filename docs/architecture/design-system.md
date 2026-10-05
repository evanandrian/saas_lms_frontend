# Design System — FLIXARE

| Atribut | Nilai |
|---|---|
| Fase | FE-FOUNDATION-03 (fondasi) → FE-FOUNDATION-03R (integrasi brand FLIXARE) → **FE-04** (pola product UI + layar referensi, §19–§20) |
| Tanggal | 3 Oktober 2026 |
| Sumber kanonik | **FLIXARE Brand Guidelines v1.0** (`FLIXARE_Brand_Guidelines_21x29_7cm_v1_0.pdf`, 30 halaman, Oktober 2026) + artwork master `FLIXARE_Logo_Set_interim_PNG` (12 PNG, interim) |
| Fondasi teknis | Skeleton 5.0.1 + Tailwind CSS 4.3.3 (CSS-first) |
| Token | `src/app.css` |
| Komponen | `src/lib/components/ui/` (generik), `src/lib/components/layout/` (kerangka) |
| Aset | `src/lib/assets/brand/` (logo), `src/lib/assets/fonts/sora/` (font), `static/favicon.png` |

**Governance (Brand Guidelines §18):** master artwork, token, definisi komponen, dan guidelines adalah sumber tunggal. Screenshot, file lama (termasuk prototipe `FLIXARE App.html`), dan improvisasi **bukan** source of truth. Dokumen ini hanya mendeskripsikan token, komponen, dan aset yang benar-benar ada.

**Riwayat:**

1. FE-03 memakai tema Skeleton Cerberus sebagai identitas sementara.
2. FE-03R menggantinya dengan identitas brand dari Brand Guidelines v1.0, saat itu bernama **FILEXARE**.
3. Brand kemudian berganti nama menjadi **FLIXARE** (Brand Guidelines FLIXARE v1.0 + Logo Set interim PNG).

Warna, tipografi, bahasa visual, dan aturan product UI di guideline FLIXARE identik dengan versi FILEXARE (diverifikasi lewat diff teks PDF). Perbedaannya hanya:

- nama dan artwork logo;
- ukuran minimum Core+Tagline menjadi 90px / 20mm;
- status wordmark interim.

Cerberus tetap di-import hanya sebagai **primitif internal** (§2.4).

---

## 1. FLIXARE brand foundation

- **Master brand** untuk ekosistem pendidikan yang fleksibel. Brand promise: *"Belajar lebih fleksibel. Berkembang lebih jauh."* Essence: *Empowering Learning*.
- **Formula visual:** Human + Journey + Modularity + Progress + Open Space.
- **Product UI** (§16 guidelines): mode **Calm + Clear + Functional**. Prioritas: Task Completion → Information Clarity → Accessibility → Learning Context → Progress Visibility → Brand Expression ("hadir secukupnya").
- **State system yang diminta guidelines:** Default, Hover, Focus, Active, Selected, Disabled, Loading, Success, Warning, Error, Empty, Offline. Yang sudah ada di kode: Default, Hover, Focus, Active (aria-current), Disabled, Loading, Success/Warning/Error (Alert), Empty (StatePanel). Selected dan Offline belum ada karena belum ada pemakai.

## 2. Brand color tokens

### 2.1 Arsitektur token

```
BRAND (kanonik, HEX)  →  SEMANTIC (makna UI)  →  COMPONENT (utilitas lms-*)  →  komponen Svelte
```

HEX hanya boleh muncul di lapisan brand dan untuk netral putih (`#ffffff`) di `src/app.css`. Komponen tidak pernah memakai HEX.

### 2.2 Brand tokens (Brand Guidelines §07 — LOCKED)

| Token | Nilai | Makna |
|---|---|---|
| `--color-lms-brand-royal-blue` | `#4169E1` | Intelligence, trust, technology, confidence, learning foundation. Brand anchor dan primary interactive color |
| `--color-lms-brand-growth-green` | `#3FAE78` | Growth, progress, development, possibility. **Bukan** semantic success |
| `--color-lms-brand-deep-neutral` | `#172554` | Struktur, teks kuat, kedalaman visual |
| `--color-lms-brand-soft-background` | `#F8FAFC` | Ruang baca, surface ringan, open space |

Proporsi usulan guidelines: 60 (open space) / 20 (blue) / 15 / 5 (green sebagai aksen progres). Nilai brand tidak boleh diubah tanpa keputusan brand Level 3 (§18 guidelines).

### 2.3 Typography token

`--font-lms-sans: 'Sora', ui-sans-serif, system-ui, sans-serif` dan skala `--text-lms-*` (§5).

### 2.4 Primitif Skeleton di bawah token FLIXARE

Tema Cerberus tetap di-import (selector `data-theme="cerberus"`) karena Skeleton membutuhkannya. Cerberus **tidak** lagi menjadi identitas. Pemakaiannya dibatasi pada:

- Netral untuk mode gelap (`surface-*`), hanya untuk regresi (§11).
- Warna semantic state independen: `success`, `warning`, `error`.

Variabel internal Skeleton yang membawa identitas dipetakan ke FLIXARE di `:root[data-theme='cerberus']`:

| Variabel Skeleton | Dipetakan ke | Alasan |
|---|---|---|
| `--color-primary-500` | Royal Blue | Ring fokus bawaan `input`/`select`/`textarea` |
| `--color-primary-contrast-500` | `#ffffff` | Teks di atas primary (4.85:1) |
| `--color-brand-light`, `--color-brand-dark` | Royal Blue | Radio/checkbox, link `anchor`, seleksi teks |
| `--color-root-bg-light` | Soft Background | Latar `html` |
| `--typo-base--color-light` | Deep Neutral | Warna teks body |
| `--typo-base--font-family`, `--typo-heading--font-family` | Sora | Tipografi kanonik |
| `--typo-base--font-size` / `--line-height` | Body 16/24 | Skala kanonik |

Langkah `primary` Cerberus lainnya tidak dipakai di kode proyek. Diverifikasi lewat pemindaian: tidak ada `primary-[0-9]` di `src/`.

## 3. Semantic color mapping

| Token semantik | Light (diturunkan dari brand) | Dark (regresi, §11) | Pemakaian |
|---|---|---|---|
| `lms-background` | Soft Background | `surface-950` | Latar halaman |
| `lms-surface` | `#ffffff` | `surface-900` | Header, panel, kontrol form |
| `lms-surface-muted` | mix(Deep Neutral 6%, Soft) | `surface-800` | Tombol secondary, hover ghost |
| `lms-foreground` | Deep Neutral | `surface-50` | Teks utama |
| `lms-muted` | mix(Deep Neutral 70%, Soft) | `surface-300` | Teks bantuan, caption |
| `lms-border` | mix(Deep Neutral 12%, Soft) | `surface-800` | Pemisah dekoratif |
| `lms-input-border` | mix(Deep Neutral 55%, white) | `surface-400` | Batas kontrol form |
| `lms-interactive` | **Royal Blue** | Royal Blue | Tombol primer, progress navigasi |
| `lms-on-interactive` | `#ffffff` | `#ffffff` | Teks di atas interaktif |
| `lms-interactive-hover` | mix(Royal Blue 80%, Deep Neutral) | sama | Hover tombol primer |
| `lms-interactive-subtle` | mix(Royal Blue 10%, white) | mix(Royal Blue 25%, `surface-900`) | Nav aktif, Alert info |
| `lms-focus` | **Royal Blue** | Royal Blue | Indikator fokus |
| `lms-progress` | **Growth Green** | Growth Green | Dicadangkan untuk visual progres (belum dipakai) |
| `lms-danger-text` | `error-700` | `error-300` | Teks error, penanda wajib |

Semantic state independen dari brand: **success** = Skeleton `success` (teal), **warning** = `warning`, **error** = `error`. **Growth Green ≠ success.**

## 4. Accessibility derivation rules

1. **Warna brand kanonik dan shade interaktif yang aksesibel adalah konsep berbeda.** Shade turunan tidak pernah disebut atau dipakai sebagai pengganti warna brand.
2. Turunan hanya dibuat dengan **`color-mix(in oklab, …)` antar warna brand** (atau dengan putih/hitam netral). Tidak ada hue baru.
3. Warna brand dipakai **langsung** bila lolos: Royal Blue + teks putih = 4.85:1, sehingga tombol primer, fokus, dan progress navigasi memakai `#4169E1` apa adanya.
4. Bila warna brand gagal untuk satu pemakaian, pakai turunan dan dokumentasikan hubungannya:
   - Hover primer = Royal Blue 80% + Deep Neutral 20% (6.11:1).
   - Teks muted = Deep Neutral 70% (5.95:1).
5. Growth Green **tidak pernah** dipakai sebagai warna teks di atas latar terang (2.79:1 / 2.66:1).
6. Growth Green dan Royal Blue tidak diletakkan berdampingan tanpa jarak (1.74:1).
7. Makna tidak pernah dibawa warna saja:
   - nav aktif → `aria-current` + `font-semibold`;
   - error → teks pesan + `aria-invalid`;
   - progres → angka (aturan guidelines §16).

## 5. Typography

**Sora** (SIL Open Font License 1.1, copyright The Sora Project Authors). Self-hosted sebagai variable font (`wght` 100–800), dua subset woff2 (latin 25 KB, latin-ext 12 KB) dari distribusi Google Fonts. Lisensi: `src/lib/assets/fonts/sora/OFL.txt`. Tanpa paket npm dan tanpa request runtime ke pihak ketiga. `font-display: swap`; fallback `ui-sans-serif, system-ui`.

| Peran | Utilitas | Spesifikasi kanonik |
|---|---|---|
| D1 | `text-lms-d1` | 64/72 700 |
| D2 | `text-lms-d2` | 48/56 700 |
| H1 | `text-lms-h1` | 40/48 700 |
| H2 | `text-lms-h2` | 32/40 700 |
| H3 | `text-lms-h3` | 24/32 600 |
| H4 | `text-lms-h4` | 20/28 600 |
| Body Large | `text-lms-body-lg` | 18/28 400 |
| Body (default body) | `text-lms-body` | 16/24 400 |
| Body Small | `text-lms-body-sm` | 14/20 400 |
| Caption | `text-lms-caption` | 12/16 400 |

Nilai px dinyatakan dalam rem (16px = 1rem) agar mengikuti pengaturan ukuran font pengguna.

| Pemakaian | Implementasi |
|---|---|
| Judul halaman (`<h1>`) | `text-lms-h2 md:text-lms-h1` |
| Judul panel/state | `text-lms-h4` |
| Label area di header | `text-lms-body` + `font-semibold` |
| Label form | `lms-text-label` (Body Small, 600) |
| Bantuan / caption / error | `lms-text-helper` / `lms-text-caption` / `lms-text-error` |

Aturan:

- Teks panjang minimal 16/24; konten berat baca 18/28.
- Panjang baris sekitar 60–75 karakter (`max-w-prose`).
- Hanya bobot 400/600/700.
- Tidak ada ukuran font arbitrer; utilitas heading Skeleton (`h1`–`h6`) tidak dipakai karena membawa skala Cerberus.

## 6. Logo usage

- **Selalu memakai artwork master.** Jangan mengetik ulang wordmark, menggambar ulang symbol, membuat SVG interpretasi, mewarnai ulang, men-stretch, memutar, memberi efek (glow/bevel/shadow), mengubah negative space, atau meletakkan di atas latar ramai (§14 guidelines).
- **Ekspresi responsif (§05):** Expanded (symbol + wordmark + tagline) → Core (symbol + wordmark) → Compact (symbol). Threshold ditentukan oleh keterbacaan, bukan breakpoint arbitrer. Tagline dilepas sebelum keterbacaan terganggu.
- **Ukuran minimum (usulan §06, belum final):** Core+Tagline 90px tinggi (20mm cetak), Core 24px, Symbol 16px.
- **Clear space:** 1 node ≈ 0,29 × tinggi symbol di keempat sisi.
- **Varian:**
  - Color di latar terang (wordmark Deep Neutral).
  - White di latar gelap.
  - **Logo White di atas Royal Blue tidak dipakai**: node hijau hanya 1.74:1, dan izinnya masih keputusan terbuka di guidelines §19.
- **Product UI:** tanpa tagline, tanpa gradient, satu logo di header. Hindari over-branding.
- **Status wordmark: interim.** Wordmark FLIXARE disusun ulang dari glyph master (Sora SemiBold, tracking seragam ±39 unit). Validasi optik oleh desainer (pasangan F-L, L-I, I-X) masih terbuka (§19 guidelines). Saat artwork final terbit, cukup ganti file di `src/lib/assets/brand/` dengan nama yang sama.

Implementasi: `src/lib/components/ui/BrandLogo.svelte`

| Aspek | Ketentuan |
|---|---|
| Props | `expression`: `responsive` (default) \| `core` \| `compact` |
| `responsive` | Compact (logogram) di bawah `md` (48rem), Core mulai `md` — satu `<picture>` dengan art direction |
| Tinggi | 28px (`h-7`): di atas minimum Core 24px dan Symbol 16px |
| Anti-distorsi | `shrink-0` pada `<picture>` + `object-contain`; `width`/`height` intrinsik per `<source>` sesuai rasio master |
| Varian gelap | `<source media="(prefers-color-scheme: dark)">` → White (mengikuti color-scheme saat ini, §11) |
| Aksesibilitas | `alt="FLIXARE"` (nama brand sebagai teks alternatif, bukan pengganti visual wordmark) |
| Pemakai | `AppShell` (header semua area) |
| Clear space di header | Gap 12px ke label area, padding vertikal 12px ≥ 0,29 × 28px (≈ 8px) |

## 7. Logo asset mapping

| Aset master (`FLIXARE_Logo_Set_interim_PNG/`) | Ukuran | Di repository | Dipakai |
|---|---|---|---|
| FLIXARE_Primary_without_Tagline_Color | 3210×900 | `src/lib/assets/brand/flixare-core-color.png` | Header ≥ md, light |
| FLIXARE_Primary_without_Tagline_White | 3210×900 | `src/lib/assets/brand/flixare-core-white.png` | Header ≥ md, dark |
| FLIXARE_Logogram_Color | 1720×1800 | `src/lib/assets/brand/flixare-logogram-color.png` | Header < md, light |
| FLIXARE_Logogram_White | 1720×1800 | `src/lib/assets/brand/flixare-logogram-white.png` | Header < md, dark |
| FLIXARE_Logogram_Color | 1720×1800 | `static/favicon.png` | Favicon (symbol-only, §17) |
| FLIXARE_Primary_Logo (+Tagline) Color/White | 3226×900 | — | Belum dipakai (brand/marketing, ≥ 90px) |
| FLIXARE_Secondary (stacked) ± tagline Color/White | 2081×1698 / 2040×1512 | — | Belum dipakai |
| FLIXARE_Logotype Color/White | 2040×324 | — | Belum dipakai (wordmark-only: sekunder) |

Semua salinan **byte-identik** dengan Logo Set interim (diverifikasi SHA-256). Aset FILEXARE sebelumnya sudah dihapus dari repository. Logo di-import lewat Vite sehingga di-hash dan di-cache immutable. Favicon placeholder FE-01 (`favicon.svg`, sebuah tanda buatan) **dihapus** karena berupa logo tidak resmi.

**Belum tersedia dari produksi brand (§19 guidelines):** vector master (SVG/AI/PDF), set favicon/PWA teroptimasi (16–512 px, maskable), versi one-color. Favicon saat ini memakai PNG master 1720×1800 yang diskalakan browser. Ini sementara sampai set favicon resmi tersedia; tidak ada resize atau gambar ulang yang dibuat sendiri.

## 8. Progressive Path

Progressive Path (starting → progressing → connecting → expanding) adalah signature visual setelah logo. Intensitas yang dikunci: **Level 01 Subtle** untuk UI dan dokumen ("path tipis di tepi"), Level 02 Expressive untuk presentasi/sosial, Level 03 Hero untuk website hero/kampanye.

**Status: DEFERRED.** Belum ada aset master Progressive Path di paket artwork. Membuat path sendiri berarti improvisasi visual, yang dilarang §18. Saat aset tersedia, Level 01 hanya boleh dipakai di area non-tugas (mis. empty state, onboarding) dan tidak boleh bersaing dengan konten.

## 9. Product UI expression

- Solid color + neutral surface. Brand hadir lewat logo di header, Royal Blue pada aksi/fokus/progres navigasi, latar subtle Royal Blue pada nav aktif dan info, Sora, serta teks Deep Neutral.
- Tanpa gradient, tanpa komposisi 50/50 blue-green, tanpa ilustrasi atau Progressive Path di layar kerja.
- Layout family dari guidelines (Workspace, Learning, Focus) didefinisikan saat fase fitur. FE-04 menambahkan `WorkspaceShell` (family Workspace, §19); Learning dan Focus belum.
- Hero produk (FE-04, keputusan D4): **Deep Neutral solid** (`lms-hero`), tanpa gradient, tanpa glow, tanpa kurva, tanpa Progressive Path. FE-04R menambahkan watermark logogram White master yang samar (§21). Fokus di atas hero berwarna putih karena Royal Blue di atas Deep Neutral hanya 3.03:1.

## 10. Marketing vs product distinction

| Aspek | Product UI (kode ini) | Brand/Marketing (di luar lingkup) |
|---|---|---|
| Mode | Calm + Clear + Functional | Human + Progressive + Expressive |
| Logo | Core/Compact, tanpa tagline | Boleh lockup + tagline (≥ 90px) |
| Warna | Solid, neutral dominan, Royal Blue sebagai anchor | Blue → Green gradient terkontrol (blue dominan) |
| Progressive Path | Level 01 subtle (saat aset tersedia) | Level 02/03 |
| Ilustrasi | Product illustration fungsional (empty state, onboarding) | Hero/brand illustration |

Halaman publik (`(public)`) saat ini memakai shell product UI. Ekspresi marketing ditetapkan saat situs publik dirancang.

## 11. Dark mode status

**Pembaruan FE-05R (keputusan pemilik produk):** pengguna dapat memilih mode terang/gelap.

- `<html data-mode>` = `light` | `dark` | `system` (default). Variant `dark` kustom di `src/app.css`: `light`/`dark` memaksa mode, `system` mengikuti OS. Palet tidak berubah — hanya pemicunya.
- Preferensi disimpan di cookie non-sensitif `lms_color_mode` (`SameSite=Lax`, 1 tahun) lewat `applyColorMode()` (`src/lib/utils/color-mode.ts`); SSR mengisi `data-mode` sehingga tidak berkedip. Nilai di luar whitelist → `system`.
- Kontrol: `ColorModeToggle` (`src/lib/components/layout/`), pill matahari/bulan seperti referensi; saat ini hanya di halaman login. Pilihan berlaku di seluruh aplikasi pada host yang sama (cookie host-only).
- `BrandLogo` memilih varian White lewat variant `dark` (bukan media query), sehingga logo mengikuti pilihan pengguna.
- Yang **belum** diputuskan: redesign palet gelap (mis. palet navy prototipe). Netral gelap tetap primitif Skeleton.

Status awal (FE-03 s.d. FE-05): `DARK_MODE_POLICY = HUMAN_DECISION_REQUIRED`; guidelines tidak menetapkan kebijakan dark mode.

- Perilaku dipertahankan **hanya untuk mencegah regresi**: color-scheme mengikuti preferensi OS (bawaan Skeleton). Netral dark memakai primitif `surface-*` Skeleton (sama seperti FE-03).
- Diubah di FE-03R hanya agar identitas Cerberus tidak tampil:
  - interaktif dan fokus memakai Royal Blue;
  - logo memakai varian White;
  - teks muted dark diganti `surface-300` agar ≥ 4.5:1 di atas `surface-900`.
- Kontras dark dihitung dan diverifikasi Lighthouse (§13, §18), tetapi **belum dirancang** sebagai bagian identitas FLIXARE.

## 12. Iconography status

Spesifikasi guidelines §10:

- grid master 24×24;
- outline untuk default, filled untuk emphasis;
- stroke rounded dan konsisten (1,75px @24);
- warna: neutral untuk default, Royal Blue untuk interaktif, Growth Green untuk progres, semantic color untuk state.

**Status: ADOPTED (FE-04, keputusan D1).** Library tunggal: `@lucide/svelte` 1.49.0 (pin exact, ISC). Lucide memakai grid 24×24 outline rounded, sesuai spesifikasi.

- Selalu lewat komponen `Icon` (`strokeWidth` 1,75; `size` sm=16 / md=20). Dekoratif (`aria-hidden`) kecuali diberi `label`.
- Import per ikon (`@lucide/svelte/icons/<nama>`), bukan barrel, agar tree-shaking terjaga.
- Ikon yang dirujuk **data** (fixture kini, API kelak) memakai kunci string lewat registry `UI_ICONS` (`src/lib/components/ui/icon-registry.ts`), karena data `load` server harus dapat diserialisasi. Ikon navigasi diimpor langsung oleh route.
- Ikon tidak pernah menjadi satu-satunya pembawa makna; selalu ada teks atau label.
- Varian filled untuk emphasis belum dipakai.

## 13. Contrast governance

Rasio dihitung dengan konversi warna → luminans relatif WCAG 2.x. Metode divalidasi karena **mereproduksi persis tabel kontras PDF hal. 13** (14.04, 4.63, 4.85, 5.27, 2.79, 1.74). Ini perhitungan, bukan audit kepatuhan formal.

| Pasangan (light) | Rasio | Ambang |
|---|---|---|
| Deep Neutral / Soft Background | 14.04 | 4.5 |
| Deep Neutral / white (surface) | 14.69 | 4.5 |
| Muted (DN 70%) / Soft · / white | 5.95 · 6.23 | 4.5 |
| Putih / Royal Blue (tombol primer) | 4.85 | 4.5 |
| Putih / hover (RB 80% + DN) | 6.11 | 4.5 |
| Deep Neutral / subtle (RB 10%) | 12.92 | 4.5 |
| Royal Blue fokus / Soft · white · subtle | 4.63 · 4.85 · 4.26 | 3.0 |
| Batas input (DN 55%) / white · Soft | 3.88 · 3.71 | 3.0 |
| Danger `error-700` / Soft · white | 5.13 · 5.37 | 4.5 |
| Destruktif `error-contrast-800` / `error-800` · hover `error-900` | 4.63 · 5.72 | 4.5 |
| Deep Neutral / surface-muted (tombol secondary) | 12.40 | 4.5 |

| Pasangan (dark, regresi) | Rasio | Ambang |
|---|---|---|
| `surface-50` / `surface-950` | 18.27 | 4.5 |
| Muted `surface-300` / `surface-950` · `surface-900` | 7.58 · 6.45 | 4.5 |
| Royal Blue fokus / `surface-950` · `surface-900` | 3.88 · 3.30 | 3.0 |
| `surface-50` / subtle dark (RB 25%) | 12.04 | 4.5 |
| Royal Blue sebagai **teks** di dark | 3.88 | **gagal 4.5 — dilarang** |

Token FE-04 (keputusan D3/D4; dihitung dengan metode yang sama):

| Pasangan | Rasio | Ambang |
|---|---|---|
| `lms-progress-text` light (GG 55% + DN) / white · Soft · subtle | 5.86 · 5.60 · 5.15 | 4.5 |
| `lms-progress-text` dark (Growth Green) / `surface-900` · `surface-950` | 5.74 · 6.75 | 4.5 |
| `lms-warning-text` light (`warning-950`) / white · Soft · `scale-low` | 5.78 · 5.53 · 4.79 | 4.5 |
| `lms-warning-text` dark (`warning-300`) / `surface-900` | 11.07 | 4.5 |
| Deep Neutral / `scale-high` · `scale-mid` · `scale-low` (light) | 10.10 · 12.83 · 12.17 | 4.5 |
| `surface-50` / `scale-high` · `scale-mid` · `scale-low` (dark) | 7.31 · 11.92 · 7.29 | 4.5 |
| Putih / hero (Deep Neutral) | 14.69 | 4.5 |
| `on-hero-muted` / hero · `hero-raised` | 7.45 · 6.04 | 4.5 |
| Putih / `hero-raised` | 11.92 | 4.5 |
| Fokus Royal Blue / hero | 3.03 | 3.0 (tipis; karena itu fokus di hero = putih, 14.69) |
| Fill Growth Green / track `lms-progress-track` light · dark | **2.25** · 3.45 | 3.0 |

**Batasan yang diketahui:** fill Growth Green tidak dapat mencapai 3:1 di light mode terhadap track terang mana pun (maksimum vs putih 2.79). Ini konsekuensi warna brand yang LOCKED. Mitigasinya bersifat wajib: **setiap `ProgressBar`/`ProgressRing` selalu disertai nilai teks yang terlihat** (diverifikasi di semua layar FE-04) dan nilai di `aria-valuenow`/`aria-valuetext`, sehingga bar tidak menjadi satu-satunya pembawa informasi (WCAG 1.4.11).

**Cacat FE-03 yang diperbaiki:** filter hover `brightness(125%)` bawaan `btn` Skeleton menurunkan kontras:

- tombol primer: 4.16 (Cerberus) / 3.48 (Royal Blue);
- tombol destruktif: 3.23.

Hover sekarang memakai warna yang lebih gelap (`lms-interactive-hover`, `error-900`) dan menonaktifkan filter.

**Aturan:**

- Pemakaian warna baru wajib dihitung sebelum dipakai.
- Perubahan brand atau tema wajib menghitung ulang seluruh tabel ini.

## 14. Component usage

Lapisan komponen (`src/app.css`):

| Utilitas | Perilaku |
|---|---|
| `lms-container` | Lebar konten `max-w-7xl`, gutter `px-4`/`md:px-6`. **Hanya halaman publik/formulir** (login, register, plan, error); bukan dashboard (§21) |
| `lms-focus-ring` | Outline fokus 2px Royal Blue, offset 2px |
| `lms-input` | Kontrol form: surface + foreground FLIXARE, batas ≥ 3:1, merah saat `aria-invalid` |
| `lms-action-primary` | Royal Blue + putih; hover lebih gelap, tanpa filter |
| `lms-action-secondary` | Surface-muted + foreground |
| `lms-action-ghost` | Transparan; hover surface-muted |
| `lms-action-destructive` | `error-800`; hover `error-900` |
| `lms-nav-active` | Latar subtle + teks foreground |
| `lms-tone-info` | Latar subtle + teks foreground |
| `lms-text-label` / `-helper` / `-caption` / `-error` | Tipografi semantik di atas skala kanonik |
| `lms-card` (FE-04) | Surface + border 1px + `rounded-container` |
| `lms-hero` / `lms-hero-raised` (FE-04) | Hero Deep Neutral solid; panel terangkat di dalam hero; fokus putih |
| `lms-scale-high` / `-mid` / `-low` (FE-04) | Sel data 3 tingkat (heatmap); angka selalu tampil |

Komponen UI:

| Komponen | Tujuan | Varian / state | Catatan FLIXARE |
|---|---|---|---|
| `Button` | Aksi | `variant`: primary \| secondary \| outline (FE-05R) \| ghost \| destructive; `size`: sm \| md \| lg (48px); `width`: auto \| full; `disabled`, `loading` (`aria-busy` + Spinner) | Primer = Royal Blue kanonik; `type="button"` default; tanpa prop gaya |
| `Spinner` | Indikator memuat | `size`: sm \| md; `label` opsional (`role="status"`) | `motion-safe` |
| `Alert` | Pesan sebaris | `tone`: info \| success \| warning \| error | Info = subtle Royal Blue; success = semantic `success` (**bukan** Growth Green); `role="alert"` hanya error |
| `StatePanel` | Empty/loading/error/forbidden | `tone`: neutral \| warning \| error; `headingLevel` 1–3; `loading`; slot `actions` | Judul `text-lms-h4` |
| `TextField` | Field teks | `label`, `hint`, `error`, `required`, `disabled`, `type`; FE-05R: `size` md \| lg (46px), `icon`, `labelAside`, `trailing` | `lms-input`; ID SSR-safe; `aria-describedby`/`aria-invalid` |
| `BrandLogo` | Identitas | `expression`: responsive \| core \| compact | Artwork master (§6) |

Layout: `AppShell` (logo + label area opsional, header putih/dark surface, skip link, progress Royal Blue, nav responsif), `PageContainer` (H2 → H1 responsif), `NavigationLink` (aktif = subtle + semibold + `aria-current`). `LocaleSwitcher` dihapus di FE-04R (§21).

Konvensi varian dan nama tetap sama dengan FE-03:

- Varian berupa union string kecil.
- Tanpa prop `class`/`style`/warna/spasi.
- Boolean hanya untuk state.
- Komponen ditulis dalam `PascalCase`; token dan utilitas berawalan `lms-*`.

## 15. Forbidden patterns

| Pola | Alasan / alternatif |
|---|---|
| Mengubah HEX brand, membuat warna brand baru, atau hue baru | Brand LOCKED. Turunan hanya lewat `color-mix` antar warna brand |
| Menyebut shade turunan sebagai "warna brand" | Royal Blue kanonik tetap `#4169E1` |
| Growth Green sebagai success, sebagai teks di latar terang, atau berdampingan langsung dengan Royal Blue | §4 |
| Gradient blue → green atau komposisi 50/50 di product UI | Hanya untuk marketing |
| Mengetik "FLIXARE" sebagai pengganti logo, menggambar ulang, SVG interpretasi, recolor, stretch, rotate, efek, atau latar ramai | Pakai `BrandLogo` / artwork master |
| Logo White di atas Royal Blue | Keputusan terbuka (§19 guidelines) |
| Tagline di product UI atau di bawah 90px | Tagline dilepas sebelum tidak terbaca |
| Progressive Path atau ilustrasi buatan sendiri | Tunggu aset master |
| HEX/warna literal di komponen (`text-[#…]`, `bg-blue-500`, `style=`) | Token `lms-*` |
| Preset/utilitas `primary` Skeleton (`preset-*-primary-*`, `bg-primary-*`), utilitas `h1`–`h6` Skeleton | Membawa identitas/skala Cerberus |
| `system-ui` sebagai font utama, ukuran/bobot di luar skala kanonik | Sora + `text-lms-*`, bobot 400/600/700 |
| Filter brightness untuk hover aksi | Merusak kontras; pakai warna hover token |
| `outline-none` pada elemen interaktif tanpa pengganti | `lms-focus-ring` |
| Makna yang hanya disampaikan lewat warna | Teks, angka, atau atribut ARIA |
| SCSS/Sass, `tailwind.config`, library UI kedua, library ikon selain Lucide | Tailwind 4 CSS-first + Skeleton 5 + `@lucide/svelte` |
| Teks Royal Blue (`text-lms-interactive`) | Gagal di dark (3.28 di atas card). Pakai `text-lms-foreground` (+ underline untuk tautan) |
| Data demo di komponen atau di bundle produksi | Fixture `*.fixture.ts` dev-only (§19) |
| Logika bisnis/API/auth/tenant di komponen UI | Ditegakkan ESLint (FE-02) |

## 16. Theme status

| Item | Status |
|---|---|
| Identitas visual | **FLIXARE** (Brand Guidelines v1.0) |
| Cerberus | Primitif internal Skeleton (netral dark, semantic state). Bukan identitas |
| Warna, tipografi, logo | Terintegrasi dari sumber kanonik |
| Dark mode | `HUMAN_DECISION_REQUIRED` (§11) |
| Progressive Path | DEFERRED (§8) |
| Ikon | ADOPTED — `@lucide/svelte` (§12) |
| Pola product UI + shell Workspace | FE-04 (§19) |
| Vector master, favicon/PWA set, one-color, wordmark final (validasi optik) | Menunggu produksi brand |

## 17. Future extension rules

1. Komponen baru hanya dibuat bila ada pemakai nyata dan tidak terpenuhi utilitas Skeleton + token FLIXARE.
2. Komponen interaktif kompleks memakai `@skeletonlabs/skeleton-svelte` (pin kompatibel dengan Skeleton 5.0.1).
3. Token warna baru wajib berada di lapisan semantic/component, diturunkan dari brand, punya pemakai, dan ada perhitungan kontras di §13.
4. Visual progres memakai `lms-progress` (Growth Green) sebagai elemen non-teks, selalu disertai angka. Kontras batas ≥ 3:1 terhadap track dihitung saat komponen dibuat (Growth Green vs putih hanya 2.79).
5. Aset brand baru disalin byte-identik dari paket master dan dicatat di §7.
6. Perubahan brand mengikuti change control guidelines §18 (Level 1/2/3).

## 18. Validation record (FE-03R)

Dijalankan pada 3 Oktober 2026 (FE-03R; diulang setelah penggantian ke FLIXARE) terhadap build produksi (`node build`), di Chrome via DevTools MCP.

| Validasi | Hasil |
|---|---|
| Font | Sora termuat (variable 100–800); body `Sora`, 16/24, `rgb(23,37,84)` = Deep Neutral |
| Latar / header (light) | `rgb(248,250,252)` = Soft Background / `#ffffff` |
| H1 halaman (desktop) | 40/48 700 Deep Neutral |
| Logo desktop light | `flixare-core-color`, 99,9×28px; rasio 3,566 = master 3,567 |
| Logo mobile dark | `flixare-logogram-white`, 26,8×28px; rasio 0,955 = master 0,956 (setelah perbaikan distorsi `shrink-0`) |
| Fokus keyboard | Skip link → bahasa → navigasi; outline 2px `rgb(65,105,225)` = Royal Blue, offset 2px |
| Mode dark | Render, logo White, color-scheme dark |
| Lighthouse | Accessibility **100** dan Best Practices **100**: `tenant /app` (desktop, light), `platform /console` (mobile, light), `tenant /login` (mobile, light), `tenant /login` (snapshot, dark). Audit `color-contrast` lolos di keempatnya. SEO 91/80: hanya `meta-description` (di luar lingkup) |
| Tidak dilakukan | Uji screen reader nyata, Lighthouse Performance, uji hover secara visual (aturan diverifikasi di CSS hasil build dan lewat perhitungan) |

## 19. Product UI patterns (FE-04)

Referensi visual: prototipe `FLIXARE App.html` (React). Prototipe **hanya referensi**; tidak ada kode yang disalin, dan palet/gradient prototipe tidak dipakai (keputusan D4). Analisis lengkap: `FE-04-RECON.md`.

### 19.1 Komponen tambahan

| Komponen | Tujuan | Varian / catatan a11y |
|---|---|---|
| `Icon` | Pembungkus Lucide | `size` sm \| md; `label` opsional |
| `Badge` | Status ringkas | `tone`: neutral \| info \| success \| warning \| error |
| `Avatar` | Inisial | `tone` brand \| subtle; `size` sm \| md |
| `ProgressBar` | Progres linear | `role="progressbar"` + `aria-valuetext`; `tone` progress \| interactive \| warning; `marker` opsional |
| `ProgressRing` | Progres melingkar | SVG `role="img"` + `aria-label`; `size` sm \| lg |
| `Checkbox`, `Select` | Kontrol form | Pola `TextField` (label, hint, error, ID SSR-safe) |
| `ChoiceGroup` | Pilihan tunggal | `fieldset`/`legend` + radio native; `layout` stack \| grid \| inline (segmented) |
| `Card` | Kontainer bagian | `headingLevel` 2 \| 3; `tone` default \| hero; `padding` md \| flush; snippet `actions` |
| `HeroBanner` | Pembuka halaman (H1 + `<title>`) | `lms-hero`; grid 2 kolom hanya bila ada `aside` |
| `MetricCard` | KPI | `noteTone` muted \| progress \| warning; sparkline `aria-hidden` |
| `BarChart` | Grafik batang | Visual `aria-hidden` + tabel data `sr-only` |
| `SegmentedBar` | Komposisi | `tone` interactive \| neutral \| progress \| subtle \| warning; legend teks + angka |
| `Heatmap` | Matriks tingkat | `<table>` + `caption`; angka selalu tampil; `hideRowHeaders` (header tetap untuk pembaca layar) |
| `Timeline`, `Stepper` | Urutan | `<ol>`; `aria-current="step"` |
| `ListItem`, `DateBadge`, `QuickAction` | Daftar / tanggal / pintasan | `QuickAction` nonaktif wajib `disabledReason` |
| `Drawer` | Panel navigasi mobile | `<dialog>` native + `showModal()`: fokus terkurung, Esc menutup, fokus kembali ke pemicu |

### 19.2 Shell Workspace

`WorkspaceShell` (`src/lib/components/layout/`) dipakai konsol platform dan keempat area sekolah:

| Lebar | Navigasi |
|---|---|
| `< md` | Tombol menu → `Drawer` |
| `md`–`lg` | Rail ikon (label `sr-only`, tooltip `title`) |
| `≥ lg` | Sidebar penuh; bisa diciutkan ke rail (state lokal, tanpa storage) |

- Item navigasi tanpa `href` = halaman belum dibangun. Dirender sebagai teks nonaktif (bukan tautan ke 404) dengan keterangan "belum tersedia" (keputusan D6).
- Pencarian, notifikasi, dan keluar nonaktif dengan keterangan. Identitas tenant/pengguna hanya tampil bila data tersedia (kelak dari sesi, BLOCKED-02).
- `NavigationLink` diperluas secara backward-compatible: `icon`, `badge`, `labelVisibility`, `tooltip`.

### 19.3 Layar referensi

| Layar | Host | Route |
|---|---|---|
| Login | tenant, platform | `/login` |
| Pendaftaran / Berlangganan | public (root) | `/register`, `/register/plan` |
| Platform | platform | `/console` |
| Pemilih area sekolah | tenant | `/app` |
| Sekolah / Guru / Murid / Orang tua | tenant | `/app/admin`, `/app/teacher`, `/app/student`, `/app/guardian` |

### 19.4 Aturan pola

- **Aksi bisnis nonaktif** (keputusan D6): `Button disabled` + `aria-describedby` ke paragraf `sr-only` yang menjelaskan alasannya. Tidak ada handler palsu.
- **Fixture dev-only** (keputusan D2): data demo berada di `*.fixture.ts` yang ko-lokasi dengan route, dimuat lewat `dev ? await import(...) : null` di `+page.server.ts`/`+layout.server.ts`. Di produksi halaman menampilkan `StatePanel` "Data belum tersedia". Data demo terverifikasi tidak ada di `build/`.
- Keputusan bisnis (mis. nilai di bawah KKM, risiko churn) **ditentukan data**, bukan dibandingkan di UI.
- Grid item yang berisi konten lebar (tabel/heatmap) wajib `min-w-0` agar `overflow-x-auto` bekerja dan halaman tidak melebar.
- Tabel `sr-only` dibungkus elemen `sr-only`, bukan diberi kelas langsung (tabel tetap memakan lebar).

### 19.5 Belum diimplementasikan

Modal, Tooltip kustom (dipakai `title` native), dan Tabs: belum ada pemakai. Layout family Learning/Focus. Progressive Path. Kebijakan dark mode (§11).

## 20. Validation record (FE-04)

Dijalankan 3 Oktober 2026 pada dev server (fixture aktif), Chrome via DevTools MCP.

| Validasi | Hasil |
|---|---|
| Quality gate | `format`, `format:check`, `lint`, `check` (0 error / 0 warning), `build`, `git diff --check`, `install --frozen-lockfile`: lolos |
| Fixture di produksi | `grep` data demo di `build/`: tidak ditemukan. `node build` (`HOST_HEADER=host`): admin, teacher, student, guardian, console, register, plan = HTTP 200 + "Data belum tersedia", tanpa nama demo; login = HTTP 200 |
| Overflow horizontal | 375 / 820 / 1440 px di kedelapan layar + pemilih area: `scrollWidth = clientWidth` (setelah perbaikan `min-w-0` dan pembungkus tabel `sr-only`) |
| Drawer (375 px) | Terbuka via tombol (`aria-expanded` sinkron), fokus awal di tombol tutup, Esc menutup, fokus kembali ke tombol menu |
| Rail (820 px) | Sidebar ikon, logo compact White di dark |
| Logo | `flixare-core-color` rasio 3,566 = master 3,567, `object-fit: contain` |
| Lighthouse | Accessibility **100** dan Best Practices **100** di semua run akhir. Skenario: admin, guardian, login = desktop/mobile × light/dark (4); console, register, plan = mobile light + mobile dark + desktop dark (3); teacher, student = desktop dark + mobile light (2); `/app` = desktop dark + mobile dark (2). SEO 91: hanya `meta-description` (di luar lingkup) |
| Regresi yang diperbaiki saat validasi | `text-lms-interactive` (harga paket, tautan daftar) gagal kontras di dark (3.28) → `text-lms-foreground` |
| Tidak dilakukan | Uji screen reader nyata, Lighthouse Performance, uji hover visual (aturan hover tidak diubah FE-04), uji di Safari/Firefox |

## 21. FE-04R — Final visual conformance remediation

Dijalankan 3 Oktober 2026. Referensi: `FLIXARE App.html` (visual), Brand Guidelines (otoritas). **Bukan redesign:** tidak ada token, warna, font, gradient, glow, atau aset baru.

### 21.1 Watermark

| Lokasi | Implementasi | Referensi prototipe |
|---|---|---|
| Panel biru login (`≥ lg`) | `right -120px`, `bottom -110px`, lebar 520px, opacity 7% | identik |
| `HeroBanner` (semua dashboard) | `≥ md`: `right -60px`, `bottom -90px`, lebar 340px, opacity 6%. `< md`: lebar 224px, `right -40px`, `bottom -60px` agar tetap samar di hero sempit | identik di `≥ md`; prototipe tidak membedakan mobile |

- Aset: `flixare-logogram-white.png` (master yang sudah ada). Prototipe memakai logogram **Color**; implementasi memakai **White** karena guideline menetapkan "White on Deep" sebagai varian utama di atas Deep Neutral. Bentuk dan proporsi identik; tidak ada aset baru.
- Aksesibilitas: `alt=""` + `aria-hidden="true"`, `pointer-events: none`, `select-none`, `draggable="false"`, bukan elemen fokus. Layer: kontainer `relative isolate overflow-hidden`, watermark `absolute -z-10` (di atas latar hero, di bawah konten).
- Glow/gradient radial prototipe **tidak** diadopsi (keputusan FE-04R D04, konsisten dengan D4 dan aturan "no gradient in product UI").

### 21.2 Layout dashboard full viewport

- `WorkspaceShell` `<main>`: `w-full min-w-0 flex-1 px-4 py-6 md:px-6` — konten memenuhi sisa viewport setelah sidebar, gutter sama dengan header. Halaman dashboard (console, admin, teacher, student, guardian) tidak lagi memakai `lms-container` (`max-w-7xl mx-auto`).
- Sidebar menempel di `x=0`; logo expanded rata kiri atas (`x=20px`); rail dan drawer tidak berubah.
- `AppShell` header memakai gutter shell (logo rata kiri), tidak lagi container terpusat. `PageContainer` mendapat prop `width: 'contained' | 'full'` (default `contained`, backward-compatible); `/app` memakai `full` dan grid 4 kolom di `xl`.
- `max-width` tetap dipakai untuk keterbacaan di halaman publik/formulir: login (kolom form `max-w-md` dalam `lms-container`), register, plan, error.

### 21.3 Bahasa

- `LocaleSwitcher` dihapus dari `AppShell` dan `WorkspaceShell`; file komponen dihapus.
- Dihapus dari `src/lib/i18n/index.ts`: `LOCALE_COOKIE`, `LOCALE_COOKIE_MAX_AGE_SECONDS`, `isLocale`, `resolveLocale`, `persistLocalePreference`. `hooks.server.ts` tidak lagi membaca cookie `lms_locale`; `locals.locale = DEFAULT_LOCALE` (`id`). `$effect` yang menyetel `<html lang>` di klien dihapus (SSR sudah mengisinya; locale tidak berubah di klien).
- Kunci `common.locale.*` dihapus dari `id.json` dan `en.json` (169 kunci, paritas tetap).
- Dipertahankan: arsitektur i18n (`setI18n`, `useI18n`, `translate`, `LOCALES`, `en.json` sebagai resource dorman).

### 21.4 Validasi

| Validasi | Hasil |
|---|---|
| Overflow | 375 / 768 / 820 / 1024 / 1280 / 1440 / 1920: `scrollWidth = clientWidth` di login, `/app`, admin, teacher, student, guardian, console, `/`, register, plan |
| Sidebar | `x=0` di semua lebar ≥ 768; rail 80px di 768–1023 dan saat diciutkan; expanded 256px ≥ 1024 |
| Logo | Expanded `x=20`, rasio 3,566 (master 3,567); rail/compact rasio 0,955 (master 0,956); drawer `x=20` |
| Konten dashboard 1920 | main 256–1909, konten 280–1885 (sebelumnya terbatas 1280px dan terpusat) |
| Drawer 375 | Buka via keyboard, fokus ke tombol tutup, Esc menutup, fokus kembali ke tombol menu |
| Bahasa | 0 `<select>` bahasa di semua layar; `grep` kode bahasa/cookie: kosong; build produksi dengan cookie `lms_locale=en` tetap `<html lang="id">`, tanpa `Set-Cookie` |
| Lighthouse | Accessibility 100 dan Best Practices 100: guardian, login, admin, `/app`, console, register (desktop light); login, teacher (desktop dark); teacher, student (mobile dark); student, console (mobile light). SEO 91 (`meta-description`, di luar lingkup) |
| Quality gate | `install --frozen-lockfile`, `format`, `format:check`, `lint`, `check` (0/0), `build`, `git diff --check`: lolos |

### 21.5 Perbedaan dengan prototipe yang disengaja

- Login: implementasi mempertahankan header `AppShell` + kolom form dalam container; prototipe memakai split layar penuh tanpa header. Tidak diubah (FE-04R bukan redesign; max-width form diizinkan).
- Dashboard 1920: prototipe sendiri berhenti di ±1384px konten; implementasi memenuhi viewport sesuai keputusan FE-04R D05.
- Watermark White, bukan Color (§21.1); tanpa glow radial.

## 22. FE-05 — Watermark refinement

Watermark hero dashboard menjadi tekstur brand, posisinya paling bawah dalam hierarki visual. Spesifikasi lengkap ada di [fe-05-application-entry-routing.md §9](fe-05-application-entry-routing.md); ringkasannya sebagai berikut.

| Lebar | FE-04R | FE-05 |
|---|---|---|
| < 640 | 224px, 6% | disembunyikan |
| 640–767 | 224px, 6% | 112px, 4% |
| 768–1023 | 340px, 6% | 144px, 4% |
| ≥ 1024 | 340px, 6% | 160px, 4% |

- Validasi pada 375/640/768/1024/1280/1440/1920 untuk admin, teacher, student, dan guardian. Hasilnya:
  - teks H1 dan CTA tidak bersinggungan dengan area watermark yang terlihat, kecuali yang berada di dalam panel `lms-hero-raised` (opak);
  - tidak ada overflow;
  - Lighthouse Accessibility 100.
- Batasan: teks deskripsi guardian pada 640–1024 melintasi pojok watermark 4%. Kontras tetap lolos.
- Watermark panel login (§21.1) tidak diubah.

## 23. FE-05R — Kesesuaian dashboard dengan referensi

Keputusan pemilik produk (4 Oktober 2026): tampilan dashboard, gradient hero, dan watermark **mengikuti `FLIXARE App.html`**. Keputusan ini menggantikan FE-04R D04 (tanpa gradient, khusus hero/panel login) dan refinement watermark FE-05 (§22).

### 23.1 Aturan default (wajib di setiap layar)

1. **Kontrol mode terang/gelap selalu tersedia.** `ColorModeToggle` dipasang di setiap shell:
   - `WorkspaceShell`, untuk semua dashboard;
   - `AppShell`, untuk register, plan, pilih konteks, dan akses ditolak;
   - halaman login.

   Layar atau shell baru wajib memasangnya. Preferensi dibaca dari data root layout (`page.data.colorMode`), jadi tidak perlu meneruskan prop.
2. Varian gelap hanya lewat variant `dark` (`<html data-mode>`), tidak lewat media query langsung.

### 23.2 Hero & kartu

| Elemen | Implementasi |
|---|---|
| `lms-hero` | Deep Neutral + gradient radial Royal Blue 55% (kanan atas) + Growth Green 14% (kiri bawah); radius 24px |
| `lms-hero-panel` | Gradient panel login (RB 55% / GG 16%, geometri referensi layar 01); radius 28px |
| `lms-hero-raised` | Kartu kaca: putih 7%, garis putih 14%, `backdrop-filter: blur(12px)`, radius 18px |
| `lms-card` | Radius 18px + bayangan `--shadow-lms-card` (tanpa bayangan di dark) |
| Token baru | `--color-lms-on-hero-progress` (hijau muda ≈ `#7FCEA7` di atas hero), `--color-lms-interactive-muted` (≈ `--tint3`), `--color-lms-on-hero-muted` dinaikkan ke putih 82% (≈ `#D6DCEE`) |

### 23.3 Watermark (persis referensi)

| Layar | Ukuran | Opacity | Posisi |
|---|---|---|---|
| Panel login | 520px | 7% | right −120, bottom −110 |
| Hero dashboard (platform, sekolah, murid, orang tua) | 340px | 6% | right −60, bottom −90 |
| Hero guru (`watermark="top"`) | 300px | 6% | left 38%, top −60 |

Aset: `flixare-logogram-color.png` (master), sama dengan referensi. Ukuran sama di semua lebar; watermark terpotong oleh hero. Tetap dekoratif: `aria-hidden`, `pointer-events: none`.

### 23.4 Komponen

| Komponen | Perubahan |
|---|---|
| `HeroBanner` | `actionsPlacement` (`below`/`end`), slot isi tambahan (KPI kaca platform), `watermark` (`corner`/`top`) |
| `Button` | Varian `on-hero` (putih + Deep Neutral) dan `on-hero-outline` |
| `Avatar` | Tone `deep`, `shape` (`circle`/`rounded`) |
| `BarChart` | `emphasis` (`last`/`muted-last`/`none`), `gridlines`, `height` |
| `DonutChart` (baru) | Komposisi conic + nilai tengah + legenda persegi |
| `SegmentedBar` | Bar 12px bersela 3px, swatch persegi, tone `muted` |
| `MetricCard` | Ikon dalam kotak 30px, sparkline biru redup, catatan 12px |
| `Card` | Judul 16px semibold, padding 22px, tinggi meregang di baris grid |
| `ListItem` | Garis atas setiap baris, judul 14px, meta 12px |
| `QuickAction` | Tile berlatar halaman, border, radius 14px |
| `UnavailableLink` (baru) | Teks bergaya tautan untuk tujuan yang belum dibangun ("Tambah kursi", "Semua kelas", "Kalender", "Detail nilai") |
| `WorkspaceShell` | Header & area logo 68px, toggle tema, avatar Deep Neutral, badge di item nav nonaktif |

### 23.5 Perbedaan yang disengaja

- **Aksi bisnis tetap nonaktif** (FE-04 D6, BLOCKED-01/02). Akibatnya tombol tampak pudar (opacity 50%), sedangkan di referensi tampil penuh. Gaya `disabled` Skeleton tidak ditimpa, supaya tombol yang tidak berfungsi tidak terlihat seperti dapat dipakai.
- **Dashboard tetap memenuhi viewport** (FE-04R D05). Referensi berhenti di 1440px.
- **Isi tabel/daftar kadang lebih pendek dari referensi** (mis. peta capaian guru 5 murid vs 7). Ini data fixture, bukan tata letak.


## 24. FE-06 — Pola auth v3 (`FLIXARE App v3.html`)

| Elemen | Aturan |
|---|---|
| `--color-lms-link` / `text-lms-link` | Teks tautan turunan `color-mix` Royal Blue + Deep Neutral (terang) / Royal Blue + putih (gelap); lolos kontras 4.5:1 di kedua mode. Dipakai untuk tautan teks, bukan tombol |
| `lms-hero-screen` | Latar layar penuh bergradient untuk layar transisi (`/logged-out`, hitung mundur tryout); teks memakai token `lms-on-hero*` |
| `@keyframes lms-grow` | Garis progres tab pratinjau login (6 detik); mati saat `prefers-reduced-motion` |
| `ConfirmDialog` (baru) | `<dialog>` native untuk konfirmasi destruktif: ikon tonal error, judul, pesan, kartu orang, daftar detail, slot `options`, tombol Batal + aksi destruktif (`lms-action-destructive`, autofocus), petunjuk tombol. Konfirmasi = form POST ke `action` |
| `TextField` | Prop baru `highlighted` (border interaktif saat akun dikenali), `onkeydown`, `onkeyup` |

Aksen warna per peran pada v3 (teal/oranye/ungu/hijau) **tidak diterapkan**: semua peran memakai Royal Blue (keputusan pemilik produk; tidak ada warna brand baru).

## 25. FE-07 — Dashboard platform, sekolah, guru, murid, dan orang tua (`FLIXARE App v3.html` layar 04–08)

Kelima dashboard memakai pola yang sama:

| Aspek | Aturan |
|---|---|
| Data | Halaman menerima data mentah bertipe (`PlatformDashboardData`, `SchoolDashboardData`, `TeacherDashboardData`, `StudentDashboardData`, `GuardianDashboardData`). Angka turunan dihitung di `*-dashboard.ts` di folder route, bukan ditulis di data |
| Sumber | `load…FromApi()` (kosong sampai kontrak BLOCKED-01) → cadangan `*.fixture.ts` yang **persis referensi**, **hanya dev**. Produksi tanpa data → `StatePanel` |
| Ambang | Ambang bisnis berasal dari data: SLA pengajuan, peringatan cluster, pita kehadiran (95/90), ambang remedial (60), KKTP murid (75), tingkatan mapel (80/65), warna nilai (85/70), predikat nilai orang tua (85/75) |
| Jam | `createDashboardClock()` (`$lib/utils/dashboard-clock.svelte.ts`): jam WIB berdetak; data contoh mulai 07.35 seperti referensi. Sapaan pagi/siang/sore/malam dari jam (`dashboard.greeting.*`) |
| Aksi | Simulasi lokal hanya dev, dengan toast "(simulasi dev, tidak disimpan)". Di produksi tombol nonaktif dengan alasan (D6). Pilihan tampilan (periode, bulan, kelas, tab) tetap aktif di semua environment |

Turunan per layar:
- **Platform:** ringkasan & kartu "Pengajuan" dari antrian, umur/SLA (≥ 2/3 SLA = peringatan), segmen cluster, log provisioning, tinggi batang & tren pendapatan (bulan tutup buku terakhir vs sebelumnya), porsi penagihan dari nominal.
- **Sekolah:** jumlah kelas & yang sudah presensi, pita kehadiran, hadir/total, menit keterlambatan presensi, hari trial dari tanggal, tahap rapor yang dicapai mayoritas kelas, segmen kursi, persentase murid aktif, sisa tindak lanjut.
- **Guru:** lihat bagian sebelumnya (agenda, tumpukan koreksi, buku nilai).
- **Murid:**
  - kalimat sapaan dan jumlah ujian hari ini (pagi/siang/sore dari jam ujian);
  - hitung mundur ujian;
  - XP dan progres level (berubah saat tugas dicentang atau remedial dimulai);
  - label tenggat ("besok", "2 hari lagi", "Jumat, 9 Okt", "12 Okt") dan tanda mendesak;
  - tingkatan Emas/Perak/Perunggu;
  - warna stiker nilai;
  - kalender kehadiran Sen–Jum per bulan (hari setelah hari ini = belum berlangsung), persentase, dan jumlah per status.
  - Kartu murid memakai radius 22px dan line-height normal seperti v3. Kuning XP/stiker memakai tema `warning`, salmon memakai `error-100`, dan ungu aksen murid diganti Royal Blue.
- **Orang tua:**
  - pemilih anak di hero (ringkasan, linimasa "Hari ini", banner tindak lanjut, buku penghubung, nilai, kehadiran, dan agenda ikut berganti);
  - sapaan dari jam (data contoh 16.00 agar "Selamat sore" sama dengan referensi);
  - predikat Sangat baik / Baik / Perlu latihan;
  - hari sekolah Sen–Jum dalam bulan, ringkasan "21/22 hari", dan catatan "Izin 1 hari pada Rabu, 16 September." disusun dari data ketidakhadiran;
  - label agenda "Sel 6" (bulan berjalan) atau "16 Nov" (bulan lain);
  - pengumuman sekolah tampil setelah agenda anak.
  - Simulasi dev: "Sudah saya ingatkan"/"Batalkan" dan balasan buku penghubung. Avatar anak hijau diganti Royal Blue; banner peringatan memakai `warning-50` (gelap: `warning-500/15`).

Komponen/utilitas baru: ukuran `Icon` `lg` (24px), `Toast` (dengan aksi opsional, mis. "Urungkan"), varian `Button` `on-hero-subtle`, `HeroBanner` (`eyebrowTrail`, `eyebrowStatus`, deskripsi 15/23px, aksi `end` sebaris judul di ≥ xl), token `--color-lms-on-hero-warning`, utilitas `lms-ruled-paper`, `$lib/utils/clock.ts`.

Perbedaan yang disengaja:
- Aksen per peran v3 (teal sekolah, oranye guru) diganti Royal Blue (keputusan FE-06).
- Warna di luar brand (amber/merah status) memakai token tema `warning`/`error`.
- Tautan ke halaman yang belum ada tampil sebagai `UnavailableLink`.
- Teks tidak memakai opacity agar kontras ≥ 4.5:1.
- Kartu memakai radius 12px seperti v3.

## 26. Menu & navigasi (`FLIXARE App v3.html` layar 04c · MenuMaster)

- Route `(platform)/settings/navigation`: tab 5 peran, pohon grup → menu (urut naik/turun, sembunyikan, pindah grup), editor (nama ≤ 28, status, grup induk, buka di, rute, angka badge, 33 ikon, perilaku grup), pratinjau sidebar, bar simpan sticky (Susunan bawaan / Batalkan / Simpan sidebar), konfirmasi hapus & reset lewat `ConfirmDialog` mode `onconfirm`.
- Data: backend (`/api/v1/platform/navigation/roles/{role}`) lewat generated client Orval; dev tanpa backend → susunan bawaan + simpan disimulasikan lokal (banner peringatan). Produksi tanpa backend → status gagal.
- Sidebar platform (`WorkspaceShell`) kini dibaca dari susunan peran platform (`WorkspaceNavGroup`: judul kecil 10px uppercase, grup tertutup dengan chevron, tautan luar/tab baru). Cadangan: susunan bawaan. Rute yang belum dibangun tetap tampil nonaktif.
- Warna aksen per peran dari referensi (`#4169E1`, `#0B7F82`, `#A8620A`, `#6D4AE0`, `#2A8A5D`) hanya untuk penanda tab, seleksi, dan pratinjau.
- Deviasi diketahui: font mono memakai fallback sistem (IBM Plex Mono belum ada di aset); sidebar shell referensi berbentuk daftar datar, sedangkan aplikasi memakai susunan bergrup sesuai keputusan pemilik (5 Okt 2026).

## 27. Master data (`FLIXARE App v3.html` layar 04d · DataMaster)

- Route `(platform)/settings/master-data`: panel daftar master (cari, seksi mono, ikon terpilih biru), tabel master (Ekspor CSV, Tambah, cari nama/kode, filter Semua/Aktif/Nonaktif/Arsip + jumlah, baris grid nama·kode/ringkasan/status), panel kanan 540px (`<dialog>` native) dengan isian dua kolom, status, hapus (redup bila masih dipakai), konfirmasi buang perubahan & hapus, toast.
- Cakupan (revisi keputusan pemilik 5 Okt 2026): **11 master persis referensi**, 3 seksi — PLATFORM & ORGANISASI (Institusi = `tenants`, Jenis institusi, Jenjang pendidikan), AKADEMIK & REFERENSI (Tahun akademik & Tingkat kelas = acuan platform `academic_year_g`/`grade_level_g`, Kurikulum, Mata pelajaran), IDENTITAS & SISTEM (Pengguna = `users` + keanggotaan utama, Peran `role_g`, Permission `permissions`, Template notifikasi `notification_template_g`).
- Tipe isian referensi: text, code, key (`modul.aksi`, kunci permission terisi otomatis dari modul+aksi sampai diubah manual), email, tel, number, date, textarea, select (master lain/pilihan tetap), seg, toggle (periode berjalan), chips (kanal). Template notifikasi: tombol sisip variabel + pratinjau contoh data. Badge baris: "Berjalan" (tahun akademik), "Belum diprovisi" (institusi PENDING).
- Aturan khusus: institusi baru = PENDING tanpa provisioning (hanya Nonaktif/hapus; Aktif setelah database diprovisi); periode berjalan tunggal; akun sendiri tidak bisa dinonaktifkan/dihapus; tenant platform `lms_core` sah sebagai tenant pengguna.
- Kode terkunci setelah dibuat (PK + FK). Kode jenis institusi tetap huruf kecil (`school/personal/event`).
- Data: backend `/api/v1/platform/master-data/{master}` lewat generated client; dev tanpa backend → data seeder + simpan disimulasikan lokal.

## 28. Palet light & dark sesuai referensi (`FLIXARE App v3.html` `[data-mode]`)

- Keputusan pemilik 5 Okt 2026 ("token global"): token semantik `app.css` memakai nilai palet referensi untuk **kedua mode**; dark = biru tua (navy), bukan neutral Skeleton. Ini mencabut catatan §12 bahwa dark mode belum dirancang.
- Pemetaan (light / dark): background `--bg` #F8FAFC / #0A1029 · surface `--card` #FFFFFF / #111A3A · surface-muted `--card2` #F1F4F9 / #18234A · border `--line` #E2E8F0 / #212D58 · border-strong `--line2` #CBD5E1 / #2E3B6B · foreground `--ink` #172554 / #EEF1F8 · muted `--muted` #475569 / #AEB9DC · interactive-subtle `--tint` #EEF2FD / #1A2860 (+ teks `--tint-ink` #2A45A0 / #C4D2FA) · link #3355C4 / #9DB3F3 · hover #3355C4 / #6A88E9 · danger/warning/success teks + latar (`--err-*`, `--warn-*`, `--green-*`) · hero dark #16235C · root bg Skeleton dark #0A1029.
- `preset-tonal-success|warning|error` Skeleton diganti utilitas `lms-tone-success|warning|danger` (nada referensi); `lms-tone-info` memakai `--tint-ink`. Tombol sekunder/hapus di Menu & navigasi, Master data, dan ConfirmDialog memakai `border-lms-border-strong` (= `--line2`, seperti tombol "Hapus menu" referensi). `lms-action-destructive` = #B42323 + putih (6.55:1) di kedua mode.
- Deviasi sadar: border **kontrol form** (`lms-input-border`) tetap ≥ 3:1 (WCAG 1.4.11) — light tetap, dark #5A6AA6 (3.28:1 di atas #111A3A) — karena `--line2` referensi hanya ±1.5:1.
- Kontras teks dihitung (WCAG relatif luminans): semua pasangan teks ≥ 4.5:1 di kedua mode (contoh dark: muted 8.74, link 8.26, danger 8.06, warning/latar 9.19, success/latar 7.47; light: success/latar 4.66). Belum diverifikasi ulang dengan Lighthouse/axe.
- Sisa primitif Skeleton di luar cakupan form (dekoratif dashboard murid/orang tua: `bg-error-100`, `bg-warning-*`) belum dipetakan.

## 29. Master Paket (`FLIXARE App v3.html` layar 04b · PlanMaster)

- Route `(platform)/settings/plans` (izin `platform.plan.manage`); tombol "Kelola paket" di dashboard platform dan menu "Paket & fitur" mengarah ke sini.
- Tata letak persis referensi: daftar paket kiri (cari, tab Semua/Sekolah/Guru/Sesi, status Draf/Aktif/Arsip), kartu Identitas, Harga (model per murid/tetap; sesi ujian: diskon bertingkat + top-up), Batas pemakaian atau Aturan sesi, Trial gratis, Fitur (12 fitur, 5 grup), Pratinjau kartu pendaftaran, bar simpan menempel (Simpan / Publikasikan → konfirmasi `tone="primary"`, "Terapkan perubahan" bila sudah Aktif).
- Tambahan atas keputusan pemilik (tidak ada di referensi): ikon hapus di bar bawah, hanya untuk paket tanpa langganan (selain itu toast "Arsipkan saja").
- `ConfirmDialog` mendapat prop `tone` (`danger` bawaan, `primary` untuk publikasi) sesuai referensi.

