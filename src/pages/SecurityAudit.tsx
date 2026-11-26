import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.tsx'
import {
  getMfaStatus,
  listAuditLogs,
  safe,
  useSession,
  type LiveAuditLog,
  type MfaStatus,
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

export default function SecurityAudit() {
  const session = useSession()
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>('loading')
  const [audit, setAudit] = useState<LiveAuditLog[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    safe(getMfaStatus(), 'loading').then(setMfaStatus)
  }, [])

  useEffect(() => {
    if (!session) {
      setAudit([])
      setLoaded(false)
      return
    }
    safe(listAuditLogs(), []).then((live) => {
      setAudit(live)
      setLoaded(true)
    })
  }, [session])

  return (
    <div>
      <PageHeader
        title="Security & Audit"
        description="Log audit seluruh aktivitas sensitif HQ: login, perubahan persetujuan, akses data, dan perubahan konfigurasi keamanan."
      />

      <section className="card" aria-label="Keamanan akun">
        <h2>Keamanan Akun</h2>
        <p>
          Akses HQ hanya untuk Founder. MFA TOTP wajib diaktifkan pada akun
          Founder sebelum HQ dipakai operasional.
        </p>
        <p>
          Status MFA:{' '}
          {mfaStatus === 'active' ? (
            <span className="status-badge status-badge-ok">Aktif</span>
          ) : mfaStatus === 'loading' ? (
            <span className="status-badge">Memeriksa…</span>
          ) : (
            <span className="status-badge status-badge-warn">
              Belum dikonfirmasi
            </span>
          )}
        </p>
      </section>

      <section className="section" aria-label="Log audit">
        <h2>Log Audit</h2>
        <div className="card">
          {loaded && audit.length > 0 ? (
            <ul className="list">
              {audit.map((entry) => (
                <li className="list-row" key={entry.id}>
                  <span className="list-row-main">
                    <strong>
                      {entry.action} — {entry.entity}
                    </strong>
                    <small>
                      {entry.actor} — {formatWib(entry.createdAt)}
                    </small>
                  </span>
                  <span className="status-badge">{entry.action}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {!session
                ? 'Login sebagai Founder untuk melihat log audit.'
                : 'Belum ada entri audit. Log terisi saat ada keputusan persetujuan atau panggilan platform.'}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
