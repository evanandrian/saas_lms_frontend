# saas_lms_frontend

Frontend web untuk **SaaS LMS Multi-Tenant** — platform pembelajaran berbasis langganan untuk sekolah, guru pribadi, dan penyelenggara sesi ujian.

---

## Project Overview

Satu aplikasi SvelteKit melayani tiga area: situs publik dan pendaftaran, konsol pemilik LMS, dan aplikasi sekolah (admin, guru, murid, orang tua/wali), ditambah halaman peserta tamu untuk sesi ujian. Backend berada di repository terpisah `saas_lms_backend` (Go, modular monolith); kontrak antara keduanya adalah OpenAPI.

## Product Context

- **Tenant:** `school`, `personal` (guru pribadi), `event` (penyelenggara sesi ujian) — satu skema, dibedakan entitlement.
- **Aktor:** pemilik LMS (platform), admin sekolah, kepala sekolah, guru, murid, orang tua/wali, peserta tamu.
- **Jalur kritis:** pengerjaan asesmen (ujian) — autosave ≤ 15 detik, timer otoritatif di server.
- **Lingkup tidak termasuk (v1):** SPP, PPDB, video conference, integrasi resmi Dapodik, aplikasi native terpisah.

## Fitur yang Tersedia

| Area | Fitur |
|---|---|
| Autentikasi | Login email + password; setelah login selalu menuju dashboard sesuai peran; halaman keluar |
| Dashboard | Dashboard platform, admin sekolah, guru, murid, dan orang tua |
| Konsol platform | Menu & navigasi (`/settings/navigation`), Master data 11 master (`/settings/master-data`), Master Paket langganan (`/settings/plans`) |
| Tampilan | Light mode dan dark mode (palet FLIXARE) |

## Architecture Overview

```
Route        src/routes/(public|platform|school|join)/
  → Feature  src/lib/features/<modul>/   <modul>.api.ts, <modul>.model.ts
  → Domain component   src/lib/components/domain/
  → UI component       src/lib/components/ui/      (pembungkus Skeleton)
  → Infrastructure     src/lib/api/ (generated + client.ts), auth/, i18n/, offline/, utils/
```

Detail layer, arah dependency, dan pola terlarang: [frontend-architecture-boundaries.md](docs/architecture/frontend-architecture-boundaries.md). Runtime: SvelteKit dengan server Node.js.

## Frontend Stack

SvelteKit 2 · Svelte 5 (runes) · TypeScript · Tailwind CSS 4 · Skeleton 5 · Lucide (`@lucide/svelte`, ikon) · adapter-node · Zod 4 · OpenAPI generated client (Orval) · ESLint · Prettier · Vitest + Testing Library · Playwright. Versi terkunci ada di bagian **Frontend Foundation Baseline**.

## Multi-Tenant Model

- Satu database per tenant di backend. Frontend **tidak pernah** menjadi sumber kebenaran tenant.
- Tenant dikenali dari subdomain: `<tenant>.<root-domain>`; platform (konsol) di `platform.<root-domain>`; publik di `<root-domain>`, `www` dialihkan ke root.
- Root domain selalu dari `PUBLIC_LMS_ROOT_DOMAIN`; jangan hardcode domain atau kode tenant.
- Browser memanggil API **same-origin** di `/api/v1/...` pada host tenant.

| Host | Route group | Prefix |
|---|---|---|
| `<tenant>.<root>` | `(school)`, `(join)`, login | `/app/*`, `/s/<sessionCode>`, `/login` |
| `platform.<root>` | `(platform)`, login | `/console/*`, `/settings/*`, `/login` |
| `<root>` (`www.<root>` → redirect ke `<root>`) | `(public)` | `/`, `/pricing`, `/register` |

## Authentication & Authorization

