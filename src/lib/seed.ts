/**
 * Data awal HQ yang sudah terverifikasi — dipakai halaman sebagai fallback
 * sampai proyek Supabase HQ terhubung, lalu data live menggantikannya.
 *
 * Asal nilai (bukan karangan): registry 13 divisi + 14 agen yang disahkan
 * Founder 25 Nov 2026, dan pemakaian Groq terverifikasi dari audit §21
 * (16 req / 10.609 token / Rp0). Nilai yang sama di-seed migrasi 001 ke
 * tabel hq_* — jadi tampilan sebelum dan sesudah Supabase terhubung
 * menunjukkan angka yang sama.
 */

export type SeedAgentStatus = 'active' | 'standby'

export interface SeedAgent {
  code: string
  name: string
  role: string
  departmentCode: string | null
  departmentName: string
  model: string
  executor: string
  jobDesc: string
  skills: string
  permissions: string
  status: SeedAgentStatus
  openTasks: number
}

export const SEED_AGENTS: SeedAgent[] = [
  {
    code: 'NARA',
    name: 'NARA',
    role: 'AI Executive Director',
    departmentCode: null,
    departmentName: 'Kantor Pusat',
    model: 'Muse (Executive) + Groq GPT-OSS 120B (orkestrasi divisi)',
    executor: 'Muse — agent utama Founder, terhubung ke tools & konektor',
    jobDesc:
      'Mengorkestrasi 13 divisi: menerima instruksi Founder, menyusun rencana, membagi task, memantau progres, menegakkan approval, dan melaporkan hasil.',
    skills:
      'Perencanaan, orkestrasi agent, pelaporan eksekutif, audit, manajemen risiko',
    permissions:
      'Level 1 rutin tanpa approval; Level 2 wajib approval Founder; Level 3 dilarang tanpa otorisasi khusus',
    status: 'active',
    openTasks: 0,
  },
  {
    code: 'LEAD-01',
    name: 'Bima Pratama',
    role: 'Division Lead — Digital Product & Engineering',
    departmentCode: 'LEAD-01',
    departmentName: 'Digital Product & Engineering',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc:
      'Memimpin pengembangan dan pemeliharaan teknis platform SINEVERSE dan infrastruktur HQ.',
    skills: 'Web development, backend, database, integrasi API, DevOps',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'standby',
    openTasks: 0,
  },
  {
    code: 'LEAD-02',
    name: 'Sari Wulandari',
    role: 'Division Lead — Academic & Curriculum',
    departmentCode: 'LEAD-02',
    departmentName: 'Academic & Curriculum',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc:
      'Memimpin penyusunan kurikulum dan materi pembelajaran SINEVERSE Academy.',
    skills: 'Desain kurikulum, penulisan modul, evaluasi pembelajaran',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'standby',
    openTasks: 0,
  },
  {
    code: 'LEAD-03',
    name: 'Dimas Anggara',
    role: 'Division Lead — Marketing & Creative',
    departmentCode: 'LEAD-03',
    departmentName: 'Marketing & Creative',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc:
      'Memimpin pemasaran dan produksi kreatif untuk pertumbuhan SINEVERSE.',
    skills: 'Strategi konten, copywriting, desain kreatif, kampanye digital',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'standby',
    openTasks: 0,
  },
  {
    code: 'LEAD-04',
    name: 'Rina Kusuma',
    role: 'Division Lead — Community & Partnership',
    departmentCode: 'LEAD-04',
    departmentName: 'Community & Partnership',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc:
      'Memimpin pengembangan komunitas siswa/mentor dan kemitraan dengan sekolah.',
    skills: 'Manajemen komunitas, kemitraan sekolah, kolaborasi eksternal',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'standby',
    openTasks: 0,
  },
  {
    code: 'LEAD-05',
    name: 'Fajar Nugroho',
    role: 'Division Lead — UI/UX & Product Research',
    departmentCode: 'LEAD-05',
    departmentName: 'UI/UX & Product Research',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc:
      'Memimpin riset dan desain pengalaman pengguna produk SINEVERSE.',
    skills: 'Riset pengguna, desain UI, usability testing, design system',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'standby',
    openTasks: 0,
  },
  {
    code: 'LEAD-06',
    name: 'Kirana Dewi',
    role: 'Division Lead — AI Innovation & Research',
    departmentCode: 'LEAD-06',
    departmentName: 'AI Innovation & Research',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc:
      'Memimpin riset dan eksperimen AI, termasuk SINEBOT dan otomasi internal HQ.',
    skills: 'Riset AI, prompt engineering, otomasi, evaluasi model',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'active',
    openTasks: 0,
  },
  {
    code: 'LEAD-07',
    name: 'Rizky Firmansyah',
    role: 'Division Lead — Quality Assurance & Security',
    departmentCode: 'LEAD-07',
    departmentName: 'Quality Assurance & Security',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc:
      'Memimpin pengujian kualitas dan keamanan sebelum setiap rilis SINEVERSE.',
    skills: 'QA testing, audit keamanan, validasi rilis, regression testing',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'standby',
    openTasks: 0,
  },
  {
    code: 'LEAD-08',
    name: 'Anisa Putri',
    role: 'Division Lead — Growth & Data Analytics',
    departmentCode: 'LEAD-08',
    departmentName: 'Growth & Data Analytics',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc:
      'Memimpin analitik pertumbuhan dan pelaporan KPI SINEVERSE.',
    skills: 'Analisis data, KPI dashboard, growth experiment, insight produk',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'standby',
    openTasks: 0,
  },
  {
    code: 'LEAD-09',
    name: 'Dewi Lestari',
    role: 'Division Lead — Customer Success & Helpdesk',
    departmentCode: 'LEAD-09',
    departmentName: 'Customer Success & Helpdesk',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc:
      'Memimpin dukungan pengguna dan memastikan masalah terselesaikan terdokumentasi.',
    skills: 'Dukungan pengguna, dokumentasi bantuan, eskalasi masalah',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'standby',
    openTasks: 0,
  },
  {
    code: 'LEAD-10',
    name: 'Agus Santoso',
    role: 'Division Lead — Operations & Governance',
    departmentCode: 'LEAD-10',
    departmentName: 'Operations & Governance',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc:
      'Memimpin operasional harian HQ, SOP, dan dokumentasi organisasi.',
    skills: 'SOP, administrasi, tata kelola, dokumentasi, kepatuhan proses',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'active',
    openTasks: 0,
  },
  {
    code: 'LEAD-11',
    name: 'Putri Ayu',
    role: 'Division Lead — Film Festival & Event',
    departmentCode: 'LEAD-11',
    departmentName: 'Film Festival & Event',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc: 'Memimpin festival, kompetisi, dan event SINEVERSE.',
    skills: 'Manajemen event, kurasi festival, webinar, kompetisi film',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'standby',
    openTasks: 0,
  },
  {
    code: 'LEAD-12',
    name: 'Yoga Saputra',
    role: 'Division Lead — Talent & Mentor Development',
    departmentCode: 'LEAD-12',
    departmentName: 'Talent & Mentor Development',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc: 'Memimpin pengembangan mentor dan talent SINEVERSE.',
    skills: 'Onboarding mentor, pengembangan kompetensi, kurasi talent',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'standby',
    openTasks: 0,
  },
  {
    code: 'LEAD-13',
    name: 'Ratna Sari',
    role: 'Division Lead — Research & Industry Relations',
    departmentCode: 'LEAD-13',
    departmentName: 'Research & Industry Relations',
    model: 'Groq GPT-OSS 120B (free tier)',
    executor: 'Groq orchestrator via NARA — peran AI, bukan orang sungguhan',
    jobDesc:
      'Memimpin riset industri film dan hubungan dengan profesional perfilman.',
    skills: 'Riset industri film, tren pasar, relasi profesional',
    permissions:
      'Level 1 dalam mandat divisi; tindakan Level 2/3 harus lewat Approval Center',
    status: 'standby',
    openTasks: 0,
  },
]

