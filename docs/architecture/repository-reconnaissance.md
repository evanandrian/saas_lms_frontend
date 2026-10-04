# Repository Reconnaissance

| Atribut | Nilai |
|---|---|
| Repository | `saas_lms_frontend` |
| Fase | FE-FOUNDATION-00 — Reconnaissance / Audit / Architecture Assessment |
| Tanggal | 2 Oktober 2026 |
| Commit yang diaudit | `bb24578` (`main`, working tree clean) |
| Acuan utama | SAD-SDD_SaaS-LMS-Multi-Tenant_v1.0.1 (status: "Disetujui sebagai acuan pengembangan", 2 Okt 2026) |
| Acuan pendukung | Frontend Foundation Specification v1.0 — **tidak ditemukan** (lihat BLOCKED-03) |
| Mode | Read-only. Satu-satunya file yang dibuat adalah dokumen ini. |

**Label bukti yang dipakai di dokumen ini**

- **Fakta** — terverifikasi langsung dari repository, Git, atau teks SAD/SDD.
- **Observasi** — hasil pengamatan yang dapat diulang, tetapi bukan isi dokumen resmi.
- **Inferensi** — kesimpulan dari fakta; dapat salah.
- **Asumsi** — tidak terverifikasi; perlu konfirmasi.
- **Rekomendasi** — usulan; bukan keputusan.

Rujukan SAD ditulis sebagai `SAD §x` (Bagian I), `Penamaan §x` (Bagian III), `Fase` (Bagian IV), `Lampiran §x` (Lampiran A). Menurut SAD "Cara membaca": *bila Bagian I berbeda dengan Lampiran A, Bagian I yang berlaku*.

---

## 1. Executive Summary

**Fakta.** Repository `saas_lms_frontend` adalah repository **greenfield**: satu commit (`bb24578 Initial commit`) yang hanya berisi `README.md` (19 byte, isi `# saas_lms_frontend`). Tidak ada `package.json`, `src/`, konfigurasi SvelteKit, dependency, test, CI, maupun dokumentasi arsitektur.

**Fakta.** Repository saudara `saas_lms_backend` juga hanya berisi `README.md` (`95757d9 Initial commit`). Tidak ada `openapi.yaml` di kedua repository.

**Konsekuensi.**

1. Tidak ada architecture drift, technical debt kode, naming violation, atau dependency conflict — karena belum ada kode. Hampir seluruh area berstatus **GAP** (belum dibangun), bukan "salah dibangun".
2. Ditemukan **satu temuan keamanan CRITICAL**: GitHub Personal Access Token tersimpan dalam bentuk plaintext pada URL `remote.origin` di `.git/config` (frontend dan backend). Lihat SEC-01.
3. API layer **BLOCKED**: OpenAPI contract belum ada (TR-07 contract-first, ADR-016).
4. Terdapat beberapa **keputusan yang belum dijawab SAD** namun wajib diputuskan sebelum scaffolding (package manager, SvelteKit adapter, generator API client, library i18n, library validasi skema, versi Node.js).
5. Terdapat **inkonsistensi internal SAD** dan **konflik antara execution prompt dan SAD** yang harus diselesaikan manusia (contoh: topologi host API, `school_unit` vs `institution`).

**Readiness:** `REQUIRES_DECISION` — lihat §31.

---

## 2. Repository Identity

| Item | Nilai | Label |
|---|---|---|
| Path lokal | `.../ea/sc/lms/saas_lms_frontend` | Fakta |
| Remote | `github.com/evanandrian/saas_lms_frontend` (kredensial di URL — **disamarkan**, lihat SEC-01) | Fakta |
| Branch | `main` → tracking `origin/main`; tidak ada branch lain | Fakta |
| Commit | 1 commit, `bb24578`, 1 Okt 2026, pesan `Initial commit` (pola default pembuatan repo GitHub) | Fakta / Inferensi |
| Uncommitted changes | Tidak ada (sebelum dokumen ini dibuat) | Fakta |
| Git hooks aktif | Tidak ada (hanya `*.sample`) | Fakta |
| Branch naming / commit convention | Belum dapat diamati dari history. SAD menetapkan `<jenis>/<LMS-n>-<ringkas>` dan Conventional Commits `<jenis>(<modul>): ...` (Penamaan §6.1) | Fakta |
| Identitas commit | Author commit awal memakai alamat GitHub noreply; `user.email` lokal berbeda | Observasi (informational) |

---

## 3. Current Technology Stack

| Komponen | Kondisi repository | Baseline (SAD C-01, ADR-002) | Status |
|---|---|---|---|
| Framework | Tidak ada | SvelteKit 2 | GAP |
| UI runtime | Tidak ada | Svelte 5 (runes) | GAP |
| Bahasa | Tidak ada | TypeScript | GAP |
| CSS | Tidak ada | Tailwind CSS 4 | GAP |
| Design system | Tidak ada | Skeleton (versi mayor dikunci, R-08) | GAP |
| API contract | Tidak ada | OpenAPI, contract-first (TR-07) | BLOCKED |
| API client | Tidak ada | Generated TypeScript client | BLOCKED |
| i18n | Tidak ada | `id.json`, `en.json` (+ `index.ts`) | GAP |
| Test | Tidak ada | Vitest + Testing Library, Playwright (SAD §10.5) | GAP |
| Lint | Tidak ada | eslint, svelte-check (SAD §7.3) | GAP |

**Toolchain lokal (Observasi, bukan bagian repository):** Node.js `v20.20.2`, npm `10.8.2`, pnpm `12.0.0`, bun `1.3.12`, git `2.54.0`.

**Inferensi:** Node.js 20 sudah melewati akhir masa dukungan LTS (April 2026). Versi runtime belum ditetapkan SAD → DECISION-006.

---

## 4. Repository Structure

**Kondisi saat ini (Fakta):**

```
saas_lms_frontend/
├── .git/
├── README.md                 # 1 baris: "# saas_lms_frontend"
└── docs/architecture/
    └── repository-reconnaissance.md   # dibuat oleh fase ini
```

**Target (SAD Penamaan §5.1, ringkas):**