- **Backend adalah otoritas.** Route guard, `can()`, menu tersembunyi, dan state UI **bukan** batas keamanan.
- Access token (JWT 15 menit) dan refresh token di cookie `HttpOnly; Secure; SameSite=Lax`, host-only. Token tidak pernah disimpan di `localStorage`/`sessionStorage`/IndexedDB.
- Setelah login, pengguna selalu diarahkan ke dashboard sesuai perannya (atau pemilihan konteks bila punya lebih dari satu konteks).
- Permission: `<module>.<action>`. Frontend tidak mengarang permission; daftar berasal dari backend.
- Login: email + password; Google OIDC dan MFA TOTP untuk role platform direncanakan.

## API Contract

- Contract-first: `openapi.yaml` di repo backend disalin ke `contract/openapi.yaml`, lalu client TypeScript di-generate ke `src/lib/api/generated/` (`pnpm api:generate`).
- `generated/` **tidak boleh diedit manual**. Nama fungsi = operationId; nama tipe = skema OpenAPI. `pnpm api:check` gagal bila hasil generate berbeda dari repository.
- Respons: `{ data, meta }` / `{ error: { code, message, details, request_id } }`; JSON snake_case.
- Pesan error ke pengguna dari kunci i18n.

## Development Requirements

Bagian ini adalah kebutuhan lingkungan **pengembangan**. Dukungan Windows di bawah adalah dukungan pengembangan, bukan klaim deployment: aplikasi di-deploy sebagai server Node.js di container, bukan di Windows.

### Supported Operating Systems

| OS | Minimum (mengikuti platform list resmi Node.js 24) | Status verifikasi |
|---|---|---|
| Linux | Distribusi modern dengan glibc ≥ 2.28 dan kernel ≥ 4.18, x64/arm64 (mis. Ubuntu 20.04+, Debian 10+, RHEL 8+); shell Bash/Zsh | Perintah sama dengan macOS; belum diverifikasi langsung di Linux |
| macOS | macOS ≥ 13.5, x64/arm64; shell Zsh/Bash | Terverifikasi (macOS arm64, Node v24.21.0, pnpm 12.8.1) |
| Windows | Windows 10/11 64-bit (x64); shell PowerShell | Sintaks PowerShell disusun sesuai dokumentasi resmi, belum dijalankan di Windows |

### Perangkat yang dibutuhkan (semua OS)

| Kebutuhan | Versi / catatan |
|---|---|
| Git | Versi terkini |
| Node.js | **24 LTS** (`.nvmrc` = `24`; diverifikasi pada v24.21.0). `engines` + `.npmrc` `engine-strict=true` menolak versi mayor lain |
| pnpm | **12.8.1** (`packageManager`), dipasang lewat Corepack |
| Shell | Linux/macOS: Bash/Zsh. Windows: **PowerShell** (jalur utama). Git Bash dan WSL opsional |
| Akses repository | Akses GitHub ke `evanandrian/saas_lms_frontend` lewat credential manager OS, `gh auth login`, atau SSH — jangan menaruh token di URL atau di riwayat shell |
| Backend API | `saas_lms_backend` berjalan di `http://localhost:8080` (atau atur `LMS_API_INTERNAL_URL`). Tanpa backend, halaman konsol memakai data contoh mode simulasi saat development |
| Browser | Browser modern; subdomain `*.localhost` untuk uji multi-tenant lokal |

## Repository Structure

