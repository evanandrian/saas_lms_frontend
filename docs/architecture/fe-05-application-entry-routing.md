# FE-05 — Application Entry, Role-Based Dashboard Routing & Watermark Refinement

| Atribut | Nilai |
|---|---|
| Fase | FE-05 |
| Tanggal | 3 Oktober 2026 |
| Baseline | FE-04R (`VERIFIED_WITH_KNOWN_LIMITATIONS`) |
| Ketergantungan | BLOCKED-02 (kontrak auth), BLOCKED-04 (katalog role/permission), ADR-019 |

## 1. Keputusan

| # | Keputusan | Alasan |
|---|---|---|
| D1 | Sesi contoh **dev-only** untuk memverifikasi alur peran; produksi selalu anonim | Kontrak auth belum ada (BLOCKED-02); pola sama dengan fixture FE-04 D2 |
| D2 | Policy dikunci dengan **workspace area** milik frontend, bukan daftar role backend | BLOCKED-04 melarang frontend mengarang katalog role/permission |
| D3 | ~~`/` hanya di host tenant & platform~~ → **diganti FE-05R:** `/` di **semua** host (termasuk root domain) → `/login` atau landing | Keputusan pemilik produk; ADR-019 Revisi 1 |
| D4 | Pengguna multi-konteks tanpa konteks aktif → route baru **`/select-context`**; `/app` (pemilih area) tetap | Keputusan pemilik produk |

## 2. Application entry flow

```
Buka host mana pun (root, platform, tenant)  →  /
        │
        ├─ anonim ........................... → /login
        └─ terautentikasi → resolveLanding()
               ├─ konteks aktif / tunggal ... → landing area (policy)
               ├─ > 1 konteks, belum dipilih  → /select-context
               └─ 0 konteks sah / peran tak didukung → /access-denied (403)
```

Root domain (`<root>/`) juga membuka `/login` (ADR-019 Revisi 1). Sesi bersifat host-only; serah-terima sesi dari login root ke host tenant/platform adalah OQ-6 (backend). Pendaftaran lembaga tetap di `<root>/register`.

## 3. Authentication redirect flow

- Anonim membuka route terlindungi (`/console/*`, `/app/*`, `/settings/*`, `/select-context`) → `303 /login`.
- Setelah autentikasi, halaman login **hanya** memanggil `resolvePostAuthDestination(session, host)` → selalu landing dari policy (dashboard peran, atau pemilihan konteks bila lebih dari satu).
- Revisi keputusan pemilik 5 Okt 2026: `redirectTo` (halaman sebelum login, ADR-019 §4) **tidak dipakai lagi**; setiap login selalu mendarat di dashboard.
- Login tidak mengetahui pemetaan peran → dashboard.

## 4. Dashboard Routing Policy (single source of truth)

Lokasi: `src/lib/auth/dashboard-routing.ts` → `DASHBOARD_ROUTING_POLICY`.

| Workspace area | Landing | Host | Aktif |
|---|---|---|---|
| `platform` | `/console` | platform | ya |
| `school_admin` | `/app/admin` | tenant | ya |
| `teacher` | `/app/teacher` | tenant | ya |
| `student` | `/app/student` | tenant | ya |
| `guardian` | `/app/guardian` | tenant | ya |

- Mengubah landing, menonaktifkan area, atau menambah area cukup di konfigurasi ini; login, layout, halaman, dan sidebar tidak berubah.
- Semua fungsi menerima argumen `policy` opsional, sehingga konfigurasi remote dari backend dapat menggantikan konfigurasi statis tanpa mengubah alur login.
- Area nonaktif diperlakukan seperti tidak didukung (akses ditolak), bukan dialihkan ke area lain.

API modul:

| Fungsi | Tugas |
|---|---|
| `eligibleMemberships(session, host)` | Membership yang berlaku di host ini dan areanya aktif |
| `resolveLanding(session, host)` | Tujuan awal: login / dashboard / select-context / access-denied |
| `authorizeRoute(session, host, url)` | Keputusan akses route terlindungi |
| `enforceRouteAccess(session, host, url)` | Dipanggil load layout `(platform)` dan `(school)`; melempar redirect |
| `resolvePostAuthDestination(session, host)` | Tujuan setelah autentikasi (selalu landing policy) |

