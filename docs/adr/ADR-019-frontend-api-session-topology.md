# ADR-019 — Frontend API & Session Topology

| Atribut | Nilai |
|---|---|
| Status | **Accepted** — dengan dependensi backend (OQ-1..OQ-3, OQ-6). **Revisi 1** (3 Oktober 2026, FE-05R): entry login di root domain publik |
| Date | 2 Oktober 2026 (diusulkan FE-FOUNDATION-DECISION-01; diterima FE-FOUNDATION-DECISION-01-FINALIZATION, keputusan manusia H-3, H-6, H-8) |
| Menyelesaikan | DECISION-004 (API topology), DECISION-005 (auth & session), DECISION-007 (host → route group) |
| Terkait | SAD §6.1, §9.1–9.3, §9.6, Bagian III §4, §6.2, §6.3; ADR-014, ADR-016; ADR-020, ADR-021 |
| Mengubah SAD | **Ya** — host konsol `console.namalms.id` (Bagian III §6.3) diganti `platform.namalms.id`. Perlu dicatat di revisi SAD 1.0.2 |

## Context

SAD memuat dua gambaran host API yang berbeda:

| Sumber | Isi |
|---|---|
| SAD Bagian I §6.1 | Ingress menerima `https://<subdomain>.<domain>/api/v1/school/...`; middleware tenancy membaca subdomain (atau header `X-Tenant` dari aplikasi mobile) |
| SAD Bagian III §6.2–6.3 | Domain `api.namalms.id`, `console.namalms.id`; `PUBLIC_LMS_API_BASE_URL=https://api.namalms.id` |

Lampiran A SAD: *"Bila ada perbedaan, tab SAD yang benar."* Maka Bagian I §6.1 menentukan topologi request tenant.

SAD §9.1 menetapkan JWT akses 15 menit dan refresh token di cookie `HttpOnly; Secure; SameSite=Lax`, tetapi tidak menetapkan penyimpanan access token di frontend maupun cara SSR mengautentikasi.

## Decision

### 1. Topologi host

| Host (topologi kanonik) | Contoh production | Dilayani | Route group / prefix |
|---|---|---|---|
| Root domain publik | `namalms.id` | SvelteKit | `(public)`: `/` → `/login`, `/register`; `(auth)`: `/login` (Revisi 1) |
| `www.<root>` | `www.namalms.id` | Edge/ingress (fallback: `hooks.server.ts`) | Redirect permanen ke root domain |
| `platform.<root>` | `platform.namalms.id` | Ingress: `/api/*` → API Go; lainnya → SvelteKit | `(platform)`: `/console/*`; `(auth)`: `/login`; `/` → login/landing |
| `<tenant>.<root>` | `<tenant>.namalms.id` | Ingress: `/api/*` → API Go; lainnya → SvelteKit | `(school)`: `/app/*`; `(join)`: `/s/<sessionCode>`; `(auth)`: `/login`; `/` → login/landing |
| `api.<root>` | `api.namalms.id` | API Go | Bukan untuk browser web; dicadangkan untuk klien non-browser |

**Topologi kanonik vs nilai domain.** Struktur host di atas adalah keputusan arsitektur. Nilai domain (`namalms.id`) bersifat environment-specific dan **selalu** dibaca dari `PUBLIC_LMS_ROOT_DOMAIN`; tidak boleh di-hardcode.

**Subdomain cadangan** yang tidak pernah diperlakukan sebagai tenant: `www`, `platform`, `api`. Konsistensi dengan validasi registrasi tenant di backend adalah dependensi (OQ-5).

### 2. Alur request

| Alur | Keputusan |
|---|---|
| Browser → API | Same-origin, path relatif `https://<current-host>/api/v1/...`. Tanpa CORS. Backend mengidentifikasi tenant dari `Host` |
| SSR → API | Ke `LMS_API_INTERNAL_URL` (server-only). Identitas tenant diteruskan eksplisit; header & format nilai = **OQ-1** |
| Dev lokal | Vite dev server mem-proxy `/api` ke `LMS_API_INTERNAL_URL` (FE-FOUNDATION-01) |
| Non-browser (mobile, Fase 3) | `api.<root>` + `X-Tenant` + `Authorization: Bearer`; ADR tersendiri saat Fase 3 |

### 3. Token & sesi

| Unsur | Keputusan |
|---|---|
| Refresh token | Cookie `HttpOnly; Secure; SameSite=Lax` (SAD §9.1), rotasi tiap pakai |
| Access token (web) | Cookie `HttpOnly; Secure; SameSite=Lax` yang diterbitkan backend. JavaScript tidak membaca token |
| Scope cookie | **Host-only** (tanpa atribut `Domain`) |
| Storage terlarang | `localStorage`, `sessionStorage`, IndexedDB, URL, log — untuk token apa pun |
| Refresh | `401 TOKEN_EXPIRED` → satu refresh (single-flight, koordinasi antar-tab via Web Locks API) → ulangi sekali → gagal = sesi berakhir |
| Logout | Operasi logout backend → bersihkan state klien → `invalidateAll()` → `/login` |
| Endpoint auth | Dari OpenAPI. ADR ini tidak mendefinisikan path/operationId |

