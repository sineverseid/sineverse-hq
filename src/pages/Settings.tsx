import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MfaEnroll from '../components/MfaEnroll.tsx'
import PageHeader from '../components/PageHeader.tsx'
import {
  getMfaStatus,
  signOut,
  useSession,
  type MfaStatus,
} from '../lib/auth.ts'
import { isSupabaseConfigured } from '../lib/supabase.ts'

function mfaBadge(status: MfaStatus) {
  switch (status) {
    case 'active':
      return (
        <span className="status-badge status-badge-ok">Aktif</span>
      )
    case 'inactive':
      return (
        <span className="status-badge status-badge-warn">
          Belum dikonfirmasi
        </span>
      )
    case 'no-session':
      return (
        <span className="status-badge status-badge-warn">
          Belum dikonfirmasi
        </span>
      )
    case 'not-configured':
      return <span className="status-badge">Tidak dapat diperiksa</span>
    default:
      return <span className="status-badge">Memeriksa…</span>
  }
}

export default function Settings() {
  const session = useSession()
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>('loading')

  const refreshMfa = useCallback(() => {
    setMfaStatus('loading')
    getMfaStatus().then(setMfaStatus)
  }, [])

  useEffect(() => {
    refreshMfa()
  }, [refreshMfa, session])

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
          {session === undefined ? (
            <span className="status-badge">Memeriksa…</span>
          ) : session ? (
            <span className="status-badge status-badge-ok">
              Login sebagai {session.user.email}
            </span>
          ) : (
            <span className="status-badge">Belum login</span>
          )}
        </p>
        {session ? (
          <p>
            <button
              className="button"
              type="button"
              onClick={() => {
                void signOut()
              }}
            >
              Keluar
            </button>
          </p>
        ) : (
          <p>
            <Link to="/login">Masuk sebagai Founder</Link>
          </p>
        )}
      </section>

      <section className="card" aria-label="MFA TOTP">
        <h2>MFA TOTP</h2>
        <p>
          MFA TOTP wajib diaktifkan pada akun Founder. Enroll TOTP dilakukan
          dari akun Supabase Auth Founder sebelum HQ dipakai operasional.
        </p>
        <p>Status MFA: {mfaBadge(mfaStatus)}</p>
        <MfaEnroll status={mfaStatus} onVerified={refreshMfa} />
      </section>
    </div>
  )
}
