import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import {
  getGroqUsage,
  safe,
  useSession,
  type LiveGroqUsage,
} from '../lib/auth.ts'

export default function Providers() {
  const session = useSession()
  const [usage, setUsage] = useState<LiveGroqUsage>({
    totalRequests: 0,
    totalTokens: 0,
    todayRequests: 0,
    todayTokens: 0,
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setUsage({
        totalRequests: 0,
        totalTokens: 0,
        todayRequests: 0,
        todayTokens: 0,
      })
      setLoaded(false)
      return
    }
    safe(getGroqUsage(), {
      totalRequests: 0,
      totalTokens: 0,
      todayRequests: 0,
      todayTokens: 0,
    }).then((liveUsage) => {
      setUsage(liveUsage)
      setLoaded(true)
    })
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
        {!session ? (
          <p>
            Pemakaian tercatat di HQ baru: login sebagai Founder untuk
            melihat pemakaian.
          </p>
        ) : !loaded ? (
          <p>Pemakaian tercatat di HQ baru: Memuat…</p>
        ) : (
          <>
            <p>
              Pemakaian tercatat di HQ baru — Hari ini:{' '}
              {usage.todayRequests} request ·{' '}
              {usage.todayTokens.toLocaleString('id-ID')} token · Rp0.
            </p>
            <p>
              Total sejak awal: {usage.totalRequests} request ·{' '}
              {usage.totalTokens.toLocaleString('id-ID')} token · Rp0.
            </p>
          </>
        )}
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