```
saas_lms_frontend/
├── src/
│   ├── app.html  app.css  app.d.ts
│   ├── hooks.server.ts        # resolve tenant dari host, sesi, CSP
│   ├── hooks.client.ts
│   ├── lib/
│   │   ├── api/{generated/, client.ts}
│   │   ├── components/{ui/, layout/, domain/}
│   │   ├── features/<modul>/
│   │   ├── auth/{session.ts, can.ts}
│   │   ├── i18n/{id.json, en.json, index.ts}
│   │   ├── offline/
│   │   └── utils/
│   ├── routes/{(public), (platform)/console, (school)/app, (join)/s/[sessionCode]}
│   └── params/                # uuid.ts
├── static/                    # favicon, manifest.webmanifest
├── tests/{e2e/, unit/}
├── capacitor.config.ts        # fase 3
└── svelte.config.js  vite.config.ts  tsconfig.json  package.json
```

### File Inventory

| File/Directory | Responsibility | Status | Concern |
|---|---|---|---|
| `README.md` | Identitas repo | EXISTING (stub) | Tidak berisi setup, stack, atau rujukan SAD |
| `AI-CONTEXT.md` | Konteks untuk asisten AI | GAP | Diminta execution prompt; tidak disebut SAD (PROPOSED) |
| `.gitignore` | Mencegah commit `node_modules`, `.env`, build output | GAP | Global ignore user tidak menutup `.env` (Observasi: `git check-ignore .env` kosong) |
| `.env.example` | Daftar env var `PUBLIC_LMS_*` | GAP | — |
| `package.json` + lockfile | Dependency & script | GAP | Package manager belum diputuskan (DECISION-001) |
| `svelte.config.js` | Adapter, alias | GAP | Adapter belum diputuskan (DECISION-002) |
| `vite.config.ts` | Build, Tailwind 4 plugin, Vitest | GAP | — |
| `tsconfig.json` | TypeScript strict | GAP | — |
| `src/hooks.server.ts` | Tenant resolution, sesi, CSP | GAP | Bergantung DECISION-003 |
| `src/lib/api/generated/` | Generated client | BLOCKED | OpenAPI belum ada |
| `src/lib/auth/` | `session.ts`, `can.ts` | GAP | Model sesi bergantung DECISION-003/004 |
| `src/lib/i18n/` | Terjemahan | GAP | Library belum diputuskan (DECISION-007) |
| `src/routes/` | 4 route group | GAP | — |
| `src/params/uuid.ts` | Param matcher | GAP | — |
| `tests/` | Unit & E2E | GAP | Lokasi unit test tidak konsisten di SAD (CONFLICT-04) |
| `.github/workflows/` | CI | GAP | — |
| `docs/` | Dokumentasi | PARTIAL | Hanya dokumen ini |

---

## 5. Current Architecture

**Fakta:** Tidak ada arsitektur terimplementasi.

**Target (SAD §5.4):**

| Lapis | Lokasi | Isi |
|---|---|---|
| Route | `src/routes/(public)`, `(platform)`, `(school)`, `(join)` | Halaman, `+page.server.ts` untuk load dan action |
| Fitur | `src/lib/features/<modul>/` | `<modul>.api.ts`, `<modul>.schema.ts`, `<modul>.store.svelte.ts` |
| Komponen | `src/lib/components/ui`, `domain` (+ `layout` menurut Penamaan §5.1) | UI generik (Skeleton) dan komponen domain |
| Infrastruktur | `src/lib/api`, `auth`, `i18n` | Klien hasil generate OpenAPI, helper `can()`, terjemahan |

**Fakta (SAD/Lampiran §6):** Satu aplikasi SvelteKit melayani situs publik, konsol pemilik LMS, dan aplikasi sekolah lewat route group. Domain: `<subdomain-tenant>.namalms.id`, `console.namalms.id`, `api.namalms.id` (Penamaan §6.3).

**Inferensi:** Karena satu build melayani beberapa host, `hooks.server.ts` (dan kemungkinan `reroute` hook) harus memetakan host ke route group. Mekanisme ini tidak dijelaskan SAD → DECISION-005.

---

## 6. Route Architecture

### Route Inventory

Repository belum memiliki route. Tabel berikut adalah **target dari SAD** (Penamaan §5.1), bukan kondisi aktual. Kolom Actor diambil dari teks SAD; `UNKNOWN` bila tidak disebut.

| Route | Group | Actor/Area | Current Responsibility | Status |
|---|---|---|---|---|
| `/`, `pricing/`, `register/`, `login/` | `(public)` | Publik / calon tenant | — | GAP |
| `console/dashboard/`, `applications/`, `tenants/[tenantId]/`, `plans/`, `billing/` | `(platform)` | Pemilik LMS (role platform) | — | GAP |
| `app/admin/` (`classes/`, `teachers/`, `students/`, `imports/`, `settings/`) | `(school)` | `school_admin` | — | GAP |
| `app/teacher/` (`materials/`, `assignments/`, `question-bank/`, `assessments/[assessmentId]/grading/`, `homeroom/report-cards/`) | `(school)` | Guru | — | GAP |
| `app/student/` (`materials/`, `assignments/`, `exams/[assessmentId]/take/`, `grades/`, `report-cards/`) | `(school)` | Murid | — | GAP |
| `app/guardian/children/[studentId]/` | `(school)` | Orang tua/wali | — | GAP |
| `app/exam-sessions/[sessionId]/` | `(school)` | Tenant event (actor spesifik UNKNOWN) | — | GAP |
| `s/[sessionCode]/` | `(join)` | Peserta tamu | — | GAP |

**Catatan:**
- Penamaan §5.2 mewajibkan param divalidasi matcher, contoh `[assessmentId=uuid]`. `[sessionCode]` bukan UUID → butuh matcher sendiri (format kode sesi tidak dirinci di bagian yang diaudit; UNKNOWN).
- Route `(platform)/console/...` dilayani di host `console.namalms.id` → potensi path ganda `console.namalms.id/console/...` (Inferensi). Lihat DECISION-005.
- Route `student/exams/` memakai kata `exam`, padahal Penamaan §1 melarang `exam` kecuali `exam_session`. Lihat CONFLICT-03.

---

## 7. Feature Architecture

**Fakta:** `src/lib/features/` tidak ada.

**Target (Penamaan §5.1–5.2):** folder per modul mencerminkan modul backend; file `<fitur>.<jenis>.ts` dengan jenis `api`, `schema`, `types`, `store.svelte`, `utils`; komponen khusus fitur di `features/<modul>/components/`.