```
saas_lms_frontend/
├── .github/pull_request_template.md
├── contract/                 openapi.yaml (salinan kontrak backend) + README
├── docs/
│   ├── adr/                  catatan keputusan arsitektur
│   ├── architecture/         batas arsitektur, design system, routing aplikasi
│   └── security/             verifikasi keamanan kredensial
├── src/
│   ├── app.html  app.css  app.d.ts  error.html
│   ├── hooks.server.ts       konteks host/tenant, locale, batas sesi, redirect www
│   ├── hooks.client.ts
│   ├── lib/
│   │   ├── api/              client.ts + generated/ (hasil Orval, jangan diedit)
│   │   ├── assets/           brand/ (logo master FLIXARE), fonts/sora/ (Sora + OFL)
│   │   ├── auth/             session.ts, can.ts, access-context.ts, dashboard-routing.ts,
│   │   │                     backend-auth.ts, dev-session.fixture.ts (khusus development)
│   │   ├── components/
│   │   │   ├── layout/       AppShell, WorkspaceShell, PageContainer, NavigationLink
│   │   │   ├── ui/           design system: Button, TextField, Card, Badge, Drawer, ConfirmDialog,
│   │   │   │                 Toast, MetricCard, BarChart, Heatmap, … + icon-registry.ts
│   │   │   └── domain/
│   │   ├── features/         navigation/, master-data/, plans/
│   │   ├── i18n/             id.json, en.json, index.ts
│   │   ├── offline/
│   │   └── utils/            host-context.ts, app-paths.ts
│   └── routes/
│       ├── (auth)/           /login (semua host), /join (tryout tamu), /logged-out
│       ├── logout/           POST /logout → /logged-out
│       ├── (public)/         / → dashboard atau /login, /register, /register/plan; /select-context, /access-denied
│       ├── (platform)/       /console, /settings/navigation, /settings/master-data, /settings/plans
│       ├── (school)/         /app (pemilih area), /app/{admin,teacher,student,guardian}
│       │                     *.fixture.ts = data contoh khusus development, tidak masuk build produksi
│       └── (join)/           /s/[sessionCode]
├── static/favicon.png        (logogram master FLIXARE)
├── .env.example  .gitattributes  .gitignore  .npmrc  .nvmrc  .prettierrc  .prettierignore
├── eslint.config.js  svelte.config.js  vite.config.ts  tsconfig.json  orval.config.ts
├── package.json  pnpm-lock.yaml
├── AI-CONTEXT.md
└── README.md
```

---

## Frontend Foundation Baseline

> Setiap developer dan AI agent **wajib** membaca bagian ini sebelum mengubah repository. Perubahan pada baseline membutuhkan keputusan arsitektur tertulis.

| Area | Baseline |
|---|---|
| Runtime | **Node.js 24 LTS** (`.nvmrc` = `24`) |
| Package manager | **pnpm 12.8.1** (`packageManager` di `package.json`) |
| Framework | **SvelteKit 2.70.3** — SvelteKit 3 tidak dipakai tanpa keputusan arsitektur |
| UI runtime | **Svelte 5.57.1** |
| Language | **TypeScript** (strict) |
| CSS | **Tailwind CSS 4.3.3**; kelas kustom berawalan `lms-` |
| Component library | **Skeleton 5.0.1**, dibungkus di `components/ui` |
| Icons | **`@lucide/svelte` 1.49.0** (pin exact), hanya lewat komponen `Icon` |
| Design system | **FLIXARE** (Brand Guidelines v1.0): brand token → semantic → component (`lms-*`) di `src/app.css`; Royal Blue `#4169E1` / Growth Green `#3FAE78` (progres, **bukan** success) / Deep Neutral `#172554` / Soft Background `#F8FAFC`; font **Sora** (self-hosted, OFL); light mode dan dark mode (biru tua) mengikuti palet referensi; kontras terukur. Detail: [design-system.md](docs/architecture/design-system.md) |
| Adapter | **`@sveltejs/adapter-node` 5.x** → server Node.js (bukan static) |
| Validation | **Zod 4.x** — UX/batas tipe form; bukan batas keamanan |
| API contract | **OpenAPI**, contract-first; tidak boleh dikarang |
| API client | **Generated TypeScript client** via **Orval** → `src/lib/api/generated/` (tidak diedit manual) |
| State | **Svelte 5 runes** (`$state`, `$derived`, `$effect`) |
| i18n | Teks UI lewat `src/lib/i18n/` (`id.json`, `en.json`); kunci `<module>.<screen>.<element>`; SSR mengisi `<html lang="id">` |
| Testing | **Vitest + Testing Library + Playwright** |
| Formatter | **Prettier 3** + `prettier-plugin-svelte` (tab, single quote, width 100); Markdown dikecualikan |
| Boundary enforcement | ESLint `no-restricted-imports`/`globals`/`properties` per layer |
| Architecture | Route → Feature → Domain Component → UI Component → Infrastructure |
| API direction | Route/Feature → Feature API → Generated client → HTTP → Backend |
| Authentication | **Backend authoritative**; access + refresh token di cookie HttpOnly host-only; tidak ada token di storage browser |
| Tenant | `<tenant>.<root>` → `hooks.server.ts` → konteks tenant → backend (otoritas final). Tidak memercayai tenant ID dari klien |
| Hosts | `<root>` publik · `www.<root>` → `<root>` · `platform.<root>` konsol (`/console`, `/settings/*`) · `<tenant>.<root>` (`/app`, `/s/<kode>`) · browser API `<current-host>/api/v1` · non-browser `api.<root>` |
| Authorization | `<module>.<action>`, mis. `can('assessment.create')`; UI saja, backend otoritas |
| CSRF | Wajib untuk operasi tulis; backend otoritas; frontend tidak membuat mekanisme sendiri |
| PWA | **Web-first**; PWA offline dan aplikasi Capacitor direncanakan sebagai build terpisah |
| Security | **Tidak ada secret di repository.** Tidak ada token di storage browser. Tidak ada URL berisi kredensial |
| Vocabulary | Kosakata baku: `institution`, `assessment` (bukan `exam`), `attempt`, ... |