## 5. Role / context resolution

`src/lib/auth/access-context.ts`:

```ts
AccessContext = { user, memberships: Membership[], activeMembershipId }
Membership    = { id, area: WorkspaceArea, tenant: string | null, label }
```

- Banyak membership per pengguna didukung (mis. guru di sekolah A + admin di sekolah B). Tidak ada asumsi satu pengguna = satu peran = satu tenant.
- Membership hanya berlaku di host-nya: area tenant hanya bila `membership.tenant === subdomain`; area platform hanya di host platform.
- `toAccessContext(raw)` adalah satu-satunya adapter dari data identitas mentah (kelak respons auth backend). Area tidak dikenal **dibuang**, tidak dipetakan ke area lain.
- Bentuk `RawAccessContext` adalah asumsi frontend; saat kontrak BLOCKED-02/04 tersedia, hanya adapter ini yang diubah.

## 6. Protected route behavior

| Kondisi | Hasil |
|---|---|
| Anonim → `/console/*`, `/app/*`, `/settings/*`, `/select-context` | `303 /login` |
| Terautentikasi, punya area yang diminta di host ini | diizinkan |
| Terautentikasi, area lain (mis. murid → `/app/admin`) | `303 /access-denied` → **403** |
| Terautentikasi di tenant lain (membership `lembaga-lain` di host `demo`) | `/access-denied` |
| `/app` (pemilih area), `/select-context` | cukup satu konteks sah di host ini |
| Request data client-side (`__data.json`) | redirect yang sama (diuji) |

**Routing ≠ otorisasi.** Guard frontend mencegah salah arah dan memperbaiki UX; backend tetap memvalidasi setiap request data (ADR-019, SAD §9.2). Load data nyata kelak wajib tetap diotorisasi backend.

## 7. Unknown role behavior

- Area tidak dikenal dari data identitas → membership dibuang oleh adapter.
- Tanpa membership sah → `resolveLanding` = `access-denied`; route terlindungi → `/access-denied` (HTTP 403, `+error.svelte` khusus di dalam `AppShell` dengan tautan "Masuk dengan akun lain").
- Tidak ada fallback diam-diam ke dashboard lain (mis. tidak pernah "peran tak dikenal → murid").

## 8. Sesi contoh dev-only

- `src/lib/auth/dev-session.fixture.ts`: persona `platform`, `school-admin`, `teacher`, `student`, `guardian`, `multi-context`, `other-tenant`, `unsupported-role`.
- Dimuat hanya lewat `dev ? await import(...) : null` (hooks, login, select-context). Pola `if (!dev) error(); await import()` **tidak** dipakai karena bundler tidak mengeliminasi import setelahnya.
- Cookie `lms_dev_session` (HttpOnly, SameSite=Lax, host-only) hanya berisi ID persona/konteks; bukan token. Pemeriksaan Origin (CSRF) SvelteKit nonaktif di dev menurut desain SvelteKit dan aktif di produksi.
- Produksi (diverifikasi `node build`): cookie dev diabaikan, aksi dev → 404, modul fixture dan data persona tidak ada di `build/`.
- **FE-05R:** panel "Mode pengembangan: sesi contoh" **dihapus dari halaman login** atas permintaan pemilik produk. Aksi `devSignIn`/`devSignOut` (dev-only) masih ada tanpa UI.

## 9. Watermark rules (FE-05 refinement)

Prioritas visual dashboard: judul → informasi utama → aksi utama → navigasi → konten pendukung → **watermark**.

| Lebar | FE-04R | FE-05 |
|---|---|---|
| < 640 | 224px, 6% | **disembunyikan** |
| 640–767 | 224px, 6% | 112px, 4% |
| 768–1023 | 340px, 6% | 144px, 4% |
| ≥ 1024 | 340px, 6% | 160px, 4% |

