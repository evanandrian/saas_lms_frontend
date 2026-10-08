# Keterbatasan Grafik Pengetahuan (Graphify) untuk Repositori Ini

Dokumen ini mencatat keterbatasan tooling knowledge-graph (Graphify) yang teramati saat
audit keamanan/sesi Februari 2026. Output penuh grafik tersimpan di `graphify-out/`
(`graph.json`, `GRAPH_REPORT.md`, `graph.html`) dan **tidak dilacak git** (`.gitignore`).

## Ringkasan Grafik (snapshot `graphify-out`)

| Metrik | Nilai | Sumber |
| --- | --- | --- |
| File dianalisis | 263 · ±214.674 kata | `GRAPH_REPORT.md` |
| Node | 2.761 | `graph.json` |
| Edge (link) | 4.959 | `graph.json` |
| Komunitas | 152 (52 tipis < 3 node di-omit) | `GRAPH_REPORT.md` |
| Node terisolasi/lemah terhubung | 1.294 | `GRAPH_REPORT.md` |
| Edge diinferensi | 140 (confidence rata-rata 0,85) | `GRAPH_REPORT.md` |
| Hyperedge | 0 | `graph.json` |

## Keterbatasan yang Teramati

### 1. Tetangga yang disebut ≠ pemanggil nyata
Grafik dibangun dari **kata/istilah yang disebut**, bukan alur data/kontrol lengkap.
Pola SvelteKit berikut tidak membentuk edge pemanggilan eksplisit:

- konvensi loader konvensional (`+layout.server.ts`, `+page.server.ts`) yang dipanggil
  runtime oleh lokasi file-nya;
- `import()` dinamis, mis. `await import('$lib/auth/dev-session.fixture')`
  di `src/hooks.server.ts:71`.
- kontrak `$env/dynamic/*` dan `$app/*` yang disuntikkan build.

**Dampak nyata:** saat menelusuri `assertHostKind()`, Graphify menampilkannya sebagai
jembatan 7 komunitas — sementara `grep` menunjukkan ≥ 26 titik panggil nyata di
`src/routes/**`. Untuk menemukan **pemanggil yang pasti**, `glob`/`grep` lebih andal
daripada path grafik.

### 2. Isolasi besar = sebagian artefak komunitas
1.294 node "terisolasi" (≤ 1 relasi) berasal dari dua sebab yang berbeda:

- node **jelas kehilangan edge**: konstanta cookie (`lms_token`, dst), fixture besar
  (`sessions.fixture.ts`), dan `STORAGE_GLOBALS`/`DOCUMENT_COOKIE_PROPERTY`
  (indikator AST belum menyatukan referensi lintas berkas).
- node **dalam komunitas tipis** yang di-omit dari laporan (52 komunitas < 3 node),
  bukan simbol yatim yang benar-benar tak terpakai.

Kesimpulan: jangan perlakukan semua node terisolasi sebagai dead code sebelum
divalidasi `grep`.

### 3. Serapan skala besar ("elephant files")
`src/lib/api/generated/lms.ts` (±15 ribu baris) dan berkas fixture besar menarik banyak
edge sekaligus, membentuk komunitas besar yang **menelan detail keputusan lokal**.
Hub "UI Icons …", "Generated API Models" memperlihatkan posisi terpusatnya — bagus
untuk peta umum, tapi buruk untuk menemukan keputusan kecil seperti batas cookie.

### 4. Edge belum diarahkan dengan penuh makna
`dirGraphedge`: `directed: true` dengan hyperedge 0. Relasi simetris (dua modul saling
referensi) hanya muncul satu arah di antaranya; analisis perlu menormalisasi dua sisi.

## Praktik yang Mengurangi Dampaknya

1. **Pemanggil nyata** → `Grep`/`Glob`; **peta umum & hub** → Graphify.
2. Validasi isolasi sebelum menghapus apa pun: cek silang `Grep` untuk pemakai simbol.
3. Snapshot hanya mencerminkan kondisi saat build; `graphify rebuild` setelah perubahan
   besar (mis. penambahan fitur) agar komunitas tidak kadaluwarsa.
4. Judul umum per node (mis. `RAW_FETCH_GLOBAL`) perlu ditinjau oleh pengembang yang
   mengenal domain sebelum dijadikan dasar keputusan.

## Catatan bagi Perawatan Grafik Berikutnya

- Angka pada tabel dapat direproduksi: `python3 -c` membaca `graph.json` keys
  `nodes` / `links` / `hyperedges`; laporan health di `GRAPH_REPORT.md`.
- Kandidat perbaikan installs: resolusi simbol AST untuk impor dinamis dan konvensi
  SvelteKit, plus pemanfaatan hyperedge untuk edge konseptual (mis. "dibaca oleh hooks").