# saas_lms_frontend

Frontend web untuk **SaaS LMS Multi-Tenant** — platform pembelajaran berbasis langganan untuk sekolah, guru pribadi, dan penyelenggara sesi ujian.

> **Status: fondasi SvelteKit tersedia, belum ada fitur bisnis.** Perintah yang belum tersedia diberi label ⏳ di §12. Lihat [§3](#3-repository-status).

---

## 1. Project Overview

Satu aplikasi SvelteKit melayani tiga area: situs publik dan pendaftaran, konsol pemilik LMS, dan aplikasi sekolah (admin, guru, murid, orang tua/wali), ditambah halaman peserta tamu untuk sesi ujian. Backend berada di repository terpisah `saas_lms_backend` (Go, modular monolith); kontrak antara keduanya adalah OpenAPI (C-06, ADR-016).

## 2. Product Context

- **Tenant:** `school`, `personal` (guru pribadi), `event` (penyelenggara sesi ujian) — satu skema, dibedakan entitlement (ADR-011).
- **Aktor:** pemilik LMS (platform), admin sekolah, kepala sekolah, guru, murid, orang tua/wali, peserta tamu.
- **Jalur kritis:** pengerjaan asesmen (ujian) — autosave ≤ 15 detik, timer otoritatif di server (SAD §6.2, NFR-04, NFR-05).
- **Lingkup tidak termasuk (v1):** SPP, PPDB, video conference, integrasi resmi Dapodik, aplikasi native terpisah.

Acuan utama: **SAD-SDD SaaS LMS Multi-Tenant v1.0.1** (dokumen `.docx` milik pemilik produk; belum disimpan di repository ini).

## 3. Repository Status

| Item | Status |
|---|---|
| Fase saat ini | **FE-05 — Application Entry, Role-Based Dashboard & Watermark Refinement** ([fe-05-application-entry-routing.md](docs/architecture/fe-05-application-entry-routing.md)); baseline visual FE-04R ([design-system.md §21–§22](docs/architecture/design-system.md)) |
| FE-FOUNDATION-02 | `COMPLETE_WITH_BLOCKERS` (blocker downstream saja) |
| FE-FOUNDATION-01 | `COMPLETE_WITH_DOWNSTREAM_BLOCKERS` — fondasi selesai; dependency backend (OpenAPI, kontrak auth, katalog permission) belum tersedia dan **tidak** memblok fase fondasi berikutnya |
| Security gate | **SECURITY_GATE_PASS_WITH_RESIDUAL_RISK** ([credential-exposure-verification.md](docs/security/credential-exposure-verification.md)). Kronologi: finalisasi `BLOCKED_PENDING_H-9` → SECURITY-GATE-01 `PASS_WITH_RESIDUAL_RISK` → FE-FOUNDATION-01 diotorisasi |
| Residual security | Salinan PAT yang sudah di-revoke di log lokal mesin pengembang: **DEFERRED CLEANUP**, bukan blocker |
| Kode aplikasi | Fondasi SvelteKit (shell, route group, hooks, i18n) + pola product UI dan 8 layar referensi FE-04 dengan **data demo dev-only**. **Tanpa fitur bisnis** (aksi bisnis nonaktif) |
| Keputusan arsitektur | [docs/architecture/foundation-decision-resolution.md](docs/architecture/foundation-decision-resolution.md) |
| Reconnaissance | [docs/architecture/repository-reconnaissance.md](docs/architecture/repository-reconnaissance.md) |
| Downstream dependencies | OpenAPI (BLOCKED-01), kontrak auth (BLOCKED-02), katalog permission (BLOCKED-04) — memblok implementasi terkait saja |
| Architecture boundaries | [frontend-architecture-boundaries.md](docs/architecture/frontend-architecture-boundaries.md) (ditegakkan ESLint) |

## 4. Architecture Overview

```
Route        src/routes/(public|platform|school|join)/
  → Feature  src/lib/features/<modul>/   <modul>.api.ts, .schema.ts, .types.ts, .store.svelte.ts
  → Domain component   src/lib/components/domain/
  → UI component       src/lib/components/ui/      (pembungkus Skeleton)
  → Infrastructure     src/lib/api/ (generated + client.ts), auth/, i18n/, offline/, utils/
```

Detail: SAD §5.4, Bagian III §5.1, dan [frontend-architecture-boundaries.md](docs/architecture/frontend-architecture-boundaries.md) (layer, arah dependency, pola terlarang). Runtime: SvelteKit dengan server Node.js (ADR-020).

## 5. Frontend Stack

SvelteKit 2 · Svelte 5 (runes) · TypeScript · Tailwind CSS 4 · Skeleton 5 · Lucide (`@lucide/svelte`, ikon) · adapter-node · Zod 4 · OpenAPI generated client (Orval) · ESLint · Prettier · Vitest + Testing Library · Playwright. Versi terkunci: [§11](#11-frontend-foundation-baseline).

## 6. Multi-Tenant Model

- Satu database per tenant di backend (ADR-004). Frontend **tidak pernah** menjadi sumber kebenaran tenant.
- Tenant dikenali dari subdomain: `<tenant>.<root-domain>`; platform (konsol) di `platform.<root-domain>`; publik di `<root-domain>`, `www` dialihkan ke root (ADR-019, menggantikan `console.namalms.id` di SAD Bagian III §6.3).
- Root domain selalu dari `PUBLIC_LMS_ROOT_DOMAIN`; jangan hardcode domain atau kode tenant.
- Browser memanggil API **same-origin** di `/api/v1/...` pada host tenant (ADR-019).

| Host | Route group | Prefix |
|---|---|---|
| `<tenant>.<root>` | `(school)`, `(join)`, login | `/app/*`, `/s/<sessionCode>`, `/login` |
| `platform.<root>` | `(platform)`, login | `/console/*`, `/login` |
| `<root>` (`www.<root>` → redirect ke `<root>`) | `(public)` | `/`, `/pricing`, `/register` |

## 7. Authentication & Authorization

- **Backend adalah otoritas.** Route guard, `can()`, menu tersembunyi, dan state UI **bukan** batas keamanan.
- Access token (JWT 15 menit) dan refresh token di cookie `HttpOnly; Secure; SameSite=Lax`, host-only (ADR-019). Token tidak pernah disimpan di `localStorage`/`sessionStorage`/IndexedDB.
- Permission: `<module>.<action>` (aksi baku: view, create, update, delete, publish, approve, import, export). Frontend tidak mengarang permission; daftar berasal dari backend.
- Login: email + password dan Google OIDC (ADR-014); MFA TOTP wajib untuk role platform (SAD §9.1).

## 8. API Contract

- Contract-first: `openapi.yaml` di repo backend → client TypeScript di-generate ke `src/lib/api/generated/` (TR-07, ADR-021).
- `generated/` **tidak boleh diedit manual**. Nama fungsi = operationId; nama tipe = skema OpenAPI.
- Respons: `{ data, meta }` / `{ error: { code, message, details, request_id } }`; paginasi keyset (`limit`, `cursor`, `meta.next_cursor`); JSON snake_case.
- Pesan error ke pengguna dari kunci i18n `errors.<KODE>`.

## 9. Development Requirements

Bagian ini adalah **System Requirements lingkungan pengembangan** untuk seluruh developer. Dukungan Windows di bawah adalah dukungan **pengembangan**, bukan klaim deployment: aplikasi di-deploy sebagai server Node.js di container `lms-<env>-web` (ADR-020), bukan di Windows.

### Supported Operating Systems

| OS | Status | Recommended Shell |
|----|--------|-------------------|
| Linux | Supported | Bash/Zsh |
| macOS | Supported | Zsh/Bash |
| Windows | Supported | PowerShell |

| OS | Minimum (mengikuti platform list resmi Node.js 24) | Status verifikasi proyek |
|---|---|---|
| Linux | Distribusi modern dengan glibc ≥ 2.28 dan kernel ≥ 4.18, x64/arm64 (mis. Ubuntu 20.04+, Debian 10+, RHEL 8+) | Perintah sama dengan macOS; **belum** diverifikasi runtime di Linux |
| macOS | macOS ≥ 13.5, x64/arm64 | **Terverifikasi** (macOS arm64, Node v24.21.0, pnpm 12.8.1) |
| Windows | Windows 10/11 64-bit (x64; arm64 berstatus Tier 2 di Node.js) | `DOCUMENTED_NOT_RUNTIME_VERIFIED` — sintaks PowerShell disusun sesuai dokumentasi resmi, belum dijalankan di Windows |

Sumber minimum: `BUILDING.md` Node.js v24.21.0, bagian *Platform list*. Proyek tidak menetapkan batas yang lebih ketat.

### Perangkat yang dibutuhkan (semua OS)

| Kebutuhan | Versi / catatan |
|---|---|
| Git | Versi terkini |
| Node.js | **24 LTS** (`.nvmrc` = `24`; diverifikasi pada v24.21.0). `engines` + `.npmrc` `engine-strict=true` menolak mayor lain |
| pnpm | **12.8.1** (`packageManager`), dipasang lewat Corepack |
| Shell | Linux/macOS: Bash/Zsh. Windows: **PowerShell** (jalur utama). Git Bash dan WSL opsional (§12.4) |
| Akses repository | Akses GitHub ke `evanandrian/saas_lms_frontend` lewat credential manager OS, `gh auth login`, atau SSH — jangan menaruh token di URL atau di riwayat shell |
| Backend API | **Tidak diperlukan** untuk fondasi saat ini |
| Browser | Browser modern; subdomain `*.localhost` untuk uji multi-tenant lokal (§12.7) |

## 10. Repository Structure

Kondisi setelah FE-04:

```
saas_lms_frontend/
├── .github/pull_request_template.md
├── docs/
│   ├── adr/                  ADR-019, ADR-020, ADR-021
│   ├── architecture/         reconnaissance, foundation-decision-resolution, fe-foundation-01-bootstrap,
│   │                         frontend-architecture-boundaries, design-system, FE-04-RECON
│   └── security/             credential-exposure-verification
├── src/
│   ├── app.html  app.css  app.d.ts  error.html
│   ├── hooks.server.ts       konteks host/tenant, locale, batas sesi, redirect www
│   ├── hooks.client.ts
│   ├── lib/
│   │   ├── api/              (kosong — menunggu OpenAPI, BLOCKED-01)
│   │   ├── assets/           brand/ (logo master FLIXARE), fonts/sora/ (Sora + OFL)
│   │   ├── auth/             session.ts (batas sesi), can.ts (helper UX), access-context.ts (konteks/membership),
│   │   │                     dashboard-routing.ts (Dashboard Routing Policy), dev-session.fixture.ts (dev-only)
│   │   ├── components/
│   │   │   ├── layout/       AppShell, WorkspaceShell, PageContainer, NavigationLink
│   │   │   ├── ui/           design system: Button, TextField, Card, Badge, Drawer, ProgressBar,
│   │   │   │                 MetricCard, BarChart, Heatmap, … + icon-registry.ts (design-system.md §14, §19)
│   │   │   └── domain/       (kosong — fase fitur)
│   │   ├── features/         (kosong — fase fitur)
│   │   ├── i18n/             id.json, en.json, index.ts
│   │   ├── offline/          (kosong — Fase 2)
│   │   └── utils/            host-context.ts, app-paths.ts
│   └── routes/
│       ├── (auth)/           /login (semua host), /join (tryout tamu; publik & tenant), /logged-out
│       ├── logout/           POST /logout → /logged-out (konfirmasi via ConfirmDialog)
│       ├── (public)/         / → /login (semua host), /register, /register/plan (root); /select-context, /access-denied (platform & tenant)
│       ├── (platform)/       /console                                   (WorkspaceShell)
│       ├── (school)/         /app (pemilih area), /app/{admin,teacher,student,guardian} (WorkspaceShell)
│       │                     *.fixture.ts = data demo dev-only, tidak masuk build produksi
│       └── (join)/           layout saja; /s/[sessionCode] menunggu kontrak
├── static/favicon.png        (logogram master FLIXARE)
├── .env.example  .gitattributes  .gitignore  .npmrc  .nvmrc  .prettierrc  .prettierignore
├── eslint.config.js  svelte.config.js  vite.config.ts  tsconfig.json
├── package.json  pnpm-lock.yaml
├── AI-CONTEXT.md
└── README.md
```

---

## 11. Frontend Foundation Baseline

> **Ini adalah FRONTEND FOUNDATION BASELINE kanonik.** Setiap AI agent dan developer **wajib** membaca bagian ini sebelum mengubah repository. Perubahan pada baseline membutuhkan ADR.

| Area | Baseline | Sumber / status |
|---|---|---|
| Runtime | **Node.js 24 LTS** (`.nvmrc` = `24`) | Dikunci |
| Package manager | **pnpm 12.8.1** (`packageManager` di `package.json` saat FE-01) | Dikunci |
| Framework | **SvelteKit 2.70.3** — SvelteKit 3 sudah rilis di registry tetapi **tidak** dipakai tanpa ADR | C-01, ADR-020 |
| UI runtime | **Svelte 5.57.1** | C-01 |
| Language | **TypeScript** (strict) | SAD |
| CSS | **Tailwind CSS 4.3.3**; kelas kustom berawalan `lms-` | C-01, Bagian III §5.2 |
| Component library | **Skeleton 5.0.1**, dibungkus di `components/ui` | ADR-002, R-08, H-10 |
| Icons | **`@lucide/svelte` 1.49.0** (pin exact), hanya lewat komponen `Icon` (stroke 1,75) | FE-04 D1 |
| Design system | **FLIXARE** (Brand Guidelines v1.0): brand token → semantic → component (`lms-*`) di `src/app.css`; Royal Blue `#4169E1` / Growth Green `#3FAE78` (progres, **bukan** success) / Deep Neutral `#172554` / Soft Background `#F8FAFC`; font **Sora** (self-hosted, OFL); logo dari artwork master; kontras terukur. Cerberus hanya primitif internal. Dark mode: HUMAN_DECISION_REQUIRED | [design-system.md](docs/architecture/design-system.md) |
| Adapter | **`@sveltejs/adapter-node` 5.x** → server Node.js (bukan static) | ADR-020 (Accepted) |
| Validation | **Zod 4.x** — UX/batas tipe form; bukan batas keamanan | H-5, ADR-021 |
| API contract | **OpenAPI**, contract-first; tidak boleh dikarang | TR-07, ADR-016 |
| API client | **Generated TypeScript client** via **Orval** → `src/lib/api/generated/` (tidak diedit manual); `@lms/api-client` ditunda | ADR-021 (Accepted; implementasi BLOCKED-01) |
| State | **Svelte 5 runes** (`$state`, `$derived`, `$effect`); file `<fitur>.store.svelte.ts` | Bagian III §5.2 |
| i18n | **UI hanya Bahasa Indonesia** (`src/lib/i18n/`); `en.json` dipertahankan sebagai resource dorman, tidak dapat dipilih; tanpa pemilih bahasa, tanpa cookie/persistensi bahasa, tanpa deteksi bahasa browser; SSR mengisi `<html lang="id">`; kunci `<module>.<screen>.<element>` | NFR-13, TR-09, FE-04R |
| Testing | **Vitest + Testing Library + Playwright** | SAD §10.5 |
| Formatter | **Prettier 3** + `prettier-plugin-svelte` (tab, single quote, width 100); Markdown dikecualikan | FE-FOUNDATION-02 |
| Boundary enforcement | ESLint `no-restricted-imports`/`globals`/`properties` per layer | FE-FOUNDATION-02 |
| Architecture | Route → Feature → Domain Component → UI Component → Infrastructure | SAD §5.4 |
| API direction | Route/Feature → Feature API → Generated client → HTTP → Backend | ADR-021 |
| Authentication | **Backend authoritative**; access + refresh token di cookie HttpOnly host-only; tidak ada token di storage browser | ADR-019 (Accepted) |
| Tenant | `<tenant>.<root>` → `hooks.server.ts` → konteks tenant → backend (otoritas final). Tidak memercayai tenant ID dari klien | ADR-019 |
| Hosts | `<root>` publik · `www.<root>` → `<root>` · `platform.<root>` konsol (`/console`) · `<tenant>.<root>` (`/app`, `/s/<kode>`) · browser API `<current-host>/api/v1` · non-browser `api.<root>` | ADR-019, H-6 |
| Authorization | `<module>.<action>`, mis. `can('assessment.create')`; UI saja, backend otoritas | SAD §9.2, H-7 |
| CSRF | Wajib untuk operasi tulis; backend otoritas; frontend tidak membuat mekanisme sendiri | ADR-019 §5, H-8 |
| PWA | **Web-first**; PWA offline di Fase 2; Capacitor Fase 3 (build terpisah) | ADR-003, ADR-020 |
| Security | **Tidak ada secret di repository.** Tidak ada token di storage browser. Tidak ada URL berisi kredensial | SAD §9 |
| Vocabulary | Kosakata baku SAD Bagian III §1: `institution`, `assessment` (bukan `exam`), `attempt`, ... | DECISION-011, H-7 |

Topologi host bersifat kanonik; nilai domain (`namalms.id`) adalah contoh production dan selalu dibaca dari `PUBLIC_LMS_ROOT_DOMAIN`.

Keputusan lengkap dan alasannya: [foundation-decision-resolution.md](docs/architecture/foundation-decision-resolution.md).

---

## 12. Frontend Installation & Development

**Legenda status perintah**

| Label | Arti |
|---|---|
| ✅ **VERIFIED** | Dijalankan dan sukses pada macOS arm64, Node v24.21.0, pnpm 12.8.1 (FE-FOUNDATION-01/02, 2 Okt 2026). Perintah `pnpm …` bersifat lintas platform |
| 🪟 **DOCUMENTED_NOT_RUNTIME_VERIFIED** | Perintah Windows PowerShell; sintaks mengikuti dokumentasi resmi, **belum** dijalankan di Windows |
| ⏳ **NOT_AVAILABLE** | Belum dikonfigurasi di repository; jangan dijalankan |

Perintah Linux memakai sintaks yang sama dengan macOS, tetapi belum diverifikasi runtime di Linux.

**Kebijakan perintah:** semua tugas proyek dijalankan lewat `pnpm <script>`, yang sama di Linux, macOS, dan Windows. Perintah khusus OS hanya muncul untuk menyiapkan Node.js, menyalin `.env`, dan mengatur shell.

### 12.1 System Requirements

Lihat [§9](#9-development-requirements). Ringkas: Git, Node.js 24 LTS, pnpm 12.8.1. Windows memakai PowerShell; WSL **tidak** wajib.

### 12.2 Common Prerequisites

Berlaku untuk semua OS:

1. **Git** — dari paket manager OS atau <https://git-scm.com/downloads>.
2. **Node.js 24 LTS** — langsung dari <https://nodejs.org/> (pilih rilis 24.x) atau lewat version manager (§12.3/§12.4).
3. **Corepack** — dibundel dengan Node.js 24 (terverifikasi: Corepack 0.36.0 pada Node v24.21.0). Dipakai untuk mengaktifkan pnpm versi yang dikunci.
4. **pnpm 12.8.1** — lewat Corepack. Setelah repository di-clone, field `packageManager` membuat Corepack otomatis memakai 12.8.1 di dalam proyek.

### 12.3 Linux/macOS Setup ✅

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

### 12.4 Windows Setup (PowerShell) 🪟

Jalur utama adalah **Windows native + PowerShell**. Semua blok di bawah adalah perintah PowerShell.

**1. Git** — pasang Git for Windows dari <https://git-scm.com/download/win>. Repository memakai `.gitattributes` (`eol=lf`), jadi file tetap LF walau `core.autocrlf=true`; ini mencegah `pnpm format:check` gagal karena CRLF.

**2. Node.js 24 LTS** — pilih **salah satu**:

- **A. Instalasi langsung (disarankan)** — unduh installer Windows (`.msi`, x64) untuk rilis **24.x** dari <https://nodejs.org/>. Jangan memilih mayor lain.
- **B. NVM for Windows (opsional, alat developer — bukan kebutuhan production)** — <https://github.com/coreybutler/nvm-windows>. Menurut dokumentasinya, NVM for Windows berjalan di **PowerShell yang dibuka sebagai Administrator**, sebaiknya dipasang setelah instalasi Node.js lain dihapus, dan **tidak membaca `.nvmrc`** — versi harus ditulis eksplisit:

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
| Git Bash | Opsional | Perintah Linux/macOS (`cp`, `export`) berlaku. Node.js mendokumentasikan bahwa terminal berbasis `mintty` (Git Bash) memakai `winpty` untuk TTY; skrip `pnpm` tidak terdampak |
| WSL | Opsional, **tidak wajib** | Ikuti jalur Linux (§12.3) di dalam distro WSL. Node.js menyatakan WSL *tidak didukung resmi* (binari Linux umumnya berjalan). Simpan repository di filesystem WSL, bukan di `/mnt/c` |

### 12.5 Environment Configuration ✅ / 🪟

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

`.env` di-ignore Git. Jangan menaruh rahasia di `.env.example` atau README. Terverifikasi: `pnpm dev`, `pnpm preview`, dan `node --env-file=.env build` membaca `.env`.

Belum dipakai fondasi (sengaja tidak ada di `.env.example`): `LMS_API_INTERNAL_URL` (ADR-019) dan `PUBLIC_LMS_API_BASE_URL` (Fase 3).

### 12.6 Install Dependencies ✅

```bash
pnpm install                    # development
pnpm install --frozen-lockfile  # CI/verifikasi; gagal bila lockfile tidak sinkron
```

Perintahnya sama di semua OS. pnpm 12 memverifikasi lockfile terhadap kebijakan supply-chain sebelum menjalankan script; pada jaringan lambat langkah ini bisa sekitar satu menit.

### 12.7 Start Development Server ✅

```bash
pnpm dev
```

Port default Vite adalah `5173` (tidak dikonfigurasi khusus).

| Host lokal | Area |
|---|---|
| `http://localhost:5173/` | Publik |
| `http://platform.localhost:5173/console` | Platform (konsol) |
| `http://<subdomain>.localhost:5173/app` | Tenant (aplikasi sekolah) |
| `http://<subdomain>.localhost:5173/login`, `http://platform.localhost:5173/login` | Halaman masuk (kerangka) |

Bila browser tidak me-resolve `*.localhost`, tambahkan entri `127.0.0.1 <subdomain>.localhost` ke file hosts: Linux/macOS `/etc/hosts`, Windows `C:\Windows\System32\drivers\etc\hosts` (butuh editor yang dibuka sebagai Administrator). `pnpm dev -- --host` hanya diperlukan untuk uji dari perangkat lain di jaringan tepercaya.

### 12.8 Verification ✅

```bash
node --version       # v24.x.y
pnpm --version       # 12.8.1
pnpm check           # svelte-kit sync + svelte-check (TypeScript strict)
pnpm lint            # ESLint + boundary arsitektur
pnpm format:check    # Prettier
```

**Lint** mencakup aturan proyek: `localStorage`/`sessionStorage` dilarang (ADR-019), link wajib `resolve()`, dan **boundary arsitektur** (raw `fetch` di route/komponen, impor generated client di luar feature, `document.cookie` di komponen, dll.) — lihat [frontend-architecture-boundaries.md §18](docs/architecture/frontend-architecture-boundaries.md#18-forbidden-patterns).

**Formatting:**

```bash
pnpm format          # prettier --write .
pnpm format:check    # prettier --check .
```

Konfigurasi: `.prettierrc` (tab, single quote, tanpa trailing comma, lebar 100, `prettier-plugin-svelte`). `.prettierignore` mengecualikan output build, lockfile, `static/`, dan seluruh `*.md` (dokumen keputusan/audit dirawat manual).

### 12.9 Build ✅

```bash
pnpm build                    # server Node.js (adapter-node, ADR-020) di build/ — bukan situs statis
node --env-file=.env build    # menjalankan server hasil build; port default adapter-node 3000
```

`node --env-file=.env` bekerja di semua OS, jadi tidak perlu sintaks `VAR=x node build` khas Unix. Untuk mengganti port, tambahkan `PORT=<port>` ke `.env`.

**Deployment (bukan `.env` lokal):** aplikasi melayani banyak host, sehingga `ORIGIN` tunggal tidak dapat dipakai. Atur `PROTOCOL_HEADER=x-forwarded-proto` dan `HOST_HEADER=x-forwarded-host`, dan pastikan ingress menimpa kedua header itu (ADR-020). Tanpa itu, adapter-node menganggap protokol `https`.

### 12.10 Preview ✅

```bash
pnpm preview
```

Menjalankan hasil build untuk pemeriksaan lokal; membaca `.env`. Bukan server produksi.

### 12.11 Unit / Component Tests ⏳ NOT_AVAILABLE

Vitest + Testing Library dijadwalkan di FE-FOUNDATION-09. Lokasi test nantinya `<file>.test.ts` di samping file.

### 12.12 E2E Tests ⏳ NOT_AVAILABLE

Playwright dijadwalkan di FE-FOUNDATION-09. Nama file nantinya `tests/e2e/<kode-alur>-<nama>.spec.ts`.

### 12.13 Full Quality Gate ✅

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm lint
pnpm format:check
pnpm build
```

Urutan ini sama di Linux, macOS, dan Windows. `pnpm test` dan `pnpm test:e2e` ditambahkan pada FE-FOUNDATION-09.

### 12.14 Troubleshooting

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| Error versi Node / `engines` / `ERR_PNPM_UNSUPPORTED_ENGINE` | Node bukan 24 | Linux/macOS: `nvm use`. Windows (NVM for Windows): `nvm use 24.21.0`. Cek `node --version` |
| `pnpm` versi lain | Corepack tidak aktif | `corepack enable`; `corepack prepare pnpm@12.8.1 --activate` |
| Corepack gagal memverifikasi signature | Corepack lama | Perbarui ke patch Node.js 24 terbaru, atau `npm install -g pnpm@12.8.1` |
| 🪟 `corepack enable` gagal `EPERM` | Node.js di `C:\Program Files` | Jalankan PowerShell sebagai Administrator |
| 🪟 `pnpm.ps1 cannot be loaded because running scripts is disabled` | Execution policy PowerShell | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, atau panggil `pnpm.cmd` |
| 🪟 `nvm use` tampak tidak berpengaruh | Instalasi Node.js lain masih ada di `PATH` | Ikuti panduan NVM for Windows: hapus instalasi lama; `nvm debug` |
| 🪟 `pnpm format:check` gagal di semua file | CRLF dari checkout sebelum `.gitattributes` ada | Jalankan `pnpm format` (Prettier menulis ulang ke LF tanpa membuang perubahan), lalu `pnpm format:check` |
| `pnpm install --frozen-lockfile` gagal | `package.json` dan lockfile tidak sinkron | Jalankan `pnpm install`, commit `pnpm-lock.yaml` |
| Semua halaman 404 | `.env` belum dibuat atau `PUBLIC_LMS_ROOT_DOMAIN` kosong | Salin `.env.example` (§12.5) |
| `<subdomain>.localhost` tidak terbuka | Browser/OS tidak me-resolve `*.localhost` | Coba browser lain atau tambah entri file hosts (§12.7) |
| Request `/api` gagal / `ECONNREFUSED` (kelak) | Backend tidak berjalan | Jalankan backend; periksa konfigurasi API |
| Login berhasil tetapi sesi hilang / error CORS (kelak) | Akses lewat host berbeda dari host API | Akses lewat host tenant; API relatif `/api` (ADR-019) |

### 12.15 Development Workflow

1. `git checkout main` lalu `git pull` — ambil `main` terbaru.
2. Buat branch: `<jenis>/<LMS-n>-<ringkas>` (jenis: feat, fix, chore, refactor, docs, test), mis. `feat/LMS-142-exam-autosave`. **Jangan** mengembangkan langsung di `main`.
3. `pnpm install` bila dependency berubah.
4. Baca [AI-CONTEXT.md](AI-CONTEXT.md), README §11, dan [frontend-architecture-boundaries.md](docs/architecture/frontend-architecture-boundaries.md).
5. Baca ADR yang relevan di `docs/adr/` dan bagian SAD terkait (sebutkan ID BR/TR/NFR).
6. Implementasi.
7. `pnpm format`, lalu jalankan quality gate (§12.13).
8. Commit dengan Conventional Commits: `<jenis>(<modul>): <kalimat perintah>`.
9. Buka PR memakai template; cantumkan ID aturan yang disentuh (TR-10).

---

## 13. Testing Strategy

| Jenis | Alat | Cakupan wajib (SAD §10.5) |
|---|---|---|
| Unit/komponen | Vitest, Testing Library | Store, skema validasi, komponen inti |
| E2E | Playwright | Alur F01–F14 |
| Keamanan dependency | `pnpm audit` (padanan `npm audit` di SAD) | Setiap rilis |
| Aksesibilitas/performa | Lighthouse | WCAG 2.1 AA halaman inti, HP RAM 2 GB (NFR-12) |

## 14. Documentation / ADR

| Dokumen | Isi |
|---|---|
| [AI-CONTEXT.md](AI-CONTEXT.md) | Aturan wajib untuk AI agent |
| [docs/architecture/repository-reconnaissance.md](docs/architecture/repository-reconnaissance.md) | FE-FOUNDATION-00 |
| [docs/architecture/foundation-decision-resolution.md](docs/architecture/foundation-decision-resolution.md) | FE-FOUNDATION-DECISION-01 |
| [docs/security/credential-exposure-verification.md](docs/security/credential-exposure-verification.md) | FE-FOUNDATION-SECURITY-GATE-01 |
| [docs/architecture/fe-foundation-01-bootstrap.md](docs/architecture/fe-foundation-01-bootstrap.md) | FE-FOUNDATION-01: toolchain, keputusan implementasi, konflik, verifikasi |
| [docs/architecture/frontend-architecture-boundaries.md](docs/architecture/frontend-architecture-boundaries.md) | FE-FOUNDATION-02: layer, arah dependency, boundary, pola terlarang, enforcement |
| [docs/architecture/design-system.md](docs/architecture/design-system.md) | FE-FOUNDATION-03/03R/FE-04: token, warna (kontras terukur), tipografi, logo, ikon, komponen UI, pola product UI, validasi |
| [docs/architecture/FE-04-RECON.md](docs/architecture/FE-04-RECON.md) | FE-04: analisis layar referensi, risiko, keputusan D1–D6 |
| [docs/architecture/fe-05-application-entry-routing.md](docs/architecture/fe-05-application-entry-routing.md) | FE-05: entry aplikasi, redirect autentikasi, Dashboard Routing Policy, konteks/membership, route terlindungi, watermark |
| [ADR-019](docs/adr/ADR-019-frontend-api-session-topology.md) | Frontend API & Session Topology — Accepted |
| [ADR-020](docs/adr/ADR-020-sveltekit-runtime-adapter-strategy.md) | SvelteKit Runtime & Adapter Strategy — Accepted |
| [ADR-021](docs/adr/ADR-021-openapi-generated-client-strategy.md) | OpenAPI Contract & Generated API Client Strategy — Accepted |

ADR-001..018 ada di SAD §11. ADR baru memakai nomor berikutnya dan tidak pernah menimpa nomor lama. Frontend Foundation Specification v1.0: **tidak tersedia** (BLOCKED-FE-SPEC).

## 15. AI Development Rules

Wajib membaca [AI-CONTEXT.md](AI-CONTEXT.md). Ringkas: ikuti README §11; jangan mengarang endpoint, OpenAPI, permission, atau model tenant; jangan edit `src/lib/api/generated/`; jangan simpan token di storage browser; semua teks UI lewat i18n; sebutkan asumsi dan konflik dokumen secara eksplisit.

## 16. Current Phase / Roadmap

| Fase | Status |
|---|---|
| FE-FOUNDATION-00 — Reconnaissance | Selesai (`REQUIRES_DECISION`) |
| FE-FOUNDATION-DECISION-01 — Keputusan, ADR, dokumentasi | Selesai (`REQUIRES_HUMAN_DECISION`) |
| FE-FOUNDATION-DECISION-01-FINALIZATION — Kunci keputusan, ADR Accepted | Selesai; gate saat itu `BLOCKED_PENDING_H-9` |
| FE-FOUNDATION-SECURITY-GATE-01 — Verifikasi credential exposure | Selesai: `SECURITY_GATE_PASS_WITH_RESIDUAL_RISK` |
| FE-FOUNDATION-01 — Repository & SvelteKit Bootstrap | `COMPLETE_WITH_DOWNSTREAM_BLOCKERS` — [fe-foundation-01-bootstrap.md](docs/architecture/fe-foundation-01-bootstrap.md) |
| FE-FOUNDATION-02 — Architecture Boundary & Dependency Governance | `COMPLETE_WITH_BLOCKERS` — [frontend-architecture-boundaries.md](docs/architecture/frontend-architecture-boundaries.md) |
| FE-FOUNDATION-03 — Design System Foundation | `COMPLETE` |
| FE-FOUNDATION-03R — FLIXARE Brand Integration | Selesai, menunggu review — [design-system.md](docs/architecture/design-system.md) |
| FE-04 — Product UI Pattern & Reference Screen Conformance | Selesai, menunggu review — [design-system.md §19–§20](docs/architecture/design-system.md) |
| FE-04R — Final Visual Conformance Remediation | Selesai, menunggu review — [design-system.md §21](docs/architecture/design-system.md) |
| FE-05 — Application Entry, Role-Based Dashboard & Watermark | Selesai, menunggu review — [fe-05-application-entry-routing.md](docs/architecture/fe-05-application-entry-routing.md) |
| SAD Fase 0 (E0-11) | Shell SvelteKit + login tenant via browser (login bergantung backend E0-07/08) |
| SAD Fase 1 / 1b / 2 / 3 | Lihat SAD Bagian IV |