**Status:** GAP. Tidak ada drift yang bisa dinilai.

---

## 8. Component Architecture

**Fakta:** Tidak ada komponen.

**Target:** `components/ui/` (pembungkus Skeleton: `Button.svelte`, `DataTable.svelte`), `components/layout/` (`AppShell.svelte`, `Sidebar.svelte`), `components/domain/` (`QuestionEditor.svelte`, `ScoreTable.svelte`).

**Catatan:**
- ADR-002 konsekuensi: "Tabel data besar butuh pustaka data-grid terpisah" — pustaka belum dipilih (DECISION-009, tidak memblok fondasi).
- R-08 mitigasi: "Kunci versi mayor, bungkus komponen di `components/ui`" — prinsip yang harus diterapkan sejak FE-FOUNDATION-01.
- SAD §5.4 hanya menyebut `ui` dan `domain`; Penamaan §5.1 menambah `layout`. Tidak bertentangan secara substansi (Inferensi: `layout` adalah perincian).

---

## 9. API Architecture

**Fakta:** `src/lib/api/` tidak ada. Tidak ada generated client, fetcher, atau manual `fetch`.

### API Inventory

**OpenAPI source unavailable.** Tidak ada `openapi.yaml`/`openapi.json` di `saas_lms_frontend` maupun `saas_lms_backend`. Tidak ada operationId yang dapat diinventarisasi. Tidak ada endpoint yang dikarang di dokumen ini.

**Aturan kontrak yang sudah ditetapkan SAD (Fakta, Penamaan §4):**

| Unsur | Aturan |
|---|---|
| Base path | `/api/v1/platform/...`, `/api/v1/school/...`, `/api/v1/public/...` |
| operationId | camelCase `<kataKerja><Entitas>`; nama fungsi API frontend = operationId |
| Field JSON | snake_case; waktu ISO 8601 UTC `Z`; uang integer bersufiks `_idr` |
| Paginasi | keyset `?limit=&cursor=`; `meta.next_cursor` |
| Respons | `{ data, meta }` atau `{ error: { code, message, details, request_id } }` |
| Pesan error UI | diterjemahkan dari kode error, kunci i18n `errors.<KODE>` (SAD §10.2) |

**Gap & konflik terkait API:**
- **CONFLICT-01** — lokasi client: SAD Penamaan §5.1 `src/lib/api/generated/` vs Fase E0-10 "Paket `@lms/api-client`".
- **CONFLICT-02** — host API: `api.namalms.id` vs `<subdomain>.<domain>/api/v1/...`.
- **CONFLICT-06** — paginasi: Penamaan §4 keyset vs Lampiran §7 `page/per_page/total`. Menurut aturan SAD, Lampiran kalah → keyset berlaku (informational, tidak perlu keputusan baru).
- Generator client belum dipilih (DECISION-004).

---

## 10. Authentication

**Fakta:** Tidak ada `hooks.server.ts`, `hooks.client.ts`, `auth/session.ts`, login, logout, atau refresh.

**Ketentuan SAD (Fakta, §9.1):** access token JWT 15 menit (asimetris, JWKS); refresh token acak 256-bit, rotasi tiap pakai, cookie `HttpOnly; Secure; SameSite=Lax`; email+password dan Google OIDC; MFA TOTP wajib untuk role platform. §9.6: CSRF token untuk form SvelteKit, CSP ketat.

**Yang belum ditentukan SAD (Fakta: tidak ditemukan di bagian yang diaudit):**
- Di mana frontend menyimpan access token (memory browser, cookie yang dikelola server SvelteKit, atau BFF).
- Siapa yang menerbitkan cookie refresh (backend di `api.namalms.id` atau server SvelteKit di host tenant) dan atribut `Domain` cookie.

**Inferensi:** Kedua hal ini bergantung pada CONFLICT-02 dan berdampak pada keamanan (XSS exposure, CSRF, cookie lintas subdomain) → REQUIRES ADR (ADR-PROPOSED-01).

**Status:** GAP + REQUIRES_ADR.

---

## 11. Tenant Context

**Fakta:** Tidak ada implementasi; tidak ada tenant ID/kode yang di-hardcode (tidak ada kode).

**Ketentuan SAD:** tenant dikenali dari subdomain di `hooks.server.ts` (Lampiran §6, Penamaan §5.1); backend memvalidasi `tenant_id` token = tenant host (403 `TENANT_MISMATCH`, SAD §6.1); header `X-Tenant` untuk aplikasi mobile; env `PUBLIC_LMS_ROOT_DOMAIN` untuk resolusi subdomain (Penamaan §6.2).

**Risiko desain yang harus dicegah sejak fondasi (Rekomendasi):**
- Frontend tidak boleh menjadi sumber kebenaran tenant; resolusi di frontend hanya untuk UX/routing, otorisasi tetap di backend.
- Tidak ada tenant default/fallback yang di-hardcode.
- Satu titik resolusi tenant (hooks), bukan per route.

**Inferensi:** Bila build mobile memakai `adapter-static` (SPA) seperti Lampiran §6, `hooks.server.ts` tidak berjalan di aplikasi Capacitor → butuh jalur resolusi tenant kedua (`X-Tenant`). Lihat DECISION-002.

**Status:** GAP + REQUIRES_DECISION.

---

## 12. Authorization / RBAC

**Fakta:** Tidak ada `can()`, konstanta permission, atau guard.

**Ketentuan SAD:** permission `<modul>.<aksi>` (aksi baku: view, create, update, delete, publish, approve, import, export), contoh `exam.create`, `score.publish`, `report_card.approve`; role snake_case (`school_admin`, `platform_finance`); route backend mendeklarasikan permission di `routes.go`.

**Catatan:**
- Daftar permission lengkap tidak tersedia sebagai artefak yang bisa dikonsumsi frontend (Observasi). Sumber yang mungkin: seed backend (E0-07) atau OpenAPI. Frontend tidak boleh mengarang permission → BLOCKED-04.
- Inkonsistensi kecil: contoh `exam.create` vs larangan istilah `exam` (Penamaan §1). Masuk CONFLICT-03.
- `can()` di frontend hanya untuk UI guard; penegakan tetap di backend (SAD §9.2).

