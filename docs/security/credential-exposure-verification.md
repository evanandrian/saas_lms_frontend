# Credential Exposure Verification

| Atribut | Nilai |
|---|---|
| Fase | FE-FOUNDATION-SECURITY-GATE-01 |
| Tanggal | 2 Oktober 2026 |
| Insiden | SEC-01 — GitHub Personal Access Token (classic) di URL remote Git |
| Repository | `saas_lms_frontend` (utama), `saas_lms_backend` (terkait) |
| Mode | Read-only, non-destruktif. Tidak ada artifact yang diubah atau dihapus |
| Keputusan gate | **SECURITY_GATE_PASS_WITH_RESIDUAL_RISK** |

**Metode redaksi.** Seluruh pemeriksaan hanya mengeluarkan lokasi, jumlah kemunculan, dan 12 karakter pertama SHA-256 dari token yang cocok. Nilai token tidak pernah dicetak, disimpan, atau ditulis di dokumen ini. Token SEC-01 diidentifikasi dengan prefix hash `976df032e73a`.

---

## 1. Incident Context

- **FE-FOUNDATION-00 (2 Okt 2026):** PAT ditemukan plaintext di `remote.origin.url` pada `.git/config` repository frontend dan backend. Saat pemeriksaan, nilai token ikut tampil di output tool sesi Claude Code.
- **FE-FOUNDATION-DECISION-01:** remote kedua repository dibersihkan menjadi URL tanpa kredensial. Ditemukan salinan token di transcript Claude Code, database claude-mem, dan `~/.zsh_history`.
- **FE-FOUNDATION-DECISION-01-FINALIZATION:** pemilik menyatakan PAT sudah di-revoke. Upaya redaksi log ditolak oleh permission classifier Claude Code, sehingga salinan lokal tetap ada.

## 2. Credential Type

| Atribut | Nilai |
|---|---|
| Jenis | GitHub Personal Access Token (classic) |
| Lokasi awal | `.git/config` → `remote.origin.url` (username dan token disisipkan di URL HTTPS sebelum host `github.com`) |
| Cakupan (scope) token | **Tidak diketahui.** Tidak diperiksa karena pemeriksaan membutuhkan pemakaian token |

## 3. Revocation Status

| Bukti | Status |
|---|---|
| Konfirmasi pemilik repository | **REVOKED** — dinyatakan pemilik pada fase finalisasi (2 Okt 2026) |
| Verifikasi teknis | **Tidak dilakukan, dan sengaja.** Aturan fase melarang memakai token lama untuk login atau request API |
| Bukti yang menunjukkan token masih aktif | Tidak ditemukan |

Status kredensial: **REVOKED HISTORICAL COPY** (berdasarkan atestasi pemilik), bukan ACTIVE CREDENTIAL.

## 4. Repository Verification

| Repository | Ref | Objek | Unreachable | Tag | Stash | Catatan |
|---|---|---|---|---|---|---|
| `saas_lms_frontend` | 3 | 3 | 0 | 0 | 0 | Commit tunggal `bb24578`; perubahan dokumentasi belum di-commit |
| `saas_lms_backend` | 3 | 3 | 0 | 0 | 0 | Commit tunggal `95757d9`; ada pekerjaan backend yang belum di-commit (`README.md` termodifikasi; `.env.example`, `AI-CONTEXT.md`, `Makefile`, `deploy/`, `go.mod`, `go.sum` untracked) |

## 5. Remote Verification

| Repository | `origin` (fetch/push) | Kredensial di URL | Status |
|---|---|---|---|
| `saas_lms_frontend` | `https://github.com/evanandrian/saas_lms_frontend.git` | Tidak ada | **PASS** |
| `saas_lms_backend` | `https://github.com/evanandrian/saas_lms_backend.git` | Tidak ada | **PASS** |

Pemeriksaan `git config --list --show-origin` (system, global, local) untuk pola token, URL berkredensial, `http.extraheader`, dan `Authorization` menghasilkan **0** kecocokan di kedua repository. Satu-satunya pengaturan credential adalah `credential.helper=osxkeychain` dari system config Apple Command Line Tools. Isi Keychain tidak diperiksa.

## 6. Working Tree Verification

Pola yang dipindai: token GitHub (prefix classic, fine-grained, OAuth, user, server, refresh), URL berkredensial (skema apa pun), header `Authorization`, token `Bearer`, private key PEM, AWS access key, Google API key, token Slack, JWT, dan assignment `*SECRET*/*PASSWORD*/*API_KEY*/*TOKEN*`.

