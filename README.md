# SINEVERSE AI Headquarters — Production Web App

Pusat kendali operasional AI SINEVERSE: NARA Command Center, Agent Orchestrator,
Task Engine, Scheduler, dan Approval Engine dalam satu website internal khusus
Founder. Kanon: Master Prompt Final Nara (23 pasal) + blueprint HQ 25 Nov 2026.

Repo ini adalah **kode produksi** HQ. Repo ini TERPISAH dari:

- Platform SINEVERSE (`sineverseid/sineverse-web`) — database dan repo berbeda,
  integrasi hanya lewat API baca-only dengan allowlist minimum.
- Artefak Muse `sineverse-ai-headquarters` — itu hanya preview/prototipe, bukan
  produksi.

## Stack

- Vite 8 + React 19 + TypeScript, `react-router-dom` v7 (HashRouter, wajib untuk
  GitHub Pages), `@supabase/supabase-js`
- Hosting: GitHub Pages (repo `sineverseid/sineverse-hq`)
- Database + Auth + Edge Functions: proyek Supabase free tier **terpisah** dari
  proyek platform `sineverse`
- AI eksternal: Groq free tier saja (`openai/gpt-oss-120b`), $0/bulan
- Font: Plus Jakarta Sans. Palet: Deep Navy `#172438`, Soft White `#F5F7FA`,
  Film Green `#16865E`, Mint `#A3E6C4`, Light Grey `#E8EDF3`

## Struktur

```
sineverse-hq/
├── index.html                  # Entry, base './'
├── package.json                # build = "tsc -b && vite build"
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .env.example                # Hanya kunci kosong — TIDAK ADA nilai kredensial
├── public/
│   ├── logo-icon.jpg           # Logo resmi SINEVERSE (ikon aplikasi)
│   └── logo-lockup.jpg         # Logo resmi SINEVERSE (lockup + tagline)
├── src/
│   ├── main.tsx                # Entry React
│   ├── App.tsx                 # HashRouter + 16 rute modul
│   ├── index.css               # Palet + layout sidebar/content + responsif HP
│   ├── types.ts                # 13 divisi, status task, level approval, jadwal
│   ├── lib/supabase.ts         # Klien Supabase HANYA dari env vars
│   ├── lib/seed.ts             # Data awal HQ terverifikasi (dipakai sampai Supabase terhubung)
│   ├── components/             # Layout, EmptyState, PageHeader
│   └── pages/                  # 16 modul (lihat bawah)
└── supabase/
    ├── migrations/
    │   └── 001_create_hq_tables.sql   # 44 tabel hq_*, RLS deny-all, audit_logs append-only
    └── functions/              # 6 Edge Function (stub, lihat supabase/functions/README.md)
        ├── _shared/            # cors.ts, auth.ts
        ├── command-center/
        ├── approval-engine/
        ├── scheduler/
        ├── groq-proxy/
        ├── drive-sync/
        └── platform-api-client/
```

### 16 modul sidebar

MAIN: Dashboard, NARA Command Center. ORGANIZATION: AI Agent Management,
Departments, Workflow Management. OPERATIONS: Task Management, Work Schedule,
Approval Center, Deliverables, Reports & Analytics. INFRASTRUCTURE: Google
Drive Archive, AI Provider Management, Knowledge Base, System Monitoring,
Security & Audit, Settings.

## Penyiapan lokal

```bash
npm install
cp .env.example .env.local   # isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
npm run dev                  # pengembangan
npm run build                # tsc -b && vite build — SATU-SATUNYA gerbang type-check
```

Tanpa `.env.local`, aplikasi tetap jalan dan menampilkan data awal HQ yang
sudah terverifikasi (`src/lib/seed.ts`) beserta status "Belum dikonfigurasi" —
data live dari Supabase menggantikannya setelah proyek terhubung.

## Logo resmi + data awal

