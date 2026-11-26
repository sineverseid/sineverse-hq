-- 003_create_knowledge_base.sql
-- Knowledge Base HQ: master prompt, keputusan Founder, playbook divisi,
-- dan dokumen referensi yang dipakai agen saat bekerja.
-- Tabel ini tidak ada di migrasi 001 — halaman Knowledge Base sebelumnya
-- hardcoded menampilkan "Belum ada dokumen" karena tidak ada yang bisa
-- dibaca. RLS mengikuti pola migrasi 001: Founder UID saja.
-- Diterapkan 26 Nov 2026.

CREATE TABLE public.knowledge_base (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    category text NOT NULL,
    content text NOT NULL,
    status text NOT NULL DEFAULT 'published',
    version integer NOT NULL DEFAULT 1,
    owner_agent_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_base_founder_all ON public.knowledge_base FOR ALL TO authenticated
    USING (auth.uid() = '2161fd87-29ab-442e-8223-6d448c1aa7e5'::uuid)
    WITH CHECK (auth.uid() = '2161fd87-29ab-442e-8223-6d448c1aa7e5'::uuid);

-- Seed: 5 dokumen kanon HQ (ringkasan terverifikasi 26 Nov 2026).
INSERT INTO public.knowledge_base (title, category, content, status, version) VALUES
('Master Prompt SINEVERSE AI Headquarters v1.1', 'Master Prompt', $$Kanon 26 Nov 2026 (23 pasal). HQ adalah web app Vite + React + TypeScript di GitHub Pages (repo sineverseid/sineverse-hq, live sineverseid.github.io/sineverse-hq) dengan Supabase proyek sineverse-hq (ref zfuaehawoofnsggibmfx, Singapura). NARA adalah AI Executive Director yang mengorkestrasi 13 divisi dan 14 agen (NARA + 13 Lead). Aturan biaya: HQ $0/bulan, provider AI HANYA Groq (model openai/gpt-oss-120b, gratis) — tidak ada OpenAI/Claude berbayar, tidak ada trial auto-renew. Persetujuan 3 level: Level 1 rutin jalan otomatis, Level 2 butuh persetujuan Founder, Level 3 dilarang tanpa otorisasi khusus. Scheduler produksi: System Check 07:45, Morning Briefing 08:00, Midday 12:00, End-of-Day 17:00, Weekly Jumat 17:00, Monthly tanggal 1 pukul 09:00 WIB. Drive pusat: folder SINEVERSE (ORGANIZATION + MASTER ARCHIVE).$$, 'published', 1),
('Keputusan D-BARU — pendirian HQ (25 Nov 2026)', 'Keputusan Founder', $$Ringkasan keputusan Founder 25 Nov 2026 pukul 21:41 (17 keputusan). HQ dipisah dari platform SINEVERSE: proyek Supabase sendiri (sineverse-hq), repo sendiri (sineverseid/sineverse-hq), dan situs sendiri. MFA TOTP wajib untuk akun Founder. API platform hanya lewat allowlist tanpa PII. Skill sineverse ditulis ulang untuk HQ. Grup dan bot Telegram HQ diarsipkan lalu DIHAPUS 26 Nov 2026 pukul 03:08 — Telegram bukan lagi jalur HQ. HQ gratis saja (Groq), dump database harian pukul 03:00 WIB dengan retensi 7 hari dan restore test bulanan. Token akses Supabase HQ disimpan di file 600 di ~/.config/sineverse-hq/ (nilai tidak dicatat di mana pun).$$, 'published', 1),
('Runbook Operasional HQ', 'Playbook', $$Jadwal scheduler (pg_cron, WIB): System Check 07:45, Morning Briefing 08:00, Midday Progress Report 12:00, End-of-Day Report 17:00, Weekly Executive Report Jumat 17:00, Monthly Performance Report tanggal 1 pukul 09:00. Laporan scheduler dikirim ke chat Founder oleh cron pengiriman (08:05 / 12:05 / 17:05 / Jumat 17:05 / tgl 1 09:05). Dump harian: cron 03:00 WIB, file masuk folder Drive 11_BACKUP & DISASTER RECOVERY, retensi lokal 7 file. Drive-sync memakai OAuth akun Arif (1732); refresh token mode Testing kedaluwarsa 7 hari sejak diterbitkan 26 Nov 2026 — re-approval mingguan sampai domain sineverse.id terdaftar dan consent terverifikasi (pengingat Rabu 09:00). Deploy web: konektor GitHub push-files akun sineverseid (kata sandi github.com di vault SUDAH BASI — jangan pakai login web). Akses DB: terowongan socat ke pooler aws-1-ap-southeast-1, user postgres.zfuaehawoofnsggibmfx; awali setiap skrip dengan DEALLOCATE ALL + RESET ALL.$$ , 'published', 1),
('Katalog Course SINEVERSE — A3 (26 Nov 2026)', 'Akademik', $$Data live platform 26 Nov 2026: 10 course, 30 modul, 110 lesson — semua lesson sudah punya teks materi, 0 video, 0 assignments, 0 quizzes, 0 resources, 0 ujian. Course: Akting untuk Kamera; Dasar Sinematografi; Editing Film; Film Dokumenter; Mengenal Jobdesk Crew Film; Pembuatan Storyboard; Penulisan Skenario; Penyutradaraan; Produksi & Manajemen Film; Tata Suara & Musik Film. Masing-masing 3 modul (Orientasi 1 lesson + Section 1 Minggu 1: 5 lesson + Section 2 Minggu 2: 5 lesson). A3: dokumen Materi Soal & Tugas untuk ke-10 course selesai 26 Nov 2026 — total 330 soal pilihan ganda + 110 tugas praktik (per lesson: ringkasan + 3 soal + kunci + 1 tugas + kriteria), 3 gambar banner per course. Semua dokumen terdaftar sebagai deliverable HQ dan tersimpan di folder Drive 10_OPERATIONS & GOVERNANCE.$$ , 'published', 1),
('Kanon Platform SINEVERSE', 'Referensi', $$Platform: https://sineverseid.github.io/sineverse-web/ (repo sineverseid/sineverse-web), Supabase platform ref twdnlfzorenqitiixher (Singapura, gratis). Akun kanonis HANYA 3: Admin (sineverse.id@gmail.com), Siswa Uji, Mentor Uji — kata sandi akun uji adalah satu-satunya pengecualian yang boleh dicatat; kata sandi admin TIDAK disimpan di mana pun. Kurikulum: 10 course, 20 minggu, bobot Pretest 5% + Posttest 15% + tugas mingguan 30% + praktik akhir 40% + partisipasi 10%, lulus >= 70. Sertifikat: barcode Code 39 + serial, QR token berlabel 'Verify Certificate', tanpa blok tanda tangan, sertifikat mentor tanpa QR. Aturan: film terbit wajib poster karya member sendiri; logo resmi SINEVERSE tidak boleh dimodifikasi; domain sineverse.id DITUNDA (jangan angkat tanpa diminta); SINEBOT memakai Groq (GPT-OSS 120B) — Gemini didiskualifikasi karena ketentuannya melarang klien API untuk pengguna di bawah 18 tahun.$$ , 'published', 1);