### 4. Perilaku status

| Kondisi | Perilaku frontend |
|---|---|
| Tidak terautentikasi di `/app/*` atau `/console/*` | Redirect `/login?redirectTo=<path relatif tervalidasi>` |
| `401 UNAUTHENTICATED` | Ke `/login` |
| `401 TOKEN_EXPIRED` | Refresh sekali |
| `403 FORBIDDEN` | Pesan tidak punya akses; tidak logout |
| `403 TENANT_MISMATCH` | Logout paksa + pesan |
| `404 TENANT_NOT_FOUND` | Halaman "lembaga tidak ditemukan"; tidak redirect ke tenant lain |
| `423 TENANT_READ_ONLY` | Banner read-only; aksi tulis dinonaktifkan di UI |
| Subdomain tidak valid secara sintaks | 404 tanpa memanggil API |
| Prefix tidak cocok dengan host (`/console/*` di host tenant, `/app/*` di `platform`) | 404 |

### 5. CSRF (H-8)

Karena autentikasi browser memakai cookie, perlindungan CSRF **wajib** untuk operasi yang mengubah state:

- Cookie `SameSite=Lax`; tidak ada perubahan state lewat `GET`.
- Form action SvelteKit: `csrf.checkOrigin` (aktif default) — membutuhkan host/protokol yang benar dari proxy (ADR-020).
- API berbasis cookie: **backend adalah otoritas** — validasi `Origin` (dan `Referer`/`Sec-Fetch-Site` bila sesuai) serta mekanisme CSRF backend = **OQ-3**.
- Frontend **tidak** membuat mekanisme CSRF mandiri (mis. token buatan sendiri) yang dapat bertentangan dengan backend. Bila backend menetapkan token CSRF, `client.ts` mengikuti kontrak itu.

### 6. Aspek lain

| Aspek | Keputusan |
|---|---|
| CORS | Tidak dibutuhkan untuk web; `api.<root>` tidak mengizinkan origin browser web |
| CSP | `connect-src 'self'` untuk web; detail di FE-FOUNDATION-01 |
| Cache/CDN | `/_app/immutable/*` cache panjang; HTML terautentikasi `private, no-store`; `/api/*` tidak di-cache CDN kecuali ditandai backend |
| Observability | `X-Request-ID` dari backend ditampilkan pada pesan error; SSR meneruskannya bila ada |
| WebSocket (masa depan) | Same-origin `wss://<current-host>/api/...` |
| Otorisasi UI | `can('<module>.<action>')` hanya UX; backend otoritas |

## Rationale

- Mengikuti SAD Bagian I §6.1 (otoritas tertinggi untuk alur request).
- Same-origin per host membuat browser sendiri yang mengisolasi sesi antar-tenant dan antara tenant dan platform.
- Cookie HttpOnly memungkinkan SSR terautentikasi tanpa mengekspos token ke JavaScript.
- Tidak membutuhkan CORS berkredensial maupun cookie lintas subdomain.

## Security considerations

- **Isolasi tenant:** cookie host-only → sesi tenant A tidak pernah terkirim ke tenant B atau ke `platform`.
- **XSS:** token tidak dapat dibaca skrip; dampak XSS terbatas pada aksi selama halaman terbuka (mitigasi lanjutan: CSP ketat, sanitasi HTML SAD §9.6).
- **CSRF:** lihat §5; ketergantungan pada OQ-3.
- **Tenant trust:** frontend tidak memercayai identitas tenant dari klien; SSR meneruskan tenant yang di-resolve dari `Host` yang dipercaya (ADR-020), backend memvalidasi `TENANT_MISMATCH`.
- **Open redirect:** `redirectTo` hanya path relatif.
- **Platform:** MFA TOTP wajib untuk role platform (SAD §9.1) — ditegakkan backend.

## Dependencies

| ID | Dependensi | Pemilik | Memblok |
|---|---|---|---|
| OQ-1 | Header & format identitas tenant untuk SSR → API internal | Backend | Panggilan API dari SSR |
| OQ-2 | Backend menerima access token dari cookie; nama cookie; `Path` refresh cookie (menentukan apakah SSR dapat me-refresh) | Backend | Implementasi sesi |
| OQ-3 | Mekanisme CSRF backend untuk metode tidak aman berbasis cookie | Backend | Operasi tulis via API |
| OQ-5 | Daftar subdomain cadangan di validasi registrasi tenant | Backend | Registrasi tenant |
| BLOCKED-02 | Kontrak auth (endpoint login/refresh/logout/me) di OpenAPI | Backend | Login nyata |
| OQ-6 | Mekanisme serah-terima sesi dari login di root domain ke host tenant/platform (cookie host-only §3 tidak terbawa lintas host): mis. resolusi lembaga dari email + redirect ke login tenant, atau kode sekali pakai | Backend + produk | Login nyata dari root domain (Revisi 1) |
| SAD-REV | Revisi SAD 1.0.2: `platform.namalms.id`, `www` → apex | Pemilik SAD | Tidak memblok |

