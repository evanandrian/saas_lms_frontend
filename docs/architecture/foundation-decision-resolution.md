# Foundation Decision Resolution

| Atribut | Nilai |
|---|---|
| Repository | `saas_lms_frontend` |
| Fase | FE-FOUNDATION-DECISION-01 → **FE-FOUNDATION-DECISION-01-FINALIZATION** |
| Fase sebelumnya | FE-FOUNDATION-00 — `REQUIRES_DECISION` ([repository-reconnaissance.md](repository-reconnaissance.md)) |
| Tanggal | 2 Oktober 2026 |
| Acuan | SAD-SDD v1.0.1; keputusan manusia H-1..H-10 (prompt finalisasi); ADR-019..021 |

Label: **Fakta**, **Inferensi**, **Rekomendasi**, **RESOLVED**, **DOWNSTREAM DEPENDENCY** (tidak memblok fondasi, memblok fase implementasi terkait), **BLOCKED**.

## 0. Current State & Chronology

> Bagian ini ditambahkan setelah finalisasi. Bagian §1–§21 di bawah adalah **catatan historis** sesuai kondisi saat FE-FOUNDATION-DECISION-01-FINALIZATION dan sengaja tidak diubah.

| Urutan | Fase | Hasil gate | Dokumen |
|---|---|---|---|
| 1 | FE-FOUNDATION-DECISION-01-FINALIZATION | Previous state: **BLOCKED_PENDING_H-9** (log lokal masih memuat salinan PAT) | Dokumen ini §19–§21 |
| 2 | FE-FOUNDATION-SECURITY-GATE-01 | Subsequent security resolution: **SECURITY_GATE_PASS_WITH_RESIDUAL_RISK** — klasifikasi RESIDUAL_REVOKED_COPY; aturan gate diperbarui pemilik: salinan yang sudah di-revoke tidak memblok | [credential-exposure-verification.md](../security/credential-exposure-verification.md) |
| 3 | FE-FOUNDATION-01 | Current state: **FE-FOUNDATION-01 AUTHORIZED** (otorisasi eksplisit pemilik) | README §3, §16 |

**Status H-9 saat ini:** `DEFERRED CLEANUP — residual revoked copy`. Pembersihan log lokal adalah tugas terpisah milik pemilik mesin dan **bukan** blocker FE-FOUNDATION-01.

> Nomor DECISION mengikuti prompt FE-FOUNDATION-DECISION-01 dan berbeda dari laporan FE-FOUNDATION-00. Pemetaan di §4.

---

## 1. Executive Summary

- **Seluruh keputusan arsitektur dikunci.** ADR-019, ADR-020, ADR-021 berstatus **Accepted**.
- **Toolchain final:** Node.js 24 LTS · pnpm 12.8.1 · SvelteKit 2.70.3 · Svelte 5.57.1 · Tailwind CSS 4.3.3 · Skeleton 5.0.1 · adapter-node 5.x · Zod 4.x · Orval.
- **Deviasi dari SAD yang disetujui pemilik:** host konsol `platform.<root>` (SAD: `console.namalms.id`); `www` → apex; vocabulary `assessment` menggantikan `exam` di route dan permission. Perlu masuk revisi SAD 1.0.2.
- **SEC-01:** remote bersih; PAT dinyatakan sudah di-revoke oleh pemilik (atestasi, tidak diverifikasi teknis). **Log lokal belum dibersihkan**: redaksi otomatis ditolak oleh permission classifier Claude Code, dan token ditemukan juga di `~/.zsh_history`.
- **Gate FE-FOUNDATION-01: `BLOCKED`** — hanya karena H-9 (pembersihan log lokal). Lihat §21.

---

## 2. Security Incident Status

### SEC-01 — GitHub PAT di remote URL