| Repository | File dipindai | Hasil |
|---|---|---|
| `saas_lms_frontend` | 11 | **NOT_FOUND** untuk semua pola |
| `saas_lms_backend` | 7 | Token GitHub: **NOT_FOUND**. Tiga kecocokan pola generik, semuanya nilai default lokal yang publik (lihat F-11) |

## 7. Git History Verification

| Repository | `git log --all --reflog -p` | `cat-file --batch-all-objects` | Klasifikasi |
|---|---|---|---|
| `saas_lms_frontend` | 0 | 0 | **LOCAL_CONFIGURATION_EXPOSURE** — token hanya ada di `.git/config` lokal, tidak pernah masuk history |
| `saas_lms_backend` | 0 | 0 | **LOCAL_CONFIGURATION_EXPOSURE** |

Tidak ada repository history exposure. Tidak perlu rewrite history.

## 8. Local Artifact Verification

Semua artifact **dapat dibaca** dengan izin normal pengguna (tanpa `sudo`, tanpa perubahan permission) dan dibuka read-only.

| Artifact | Dapat dibaca | Kemunculan SEC-01 | Status |
|---|---|---|---|
| `~/.claude/projects/-Users-vandrian-vandrian-ea-sc-lms-saas-lms-frontend/551656f9-8a41-4b97-9b1b-06cca61aed15.jsonl` | Ya | 4 | A + D — berisi token historis yang sudah di-revoke |
| `~/.claude/projects/-Users-vandrian-vandrian-ea-sc-lms-saas-lms-frontend/df215931-0530-4c57-b2e0-ef51716f9475.jsonl` | Ya | 4 | A + D |
| `~/.claude-mem/claude-mem.db` | Ya | 7 | A + D |
| `~/.claude-mem/claude-mem.db-wal` | Ya | 0 | Bersih |
| `~/.claude-mem/chroma/chroma.sqlite3` | Ya | **29** (fase lalu 26) | A + D — **jumlahnya bertambah** |
| `~/.zsh_history` | Ya | 6 | A + D |

**Sweep tambahan:** 4.902 file di `~/.claude`, `~/.claude-mem` (termasuk `backups/`), `~/.config`, serta `~/.bash_history`, `~/.git-credentials`, `~/.gitconfig`, `~/.netrc`, `~/.npmrc`. Tidak ada lokasi baru selain lima artifact di atas. Satu entri tidak terbaca, yaitu `~/.config/iterm2/sockets/secrets`, sebuah Unix socket (bukan file data) — tidak relevan.

**Cloud sync claude-mem:** kunci `CLAUDE_MEM_CLOUD_SYNC_TOKEN`, `_USER_ID`, dan `_HUB_URL` kosong di `~/.claude-mem/settings.json`. **Inferensi:** sinkronisasi cloud tidak dikonfigurasi, sehingga salinan di DB claude-mem tidak keluar dari mesin lewat jalur itu.

## 9. Findings

| ID | Location | Finding | Credential State | Classification | Severity | Action |
|---|---|---|---|---|---|---|
| F-01 | `saas_lms_frontend/.git/config` | Token pernah ada di remote URL; sekarang tidak ada | Revoked; tidak ada lagi | RESOLVED (LOCAL_CONFIGURATION_EXPOSURE) | P4 | Tidak ada |
| F-02 | `saas_lms_backend/.git/config` | Sama dengan F-01 | Revoked; tidak ada lagi | RESOLVED (LOCAL_CONFIGURATION_EXPOSURE) | P4 | Tidak ada |
| F-03 | Git history kedua repository | Tidak ditemukan | — | RESOLVED (tidak pernah ter-commit) | P4 | Tidak ada |
| F-04 | Working tree kedua repository | Tidak ada token GitHub | — | RESOLVED | P4 | Tidak ada |
| F-05 | Transcript `551656f9…jsonl` | 4 salinan token | Revoked historical copy | RESIDUAL_REVOKED_COPY | P3 | Deferred cleanup |
| F-06 | Transcript `df215931…jsonl` (sesi aktif) | 4 salinan token | Revoked historical copy | RESIDUAL_REVOKED_COPY | P3 | Deferred cleanup |
| F-07 | `~/.claude-mem/claude-mem.db` | 7 salinan | Revoked historical copy | RESIDUAL_REVOKED_COPY | P3 | Deferred cleanup |
| F-08 | `~/.claude-mem/chroma/chroma.sqlite3` | 29 salinan; bertambah dari 26 → claude-mem masih menyalin ulang dari sumber lokal | Revoked historical copy | RESIDUAL_REVOKED_COPY | P3 | Deferred cleanup; bersihkan sumbernya (F-05..F-07) bersamaan |
| F-09 | `~/.zsh_history` | 6 baris berisi token; token pernah diketik di shell (Inferensi: kemungkinan asal token masuk ke remote URL) | Revoked historical copy | RESIDUAL_REVOKED_COPY | P3 | Deferred cleanup |
| F-10 | `~/.claude/plugins/marketplaces/thedotmack/tests/utils/redaction.test.ts` | Pola token dengan hash berbeda (`9d6060e21ef8`) — fixture test plugin | Bukan token SEC-01 | False positive | P4 | Tidak ada |
| F-11 | `saas_lms_backend/.env.example:6,11,17`; `saas_lms_backend/README.md:136` | Password/secret key yang cocok persis dengan default lokal publik (PostgreSQL, MinIO) | Bukan kredensial rahasia | INFORMATIONAL — di luar insiden SEC-01, pekerjaan backend yang belum di-commit | P4 | Opsional (tim backend): ganti dengan placeholder agar tidak terdeteksi scanner |
| F-12 | Penyedia model (output tool sesi FE-00) | Nilai token ikut terkirim sebagai output tool ke model selama sesi FE-00 | Revoked historical copy | RESIDUAL_REVOKED_COPY (di luar kendali lokal) | P4 | Revoke sudah menetralkan |