Topologi host bersifat tetap; nilai domain (`namalms.id`) adalah contoh production dan selalu dibaca dari `PUBLIC_LMS_ROOT_DOMAIN`.

---

## Frontend Installation & Development

Semua tugas proyek dijalankan lewat `pnpm <script>`, yang sama di Linux, macOS, dan Windows. Perintah khusus OS hanya dipakai untuk menyiapkan Node.js, menyalin `.env`, dan mengatur shell. Perintah Linux memakai sintaks yang sama dengan macOS. Perintah Windows PowerShell disusun mengikuti dokumentasi resmi dan belum dijalankan langsung di Windows.

### Common Prerequisites

Berlaku untuk semua OS:

1. **Git** — dari paket manager OS atau <https://git-scm.com/downloads>.
2. **Node.js 24 LTS** — langsung dari <https://nodejs.org/> (pilih rilis 24.x) atau lewat version manager (lihat bagian setup per OS).
3. **Corepack** — dibundel dengan Node.js 24. Dipakai untuk mengaktifkan pnpm versi yang dikunci.
4. **pnpm 12.8.1** — lewat Corepack. Setelah repository di-clone, field `packageManager` membuat Corepack otomatis memakai 12.8.1 di dalam proyek.

### Linux/macOS Setup

```bash
# Node.js 24 via nvm (opsional; bisa juga installer resmi nodejs.org)
nvm install          # membaca .nvmrc → 24
nvm use

# pnpm 12.8.1 via Corepack
corepack enable
corepack prepare pnpm@12.8.1 --activate

# Clone
git clone https://github.com/evanandrian/saas_lms_frontend.git
cd saas_lms_frontend
```

Alternatif bila Corepack tidak tersedia: `npm install -g pnpm@12.8.1`.

### Windows Setup (PowerShell)

Jalur utama adalah **Windows native + PowerShell**. Semua blok di bawah adalah perintah PowerShell.

**1. Git** — pasang Git for Windows dari <https://git-scm.com/download/win>. Repository memakai `.gitattributes` (`eol=lf`), jadi file tetap LF walau `core.autocrlf=true`; ini mencegah `pnpm format:check` gagal karena CRLF.

**2. Node.js 24 LTS** — pilih **salah satu**:

- **A. Instalasi langsung (disarankan)** — unduh installer Windows (`.msi`, x64) untuk rilis **24.x** dari <https://nodejs.org/>. Jangan memilih versi mayor lain.
- **B. NVM for Windows (opsional)** — <https://github.com/coreybutler/nvm-windows>. NVM for Windows berjalan di **PowerShell yang dibuka sebagai Administrator**, sebaiknya dipasang setelah instalasi Node.js lain dihapus, dan **tidak membaca `.nvmrc`** — versi harus ditulis eksplisit:

  ```powershell
  # PowerShell sebagai Administrator
  nvm install 24.21.0
  nvm use 24.21.0
  ```

  `nvm install` / `nvm use` tanpa versi (gaya nvm Unix) **tidak berlaku** di NVM for Windows.

**3. pnpm 12.8.1 via Corepack**

```powershell
corepack enable
corepack prepare pnpm@12.8.1 --activate
```

Bila Node.js terpasang di `C:\Program Files\nodejs`, `corepack enable` perlu menulis ke folder itu, jadi jalankan PowerShell sebagai Administrator. Alternatif: `npm install -g pnpm@12.8.1`.

**4. Verifikasi toolchain**

```powershell
node --version   # v24.x.y
pnpm --version   # 12.8.1
git --version
```

**5. Clone**

```powershell
git clone https://github.com/evanandrian/saas_lms_frontend.git
Set-Location saas_lms_frontend
```

**Shell lain di Windows:**

| Shell | Status | Catatan |
|---|---|---|
| PowerShell | **Jalur utama** | Ikuti blok PowerShell di README ini |
| Git Bash | Opsional | Perintah Linux/macOS (`cp`, `export`) berlaku. Terminal berbasis `mintty` (Git Bash) memakai `winpty` untuk TTY; skrip `pnpm` tidak terdampak |
| WSL | Opsional, **tidak wajib** | Ikuti jalur Linux di dalam distro WSL. Simpan repository di filesystem WSL, bukan di `/mnt/c` |

### Environment Configuration

Gunakan file `.env` untuk konfigurasi lokal di semua OS — tidak perlu `export VAR=...`.

Linux/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Lalu sunting `.env`:

| Variable | Required | Purpose | Example |
|---|---|---|---|
| `PUBLIC_LMS_ROOT_DOMAIN` | Ya | Root domain untuk resolusi host di `hooks.server.ts`; dibaca saat runtime. Tanpa nilai, semua host mendapat 404 (fail-closed) | `localhost` |
| `LMS_API_INTERNAL_URL` | Tidak (development) | Alamat backend untuk server SvelteKit. Saat development bawaannya `http://localhost:8080`; wajib diisi di production | `http://localhost:8080` |

`.env` di-ignore Git. Jangan menaruh rahasia di `.env.example` atau README. `pnpm dev`, `pnpm preview`, dan `node --env-file=.env build` membaca `.env`.

### Install Dependencies

```bash
pnpm install                    # development
pnpm install --frozen-lockfile  # CI/verifikasi; gagal bila lockfile tidak sinkron
```

Perintahnya sama di semua OS. pnpm 12 memverifikasi lockfile terhadap kebijakan supply-chain sebelum menjalankan script; pada jaringan lambat langkah ini bisa sekitar satu menit.

### Start Development Server

```bash
pnpm dev
```

Port default Vite adalah `5173`.

| Host lokal | Area |
|---|---|
| `http://localhost:5173/` | Publik / login |
| `http://platform.localhost:5173/console` | Platform (konsol) |
| `http://<subdomain>.localhost:5173/app` | Tenant (aplikasi sekolah) |
| `http://<subdomain>.localhost:5173/login`, `http://platform.localhost:5173/login` | Halaman masuk |

Bila browser tidak me-resolve `*.localhost`, tambahkan entri `127.0.0.1 <subdomain>.localhost` ke file hosts: Linux/macOS `/etc/hosts`, Windows `C:\Windows\System32\drivers\etc\hosts` (butuh editor yang dibuka sebagai Administrator). `pnpm dev -- --host` hanya diperlukan untuk uji dari perangkat lain di jaringan tepercaya.

### Verification