| Langkah | Status | Bukti |
|---|---|---|
| Revoke token lama | **REVOKED — atestasi pemilik** (2 Okt 2026) | Jawaban pemilik pada fase finalisasi. Tidak diverifikasi teknis karena verifikasi membutuhkan pemakaian token lama (dilarang) |
| Remote frontend & backend bebas kredensial | **DONE** | `git remote -v` → `https://github.com/evanandrian/saas_lms_{frontend,backend}.git` |
| Git history, tags, stash | Bersih | Pemindaian pola token di semua ref: 0 |
| Working tree & dokumentasi | Bersih | Pemindaian pola token & URL berkredensial: 0 |
| Credential helper | `osxkeychain`, dari **system** config (`git config --global credential.helper` kosong) | `git config --show-origin` |
| **Log lokal** | **NOT CLEAN** | Lihat tabel di bawah |

### SEC-01-LOCAL-LOGS

Pemindaian hanya mencetak nama file dan prefix hash SHA-256; nilai token tidak pernah dicetak. Token SEC-01 = hash `976df032e73a…`.

| Lokasi | Jenis | Kemunculan | Status |
|---|---|---|---|
| `~/.claude/projects/-Users-vandrian-vandrian-ea-sc-lms-saas-lms-frontend/551656f9-….jsonl` | Transcript sesi Claude Code | 4 | NOT CLEAN |
| `~/.claude/projects/-Users-vandrian-vandrian-ea-sc-lms-saas-lms-frontend/df215931-….jsonl` | Transcript sesi Claude Code (sesi ini) | 4 | NOT CLEAN |
| `~/.claude-mem/claude-mem.db` (`observations.subtitle/facts`, `tool_uses.tool_response`, FTS) | DB memori claude-mem | 7 | NOT CLEAN |
| `~/.claude-mem/chroma/chroma.sqlite3` (`embedding_metadata`, `embedding_fulltext_search`, `embeddings_queue`) | Vector store claude-mem | 26 | NOT CLEAN |
| **`~/.zsh_history`** | Riwayat shell pengguna — **baru ditemukan**; token pernah diketik di terminal | 6 | NOT CLEAN |
| `~/.claude/plugins/marketplaces/thedotmack/tests/utils/redaction.test.ts` | Fixture test plugin, hash **berbeda** (`9d6060e21ef8…`) | 2 | **False positive** — bukan token SEC-01, tidak perlu tindakan |

**Upaya pembersihan:** skrip redaksi in-place (backup sementara, `secure_delete`, optimize FTS, checkpoint WAL, `integrity_check`) **ditolak oleh permission classifier Claude Code** dengan alasan *Session Transcript Tampering*. Sesuai aturan, agen tidak mencari jalan lain. Tidak ada file log yang diubah.

**Yang perlu dilakukan pemilik** (dari terminal sendiri, di luar sesi Claude Code):
1. Tutup sesi Claude Code ini dan hentikan worker claude-mem dulu, agar file tidak sedang ditulis.
2. Bersihkan atau hapus dua file transcript di atas.
3. Hapus observasi claude-mem yang memuat token lewat tooling claude-mem, atau redaksi lewat `sqlite3`, lalu `VACUUM`.
4. Hapus baris yang memuat token dari `~/.zsh_history`. Sesi zsh yang masih terbuka dapat menulis ulang riwayat dari memori, jadi tutup semua terminal lebih dulu.
5. Pindai ulang dan cocokkan dengan prefix hash: pastikan 0 kecocokan.

Karena token sudah di-revoke, salinan-salinan ini tidak lagi memberi akses. Pembersihan tetap diwajibkan H-9.

---

## 3. Repository State

| Item | Sebelum DECISION-01 | Saat finalisasi |
|---|---|---|
| Branch / commit | `main`, `bb24578` | Sama (tidak ada commit) |
| Remote | Berisi kredensial | Bebas kredensial |
| File | `README.md` stub | README final, AI-CONTEXT, ADR-019..021, docs, `.gitignore`, `.env.example`, `.nvmrc`, template PR |
| `src/`, `package.json`, lockfile, konfigurasi SvelteKit/Vite | Tidak ada | **Tidak ada** (pre-bootstrap) |
| Frontend Foundation Specification v1.0 | Tidak ditemukan | Tidak ditemukan → BLOCKED-FE-SPEC |

---

## 4. Decision Matrix

