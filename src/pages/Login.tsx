import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.tsx'
import { signIn, signOut, useSession } from '../lib/auth.ts'
import { isSupabaseConfigured } from '../lib/supabase.ts'

export default function Login() {
  const session = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    const result = await signIn(email.trim(), password)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    navigate('/')
  }

  async function handleSignOut() {
    await signOut()
  }

  return (
    <div>
      <PageHeader
        title="Login Founder"
        description="Masuk ke SINEVERSE AI Headquarters sebagai Founder. Sesi dipakai untuk mengirim instruksi, memutuskan persetujuan, dan mengaktifkan MFA."
      />

      {!isSupabaseConfigured ? (
        <div className="notice" role="alert">
          <strong>Supabase belum dikonfigurasi.</strong>
          Login belum bisa dipakai sebelum variabel environment Supabase terisi.
        </div>
      ) : null}

      {session === undefined ? (
        <section className="card" aria-label="Status login">
          <p>Memeriksa sesi…</p>
        </section>
      ) : session ? (
        <section className="card" aria-label="Sudah login">
          <h2>Sudah login</h2>
          <p>
            Login sebagai <strong>{session.user.email}</strong>.
          </p>
          <p>
            <button className="button" type="button" onClick={handleSignOut}>
              Keluar
            </button>
          </p>
        </section>
      ) : (
        <section className="card" aria-label="Form login">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label className="form-label" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className="form-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label className="form-label" htmlFor="login-password">
                Kata sandi
              </label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="button" type="submit" disabled={busy}>
              {busy ? 'Memeriksa…' : 'Masuk'}
            </button>
          </form>
        </section>
      )}

      <section className="card" aria-label="Akun Founder">
        <h2>Belum punya akun?</h2>
        <p>
          Tidak ada pendaftaran akun publik di situs ini. Akun Founder dibuat
          di dashboard Supabase (Authentication → Add user), lalu login di
          halaman ini.
        </p>
        <p>
          <Link to="/settings">Lihat status akun di Settings</Link>
        </p>
      </section>
    </div>
  )
}
