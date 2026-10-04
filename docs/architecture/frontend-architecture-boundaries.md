# Frontend Architecture Boundaries

| Atribut | Nilai |
|---|---|
| Fase | FE-FOUNDATION-02 — Architecture Boundary & Dependency Governance |
| Tanggal | 2 Oktober 2026 |
| Acuan | SAD-SDD v1.0.1 (§5.4, Bagian III §1, §4, §5), ADR-019, ADR-020, ADR-021, README §11 |
| Enforcement | `eslint.config.js` (rule bawaan ESLint + `@typescript-eslint/no-restricted-imports`) |

Dokumen ini normatif untuk kode di `src/`. Bila bertentangan dengan SAD atau ADR yang diterima, SAD/ADR yang berlaku dan konflik wajib dilaporkan.

---

## 1. Architecture overview

Satu aplikasi SvelteKit 2 (Svelte 5, adapter-node) melayani beberapa host (ADR-019): publik, `platform.<root>`, dan `<tenant>.<root>`. Kode diorganisasi berlapis. Arah dependency selalu dari lapisan komposisi (route) ke lapisan yang lebih generik (UI, infrastruktur), tidak pernah sebaliknya. Backend adalah otoritas final untuk autentikasi, otorisasi, tenant, dan aturan bisnis; frontend hanya mengatur UX.

```
src/
├── hooks.server.ts / hooks.client.ts   composition root: host/tenant context, locale, batas sesi
├── routes/(public|platform|school|join)/   ROUTE
└── lib/
    ├── features/<module>/                  FEATURE
    ├── components/domain/                  DOMAIN COMPONENT
    ├── components/layout/                  LAYOUT (kerangka aplikasi)
    ├── components/ui/                      UI COMPONENT
    └── api/ auth/ i18n/ offline/ utils/    INFRASTRUCTURE
```

## 2. Layer model

| Layer | Lokasi | Tanggung jawab | Contoh saat ini |
|---|---|---|---|
| Composition root | `src/hooks.*.ts`, `src/app.d.ts` | Merakit konteks request (host, locale, sesi) ke `event.locals` | `hooks.server.ts` |
| Route | `src/routes/**` | Komposisi halaman/layout, param, load, error/loading tingkat route, metadata; data demo dev-only (`*.fixture.ts`) | `(school)/app/admin/+page.svelte` |
| Feature | `src/lib/features/<module>/` | Orkestrasi API feature, validasi, state, transformasi, logika interaksi | — (belum ada) |
| Domain component | `src/lib/components/domain/` | Presentasi konsep bisnis | — (belum ada) |
| Layout component | `src/lib/components/layout/` | Kerangka aplikasi lintas area: header, navigasi, container (pemilih bahasa dihapus di FE-04R) | `AppShell.svelte`, `WorkspaceShell.svelte` |
| UI component | `src/lib/components/ui/` | Primitive presentasi generik di atas Skeleton | `Button.svelte`, `Card.svelte`, `Heatmap.svelte` |
| Infrastructure | `src/lib/{api,auth,i18n,offline,utils}/` | Batas ke sistem eksternal dan concern teknis | `i18n/index.ts`, `utils/host-context.ts` |

Layout component adalah perincian dari lapisan komponen (Bagian III §5.1). Aturannya mirip UI component, tetapi boleh memakai i18n dan modul `$app/*` (navigasi, state halaman).

## 3. Dependency direction

```
ROUTE ──► FEATURE ──► INFRASTRUCTURE (api, auth/can, i18n, offline, utils)
  │          │
  │          └──► DOMAIN COMPONENT ──► UI COMPONENT
  ├──► LAYOUT COMPONENT ──► UI COMPONENT
  └──► DOMAIN COMPONENT / UI COMPONENT

DOMAIN COMPONENT ──► tipe feature (import type saja)
INFRASTRUCTURE   ──► sistem eksternal (HTTP, cookie, IndexedDB)
```

