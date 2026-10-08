---
description: Design pattern untuk pembuatan halaman Form baru di FLIXARE agar selaras dengan prototype v3 & v4 serta menggunakan HeroBanner.
trigger: always_on
---

# Form Page Design Pattern (FLIXARE)

Berdasarkan referensi *FLIXARE App v3* dan *FLIXARE App v4* serta pedoman *Brand Guidelines*, pembuatan halaman baru yang memuat formulir atau *console* pengaturan harus mengikuti hierarki struktural dan estetika spesifik berikut.

## 1. Hierarki Halaman

Setiap halaman formulir harus dibungkus dengan *container* yang memberikan ruang yang cukup dan *padding* di bagian bawah (biasanya `pb-24` atau `pb-28`) untuk memastikan elemen tidak tertutup oleh tombol *sticky* atau *browser chrome*.

```svelte
<div class="text-lms-foreground flex flex-col gap-4 pb-24" data-screen-label="Nama Halaman">
    <!-- 1. Header (HeroBanner) -->
    <HeroBanner
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('desc')}
        actionsPlacement="end"
    >
        {#snippet actions()}
            <!-- Tombol aksi spesifik hero (opsional), patuhi aturan herobanner-pattern.md -->
        {/snippet}
    </HeroBanner>

    <!-- 2. Tata Letak (Layout) Formulir -->
    <!-- Gunakan grid atau flexbox untuk tata letak kolom -->
    <div class="flex flex-col gap-4 min-[1000px]:flex-row">
        <!-- Sidebar opsional -->
        
        <!-- Main Form Area -->
        <main class="flex min-w-0 flex-[1_1_auto] flex-col gap-4">
            <!-- Sections (Cards) -->
        </main>
    </div>
</div>
```

## 2. Bagian Formulir (Sections/Cards)

Setiap kelompok logis pada formulir harus dibungkus dalam *card*. Jangan meletakkan *input* secara telanjang di latar belakang aplikasi.

*   **Bungkus Section (Card)**: Gunakan `bg-lms-surface border-lms-border flex flex-col gap-[18px] rounded-xl border p-5`. Alternatifnya, Anda dapat menggunakan *utility* `lms-card` jika struktur *padding* disesuaikan dengan komponen lain.
*   **Header Section**: Gunakan judul dengan `text-lg font-bold` (atau `text-[0.9375rem] font-bold` untuk sub-section) beserta deskripsi `text-lms-muted text-xs`.
*   **Grid Input**: Jika terdapat beberapa *input* sejajar, susun dalam `grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] items-start gap-x-4 gap-y-3.5`.

## 3. Komponen Form (Input & Label)

Gunakan struktur `<label>` yang merangkul keterangan *field* dan `input` secara inklusif.

```svelte
<label class="flex flex-col gap-1.5">
    <!-- Label -->
    <span class="text-[13px] font-semibold">{t('field_label')}</span>
    
    <!-- Input Field -->
    <input
        type="text"
        placeholder={t('field_placeholder')}
        class="bg-lms-surface lms-focus-ring h-[42px] w-full rounded-[10px] border-[1.5px] border-lms-input-border px-3 text-sm transition-colors"
        aria-invalid={!!error}
    />
    
    <!-- Helper Text / Error Message -->
    <span class="text-xs text-lms-muted">
        {t('field_helper')}
    </span>
</label>
```

**Aturan Input Khusus:**
*   Untuk indikator *error*, ubah warna border *input* menjadi `border-lms-danger-text` dan warna *helper text* menjadi `text-lms-danger-text`.
*   Gunakan `lms-focus-ring` pada semua *input*, *select*, *textarea*, dan *button* agar mendapatkan *focus state* yang seragam (aksesibilitas).
*   Gunakan `font-mono text-sm` untuk *input* berupa kode unik, angka rekening, NIP, dsb.

## 4. Sticky Action Bar (Menyimpan / Lanjut)

Untuk halaman registrasi berjenjang (*wizard*) atau form yang panjang, elemen *Submit/Next* diletakkan di *sticky bar* pada bagian bawah layar.

```svelte
<!-- Letakkan baris ini sebagai anak terakhir dalam <main> atau area form panjang -->
<div class="lms-card sticky bottom-19 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[14px]! py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_rgba(15,24,56,0.4)]!">
    <!-- Feedback atau status (opsional) -->
    <span class="text-lms-muted text-[0.8125rem]" aria-live="polite">
        Semua perubahan telah disimpan otomatis.
    </span>

    <!-- Tombol Submit -->
    <button
        type="button"
        class="btn lms-action-primary lms-focus-ring h-11 gap-2 rounded-[10px] px-5 text-sm font-bold transition-colors"
        disabled={isBusy}
    >
        {t('save')}
    </button>
</div>
```

## 5. Pesan Kosong / Error Data (State Panel)

Jika data tidak ditemukan, gunakan `<StatePanel>` alih-alih me-render form kosong atau halaman putih.

```svelte
{#if !data}
    <div class="flex flex-col gap-4 pb-24">
        <StatePanel
            headingLevel={1}
            title={t('unavailable_title')}
            description={t('unavailable_description')}
            tone="error"
        />
    </div>
{:else}
    <!-- render form page -->
{/if}
```

Ikuti seluruh petunjuk struktur ini setiap Anda membuat halaman antarmuka baru untuk mempertahankan konsistensi visual 100% dengan FLIXARE App v3 & v4, di semua tingkatan level (Platform, Sekolah, Guru, Murid).