export const SEED_AGENT_LABEL: Record<SeedAgentStatus, string> = {
  active: 'Aktif',
  standby: 'Siaga',
}

export interface SeedDepartment {
  code: string
  name: string
  leadName: string
  mandate: string
}

export const SEED_DEPARTMENTS: SeedDepartment[] = [
  {
    code: 'LEAD-01',
    name: 'Digital Product & Engineering',
    leadName: 'Bima Pratama',
    mandate:
      'Pengembangan website, backend, database, integrasi, maintenance, dan infrastruktur SINEVERSE.',
  },
  {
    code: 'LEAD-02',
    name: 'Academic & Curriculum',
    leadName: 'Sari Wulandari',
    mandate:
      'Kurikulum, course, modul, materi pembelajaran, presentasi, tugas, dan evaluasi.',
  },
  {
    code: 'LEAD-03',
    name: 'Marketing & Creative',
    leadName: 'Dimas Anggara',
    mandate:
      'Strategi pemasaran, content planning, copywriting, desain, kampanye, dan media sosial.',
  },
  {
    code: 'LEAD-04',
    name: 'Community & Partnership',
    leadName: 'Rina Kusuma',
    mandate:
      'Pengembangan komunitas, hubungan sekolah, mitra, dan kolaborasi.',
  },
  {
    code: 'LEAD-05',
    name: 'UI/UX & Product Research',
    leadName: 'Fajar Nugroho',
    mandate:
      'Riset pengguna, desain antarmuka, user journey, usability, dan evaluasi produk.',
  },
  {
    code: 'LEAD-06',
    name: 'AI Innovation & Research',
    leadName: 'Kirana Dewi',
    mandate:
      'Riset teknologi AI, eksperimen, otomasi, dan pengembangan solusi AI.',
  },
  {
    code: 'LEAD-07',
    name: 'Quality Assurance & Security',
    leadName: 'Rizky Firmansyah',
    mandate:
      'Pengujian sistem, QA, audit keamanan, validasi fitur, dan pemeriksaan rilis.',
  },
  {
    code: 'LEAD-08',
    name: 'Growth & Data Analytics',
    leadName: 'Anisa Putri',
    mandate:
      'Analisis data, KPI, pertumbuhan pengguna, performa produk, dan insight.',
  },
  {
    code: 'LEAD-09',
    name: 'Customer Success & Helpdesk',
    leadName: 'Dewi Lestari',
    mandate:
      'Dukungan pengguna, dokumentasi bantuan, penanganan masalah, dan SINEBOT.',
  },
  {
    code: 'LEAD-10',
    name: 'Operations & Governance',
    leadName: 'Agus Santoso',
    mandate:
      'SOP, administrasi, tata kelola, kebijakan, dan dokumentasi organisasi.',
  },
  {
    code: 'LEAD-11',
    name: 'Film Festival & Event',
    leadName: 'Putri Ayu',
    mandate:
      'Festival film, kompetisi, webinar, kegiatan, dan event SINEVERSE.',
  },
  {
    code: 'LEAD-12',
    name: 'Talent & Mentor Development',
    leadName: 'Yoga Saputra',
    mandate:
      'Pengembangan mentor, talent, onboarding, dan peningkatan kompetensi.',
  },
  {
    code: 'LEAD-13',
    name: 'Research & Industry Relations',
    leadName: 'Ratna Sari',
    mandate:
      'Riset industri film, tren perfilman, kebutuhan industri, dan relasi profesional.',
  },
]