| Dari \ Ke | feature | domain | layout | ui | api (generated) | auth/session | host-context | i18n/utils |
|---|---|---|---|---|---|---|---|---|
| route | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (pakai `locals`) | `assertHostKind` saja | ✅ |
| feature | ✅ (milik sendiri; feature lain hanya public) | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ `resolveHostContext` | ✅ |
| domain | `import type` saja | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| layout | ❌ | — | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| ui | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | utils/i18n ✅ |
| infrastructure | ❌ | ❌ | ❌ | ❌ | (api ✅) | ✅ | ✅ | ✅ |

Dependency melingkar dilarang.

## 4. Route boundary

**Boleh:** komposisi halaman/layout, membaca param, `load`/form action yang memanggil feature API, `+error.svelte`, indikator loading, `<svelte:head>`, memanggil `assertHostKind()` untuk menegakkan pemetaan host ↔ route group (ADR-019 §4), membaca `event.locals`.

**Tidak boleh:** raw `fetch()` global, mengimpor `$lib/api/generated`, aturan bisnis, logika keamanan tenant, penanganan token/parsing JWT, katalog permission, logika domain yang dapat dipakai ulang, mengimpor `$lib/auth/session`, atau memanggil `resolveHostContext()`.

`fetch` yang diterima sebagai parameter `load` tetap diizinkan, tetapi hanya untuk diteruskan ke feature API.

## 5. Feature boundary

Struktur kanonik (Bagian III §5.2) — file dibuat hanya bila dibutuhkan:

```
src/lib/features/<module>/
├── <module>.api.ts           orkestrasi panggilan generated client
├── <module>.schema.ts        skema Zod 4
├── <module>.types.ts         tipe feature (turunan dari tipe OpenAPI, bukan duplikat)
├── <module>.store.svelte.ts  state rune feature
├── <module>.utils.ts         transformasi khusus feature
├── components/               komponen khusus feature
└── internal/                 detail implementasi; tidak boleh diimpor feature lain
```

**Tidak boleh:** UI primitive generik, bergantung pada route atau komponen layout, mengimpor `internal/` feature lain, mengimplementasikan concern infrastruktur (HTTP mentah, cookie, storage), membaca internal sesi, atau me-resolve host.

## 6. Domain component boundary

Merepresentasikan konsep bisnis, mis. `AssessmentStatus` atau `ScoreSummary`. Contoh ini hanya definisi; **komponennya tidak dibuat di FE-02**. Boleh memakai UI component dan tipe feature (`import type`). Tidak boleh memakai raw fetch, API/generated client, token, JWT, resolver tenant, storage browser, maupun runtime feature (API/state).

## 7. UI component boundary

Primitive presentasi generik (Button, Input, Dialog, Badge, Card, Table) di atas Skeleton (R-08). Tidak mengetahui endpoint, token, tenant, permission, atau aturan bisnis LMS. Tidak bergantung pada feature, API, auth, host-context, maupun komponen layout/domain. **Satu-satunya component foundation adalah Skeleton**; tidak ada library komponen kedua. Katalog komponen dan token: [design-system.md](design-system.md) (FE-FOUNDATION-03). Komponen UI saat ini: lihat design-system.md §14 dan §19.1 (FE-04 menambah 20 komponen pola produk, mis. `Card`, `Badge`, `ProgressBar`, `Heatmap`, `Drawer`).

Ikon (FE-04): `@lucide/svelte` adalah satu-satunya library ikon, dipakai lewat `Icon`. `icon-registry.ts` (`UI_ICONS`) memetakan kunci string → komponen ikon agar data `load` server tetap dapat diserialisasi; registry ini presentasi murni, bukan katalog bisnis.

### 7a. Data demo route (FE-04)

