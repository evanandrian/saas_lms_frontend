# `src/lib/api`

Infrastruktur API (ADR-021).

- `generated/` — client hasil Orval dari `contract/openapi.yaml` (`pnpm api:generate`). **Jangan diedit manual**; `pnpm api:check` memastikan sinkron.
- `client.ts` — fetcher tunggal (mutator Orval): base URL kosong (same-origin `/api/v1`) di browser, `LMS_API_INTERNAL_URL` + token dari cookie HttpOnly di SSR (diisi feature API server-only). Respons non-2xx dikembalikan sebagai union bertipe `{ data, status, headers }`, bukan dilempar.

Browser selalu memanggil `/api/v1/...` di host yang sedang dibuka (ADR-019). Saat ini backend hanya menerima `Authorization: Bearer`, jadi pemanggilan dilakukan dari `load`/form action (SSR).

Konsumen pertama: `src/lib/features/navigation/navigation.api.ts` (Menu & navigasi).
