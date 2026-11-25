import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { SEED_GROQ_USAGE } from '../lib/seed.ts'

export default function Providers() {
  return (
    <div>
      <PageHeader
        title="AI Provider Management"
        description="Provider AI eksternal yang dipakai HQ. Sesuai keputusan Founder, HQ berjalan gratis saja — tanpa provider berbayar dan tanpa trial yang auto-renew."
      />

      <section className="card" aria-label="Provider AI">
        <h2>Groq</h2>
        <p>
          Provider AI eksternal HQ (free tier) — {SEED_GROQ_USAGE.model}.
        </p>
        <p>
          Status:{' '}
          <span className="status-badge status-badge-ok">Terverifikasi</span>
        </p>
        <p>
          Kunci API Groq dikelola di sisi server (Edge Function groq-proxy)
          dan tidak pernah disimpan di aplikasi ini.
        </p>
        <p>
          Pemakaian tercatat: {SEED_GROQ_USAGE.totalRequests} request ·{' '}
          {SEED_GROQ_USAGE.totalTokens.toLocaleString('id-ID')} token · Rp
          {SEED_GROQ_USAGE.totalCostIdr}.
        </p>
        <ul className="list">
          {SEED_GROQ_USAGE.records.map((record) => (
            <li className="list-row" key={record.note.slice(0, 32)}>
              <span className="list-row-main">
                <strong>
                  {record.requests} req ·{' '}
                  {record.tokens.toLocaleString('id-ID')} token
                </strong>
                <small>{record.note}</small>
              </span>
              <span className="list-time">{record.recordedOn}</span>
            </li>
          ))}
        </ul>
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
