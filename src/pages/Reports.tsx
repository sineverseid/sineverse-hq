import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'

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
        description="Laporan kinerja, kemajuan tugas, dan biaya AI. Semua angka di halaman ini berasal dari data nyata setelah backend aktif."
      />

      <div className="grid grid-2">
        {REPORT_CARDS.map((report) => (
          <article className="card" key={report.title}>
            <h2>{report.title}</h2>
            <p>{report.description}</p>
            <EmptyState
              title="Data belum tersedia"
              description="Belum ada data yang cukup untuk menampilkan laporan ini."
            />
          </article>
        ))}
      </div>
    </div>
  )
}
