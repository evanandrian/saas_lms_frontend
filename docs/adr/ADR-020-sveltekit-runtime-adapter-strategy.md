# ADR-020 — SvelteKit Runtime & Adapter Strategy

| Atribut | Nilai |
|---|---|
| Status | **Accepted** |
| Date | 2 Oktober 2026 (diusulkan FE-FOUNDATION-DECISION-01; diterima FE-FOUNDATION-DECISION-01-FINALIZATION, keputusan manusia H-2, H-10) |
| Menyelesaikan | DECISION-003 (adapter) |
| Terkait | C-01, ADR-002, ADR-003, ADR-015, SAD §7.2–7.3, Bagian III §5.1, §6.3, Lampiran §6; ADR-019 |

## Context

- Bagian III §5.1: `hooks.server.ts` — "resolve tenant dari host, sesi, CSP".
- Bagian III §6.3: layanan container `lms-<env>-web`; SAD §7.3: deploy web canary.
- Lampiran §6 menyebut `adapter-static` untuk mobile; Lampiran kalah dari Bagian I bila berbeda.
- ADR-003: mobile via PWA, lalu Capacitor (Fase 3).
- `adapter-static` tidak menjalankan `hooks.server.ts`, server `load`, maupun form action.
- Fakta registry npm (2 Okt 2026): `@sveltejs/kit` latest `3.0.0`, lini 2 terbaru `2.70.3`. `@sveltejs/adapter-node@6` membutuhkan Kit `^3`; `@sveltejs/adapter-node@5.5.7` membutuhkan Kit `^2.4.0`.

## Decision

```
SvelteKit 2.70.3 → @sveltejs/adapter-node 5.x → Node.js 24 LTS → server deployment (container lms-<env>-web)
```

1. Web memakai **`@sveltejs/adapter-node` mayor 5**. `adapter-static` **bukan** model deployment web kanonik.
2. **SvelteKit dikunci di 2.70.3** (mayor 2, C-01). Upgrade ke SvelteKit 3 membutuhkan ADR baru.
3. Konfigurasi runtime dibaca saat start (`$env/dynamic/*`), satu image untuk semua environment (SAD §10.3).
4. Aplikasi multi-host di belakang proxy: `ORIGIN` tunggal tidak dapat dipakai. Deployment wajib mengatur `PROTOCOL_HEADER` dan `HOST_HEADER` adapter-node (mis. `x-forwarded-proto`, `x-forwarded-host`) yang hanya diisi oleh ingress tepercaya.
5. PWA (Fase 2) memakai service worker SvelteKit di runtime yang sama.
6. Capacitor (Fase 3) memakai target build SPA terpisah, diatur ADR tersendiri.
7. Baseline UI di atas runtime ini: Svelte 5.57.1, Tailwind CSS 4.3.3, Skeleton 5.0.1 (H-10). Kompatibilitas diverifikasi saat FE-FOUNDATION-01.

## Rationale

`hooks.server.ts`, SSR, resolusi tenant, cookie HttpOnly, penanganan sesi, dan pemrosesan request di server (ADR-019) hanya mungkin dengan runtime server. adapter-node bersifat provider-agnostik (ADR-015) dan cocok untuk container.

## Security considerations

- `HOST_HEADER`/`PROTOCOL_HEADER` hanya boleh dipercaya bila ingress menimpa header tersebut. Bila klien dapat menyuntikkannya, resolusi tenant dan `csrf.checkOrigin` dapat dikelabui.
- Variabel server-only (`LMS_API_INTERNAL_URL`, dsb.) tidak boleh berawalan `PUBLIC_`.
- Secret tidak di-bake ke image; dibaca saat start.

## Dependencies

| Dependensi | Pemilik |
|---|---|
| Ingress meneruskan `x-forwarded-host`/`x-forwarded-proto` tepercaya dan merutekan `/api/*` | DevOps (E0-13) |
| Verifikasi kompatibilitas Kit 2.70.3 + Svelte 5.57.1 + Tailwind 4.3.3 + Skeleton 5.0.1 | FE-FOUNDATION-01 |

## Alternatives considered

| Alternatif | Alasan ditolak |
|---|---|
| `adapter-static` untuk web | Menghilangkan `hooks.server.ts`, SSR terautentikasi, form action, CSRF origin check |
| Adapter vendor cloud | Bertentangan dengan ADR-015 |
| SvelteKit 3 + adapter-node 6 | Bertentangan dengan C-01 tanpa ADR; dampak ekosistem belum dievaluasi |

## Consequences

- Output build adalah server Node.js (default `build/`), dijalankan `node build`; diverifikasi di FE-FOUNDATION-01.
- `vite preview` dapat dipakai untuk uji lokal build produksi.
- Web membutuhkan container dan health check.
