import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import {
  getGroqUsage,
  useSession,
  type LiveGroqUsage,
} from '../lib/auth.ts'

export default function Providers() {
  const session = useSession()
  const [usage, setUsage] = useState<LiveGroqUsage>({
    totalRequests: 0,
    totalTokens: 0,
  })

  useEffect(() => {
    if (!session) return
    getGroqUsage().then(setUsage)
  }, [session])

  return (
    <div>
      <PageHeader
        title="AI Provider Management"
        description="Provider AI eksternal yang dipakai HQ. Sesuai keputusan Founder, HQ berjalan gratis saja — tanpa provider berbayar dan tanpa trial yang auto-renew."
      />

      <section className="card" aria-label="Provider AI">
        <h2>Groq</h2>
        <p>Provider AI eksternal HQ (free tier) — openai/gpt-oss-120b.</p>
        <p>
          Status:{' '}
          <span className="status-badge status-badge-ok">Terverifikasi</span>
        </p>
        <p>
          Kunci API Groq dikelola di sisi server (Edge Function groq-proxy)
          dan tidak pernah disimpan di aplikasi ini.
        </p>
        <p>
          Pemakaian tercatat di HQ baru:{' '}
          {usage.totalRequests} request ·{' '}
          {usage.totalTokens.toLocaleString('id-ID')} token · Rp0.
        </p>
        <p>
          Pemakaian dihitung sejak HQ baru aktif 26 Nov 2026. Sebagai
          riwayat, HQ lama (Telegram) memakai 16 request · 10.609 token · Rp0
          (audit §21, 25 Nov 2026).
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