| DECISION | FE-00 | Topik | Keputusan final | Status | Human | Artefak |
|---|---|---|---|---|---|---|
| 001 | 001 | Package manager | pnpm 12.8.1 | RESOLVED | — | README §11–12 |
| 002 | 006 | Node.js | 24 LTS, `.nvmrc` = `24` | RESOLVED | — | `.nvmrc` |
| 003 | 002 | Adapter | adapter-node 5.x, SvelteKit 2.70.3 | RESOLVED | H-2 | ADR-020 |
| 004 | 003 | API topology | Same-origin `/api/v1` di host saat ini; `api.<root>` non-browser | RESOLVED + DOWNSTREAM (OQ-1) | H-3 | ADR-019 |
| 005 | 003 | Auth & session | Cookie HttpOnly host-only (access + refresh) | RESOLVED + DOWNSTREAM (OQ-2, BLOCKED-02) | H-3 | ADR-019 |
| 006 | 004 | Generated client | Orval → `src/lib/api/generated/`; `@lms/api-client` DEFERRED | RESOLVED + BLOCKED (BLOCKED-01) | H-4 | ADR-021 |
| 007 | 005 | Host → route group | §11 | RESOLVED | H-6 | ADR-019 |
| 008 | 007 | i18n | Modul tipis, `id` default & fallback, cookie, tanpa deteksi browser | RESOLVED | — | §12 |
| 009 | 008 | Validasi | Zod 4.x (dipasang di FE-01 saat fondasi form) | RESOLVED | H-5 | §13 |
| 010 | 009 | Data grid | — | DEFERRED | — | §14 |
| 011 | 011 | Vocabulary | `institution`, `assessment`, `assessment.create`, `/assessments` | RESOLVED + DOWNSTREAM (seed permission backend) | H-7 | §15 |
| — | 010 | Lokasi ADR | `docs/adr/ADR-NNN-<slug>.md` | RESOLVED | — | `docs/adr/` |
| — | — | CSRF | Wajib; backend otoritas; frontend tidak membuat mekanisme sendiri | RESOLVED + DOWNSTREAM (OQ-3) | H-8 | ADR-019 §5 |
| — | — | Skeleton | 5.0.1 | RESOLVED (kompatibilitas diverifikasi FE-01) | H-10 | ADR-020 |

### Status keputusan manusia

| H | Topik | Status |
|---|---|---|
| H-1 | Revoke PAT | **RESOLVED** (atestasi pemilik; remote bersih terverifikasi) |
| H-2 | Adapter | **RESOLVED** |
| H-3 | ADR-019 API + session | **RESOLVED_WITH_BACKEND_DEPENDENCIES** |
| H-4 | ADR-021 API client | **RESOLVED_WITH_OPENAPI_DEPENDENCY** |
| H-5 | Validasi Zod 4 | **RESOLVED** |
| H-6 | Host publik/platform | **RESOLVED** (deviasi SAD dicatat di ADR-019) |
| H-7 | Vocabulary `assessment` | **RESOLVED** |
| H-8 | CSRF | **RESOLVED_WITH_BACKEND_DEPENDENCY** |
| H-9 | Pembersihan log lokal | **NOT RESOLVED** — pembersihan ditolak permission classifier; menunggu tindakan pemilik (§2). *Kemudian: DEFERRED CLEANUP, non-blocker (SECURITY-GATE-01, §0)* |
| H-10 | Skeleton 5 | **RESOLVED** |

---

## 5. DECISION-001 — Package Manager

**pnpm 12.8.1** (dist-tag `latest` npm, 2 Okt 2026).

| Kriteria | npm | pnpm | yarn |
|---|---|---|---|
| Reproducibility | Baik | Baik | Baik |
| Isolasi dependency (tanpa phantom dependency) | Lemah | **Kuat** | Bergantung mode |
| Workspace masa depan | Ada | **Matang** | Ada |
| Efisiensi install | Standar | **Tinggi** | Baik |

Penguncian di FE-01: `"packageManager": "pnpm@12.8.1"`, `"engines": { "node": ">=24 <25" }`, `pnpm-lock.yaml` di-commit, CI `pnpm install --frozen-lockfile`. Padanan `npm audit` (SAD §10.5) adalah `pnpm audit`.

