# FE-FOUNDATION-01 — Repository & SvelteKit Bootstrap

| Atribut | Nilai |
|---|---|
| Fase | FE-FOUNDATION-01 |
| Tanggal | 2 Oktober 2026 |
| Status | `FOUNDATION_01_COMPLETE_WITH_BLOCKERS` (blocker downstream: OpenAPI, kontrak auth, katalog permission) |
| Security gate | `SECURITY_GATE_PASS_WITH_RESIDUAL_RISK` ([credential-exposure-verification.md](../security/credential-exposure-verification.md)) |
| Acuan | SAD-SDD v1.0.1, ADR-019, ADR-020, ADR-021, README §11 |

## 1. Toolchain terpasang

| Paket | Versi | Alasan |
|---|---|---|
| Node.js | v24.21.0 (lokal via nvm; `engines` `>=24 <25`) | Baseline |
| pnpm | 12.8.1 (`packageManager`) | Baseline |
| `@sveltejs/kit` | 2.70.3 | Baseline (C-01) |
| `svelte` | 5.57.1 | Baseline |
| `@sveltejs/adapter-node` | 5.5.7 | ADR-020 |
| `@sveltejs/vite-plugin-svelte` | 7.3.1 | Peer Kit 2 (mendukung `^7`), membutuhkan Vite 8 |
| `vite` | 8.3.2 | Peer Kit 2 (`^5`..`^8`) |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | Baseline |
| `@skeletonlabs/skeleton` | 5.0.1 | Baseline (H-10). Hanya paket CSS inti; `@skeletonlabs/skeleton-svelte` ditunda ke fase design system karena belum ada komponen yang membutuhkannya |
| `typescript` | 6.0.3 | **Bukan versi terbaru (7.0.2)**: Kit 2 (`^5.3.3 \|\| ^6`), svelte-check (`^5 \|\| ^6`), dan typescript-eslint (`<6.1`) belum mendukung TS 7 |
| `svelte-check` | 4.7.6 | `pnpm check` (SAD §7.3) |
| `eslint`, `@eslint/js` | 10.11.0, 10.0.1 | `pnpm lint` (SAD §7.3) |
| `typescript-eslint` | 8.71.0 | Lint TypeScript |
| `eslint-plugin-svelte` | 3.23.0 | Lint Svelte |
| `globals` | 17.13.0 | Global browser/node untuk ESLint |

**Belum dipasang (disengaja):** Zod (belum ada form; H-5 mengizinkan pemasangan saat fondasi form dibuat), Orval (BLOCKED-01), Vitest/Testing Library/Playwright (FE-FOUNDATION-09), formatter (belum diputuskan).

## 2. Keputusan implementasi

| Topik | Implementasi | Rujukan |
|---|---|---|
| Runes | `vitePlugin.dynamicCompileOptions` memaksa `runes: true` untuk file proyek; library di `node_modules` tidak terpengaruh | README §11 |
| Host context | `resolveHostContext()` → `public` / `www` / `platform` / `api` / `tenant` / `unknown`; satu label DNS; subdomain cadangan `www`, `platform`, `api` | ADR-019 §1 |
| Penegakan host ↔ route group | `+layout.server.ts` per group memanggil `assertHostKind()` → 404 bila host salah. Root layout menolak `api`/`unknown`. `/` di tenant → 307 `/app`, di platform → 307 `/console` | ADR-019 §4 |
| `www` | `hooks.server.ts` → 308 ke root domain (path dan query dipertahankan). Redirect di edge tetap disarankan | ADR-019 §1 |
| Fail-closed | Tanpa `PUBLIC_LMS_ROOT_DOMAIN`, semua host → 404 | — |
| Sesi | `locals.session = { status: 'unresolved' }`; tidak ada parsing JWT, refresh, maupun guard login | ADR-019, BLOCKED-02 |
| Otorisasi | `can(grantedPermissions, '<module>.<action>')` — fungsi murni tanpa katalog | BLOCKED-04 |
| i18n | Modul tanpa dependency; cookie `lms_locale`; default/fallback `id`; tanpa deteksi browser; SSR mengganti `%lms.lang%` di `app.html` | DECISION-008 |
| Error | `+error.svelte` (404, 403, lainnya) ber-i18n; `src/error.html` untuk error di root layout (host tidak dikenal); `handleError` server/client tidak membocorkan detail | SAD §10.2 |
| Loading | Indikator navigasi di `AppShell` (`navigating` dari `$app/state`) | — |
| Aksesibilitas | Skip link, landmark `header`/`nav`/`main`, `aria-expanded`/`aria-controls` pada tombol menu mobile, `aria-current` pada link aktif, label bahasa, satu `h1` per halaman, `<title>` per halaman | NFR-12 (baseline, bukan sertifikasi) |
| Keamanan storage | ESLint `no-restricted-globals`/`no-restricted-properties` menolak `localStorage`/`sessionStorage` | ADR-019 |
| Tema | Skeleton `cerberus` sebagai tema sementara (`data-theme`) — keputusan final di fase design system | — |
| Engine | `.npmrc` `engine-strict=true` | Baseline Node 24 |
| Supply-chain pnpm 12 | Saat install pertama, `vite@8.3.2` (dirilis kurang dari 24 jam sebelumnya) memicu pnpm membuat `pnpm-workspace.yaml` berisi `minimumReleaseAgeExclude`. Pengecualian itu **dihapus** dan range diubah ke `^8.3.1`. Lockfile tetap `8.3.2`, yang sekarang lolos kebijakan tanpa pengecualian | Hardening supply-chain |

