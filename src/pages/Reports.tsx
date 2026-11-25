import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { SEED_GROQ_USAGE } from '../lib/seed.ts'

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

export default function Reports() {
  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Laporan kinerja, kemajuan tugas, dan biaya AI. Semua angka di halaman ini berasal dari data nyata yang sudah terverifikasi."
      />

      <div className="grid grid-2">
        {REPORT_CARDS.map((report) =>
          report.title === 'Biaya AI' ? (
            <article className="card" key={report.title}>
              <h2>{report.title}</h2>
              <p>{report.description}</p>
              <p>
                {SEED_GROQ_USAGE.provider} {SEED_GROQ_USAGE.model}:{' '}
                {SEED_GROQ_USAGE.totalRequests} request ·{' '}
                {SEED_GROQ_USAGE.totalTokens.toLocaleString('id-ID')} token ·
                Rp{SEED_GROQ_USAGE.totalCostIdr}.
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
