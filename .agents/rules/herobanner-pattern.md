---
description: Design pattern untuk penggunaan HeroBanner dan pewarnaan elemen interaktif di dalamnya (mendukung Light/Dark Mode sesuai Brand Guidelines FLIXARE).
trigger: always_on
---

# HeroBanner Design Pattern & Coloring

Berdasarkan *FLIXARE Brand Guidelines v1.0*, setiap halaman utama (seperti *dashboard*, *settings*, atau antarmuka *console*) **wajib** menggunakan komponen `HeroBanner` sebagai *header* halaman. Hal ini memastikan konsistensi *brand identity* (elemen *Progressive Path* dan tata letak yang *clean*) selalu hadir tanpa mengganggu keterbacaan atau alur fungsionalitas.

## 1. Aturan Penggunaan `HeroBanner`

Setiap kali Anda membuat atau memperbarui halaman utama (`+page.svelte` atau komponen fitur level halaman), ganti *header* manual dengan `HeroBanner`.

*   **Props Dasar**: Gunakan setidaknya `eyebrow`, `title`, dan `description`. Ambil nilainya secara dinamis dari sistem translasi (`t('...')`) atau data *backend*.
*   **Actions**: Jika *header* memiliki elemen tambahan (tombol aksi, statistik, *badge*), pindahkan elemen-elemen tersebut ke dalam *snippet* `{#snippet actions()}`.
*   **Posisi Actions**: Tambahkan atribut `actionsPlacement="end"` pada `HeroBanner` jika Anda menggunakan snippet `actions()` agar tata letaknya selaras dengan struktur aslinya (rata kanan / *end*).

## 2. Pewarnaan Elemen di Dalam HeroBanner (Light & Dark Mode)

Untuk menjaga *contrast accessibility* (sesuai standar *WCAG 2.x* pada halaman 13 *Brand Guidelines*) di atas latar belakang `HeroBanner`—baik dalam kondisi *Light Mode* maupun *Dark Mode*—**dilarang** menggunakan *utility class* warna yang bergantung pada tema global seperti `bg-lms-surface` atau `text-lms-surface`. 

Sebagai gantinya, Anda **wajib** menggunakan variasi warna statis berbasis `lms-on-hero` yang telah dirancang secara eksplisit untuk tetap cerah dan memiliki kontras optimal di atas latar belakang bernuansa gelap/biru (mengacu pada prinsip *Royal Blue* dan *Deep Neutral* di pedoman warna).

### Panduan Class Tailwind untuk Snippet `actions()`

Gunakan pola *class* berikut untuk elemen di dalam `HeroBanner`:

*   **Background Tombol/Elemen**: `bg-lms-on-hero/8` (atau variasi opasitas rendah lainnya).
*   **Border Tombol/Elemen**: `border-lms-on-hero/14` (atau variasi opasitas rendah lainnya).
*   **Teks/Ikon Utama**: `text-lms-on-hero` (warna cerah solid yang memastikan teks tetap terlihat di atas *background* biru tua/gelap).
*   **Teks Sekunder/Muted**: `text-lms-on-hero-muted`.
*   **Status Progress/Sukses**: Gunakan referensi *Growth Green* jika secara semantik diperlukan, namun pastikan kontras memadai di atas `HeroBanner`.

### Contoh Implementasi

**TIDAK BOLEH:**
```svelte
{#snippet actions()}
    <!-- DILARANG: text-lms-surface akan berubah menjadi gelap di Dark Mode, sehingga tidak terbaca -->
    <button class="bg-lms-surface/10 border-lms-surface/20 text-lms-surface flex h-10 items-center">
        Simpan
    </button>
{/snippet}
```

**WAJIB DIGUNAKAN:**
```svelte
{#snippet actions()}
    <!-- BENAR: lms-on-hero memastikan kontras yang baik di atas background HeroBanner di semua mode -->
    <button class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero flex h-10 items-center">
        Simpan
    </button>
{/snippet}
```

Pola desain ini mengamankan prinsip *Human-Centered* & *Accessibility* di *Brand Guidelines* (halaman 4 & 13) dengan menjaga setiap teks interaktif (*Actionable*) tidak manipulatif dan tetap mudah dipindai (halaman 19) terlepas dari tema *browser* yang digunakan pengguna.
