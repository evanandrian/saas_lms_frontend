# `contract/` — salinan ter-pin kontrak OpenAPI (ADR-021)

| Atribut | Nilai |
|---|---|
| Sumber | `saas_lms_backend/api/openapi.yaml` |
| Versi asal | backend `main` `7eca90d` (merge PR #10, `dfa368c`; flag opsional `phone_unavailable`/`codes_unavailable`, BV03-F1; disalin 14 Okt 2026). Riwayat: sebelumnya `486f451` + Menu & navigasi + Master data 11 master + Master Paket (5 Okt 2026) |
| Generator | Orval `8.39.0` (dipin eksak) → `src/lib/api/generated/lms.ts` |

Alur: salin ulang `openapi.yaml` dari backend → `pnpm api:generate` → review diff. CI: `pnpm api:check` gagal bila hasil generate berbeda dari repo. `src/lib/api/generated/` tidak boleh diedit manual.
