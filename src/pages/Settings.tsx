import { isSupabaseConfigured } from '../lib/supabase.ts'
import PageHeader from '../components/PageHeader.tsx'

export default function Settings() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Pengaturan SINEVERSE AI Headquarters: koneksi Supabase, autentikasi, dan keamanan akun."
      />

      <section className="card" aria-label="Koneksi Supabase">
        <h2>Koneksi Supabase</h2>
        <p>
          Proyek Supabase HQ terpisah dari proyek platform SINEVERSE. Isi
          variabel environment di file <code>.env.local</code> (lihat{' '}
          <code>.env.example</code>). Kredensial tidak pernah ditulis di kode
          sumber.
        </p>
        <p>
          Status:{' '}
          {isSupabaseConfigured ? (
            <span className="status-badge status-badge-ok">
              Terkonfigurasi
            </span>
          ) : (
            <span className="status-badge status-badge-warn">
              Belum dikonfigurasi
            </span>
          )}
        </p>
        {!isSupabaseConfigured ? (
          <p>
            Variabel <code>VITE_SUPABASE_URL</code> dan{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> belum terisi.
          </p>
        ) : null}
      </section>

      <section className="card" aria-label="Autentikasi">
        <h2>Autentikasi</h2>
        <p>
          Akses HQ hanya untuk Founder. Tidak ada pendaftaran akun publik dan
          tidak ada akun tamu.
        </p>
        <p>
          Status login:{' '}
          <span className="status-badge">Belum login</span>
        </p>
      </section>

      <section className="card" aria-label="MFA TOTP">
        <h2>MFA TOTP</h2>
        <p>
          MFA TOTP wajib diaktifkan pada akun Founder. Enroll TOTP dilakukan
          dari akun Supabase Auth Founder sebelum HQ dipakai operasional.
        </p>
        <p>
          Status MFA:{' '}
          <span className="status-badge status-badge-warn">
            Belum dikonfirmasi
          </span>
        </p>
      </section>
    </div>
  )
}
