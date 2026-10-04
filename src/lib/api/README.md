# `src/lib/api`

Infrastruktur API (ADR-021).

- `generated/` — client hasil Orval dari OpenAPI. **Belum ada**: kontrak OpenAPI belum tersedia (BLOCKED-01). Jangan dibuat manual.
- `client.ts` — fetcher tunggal (base URL same-origin `/api/v1` di browser, URL internal di SSR, error envelope, refresh). Dibuat bersama generated client.

Browser selalu memanggil `/api/v1/...` di host yang sedang dibuka (ADR-019).
