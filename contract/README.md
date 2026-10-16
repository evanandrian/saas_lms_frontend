# `contract/` — salinan ter-pin kontrak OpenAPI (ADR-021)

| Atribut | Nilai |
|---|---|
| Sumber | `saas_lms_backend/api/openapi.yaml` |
| Versi asal | backend `feat/school-admin-phase3` (`ae32bd6`; Admin Sekolah Fase 3: pengumuman — CRUD admin, persetujuan kepala sekolah, feed penerima, widget kepsek, kategori audit `announcement`; disalin 16 Okt 2026). Riwayat: sebelumnya `d28c30e` (Fase 2), `383a5c0` (Fase 1), `7eca90d` (PR #10) |
| Generator | Orval `8.39.0` (dipin eksak) → `src/lib/api/generated/lms.ts` |

Alur: salin ulang `openapi.yaml` dari backend → `pnpm api:generate` → review diff. CI: `pnpm api:check` gagal bila hasil generate berbeda dari repo. `src/lib/api/generated/` tidak boleh diedit manual.