- Posisi pojok kanan bawah, sebagian terpotong (`-right/-bottom`); area terlihat ±112×111px di desktop.
- Tidak ada blur, glow, gradient, atau drop-shadow. Aset tetap logogram White master. Watermark panel login (FE-04R) tidak diubah.
- Aksesibilitas: `alt=""`, `aria-hidden="true"`, `pointer-events: none`, tidak dapat difokus.

## 10. Keterbatasan

- Autentikasi nyata, logout nyata, dan penyimpanan konteks aktif menunggu kontrak backend (BLOCKED-02). Di build produksi semua route terlindungi berakhir di `/login`; dashboard tidak dapat dibuka sampai auth tersedia.
- Belum ada test runner (Vitest/Playwright belum terpasang); verifikasi memakai tes integrasi HTTP + browser.
- Label i18n sesi contoh dan stub aksi dev (404) masih ada di bundle produksi; panel UI sudah dihapus (FE-05R), logika dan data sesi contoh tidak ikut build.

## 11. FE-05R — Kesesuaian visual halaman login

Login dibangun ulang mengikuti struktur `FLIXARE App.html` (layar 01):

| Elemen | Implementasi |
|---|---|
| Layout | Split layar penuh tanpa header aplikasi (group `(auth)`); panel brand hanya `≥ lg`, seperti referensi |
| Kolom form | Logo kiri atas; form maks 400px di tengah; footer "Belum punya akun lembaga? Daftar sekarang" + "© {tahun} FLIXARE" |
| Form | Tombol Google outline (tanda Google resmi: `src/lib/assets/third-party/google-g.svg`), pemisah, field email/kata sandi 46px berikon, "Lupa kata sandi?", tombol tampil/sembunyi sandi, "Ingat saya", tombol Masuk 48px lebar penuh, kartu kode sesi ujian |
| Panel brand | Deep Neutral, watermark logogram, tagline, 3 kartu contoh (progres 82%, Kuis Aljabar, Draf rapor; `aria-hidden`), headline, chip Sekolah/Guru/Murid/Orang tua |
| Komponen | `Button`: `variant="outline"`, `size="lg"`, `width="full"`; `TextField`: `size="lg"`, `icon`, `labelAside`, `trailing` (semua opsional, kompatibel mundur) |

Perbedaan yang **disengaja** terhadap referensi:

| Referensi | Implementasi | Alasan |
|---|---|---|
| Gradient radial biru/hijau di panel | Deep Neutral solid | FE-04 D4, FE-04R D04 (no gradient/glow di product UI) |
| Kartu kaca `backdrop-filter: blur` | `lms-hero-raised` solid + border | Tanpa efek blur (FE-04R/FE-05) |
| Tombol tema terang/gelap | **Ada** (`ColorModeToggle`, preferensi di cookie `lms_color_mode`; default mengikuti OS) | Keputusan pemilik produk (FE-05R) |
| Tombol aktif, field terisi contoh | Tombol nonaktif + keterangan; field kosong | BLOCKED-02, FE-04 D6 |
| "Lupa kata sandi?" tautan biru | Teks (belum ada alur pemulihan) | BLOCKED-02; teks Royal Blue gagal kontras di dark |
| Judul 36/44 | `text-lms-h1` 40/48 (desktop) | Skala tipografi kanonik LOCKED |

## 12. FE-05R — Satu URL saat development

- Dev: `localhost:5173` melayani login, `/console`, dan `/app/*` (host `unified`, ADR-019 Revisi 2). Login platform → `localhost:5173/console`; login sekolah → `localhost:5173/app/<peran>`.
- Produksi: tetap subdomain; host `unified` tidak pernah aktif.
- Diverifikasi dengan backend lokal (seed `*@school.com`, `platform@flixare.com`): kelima peran mendarat di dashboard yang benar di host yang sama; `/` setelah masuk → dashboard peran; salah sandi → 401.
- Aksi `login` yang terhubung ke backend lokal (ditambahkan pemilik produk) diperbaiki minimal: token dibaca dari `data.data.token`, dan `redirect()`/`error()` diteruskan (`isRedirect`/`isHttpError`), sebelumnya selalu 500.