## 3. Konflik sumber yang ditemukan (tidak diputuskan diam-diam)

| # | Sumber A | Sumber B | Tindakan |
|---|---|---|---|
| C-1 | Prompt FE-01: "ADR-021: Frontend application foundation direction" | ADR-021 di repo: *OpenAPI Contract & Generated API Client Strategy* | Mengikuti isi ADR-021 di repository; label di prompt dianggap salah sebut |
| C-2 | Prompt FE-01: "Legacy school path model `/s/<school-code>`" | SAD F11 + ADR-019: `/s/<sessionCode>` adalah **kode sesi ujian** untuk peserta tamu (`exam_session_t.session_code`), bukan kode sekolah | Mengikuti SAD/ADR-019. Route `(join)/s/[sessionCode]` ditunda sampai format kode sesi ada di OpenAPI; tidak ada route kode sekolah yang dibuat |
| C-3 | Prompt FE-01: "Non-browser/server-to-server traffic: `api.<root-domain>`" | ADR-019 §2: SSR → `LMS_API_INTERNAL_URL` (internal); `api.<root>` untuk klien non-browser | Tidak berdampak di fase ini (belum ada panggilan API). Nilai `LMS_API_INTERNAL_URL` dapat diarahkan ke `api.<root>` bila topologi deployment menghendaki; ditetapkan saat integrasi API |
| C-4 | Toolchain prompt: TypeScript (tanpa versi) | Registry: TypeScript 7.0.2 tidak didukung peer Kit 2 | Pin 6.0.3 (§1) |
| C-5 | Prompt FE-01 meminta `pnpm format:check` bila ada | Formatter belum diputuskan | `NOT_AVAILABLE`; perlu keputusan pemilik |

## 4. Verifikasi

| Perintah / uji | Hasil |
|---|---|
| `pnpm install` | Sukses (195 paket; lockfile lolos kebijakan supply-chain pnpm 12) |
| `pnpm check` | 0 error, 0 warning |
| `pnpm lint` | 0 masalah |
| `pnpm build` | Sukses (adapter-node) |
| `pnpm dev` | Siap; `smpn1.localhost/app` 200, `platform.localhost/app` 404, `localhost/app` 404 |
| `pnpm preview` | `platform.localhost/console` 200 |
| `node build` — matriks host | `localhost/` 200; `localhost/login` 404; `www.localhost/x?q=1` 308 → root (query dipertahankan); `platform/` 307 `/console`; `platform/console` 200; `platform/login` 200; `platform/app` 404; `tenant/` 307 `/app`; `tenant/app` 200; `tenant/login` 200; `tenant/console` 404; `api.localhost/` 404; `a.b.localhost/app` 404; `evil.example/` 404 |
| i18n SSR | Cookie `lms_locale=en` → `<html lang="en">` + teks Inggris; nilai tidak valid → `id` |
| Root domain kosong | Semua host 404 |
| CSS hasil build | Mengandung utilitas Skeleton (`btn`, `preset-filled`, `preset-tonal`, `bg-surface-50-950`, tema `cerberus`) dan Tailwind (`sr-only`, `md:hidden`) |
| `aria-current` | Muncul pada link aktif di SSR |

**Keterbatasan:** tidak ada pengujian browser nyata (keyboard, screen reader, tampilan mobile) maupun Lighthouse. Verifikasi dilakukan lewat SSR + curl. Interaksi client (toggle menu, ganti bahasa) belum diuji otomatis — dijadwalkan untuk FE-FOUNDATION-09.

## 5. Deferred / blocker downstream

| ID | Item | Fase |
|---|---|---|
| BLOCKED-01 | OpenAPI → Orval → `lib/api/generated`, `client.ts`, `(join)/s/[sessionCode]` | Setelah backend E0-10 |
| BLOCKED-02 | Kontrak auth → login, sesi, refresh, guard `/app` & `/console` | Setelah backend E0-07/08 |
| BLOCKED-04 | Katalog permission → data untuk `can()` | Setelah backend E0-07 |
| OQ-1..OQ-3, OQ-5 | Detail SSR/cookie/CSRF/subdomain cadangan | Backend |
| CSP | Header CSP ketat (SAD §9.6) belum dikonfigurasi | Fase security/hardening |
| Formatter | Keputusan formatter | Keputusan pemilik |
| Test | Vitest, Testing Library, Playwright | FE-FOUNDATION-09 |
| Design system | Tema final, `@skeletonlabs/skeleton-svelte`, komponen `ui/` | FE-FOUNDATION-03 |
| `src/params/` | Matcher `uuid` dibuat saat route berparameter pertama | Fase fitur |
| Residual SEC-01 | Pembersihan log lokal | DEFERRED CLEANUP (pemilik) |
