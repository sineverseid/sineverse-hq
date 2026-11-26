import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { TASK_STATUSES } from '../types.ts'
import {
  listTasks,
  safe,
  useSession,
  type LiveTask,
} from '../lib/auth.ts'

const ACTIVE_STAGES = ['in-progress', 'in-review', 'awaiting-approval', 'testing']

function statusLabel(status: string): string {
  return TASK_STATUSES.find((s) => s.value === status)?.label ?? status
}

export default function Workflow() {
  const session = useSession()
  const [tasks, setTasks] = useState<LiveTask[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setTasks([])
      setLoaded(false)
      return
    }
    safe(listTasks(), []).then((live) => {
      setTasks(live)
      setLoaded(true)
    })
  }, [session])

  const active = tasks.filter((t) => ACTIVE_STAGES.includes(t.status))
  const loading = !!session && !loaded

  return (
    <div>
      <PageHeader
        title="Workflow Management"
        description="Alur kerja tugas dari Backlog hingga selesai. Setiap tugas bergerak mengikuti status yang sama di seluruh divisi."
      />

      <section className="card" aria-label="Tahapan alur kerja">
        <h2>Tahapan Alur Kerja</h2>
        <p>
          Jumlah tugas per tahap, dihitung langsung dari Task Management.
        </p>
        {loading ? (
          <p>Memuat alur kerja…</p>
        ) : (
          <ul className="list">
            {TASK_STATUSES.map((status) => {
              const count = tasks.filter(
                (t) => t.status === status.value,
              ).length
              return (
                <li className="list-row" key={status.value}>
                  <span className="list-row-main">
                    <strong>{status.label}</strong>
                  </span>
                  <span className="status-badge">{count} tugas</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="section" aria-label="Alur kerja aktif">
        <h2>Alur Kerja Aktif</h2>
        <div className="card">
          {loading ? (
            <p>Memuat…</p>
          ) : active.length === 0 ? (
            <EmptyState
              title="Belum ada alur kerja aktif"
              description={
                tasks.length === 0
                  ? 'Belum ada tugas yang tercatat di HQ.'
                  : 'Semua tugas masih di Backlog — belum ada yang masuk tahap aktif.'
              }
            />
          ) : (
            <ul className="list">
              {active.map((task) => (
                <li className="list-row" key={task.id}>
                  <span className="list-row-main">
                    <strong>{task.title}</strong>
                  </span>
                  <span className="status-badge">
                    {statusLabel(task.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
