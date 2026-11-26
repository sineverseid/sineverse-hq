import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { TASK_STATUSES } from '../types.ts'
import {
  getGroqUsage,
  listAgents,
  listReports,
  listTaskLogs,
  listTasks,
  safe,
  useSession,
  type LiveAgent,
  type LiveGroqUsage,
  type LiveReport,
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

/** Kunci minggu (Senin, WIB) dari tanggal ISO — untuk pengelompokan mingguan. */
function weekKey(iso: string): string {
  const d = new Date(
    new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }),
  )
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

function weekLabel(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Reports() {
  const session = useSession()
  const [reports, setReports] = useState<LiveReport[]>([])
  const [usage, setUsage] = useState<LiveGroqUsage>({
    totalRequests: 0,
    totalTokens: 0,
    todayRequests: 0,
    todayTokens: 0,
  })
  const [tasks, setTasks] = useState<LiveTask[]>([])
  const [agents, setAgents] = useState<LiveAgent[]>([])
  const [logs, setLogs] = useState<LiveTaskLog[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setReports([])
      setUsage({
        totalRequests: 0,
        totalTokens: 0,
        todayRequests: 0,
        todayTokens: 0,
      })
      setTasks([])
      setAgents([])
      setLogs([])
      setLoaded(false)
      return
    }
    Promise.all([
      safe(listReports(), []),
      safe(getGroqUsage(), {
        totalRequests: 0,
        totalTokens: 0,
        todayRequests: 0,
        todayTokens: 0,
      }),
      safe(listTasks(), []),
      safe(listAgents(), []),
      safe(listTaskLogs(), []),
    ]).then(([liveReports, liveUsage, liveTasks, liveAgents, liveLogs]) => {
      setReports(liveReports)
      setUsage(liveUsage)
      setTasks(liveTasks)
      setAgents(liveAgents)
      setLogs(liveLogs)
      setLoaded(true)
    })
  }, [session])

  const agentNames = new Map(agents.map((a) => [a.id, a.name]))
  const perAgent = new Map<string, number>()
  for (const log of logs) {
    const key = log.agentId ? (agentNames.get(log.agentId) ?? log.agentId) : 'Sistem'
    perAgent.set(key, (perAgent.get(key) ?? 0) + 1)
  }
  const agentRanking = [...perAgent.entries()].sort((a, b) => b[1] - a[1])

  const perWeek = new Map<string, number>()
  for (const log of logs) {
    const key = weekKey(log.createdAt)
    perWeek.set(key, (perWeek.get(key) ?? 0) + 1)
  }
  const weeks = [...perWeek.keys()].sort().slice(-4)

  const loading = !!session && !loaded

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Laporan kinerja, kemajuan tugas, dan biaya AI. Semua angka di halaman ini berasal dari data nyata yang sudah terverifikasi."
      />

      <section className="card" aria-label="Laporan terbaru">
        <h2>Laporan Terbaru</h2>
        {!session ? (
          <EmptyState
            title="Login untuk melihat laporan"
            description="Laporan scheduler hanya tampil setelah login sebagai Founder."
          />
        ) : loading ? (
          <p>Memuat laporan…</p>
        ) : reports.length === 0 ? (
          <EmptyState
            title="Belum ada laporan"
            description="Scheduler belum menghasilkan laporan. Laporan pertama muncul setelah job terjadwal berjalan."
          />
        ) : (
          <ul className="list">
            {reports.map((report) => (
              <li className="list-row" key={report.id}>
                <span className="list-row-main">
                  <strong>{report.title}</strong>
                  <small>
                    {formatWib(report.createdAt)} — {report.summary.slice(0, 160)}
                    {report.summary.length > 160 ? '…' : ''}
                  </small>
                </span>
                <span className="status-badge status-badge-ok">
                  {report.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-2">
        <article className="card" aria-label="Kinerja agen">
          <h2>Kinerja Agen</h2>
          <p>
            Jumlah aktivitas tercatat per agen (dari log tugas HQ).
          </p>
          {loading ? (
            <p>Memuat…</p>
          ) : agentRanking.length === 0 ? (
            <EmptyState
              title="Data belum tersedia"
              description="Belum ada aktivitas agen yang tercatat di log tugas."
            />
          ) : (
            <ul className="list">
              {agentRanking.slice(0, 5).map(([name, count]) => (
                <li className="list-row" key={name}>
                  <span className="list-row-main">
                    <strong>{name}</strong>
                  </span>
                  <span className="status-badge">{count} aktivitas</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card" aria-label="Kemajuan tugas">
          <h2>Kemajuan Tugas</h2>
          <p>Distribusi tugas per status.</p>
          {loading ? (
            <p>Memuat…</p>
          ) : tasks.length === 0 ? (
            <EmptyState
              title="Data belum tersedia"
              description="Belum ada tugas yang tercatat di HQ."
            />
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
        </article>

        <article className="card" aria-label="Biaya AI">
          <h2>Biaya AI</h2>
          <p>Penggunaan dan biaya provider AI per periode.</p>
          {loading ? (
            <p>Memuat…</p>
          ) : usage.totalRequests === 0 ? (
            <p>Belum ada pemakaian Groq tercatat.</p>
          ) : (
            <>
              <p>
                Groq openai/gpt-oss-120b — Hari ini:{' '}
                {usage.todayRequests} request ·{' '}
                {usage.todayTokens.toLocaleString('id-ID')} token · Rp0.
              </p>
              <p>
                Total sejak awal: {usage.totalRequests} request ·{' '}
                {usage.totalTokens.toLocaleString('id-ID')} token · Rp0.
              </p>
            </>
          )}
        </article>

        <article className="card" aria-label="Aktivitas mingguan">
          <h2>Aktivitas Mingguan</h2>
          <p>Ringkasan aktivitas HQ per minggu (dari log tugas).</p>
          {loading ? (
            <p>Memuat…</p>
          ) : weeks.length === 0 ? (
            <EmptyState
              title="Data belum tersedia"
              description="Belum ada aktivitas yang tercatat di log tugas."
            />
          ) : (
            <ul className="list">
              {weeks.map((key) => (
                <li className="list-row" key={key}>
                  <span className="list-row-main">
                    <strong>Minggu {weekLabel(key)}</strong>
                  </span>
                  <span className="status-badge">
                    {perWeek.get(key) ?? 0} aktivitas
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  )
}