- Data demo hanya di `*.fixture.ts` yang ko-lokasi dengan route pemakainya, dimuat di `+page.server.ts`/`+layout.server.ts` dengan `dev ? (await import('./x.fixture')).x : null`. Build produksi tidak menyertakan modul fixture (diverifikasi lewat `grep` di `build/`); halaman menampilkan `StatePanel` "Data belum tersedia".
- Fixture bukan kontrak API. Bentuk data final mengikuti OpenAPI (BLOCKED-01) dan fixture akan dihapus saat feature API tersedia.
- Fixture tidak boleh diimpor komponen `$lib`, tidak berisi logika, dan tidak berisi data pribadi nyata.
- Pengecualian FE-05: `src/lib/auth/dev-session.fixture.ts` (sesi contoh lintas route, dimuat dari hooks). Wajib pola `dev ? await import(...) : null` — pola `if (!dev) error(); await import()` membuat modul ikut build produksi.

## 8. Infrastructure boundary

| Modul | Isi | Public API saat ini |
|---|---|---|
| `api/` | Generated client (Orval) + `client.ts` | Belum ada (BLOCKED-01) |
| `auth/` | Batas sesi, helper permission UX | `session.ts` (hanya hooks/infrastruktur), `can.ts` |
| `i18n/` | Kamus dan terjemahan | `setI18n`, `useI18n`, `translate`, `DEFAULT_LOCALE` |
| `offline/` | IndexedDB autosave (Fase 2) | Belum ada |
| `utils/` | Utilitas teknis | `host-context.ts`, `app-paths.ts` |

Infrastruktur tidak bergantung ke atas (feature, komponen, route). Cookie, storage, dan HTTP hanya disentuh di infrastruktur.

## 9. API boundary

```
OpenAPI (backend) → Orval → src/lib/api/generated/ → src/lib/api/client.ts (fetcher)
  → src/lib/features/<module>/<module>.api.ts → route / komponen
```

- OpenAPI **belum tersedia** (BLOCKED-01). Tidak ada spec, endpoint, operationId, DTO, schema respons, maupun client yang dibuat.
- `generated/` dibuat otomatis, tidak diedit manual, dan tidak berisi logika bisnis (ADR-021).
- Hanya feature API (dan `src/lib/api/` sendiri) yang boleh mengimpor `generated/`.
- Browser memanggil `/api/v1/...` same-origin; SSR memakai `LMS_API_INTERNAL_URL` (ADR-019 §2).

## 10. Auth boundary

- Kontrak auth backend **belum tersedia** (BLOCKED-02). Tidak ada endpoint, payload token, klaim JWT, DTO pengguna/sesi, kode error auth, maupun semantik refresh yang dikarang.
- Prinsip yang berlaku (ADR-019): access token berumur pendek; access + refresh token di cookie HttpOnly host-only; tidak ada token di storage browser; backend otoritas final.
- Batas saat ini: `event.locals.session` bertipe `SessionState` (`unresolved` | `authenticated` + `AccessContext`) yang diisi `hooks.server.ts`. Produksi selalu `unresolved` (anonim); `authenticated` hanya dari sesi contoh dev (FE-05). Route dan komponen membaca sesi lewat `locals`/data `load`, bukan dengan mengimpor internal `$lib/auth/session`.
- Keputusan landing dan akses route hanya di `src/lib/auth/dashboard-routing.ts` (Dashboard Routing Policy, FE-05). Route memanggil `enforceRouteAccess`/`resolveLanding`/`resolvePostAuthDestination`; **dilarang** percabangan peran/area di route, layout, komponen, atau sidebar. Detail: [fe-05-application-entry-routing.md](fe-05-application-entry-routing.md).
- Integrasi kontrak kelak hanya mengubah `src/lib/auth/session.ts`, `hooks.server.ts`, dan `src/lib/api/client.ts`.

## 11. Tenant boundary

- Konteks berasal dari host (ADR-019): `resolveHostContext()` hanya dipanggil di `hooks.server.ts` → `event.locals.host`.
- Route menegakkan pemetaan host ↔ route group dengan `assertHostKind()` (404 bila tidak sesuai). Ini aturan routing, **bukan** kebijakan keamanan tenant.
- Tidak ada tenant ID hardcoded, penerimaan tenant ID sembarang dari klien, tenant switching palsu, otorisasi lintas tenant, maupun kebijakan keamanan tenant di frontend. Backend memvalidasi `TENANT_MISMATCH`/`TENANT_NOT_FOUND`.
- Komponen (UI, layout, domain) tidak mengimpor `host-context`.