**Status:** GAP + BLOCKED (daftar permission).

---

## 13. State Management

**Fakta:** Tidak ada store, rune, atau context.

**Ketentuan SAD:** Svelte 5 runes; `let answers = $state({})`; file `<fitur>.store.svelte.ts`; contoh `exam-timer.store.svelte.ts`. Timer ujian otoritatif di server (SAD §6.2).

**Klasifikasi target (Inferensi dari SAD):**

| Jenis state | Sumber yang disiratkan SAD |
|---|---|
| Server state | `load` di `+page.server.ts` |
| Client state | runes di `*.store.svelte.ts` |
| Form state | SvelteKit form action + skema (`*.schema.ts`) |
| Session state | `hooks.server.ts` → `locals` (mekanisme rinci: DECISION-003) |
| Offline state | IndexedDB (`lib/offline`) untuk autosave ujian |

**Status:** GAP. Tidak ada library state eksternal yang perlu dievaluasi.

---

## 14. i18n

**Fakta:** Tidak ada `id.json`/`en.json`.

**Ketentuan SAD:** semua teks UI lewat i18n (TR-09, ditegakkan "lint teks literal di `.svelte`"); kunci `<modul>.<layar>.<elemen>` (contoh `assessment.take.submit_button`); error `errors.<KODE>`; default Bahasa Indonesia; format angka `1.234,56`, tanggal `1 Okt 2026`; tampilan dalam zona waktu tenant (SAD §10.4).

**Gap:**
- Library/mekanisme i18n tidak ditentukan (DECISION-007).
- Lint teks literal TR-09 belum ada tooling-nya.

**Status:** GAP + REQUIRES_DECISION.

---

## 15. Design System

**Fakta:** Tidak ada `app.css`, konfigurasi Tailwind, Skeleton, SCSS, atau custom CSS.

**Ketentuan SAD:** Tailwind 4 + Skeleton (ADR-002); kelas kustom berawalan `lms-` (`lms-exam-timer`); versi mayor Skeleton dikunci (R-08).

**Status:** GAP. Tidak ada duplikasi atau konflik design system karena belum ada styling.

**Responsive & Accessibility (NFR-12):** HP Android kelas bawah (RAM 2 GB), WCAG 2.1 AA untuk halaman inti, diverifikasi Lighthouse. Belum ada implementasi maupun tooling → GAP.

---

## 16. Offline / PWA

**Fakta:** Tidak ada service worker, manifest, atau IndexedDB.

**Ketentuan SAD:** jawaban ujian disimpan ke IndexedDB tiap perubahan; `PUT /attempts/{id}/answers` batch ≤ 15 detik (SAD §6.2, NFR-05); PWA offline adalah Fase 2; Capacitor Fase 3 (ADR-003).

**Rekomendasi:** Fondasi tidak perlu membangun offline. Cukup menyediakan folder `lib/offline/` kosong atau README bila diinginkan. Offline tidak berlaku untuk semua fitur.

**Status:** GAP (bukan scope FE-FOUNDATION-01 — Inferensi berdasarkan roadmap SAD).

---

## 17. Testing

**Fakta:** Tidak ada test, framework, atau konfigurasi.

**Ketentuan SAD:** Vitest + Testing Library (store, skema, komponen inti); Playwright untuk alur F01–F14; `npm audit` tiap rilis; unit test `<file>.test.ts` di samping file; E2E `tests/e2e/<kode-alur>-<nama>.spec.ts`; NFR-11 coverage ≥ 70% (untuk service — Inferensi: terutama backend).

**Status:** GAP. Konflik lokasi unit test → CONFLICT-04.

---

## 18. CI/CD

**Fakta:** Tidak ada `.github/workflows/` atau konfigurasi CI lain.

**Ketentuan SAD §7.3 (yang relevan frontend):** PR: eslint, svelte-check, unit test, build image, pemindai dependensi. Tag `-rcN`: E2E Playwright di staging. Release: deploy web canary. TR-07: "CI gagal bila spec dan implementasi berbeda". E0-10: "generate klien TS di CI". SAD §9.6: Renovate/Dependabot.

**Quality gate saat ini:** tidak ada.

**Status:** GAP.

---

## 19. Naming Audit

**Fakta:** Tidak ada file sumber untuk diaudit; satu-satunya file (`README.md`) sesuai konvensi umum.

**Pelanggaran ditemukan:** tidak ada (0).

**Konflik pada sumber aturan penamaan (bukan pada kode):**

| Lokasi | Konflik | Severity | Rekomendasi |
|---|---|---|---|
| Penamaan §5.1 vs §1 | Route `student/exams/` dan permission `exam.create` memakai `exam`, padahal §1 melarang `exam` kecuali `exam_session` | P3 | Keputusan manusia (CONFLICT-03) |
| Penamaan §5.2 vs §5.1 | Unit test "di samping file" vs folder `tests/unit/` | P3 | Keputusan manusia (CONFLICT-04) |
| Execution prompt §8 vs Penamaan §5.2 | Prompt tidak mencantumkan jenis file `utils` dan matcher `=uuid`; SAD mencantumkan keduanya | P4 | Ikuti SAD (hierarki sumber) |

---

## 20. Domain Vocabulary Audit

**Fakta:** Tidak ada kode untuk diaudit.

**Konflik sumber:** Execution prompt §9 mencantumkan `school_unit` sebagai konsep yang diharapkan. **SAD Penamaan §1 secara eksplisit menyatakan "institution — jangan pakai: school_unit, branch".** Lihat CONFLICT-05.

Kosakata baku SAD (acuan untuk fase berikutnya): `institution`, `class` (variabel TS `schoolClass`), `subject`, `student`, `guardian`, `assessment` (`exam` hanya `exam_session`), `attempt`, `assignment`, `submission`, `score`, `final_grade`, `report_card`, `learning_objective`, `attendance`, `seat`.

---

## 21. Security Findings

