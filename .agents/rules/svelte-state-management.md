---
description: Pedoman arsitektur dan state management menggunakan Svelte 5 Runes untuk memisahkan UI dan Logika Bisnis.
trigger: always_on
---

# Svelte 5 State Management & Architecture

FLIXARE Frontend dibangun menggunakan **Svelte 5**. Dilarang keras menggunakan reaktivitas gaya Svelte 4 (seperti `export let`, `$:`, atau penulisan store tradisional `writable`).

## 1. Penggunaan Runes Dasar
- Gunakan `$state()` untuk deklarasi variabel reaktif.
- Gunakan `$derived()` untuk komputasi turunan.
- Gunakan `$effect()` untuk efek samping (side effects), namun minimalkan penggunaannya (jangan jadikan `$effect` sebagai tempat mutasi state).
- Gunakan `$props()` untuk deklarasi properti komponen dengan `interface`.

```svelte
<!-- CONTOH BENAR -->
<script lang="ts">
    interface Props { title: string; count?: number; }
    let { title, count = 0 }: Props = $props();

    let internalCount = $state(count);
    let double = $derived(internalCount * 2);
</script>
```

## 2. Segregasi Logika Bisnis (State Classes)
Jangan menjejalkan fungsi validasi rumit, manipulasi form yang panjang, atau state mesin (*state machine*) kompleks di dalam file `.svelte`.
Pindahkan logika tersebut ke file bereksistensi `.svelte.ts` menggunakan kelas TypeScript.

**Kapan menggunakan eksternal state class:**
- Formulir multi-langkah (seperti `RegistrationWizard`).
- Halaman dashboard kompleks dengan banyak filter/data.
- Operasi tabel dan filter yang di-*reuse*.

**Contoh: `feature.state.svelte.ts`**
```ts
export class FeatureState {
    value = $state('');
    busy = $state(false);

    get isValid() { return this.value.length > 3; }

    async submit() { ... }
}
```
**Di komponen `.svelte`:**
```svelte
<script lang="ts">
    import { FeatureState } from './feature.state.svelte';
    const uiState = new FeatureState();
</script>
```

## 3. Snippets untuk Reusability UI
Untuk UI berulang di dalam satu file komponen yang sama, gunakan `{#snippet name()}` daripada memisahkan komponen mikro atau duplikasi kode.