## 12. Authorization boundary

- Abstraksi UI: `can(grantedPermissions, '<module>.<action>')`, mis. `can(granted, 'assessment.create')`.
- `grantedPermissions` berasal dari backend. Katalog permission **belum tersedia** (BLOCKED-04). Tidak ada katalog, role matrix, seed, daftar permission palsu, maupun policy engine.
- `can()` hanya mengatur tampilan (sembunyikan/nonaktifkan aksi). Keputusan keamanan tidak pernah didasarkan pada `can()`.

## 13. State boundary

Svelte 5 runes (`$state`, `$derived`, `$effect`) — dipaksa compile option `runes: true` untuk kode proyek.

| Prioritas | Lingkup | Lokasi |
|---|---|---|
| 1 | State lokal komponen | `let x = $state(...)` di komponen |
| 2 | State feature | `<module>.store.svelte.ts` |
| 3 | State sesi/aplikasi | `event.locals` → data `load`; context Svelte bila perlu (contoh: i18n) |

Tidak ada Redux, Zustand, Pinia, MobX, atau library state global lain tanpa ADR. Tidak ada direktori `src/store/` global. Hindari state global mutable, state ganda, dan state yang seharusnya `$derived`. State lintas feature hanya lewat public boundary feature.

## 14. i18n boundary

- `src/lib/i18n/`: `id.json`, `en.json`, `index.ts`. **UI hanya Bahasa Indonesia (FE-04R):** `hooks.server.ts` menetapkan `locals.locale = DEFAULT_LOCALE` (`id`); SSR mengisi `<html lang>`. `en.json` dipertahankan sebagai resource dorman (paritas kunci tetap dijaga) tetapi **tidak dapat dipilih**: tidak ada pemilih bahasa, cookie/persistensi bahasa, maupun deteksi bahasa browser.
- Kunci: `<module>.<screen>.<element>`; pesan error backend: `errors.<KODE>`.
- Kamus hanya di `src/lib/i18n/`, tidak pernah di route. Komponen memakai `useI18n().t(...)`.
- Mengaktifkan bahasa kedua kelak adalah keputusan produk baru (UI pemilih + mekanisme preferensi), bukan perubahan diam-diam di komponen.

## 15. Import rules

- Alias tunggal: `$lib` (bawaan SvelteKit), plus modul virtual `$app/*` dan `$env/*`. Tidak ada alias baru.
- Di dalam satu feature/modul: impor relatif. Antar-lapisan: `$lib/...`.
- Tidak ada deep import ke `internal/` feature lain.
- Tidak ada impor ke `src/routes/**` dari `$lib`.
- Komponen diimpor dengan ekstensi `.svelte`; modul TypeScript tanpa ekstensi.

## 16. Naming rules

| Unsur | Aturan | Contoh |
|---|---|---|
| Komponen | `PascalCase.svelte` | `AppShell.svelte` |
| Folder route | kebab-case Inggris; koleksi jamak | `question-bank/` |
| Route group | huruf kecil dalam kurung | `(school)` |
| Param route | camelCase + matcher | `[assessmentId=uuid]` |
| File feature | `<feature>.<type>.ts` | `assessment.api.ts`, `assessment.store.svelte.ts` |
| Utilitas | kebab-case | `host-context.ts` |
| Fungsi/variabel | camelCase | `resolveHostContext` |
| Konstanta | `UPPER_SNAKE_CASE` | `LOCALE_COOKIE` |
| Event handler | `handle<Action>` | `handleChangeLocale` |
| Props callback | `on<Event>` | `onSaved` |
| Test | `<file>.test.ts` di samping file | `host-context.test.ts` |
| Kelas CSS kustom | `lms-<name>` | `lms-exam-timer` |
| Kunci i18n | `<module>.<screen>.<element>` | `common.shell.menu` |

## 17. Domain vocabulary