## 10. Risk Classification

**RESIDUAL_REVOKED_COPY**

| Kriteria | Terpenuhi | Bukti |
|---|---|---|
| PAT sudah di-revoke | Ya (atestasi pemilik) | §3 |
| Salinan historis masih ada di artifact lokal | Ya | F-05..F-09 |
| Artifact tidak termasuk distribusi repository | Ya | §4, §6, §7 |
| Tidak ada bukti token masih aktif | Ya | §3 |
| Salinan belum dihapus karena cleanup belum diotorisasi | Ya | Classifier menolak redaksi; prompt ini melarang cleanup |

Bukan BLOCKED: tidak ada kredensial aktif, tidak ada kredensial di remote, file tracked, CI, atau history.

### Security Matrix

| Control | Status | Evidence |
|---|---|---|
| PAT revoked | **PASS** | Atestasi pemilik; tidak diverifikasi teknis (dilarang aturan) |
| Remote credential-free | **PASS** | `git remote -v` kedua repo; `git config` 0 kecocokan |
| Working tree clean | **PASS** | §6 — token GitHub NOT_FOUND; F-11 bukan rahasia |
| Git history clean | **PASS** | §7 — 0 kecocokan di semua objek, reflog, dan unreachable |
| Local artifacts verified | **PASS** (terverifikasi, berisi salinan yang sudah di-revoke) | §8 — semua artifact dapat dibaca |
| Active credential absent | **PASS** | Satu-satunya kredensial yang ditemukan sudah di-revoke; tidak ada kredensial lain |
| Security gate | **PASS_WITH_RESIDUAL_RISK** | §12 |

## 11. Residual Risk

| Risiko | Penilaian |
|---|---|
| Token disalahgunakan | **Rendah** — token sudah di-revoke (atestasi). Bila atestasi keliru, risikonya menjadi tinggi; lihat §15 |
| Salinan di log lokal | **Rendah** — hanya dapat dibaca akun pengguna lokal; tidak ada sinkronisasi cloud claude-mem yang dikonfigurasi |
| Salinan terus bertambah (F-08) | **Rendah**, tetapi menunjukkan bahwa membersihkan hanya satu lokasi tidak cukup |
| False positive pada scanner di masa depan | **Sedang** — salinan dapat memicu alarm berulang |
| Pola kebiasaan (token diketik di shell / disisipkan di URL) | **Sedang** — penyebab akar; dapat terulang dengan token baru |

## 12. Security Gate Decision

**FE-FOUNDATION-01 SECURITY GATE: `PASS_WITH_RESIDUAL_RISK`**

Klasifikasi RESIDUAL_REVOKED_COPY, PAT di-revoke, tidak ada kredensial aktif, repository bersih, remote bersih, working tree bersih. Artifact residual dicatat dan tidak memblok FE-FOUNDATION-01.

**Konflik dengan dokumen sebelumnya (dicatat, tidak diputuskan diam-diam):**

