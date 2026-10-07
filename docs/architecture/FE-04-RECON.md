# FE-04-RECON — Product UI Pattern & Reference Screen Conformance

| Atribut | Nilai |
|---|---|
| Fase | FE-04 — Phase A (Reconnaissance) |
| Tanggal | 3 Oktober 2026 |
| Mode | Read-only. Tidak ada perubahan source pada fase ini |
| Referensi | `FLIXARE App.html` (prototipe high-fidelity, **bukan** source code), Brand Guidelines FLIXARE v1.0, `design-system.md`, `frontend-architecture-boundaries.md` |
| Status | **RESOLVED** — D1–D4 diputuskan pemilik (a/a/token minimal/a); D5–D6 diadopsi sesuai rekomendasi. Implementasi & validasi: design-system.md §19–§20 |

Cara analisis referensi:

- Bundel HTML (React 18 dari unpkg, ikon font "lucide", Sora) di-decode untuk membaca template, logika, dan data.
- Kedelapan screen dirender di Chrome (1440×900, light) untuk inspeksi visual.
- Tidak ada kode prototipe yang disalin.

---

## 1. Current state (fakta repository)

| Area | Kondisi |
|---|---|
| Stack | SvelteKit 2.70.3, Svelte 5.57.1 (runes), Tailwind 4.3.3, Skeleton 5.0.1, adapter-node 5.5.7, TS 6.0.3. 17 devDependencies, 0 dependency runtime |
| Brand | FLIXARE (logo interim, favicon, Sora self-hosted), token brand → semantic → component di `src/app.css` (LOCKED) |
| UI primitives | `Button`, `Spinner`, `Alert`, `StatePanel`, `TextField`, `BrandLogo` |
| Layout | `AppShell` (header + nav horizontal, toggle mobile), `PageContainer`, `NavigationLink`, `LocaleSwitcher` |
| Route | `(public)` `/` dan `/login`; `(platform)` `/console`; `(school)` `/app`; `(join)` layout saja |
| Shell | Satu `AppShell` generik dengan navigasi **horizontal** di header (bukan sidebar) |
| Ikon | **Tidak ada** library ikon (DEFERRED di design-system.md §12) |
| Data | Tidak ada API (BLOCKED-01), auth (BLOCKED-02), maupun katalog permission (BLOCKED-04) |
| Kualitas | Lighthouse Accessibility 100 / Best Practices 100; lint, check, format, build lolos |

## 2. Analisis 8 reference screen

| # | Screen | Layout | Pola utama |
|---|---|---|---|
| 1 | Login | Split: form kiri, panel ekspresif kanan (gradient Deep Neutral → Royal Blue, kurva dekoratif, tagline, kartu contoh) | Google SSO, email + password (show/hide), "Ingat saya", CTA, link kode sesi ujian (peserta tamu), link daftar, toggle light/dark |
| 2 | Pendaftaran | Header publik + stepper 5 langkah + 2 kolom | Pilihan jenis lembaga (kartu radio: Sekolah, Guru pribadi, Penyelenggara sesi ujian, dengan harga), form 2 kolom (NPSN, jenjang, email terverifikasi, WhatsApp), segmented zona waktu (WIB/WITA/WIT), checkbox trial |
| 3 | Berlangganan | Breadcrumb langkah di header, 2 kolom + panel ringkasan Deep Neutral | Kartu paket radio (Basic/Standard/Premium dengan harga), slider kursi, kartu metode pembayaran, ringkasan perhitungan (harga × kursi × 12), info trial |
| 4 | Platform | Sidebar + topbar (search, notifikasi, avatar) | Hero Deep Neutral bergradien dengan 4 KPI, bar chart pendapatan, donut komposisi, daftar pengajuan (Tolak/Setujui), stacked bar invoice, progress cluster, daftar provisioning, daftar risiko churn |
| 5 | Sekolah | Sidebar + topbar | Hero + panel trial (5 hari kerja), 4 KPI dengan sparkline, ring kursi + progress keaktifan, bar chart harian, **heatmap presensi** per kelas, stepper rapor, daftar "Perlu perhatian", grid aksi cepat |
| 6 | Guru | Sidebar + topbar | Hero + kartu "Berikutnya" (Buka sesi), 4 KPI, timeline jadwal, ring progres per kelas, bar chart 4 minggu, **heatmap capaian TP**, daftar "Perlu dinilai" |
| 7 | Murid | Sidebar + topbar | Hero "Halo, Dimas" + ujian berikutnya (Mulai ujian), kartu perjalanan semester (progress), tugas mendatang (tanggal + status), progress per mapel, nilai terbaru |
| 8 | Orang tua | Sidebar + topbar | Hero + pemilih anak (tab) + linimasa hari ini, 4 KPI, bar nilai per mapel dengan garis KKTP, **kalender presensi**, tugas mendatang, catatan wali kelas, rapor & pengumuman |

Navigasi per role (dari `NAV` prototipe) sama persis dengan daftar di prompt FE-04. Prototipe memberi badge angka pada beberapa item (Pengajuan 9, Tugas 18/3, Pesan 1).

