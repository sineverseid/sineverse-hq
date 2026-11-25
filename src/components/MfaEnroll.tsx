import { useState } from 'react'
import { enrollTotp, useSession, verifyTotp, type MfaStatus } from '../lib/auth.ts'

interface MfaEnrollProps {
  status: MfaStatus
  onVerified: () => void
}

/**
 * Enroll TOTP untuk akun Founder yang sedang login.
 * Alur: enroll → tampilkan QR + secret → verifikasi kode 6 digit.
 * QR code dari Supabase adalah string SVG — dirender apa adanya.
 */
export default function MfaEnroll({ status, onVerified }: MfaEnrollProps) {
  const session = useSession()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'loading' || session === undefined) {
    return <p>Memeriksa status MFA…</p>
  }

  if (!session) {
    return (
      <p>
        Login sebagai Founder untuk mengaktifkan MFA. Setelah login, status MFA
        di halaman ini akan diperbarui.
      </p>
    )
  }

  if (status === 'active') {
    return (
      <p>
        <span className="status-badge status-badge-ok">Aktif</span> MFA TOTP
        sudah aktif pada akun ini.
      </p>
    )
  }

  async function handleEnroll() {
    setError(null)
    setBusy(true)
    const result = await enrollTotp()
    setBusy(false)
    if (result.error || !result.enroll) {
      setError(result.error ?? 'Enroll TOTP gagal.')
      return
    }
    setFactorId(result.enroll.factorId)
    setQrCode(result.enroll.qrCode)
    setSecret(result.enroll.secret)
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!factorId) return
    setError(null)
    setBusy(true)
    const result = await verifyTotp(factorId, code.trim())
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setFactorId(null)
    setQrCode(null)
    setSecret(null)
    setCode('')
    onVerified()
  }

  if (!factorId || !qrCode || !secret) {
    return (
      <div>
        <p>
          MFA TOTP belum aktif pada akun ini. Enroll memakai aplikasi
          authenticator (mis. Google Authenticator).
        </p>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="button" type="button" onClick={handleEnroll} disabled={busy}>
          {busy ? 'Menyiapkan…' : 'Aktifkan MFA TOTP'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <p>
        Pindai kode QR di bawah ini dengan aplikasi authenticator, lalu
        masukkan kode 6 digit yang muncul di aplikasi.
      </p>
      <div
        className="qr-box"
        // QR code adalah SVG yang dikembalikan Supabase Auth untuk factor ini.
        dangerouslySetInnerHTML={{ __html: qrCode }}
      />
      <p>
        Kode rahasia (bila tidak bisa memindai):{' '}
        <code className="mono">{secret}</code>
      </p>
      <form onSubmit={handleVerify}>
        <div className="form-row">
          <label className="form-label" htmlFor="mfa-code">
            Kode 6 digit dari aplikasi authenticator
          </label>
          <input
            id="mfa-code"
            className="form-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </div>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="button" type="submit" disabled={busy}>
          {busy ? 'Memverifikasi…' : 'Verifikasi dan aktifkan'}
        </button>
      </form>
    </div>
  )
}
