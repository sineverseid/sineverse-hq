import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.tsx'
import {
  getGroqUsage,
  listAgents,
  listAuditLogs,
  listJobExecutions,
  listReports,
  listScheduledJobs,
  listTasks,
  useSession,
  type LiveAgent,
  type LiveAuditLog,
  type LiveGroqUsage,
  type LiveJobExecution,
  type LiveScheduledJob,
  type LiveTask,
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

export default function Monitoring() {
  const session = useSession()
  const [jobs, setJobs] = useState<LiveScheduledJob[]>([])
  const [executions, setExecutions] = useState<LiveJobExecution[]>([])
  const [usage, setUsage] = useState<LiveGroqUsage>({
    totalRequests: 0,
    totalTokens: 0,
  })
  const [audit, setAudit] = useState<LiveAuditLog[]>([])
  const [tasks, setTasks] = useState<LiveTask[]>([])
  const [agents, setAgents] = useState<LiveAgent[]>([])
  const [reportCount, setReportCount] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setJobs([])
      setExecutions([])
      setAudit([])
      setTasks([])
      setAgents([])
      setReportCount(0)
      setLoaded(false)
      return
    }
    Promise.all([
      listScheduledJobs(),
      listJobExecutions(),
      getGroqUsage(),
      listAuditLogs(),
      listTasks(),
      listAgents(),
      listReports(),
    ]).then(
      ([
        liveJobs,
        liveExecutions,
        liveUsage,
        liveAudit,
        liveTasks,
        liveAgents,
        liveReports,
      ]) => {
        setJobs(liveJobs)
        setExecutions(liveExecutions)
        setUsage(liveUsage)
        setAudit(liveAudit)
        setTasks(liveTasks)
        setAgents(liveAgents)
        setReportCount(liveReports.length)
        setLoaded(true)
      },
    )
  }, [session])

  const lastExecution = executions[0]

  return (
    <div>
      <PageHeader
        title="System Monitoring"
        description="Pemantauan kesehatan sistem HQ: status scheduler, pemakaian AI, dan log audit — semuanya data live dari Supabase."
      />

      {!session ? (
        <div className="notice" role="alert">
          <strong>Login sebagai Founder untuk melihat data monitoring live.</strong>
        </div>
      ) : null}

      <section className="card" aria-label="Kesehatan scheduler">
        <h2>Kesehatan Scheduler</h2>
        {loaded && jobs.length > 0 ? (
          <>
            <p>
              {jobs.filter((j) => j.lastRunAt !== null).length} dari{' '}
              {jobs.length} job sudah pernah berjalan.
              {lastExecution
                ? ` Eksekusi terakhir: ${lastExecution.jobName} (${lastExecution.status})${lastExecution.finishedAt ? `, ${formatWib(lastExecution.finishedAt)}` : ''}.`
                : ' Belum ada eksekusi.'}
            </p>
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
          </>
        ) : (
          <p>
            {session ? 'Belum ada job terjadwal.' : 'Login untuk melihat scheduler.'}
          </p>
        )}
      </section>

      <section className="card" aria-label="Pemakaian AI">
        <h2>Pemakaian AI</h2>
        <p>
          Groq openai/gpt-oss-120b: {usage.totalRequests} request ·{' '}
          {usage.totalTokens.toLocaleString('id-ID')} token · Rp0.
        </p>
      </section>

      <section className="card" aria-label="Ringkasan data">
        <h2>Ringkasan Data</h2>
        <p>
          {tasks.length} tugas · {agents.length} agen · {reportCount} laporan
          tersimpan.
        </p>
      </section>

      <section className="card" aria-label="Log audit">
        <h2>Log Audit</h2>
        {audit.length > 0 ? (
          <ul className="list">
            {audit.map((entry) => (
              <li className="list-row" key={entry.id}>
                <span className="list-row-main">
                  <strong>
                    {entry.action} — {entry.entity}
                  </strong>
                  <small>
                    {entry.actor} — {formatWib(entry.createdAt)}
                  </small>
                </span>
                <span className="status-badge">{entry.action}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {session
              ? 'Belum ada entri audit. Log terisi saat ada keputusan persetujuan atau panggilan platform.'
              : 'Login untuk melihat log audit.'}
          </p>
        )}
      </section>
    </div>
  )
}