| ID | Area | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|---|
| SEC-01 | Git / kredensial | GitHub Personal Access Token (classic) tersimpan plaintext di URL `remote.origin` pada `.git/config`, di repo frontend **dan** backend. Token terbaca oleh tool/proses apa pun yang membaca konfigurasi Git (termasuk sesi audit ini). | **CRITICAL** | `git remote -v` menampilkan URL HTTPS yang memuat username dan token sebelum host `github.com` (nilai token sengaja tidak ditulis di dokumen ini) | (1) Pemilik akun segera **revoke/rotate** token di GitHub Settings → Developer settings. (2) Ganti URL remote menjadi tanpa kredensial (`git remote set-url origin https://github.com/evanandrian/saas_lms_frontend.git`) dan andalkan `credential.helper=osxkeychain` (sudah terkonfigurasi di sistem) atau SSH. (3) Lakukan hal sama di `saas_lms_backend`. Tidak dilakukan otomatis karena di luar scope read-only. |
| SEC-02 | Repository hygiene | Tidak ada `.gitignore`; global ignore tidak menutup `.env`. Risiko file rahasia ter-commit saat scaffolding. | MEDIUM | `git check-ignore -v .env` tidak menghasilkan output | Tambahkan `.gitignore` (minimal `.env*` kecuali `.env.example`, `node_modules`, `.svelte-kit`, `build`) pada langkah pertama FE-FOUNDATION-01 |
| SEC-03 | Arsitektur sesi | Penyimpanan access token dan penerbit cookie refresh belum ditetapkan; pilihan yang salah (mis. token di `localStorage`) bertentangan dengan postur keamanan SAD §9 | HIGH (desain) | SAD §9.1 hanya mengatur cookie refresh; tidak ada aturan penyimpanan access token di frontend | ADR-PROPOSED-01 sebelum implementasi auth |
| SEC-04 | Header keamanan | CSP ketat & CSRF diwajibkan SAD §9.6, belum ada implementasi | LOW (belum ada kode) | SAD §9.6 | Rancang CSP di `hooks.server.ts`/`svelte.config.js` sejak shell dibuat |
| SEC-05 | Tenant trust | Belum ada kode; risiko desain: frontend memercayai tenant dari klien | INFORMATIONAL | SAD §6.1 (validasi `TENANT_MISMATCH` di backend) | Pertahankan backend sebagai otoritas tenant |

Tidak ditemukan: unsafe HTML, `localStorage` sensitif, hardcoded API key di file tracked, modifikasi generated code — karena belum ada kode (Fakta).

---

## 22. Documentation Findings

| Dokumen | Status | Catatan |
|---|---|---|
| `README.md` | Stub | Hanya judul |
| `AI-CONTEXT.md` | Tidak ada | Diminta execution prompt (PROPOSED) |
| `docs/architecture/` | Baru (dokumen ini) | — |
| ADR di repository | Tidak ada | ADR-001..018 hanya ada di SAD (`.docx` di luar repo). Belum ada workflow ADR di repo |
| SAD-SDD v1.0.1 | Ada di luar repository (`../SAD-SDD_SaaS-LMS-Multi-Tenant_v1.0.1.docx`) | Tidak ter-versioning bersama kode; AI/developer harus diberi salinannya (SAD "Memakai dokumen ini sebagai prompt") |
| Frontend Foundation Specification v1.0 | **Tidak ditemukan** | Dicari di kedua repo dan folder induk |
| `.env.example`, `CONTRIBUTING`, template PR (TR-10) | Tidak ada | TR-10: "Setiap PR menyebut ID aturan" ditegakkan via template PR |

---

## 23. Architecture Gaps

### Inventory Table

| Area | Current State | Target State | Status | Severity | Action |
|---|---|---|---|---|---|
| Repository | README stub, tanpa `.gitignore` | Struktur Penamaan §5.1, `.gitignore`, `.env.example` | GAP | P2 | Scaffold di FE-FOUNDATION-01 |
| Framework | Tidak ada | SvelteKit 2 + Svelte 5 + TS | GAP | P2 | Scaffold setelah DECISION-001/002/006 |
| Dependencies | Tidak ada | Lihat §24 | REQUIRES_DECISION | P2 | DECISION-001, 004, 007, 008 |
| Routing | Tidak ada | 4 route group + matcher | REQUIRES_DECISION | P2 | DECISION-005 (host ↔ group) |
| Feature architecture | Tidak ada | `lib/features/<modul>/` | GAP | P3 | Folder kosong cukup di fondasi |
| Components | Tidak ada | `ui/`, `layout/`, `domain/` | GAP | P3 | Layout shell di FE-FOUNDATION-01 |
| API | Tidak ada; OpenAPI tidak ada | Generated client dari OpenAPI | BLOCKED | P1 | BLOCKED-01, CONFLICT-01/02 |
| Auth | Tidak ada | Sesi + login, sesuai SAD §9.1 | REQUIRES_DECISION | P1 | ADR-PROPOSED-01; backend E0-07 |
| Tenant | Tidak ada | Resolusi subdomain di `hooks.server.ts` | REQUIRES_DECISION | P1 | CONFLICT-02, DECISION-002 |
| Authorization | Tidak ada | `can('<modul>.<aksi>')` | BLOCKED | P2 | BLOCKED-04 (daftar permission) |
| State | Tidak ada | Svelte 5 runes | GAP | P3 | — |
| i18n | Tidak ada | `id.json`, `en.json`, lint literal | REQUIRES_DECISION | P2 | DECISION-007 |
| Design system | Tidak ada | Tailwind 4 + Skeleton (major dikunci) | GAP | P2 | Scaffold |
| Responsive | Tidak ada | HP Android 2 GB | GAP | P3 | Budget performa di fondasi |
| Accessibility | Tidak ada | WCAG 2.1 AA halaman inti | GAP | P3 | Lint a11y Svelte + Lighthouse |
| Testing | Tidak ada | Vitest, Testing Library, Playwright | GAP | P2 | Scaffold; CONFLICT-04 |
| CI | Tidak ada | lint, svelte-check, test, build, audit | GAP | P2 | GitHub Actions |
| Documentation | README stub + dokumen ini | README, AI-CONTEXT, ADR di repo | PARTIAL | P3 | DECISION-010 |

---

## 24. Dependency Gaps

### Dependency Inventory

**Fakta:** Tidak ada dependency terpasang. Tabel berikut adalah **kebutuhan dari baseline**, bukan kondisi aktual. Versi tidak ditulis karena belum dipilih/dikunci; dokumen ini tidak merekomendasikan versi spesifik tanpa verifikasi kompatibilitas.

