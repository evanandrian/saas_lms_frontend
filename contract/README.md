# `contract/` — salinan ter-pin kontrak OpenAPI (ADR-021)

| Atribut | Nilai |
|---|---|
| Sumber | `saas_lms_backend/api/openapi.yaml` |
| Versi asal | backend `feat/school-admin-phase2` (`d28c30e`; Admin Sekolah Fase 2: mapel, TP update, asesmen reason/decimal_places/aggregation, ekskul jadwal + anggota; disalin 16 Okt 2026). Riwayat: sebelumnya `383a5c0` (Fase 1), `7eca90d` (PR #10) |
| Generator | Orval `8.39.0` (dipin eksak) → `src/lib/api/generated/lms.ts` |

Alur: salin ulang `openapi.yaml` dari backend → `pnpm api:generate` → review diff. CI: `pnpm api:check` gagal bila hasil generate berbeda dari repo. `src/lib/api/generated/` tidak boleh diedit manual.