## 13. FE-06 — Login, tryout tamu, dan logout (acuan `FLIXARE App v3.html`)

Acuan: layar 01 (Masuk), 01b (Peserta ujian terbuka), 09 (Keluar), dan `ConfirmDialog` pada `FLIXARE App v3.html`.

### 13.1 Login (`/login`)

- Form v3: Google (nonaktif + alasan), email dengan saran `Tab`, kartu identitas "Akun dikenali", peringatan Caps Lock, galat inline `role="alert"` (`auth.login.errors.{missing_fields,invalid_credentials,service_unavailable}`), tombol berstatus ("Masuk sebagai {peran}" → "Memeriksa akun…" → "Membuka dashboard…").
- **Pengenalan akun saat mengetik hanya dev** (keputusan pemilik produk): data `accounts.fixture.ts` dimuat di server `load` (`dev ? await import() : null`), sehingga tidak ada di bundel client produksi. Di produksi fitur ini mati karena berisiko *user enumeration*; mengaktifkannya butuh endpoint backend dengan rate limit (BLOCKED-02).
- Panel kanan: kartu pratinjau per peran (Sekolah/Guru/Murid/Orang tua) yang berotasi 6 detik; berhenti saat tab dipilih, akun dikenali, hover/fokus, atau `prefers-reduced-motion`.
- **Warna aksen peran tidak dipakai** (keputusan: Royal Blue untuk semua peran) — tidak ada warna brand baru.
- Tautan tryout ("Peserta tryout? Masuk dengan kode sesi") menuju `/join`; tidak tampil di host platform.

### 13.2 Tryout tamu (`/join`)

- Host: publik, tenant, unified. Tiga langkah: kode sesi 6 karakter → detail sesi (hitung mundur tutup) → data peserta + 3 pernyataan; tiket peserta terisi otomatis.
- Pencarian kode sesi menunggu kontrak (BLOCKED-01). Data contoh `sessions.fixture.ts` hanya dev (kode `7K2Q9M`); produksi menampilkan pesan belum tersedia.
- "Mulai ujian" = simulasi dev: hitung mundur 3-2-1 lalu pesan bahwa halaman pengerjaan soal belum tersedia. Tidak ada data peserta yang dikirim/disimpan.
- Bagian yang terkunci memakai `opacity-85` (acuan .45) agar teks informatif tetap lolos kontras WCAG 1.4.3.

### 13.3 Logout

- Tombol "Keluar" di `WorkspaceShell` membuka `ConfirmDialog` (`<dialog>` native: fokus terkurung, `Esc` batal, fokus kembali ke pemicu, `Enter` = konfirmasi karena tombol konfirmasi `autofocus`). Isi: pengguna, perangkat (`describeDevice`), waktu masuk.
- ~~**Sesi tunggal**~~ (revisi FE-06) **digantikan multi-sesi** (keputusan pemilik 6 Okt 2026, halaman Pengaturan Akun): satu akun boleh aktif di banyak perangkat; keluar menutup sesi perangkat ini saja; perangkat lain dikeluarkan dari Pengaturan → Perangkat & sesi aktif. Lihat §13.6.
- Teks referensi "pekerjaan sudah tersimpan" **tidak dipakai**: frontend tidak dapat menjaminnya; diganti peringatan jujur bahwa perubahan yang belum disimpan dapat hilang.
- Konfirmasi = form `POST /logout` (navigasi dokumen penuh). Server menulis ringkasan (`lms_logout_notice`) dan email untuk "Masuk kembali" (`lms_reauth_email`), memanggil backend `POST /api/v1/auth/logout` (mencabut semua sesi user), menghapus `lms_token`, `lms_refresh_token`, `lms_dev_session`, `lms_session_meta`, lalu `303` ke `/logged-out`.
- `/logged-out`: centang animasi, ringkasan sesi (nama, peran, email, durasi), pengalihan otomatis 10 detik yang dapat dijeda (WCAG 2.2.1). Ringkasan dibaca sekali lalu dihapus.
- **Masuk kembali** → `/login?mode=reauth`: email terakhir diisi dari cookie HttpOnly `lms_reauth_email` (bukan dari URL), fokus langsung ke kata sandi. **Akun lain** → `/login?mode=other`: form kosong dan `lms_reauth_email` dihapus. Konstanta: `LOGIN_MODE_PARAM`, `LOGIN_MODES` (`app-paths.ts`).

