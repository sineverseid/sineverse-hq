import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.tsx'
import { DAILY_SCHEDULE, PERIODIC_SCHEDULE } from '../types.ts'
import {
  listJobExecutions,
  listScheduledJobs,
  useSession,
  type LiveJobExecution,
  type LiveScheduledJob,
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

/** cron_expression di DB memakai jam WIB: "45 7 * * *" -> "07:45 WIB". */
function formatCron(cron: string): string {
  const parts = cron.split(' ')
  if (parts.length < 5) return cron
  const [minute, hour, dayOfMonth, , dayOfWeek] = parts
  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')} WIB`
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  if (dayOfWeek !== '*') {
    const dow = days[Number(dayOfWeek)] ?? dayOfWeek
    return `${dow} ${time}`
  }
  if (dayOfMonth !== '*') {
    return `Tanggal ${dayOfMonth}, ${time}`
  }
  return time
}

export default function Schedule() {
  const session = useSession()
  const [jobs, setJobs] = useState<LiveScheduledJob[]>([])
  const [executions, setExecutions] = useState<LiveJobExecution[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setJobs([])
      setExecutions([])
      setLoaded(false)
      return
    }
    Promise.all([listScheduledJobs(), listJobExecutions()]).then(
      ([liveJobs, liveExecutions]) => {
        setJobs(liveJobs)
        setExecutions(liveExecutions)
        setLoaded(true)
      },
    )
  }, [session])

  const live = loaded && jobs.length > 0
  const ranJobs = jobs.filter((job) => job.lastRunAt !== null)
  const lastRun = executions[0]

  return (
    <div>
      <PageHeader
        title="Work Schedule"
        description="Jadwal kerja otomatis HQ: pemeriksaan sistem, briefing, laporan harian, mingguan, dan bulanan."
      />

      {live ? (
        <div className="notice notice-info" role="status">
          <strong>Scheduler backend aktif.</strong>
          {ranJobs.length > 0
            ? ` ${ranJobs.length} dari ${jobs.length} job sudah pernah berjalan; eksekusi terakhir: ${lastRun ? `${lastRun.jobName} (${lastRun.status})` : '—'}.`
            : ` ${jobs.length} job terjadwal via pg_cron; belum ada eksekusi.`}
        </div>
      ) : (
        <div className="notice" role="alert">
          <strong>Scheduler backend belum aktif.</strong>
          Jadwal di bawah ini adalah jadwal yang sudah disetujui, tetapi
          eksekusi otomatisnya belum berjalan karena scheduler backend belum
          aktif. Belum ada laporan yang dihasilkan otomatis.
        </div>
      )}

      {live ? (
        <section className="card" aria-label="Jadwal terjadwal">
          <h2>Jadwal Terjadwal</h2>
          <ul className="list">
            {jobs.map((job) => (
              <li className="list-row" key={job.id}>
                <span className="list-row-main">
                  <strong>{job.name}</strong>
                  <small>
                    {job.enabled ? 'Aktif' : 'Nonaktif'}
                    {job.lastRunAt
                      ? ` · Terakhir jalan: ${formatWib(job.lastRunAt)}`
                      : ' · Belum pernah jalan'}
                  </small>
                </span>
                <span className="list-time">{formatCron(job.cronExpression)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <section className="card" aria-label="Jadwal harian">
            <h2>Jadwal Harian</h2>
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

          <section className="card" aria-label="Jadwal berkala">
            <h2>Jadwal Berkala</h2>
            <ul className="list">
              {PERIODIC_SCHEDULE.map((slot) => (
                <li className="list-row" key={slot.time}>
                  <span className="list-row-main">
                    <strong>{slot.title}</strong>
                    <small>{slot.description}</small>
                  </span>
                  <span className="list-time">{slot.time}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {live && executions.length > 0 ? (
        <section className="card" aria-label="Eksekusi terakhir">
          <h2>Eksekusi Terakhir</h2>
          <ul className="list">
            {executions.map((run) => (
              <li className="list-row" key={run.id}>
                <span className="list-row-main">
                  <strong>{run.jobName}</strong>
                  <small>
                    {run.finishedAt ? formatWib(run.finishedAt) : '—'}
                    {' — '}
                    {run.status === 'succeeded'
                      ? run.outputSummary ?? 'Selesai.'
                      : run.errorMessage ?? 'Gagal.'}
                  </small>
                </span>
                <span
                  className={`status-badge${run.status === 'succeeded' ? ' status-badge-ok' : ' status-badge-warn'}`}
                >
                  {run.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
