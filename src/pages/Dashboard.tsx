import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { DAILY_SCHEDULE } from '../types.ts'

const KPI_CARDS = [
  { label: 'Total Agen AI', note: 'Belum ada agen terdaftar.' },
  { label: 'Tugas Aktif', note: 'Belum ada tugas tercatat.' },
  { label: 'Tugas Selesai', note: 'Belum ada tugas selesai.' },
  { label: 'Menunggu Persetujuan', note: 'Belum ada antrean persetujuan.' },
]

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Selamat datang di SINEVERSE AI Headquarters"
        description="Pusat komando organisasi virtual SINEVERSE. Semua modul di bawah ini menampilkan data nyata dari proyek Supabase HQ — saat ini belum ada data yang terhubung."
      />

      <div className="grid grid-4">
        {KPI_CARDS.map((kpi) => (
          <div className="kpi-card" key={kpi.label}>
            <p className="kpi-label">{kpi.label}</p>
            <p className="kpi-value">—</p>
            <p className="kpi-note">Data belum tersedia. {kpi.note}</p>
          </div>
        ))}
      </div>

      <div className="section">
        <div className="grid grid-2">
          <section className="card" aria-label="NARA Command Center">
            <h2>NARA Command Center</h2>
            <p>
              <span className="status-badge status-badge-warn">
                Belum terhubung
              </span>
            </p>
            <p>
              NARA belum dapat menerima instruksi karena backend Command Center
              belum di-deploy. Tidak ada percakapan atau eksekusi yang berjalan.
            </p>
            <p>
              <Link to="/command-center">Buka Command Center →</Link>
            </p>
          </section>

          <section className="card" aria-label="Jadwal hari ini">
            <h2>Jadwal Hari Ini</h2>
            <p>Jadwal harian yang sudah disetujui.</p>
            <ul className="list">
              {DAILY_SCHEDULE.map((slot) => (
                <li className="list-row" key={slot.time}>
                  <span className="list-row-main">
                    <strong>{slot.title}</strong>
                    <small>{slot.description}</small>
                  </span>
                  <span className="list-time">{slot.time} WIB</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="section" aria-label="Aktivitas terbaru">
        <h2>Aktivitas Terbaru</h2>
        <div className="card">
          <EmptyState
            title="Belum ada aktivitas"
            description="Aktivitas agen, tugas, dan persetujuan akan tampil di sini setelah sistem mulai berjalan."
          />
        </div>
      </section>
    </div>
  )
}
