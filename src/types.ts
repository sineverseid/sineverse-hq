/**
 * Tipe bersama SINEVERSE AI Headquarters.
 *
 * Semua tipe di sini menggambarkan STRUKTUR data, bukan isi data.
 * Tidak ada nilai contoh yang boleh ditampilkan di UI sebagai data nyata.
 */

/** 13 divisi HQ — peran organisasi, bukan daftar agen yang sudah aktif. */
export interface Division {
  id: string
  name: string
  description: string
}

/** Status agen. Sampai ada executor yang terhubung, semua agen berstatus ini. */
export type AgentStatus = 'unregistered'

export interface Agent {
  id: string
  name: string
  divisionId: string
  status: AgentStatus
}

export type TaskStatus =
  | 'backlog'
  | 'planned'
  | 'in-progress'
  | 'in-review'
  | 'awaiting-approval'
  | 'testing'
  | 'completed'
  | 'blocked'
  | 'cancelled'

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'planned', label: 'Planned' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'in-review', label: 'In Review' },
  { value: 'awaiting-approval', label: 'Awaiting Approval' },
  { value: 'testing', label: 'Testing' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'cancelled', label: 'Cancelled' },
]

export interface Task {
  id: string
  title: string
  divisionId: string
  status: TaskStatus
}

/** Level persetujuan HQ. */
export type ApprovalLevel = 1 | 2 | 3

export interface ApprovalLevelInfo {
  level: ApprovalLevel
  title: string
  description: string
}

export const APPROVAL_LEVELS: ApprovalLevelInfo[] = [
  {
    level: 1,
    title: 'Level 1 — Routine Execution',
    description:
      'Eksekusi rutin yang dapat dijalankan agen tanpa persetujuan tambahan.',
  },
  {
    level: 2,
    title: 'Level 2 — Requires Founder Approval',
    description:
      'Membutuhkan persetujuan Founder sebelum dijalankan atau diterbitkan.',
  },
  {
    level: 3,
    title: 'Level 3 — Prohibited Without Special Authorization',
    description:
      'Dilarang tanpa otorisasi khusus dari Founder. Tidak dapat dieksekusi oleh agen.',
  },
]

/** Slot jadwal yang sudah disetujui (label jadwal, bukan data aktivitas). */
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly'

export interface ScheduleSlot {
  time: string
  title: string
  description: string
  frequency: ScheduleFrequency
}

export const DAILY_SCHEDULE: ScheduleSlot[] = [
  {
    time: '07:45',
    title: 'System Check',
    description: 'Pemeriksaan kesehatan sistem harian.',
    frequency: 'daily',
  },
  {
    time: '08:00',
    title: 'Morning Briefing',
    description: 'Briefing pagi dari NARA untuk Founder.',
    frequency: 'daily',
  },
  {
    time: '12:00',
    title: 'Progress Report',
    description: 'Laporan kemajuan tengah hari.',
    frequency: 'daily',
  },
  {
    time: '17:00',
    title: 'End-of-Day Report',
    description: 'Laporan penutupan hari.',
    frequency: 'daily',
  },
]

export const PERIODIC_SCHEDULE: ScheduleSlot[] = [
  {
    time: 'Jumat',
    title: 'Weekly Report',
    description: 'Laporan mingguan.',
    frequency: 'weekly',
  },
  {
    time: 'Tanggal 1',
    title: 'Monthly Report',
    description: 'Laporan bulanan.',
    frequency: 'monthly',
  },
]

/** 13 divisi HQ sesuai blueprint organisasi. */
export const DIVISIONS: Division[] = [
  {
    id: '01',
    name: 'Digital Product & Engineering',
    description: 'Pengembangan produk digital dan platform SINEVERSE.',
  },
  {
    id: '02',
    name: 'Academic & Curriculum',
    description: 'Kurikulum, materi ajar, dan standar akademik.',
  },
  {
    id: '03',
    name: 'Marketing & Creative',
    description: 'Pemasaran, konten kreatif, dan kampanye.',
  },
  {
    id: '04',
    name: 'Community & Partnership',
    description: 'Komunitas, kemitraan, dan relasi eksternal.',
  },
  {
    id: '05',
    name: 'UI/UX & Product Research',
    description: 'Riset produk, pengalaman pengguna, dan desain antarmuka.',
  },
  {
    id: '06',
    name: 'AI Innovation & Research',
    description: 'Riset dan inovasi kecerdasan buatan.',
  },
  {
    id: '07',
    name: 'Quality Assurance & Security',
    description: 'Pengujian kualitas, keamanan, dan audit sistem.',
  },
  {
    id: '08',
    name: 'Growth & Data Analytics',
    description: 'Pertumbuhan, data, dan analitik.',
  },
  {
    id: '09',
    name: 'Customer Success & Helpdesk',
    description: 'Dukungan pengguna dan layanan bantuan.',
  },
  {
    id: '10',
    name: 'Operations & Governance',
    description: 'Operasional harian, tata kelola, dan kepatuhan.',
  },
  {
    id: '11',
    name: 'Film Festival & Event',
    description: 'Festival film, kompetisi, dan acara.',
  },
  {
    id: '12',
    name: 'Talent & Mentor Development',
    description: 'Pengembangan talenta dan mentor.',
  },
  {
    id: '13',
    name: 'Research & Industry Relations',
    description: 'Riset industri dan relasi dengan pemangku kepentingan.',
  },
]