export type SeedIntegrationStatus =
  | 'verified'
  | 'connected'
  | 'separate'
  | 'removed'

export interface SeedIntegration {
  name: string
  kind: string
  status: SeedIntegrationStatus
  detail: string
}

export const SEED_INTEGRATION_LABEL: Record<SeedIntegrationStatus, string> = {
  verified: 'Terverifikasi',
  connected: 'Terhubung',
  separate: 'Terpisah',
  removed: 'Digantikan',
}

export const SEED_INTEGRATIONS: SeedIntegration[] = [
  {
    name: 'Groq (AI Provider)',
    kind: 'AI Provider',
    status: 'verified',
    detail:
      'Satu-satunya provider AI eksternal HQ sesuai keputusan Founder: gratis saja. Orchestrator teruji nyata 25 Nov 2026 (HTTP 200, Rp0).',
  },
  {
    name: 'Google Drive — Master Archive',
    kind: 'Arsip',
    status: 'connected',
    detail:
      'Pusat dokumentasi HQ. Struktur folder SINEVERSE ORGANIZATION dipertahankan dan dipakai lagi oleh HQ baru; arsip terindeks di Master Drive Index.',
  },
  {
    name: 'SINEVERSE Platform',
    kind: 'Sistem terpisah',
    status: 'separate',
    detail:
      'Database platform (siswa, mentor, course) TIDAK digabung ke database HQ. Integrasi hanya lewat API aman dengan akses data minimum bila dibutuhkan pekerjaan HQ.',
  },
  {
    name: 'GitHub',
    kind: 'Kode',
    status: 'connected',
    detail:
      'Repositori SINEVERSE di GitHub; bagian dari lapis backup organisasi bersama Drive dan dump database.',
  },
  {
    name: 'Email (Gmail Founder)',
    kind: 'Komunikasi',
    status: 'connected',
    detail:
      'Kanal laporan dan eskalasi ke Founder. Pengiriman massal tetap Level 2 — wajib approval Founder.',
  },
  {
    name: 'Backup & Restore',
    kind: 'Keamanan',
    status: 'verified',
    detail:
      'Dump database SINEVERSE 25 Nov 2026 terverifikasi (sha256 OK) dan restore test lolos di sandbox; arsip tersimpan di folder Drive 11_BACKUP & DISASTER RECOVERY.',
  },
  {
    name: 'Telegram HQ (sistem lama)',
    kind: 'Digantikan',
    status: 'removed',
    detail:
      'Kantor lama berbasis grup + bot Telegram digantikan HQ web ini sesuai Master Prompt Final Nara. Penghapusan permanen menunggu HQ baru lolos QA (keputusan Founder: bangun dulu, baru hapus).',
  },
]

