# ADR-021 — OpenAPI Contract & Generated API Client Strategy

| Atribut | Nilai |
|---|---|
| Status | **Accepted** — implementasi **BLOCKED** oleh BLOCKED-01 (OpenAPI belum tersedia) |
| Date | 2 Oktober 2026 (diusulkan FE-FOUNDATION-DECISION-01; diterima FE-FOUNDATION-DECISION-01-FINALIZATION, keputusan manusia H-4, H-5) |
| Menyelesaikan | DECISION-006 (generated API client) |
| Terkait | C-06, ADR-016, TR-07, Bagian III §4, §5.1–5.2, Fase E0-10; ADR-019 |

## Context

- TR-07: kontrak ditulis dulu di `openapi.yaml`, lalu klien TS di-generate; CI gagal bila spec dan implementasi berbeda.
- Bagian III §5.1: `src/lib/api/generated/` ("JANGAN diedit manual") + `client.ts`.
- Fase E0-10 menyebut "Paket `@lms/api-client`" — berbeda dengan Bagian III §5.1.
- Bagian III §5.2: nama fungsi API = operationId; tipe TS = nama skema OpenAPI.
- Fakta: `openapi.yaml` belum ada di kedua repository.

## Decision

```
OpenAPI (repo backend) → salinan ter-pin di frontend → Orval → src/lib/api/generated/
  → Feature API (<modul>.api.ts) → Route / UI
```

1. Spec dimiliki repo backend. Frontend menyimpan **salinan ter-pin** pada versi/tag backend tertentu (lokasi diusulkan `contract/openapi.yaml` + catatan asal), ditetapkan saat BLOCKED-01 terbuka.
2. Generator: **Orval** (mayor terbaru saat implementasi; dipin eksak saat dipasang). Output ke `src/lib/api/generated/`.
3. `generated/` **tidak boleh diedit manual**. CI: generate ulang lalu `git diff --exit-code`.
4. `src/lib/api/client.ts` adalah fetcher tunggal (mutator Orval): base URL relatif di browser / `LMS_API_INTERNAL_URL` di SSR (ADR-019), pemetaan error envelope, refresh.
5. Route tidak memanggil `generated/` atau `fetch` API secara langsung; selalu lewat feature API.
6. Paket **`@lms/api-client` DEFERRED** — belum ada konsumen kedua.
7. Validasi skema frontend memakai **Zod 4.x** (H-5); skema Zod dapat di-generate Orval dari OpenAPI bila sesuai. Validasi frontend **bukan** batas keamanan.

## Rationale

- Satu sumber kontrak mencegah frontend dan backend berbeda paham (ADR-016).
- Orval memenuhi syarat Bagian III §5.2 (fungsi bernama operationId, tipe bernama skema), sudah ≥ 1.0, mendukung fetcher kustom dan Zod.
- Salinan ter-pin membuat perubahan kontrak terlihat dan dapat di-review di PR frontend.

## Security considerations

- Kode generated tidak diedit, sehingga tidak ada jalur "bypass" manual ke endpoint di luar kontrak.
- Error dari backend dipetakan ke kode stabil; detail internal tidak ditampilkan (SAD §10.2).
- Validasi Zod hanya untuk UX/batas tipe; backend tetap memvalidasi (400 `VALIDATION_FAILED`).

## Dependencies

| ID | Dependensi | Memblok |
|---|---|---|
| BLOCKED-01 | `openapi.yaml` dari backend (E0-10) | Generated client, feature API |
| — | Mekanisme rilis/tag spec di backend | Pinning spec |

**Tidak** memblok bootstrap shell FE-FOUNDATION-01.

## Alternatives considered

| Alternatif | Alasan ditolak |
|---|---|
| `openapi-typescript` + `openapi-fetch` | Pemanggilan berbasis path (`client.GET('/path')`), tidak menghasilkan fungsi operationId |
| `@hey-api/openapi-ts` | Masih pre-1.0 (0.99.0); risiko breaking change |
| Paket `@lms/api-client` sekarang | Overhead publikasi tanpa konsumen kedua; dapat diadopsi kemudian |
| Tipe/endpoint ditulis manual | Melanggar TR-07 |

## Consequences

- Sampai spec tersedia, FE-FOUNDATION-01 hanya boleh menyiapkan `client.ts` generik tanpa operasi bisnis.
- Perlu proses sinkronisasi spec saat backend merilis perubahan kontrak.
- Deviasi terhadap E0-10 (`@lms/api-client`) dicatat dan perlu masuk revisi SAD.