| Dependency | Version | Purpose | Required by Baseline? | Status | Recommendation |
|---|---|---|---|---|---|
| `@sveltejs/kit` | — | Framework | Ya (C-01) | REQUIRED | Major 2 |
| `svelte` | — | Runtime | Ya (C-01) | REQUIRED | Major 5 |
| `typescript` | — | Bahasa | Ya | REQUIRED | Mode strict |
| `tailwindcss` (+ plugin Vite) | — | CSS | Ya (C-01) | REQUIRED | Major 4 |
| Skeleton (`@skeletonlabs/*`) | — | Design system | Ya (ADR-002) | REQUIRED | Kunci major (R-08); verifikasi dukungan Svelte 5 + Tailwind 4 saat instalasi |
| SvelteKit adapter | — | Deploy target | Ya | UNKNOWN | DECISION-002 |
| OpenAPI client generator | — | Generated client | Ya (TR-07) | UNKNOWN | DECISION-004 |
| Library validasi skema (`*.schema.ts`) | — | Validasi form | Disiratkan Penamaan §5.2 | UNKNOWN | DECISION-008 |
| Library i18n | — | Terjemahan | Disiratkan (TR-09) | UNKNOWN | DECISION-007 |
| `vitest`, Testing Library | — | Unit/komponen | Ya (SAD §10.5) | REQUIRED | — |
| `@playwright/test` | — | E2E | Ya (SAD §10.5) | REQUIRED | — |
| `eslint`, `svelte-check` | — | Lint/typecheck | Ya (SAD §7.3) | REQUIRED | — |
| Formatter (mis. Prettier) | — | Formatting | Tidak disebut SAD | PROPOSED | Keputusan tim, low-risk |
| Data-grid | — | Tabel besar | Konsekuensi ADR-002 | UNKNOWN | DECISION-009 (bukan fondasi) |
| Capacitor | — | Mobile | ADR-003 (Fase 3) | Belum diperlukan | Jangan dipasang di fondasi |

Tidak ada dependency DUPLICATE, UNUSED, OUTDATED, atau POTENTIAL_CONFLICT (Fakta: tidak ada dependency).

---

## 25. Technical Debt

**Fakta:** Tidak ada technical debt kode.

**Debt dokumentasi/proses yang sudah ada:**
- SAD hanya tersedia sebagai `.docx` di luar repository → sulit di-diff dan dirujuk dari PR.
- Inkonsistensi internal SAD (CONFLICT-01..04, 06) akan menjadi debt bila tidak diselesaikan sebelum kode ditulis.
- Kredensial di remote URL (SEC-01) adalah debt operasional/keamanan.

---

## 26. Safe-to-Fix Items

Belum dikerjakan (fase ini read-only). Semua bersifat mekanis dan tidak mengubah arsitektur.

| ID | Item | Catatan |
|---|---|---|
| SAFE-01 | Tambah `.gitignore` | Sebelum file lain dibuat |
| SAFE-02 | Tambah `.env.example` berisi `PUBLIC_LMS_API_BASE_URL`, `PUBLIC_LMS_ROOT_DOMAIN` (nama dari Penamaan §6.2, nilai placeholder) | Tanpa rahasia |
| SAFE-03 | Lengkapi `README.md` (stack, prasyarat, rujukan SAD) | Setelah DECISION-001/006 agar akurat |
| SAFE-04 | Tambah `AI-CONTEXT.md` merangkum aturan yang relevan dari SAD | Tergantung DECISION-010 |
| SAFE-05 | Template PR berisi kolom ID aturan (TR-10) | — |
| SAFE-06 | Hapus kredensial dari remote URL (SEC-01 langkah 2) | Tindakan **manusia**; bukan perubahan file repo. Rotasi token tetap wajib |

---

## 27. Requires Decision

Ringkasan; detail di bagian **Decisions Required**.

| ID | Topik | Memblok |
|---|---|---|
| DECISION-001 | Package manager | Scaffold |
| DECISION-002 | SvelteKit adapter & strategi mobile | Scaffold, tenant |
| DECISION-003 | Topologi host API & sesi (CONFLICT-02) | Auth, tenant, API |
| DECISION-004 | Generator & distribusi API client (CONFLICT-01) | API |
| DECISION-005 | Pemetaan host ↔ route group | Routing |
| DECISION-006 | Versi Node.js | Scaffold, CI |
| DECISION-007 | Library i18n | i18n |
| DECISION-008 | Library validasi skema | Feature/form |
| DECISION-009 | Library data-grid | Tidak memblok fondasi |
| DECISION-010 | Lokasi dokumentasi arsitektur & ADR | Dokumentasi |
| DECISION-011 | Konflik vocabulary & penamaan (CONFLICT-03/04/05) | Konsistensi |

---

## 28. Requires ADR

| ID | Proposed ADR Title | Reason | Affected Architecture | Affected Files | Risk |
|---|---|---|---|---|---|
| ADR-PROPOSED-01 | "Topologi host API, penyimpanan token, dan model sesi frontend" | SAD tidak menetapkan penyimpanan access token & penerbit cookie; dua host API saling bertentangan | Security, tenant, API | `hooks.server.ts`, `lib/auth/*`, `lib/api/client.ts`, konfigurasi cookie/CORS backend | HIGH — keputusan salah membuka XSS token theft, CSRF, atau kebocoran sesi antar-subdomain |
| ADR-PROPOSED-02 | "Adapter SvelteKit dan strategi build web vs mobile (Capacitor)" | Lampiran §6 menyebut `adapter-static` untuk mobile, sementara resolusi tenant & sesi bergantung `hooks.server.ts` (SSR) | Deployment, tenant, auth | `svelte.config.js`, `hooks.server.ts` | MEDIUM — memilih SPA-only menghilangkan server hooks |
| ADR-PROPOSED-03 | "Distribusi OpenAPI contract dan generated client lintas repository" | E0-10 (`@lms/api-client`) vs Penamaan §5.1 (`lib/api/generated/`) | API, CI | `lib/api/*`, CI | MEDIUM — drift kontrak, melanggar TR-07 |

Catatan: SAD menetapkan nomor ADR berikutnya tanpa menimpa yang lama (SAD §11), sehingga nomor resmi akan dimulai dari ADR-019. Dokumen ini **tidak** membuat ADR.

