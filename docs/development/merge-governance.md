# Merge Governance — Frontend (`saas_lms_frontend`)

**Status:** MANUAL — NOT TECHNICALLY ENFORCED · **Berlaku sejak:** 2026-10-14 · **Padanan backend:** `saas_lms_backend/docs/development/merge-governance.md`

## 1. Tujuan dan batasan GitHub Free

Dokumen ini mengatur cara perubahan masuk ke `main`: setiap perubahan melalui pull request, dan merge hanya setelah CI GitHub selesai sukses untuk head PR terbaru.

- Repository ini **privat** pada akun personal **GitHub Free**. Keputusan pemilik: tetap privat dan tetap GitHub Free.
- Dokumentasi GitHub (`github/docs`, `data/reusables/gated-features/`): protected branches dan rulesets tersedia di repository **publik** pada GitHub Free, dan di repository **privat** mulai GitHub Pro/Team/Enterprise. Required status checks, blokir push langsung, dan blokir force push **tidak tersedia** untuk repository ini.
- Terverifikasi lewat API GitHub (2026-10-14): `main` **`protected: false`**.
- **Prosedur di dokumen ini adalah disiplin manual dan dapat dilewati.** GitHub tidak akan memblokir merge PR dengan CI pending/merah, push langsung, atau force push ke `main`. Kepatuhan sepenuhnya tanggung jawab pemilik akun.

## 2. Branch workflow

1. Branch baru dari `origin/main` terbaru:

   ```bash
   git fetch origin
   git switch -c <tipe>/<ringkas> origin/main
   ```

2. Tipe branch: `fix/`, `feat/`, `test/`, `docs/`, `ci/`, `chore/`.
3. Dilarang: push langsung atau force push ke `main`, menghapus `main`, menulis ulang riwayat `main`. Koreksi dilakukan dengan commit baru atau `git revert` melalui PR.

## 3. Pull request

- Isi [`.github/pull_request_template.md`](../../.github/pull_request_template.md) **lengkap**: Tujuan, Aturan yang disentuh, Perubahan, Cara uji, Checklist arsitektur, Dampak. Template yang tidak diisi tidak memenuhi syarat merge.
- Bukti pengujian diberi label **lokal** atau **CI**.
- Periksa diff sebelum meminta merge:

  ```bash
  git diff --stat origin/main...HEAD
  git diff --check origin/main...HEAD
  ```

  Tidak boleh ada secret, `.env`, token, data pribadi, atau file di luar scope.
- Self-review wajib bila tidak ada reviewer independen, dan disebut sebagai self-review di PR.

## 4. CI frontend

Workflow [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), job **`build-and-test`** (trigger: `pull_request` dan `push` ke `main`):

| Langkah | Isi |
|---|---|
| Enable pnpm | Corepack; versi pnpm wajib sama dengan `packageManager` |
| Install dependencies | `pnpm install --frozen-lockfile` |
| Format Check / Lint / Svelte Check | `format:check`, `lint`, `check` |
| Unit Tests | `pnpm test` (Vitest) |
| Build | `pnpm build` |
| API Contract Check | `api:check` + gagal bila ada berkas generated yang belum ter-track |

Periksa log, bukan hanya ikon hijau:

- **Test `SKIP`:** SKIP tidak dihitung sebagai PASS. SKIP yang diketahui dan sesuai desain hanya paritas kontrak lintas repository (`tests/error-code-contract.test.ts`, "contract/openapi.yaml identik dengan backend api/openapi.yaml"): test memakai `skipIf` karena repository backend tidak tersedia di runner. SKIP lain wajib dijelaskan di PR. Paritas kontrak diperiksa terpisah (bawah).
- **Kontrak API:** `api:check` menjalankan `api:generate` lalu `git diff --exit-code -- src/lib/api/generated`; gagal bila `src/lib/api/generated/` tidak sesuai `contract/openapi.yaml`. `src/lib/api/generated/` tidak diedit manual.
- **Perubahan `contract/openapi.yaml`:** salin dari backend, jalankan `pnpm api:generate`, commit hasilnya, catat SHA backend sumber di [`contract/README.md`](../../contract/README.md), dan pastikan identik byte-per-byte dengan `api/openapi.yaml` backend pada SHA tersebut (mis. jalankan test paritas secara lokal dengan checkout backend yang sesuai di `../saas_lms_backend`).
- **Perubahan workflow CI:** action tetap dipin ke SHA penuh, `permissions: contents: read`, `persist-credentials: false`, tanpa `pull_request_target` atau `secrets.*`, tanpa melemahkan langkah yang ada.
- **Dependency baru dengan build script** memerlukan keputusan eksplisit di `pnpm-workspace.yaml` (`allowBuilds`).

## 5. Operasional merge

### Sebelum merge

