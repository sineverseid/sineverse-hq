import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.tsx'
import { DAILY_SCHEDULE } from '../types.ts'
import {
  SEED_ACTIVITY,
  SEED_CHECKPOINTS,
  SEED_DASHBOARD_COUNTS,
  SEED_DEPARTMENT_PERFORMANCE,
} from '../lib/seed.ts'

const KPI_CARDS = [
  {
    label: 'Total Agen AI',
    value: String(SEED_DASHBOARD_COUNTS.totalAgents),
    note: `${SEED_DASHBOARD_COUNTS.activeAgents} aktif — NARA, Kirana Dewi, Agus Santoso.`,
  },
  {
    label: 'Tugas Aktif',
    value: String(SEED_DASHBOARD_COUNTS.totalTasks),
    note: 'Belum ada tugas tercatat.',
  },
  {
    label: 'Tugas Selesai',
    value: String(SEED_DASHBOARD_COUNTS.completedToday),
    note: 'Belum ada tugas selesai hari ini.',
  },
  {
    label: 'Menunggu Persetujuan',
    value: String(SEED_DASHBOARD_COUNTS.pendingApprovals),
    note: 'Belum ada antrean persetujuan.',
  },
]

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Selamat datang di SINEVERSE AI Headquarters"
        description="Pusat komando organisasi virtual SINEVERSE. Menampilkan data awal HQ yang sudah terverifikasi — data live dari Supabase akan menggantikannya setelah proyek terhubung."
      />

      <div className="grid grid-4">
        {KPI_CARDS.map((kpi) => (
          <div className="kpi-card" key={kpi.label}>
            <p className="kpi-label">{kpi.label}</p>
            <p className="kpi-value">{kpi.value}</p>
            <p className="kpi-note">{kpi.note}</p>
          </div>
        ))}
      </div>

      <div className="section">
        <div className="grid grid-2">
          <section className="card" aria-label="NARA Command Center">
            <h2>NARA Command Center</h2>
            <p>
              <span className="status-badge status-badge-ok">Aktif</span>
            </p>
            <p>
              NARA aktif sebagai AI Executive Director dan mengorkestrasi 13
              divisi. Eksekusi instruksi menunggu backend Command Center
              di-deploy.
            </p>
            <p>
              <Link to="/command-center">Buka Command Center →</Link>
            </p>
          </section>

          <section className="card" aria-label="Jadwal hari ini">
            <h2>Jadwal Hari Ini</h2>
            <p>Jadwal harian yang sudah disetujui.</p>
            <ul className="list">
              {DAILY_SCHEDULE.map((slot) => {
                const checkpoint = SEED_CHECKPOINTS.find(
                  (c) => c.time === slot.time,
                )
                return (
                  <li className="list-row" key={slot.time}>
                    <span className="list-row-main">
                      <strong>{slot.title}</strong>
                      <small>{slot.description}</small>
                    </span>
                    <span className="list-time">{slot.time} WIB</span>
                    {checkpoint && !checkpoint.done ? (
                      <span className="status-badge status-badge-warn">
                        Menunggu
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>

      <section className="section" aria-label="Kinerja per divisi">
        <h2>Kinerja per Divisi</h2>
        <div className="card">
          <ul className="list">
            {SEED_DEPARTMENT_PERFORMANCE.map((dept) => (
              <li className="list-row" key={dept.code}>
                <span className="list-row-main">
                  <strong>
                    {dept.code} — {dept.name}
                  </strong>
                  <small>
                    Lead: {dept.leadName} · {dept.open} terbuka ·{' '}
                    {dept.completed} selesai · {dept.blocked} tertunda
                  </small>
                </span>
                <span className="status-badge">{dept.total} tugas</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-label="Aktivitas terbaru">
        <h2>Aktivitas Terbaru</h2>
        <div className="card">
          <ul className="list">
            {SEED_ACTIVITY.map((activity) => (
              <li className="list-row" key={activity.event}>
                <span className="list-row-main">
                  <strong>{activity.detail}</strong>
                  <small>
                    {activity.actor} — {activity.timeWib}
                  </small>
                </span>
                <span className="status-badge">{activity.event}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
