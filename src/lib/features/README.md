# `src/lib/features`

Satu folder per modul, mencerminkan modul backend: `<modul>/<modul>.api.ts`, `.schema.ts`, `.types.ts`, `.store.svelte.ts`, `components/`.

Fitur bisnis dibuat pada fase fitur masing-masing, di atas kontrak OpenAPI (`contract/openapi.yaml`).

- `navigation/` — Menu & navigasi: feature API server-only (`navigation.api.ts`), model/validasi UX (`navigation.model.ts`), state editor (`navigation-editor.svelte.ts`), susunan bawaan cadangan (`navigation.defaults.ts`, cermin `defaults.go` backend). Gunakan kosakata baku (`assessment`, bukan `exam`).
- `master-data/` — Master data platform/general: feature API server-only (`master-data.api.ts`), definisi master, validasi UX, dan CSV (`master-data.model.ts`).
