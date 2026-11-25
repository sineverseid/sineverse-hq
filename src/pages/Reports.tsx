import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import {
  getGroqUsage,
  listReports,
  useSession,
  type LiveGroqUsage,
  type LiveReport,
} from '../lib/auth.ts'

const REPORT_CARDS = [
  {
    title: 'Kinerja Agen',
    description: 'Jumlah tugas, tingkat penyelesaian, dan waktu eksekusi per divisi.',
  },
  {
    title: 'Kemajuan Tugas',
    description: 'Distribusi tugas per status dan per divisi.',
  },
  {
    title: 'Biaya AI',
    description: 'Penggunaan dan biaya provider AI per periode.',
  },
  {
    title: 'Aktivitas Mingguan',
    description: 'Ringkasan aktivitas HQ per minggu.',
  },
]

function formatWib(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Reports() {
  const session = useSession()
  const [reports, setReports] = useState<LiveReport[]>([])
  const [usage, setUsage] = useState<LiveGroqUsage>({
    totalRequests: 0,
    totalTokens: 0,
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setReports([])
      setUsage({ totalRequests: 0, totalTokens: 0 })
      setLoaded(false)
      return
    }
    Promise.all([listReports(), getGroqUsage()]).then(
      ([liveReports, liveUsage]) => {
        setReports(liveReports)
        setUsage(liveUsage)
        setLoaded(true)
      },
    )
  }, [session])

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Laporan kinerja, kemajuan tugas, dan biaya AI. Semua angka di halaman ini berasal dari data nyata yang sudah terverifikasi."
      />

      <section className="card" aria-label="Laporan terbaru">
        <h2>Laporan Terbaru</h2>
        {!loaded || !session ? (
          <EmptyState
            title="Login untuk melihat laporan"
            description="Laporan scheduler hanya tampil setelah login sebagai Founder."
          />
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
        {REPORT_CARDS.map((report) =>
          report.title === 'Biaya AI' ? (
            <article className="card" key={report.title}>
              <h2>{report.title}</h2>
              <p>{report.description}</p>
              <p>
                {usage.totalRequests === 0
                  ? 'Belum ada pemakaian Groq tercatat.'
                  : `Groq openai/gpt-oss-120b: ${usage.totalRequests} request · ${usage.totalTokens.toLocaleString('id-ID')} token · Rp0.`}
              </p>
            </article>
          ) : (
            <article className="card" key={report.title}>
              <h2>{report.title}</h2>
              <p>{report.description}</p>
              <EmptyState
                title="Data belum tersedia"
                description="Belum ada data yang cukup untuk menampilkan laporan ini."
              />
            </article>
          ),
        )}
      </div>
    </div>
  )
}
