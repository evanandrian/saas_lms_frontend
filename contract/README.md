# `contract/` — salinan ter-pin kontrak OpenAPI (ADR-021)

| Atribut | Nilai |
|---|---|
| Sumber | `saas_lms_backend/api/openapi.yaml` |
| Versi asal | backend `486f451` + perubahan Menu & navigasi + Master data 11 master + Master Paket (belum di-commit saat disalin, 5 Okt 2026) — **perbarui ke tag/commit backend setelah backend di-commit** |
| Generator | Orval `8.39.0` (dipin eksak) → `src/lib/api/generated/lms.ts` |

Alur: salin ulang `openapi.yaml` dari backend → `pnpm api:generate` → review diff. CI: `pnpm api:check` gagal bila hasil generate berbeda dari repo. `src/lib/api/generated/` tidak boleh diedit manual.