Kosakata baku SAD Bagian III §1: `institution`, `class` (TS: `schoolClass`), `subject`, `student`, `guardian`, `assessment`, `attempt`, `assignment`, `submission`, `score`, `final_grade`, `report_card`, `learning_objective`, `attendance`, `seat`; `exam` hanya untuk `exam_session`.

- **`institution`, bukan `school_unit`.** Prompt FE-02 mencantumkan `school_unit`, tetapi SAD Bagian III §1 secara eksplisit melarangnya ("institution — jangan pakai: school_unit, branch"). Ini sudah diselesaikan di DECISION-011 (foundation-decision-resolution.md §15). Lihat §26.
- UI boleh berbeda dengan domain, mis. label "Ujian" untuk `assessment`. Identifier kode, route, permission, dan kunci i18n tetap memakai istilah domain.
- `/s/` adalah alur **kode sesi ujian** (`(join)/s/[sessionCode]`, SAD F11). **Bukan** route kode sekolah — tidak ada `/s/[schoolCode]`. Sekolah/tenant dikenali dari subdomain.

## 18. Forbidden patterns

| Pola | Alasan | Enforcement |
|---|---|---|
| `fetch()` global di route/komponen | Melewati feature API | ESLint `no-restricted-globals` |
| Impor `$lib/api/generated` dari route/komponen | ADR-021 | ESLint |
| Komponen mengimpor `$lib/api/**` | Komponen tidak tahu API | ESLint |
| `localStorage`/`sessionStorage` di mana pun | ADR-019 | ESLint |
| `document.cookie` di route/komponen | Cookie milik infrastruktur | ESLint `no-restricted-properties` |
| Route/feature/komponen mengimpor `$lib/auth/session` | Internal sesi | ESLint |
| `resolveHostContext` di luar hooks | Satu titik resolusi tenant | ESLint (`importNames`) |
| UI mengimpor feature/auth/host-context/layout/domain | UI generik | ESLint |
| Domain mengimpor runtime feature | Hanya tipe | ESLint (`allowTypeImports`) |
| Infrastruktur mengimpor feature/komponen/route | Arah dependency | ESLint |
| `$lib/features/*/internal/**` dari luar | Internal feature | ESLint |
| `src/controllers`, `services`, `repositories`, `models`, `src/store` | Menyalin arsitektur backend / state global | Review (DEFERRED) |
| Dependency melingkar | Arah dependency | Review + skrip verifikasi ad-hoc (DEFERRED) |
| Impor relatif lintas feature (`../other-feature/...`) | Internal feature | Review (DEFERRED) |
| OpenAPI/endpoint/DTO/client/permission/role/JWT/login palsu | BLOCKED-01/02/04 | Review |
| Tenant ID hardcoded | ADR-019 | Review + secret/pattern scan |
| Library komponen atau state kedua | ADR-002 / tanpa ADR | Review |

## 19. Cross-feature communication

- Default: tidak ada dependency antar-feature. Komposisi lintas feature dilakukan di **route**.
- Bila benar-benar diperlukan, feature B hanya boleh memakai **public boundary** feature A (`$lib/features/a` atau file `a.api.ts`/`a.types.ts`), tidak pernah `internal/`.
- Tidak dibuat dependency lintas feature hanya untuk demonstrasi.

## 20. Future OpenAPI integration

1. Backend menerbitkan `openapi.yaml` (E0-10).
2. Salinan ter-pin di repo frontend + catatan asal (ADR-021).
3. Pasang Orval (pin eksak) → output `src/lib/api/generated/`.
4. Buat `src/lib/api/client.ts` (mutator Orval): base URL, error envelope `{ error: { code } }` → error bertipe, `X-Request-ID`.
5. CI: generate ulang + `git diff --exit-code`.
6. Feature API memanggil fungsi generated; route memanggil feature API.

Tidak ada perubahan pada route/komponen yang sudah ada, karena keduanya tidak pernah menyentuh HTTP.

## 21. Future auth integration

