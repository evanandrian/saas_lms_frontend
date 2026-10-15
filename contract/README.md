# `contract/` — salinan ter-pin kontrak OpenAPI (ADR-021)

| Atribut | Nilai |
|---|---|
| Sumber | `saas_lms_backend/api/openapi.yaml` |
| Versi asal | backend `feat/school-admin-nav-phase1` (`383a5c0`; area navigasi `principal`/`homeroom`, badge `approvals`, ekstensi dashboard/remind/audit/approvals Fase 1 Admin Sekolah; disalin 15 Okt 2026). Riwayat: sebelumnya `7eca90d` (PR #10) |
| Generator | Orval `8.39.0` (dipin eksak) → `src/lib/api/generated/lms.ts` |

Alur: salin ulang `openapi.yaml` dari backend → `pnpm api:generate` → review diff. CI: `pnpm api:check` gagal bila hasil generate berbeda dari repo. `src/lib/api/generated/` tidak boleh diedit manual.