### 13.4 Cookie baru

| Cookie | Isi | Atribut |
|---|---|---|
| `lms_session_meta` | `{startedAt, email}` untuk dialog & ringkasan logout | httpOnly, SameSite=Lax, path `/` |
| `lms_logout_notice` | `{name, area, email, durationMinutes}` | httpOnly, SameSite=Lax, path `/`, maxAge 120 |
| `lms_reauth_email` | email untuk "Masuk kembali" | httpOnly, SameSite=Lax, path `/`, maxAge 900 |
| `lms_session_ended` | `revoked` \| `expired` (pesan di halaman masuk) | httpOnly, SameSite=Lax, path `/`, maxAge 120 |
| `lms_token`, `lms_refresh_token` | token backend | httpOnly, SameSite=Lax, path `/`, `Secure` di produksi |

Selain `lms_token`/`lms_refresh_token`, cookie di atas tidak berisi token. Email hanya disimpan bila pengguna masuk lewat form.

### 13.5 Keterbatasan

- URL backend dari env server-only `LMS_API_INTERNAL_URL` (`$lib/auth/backend-auth.ts`); fallback `http://localhost:8080` hanya saat dev. Pemetaan email seed → persona dipindah ke `dev-session.fixture.ts` (`personaIdForEmail`).
- Sesi frontend masih persona contoh dev; di produksi sesi tetap `unresolved` sampai kontrak sesi final (BLOCKED-02).
- Refresh bersamaan dengan refresh token yang sama: request kedua ditolak (compare-and-swap) dan pengguna diminta masuk lagi dengan pesan "sesi berakhir".
- Verifikasi sesi ke backend (`GET /auth/me`) dilakukan setiap request SSR saat dev; perlu cache/strategi lain sebelum produksi.

### 13.6 Kebijakan sesi (frontend + backend) — multi-sesi sejak 6 Okt 2026

- Backend (`saas_lms_backend/internal/platform/identity`): setiap sesi = satu baris `refresh_tokens` (perangkat: User-Agent, IP, aktivitas terakhir); ID-nya ada di claim JWT `sid`.
  - `POST /auth/login` membuat sesi baru tanpa mencabut sesi lain (sebelumnya: mencabut semua sesi).
  - `POST /auth/logout` mencabut sesi perangkat ini saja (gagal → 500, tidak diam-diam).
  - Pengaturan Akun: `DELETE /account/sessions/{id}` dan `DELETE /account/sessions` (semua kecuali perangkat ini); ganti kata sandi dapat mengeluarkan perangkat lain.
  - `POST /auth/refresh` merotasi refresh token **pada baris yang sama** (`sid` tetap), compare-and-swap.
  - `AuthenticationMiddleware` menolak token yang sesinya dicabut: `401 {"error":{"code":"session_revoked"}}`. Token lama tanpa `sid` ditolak.
- Frontend (`hooks.server.ts`, dev): bila ada `lms_token`, sesi diverifikasi ke backend tiap request; `session_revoked` → semua cookie sesi dihapus dan halaman masuk menampilkan "Sesi Anda di perangkat ini berakhir karena dikeluarkan dari Pengaturan Akun…"; token kedaluwarsa → refresh otomatis, gagal → pesan "sesi telah berakhir"; backend tak terjangkau → anonim tanpa menghapus cookie.