**Responsif prototipe:**

| Lebar | Navigasi |
|---|---|
| < 768px | Drawer |
| < 1100px | Rail (ikon saja) |
| ≥ 1100px | Sidebar penuh, dapat diciutkan dengan tombol `panel-left` |

## 3. Reusable components (sudah ada)

| Komponen | Dipakai ulang untuk |
|---|---|
| `Button` (primary/secondary/ghost/destructive, loading) | Semua CTA dan aksi baris |
| `TextField` (label, hint, error, required) | Login, Pendaftaran |
| `Alert` (info/success/warning/error) | Banner trial/overdue, info rapor, catatan |
| `StatePanel` | Empty/error/loading/forbidden |
| `Spinner` | Loading |
| `BrandLogo` | Header semua shell, panel login |
| `NavigationLink` | Item navigasi (perlu varian sidebar/rail) |
| `PageContainer` | Judul halaman (tidak cocok untuk dashboard ber-hero; perlu evaluasi) |
| `LocaleSwitcher` | Topbar |

## 4. Missing components / patterns

| Kategori | Komponen | Catatan |
|---|---|---|
| Primitive | `Select`, `Checkbox`, `RadioCard` (kartu pilihan), `SegmentedControl`, `Badge`, `Avatar`, `ProgressBar`, `Card`, `Divider`, `Tabs`, `Drawer`, `Modal`, `Tooltip`, `Slider` | Sebagian bisa dari utilitas Skeleton (`badge`, `card`, `select`, `checkbox`, `progress`); Drawer/Modal/Tooltip/Tabs interaktif idealnya `@skeletonlabs/skeleton-svelte` (dependency baru) atau buatan sendiri |
| Product | `MetricCard` (+ sparkline), `ProgressCard`/`ProgressRing`, `ActivityList`/`Timeline`, `TaskListItem` (tanggal + status), `AttentionItem`, `QuickAction`, `GradeBar` (dengan garis KKTP), `AttendanceCalendar`, `Heatmap`, `BarChart`, `DonutChart`, `Stepper`, `PlanCard`, `SummaryPanel`, `HeroBanner` | Visualisasi data dapat dibuat dengan CSS/SVG tanpa dependency, tetapi butuh token data-viz (§6 D3) dan alternatif teks/tabel untuk aksesibilitas |
| Shell | Sidebar (expanded/rail/drawer), Topbar (search, notifikasi, avatar/user menu, tenant card, keluar), Public header dengan stepper | `AppShell` saat ini berupa header horizontal, sehingga perlu varian shell aplikasi berbasis sidebar |

## 5. Architecture risks

| # | Risiko | Dampak |
|---|---|---|
| R1 | Prototipe memakai **61 ikon Lucide** (nav, KPI, daftar, aksi). Rail tablet tidak mungkin tanpa ikon | Konflik "tanpa library ikon baru" (D1) |
| R2 | Prototipe mendefinisikan **palet sendiri** (±20 HEX turunan: tint/ink/warn/err, oranye `#E8890B`, palet dark berbasis navy `#0A1029`). Sebagian peran visual tidak tercakup token FE-03R | Konflik "jangan membuat token/warna baru" (D3) |
| R3 | Panel login dan hero dashboard memakai **gradient** dan **kurva dekoratif** menyerupai Progressive Path | Konflik guideline (gradient = marketing; Progressive Path DEFERRED) (D4) |
| R4 | Screen berisi data demo (nama, angka, harga Rp5.000/6.000/7.500, perhitungan tagihan) dan aksi bisnis (Setujui/Tolak, Bayar & aktifkan, Buka sesi, Mulai ujian) | Risiko data palsu tampil di production dan UI mati (D2, D6) |
| R5 | Role sekolah (admin/guru/murid/orang tua) ditentukan oleh sesi, yang belum ada (BLOCKED-02). Pohon SAD: `(school)/app/admin`, `teacher`, `student`, `guardian` | Perlu struktur route per role tanpa auth (D2) |
| R6 | `(school)/+layout.svelte` sudah membungkus semua `/app/*` dengan `AppShell`. Shell per role butuh layout bersarang tanpa shell ganda | Perubahan layout route (sedang, terlokalisasi) |
| R7 | Breakpoint rail prototipe 1100px tidak ada di skala Tailwind | Usulan: memakai `lg` (1024px) yang sudah ada |
| R8 | Dark mode prototipe berupa toggle manual + palet navy; implementasi kini mengikuti OS + netral Skeleton | `DARK_MODE_POLICY` tetap HUMAN_DECISION_REQUIRED; FE-04 tidak mengubah (D5) |
| R9 | Banyak elemen interaktif kompleks (drawer, tabs pemilih anak, slider, tooltip) | Tanpa skeleton-svelte, perlu implementasi aksesibel sendiri (fokus, Escape, trap) |

## 6. Decisions required (STOP)