- Logo resmi SINEVERSE TIDAK BOLEH dimodifikasi: `public/logo-icon.jpg`
  (ikon aplikasi — dipakai sebagai mark sidebar dan favicon) dan
  `public/logo-lockup.jpg` (lockup lengkap + tagline "LEARN. CREATE.
  COLLABORATE.").
- `src/lib/seed.ts` berisi data awal HQ yang sudah terverifikasi (registry
  13 divisi + 14 agen, 7 integrasi, pemakaian Groq 16 req / 10.609 token /
  Rp0, 2 entri Master Drive Index, 2 entri audit) — nilai yang sama di-seed
  migrasi 001, jadi tampilan sebelum dan sesudah Supabase terhubung
  menunjukkan angka yang sama. Data ini BUKAN karangan.

## Database (proyek Supabase HQ — TERPISAH)

1. Buat proyek Supabase baru khusus HQ (D-BARU-1). Jangan pakai proyek platform.
2. Di proyek HQ, **matikan sign-up** (Auth) dan buat satu akun Founder.
3. Ganti placeholder UID Founder `00000000-0000-0000-0000-000000000000` di
   `supabase/migrations/001_create_hq_tables.sql` dengan UID asli Founder dari
   Auth users (89 kemunculan, masing-masing ditandai `TODO (deploy)`).
4. Jalankan migrasi di SQL Editor proyek HQ. Migrasi membuat 44 tabel `hq_*`,
   7 enum, RLS deny-all di semua tabel, dan `audit_logs` append-only (tanpa
   kebijakan UPDATE/DELETE untuk peran apa pun, plus trigger penolak).
5. Founder wajib enroll MFA TOTP (D-BARU-3). Aksi sensitif (approval, ekspor,
   perubahan konfigurasi) menolak sesi tanpa `aal2`.
6. Verifikasi ketersediaan `pg_cron` di free tier (D-BARU-9). Bila tidak
   tersedia, putuskan penjadwal alternatif $0 saat Foundation — bukan malam ini.

Seed yang sudah ada di migrasi: 13 divisi, 3 kebijakan approval (Level 1/2/3),
6 jadwal (07:45 System Check, 08:00 Morning Briefing, 12:00 Midday Progress
Report, 17:00 End-of-Day Report, Jumat 17:00 Weekly Executive Report,
tanggal 1 pukul 09:00 Monthly Performance Report — dua waktu terakhir adalah
pilihan default, mudah diubah di blok seed).

## Edge Functions

Lihat `supabase/functions/README.md` untuk perintah deploy dan variabel env
per fungsi. Ringkas:

```bash
supabase functions deploy command-center
supabase functions deploy approval-engine
supabase functions deploy scheduler
supabase functions deploy groq-proxy
supabase functions deploy drive-sync
supabase functions deploy platform-api-client
```

Semua secret dibaca dari environment (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `PLATFORM_API_URL`,
`PLATFORM_API_KEY`, `CRON_SECRET`). Tidak ada secret di kode.

## Deploy (GitHub Pages via Actions)

1. Buat repo `sineverseid/sineverse-hq` (D-BARU-2), publik.
2. Push seluruh isi repo ini (kecuali `node_modules/`, `dist/`, `.env*`).
3. Actions workflow: `npm ci` lalu `npm run build` (`tsc -b && vite build`),
   lalu publish folder `dist/` ke GitHub Pages. Jangan pernah mengunggah
   `dist/index.html` ke root repo — workflow me-rebuild dari source.
4. Atur secrets Actions untuk build bila diperlukan (URL Supabase publik aman
   ditulis di `.env` build karena anon key dilindungi RLS deny-all; JANGAN
   pernah memasukkan service-role key ke build).

## Integrasi platform (baca-only, allowlist minimum — D-BARU-4)

HQ hanya boleh membaca dari Platform API: agregat (jumlah siswa, mentor,
course, enrollment), status task (judul, status, tenggat), dan status
sertifikat (VALID/REVOKED/NOT FOUND + nomor seri). Tanpa PII apa pun.
Endpoint Platform API (`/hq/v1/overview`, `/hq/v1/tasks`,
`/hq/v1/certificates/verify`) **belum dibangun** — `platform-api-client`
mengembalikan 501 sampai endpoint itu ada. Platform tidak pernah memanggil HQ
dan tidak pernah menulis ke database HQ.

## Aturan operasi (mengikat)

- HQ $0/bulan: tanpa Supabase Pro, tanpa OpenAI/Anthropic berbayar, tanpa
  trial auto-renew. Groq free tier saja.
- Jangan mengarang status, hasil, angka, biaya, atau aktivitas. Data yang
  belum ada tampil sebagai "Belum ada data" / "Data belum tersedia".
- Approval Level 2/3 ditegakkan di backend (Approval Engine), bukan di
  tampilan. Level 3 butuh flag `special_authorization` per kejadian.
- Setiap deliverable diarsipkan ke Google Drive dengan format nama
  `YYYY-MM-DD_DIVISION_TASK-NAME_VERSION` dan diverifikasi baca-balik sebelum
  diklaim berhasil. Bila gagal, tandai `GOOGLE DRIVE UPLOAD PENDING`.
- Backup HQ dan backup platform TERPISAH (dua dump, dua jadwal, dua folder
  arsip). Dump harian, retensi 7 hari, restore test bulanan (D-7).
- Jangan pernah menulis kata sandi, token, atau API key ke file, repo,
  Drive, log, atau chat. Akun uji adalah satu-satunya pengecualian.

## Keputusan Founder (D-BARU-1 s.d. 9 — semua DISETUJUI 25 Nov 2026, 21:41 WIB)

| ID | Keputusan |
|---|---|
| D-BARU-1 | Proyek Supabase HQ: proyek baru TERPISAH dari proyek platform |
| D-BARU-2 | Repo HQ baru `sineverseid/sineverse-hq`, GitHub Pages, Actions build `tsc -b && vite build` |
| D-BARU-3 | Akun Founder + MFA TOTP (aplikasi authenticator); sign-up dimatikan; UID founder satu-satunya di allowlist |
| D-BARU-4 | Allowlist API platform: hanya agregat + status task + status sertifikat; tanpa PII apa pun |
| D-BARU-5 | Penghapusan HQ lama (grup+bot Telegram, artefak kantor, cron HQ, file lokal, goal; Drive dipertahankan) — DIPUTUSKAN 21:30, eksekusi hanya setelah QA langkah 6 lolos |
| D-BARU-6 | Jadwal 07:45 System Check + laporan mingguan (Jumat) + bulanan masuk scheduler HQ |
| D-BARU-7 | Tulis ulang skill `sineverse` ke spesifikasi baru (web HQ, tanpa Telegram) — selesai 25 Nov 21:43 |
| D-BARU-8 | Grup Telegram diarsipkan, lalu dihapus setelah gate QA |
| D-BARU-9 | Penjadwal bila pg_cron tidak tersedia di free tier — diputuskan saat Foundation berdasarkan verifikasi |

Keputusan D-BARU-5 (penghapusan HQ lama) TIDAK dilakukan dari repo ini — itu
pekerjaan retire terpisah setelah HQ baru lolos QA.

## Status jujur (25 Nov 2026, ~22:35 WIB)

SELESAI:

- Scaffold frontend lengkap, `npm run build` LOLOS (`tsc -b && vite build`,
  87 modul, dist/ terbit).
- Repo `sineverseid/sineverse-hq` dibuat + kode produksi diunggah (45 file,
  17 commit) + GitHub Pages LIVE di https://sineverseid.github.io/sineverse-hq/
  (build Actions run #15 lolos, deploy sukses setelah Pages diaktifkan).
- Penyelarasan 100% dengan artefak preview `sineverse-ai-headquarters`:
  logo resmi SINEVERSE dipasang (ikon sidebar + favicon), halaman
  menampilkan data awal terverifikasi dari `src/lib/seed.ts` (14 agen,
  13 divisi + Lead, 7 integrasi, pemakaian Groq, 2 entri Drive, log audit).
- Migrasi SQL lengkap (44 tabel, 45 kebijakan RLS, 7 enum) — **hanya lolos
  parse (`pglast`, 204 statement), BELUM dieksekusi** ke Postgres/Supabase.
- 6 Edge Function stub ditulis mengikuti pola standar Supabase — **belum
  `deno check`, belum di-deploy**.

MASIH TERBLOKIR (bukan malam ini):

- Proyek Supabase HQ belum dibuat (butuh dashboard Supabase + pembuatan
  proyek baru).
- UID Founder belum ada (belum ada proyek/Auth) — placeholder nol masih di
  migrasi dan di `_shared/auth.ts`; rute founder-only menolak semua orang
  sampai diganti.
- Platform API baca-only (overview/tasks/certificates) belum dibangun.
- Integrasi Google Drive di Edge Function belum terhubung (butuh token OAuth
  Founder di secrets).
- Enroll MFA TOTP adalah tindakan Founder di authenticator-nya.
- QA langkah 6 (fungsional, keamanan termasuk upaya bypass RLS/approval,
  integrasi, mobile, performa, backup-restore) belum dijalankan — penghapusan
  HQ lama menunggu gate ini.
