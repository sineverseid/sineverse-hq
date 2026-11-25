import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'

const MONITOR_CARDS = [
  {
    title: 'Status Layanan',
    description: 'Kesehatan Supabase, Edge Functions, dan GitHub Pages.',
  },
  {
    title: 'Uptime',
    description: 'Ketersediaan layanan HQ per periode.',
  },
  {
    title: 'Pemakaian AI',
    description: 'Jumlah request dan token provider AI.',
  },
  {
    title: 'Log Sistem',
    description: 'Peristiwa sistem terbaru: error, peringatan, dan info.',
  },
]

export default function Monitoring() {
  return (
    <div>
      <PageHeader
        title="System Monitoring"
        description="Pemantauan kesehatan sistem HQ secara real-time. Monitoring aktif setelah backend dan scheduler terhubung."
      />

      <div className="grid grid-2">
        {MONITOR_CARDS.map((card) => (
          <article className="card" key={card.title}>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <EmptyState
              title="Data belum tersedia"
              description="Belum ada data monitoring yang tercatat."
            />
          </article>
        ))}
      </div>
    </div>
  )
}