---

## 29. Blocked Items

| ID | Item | Penyebab | Pihak yang membuka blokir |
|---|---|---|---|
| BLOCKED-01 | Generated API client, `lib/api/generated/`, API inventory | `openapi.yaml` belum ada (backend juga kosong) | Backend / E0-10 |
| BLOCKED-02 | Login tenant via browser (Definisi selesai E0-11) | Auth backend E0-07/E0-08 belum ada | Backend |
| BLOCKED-03 | Validasi terhadap "Frontend Foundation Specification v1.0" | Dokumen tidak ditemukan | Pemilik dokumen |
| BLOCKED-04 | Daftar permission untuk `can()` | Seed role/permission belum ada (E0-07) | Backend |

---

## 30. Recommended Execution Order

1. **Segera (manusia):** rotasi/revoke token GitHub dan bersihkan remote URL di kedua repo (SEC-01).
2. Selesaikan DECISION-001, 006 (package manager, Node.js) — prasyarat scaffold.
3. Selesaikan DECISION-002, 003, 005 dan ADR-PROPOSED-01/02 — prasyarat `hooks.server.ts` dan auth.
4. Selesaikan DECISION-007, 008, 011 — prasyarat i18n dan konvensi.
5. Sediakan Frontend Foundation Specification v1.0 atau nyatakan bahwa SAD menggantikannya (BLOCKED-03).
6. **FE-FOUNDATION-01 (setelah izin eksplisit):** SAFE-01/02 → scaffold SvelteKit + TS + Tailwind 4 + Skeleton → struktur folder kosong sesuai Penamaan §5.1 → lint/typecheck/test tooling → CI dasar → layout shell per route group → i18n `id`/`en` → `hooks.server.ts` resolusi tenant (sesuai keputusan).
7. Setelah OpenAPI tersedia (E0-10): generator client + verifikasi CI (ADR-PROPOSED-03).
8. Setelah auth backend (E0-07/08): halaman login dan `can()`.

---

## 31. FE-FOUNDATION-01 Readiness

**Status: `REQUIRES_DECISION`**

Alasan:
- Tidak ada blocker teknis untuk *memulai* scaffolding, tetapi scaffolding tidak dapat dilakukan tanpa mengarang pilihan yang belum diputuskan (package manager, adapter, Node.js, i18n, validasi).
- Bagian auth/tenant/API memerlukan ADR (ADR-PROPOSED-01..03) dan kontrak OpenAPI (BLOCKED-01); bagian tersebut dapat ditunda tanpa memblok shell dasar.
- SEC-01 harus ditangani manusia; tidak memblok desain, tetapi sebaiknya selesai sebelum push berikutnya.

Kriteria naik ke `READY` / `READY_WITH_SAFE_FIXES`: DECISION-001, 002, 006, 007 diputuskan dan dicatat; BLOCKED-03 dijawab; SEC-01 ditangani.

---

## Decisions Required

### DECISION-001

**Question:** Package manager apa yang dipakai (npm, pnpm, atau bun)?

**Evidence:** SAD Penamaan §5.1 menyebut `package.json` tanpa lockfile spesifik; SAD §10.5 menyebut `npm audit`. Toolchain lokal tersedia npm 10.8.2, pnpm 12.0.0, bun 1.3.12.

**Current implementation:** Tidak ada.

**Architecture impact:** Lockfile, script CI, cache CI, perintah audit (SAD §10.5).

**Options:** npm (selaras teks `npm audit`); pnpm (strict dependency, cepat); bun.

**Recommended next action:** Pemilik memilih; catat di README. Tidak perlu ADR.

### DECISION-002

**Question:** Adapter SvelteKit apa untuk web, dan apakah build mobile (Capacitor, Fase 3) memakai build terpisah?

**Evidence:** Lampiran §6: "build yang sama dengan adapter-static (mode SPA) dibungkus Capacitor". Penamaan §5.1: `hooks.server.ts` melakukan resolusi tenant, sesi, CSP. SAD §6.1: header `X-Tenant` untuk aplikasi mobile. Penamaan §6.3: layanan `lms-prod-web` sebagai container.

**Current implementation:** Tidak ada.

**Architecture impact:** `adapter-static` tidak menjalankan `hooks.server.ts`; SSR membutuhkan runtime server (mis. adapter-node dalam container).

**Options:** (a) SSR adapter untuk web + konfigurasi SPA terpisah untuk mobile di Fase 3; (b) SPA penuh untuk web dan mobile (tenant via `X-Tenant`, hooks server tidak dipakai); (c) tunda keputusan mobile, putuskan hanya adapter web sekarang.

**Recommended next action:** ADR-PROPOSED-02. Lampiran kalah dari Bagian I bila bertentangan.

### DECISION-003

**Question:** Apakah browser memanggil API di `api.namalms.id` langsung, atau melalui host tenant (`<subdomain>.namalms.id/api/v1/...`) / server SvelteKit (BFF)? Di mana access token disimpan?

**Evidence:** Penamaan §6.3 dan §6.2: `api.namalms.id`, `PUBLIC_LMS_API_BASE_URL=https://api.namalms.id`. SAD §6.1: request `https://<subdomain>.<domain>/api/v1/school/...`; middleware membaca subdomain (atau `X-Tenant` dari aplikasi mobile). SAD §9.1: refresh token cookie `HttpOnly; Secure; SameSite=Lax`.

**Current implementation:** Tidak ada.

**Architecture impact:** Resolusi tenant di backend, CORS, atribut cookie `Domain`, CSRF, CSP `connect-src`, desain `lib/api/client.ts` dan `lib/auth/session.ts`.

**Options:** (a) Browser → `api.namalms.id` + `X-Tenant` untuk semua klien; (b) reverse proxy `/api` di host tenant; (c) BFF: server SvelteKit memegang token, browser hanya cookie sesi.

**Recommended next action:** ADR-PROPOSED-01 bersama tim backend. Jangan implementasi auth sebelum diputuskan.

### DECISION-004

**Question:** Generator OpenAPI client apa, dan bagaimana client didistribusikan ke frontend?