---

## 6. DECISION-002 — Node.js Version

**Node.js 24 LTS** (rilis 24 terbaru `v24.21.0`, LTS *Krypton*, 7 Sep 2026). `.nvmrc` berisi `24` → patch keamanan 24.x selalu terbaru; reproducibility dependency dijaga lockfile. Node lokal saat ini `v20.20.2` (tidak memenuhi baseline).

Inferensi: Node 24 akan masuk *Maintenance LTS* saat Node 26 menjadi LTS (sekitar akhir Okt 2026). Perpindahan mayor lewat ADR baru.

---

## 7. DECISION-003 — SvelteKit Adapter

**adapter-node 5.x di atas SvelteKit 2.70.3 dan Node.js 24** — ADR-020 (Accepted).

| Kebutuhan | `adapter-static` | `adapter-node` |
|---|---|---|
| `hooks.server.ts` (tenant, sesi, CSP) | Tidak | Ya |
| Cookie HttpOnly & SSR terautentikasi | Tidak | Ya |
| Form action + CSRF origin check | Tidak | Ya |
| Container `lms-<env>-web` | — | Ya |
| PWA (Fase 2) | Ya | Ya |
| Capacitor (Fase 3) | Ya | Build SPA terpisah (ADR baru) |

`adapter-node@6` membutuhkan Kit 3 → tidak dipakai.

---

## 8. DECISION-004 — API Topology

**Browser memanggil `https://<current-host>/api/v1/...` secara same-origin; `api.<root>` hanya untuk non-browser** — ADR-019 (Accepted). Otoritas: SAD Bagian I §6.1 di atas Bagian III §6.2–6.3.

| Aspek | Keputusan |
|---|---|
| Identifikasi tenant | Backend dari `Host`; frontend hanya untuk routing/UX |
| SSR | `LMS_API_INTERNAL_URL` + identitas tenant eksplisit (**OQ-1**, downstream) |
| CORS | Tidak diperlukan untuk web |
| Cookie | Host-only |
| Tenant mismatch / invalid | ADR-019 §4 |

`PUBLIC_LMS_API_BASE_URL` (SAD) tidak dipakai build web; `LMS_API_INTERNAL_URL` menjadi variabel server-only.

---

## 9. DECISION-005 — Authentication & Session

ADR-019 (Accepted). Access + refresh token di cookie `HttpOnly; Secure; SameSite=Lax` host-only; tidak ada token di storage browser; refresh single-flight antar-tab; logout via backend; `TENANT_MISMATCH` → logout paksa. **Backend adalah otoritas**; route guard, `can()`, menu tersembunyi, dan state UI bukan batas keamanan.

Downstream: OQ-2 (cookie access token & `Path`), BLOCKED-02 (kontrak auth).

Catatan Fase 2: logout tidak boleh menghapus jawaban ujian yang belum tersinkron (NFR-05).

---

## 10. DECISION-006 — Generated API Client

ADR-021 (Accepted, implementasi BLOCKED).

```
OpenAPI → Orval → src/lib/api/generated/ → Feature API → Route/UI
                    (via client.ts sebagai fetcher)
```

`generated/` tidak diedit manual; OpenAPI tidak dikarang; `@lms/api-client` DEFERRED. BLOCKED-01 tidak memblok bootstrap shell, tetapi memblok implementasi client.

---

## 11. DECISION-007 — Host → Route Group

Topologi kanonik; nilai domain dari `PUBLIC_LMS_ROOT_DOMAIN` (contoh production: `namalms.id`).

