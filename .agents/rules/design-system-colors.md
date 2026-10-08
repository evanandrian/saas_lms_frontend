---
description: Pedoman penggunaan token warna Design System FLIXARE untuk mendukung aksesibilitas dan Dark Mode.
trigger: always_on
---

# Design System & Token Warna

FLIXARE sepenuhnya mendukung **Light Mode** dan **Dark Mode** secara otomatis dengan mengandalkan CSS Variables yang telah diracik khusus pada sistem Tailwind aplikasi.

## 1. Larangan Penggunaan Warna Utility Standar
Dilarang keras mendefinisikan warna UI secara absolut menggunakan palet warna standar Tailwind (contoh: `text-gray-500`, `bg-blue-600`, `border-slate-200`, `bg-white`, `text-black`).
Palet tersebut dapat merusak kontras pada saat tema sistem pengguna berpindah.

## 2. Token Warna Wajib
Gunakan hanya *semantic variables* dengan awalan `lms-` berikut (sesuaikan opasitas dengan `/10`, `/50`, dsb jika butuh variasi):

**Latar Belakang (Background):**
- `bg-lms-background`: Latar layar aplikasi (app shell level).
- `bg-lms-surface`: Latar area *content*, *card*, *modal*, atau panel menu.
- `bg-lms-surface-muted`: Area di dalam card yang membutuhkan perbedaan latar tipis.
- `bg-lms-interactive`: Latar untuk tombol utama atau CTA (Call To Action).

**Teks (Foreground):**
- `text-lms-foreground`: Teks paragraf, judul utama.
- `text-lms-muted`: Teks pembantu, *hint*, keterangan tambahan.
- `text-lms-on-interactive`: Teks yang posisinya di atas `bg-lms-interactive` (selalu punya kontras tinggi).

**Border (Garis Tepi):**
- `border-lms-border`: Pemisah standar antar baris, struktur grid, atau tepian *card*.
- `border-lms-input-border`: Batas garis untuk input form.

**Warna Semantik Status:**
- `text-lms-danger-text` / `bg-lms-danger-text`: Peringatan, penghapusan, error.
- `text-lms-warning-text` / `bg-lms-warning-text`: Perhatian, aksi menengah, status tertunda.
- `text-lms-progress-text` / `bg-lms-progress`: Pertumbuhan (Growth Green), konfirmasi sukses.

**HeroBanner Spesifik:**
Komponen yang berada langsung menempel di dalam HeroBanner harus mematuhi aturan warna `lms-on-hero` (lihat `herobanner-pattern.md`).
