import PageHeader from '../components/PageHeader.tsx'
import { SEED_ACTIVITY } from '../lib/seed.ts'

export default function SecurityAudit() {
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
          <span className="status-badge status-badge-warn">
            Belum dikonfirmasi
          </span>
        </p>
      </section>

      <section className="section" aria-label="Log audit">
        <h2>Log Audit</h2>
        <div className="card">
          <ul className="list">
            {SEED_ACTIVITY.map((activity) => (
              <li className="list-row" key={activity.event}>
                <span className="list-row-main">
                  <strong>{activity.detail}</strong>
                  <small>
                    {activity.actor} — {activity.timeWib}
                  </small>
                </span>
                <span className="status-badge">{activity.event}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