```bash
node --version       # v24.x.y
pnpm --version       # 12.8.1
pnpm check           # svelte-kit sync + svelte-check (TypeScript strict)
pnpm lint            # ESLint + boundary arsitektur
pnpm format:check    # Prettier
pnpm api:check       # client OpenAPI sinkron dengan contract/openapi.yaml
```

**Lint** mencakup aturan proyek: `localStorage`/`sessionStorage` dilarang, link wajib `resolve()`, dan **boundary arsitektur** (raw `fetch` di route/komponen, impor generated client di luar feature, `document.cookie` di komponen, dll.) — lihat [frontend-architecture-boundaries.md](docs/architecture/frontend-architecture-boundaries.md).

**Formatting:**

```bash
pnpm format          # prettier --write .
pnpm format:check    # prettier --check .
```

Konfigurasi: `.prettierrc` (tab, single quote, tanpa trailing comma, lebar 100, `prettier-plugin-svelte`). `.prettierignore` mengecualikan output build, lockfile, `static/`, dan seluruh `*.md`.

### Update API Client

```bash
# salin kontrak terbaru dari repo backend, lalu generate
cp ../saas_lms_backend/api/openapi.yaml contract/openapi.yaml
pnpm api:generate
```

### Build

```bash
pnpm build                    # server Node.js (adapter-node) di build/ — bukan situs statis
node --env-file=.env build    # menjalankan server hasil build; port default adapter-node 3000
```

`node --env-file=.env` bekerja di semua OS, jadi tidak perlu sintaks `VAR=x node build` khas Unix. Untuk mengganti port, tambahkan `PORT=<port>` ke `.env`.

**Batas ukuran body:** foto profil (maks. 2 MB) dan dokumen pengajuan (maks. 5 MB) dikirim sebagai base64 lewat form action. Atur `BODY_SIZE_LIMIT=8M` di `.env` lokal maupun environment deployment; default adapter-node 512K akan menolak unggahan. Server mencetak peringatan saat start bila nilainya belum cukup. Saat `pnpm dev` (Vite) batas ini tidak berlaku.

**Deployment (bukan `.env` lokal):** aplikasi melayani banyak host, sehingga `ORIGIN` tunggal tidak dapat dipakai. Atur `PROTOCOL_HEADER=x-forwarded-proto`, `HOST_HEADER=x-forwarded-host`, dan `BODY_SIZE_LIMIT=8M`, dan pastikan ingress menimpa kedua header itu (serta mengizinkan body ±8 MB). Tanpa itu, adapter-node menganggap protokol `https`.

### Preview

```bash
pnpm preview
```

Menjalankan hasil build untuk pemeriksaan lokal; membaca `.env`. Bukan server produksi.

### Unit, Component, dan E2E Tests

Belum dikonfigurasi. Rencana lokasi: unit/komponen `<file>.test.ts` di samping file (Vitest + Testing Library), E2E `tests/e2e/<kode-alur>-<nama>.spec.ts` (Playwright).

