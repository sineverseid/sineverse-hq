import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'

export default function Providers() {
  return (
    <div>
      <PageHeader
        title="AI Provider Management"
        description="Provider AI eksternal yang dipakai HQ. Sesuai keputusan Founder, HQ berjalan gratis saja — tanpa provider berbayar dan tanpa trial yang auto-renew."
      />

      <section className="card" aria-label="Provider AI">
        <h2>Groq</h2>
        <p>Provider AI eksternal HQ (free tier).</p>
        <p>
          Status:{' '}
          <span className="status-badge status-badge-warn">
            Belum terhubung
          </span>
        </p>
        <p>
          Kunci API Groq dikelola di sisi server (Edge Function groq-proxy)
          dan tidak pernah disimpan di aplikasi ini. Belum ada pemakaian yang
          tercatat.
        </p>
      </section>

      <section className="section" aria-label="Provider lain">
        <h2>Provider Lain</h2>
        <div className="card">
          <EmptyState
            title="Belum ada provider lain"
            description="Tidak ada provider berbayar yang dipakai HQ. Provider baru hanya ditambahkan atas keputusan Founder."
          />
        </div>
      </section>
    </div>
  )
}