export interface SeedGroqRecord {
  requests: number
  tokens: number
  recordedOn: string
  note: string
}

export const SEED_GROQ_USAGE = {
  provider: 'Groq',
  model: 'GPT-OSS 120B',
  totalRequests: 16,
  totalTokens: 10609,
  totalCostIdr: 0,
  records: [
    {
      requests: 12,
      tokens: 7804,
      recordedOn: '25 Nov 2026',
      note: 'Pemakaian orchestrator terverifikasi dari sinkronisasi kantor HQ terakhir, 25 Nov 2026 (termasuk diskusi /diskusi teruji di grup).',
    },
    {
      requests: 4,
      tokens: 2805,
      recordedOn: '25 Nov 2026',
      note: 'Diskusi OFFICE-4 19:21 WIB 25 Nov 2026, topik Materi sineverse (dari Kantor Virtual), 4 panggilan Groq: LEAD-02, LEAD-10, LEAD-07, plus sintesis Nara. Melengkapi catatan 12 req / 7.804 token menjadi 16 req / 10.609 token sesuai audit.',
    },
  ] as SeedGroqRecord[],
}

export interface SeedActivity {
  timeWib: string
  actor: string
  event: string
  detail: string
}

export const SEED_ACTIVITY: SeedActivity[] = [
  {
    timeWib: '25 Nov 2026, 21:49 WIB',
    actor: 'FOUNDER',
    event: 'ai_usage_recorded',
    detail: 'Groq GPT-OSS 120B: 4 req, 2805 token',
  },
  {
    timeWib: '25 Nov 2026, 21:48 WIB',
    actor: 'SYSTEM',
    event: 'organization_seeded',
    detail:
      '13 divisi, 14 agent (NARA + 13 Lead), 7 status integrasi, dan catatan pemakaian Groq terverifikasi dimuat sebagai data awal HQ.',
  },
]

export interface SeedCheckpoint {
  time: string
  label: string
  done: boolean
}

export const SEED_CHECKPOINTS: SeedCheckpoint[] = [
  { time: '07:45', label: 'System Check', done: false },
  { time: '08:00', label: 'Morning Briefing', done: false },
  { time: '12:00', label: 'Progress Report', done: false },
  { time: '17:00', label: 'End-of-Day Report', done: false },
]

export interface SeedDriveEntry {
  fileName: string
  version: string
  folder: string
  division: string
  owner: string
  fileDate: string
  status: string
}

export const SEED_DRIVE_ENTRIES: SeedDriveEntry[] = [
  {
    fileName: 'HANDOVER-2026-11-25.md',
    version: 'FINAL',
    folder: '10_OPERATIONS',
    division: 'Operations & Governance',
    owner: 'NARA',
    fileDate: '25 Nov 2026',
    status: 'verified',
  },
  {
    fileName: 'sineverse-db-2026-11-25.sql.gz',
    version: 'v1',
    folder: '11_BACKUP & DISASTER RECOVERY',
    division: 'Operations & Governance',
    owner: 'NARA',
    fileDate: '25 Nov 2026',
    status: 'verified',
  },
]

/** Kinerja per divisi hari ini — semua divisi 0 tugas (data awal). */
export const SEED_DEPARTMENT_PERFORMANCE = SEED_DEPARTMENTS.map((d) => ({
  code: d.code,
  name: d.name,
  leadName: d.leadName,
  open: 0,
  completed: 0,
  blocked: 0,
  total: 0,
}))

/** Ringkasan dashboard dari data awal: 14 agen, 3 aktif, 0 tugas. */
export const SEED_DASHBOARD_COUNTS = {
  totalAgents: SEED_AGENTS.length,
  activeAgents: SEED_AGENTS.filter((a) => a.status === 'active').length,
  totalTasks: 0,
  completedToday: 0,
  pendingApprovals: 0,
  running: 0,
  overdue: 0,
  blocked: 0,
}
