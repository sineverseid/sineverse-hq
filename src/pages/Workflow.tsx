import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { TASK_STATUSES } from '../types.ts'

export default function Workflow() {
  return (
    <div>
      <PageHeader
        title="Workflow Management"
        description="Alur kerja tugas dari Backlog hingga selesai. Setiap tugas bergerak mengikuti status yang sama di seluruh divisi."
      />

      <section className="card" aria-label="Tahapan alur kerja">
        <h2>Tahapan Alur Kerja</h2>
        <p>
          Jumlah tugas per tahap akan tampil di sini setelah ada tugas yang
          tercatat.
        </p>
        <ul className="list">
          {TASK_STATUSES.map((status) => (
            <li className="list-row" key={status.value}>
              <span className="list-row-main">
                <strong>{status.label}</strong>
              </span>
              <span className="status-badge">— tugas</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-label="Alur kerja aktif">
        <h2>Alur Kerja Aktif</h2>
        <div className="card">
          <EmptyState
            title="Belum ada alur kerja aktif"
            description="Belum ada alur kerja yang berjalan. Alur kerja baru dibuat dari Task Management setelah backend aktif."
          />
        </div>
      </section>
    </div>
  )
}