| Host | Route group | Prefix | Tenant context | Auth | Tidak terautentikasi | Tenant tidak valid |
|---|---|---|---|---|---|---|
| `<root>` (publik) | `(public)` | `/`, `/pricing`, `/register` | Tidak | — | — | — |
| `www.<root>` | — | — | — | — | Redirect permanen ke `<root>` (edge; fallback `hooks.server.ts`) | — |
| `platform.<root>` | `(platform)` | `/console/*` | Tidak | Sesi platform (MFA TOTP, SAD §9.1) | Redirect `/login` | — |
| `platform.<root>` | `(public)` | `/login` | Tidak | — | — | — |
| `<tenant>.<root>` | `(school)` | `/app/*` | Ya | Sesi tenant | Redirect `/login` | Sintaks salah → 404; `TENANT_NOT_FOUND` → halaman khusus |
| `<tenant>.<root>` | `(join)` | `/s/<sessionCode>` | Ya | Peserta tamu tanpa akun (F11) | — | Sama |
| `<tenant>.<root>` | `(public)` | `/login` | Ya | — | — | Sama |
| `api.<root>` | Bukan SvelteKit | — | `X-Tenant` | Bearer (Fase 3) | — | — |

**Pemetaan terhadap SAD:**
- Folder route mengikuti SAD (`(platform)/console/`, `(school)/app/`, `(join)/s/[sessionCode]/`), sehingga URL konsol menjadi `platform.<root>/console/...`.
- Host konsol `platform.<root>` menggantikan `console.namalms.id` (Bagian III §6.3) — deviasi H-6, tercatat di ADR-019.
- Subdomain cadangan: `www`, `platform`, `api`.
- Prefix yang tidak cocok dengan host → 404. `/` di host tenant → `/app`; `/` di `platform` → `/console`.
- Dev lokal: `<tenant>.localhost`, `platform.localhost`, `PUBLIC_LMS_ROOT_DOMAIN=localhost` (dukungan `*.localhost` per browser diverifikasi FE-01).
- Matcher: `[assessmentId=uuid]` dst.; `[sessionCode]` bukan UUID (contoh SAD `TO-UTBK-01`), matcher dibuat setelah format resmi ada di kontrak.

---

## 12. DECISION-008 — i18n

| Unsur | Keputusan |
|---|---|
| Struktur | `src/lib/i18n/id.json`, `en.json`, `index.ts` |
| Implementasi | Modul tipis tanpa dependency; `Intl` untuk angka/tanggal |
| Kunci | `<module>.<screen>.<element>`; `errors.<KODE>` |
| Locale | `id`, `en`; default `id`; fallback `id` |
| Deteksi bahasa browser | **Tidak ada** |
| Persistence | Cookie non-sensitif (nama diusulkan `lms_locale`) |
| SSR | `hooks.server.ts` → `event.locals.locale` → `<html lang="...">` |
| Zona waktu | Zona waktu tenant (SAD §10.4, BR-04) |
| TR-09 | Lint teks literal; tooling dipilih di FE-01 atau setelahnya |

---

## 13. DECISION-009 — Validation

**Zod 4.x** (H-5). Dipakai untuk validasi form, skema client-side, validasi input awal, dan batas tipe form. Dipasang di FE-01 saat fondasi form/skema dibuat, bukan pada fase ini. **Validasi frontend bukan batas keamanan**; backend tetap otoritas (400 `VALIDATION_FAILED`). Untuk NFR-12, varian `zod/mini` dapat dipertimbangkan.

---

## 14. DECISION-010 — Data Grid

**DEFERRED.** Kebutuhan: daftar murid/guru/kelas/impor, presensi, nilai (`ScoreTable`), rekap asesmen dan ekspor (F11), tagihan dan daftar tenant di konsol.

Batasan yang sudah diketahui: paginasi keyset (tidak ada "lompat ke halaman N" dan tidak ada total baris); sort/filter di server; WCAG 2.1 AA; perangkat rendah (NFR-12). Keputusan diambil saat layar daftar pertama di Fase 1; kandidat awal pustaka tabel headless (mis. TanStack Table) dengan styling Skeleton.

---

## 15. DECISION-011 — Domain Vocabulary