1. Kontrak auth tersedia di OpenAPI (BLOCKED-02) dan OQ-1..OQ-3 terjawab.
2. `src/lib/auth/access-context.ts`: sesuaikan `toAccessContext()` dengan respons identitas/membership backend (satu-satunya adapter).
3. `hooks.server.ts`: ganti sesi contoh dev dengan sesi dari backend. Guard `/app` & `/console` → `/login?redirectTo=…` **sudah ada** (FE-05, `enforceRouteAccess`).
4. `client.ts`: refresh single-flight antar-tab (Web Locks) + retry sekali.
5. Halaman login memakai form action + Zod schema di feature `auth`.

## 22. Future permission integration

1. Katalog dari backend (BLOCKED-04), kemungkinan bagian dari respons sesi.
2. Permission milik pengguna dimuat ke data layout (`Set<string>`).
3. Komponen/route memanggil `can(granted, '<module>.<action>')` untuk UX.
4. Tidak ada daftar permission yang ditulis tangan di frontend. Bila diperlukan konstanta bertipe, konstanta itu di-generate dari kontrak.

## 23. Architecture enforcement

| Mekanisme | Status |
|---|---|
| ESLint `no-restricted-imports` / `@typescript-eslint/no-restricted-imports` per area | **Aktif** |
| ESLint `no-restricted-globals` (`fetch`, storage) dan `no-restricted-properties` (`document.cookie`, storage) | **Aktif** |
| `svelte/no-navigation-without-resolve` (link internal wajib `resolve()`) | **Aktif** (bawaan `eslint-plugin-svelte`) |
| Runes wajib (`dynamicCompileOptions`) | **Aktif** |
| Prettier (`pnpm format:check`) | **Aktif** |
| Deteksi dependency melingkar | **DEFERRED** — butuh plugin tambahan (mis. `eslint-plugin-import-x`) yang relatif berat; untuk sekarang diverifikasi lewat review + skrip ad-hoc (FE-02: 0 siklus) |
| Impor relatif lintas feature | **DEFERRED** — `no-restricted-imports` tidak dapat membedakan `../components` (sah) dan `../other-feature` (dilarang) tanpa plugin tambahan |
| Larangan direktori gaya backend | **DEFERRED** — review |
| Lint penamaan file | **DEFERRED** — saat ini diverifikasi skrip saat review; dipertimbangkan bersama CI |

Aturan diuji dengan probe stdin (tanpa membuat file) pada FE-02: setiap pola terlarang di §18 yang ditandai ESLint terbukti ditolak, dan pola yang diizinkan lolos.

## 24. Allowed examples

```ts
// src/routes/(school)/app/+page.server.ts — route → feature API (kelak)
import { listItems } from '$lib/features/example/example.api';
export const load = async ({ fetch }) => ({ items: await listItems(fetch) });
```

```ts
// src/routes/(school)/+layout.server.ts — routing guard host
import { assertHostKind } from '$lib/utils/host-context';
export const load = ({ locals }) => assertHostKind(locals.host, ['tenant']);
```

```svelte
<!-- src/lib/components/domain/ExampleStatus.svelte — domain → tipe feature + UI -->
<script lang="ts">
	import type { ExampleStatus } from '$lib/features/example/example.types';
	let { status }: { status: ExampleStatus } = $props();
</script>
```

```ts
// src/hooks.server.ts — composition root mengisi konteks request (FE-04R: locale tetap `id`)
import { DEFAULT_LOCALE } from '$lib/i18n';
```

`example` adalah placeholder ilustrasi, bukan feature.

## 25. Forbidden examples

```ts
// ❌ route → raw fetch
export const load = async () => (await globalThis.fetch('/api/v1/x')).json();

// ❌ route → generated client
import { getX } from '$lib/api/generated/x';

// ❌ komponen → token di storage
localStorage.setItem('access_token', token);

// ❌ route/komponen → parsing JWT
const claims = JSON.parse(atob(token.split('.')[1]));

// ❌ katalog permission buatan frontend
export const PERMISSIONS = ['assessment.create', 'score.publish'];

// ❌ deep import internal feature lain
import { helper } from '$lib/features/other/internal/helper';

// ❌ route kode sekolah
// src/routes/(join)/s/[schoolCode]/+page.svelte

// ❌ istilah domain baru
// src/lib/features/exam/exam.api.ts  → gunakan assessment
```