Dependensi ini **tidak** memblok bootstrap shell FE-FOUNDATION-01.

## Alternatives considered

| Alternatif | Alasan ditolak |
|---|---|
| Browser → `api.<root>` + `X-Tenant` | Bertentangan dengan SAD Bagian I §6.1; butuh CORS berkredensial dan cookie lintas subdomain |
| Access token di memori JS + `Authorization` | SSR tidak dapat mengautentikasi tanpa jalur tambahan; token terpapar XSS |
| Token di `localStorage` | Dilarang: terpapar XSS, persisten |
| BFF penuh (semua `/api` via SvelteKit) | Bertentangan dengan ingress SAD §6.1; hop tambahan di jalur ujian kritis (NFR-04) |
| Host konsol `console.<root>` (SAD Bagian III §6.3) | Diganti `platform.<root>` atas keputusan pemilik (H-6) |

## Consequences

- Ingress wajib merutekan `/api/*` pada setiap host tenant dan `platform`.
- Dev lokal memakai `<tenant>.localhost` dan `platform.localhost`.
- Bila backend menolak OQ-2, ADR ini direvisi lewat ADR baru (fallback: access token di memori, SSR terbatas).

## Revisi 1 — Entry login di root domain publik (3 Oktober 2026, FE-05R)

**Keputusan pemilik produk:** membuka aplikasi di host mana pun langsung menampilkan login. Menggantikan keputusan FE-05 D3 ("root domain tetap halaman publik").

| Aspek | Sebelum | Sesudah |
|---|---|---|
| `<root>/` | Halaman publik | `307 → /login` |
| `<root>/login` | 404 (login hanya platform & tenant) | Dilayani (`(auth)` group) |
| `platform.<root>/`, `<tenant>.<root>/` | login atau landing policy (FE-05) | Tidak berubah |
| `/register` | Root domain | Tidak berubah (tautan dari login) |
| Halaman publik/marketing | `/` | Tidak ada; bila dibutuhkan kelak, ditempatkan di path lain lewat keputusan baru |

**Implementasi:** `/` adalah endpoint `+server.ts` (`(public)`) yang memanggil `resolveLanding` (Dashboard Routing Policy); `/login` dipindah ke group `(auth)` dengan layout tanpa shell aplikasi (split layar penuh sesuai referensi `FLIXARE App.html`).

**Batas sesi tetap:** cookie sesi tetap host-only (§3). Login yang dimulai di root domain tidak dapat langsung membuat sesi untuk host tenant/platform; mekanismenya adalah **OQ-6** (backend). Sampai OQ-6 dan BLOCKED-02 terjawab:

- produksi: tombol masuk tetap nonaktif (FE-04 D6);
- dev: persona sesi contoh di root domain mengirim form langsung ke host area-nya (`<tenant>.localhost` / `platform.localhost`), sehingga cookie tercipta di host yang benar.

**Konsekuensi:** URL produksi `namalms.id` tidak lagi menampilkan konten publik. Rute lain di root domain (`/register`, `/register/plan`) tidak berubah.

## Revisi 2 — Host gabungan khusus development (3 Oktober 2026, FE-05R)

**Keputusan pemilik produk:** saat development, login platform maupun sekolah memakai satu URL (`localhost:<port>`). **Produksi tidak berubah** (subdomain per area/tenant sesuai §1).

- `hooks.server.ts`: bila `dev` dan host = root domain, `locals.host = { kind: 'unified' }`. Konstanta `dev` statis, sehingga cabang ini tidak pernah aktif di build produksi (diverifikasi: `localhost/console` → 404 pada `node build`).
- Host `unified` melayani `/login`, `/console/*`, `/app/*`, `/register`, `/select-context`, `/access-denied`.
- Dashboard Routing Policy: di host `unified` semua membership berlaku; area ditentukan sesi (konteks aktif / `/select-context`), bukan host. Otorisasi per area tetap berlaku (mis. guru → `/console` = akses ditolak).
- Subdomain dev (`<tenant>.localhost`, `platform.localhost`) tetap berfungsi seperti sebelumnya.

**Batasan:** di host gabungan, isolasi cookie per tenant (§3) tidak ada; cocok hanya untuk development satu pengguna. Tenant data kelak ditentukan dari konteks aktif sesi.