| Konflik | Resolusi | Status |
|---|---|---|
| `school_unit` vs `institution` | **`institution`** (Bagian III §1; `institution_m`; `/api/v1/school/institutions`, F10) | RESOLVED |
| Route `student/exams/` vs aturan `assessment` | **`/assessments`**, mis. `student/assessments/[assessmentId=uuid]/take/` (H-7) | RESOLVED — deviasi dari pohon contoh SAD §5.1 |
| Permission `exam.create` vs `assessment.create` | **`assessment.create`** (H-7) | RESOLVED; DOWNSTREAM: seed permission & konstanta backend (`PermExamCreate` di SAD §3.3) harus diselaraskan oleh backend |
| `score.publish` vs `grade.publish` (Lampiran) | `score.publish` | RESOLVED |
| Lokasi unit test | Di samping file (`<file>.test.ts`); `tests/e2e/` untuk Playwright | RESOLVED |

Terminologi backend, database, dan API **tidak** diubah dari frontend tanpa verifikasi sumber. Keselarasan permission adalah dependensi backend.

**Pemetaan kode ↔ UI** (label final ditetapkan saat i18n diisi):

| Kode | UI `id` | UI `en` |
|---|---|---|
| `institution` | Lembaga | Institution |
| `class` / TS `schoolClass` | Kelas | Class |
| `subject` | Mata pelajaran | Subject |
| `student` | Murid | Student |
| `guardian` | Orang tua/wali | Guardian |
| `assessment` | Asesmen; boleh "Ujian"/"Ulangan"/"Kuis" sesuai `assessment_type` | Assessment |
| `attempt` | Pengerjaan | Attempt |
| `assignment` | Tugas | Assignment |
| `submission` | Pengumpulan tugas | Submission |
| `score` / `final_grade` | Nilai / Nilai akhir | Score / Final grade |
| `report_card` | Rapor | Report card |
| `learning_objective` | Tujuan pembelajaran | Learning objective |
| `attendance` | Presensi | Attendance |
| `seat` | Kursi | Seat |
| `exam_session` | Sesi ujian | Exam session |

"Ujian" hanya label presentasi; tidak menjadi identifier kode, route, permission, atau kunci i18n (kecuali `exam_session`).

---

## 16. ADR Mapping

| ADR | Judul | Status |
|---|---|---|
| ADR-001..018 | SAD §11 | Diterima 1 Okt 2026 |
| [ADR-019](../adr/ADR-019-frontend-api-session-topology.md) | Frontend API & Session Topology | **Accepted** (dependensi backend OQ-1..3, OQ-5) |
| [ADR-020](../adr/ADR-020-sveltekit-runtime-adapter-strategy.md) | SvelteKit Runtime & Adapter Strategy | **Accepted** |
| [ADR-021](../adr/ADR-021-openapi-generated-client-strategy.md) | OpenAPI Contract & Generated API Client Strategy | **Accepted** (implementasi BLOCKED-01) |

Tidak ada nomor ganda. Setiap ADR memuat Context, Decision, Rationale, Consequences, Security considerations, Dependencies, Alternatives considered, Status, dan Date. ADR-019, ADR-021, dan H-7 mengubah isi SAD → perlu revisi SAD 1.0.2.

---

## 17. Frontend Foundation Baseline

Kanonik di **README.md §11**.

| Komponen | Versi terkunci | Catatan |
|---|---|---|
| Node.js | 24 LTS | `.nvmrc` |
| pnpm | 12.8.1 | `packageManager` |
| `@sveltejs/kit` | 2.70.3 | Registry latest 3.0.0 — tidak dipakai (C-01) |
| `svelte` | 5.57.1 | — |
| `@sveltejs/adapter-node` | 5.x (terbaru 5.5.7) | v6 butuh Kit 3 |
| `tailwindcss` | 4.3.3 | — |
| Skeleton | 5.0.1 | Peer: `svelte ^5.40.0`, `tailwindcss ^4.0.0` |
| Zod | 4.x | Dipasang di FE-01 |
| Orval | Mayor terbaru saat implementasi (8.x per 2 Okt 2026) | Dipasang setelah BLOCKED-01 terbuka |
| Vitest / Testing Library / Playwright | Ditetapkan FE-01 | Kompatibel dengan Vite yang didukung Kit 2.70.3 |

Kompatibilitas seluruh kombinasi diverifikasi saat FE-FOUNDATION-01.

---

## 18. Development Environment Baseline

