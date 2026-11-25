import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.tsx'
import {
  listAgents,
  listApprovalRequests,
  listDepartments,
  listScheduledJobs,
  listTaskLogs,
  listTasks,
  useSession,
  type LiveAgent,
  type LiveApprovalRequest,
  type LiveDepartment,
  type LiveScheduledJob,
  type LiveTask,
  type LiveTaskLog,
} from '../lib/auth.ts'

function formatWib(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isTodayWib(iso: string): boolean {
  const now = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
  const day = new Date(iso).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
  return now === day
}

export default function Dashboard() {
  const session = useSession()
  const [tasks, setTasks] = useState<LiveTask[]>([])
  const [agents, setAgents] = useState<LiveAgent[]>([])
  const [approvals, setApprovals] = useState<LiveApprovalRequest[]>([])
  const [departments, setDepartments] = useState<LiveDepartment[]>([])
  const [logs, setLogs] = useState<LiveTaskLog[]>([])
  const [jobs, setJobs] = useState<LiveScheduledJob[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setTasks([])
      setAgents([])
      setApprovals([])
      setDepartments([])
      setLogs([])
      setJobs([])
      setLoaded(false)
      return
    }
    Promise.all([
      listTasks(),
      listAgents(),
      listApprovalRequests(),
      listDepartments(),
      listTaskLogs(),
      listScheduledJobs(),
    ]).then(([liveTasks, liveAgents, liveApprovals, liveDepartments, liveLogs, liveJobs]) => {
      setTasks(liveTasks)
      setAgents(liveAgents)
      setApprovals(liveApprovals)
      setDepartments(liveDepartments)
      setLogs(liveLogs)
      setJobs(liveJobs)
      setLoaded(true)
    })
  }, [session])

  const activeAgents = agents.filter((a) => a.status === 'active')
  const activeTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
  const completedToday = tasks.filter(
    (t) => t.status === 'completed' && t.completedAt && isTodayWib(t.completedAt),
  )
  const pendingApprovals = approvals.filter((a) => a.status === 'pending')
  const taskTitles = new Map(tasks.map((t) => [t.id, t.title]))
  const agentNames = new Map(agents.map((a) => [a.id, a.name]))

  const kpiCards = [
    {
      label: 'Total Agen AI',
      value: String(agents.length),
      note:
        agents.length > 0
          ? `${activeAgents.length} aktif — ${activeAgents.map((a) => a.name).join(', ') || '—'}.`
          : 'Belum ada agen terdaftar.',
    },
    {
      label: 'Tugas Aktif',
      value: String(activeTasks.length),
      note:
        activeTasks.length > 0
          ? `${tasks.filter((t) => t.status === 'backlog').length} di backlog.`
          : 'Belum ada tugas tercatat.',
    },
    {
      label: 'Tugas Selesai',
      value: String(completedToday.length),
      note:
        completedToday.length > 0
          ? 'Diselesaikan hari ini.'
          : 'Belum ada tugas selesai hari ini.',
    },
    {
      label: 'Menunggu Persetujuan',
      value: String(pendingApprovals.length),
      note:
        pendingApprovals.length > 0
          ? 'Menunggu keputusan Founder.'
          : 'Belum ada antrean persetujuan.',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Selamat datang di SINEVERSE AI Headquarters"
        description="Pusat komando organisasi virtual SINEVERSE. Data live dari Supabase."
      />

      {!session ? (
        <div className="notice" role="alert">
          <strong>Login sebagai Founder untuk melihat data live.</strong>
          Dashboard menampilkan data HQ hanya setelah login.
        </div>
      ) : null}

      <div className="grid grid-4">
        {kpiCards.map((kpi) => (
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
              divisi. Backend Command Center sudah di-deploy — instruksi
              dijawab NARA dan tercatat sebagai tugas.
            </p>
            <p>
              <Link to="/command-center">Buka Command Center →</Link>
            </p>
          </section>

          <section className="card" aria-label="Jadwal hari ini">
            <h2>Jadwal Hari Ini</h2>
            <p>Jadwal kerja otomatis HQ (scheduler produksi).</p>
            {loaded && jobs.length > 0 ? (
              <ul className="list">
                {jobs.map((job) => (
                  <li className="list-row" key={job.id}>
                    <span className="list-row-main">
                      <strong>{job.name}</strong>
                      <small>
                        {job.lastRunAt
                          ? `Terakhir berjalan: ${formatWib(job.lastRunAt)}`
                          : 'Belum pernah berjalan'}
                      </small>
                    </span>
                    {job.enabled ? (
                      <span className="status-badge status-badge-ok">Aktif</span>
                    ) : (
                      <span className="status-badge">Nonaktif</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                {session
                  ? 'Belum ada job terjadwal.'
                  : 'Login untuk melihat jadwal.'}
              </p>
            )}
          </section>
        </div>
      </div>

      <section className="section" aria-label="Kinerja per divisi">
        <h2>Kinerja per Divisi</h2>
        <div className="card">
          {departments.length > 0 ? (
            <ul className="list">
              {departments.map((dept) => {
                const deptTasks = tasks.filter((t) => t.departmentId === dept.id)
                const open = deptTasks.filter(
                  (t) => t.status !== 'completed' && t.status !== 'cancelled',
                ).length
                const completed = deptTasks.filter((t) => t.status === 'completed').length
                const blocked = deptTasks.filter((t) => t.status === 'blocked').length
                const lead = dept.leadAgentId
                  ? agentNames.get(dept.leadAgentId) ?? '—'
                  : '—'
                return (
                  <li className="list-row" key={dept.id}>
                    <span className="list-row-main">
                      <strong>{dept.name}</strong>
                      <small>
                        Lead: {lead} · {open} terbuka · {completed} selesai ·{' '}
                        {blocked} tertunda
                      </small>
                    </span>
                    <span className="status-badge">{deptTasks.length} tugas</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p>
              {session
                ? 'Belum ada divisi tercatat.'
                : 'Login untuk melihat kinerja divisi.'}
            </p>
          )}
        </div>
      </section>

      <section className="section" aria-label="Aktivitas terbaru">
        <h2>Aktivitas Terbaru</h2>
        <div className="card">
          {logs.length > 0 ? (
            <ul className="list">
              {logs.map((log) => (
                <li className="list-row" key={log.id}>
                  <span className="list-row-main">
                    <strong>
                      {taskTitles.get(log.taskId) ?? 'Tugas'} — {log.eventType}
                    </strong>
                    <small>
                      {log.note || '—'} — {formatWib(log.createdAt)}
                    </small>
                  </span>
                  <span className="status-badge">{log.eventType}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {session
                ? 'Belum ada aktivitas tercatat.'
                : 'Login untuk melihat aktivitas.'}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