1. Base branch PR adalah `main`.
2. Check **`build-and-test`** untuk PR ini benar-benar **ada**. Check yang belum muncul **bukan** lulus; PR yang baru dibuat belum memiliki check selama beberapa detik.
3. Tunggu sampai `build-and-test` **selesai** dengan conclusion **`success`**.
4. `head_sha` check run = head SHA PR terakhir.
5. Head SHA PR tidak berubah setelah CI selesai. Bila ada commit baru, tunggu run untuk revision terbaru.
6. Pending, failure, cancelled, skipped, missing, atau tidak dapat diverifikasi → **jangan merge**.
7. Hasil test lokal tidak menggantikan CI GitHub.
8. Catat di PR (komentar): nomor PR, head SHA, URL run, `completed_at`, conclusion, keputusan merge.

### Sesudah merge

1. Catat merge SHA.
2. Periksa run workflow untuk event `push` ke `main` pada merge SHA tersebut dan tunggu hasilnya.
3. Catat status merge SHA: **`CI PASS`** (run push sukses, SHA cocok), **`CI FAILED`**, atau **`CI NOT VERIFIED`** (run tidak ada atau tidak dapat diperiksa).
4. **Bila CI gagal:** investigasi dari log run, lalu perbaiki lewat PR baru (perbaikan atau `git revert <merge-sha>`). **Jangan** force push, `git reset`, atau mengubah riwayat `main`.
5. CI sukses (PR maupun `main`) **bukan** release approval; lihat bagian 6.

### Jalur utama: GitHub UI

1. PR → tab **Checks**: `build-and-test` tampil dengan status completed dan conclusion success (bukan kuning/abu-abu).
2. Buka detail run → cocokkan commit di header run dengan commit terakhir di tab **Commits** PR.
3. Baru klik **Merge** setelah langkah 1–2 terpenuhi. Bila head berubah, tunggu run baru.
4. Setelah merge: **Actions** → filter *Branch* `main`, *Event* `push` → run untuk merge SHA → tunggu selesai.
5. Salin URL run, SHA, `completed_at`, dan status ke komentar PR.

### Opsi: GitHub CLI (`gh`)

`gh` belum terpasang di lingkungan kerja; pemasangan dan autentikasi memerlukan keputusan pemilik. Contoh berikut hanya dokumentasi; perintah merge dijalankan manual oleh operator.

```bash
PR=<nomor>
gh pr view "$PR" --json number,state,baseRefName,headRefName,headRefOid
HEAD_SHA=$(gh pr view "$PR" --json headRefOid -q .headRefOid)

gh pr checks "$PR" --watch --fail-fast          # tunggu semua check selesai

# build-and-test harus tepat satu, completed, success, untuk HEAD_SHA
gh api "repos/{owner}/{repo}/commits/$HEAD_SHA/check-runs" \
  --jq '[.check_runs[] | select(.name=="build-and-test")] | map({head_sha, status, conclusion, completed_at, html_url})'

test "$(gh pr view "$PR" --json headRefOid -q .headRefOid)" = "$HEAD_SHA"   # head belum berubah

# Merge manual; --match-head-commit menolak merge bila head berubah (tidak menunggu CI)
# gh pr merge "$PR" --merge --match-head-commit "$HEAD_SHA"

MERGE_SHA=$(gh pr view "$PR" --json mergeCommit -q .mergeCommit.oid)
gh run list --branch main --event push --commit "$MERGE_SHA" --json databaseId,status,conclusion,headSha,url
gh run watch <databaseId> --exit-status
```

## 6. Merge ≠ release approval

Merge hanya menyatakan perubahan lolos prosedur integrasi. CI hijau bukan bukti kontrol keamanan, validasi browser/staging, atau release approval. Status saat ini: security release gate **OPEN**; staging dan produksi **BLOCKED**.

## 7. Bila paket berubah

Bila repository pindah ke paket yang mendukung (Pro/Team/Enterprise): ruleset atau branch protection untuk `main` — require pull request, require status check `build-and-test` + branch up to date, block force push, restrict deletions, bypass list kosong. Verifikasi dengan PR uji (pending/gagal tidak dapat di-merge) dan push langsung yang ditolak, lalu perbarui status dokumen ini.

## 8. Pengecualian

Setiap penyimpangan (mis. merge sebelum CI selesai) dicatat di PR atau dokumen audit: alasan, risiko, mitigasi, pemilik keputusan, tindak lanjut. Pengecualian merge bukan pengecualian release.

### Penyimpangan tercatat

| PR | Head | Run `build-and-test` | CI mulai (UTC) | Merge (UTC) | CI selesai (UTC) | Run `push` merge SHA |
|---|---|---|---|---|---|---|
| #1 | `577e041` | — (workflow belum ada) | — | 2026-10-14 04:14:33 (`26abc8d`) | — | Tidak ada CI |
| #2 | `b0605d4` | `38557845174` (success) | 2026-10-14 11:37:14 | 11:37:17 (`f45a956`) | 11:39:12 | CI NOT VERIFIED |

PR #2 di-merge 3 detik setelah `build-and-test` mulai, sebelum run selesai; hasil akhir run sukses, tetapi merge tidak menunggu hasil tersebut. Prosedur bagian 5 berlaku mulai PR berikutnya.