**Evidence:** Penamaan §5.1: `src/lib/api/generated/` ("JANGAN diedit manual") + `client.ts`. Fase E0-10: "OpenAPI awal + generate klien TS di CI → Paket `@lms/api-client`". Template prompt Fase: `api/openapi.yaml` (di backend, Inferensi). TR-07: CI gagal bila spec dan implementasi berbeda. Penamaan §5.2: fungsi API = operationId, tipe TS = nama skema OpenAPI.

**Current implementation:** Tidak ada.

**Architecture impact:** Struktur `lib/api`, alur CI lintas repo, versi kontrak.

**Options:** (a) Generate di repo frontend dari spec yang di-pin (submodule/unduhan versi tertentu) ke `lib/api/generated/`; (b) paket `@lms/api-client` dipublikasikan dari backend; (c) hibrida. Generator spesifik dipilih terpisah, dengan syarat menghasilkan nama fungsi = operationId.

**Recommended next action:** ADR-PROPOSED-03; tunggu OpenAPI awal (BLOCKED-01).

### DECISION-005

**Question:** Bagaimana host dipetakan ke route group (`console.namalms.id` → `(platform)`, `<tenant>.namalms.id` → `(school)`, domain utama → `(public)`/`(join)`), dan apakah path `console/` & `app/` tetap muncul di URL?

**Evidence:** Penamaan §5.1: `(platform)/console/`, `(school)/app/`. Penamaan §6.3: `console.namalms.id`, `<subdomain-tenant>.namalms.id`.

**Current implementation:** Tidak ada.

**Architecture impact:** `hooks.server.ts`, kemungkinan `reroute` hook, guard per host, cookie scope.

**Options:** (a) URL berisi prefix (`console.namalms.id/console/...`); (b) host-based reroute sehingga prefix tersembunyi; (c) satu host utama untuk konsol (`namalms.id/console`).

**Recommended next action:** Putuskan bersama DECISION-003.

### DECISION-006

**Question:** Versi Node.js runtime untuk development, CI, dan container?

**Evidence:** Node lokal v20.20.2 (Observasi). SAD tidak menyebut versi Node.js.

**Current implementation:** Tidak ada `.nvmrc`/`engines`.

**Architecture impact:** Kompatibilitas tooling, image container, CI.

**Options:** LTS aktif yang didukung SvelteKit/Vite pada saat scaffolding (verifikasi di dokumentasi resmi saat itu).

**Recommended next action:** Pemilik memilih; kunci via `engines` + `.nvmrc`.

### DECISION-007

**Question:** Mekanisme i18n apa yang dipakai?

**Evidence:** Penamaan §5.1: `i18n/ id.json, en.json, index.ts`. TR-09: lint teks literal di `.svelte`. Kunci `<modul>.<layar>.<elemen>`.

**Current implementation:** Tidak ada.

**Architecture impact:** Format file, SSR, deteksi bahasa, tooling lint.

**Options:** Library i18n berbasis JSON yang kompatibel Svelte 5/SSR; atau implementasi ringan sendiri di `index.ts`.

**Recommended next action:** Pemilik memilih; pastikan format `id.json`/`en.json` tetap.

### DECISION-008

**Question:** Library validasi skema apa untuk `<fitur>.schema.ts`?

**Evidence:** Penamaan §5.2 menyebut jenis file `schema`; SAD §10.5 mewajibkan test skema validasi. Library tidak disebut.

**Current implementation:** Tidak ada.

**Architecture impact:** Validasi form action, ukuran bundle (NFR-12 HP 2 GB).

**Options:** Pilih satu library validasi; pertimbangkan apakah skema dapat diturunkan dari OpenAPI.

**Recommended next action:** Putuskan sebelum fitur pertama; tidak memblok shell.

### DECISION-009

**Question:** Library data-grid untuk tabel besar?

**Evidence:** ADR-002 konsekuensi.

**Current implementation:** Tidak ada.

**Architecture impact:** `components/ui/DataTable.svelte`.

**Options:** Ditentukan saat fitur tabel pertama.

**Recommended next action:** Tunda; tidak memblok fondasi.

### DECISION-010

**Question:** Apakah SAD dan ADR disimpan di repository (Markdown) dan apakah `AI-CONTEXT.md` menjadi standar?

**Evidence:** SAD hanya ada sebagai `.docx` di luar repo; execution prompt meminta `AI-CONTEXT.md`; SAD tidak menyebutnya.

**Current implementation:** Tidak ada.

**Architecture impact:** Keterlacakan PR → aturan (TR-10).

**Options:** (a) `docs/adr/` di tiap repo; (b) repo dokumentasi terpisah; (c) tetap `.docx` + tautan.

**Recommended next action:** Pemilik memilih.

### DECISION-011

**Question:** Bagaimana menyelesaikan konflik vocabulary dan penamaan?

**Evidence:**
- **CONFLICT-03:** Penamaan §1 melarang `exam` kecuali `exam_session`; Penamaan §5.1 memakai route `student/exams/` dan §4 memakai permission `exam.create`.
- **CONFLICT-04:** Penamaan §5.2 "Test unit `<file>.test.ts` di samping file" vs §5.1 folder `tests/unit/`.
- **CONFLICT-05:** Execution prompt §9 mengharapkan `school_unit`; Penamaan §1 menyatakan nama baku `institution` dan melarang `school_unit`.

**Current implementation:** Tidak ada kode terdampak.

**Architecture impact:** Konsistensi nama lintas lapis ("Satu konsep, satu nama", Penamaan §1).

**Options:** Untuk CONFLICT-05, hierarki sumber execution prompt sendiri menempatkan SAD di atas Frontend Foundation Specification → SAD (`institution`) yang menang, tetapi tetap perlu konfirmasi. Untuk CONFLICT-03/04: pilih satu aturan dan perbarui SAD (versi patch).

**Recommended next action:** Pemilik dokumen memutuskan; catat di revisi SAD 1.0.2.

---

## Lampiran: Validasi Fase Ini

| Pemeriksaan | Hasil |
|---|---|
| Dokumen ini dibuat di `docs/architecture/` (direktori baru, diizinkan pengecualian §24 execution prompt) | Ya |
| File lain diubah | Tidak |
| Generated file diubah | Tidak ada generated file |
| Dependency diubah | Tidak |
| Business feature dibuat | Tidak |
| Git commit / push | Tidak |
| Token rahasia ditulis di dokumen | Tidak (disamarkan) |
