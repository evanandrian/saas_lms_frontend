## Tujuan

<!-- Apa yang diselesaikan PR ini. Sebutkan ID pekerjaan/alur: E.., F.., LMS-<n> -->

## Aturan yang disentuh (TR-10)

<!-- Daftar ID dari SAD: BR-.., TR-.., NFR-.., ADR-.. — dan test yang mencakupnya -->

- (isi)

## Perubahan

- (isi)

## Cara uji

<!-- Perintah yang dijalankan dan hasilnya. Jangan menulis "lolos" tanpa menjalankan. -->

- [ ] `pnpm check`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:e2e` (bila relevan)

## Checklist arsitektur

- [ ] Mengikuti README §11 (Frontend Foundation Baseline) dan AI-CONTEXT.md
- [ ] Tidak mengedit `src/lib/api/generated/`
- [ ] Tidak mengarang endpoint, OpenAPI, atau permission
- [ ] Tidak ada token/secret di storage browser, kode, atau log
- [ ] Tidak ada tenant/domain yang di-hardcode
- [ ] Semua teks UI lewat i18n (TR-09); kosakata domain baku
- [ ] Dependency baru (bila ada) disertai alasan

## Dampak

<!-- Kontrak API, migrasi, konfigurasi/env, risiko, rollback -->