| Item | Nilai | Status |
|---|---|---|
| `.nvmrc` | `24` | Ada |
| `.gitignore` | Minimum prompt + output Vite/Playwright | Ada |
| `.env.example` | `PUBLIC_LMS_ROOT_DOMAIN`, `LMS_API_INTERNAL_URL`, `PUBLIC_LMS_API_BASE_URL` (dikomentari) | Ada |
| Corepack | Metode pemasangan pnpm | README §12.3 |
| Template PR | TR-10 | Ada |
| `package.json` & script | — | FE-FOUNDATION-01 |

---

## 19. Resolved vs Downstream vs Blocked

### RESOLVED (dikunci)

DECISION-001..009, 011; H-1..H-8, H-10; lokasi ADR; ADR-019..021 Accepted.

### DOWNSTREAM DEPENDENCY (tidak memblok bootstrap shell)

| ID | Dependensi | Pemilik | Memblok fase |
|---|---|---|---|
| OQ-1 | Identitas tenant SSR → API internal | Backend | Panggilan API dari SSR |
| OQ-2 | Access token via cookie; nama & `Path` cookie | Backend | Implementasi sesi |
| OQ-3 | Mekanisme CSRF backend | Backend | Operasi tulis |
| OQ-5 | Subdomain cadangan di registrasi tenant | Backend | Registrasi tenant |
| PERM-ALIGN | Seed permission `assessment.*` (bukan `exam.*`) | Backend | `can()` dengan data nyata |
| INGRESS | Routing `/api/*` per host, `x-forwarded-*` tepercaya, redirect `www` | DevOps | Deploy |
| SAD-REV | Revisi SAD 1.0.2 (platform host, www, vocabulary, `@lms/api-client` ditunda) | Pemilik SAD | Tidak ada |
| DATA-GRID | Pemilihan pustaka | Frontend | Layar daftar pertama |

### BLOCKED

| ID | Item | Memblok | Memblok bootstrap shell? |
|---|---|---|---|
| BLOCKED-01 | OpenAPI | Generated client, feature API | Tidak |
| BLOCKED-02 | Kontrak auth backend | Login nyata | Tidak |
| BLOCKED-04 | Katalog permission backend | `can()` dengan data nyata | Tidak |
| BLOCKED-FE-SPEC | Frontend Foundation Specification v1.0 tidak tersedia; **tidak dibuat pengganti**. README §11 menjadi baseline kanonik | Validasi silang | Tidak |
| **BLOCKED-SEC-01-LOGS** | **H-9: log lokal masih memuat token lama** | **Gate fondasi** | **Ya** (aturan gate #2 dan #11) |

---

## 20. Remaining Human Actions

| # | Tindakan | Memblok gate? |
|---|---|---|
| 1 | Bersihkan log lokal sesuai §2 (transcript Claude Code, DB claude-mem, `~/.zsh_history`), lalu pindai ulang | **Ya** |
| 2 | Setelah langkah 1, jalankan ulang pemeriksaan gate (verifikasi hash-only) | **Ya** |
| 3 | Revisi SAD 1.0.2 | Tidak |

---

## 21. FE-FOUNDATION-01 Readiness

> **Historis.** Status di bawah adalah hasil fase finalisasi. Status ini kemudian digantikan oleh FE-FOUNDATION-SECURITY-GATE-01 (`SECURITY_GATE_PASS_WITH_RESIDUAL_RISK`) — lihat §0.

**Status: `BLOCKED`**

| Syarat gate | Status |
|---|---|
| 1. PAT revoked | ✅ (atestasi pemilik) |
| 2. Local logs cleaned | ❌ **5 lokasi masih memuat token** |
| 3. Remote bebas kredensial | ✅ (terverifikasi) |
| 4–10. H-2..H-8 | ✅ |
| 11. H-9 | ❌ |
| 12. H-10 | ✅ |

**Item pemblokir tunggal:** BLOCKED-SEC-01-LOGS (H-9). Setelah pemilik membersihkan log dan pemindaian ulang menunjukkan 0 kecocokan, gate dapat diubah menjadi `READY_FOR_FE_FOUNDATION_01` tanpa perubahan keputusan lain.