| Sumber | Isi |
|---|---|
| FE-FOUNDATION-DECISION-01-FINALIZATION (gate rule #2, #11; `foundation-decision-resolution.md` §21; `README.md` §3 dan §16) | Gate `BLOCKED` sampai log lokal dibersihkan (H-9) |
| FE-FOUNDATION-SECURITY-GATE-01 (prompt yang disetujui manusia) | Salinan yang sudah di-revoke → `PASS_WITH_RESIDUAL_RISK`, tidak memblok |

Fase ini mengikuti aturan gate yang lebih baru dari pemilik. **Dampak:** README dan `foundation-decision-resolution.md` masih menyatakan `BLOCKED`. Pada fase ini hanya dokumen ini yang boleh diubah, sehingga kedua file itu **belum diselaraskan**. Rekomendasi: selaraskan di awal FE-FOUNDATION-01 (H-9 menjadi `DEFERRED — residual revoked copy`).

## 13. Recommendation

1. FE-FOUNDATION-01 boleh dimulai setelah laporan ini ditinjau dan disetujui secara eksplisit.
2. Selaraskan README §3 dan §16 serta `foundation-decision-resolution.md` §2, §4, §19, §21 dengan keputusan gate ini.
3. Pencegahan: jangan pernah menyisipkan token di URL remote atau mengetik token langsung di shell. Gunakan `gh auth login`, credential helper (Keychain), atau SSH; untuk automasi pakai fine-grained PAT dengan scope minimum dan masa berlaku pendek.
4. Pertimbangkan secret scanning otomatis (mis. GitHub push protection dan pre-commit scanner) saat CI dibangun di FE-FOUNDATION-01.
5. Jadwalkan cleanup sebagai tugas terpisah (§14).

## 14. Deferred Cleanup

Tidak ada yang dihapus pada fase ini (kebijakan No Cleanup).

| Artifact | Alasan belum dihapus | Credential di-revoke | Risiko residual | Pemilik cleanup | Rekomendasi |
|---|---|---|---|---|---|
| Transcript `551656f9…jsonl` | Cleanup ditolak permission classifier (fase lalu); dilarang di fase ini | Ya (atestasi) | Rendah | Pemilik mesin | Hapus/redaksi dari terminal biasa setelah sesi Claude Code ditutup |
| Transcript `df215931…jsonl` | Idem; file sesi aktif | Ya | Rendah | Pemilik mesin | Idem, **setelah** sesi ini selesai |
| `~/.claude-mem/claude-mem.db` | Dilarang di fase ini | Ya | Rendah | Pemilik mesin | Hentikan worker claude-mem → hapus observasi terkait (tooling claude-mem atau `sqlite3`) → `VACUUM` |
| `~/.claude-mem/chroma/chroma.sqlite3` | Dilarang di fase ini | Ya | Rendah | Pemilik mesin | Bersihkan bersamaan dengan claude-mem.db dan transcript agar tidak diisi ulang; cek juga `~/.claude-mem/backups/` |
| `~/.zsh_history` | Dilarang di fase ini | Ya | Rendah | Pemilik mesin | Tutup semua sesi zsh → hapus baris terkait → buka shell baru |

Setelah cleanup: jalankan ulang pemindaian hash-only untuk memastikan 0 kecocokan dengan prefix `976df032e73a`.

## 15. Evidence Limitations

- **Status revoke berbasis atestasi manusia**, tidak diverifikasi secara teknis (aturan melarang memakai token). Bila token ternyata belum di-revoke, klasifikasi berubah menjadi **BLOCKED**.
- Scope dan riwayat pemakaian token di GitHub (audit log, sesi aktif) tidak diperiksa; GitHub MCP gagal terhubung pada sesi ini.
- Isi macOS Keychain tidak diperiksa.
- Sweep lokal terbatas pada `~/.claude`, `~/.claude-mem`, `~/.config`, dan file history/credential umum di home. Lokasi lain (folder unduhan, catatan, clipboard manager, backup Time Machine, sinkronisasi iCloud) tidak diperiksa.
- Salinan yang terkirim ke penyedia model selama sesi FE-00 (F-12) berada di luar kendali lokal.
- Pencocokan memakai pola prefix token classic + 36 karakter alfanumerik; salinan yang terpotong, ter-encode, atau terfragmentasi (mis. di indeks FTS) mungkin tidak terdeteksi.
- Pemindaian dilakukan pada 2 Okt 2026; artifact dapat berubah setelahnya (lihat F-08).

## 16. Post-Gate Synchronization

| Urutan | Peristiwa |
|---|---|
| 1 | Gate ini menghasilkan `SECURITY_GATE_PASS_WITH_RESIDUAL_RISK`; README dan `foundation-decision-resolution.md` saat itu masih menyatakan `BLOCKED` (§12) |
| 2 | FE-FOUNDATION-01 disetujui pemilik |
| 3 | Pada awal FE-FOUNDATION-01, README §3/§16, `foundation-decision-resolution.md` §0, dan AI-CONTEXT disinkronkan ke status gate ini. Catatan historis tidak dihapus |

Status saat ini: **SECURITY_GATE_PASS_WITH_RESIDUAL_RISK**; residual copy **DEFERRED CLEANUP**; bukan blocker.
