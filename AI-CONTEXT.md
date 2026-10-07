# AI-CONTEXT — saas_lms_frontend

> **Architecture decisions in this repository take precedence over generic AI coding preferences.**

Dokumen ini wajib dibaca oleh setiap AI agent sebelum mengubah repository ini.

## 1. Urutan sumber kebenaran

1. Keputusan produk yang disetujui pemilik
2. SAD-SDD SaaS LMS Multi-Tenant v1.0.1 (di luar repo; minta kutipan bagian terkait bila tidak dilampirkan). Di dalam SAD: bila Bagian I berbeda dengan Lampiran A, **Bagian I yang berlaku**
3. ADR yang diterima: ADR-001..018 (SAD §11) dan di [`docs/adr/`](docs/adr/):
   - [ADR-019 — Frontend API & Session Topology](docs/adr/ADR-019-frontend-api-session-topology.md)
   - [ADR-020 — SvelteKit Runtime & Adapter Strategy](docs/adr/ADR-020-sveltekit-runtime-adapter-strategy.md)
   - [ADR-021 — OpenAPI Contract & Generated API Client Strategy](docs/adr/ADR-021-openapi-generated-client-strategy.md)
4. Frontend Foundation Specification v1.0 — **tidak tersedia** (BLOCKED-FE-SPEC). Sementara itu, README §11 adalah baseline kanonik
5. [README §11 — Frontend Foundation Baseline](README.md#11-frontend-foundation-baseline) dan [§12 — Installation & Development](README.md#12-frontend-installation--development)
6. [docs/architecture/foundation-decision-resolution.md](docs/architecture/foundation-decision-resolution.md), [docs/architecture/repository-reconnaissance.md](docs/architecture/repository-reconnaissance.md)

Bila sumber bertentangan: **jangan memilih diam-diam**. Sebutkan kedua sumber, dampaknya, dan usulan; keputusan diambil manusia, lalu dicatat sebagai ADR bila mengubah arsitektur.

ADR-019, ADR-020, ADR-021 berstatus **Accepted** (2 Okt 2026) dan mengikat. ADR dengan status Proposed belum mengikat.

Keputusan yang mengubah isi SAD (dicatat untuk revisi SAD 1.0.2): host konsol `platform.<root>` (bukan `console.namalms.id`), `www` → root, vocabulary `assessment` di route/permission, `@lms/api-client` ditunda.

## 2. Baseline (ringkas — detail di README §11)

Node.js 24 LTS · pnpm 12.8.1 · **SvelteKit 2.70.3** (jangan naik ke 3 tanpa ADR) · Svelte 5.57.1 runes · TypeScript · Tailwind CSS 4.3.3 · Skeleton 5.0.1 · adapter-node 5.x (bukan adapter-static) · Zod 4.x · OpenAPI generated client via Orval · Vitest + Testing Library + Playwright.

## 2a. Status saat ini

- **FE-FOUNDATION-01:** `COMPLETE_WITH_DOWNSTREAM_BLOCKERS` ([fe-foundation-01-bootstrap.md](docs/architecture/fe-foundation-01-bootstrap.md)).
- **FE-FOUNDATION-02:** `COMPLETE_WITH_BLOCKERS` — **wajib dibaca:** [frontend-architecture-boundaries.md](docs/architecture/frontend-architecture-boundaries.md) (layer, arah dependency, pola terlarang).
- **FE-FOUNDATION-03:** COMPLETE. **FE-FOUNDATION-03R** (brand FLIXARE): selesai, menunggu review. FE-04 (pola product UI + 8 layar referensi, [FE-04-RECON.md](docs/architecture/FE-04-RECON.md)) dan FE-04R: selesai, menunggu review. **Fase saat ini: FE-05** — entry aplikasi + Dashboard Routing Policy ([fe-05-application-entry-routing.md](docs/architecture/fe-05-application-entry-routing.md)). **Wajib dibaca sebelum menulis UI:** [design-system.md](docs/architecture/design-system.md) (§14 komponen, §19 pola product UI).
- **Security:** `SECURITY_GATE_PASS_WITH_RESIDUAL_RISK`. Salinan PAT yang sudah di-revoke di log lokal: DEFERRED CLEANUP. Jangan pernah membaca, memakai, atau mencetak token itu.
- Perintah tersedia: `pnpm dev`, `build`, `preview`, `check`, `lint`, `format`, `format:check`. **Belum ada:** `pnpm test`, `pnpm test:e2e` (FE-FOUNDATION-09).
- **Downstream dependencies** (tidak memblok fase fondasi; memblok implementasi terkait): BLOCKED-01 OpenAPI (jangan membuat client/endpoint/tipe API), BLOCKED-02 kontrak auth (jangan membuat login nyata/refresh/JWT; guard route + policy landing sudah ada sejak FE-05 dan berjalan di atas sesi contoh dev), BLOCKED-04 katalog permission (jangan membuat daftar permission/role), OQ-1..OQ-3 dan OQ-5 (backend).

## 2b. Peta kode fondasi

| Kebutuhan | Lokasi |
|---|---|
| Konteks host/tenant | `src/lib/utils/host-context.ts` (`resolveHostContext`, `assertHostKind`); dipasang ke `event.locals.host` di `src/hooks.server.ts` |
| Penegakan host ↔ route group | `+layout.server.ts` tiap group (`assertHostKind`) |
| Path dasar | `src/lib/utils/app-paths.ts` (`APP_PATHS`) |
| Sesi (batas) | `src/lib/auth/session.ts` — produksi `UNRESOLVED_SESSION` (anonim) sampai kontrak auth ada; dev: sesi contoh `dev-session.fixture.ts` |
| Routing & akses | `src/lib/auth/dashboard-routing.ts` (`DASHBOARD_ROUTING_POLICY`, `resolveLanding`, `enforceRouteAccess`, `resolvePostAuthDestination`); konteks `access-context.ts` |
| Permission (UX) | `src/lib/auth/can.ts` |
| i18n | `src/lib/i18n/` — `setI18n()` di root layout, `useI18n().t('<module>.<screen>.<element>')` di komponen |
| Shell | `src/lib/components/layout/AppShell.svelte` (halaman publik/pemilih), `WorkspaceShell.svelte` (konsol + area peran: sidebar/rail/drawer), `PageContainer.svelte`, `NavigationLink.svelte` (wajib `resolve()`), `LocaleSwitcher.svelte` |
| Ikon | `Icon` + `@lucide/svelte/icons/<nama>`; ikon yang dirujuk data lewat `UI_ICONS` (`src/lib/components/ui/icon-registry.ts`) |
| Data demo (dev-only) | `*.fixture.ts` ko-lokasi dengan route, dimuat `dev ? await import(...) : null`; produksi menampilkan `StatePanel` kosong |
| Bahasa | **Hanya Bahasa Indonesia (FE-04R).** Setiap kunci i18n baru wajib ditambahkan di `id.json` **dan** `en.json` (keputusan pemilik 7 Okt 2026; struktur kunci & placeholder identik) walaupun `en` masih dorman. `locals.locale = DEFAULT_LOCALE` di `hooks.server.ts`. `en.json` dorman, tidak dapat dipilih. Jangan menambah pemilih bahasa, cookie/persistensi bahasa, atau deteksi bahasa browser tanpa keputusan produk |

Aturan lint proyek (ESLint, lihat boundaries §18): `localStorage`/`sessionStorage` dilarang; link internal wajib `resolve()`; route dan komponen tanpa raw `fetch()`; hanya feature API yang boleh mengimpor `$lib/api/generated`; komponen tanpa `document.cookie`, `$lib/api/**`, atau `host-context`; domain component hanya `import type` dari feature; `$lib/auth/session` dan `resolveHostContext` hanya untuk hooks/infrastruktur; infrastruktur tidak bergantung ke atas. **Jangan menonaktifkan aturan ini** (`eslint-disable`) tanpa keputusan arsitektur.

Formatting: jalankan `pnpm format` sebelum selesai; `*.md` tidak diformat otomatis.

Design system (design-system.md) — identitas **FLIXARE** (Brand Guidelines v1.0 adalah sumber kanonik; screenshot/prototipe bukan source of truth). Pakai token `lms-*` (lapisan brand → semantic → component) dan font Sora; jangan HEX/warna literal, jangan preset/utilitas `primary` atau `h1`–`h6` Skeleton (identitas/skala Cerberus). Jangan mengubah HEX brand atau membuat warna brand baru; turunan hanya `color-mix` antar warna brand dengan perhitungan kontras. Growth Green = progres, **bukan** success, bukan teks di latar terang. Tanpa gradient blue→green di product UI. Logo hanya lewat `BrandLogo` (artwork master) — jangan mengetik/menggambar ulang wordmark atau symbol. Tombol lewat `Button`, pesan → `Alert`, state → `StatePanel`, field → `TextField`; fokus terlihat (`lms-focus-ring`). Ikon hanya Lucide lewat `Icon`. Teks Royal Blue dilarang (gagal kontras di dark) — pakai `text-lms-foreground`. Aksi bisnis yang belum ada kontraknya: `Button disabled` + `aria-describedby` alasan, tanpa handler palsu. Keputusan bisnis (ambang, risiko) ditentukan data, bukan dibandingkan di UI. Data demo hanya di `*.fixture.ts` dev-only, tidak pernah di komponen. Tautan lintas host memakai URL absolut dari server + `rel="external"`. **Aturan default:** setiap layar/shell WAJIB menampilkan `ColorModeToggle` (sudah ada di `WorkspaceShell`, `AppShell`, login). Tampilan dashboard mengikuti `FLIXARE App.html` (design-system.md §23): hero bergradient (`lms-hero`), kartu kaca (`lms-hero-raised`), watermark logogram berwarna 340px/6% (guru 300px atas). Mode warna: pengguna memilih terang/gelap lewat `ColorModeToggle` (`<html data-mode>`, cookie `lms_color_mode`, default `system`); varian gelap memakai variant `dark`, jangan memakai media query `prefers-color-scheme` langsung. Redesign palet gelap dan Progressive Path: jangan diputuskan sendiri (HUMAN_DECISION_REQUIRED / DEFERRED).

Layout (FE-04R): konten dashboard (`WorkspaceShell`) memenuhi sisa viewport setelah sidebar — **jangan** membungkus halaman dashboard dengan `lms-container`/`max-w-*` global; gutter berasal dari `<main>` shell. `lms-container` hanya untuk halaman publik/formulir (login, register, plan, error). Logo sidebar expanded rata kiri atas; header `AppShell` memakai gutter shell, bukan container terpusat. Watermark hero/panel login: logogram White master, `aria-hidden`, dekoratif — tanpa gradient/glow.

Lintas platform (README §9, §12): Linux, macOS, dan Windows (PowerShell) didukung sebagai lingkungan pengembangan. Tugas proyek selalu lewat `pnpm <script>`; jangan menambah script yang bergantung pada sintaks shell Unix (`VAR=x cmd`, `rm -rf`, `cp`) atau PowerShell. Konfigurasi lokal lewat `.env`, bukan `export`. WSL opsional, tidak wajib. Line ending dinormalisasi LF lewat `.gitattributes`.

Jangan menambah dependency tanpa menyebut alasannya. Jangan mengganti framework/library baseline.

## 3. Arsitektur

```
Route → Feature (<modul>.api.ts/.schema.ts/.types.ts/.store.svelte.ts)
      → Domain component → UI component (pembungkus Skeleton)
      → Infrastructure (lib/api, lib/auth, lib/i18n, lib/offline, lib/utils)
```

- Route tidak memanggil API langsung; selalu lewat feature API.
- Logika bisnis tidak ditaruh di komponen UI generik.

## 4. API contract

- Contract-first (TR-07). **Jangan mengarang** OpenAPI, endpoint, operationId, tipe respons, atau mock API permanen. Bila kontrak belum ada → laporkan BLOCKED.
- **Jangan edit** `src/lib/api/generated/`.
- Nama fungsi API = operationId; tipe = nama skema OpenAPI.
- Browser memanggil `/api/v1/...` relatif (same-origin); SSR memakai `client.ts` (ADR-019, ADR-021).
- Respons `{ data, meta }` / `{ error: { code, ... } }`; paginasi keyset; JSON snake_case; pesan error dari i18n `errors.<KODE>`.

## 5. Auth rules

- **Backend adalah otoritas.** Route guard, `can()`, menu tersembunyi = UX, bukan keamanan.
- Jangan simpan token apa pun di `localStorage`, `sessionStorage`, IndexedDB, URL, atau log.
- Access + refresh token di cookie `HttpOnly; Secure; SameSite=Lax` host-only (ADR-019). JavaScript tidak membaca token.
- CSRF wajib untuk operasi tulis; mekanisme ditetapkan backend (ADR-019 §5, OQ-3). Jangan membuat mekanisme CSRF sendiri.
- Validasi Zod di frontend hanya UX/batas tipe, bukan batas keamanan.
- Kontrak auth (BLOCKED-02) dan detail cookie (OQ-1..3) belum ada: jangan mengarangnya.
- Jangan mengarang permission. Format `<module>.<action>`; daftar dari backend.
- **Dashboard Routing Policy (FE-05)** di `src/lib/auth/dashboard-routing.ts` adalah satu-satunya sumber pemetaan area kerja → landing dan keputusan akses route. Jangan menulis `if (role === …) goto(…)` atau percabangan area di route/layout/komponen/sidebar/login. Kunci policy = *workspace area* frontend (`platform`, `school_admin`, `teacher`, `student`, `guardian`), bukan katalog role backend. Area tak dikenal → akses ditolak, tidak pernah ke area lain.
- Host `unified` (ADR-019 Revisi 2) hanya dipasang hooks saat `dev` untuk root domain: satu URL untuk platform & sekolah. Jangan memakainya sebagai dasar perilaku produksi; route yang menerima host gabungan wajib mencantumkan `'unified'` di `assertHostKind`.
- Sesi contoh hanya dev (`dev-session.fixture.ts`, pola `dev ? await import() : null`). Jangan memakainya sebagai dasar fitur atau membuatnya aktif di produksi.
- **Dashboard platform/sekolah/guru/murid/orang tua (FE-07):** data mentah bertipe + turunan di `*-dashboard.ts`; data referensi hanya cadangan dev (`load…FromApi()` → fixture); aksi hanya simulasi dev; ambang bisnis dari data. Detail: design-system.md §25.
- **Multi-sesi (keputusan pemilik 6 Okt 2026, menggantikan sesi tunggal FE-06):** setiap login = satu perangkat (`refresh_tokens` + claim `sid`); logout hanya mengakhiri sesi perangkat ini; perangkat lain dikeluarkan dari Pengaturan Akun → Perangkat & sesi aktif. Panggilan auth ke backend hanya lewat `$lib/auth/backend-auth.ts` (env `LMS_API_INTERNAL_URL`); langkah selesai masuk bersama di `$lib/auth/finish-login.ts`.
- **Logout (FE-06)** selalu lewat `ConfirmDialog` → `POST /logout` (sesi perangkat ini) → `/logged-out`. Cookie pendukung `lms_session_meta` dan `lms_logout_notice` (httpOnly, tanpa token) dikelola `$lib/auth/session-meta.ts`. Pengenalan akun saat mengetik di login hanya dev (risiko user enumeration). `/join` (tryout tamu) masih simulasi dev sampai kontrak sesi tersedia. Detail: fe-05-application-entry-routing.md §13.

- **Pengaturan Akun** (referensi "10 Pengaturan Akun"): feature `src/lib/features/account/` (API server-only, load+aksi bersama `account.server.ts`, komponen tab di `components/`). Rute: `/settings/account` (platform), `/app/{admin,teacher,student,guardian}/settings`; proxy berkas `/account/photo`, `/account/exports?id=`; publik `/verify-email`, `/oauth/callback`. Tanpa fixture: belum masuk lewat backend → StatePanel. Area dikirim sebagai `?area=` dan diverifikasi backend dari keanggotaan aktif. Verifikasi 2 langkah saat masuk: tantangan di cookie HttpOnly `lms_login_challenge`. Pengajuan nama/nomor identitas/hapus akun tampil sebagai kartu status di tab Profil & Privasi (batal, tutup, unggah dokumen).
- **Kotak Persetujuan** (referensi "11 Kotak Persetujuan"): feature `src/lib/features/approvals/`; rute `/app/admin/approvals` (admin sekolah & kepala sekolah, menu "Persetujuan" + badge menunggu, `depends('app:approvals')`) dan `/settings/approvals` (konsol platform); proxy lampiran `/approvals/documents?id=&area=`. Pemanggilan backend bersama di `$lib/api/backend-call.ts`, aksi form terprogram di `$lib/utils/page-action.ts`. Produksi: set `BODY_SIZE_LIMIT` (foto/dokumen base64).
- **Dashboard per peran** (referensi 05b Kepala sekolah, 06b Wali kelas, 06 Guru mapel + panel mapel): feature `src/lib/features/dashboards/` (API `/api/v1/dashboards/*`, `RoleSwitch` di topbar lewat slot `headerActions` `WorkspaceShell`, `SampleBadge`). Rute `/app/admin/principal` dan `/app/teacher/homeroom`; toggle Kepala sekolah ↔ Admin sekolah hanya peran PRINCIPAL, Guru mapel ↔ Wali kelas hanya peran HOMEROOM_TEACHER (daftar tampilan dari backend). Pilihan terakhir disimpan cookie `lms_dashboard_view_<area>`; beranda area mengalihkan ke tampilan itu kecuali `?view=`. Sidebar mengikuti tampilan aktif; menu bagian menggulir ke seksi dashboard (`hash`). Pengecualian FE-04 D2 untuk ketiga dashboard ini: bagian yang backend-nya `null` memakai data contoh (`*.sample.ts`, `teacher.fixture.ts`) di dev **dan produksi**, selalu berlabel "Data contoh", aksinya simulasi lokal. Semua hero memakai watermark logogram (`HeroBanner`).

## 6. Tenant rules

- Tenant dari subdomain di `hooks.server.ts`; root domain dari `PUBLIC_LMS_ROOT_DOMAIN`.
- **Jangan hardcode** domain, tenant ID, tenant code, atau tenant default/fallback.
- Satu titik resolusi tenant; tidak ada logika tenant per route.
- Jangan pernah mengirim cookie/sesi tenant ke host lain (tidak ada `Domain=.<root>`).
- Host → route group: `<tenant>.<root>` → `/app`, `/s/<kode>`, `/login`; `platform.<root>` → `/console`, `/login`; `<root>` → publik; `www.<root>` → redirect ke `<root>`.
- Browser memanggil API di `<current-host>/api/v1` (same-origin). `api.<root>` hanya untuk klien non-browser.
- Jangan memercayai tenant ID/kode yang dikirim klien; backend adalah otoritas final tenant.

## 7. Domain vocabulary (SAD Bagian III §1)

Pakai: `institution` (bukan `school_unit`/`branch`), `class` (TS: `schoolClass`), `subject`, `student`, `guardian`, `assessment` (`exam` hanya untuk `exam_session`), `attempt`, `assignment`, `submission`, `score`, `final_grade`, `report_card`, `learning_objective`, `attendance`, `seat`.

Route memakai `/assessments` (bukan `/exams`); permission `assessment.create` (bukan `exam.create`). Katalog permission berasal dari backend (BLOCKED-04).

Satu konsep, satu nama di semua lapis. Label UI boleh berbeda (mis. "Ujian") — pemetaan di foundation-decision-resolution.md §15. Jangan memperkenalkan sinonim.

## 8. Naming rules (SAD Bagian III §5.2)

| Unsur | Aturan |
|---|---|
| Komponen | `PascalCase.svelte` |
| Folder route | kebab-case, Inggris, jamak untuk koleksi |
| Route group | `(public)`, `(platform)`, `(school)`, `(join)` |
| Param | camelCase + matcher, mis. `[assessmentId=uuid]` |
| File fitur | `<fitur>.<jenis>.ts` — api, schema, types, store.svelte, utils |
| Utilitas | kebab-case |
| Variabel/fungsi | camelCase; konstanta `UPPER_SNAKE` |
| Event handler | `handle<Aksi>`; props callback `on<Kejadian>` |
| i18n | `<module>.<screen>.<element>`; semua teks UI lewat i18n (TR-09) |
| CSS kustom | `lms-<nama>` |
| Test | unit `<file>.test.ts` di samping file; E2E `tests/e2e/<kode-alur>-<nama>.spec.ts` |
| Env | `LMS_<AREA>_<NAMA>`; publik berawalan `PUBLIC_` |

## 9. Security

- Tidak ada secret di repository. Tidak ada URL remote berisi kredensial.
- Tidak ada `{@html}` tanpa sanitasi allowlist (SAD §9.6).
- Kunci jawaban tidak pernah ada di respons untuk murid (backend); frontend tidak boleh mengasumsikan sebaliknya.

## 10. Proses kerja

- Satu tugas = satu ID pekerjaan/alur (E.., F..). Cantumkan ID BR/TR/NFR di komentar dan nama test.
- Tulis asumsi dan konflik dokumen di akhir jawaban.
- Jangan commit/push tanpa izin. Conventional Commits; branch `<jenis>/<LMS-n>-<ringkas>`.
- Jangan mengklaim test lolos tanpa menjalankannya.
