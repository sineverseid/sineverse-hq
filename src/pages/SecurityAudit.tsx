import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'

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
          <EmptyState
            title="Belum ada entri audit"
            description="Belum ada peristiwa audit yang tercatat. Setiap login, persetujuan, dan perubahan konfigurasi akan tercatat di sini."
          />
        </div>
      </section>
    </div>
  )
}