---

## 26. Conflicts recorded in FE-02

| # | Sumber A | Sumber B | Implementasi | Dampak | Keputusan |
|---|---|---|---|---|---|
| CF-1 | Prompt FE-02 (Domain Vocabulary): `school_unit` sebagai istilah kanonik | SAD Bagian III §1: `institution`; `school_unit` dilarang. DECISION-011 RESOLVED | Tidak ada kode domain; dokumentasi memakai `institution` | Rendah (belum ada kode) | Mengikuti SAD (otoritas lebih tinggi); tidak perlu ADR. Pemilik dapat mengonfirmasi |
| CF-2 | Prompt FE-02: "Utility harus benar-benar generic" | `src/lib/utils/host-context.ts` berisi logika host/tenant routing (ditempatkan FE-01 karena pohon kanonik tidak memiliki `tenant/`) | Dipertahankan; tidak berisi aturan bisnis maupun kebijakan keamanan | Rendah | Diterima sebagai utilitas infrastruktur routing. Opsi masa depan: pindah ke `src/lib/tenant/` — perubahan pohon kanonik, butuh keputusan pemilik bila diinginkan |

## 27. Developer environment portability

Linux, macOS, dan Windows (PowerShell native) adalah lingkungan pengembangan yang didukung (README §9). Ini bukan klaim deployment; deployment mengikuti ADR-020.

| Aturan | Implementasi |
|---|---|
| Tugas proyek hanya lewat `pnpm <script>` | Script di `package.json` tidak memakai sintaks khusus shell Unix maupun PowerShell |
| Konfigurasi lokal lewat `.env` | Dibaca `pnpm dev`, `pnpm preview`, dan `node --env-file=.env build` (terverifikasi di macOS); tidak ada `export VAR=...` di jalur utama |
| Line ending konsisten | `.gitattributes` (`* text=auto eol=lf`) agar `pnpm format:check` tidak gagal di Windows dengan `core.autocrlf=true` |
| WSL tidak wajib | WSL dan Git Bash didokumentasikan sebagai opsi; PowerShell adalah jalur utama Windows |
| Tidak ada runtime khusus Windows | Tidak ada Docker/VM/WSL wajib; arsitektur, adapter, Node.js, dan pnpm tidak berubah |

Catatan: script `prepare` (`svelte-kit sync || echo ''`) memakai operator `||`, yang valid di `sh` maupun `cmd.exe` (shell default pnpm di Windows).

### Developer environment documentation gate (tambahan FE-FOUNDATION-02)

| Item | Status |
|---|---|
| Kebutuhan Linux terdokumentasi | ✅ README §9 (minimum dari platform list Node.js 24) |
| Kebutuhan macOS terdokumentasi | ✅ README §9 |
| Kebutuhan Windows terdokumentasi | ✅ README §9 (Windows 10/11 64-bit) |
| Instalasi Windows PowerShell | ✅ README §12.4 — `DOCUMENTED_NOT_RUNTIME_VERIFIED` |
| Environment setup Windows (`Copy-Item`) | ✅ README §12.5 — `DOCUMENTED_NOT_RUNTIME_VERIFIED` |
| Setup pnpm Windows (Corepack) | ✅ README §12.4 — `DOCUMENTED_NOT_RUNTIME_VERIFIED` |
| Perintah development Windows | ✅ Sama dengan semua OS (`pnpm …`), README §12.6–§12.13 |
| Perintah verifikasi Windows | ✅ README §12.4 langkah 4, §12.8 |
| WSL tidak diwajibkan | ✅ README §12.4 (opsional; Node.js tidak mendukung WSL secara resmi) |
| Dukungan Windows dipisahkan dari klaim runtime/deployment | ✅ README §9 dan bagian ini |