### Full Quality Gate

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm lint
pnpm format:check
pnpm api:check
pnpm build
```

Urutan ini sama di Linux, macOS, dan Windows.

### Troubleshooting

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| Error versi Node / `engines` / `ERR_PNPM_UNSUPPORTED_ENGINE` | Node bukan 24 | Linux/macOS: `nvm use`. Windows (NVM for Windows): `nvm use 24.21.0`. Cek `node --version` |
| `pnpm` versi lain | Corepack tidak aktif | `corepack enable`; `corepack prepare pnpm@12.8.1 --activate` |
| Corepack gagal memverifikasi signature | Corepack lama | Perbarui ke patch Node.js 24 terbaru, atau `npm install -g pnpm@12.8.1` |
| Windows: `corepack enable` gagal `EPERM` | Node.js di `C:\Program Files` | Jalankan PowerShell sebagai Administrator |
| Windows: `pnpm.ps1 cannot be loaded because running scripts is disabled` | Execution policy PowerShell | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, atau panggil `pnpm.cmd` |
| Windows: `nvm use` tampak tidak berpengaruh | Instalasi Node.js lain masih ada di `PATH` | Ikuti panduan NVM for Windows: hapus instalasi lama; `nvm debug` |
| Windows: `pnpm format:check` gagal di semua file | CRLF dari checkout sebelum `.gitattributes` ada | Jalankan `pnpm format` (Prettier menulis ulang ke LF tanpa membuang perubahan), lalu `pnpm format:check` |
| `pnpm install --frozen-lockfile` gagal | `package.json` dan lockfile tidak sinkron | Jalankan `pnpm install`, commit `pnpm-lock.yaml` |
| Semua halaman 404 | `.env` belum dibuat atau `PUBLIC_LMS_ROOT_DOMAIN` kosong | Salin `.env.example` (lihat Environment Configuration) |
| `<subdomain>.localhost` tidak terbuka | Browser/OS tidak me-resolve `*.localhost` | Coba browser lain atau tambah entri file hosts |
| Halaman konsol menampilkan "Mode simulasi" | Backend tidak berjalan atau sesi belum login lewat backend | Jalankan backend di port 8080, lalu masuk ulang |
| `pnpm api:check` gagal | `contract/openapi.yaml` berubah tanpa generate ulang | Jalankan `pnpm api:generate`, lalu commit hasilnya |
| Login berhasil tetapi sesi hilang | Akses lewat host berbeda dari host API | Akses lewat host tenant; API relatif `/api` |

### Development Workflow

1. `git checkout main` lalu `git pull` — ambil `main` terbaru.
2. Buat branch: `<jenis>/<LMS-n>-<ringkas>` (jenis: feat, fix, chore, refactor, docs, test), mis. `feat/LMS-142-exam-autosave`. **Jangan** mengembangkan langsung di `main`.
3. `pnpm install` bila dependency berubah.
4. Baca [AI-CONTEXT.md](AI-CONTEXT.md), bagian **Frontend Foundation Baseline**, dan [frontend-architecture-boundaries.md](docs/architecture/frontend-architecture-boundaries.md).
5. Implementasi.
6. `pnpm format`, lalu jalankan **Full Quality Gate**.
7. Commit dengan Conventional Commits: `<jenis>(<modul>): <kalimat perintah>`.
8. Buka PR memakai template.

---

## Testing Strategy

| Jenis | Alat | Cakupan |
|---|---|---|
| Unit/komponen | Vitest, Testing Library | Store, skema validasi, komponen inti |
| E2E | Playwright | Alur utama pengguna |
| Keamanan dependency | `pnpm audit` | Setiap rilis |
| Aksesibilitas/performa | Lighthouse | WCAG 2.1 AA halaman inti, perangkat HP RAM 2 GB |

## Documentation

| Dokumen | Isi |
|---|---|
| [AI-CONTEXT.md](AI-CONTEXT.md) | Aturan wajib untuk AI agent |
| [docs/architecture/frontend-architecture-boundaries.md](docs/architecture/frontend-architecture-boundaries.md) | Layer, arah dependency, boundary, pola terlarang, enforcement |
| [docs/architecture/design-system.md](docs/architecture/design-system.md) | Token, warna (kontras terukur), tipografi, logo, ikon, komponen UI, pola halaman |
| [docs/architecture/fe-05-application-entry-routing.md](docs/architecture/fe-05-application-entry-routing.md) | Entry aplikasi, redirect autentikasi, routing dashboard per peran, konteks/membership, route terlindungi |
| [contract/README.md](contract/README.md) | Asal kontrak OpenAPI dan alur generate client |
| `docs/adr/` | Catatan keputusan arsitektur (topologi API & sesi, runtime adapter, generated client) |

## AI Development Rules

Wajib membaca [AI-CONTEXT.md](AI-CONTEXT.md). Ringkas: ikuti **Frontend Foundation Baseline**; jangan mengarang endpoint, OpenAPI, permission, atau model tenant; jangan edit `src/lib/api/generated/`; jangan simpan token di storage browser; semua teks UI lewat i18n; sebutkan asumsi dan konflik dokumen secara eksplisit.
