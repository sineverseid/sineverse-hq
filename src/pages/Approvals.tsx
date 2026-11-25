import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { APPROVAL_LEVELS } from '../types.ts'

export default function Approvals() {
  return (
    <div>
      <PageHeader
        title="Approval Center"
        description="Seluruh permintaan persetujuan HQ. Tindakan agen diklasifikasikan ke tiga level persetujuan — hanya Level 2 yang membutuhkan keputusan Founder."
      />

      <div className="grid grid-3">
        {APPROVAL_LEVELS.map((level) => (
          <article className="card" key={level.level}>
            <h2>{level.title}</h2>
            <p>{level.description}</p>
          </article>
        ))}
      </div>

      <section className="section" aria-label="Antrean persetujuan">
        <h2>Antrean Persetujuan</h2>
        <div className="card">
          <EmptyState
            title="Belum ada persetujuan menunggu"
            description="Tidak ada permintaan persetujuan yang menunggu keputusan Founder saat ini."
          />
        </div>
      </section>
    </div>
  )
}
