import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase.ts'

/**
 * Sesi Supabase saat ini.
 * undefined = belum dicek; null = tidak ada sesi (belum login).
 */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      return
    }
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        if (mounted) setSession(next)
      },
    )
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return session
}

/** Pesan error login yang bisa dibaca manusia, tanpa membocorkan detail. */
function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'Email atau kata sandi salah, atau akun belum dibuat.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Email akun belum dikonfirmasi. Konfirmasi dulu di dashboard Supabase.'
  }
  return 'Login gagal. Coba lagi.'
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase belum dikonfigurasi.' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return { error: error ? friendlyAuthError(error.message) : null }
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut()
}

export type MfaStatus = 'loading' | 'not-configured' | 'no-session' | 'inactive' | 'active'

/**
 * Status MFA TOTP akun yang sedang login.
 * 'no-session' = belum login, sehingga status tidak bisa diperiksa.
 */
export async function getMfaStatus(): Promise<MfaStatus> {
  if (!supabase || !isSupabaseConfigured) return 'not-configured'
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return 'no-session'
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) return 'inactive'
  const verified = data.totp.some((factor) => factor.status === 'verified')
  return verified ? 'active' : 'inactive'
}

export interface TotpEnroll {
  factorId: string
  qrCode: string
  secret: string
}

export async function enrollTotp(): Promise<{
  enroll: TotpEnroll | null
  error: string | null
}> {
  if (!supabase) return { enroll: null, error: 'Supabase belum dikonfigurasi.' }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  })
  if (error || !data) {
    return { enroll: null, error: 'Enroll TOTP gagal. Coba lagi.' }
  }
  return {
    enroll: {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    },
    error: null,
  }
}

export async function verifyTotp(
  factorId: string,
  code: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase belum dikonfigurasi.' }
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId })
  if (challengeError || !challenge) {
    return { error: 'Tantangan MFA gagal dibuat. Coba lagi.' }
  }
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })
  if (error) return { error: 'Kode salah atau sudah kedaluwarsa. Coba lagi.' }
  return { error: null }
}

/**
 * Level autentikasi sesi saat ini (aal1 = kata sandi saja,
 * aal2 = kata sandi + TOTP). Null bila tidak bisa diperiksa.
 */
export async function getAssuranceLevel(): Promise<{
  current: string | null
  next: string | null
} | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error || !data) return null
  return { current: data.currentLevel, next: data.nextLevel }
}

/**
 * Verifikasi kode TOTP saat login (sesi aal1 → aal2).
 * Memakai faktor TOTP terverifikasi pada akun yang sedang login.
 */
export async function verifyLoginTotp(
  code: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase belum dikonfigurasi.' }
  const { data: factors, error: factorsError } =
    await supabase.auth.mfa.listFactors()
  if (factorsError || !factors) {
    return { error: 'Tidak dapat memeriksa faktor MFA.' }
  }
  const factor = factors.totp.find((f) => f.status === 'verified')
  if (!factor) return { error: 'Tidak ada faktor TOTP terverifikasi.' }
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: factor.id })
  if (challengeError || !challenge) {
    return { error: 'Tantangan MFA gagal dibuat. Coba lagi.' }
  }
  const { error } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  })
  if (error) return { error: 'Kode salah atau sudah kedaluwarsa. Coba lagi.' }
  return { error: null }
}

export type BackendStatus = 'loading' | 'not-configured' | 'deployed' | 'not-deployed'

/**
 * Apakah Edge Function command-center sudah di-deploy.
 * Probe OPTIONS: function yang sudah di-deploy menjawab 2xx (CORS);
 * yang belum di-deploy dijawab gateway dengan 404 atau gagal sama sekali.
 */
export async function checkCommandCenterBackend(): Promise<BackendStatus> {
  if (!isSupabaseConfigured || !supabase) return 'not-configured'
  const url = import.meta.env.VITE_SUPABASE_URL as string
  try {
    const res = await fetch(`${url}/functions/v1/command-center`, {
      method: 'OPTIONS',
    })
    return res.ok ? 'deployed' : 'not-deployed'
  } catch {
    return 'not-deployed'
  }
}

export interface InstructionResult {
  ok: boolean
  message: string
}

/**
 * Kirim instruksi ke Edge Function command-center.
 * Mengembalikan pesan jujur dari backend (atau error-nya), tanpa mengarang.
 */
export async function sendInstruction(
  instruction: string,
): Promise<InstructionResult> {
  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, message: 'Supabase belum dikonfigurasi.' }
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return { ok: false, message: 'Login sebagai Founder untuk mengirim instruksi.' }
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  let res: Response
  try {
    res = await fetch(`${url}/functions/v1/command-center`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ instruction }),
    })
  } catch {
    return { ok: false, message: 'Backend tidak dapat dihubungi.' }
  }
  let body: { plan?: { title: string; status: string }; message?: string; error?: string } = {}
  try {
    body = (await res.json()) as typeof body
  } catch {
    // Respons bukan JSON — pakai status HTTP saja.
  }
  if (!res.ok) {
    return {
      ok: false,
      message: body.error ?? `Backend menolak instruksi (HTTP ${res.status}).`,
    }
  }
  const plan = body.plan
    ? `Rencana dibuat: ${body.plan.title} (${body.plan.status}).`
    : 'Rencana dibuat.'
  return {
    ok: true,
    message: `${plan} ${body.message ?? ''}`.trim(),
  }
}