| ID | Keputusan | Opsi | Rekomendasi |
|---|---|---|---|
| D1 | Ikon | (a) Izinkan `@lucide/svelte` (ikon yang sama dengan referensi; outline, grid 24, stroke rounded, dapat diset 1,75 sesuai §10 guideline; tree-shakeable, ISC) · (b) Tanpa ikon: navigasi teks, tanpa rail (tablet memakai sidebar penuh/drawer) · (c) Tunggu set ikon brand | (a) |
| D2 | Data & route 8 screen | (a) Route production sesuai SAD (`/login`, `/register`, `/register/plan`, `/console`, `/app/admin`, `/app/teacher`, `/app/student`, `/app/guardian`) dengan **fixture hanya di mode dev**; build produksi menampilkan empty state · (b) Route preview khusus dev (`/_reference/...`) · (c) Fixture selalu tampil dengan label "Data contoh" | (a) |
| D3 | Token tambahan | Tambah token minimal yang diturunkan dari brand/semantic Skeleton: teks progres (Growth Green + Deep Neutral, ≥ 4.5:1), track progres, skala data-viz 3 tingkat (tuntas/cukup/perlu perhatian), dengan kontras dihitung · atau visualisasi hanya teks/angka | Tambah token minimal |
| D4 | Hero & panel login | (a) Solid Deep Neutral tanpa gradient/kurva · (b) Ikuti referensi (gradient + kurva) · (c) Tanpa hero | (a) |
| D5 | Dark mode | Tetap mengikuti OS (tanpa toggle, tanpa palet navy) sesuai larangan redesign | Tetap; dicatat |
| D6 | Aksi bisnis (Setujui/Tolak, Bayar, Mulai ujian, Masuk, Daftar) | Tombol nonaktif + keterangan "tersedia setelah fitur …" · atau tombol aktif tanpa efek | Nonaktif + keterangan |

### 6.0 Pembaruan FE-04R

Remediasi visual pasca-FE-04 (detail: design-system.md §21): watermark logogram di panel login dan hero dashboard, dashboard memenuhi viewport, logo sidebar expanded rata kiri, dan **pemilih bahasa (`LocaleSwitcher`) dihapus** — UI hanya Bahasa Indonesia, `en.json` dorman. Tabel §1 dan §3 yang masih menyebut `LocaleSwitcher` mencerminkan kondisi saat recon (historis).

### 6.1 Resolusi

| # | Keputusan | Catatan implementasi |
|---|---|---|
| D1 | `@lucide/svelte` 1.49.0 (pin exact, devDependency) | Versi 1.50.0 dilewati karena belum melewati umur rilis minimum pnpm |
| D2 | Route SAD + fixture dev-only | Fixture terverifikasi tidak ada di `build/` |

> **Pengecualian D2 (keputusan pemilik produk, 7 Okt 2026):** dashboard Kepala sekolah (`/app/admin/principal`), Wali kelas (`/app/teacher/homeroom`), dan Guru mapel (`/app/teacher`) menampilkan data contoh di dev **dan produksi** untuk bagian yang dikirim `null` oleh `/api/v1/dashboards/*` (modul belum tersedia). Setiap bagian tersebut wajib berlabel "Data contoh" dan aksinya hanya simulasi lokal. Dashboard lain tetap mengikuti D2.
| D3 | Token minimal | `lms-progress-text`, `lms-progress-track`, `lms-warning-text`, `lms-scale-*` — kontras di design-system.md §13 |
| D4 | Hero Deep Neutral solid | `lms-hero`, `lms-hero-raised`, fokus putih di atas hero |
| D5 | Dark mode tetap mengikuti OS | `DARK_MODE_POLICY` tetap HUMAN_DECISION_REQUIRED |
| D6 | Aksi bisnis nonaktif + keterangan | `aria-describedby` ke alasan `sr-only` |

## 7. Proposed implementation mapping (setelah keputusan)

| Lapisan | Rencana |
|---|---|
| Primitive | `Badge`, `Avatar`, `ProgressBar`, `Checkbox`, `Select`, `RadioCard`, `SegmentedControl`, `Card` (atau utilitas), `Drawer` (aksesibel, tanpa dependency), `Tabs` |
| Product | `MetricCard`, `ProgressRing`, `Timeline`, `TaskListItem`, `AttentionItem`, `QuickAction`, `BarChart` (CSS, dengan tabel tersembunyi untuk pembaca layar), `Heatmap`, `AttendanceCalendar`, `Stepper`, `PlanCard`, `HeroBanner` |
| Shell | `AppShell` diperluas: varian `public` (header) dan `workspace` (sidebar expanded ≥ lg, rail md–lg, drawer < md; topbar). Navigasi per role sebagai konfigurasi data di route layout (bukan komponen per role) |
| Route | `(public)/register`, `(public)/register/plan`; `(school)/app/{admin,teacher,student,guardian}` dengan layout per role; `/app` → pemilih role sementara (dev) atau StatePanel |
| Data | Fixture di `src/lib/fixtures/` (dev-only), dipisah dari komponen; tidak ada perhitungan bisnis |
