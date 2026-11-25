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
  reply?: string | null
}

/**
 * Kirim instruksi ke Edge Function command-center.
 * Mengembalikan pesan jujur dari backend (atau error-nya), tanpa mengarang.
 */
/**
 * Satu baris percakapan Command Center: instruksi Founder (tugas di tabel
 * tasks) atau balasan NARA (baris agent_reply di tabel task_logs).
 * Dipakai Command Center supaya percakapan tidak hilang saat pindah halaman.
 */
export interface ConversationEntry {
  id: string
  kind: 'instruction' | 'reply'
  text: string
  sub: string
  createdAt: string
  ok?: boolean
}

export async function listInstructions(): Promise<ConversationEntry[]> {
  if (!supabase) return []
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  if (tasksError || !tasks || tasks.length === 0) return []
  const taskIds = tasks.map((row) => String(row.id))
  const { data: replies } = await supabase
    .from('task_logs')
    .select('id, task_id, note, created_at')
    .eq('event_type', 'agent_reply')
    .in('task_id', taskIds)
    .order('created_at', { ascending: true })
  const entries: ConversationEntry[] = tasks.map((row) => ({
    id: `task-${String(row.id)}`,
    kind: 'instruction' as const,
    text: String(row.title),
    sub: `Rencana dibuat (${String(row.status)}).`,
    createdAt: String(row.created_at),
    ok: true,
  }))
  for (const row of replies ?? []) {
    entries.push({
      id: `reply-${String(row.id)}`,
      kind: 'reply' as const,
      text: String(row.note ?? ''),
      sub: 'Balasan NARA',
      createdAt: String(row.created_at),
      ok: true,
    })
  }
  // Urutan kronologis supaya instruksi lalu balasannya terbaca berurutan.
  entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return entries
}

/**
 * Langganan Realtime untuk percakapan: setiap tugas atau log baru
 * (instruksi dari tab lain, balasan NARA) memanggil onChange supaya
 * halaman memuat ulang riwayat tanpa refresh.
 */
export function subscribeConversation(onChange: () => void): () => void {  const client = supabase
  if (!client) return () => {}
  const channel = client
    .channel('command-center-replies')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'tasks' },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'task_logs' },
      () => onChange(),
    )
    .subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}

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
  let body: { plan?: { title: string; status: string }; message?: string; reply?: string | null; error?: string } = {}
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
    reply: body.reply ?? null,
  }
}

/**
 * Bacaan live untuk halaman Reports & Schedule (Founder saja, via RLS).
 * Mengembalikan array kosong bila belum login atau belum ada data.
 */
export interface LiveReport {
  id: string
  reportType: string
  title: string
  summary: string
  status: string
  createdAt: string
}

export async function listReports(): Promise<LiveReport[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('reports')
    .select('id, report_type, title, summary, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error || !data) return []
  return data.map((row) => ({
    id: String(row.id),
    reportType: String(row.report_type),
    title: String(row.title),
    summary: String(row.summary ?? ''),
    status: String(row.status),
    createdAt: String(row.created_at),
  }))
}

export interface LiveScheduledJob {
  id: string
  name: string
  jobType: string
  cronExpression: string
  enabled: boolean
  lastRunAt: string | null
}

export async function listScheduledJobs(): Promise<LiveScheduledJob[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('scheduled_jobs')
    .select('id, name, job_type, cron_expression, enabled, last_run_at')
    .order('cron_expression')
  if (error || !data) return []
  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    jobType: String(row.job_type),
    cronExpression: String(row.cron_expression),
    enabled: Boolean(row.enabled),
    lastRunAt: row.last_run_at ? String(row.last_run_at) : null,
  }))
}

export interface LiveJobExecution {
  id: string
  jobName: string
  status: string
  outputSummary: string | null
  errorMessage: string | null
  finishedAt: string | null
}

export async function listJobExecutions(): Promise<LiveJobExecution[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('job_execution_logs')
    .select('id, scheduled_job_id, status, output_summary, error_message, finished_at')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error || !data) return []
  const jobIds = [...new Set(data.map((row) => String(row.scheduled_job_id)))]
  const { data: jobs } = await supabase
    .from('scheduled_jobs')
    .select('id, name')
    .in('id', jobIds)
  const names = new Map((jobs ?? []).map((j) => [String(j.id), String(j.name)]))
  return data.map((row) => ({
    id: String(row.id),
    jobName: names.get(String(row.scheduled_job_id)) ?? 'Job',
    status: String(row.status),
    outputSummary: row.output_summary ? String(row.output_summary) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
  }))
}

export interface LiveGroqUsage {
  totalRequests: number
  totalTokens: number
}

export async function getGroqUsage(): Promise<LiveGroqUsage> {
  if (!supabase) return { totalRequests: 0, totalTokens: 0 }
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('prompt_tokens, completion_tokens')
    .eq('provider', 'groq')
  if (error || !data) return { totalRequests: 0, totalTokens: 0 }
  return {
    totalRequests: data.length,
    totalTokens: data.reduce(
      (sum, row) =>
        sum + Number(row.prompt_tokens ?? 0) + Number(row.completion_tokens ?? 0),
      0,
    ),
  }
}

/**
 * Bacaan live untuk Dashboard, Tasks, Approvals, Agents, Departments
 * (Founder saja, via RLS). Array kosong bila belum login atau belum ada data.
 * Status tugas di DB memakai snake_case; dipetakan ke kebab-case frontend.
 */
export interface LiveTask {
  id: string
  title: string
  status: string
  departmentId: string | null
  createdAt: string
  completedAt: string | null
}

const DB_TASK_STATUS: Record<string, string> = {
  in_progress: 'in-progress',
  in_review: 'in-review',
  awaiting_approval: 'awaiting-approval',
}

export async function listTasks(): Promise<LiveTask[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, department_id, created_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error || !data) return []
  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    status: DB_TASK_STATUS[String(row.status)] ?? String(row.status),
    departmentId: row.department_id ? String(row.department_id) : null,
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  }))
}

export interface LiveApprovalRequest {
  id: string
  actionName: string
  level: string
  reason: string
  status: string
  createdAt: string
}

export async function listApprovalRequests(): Promise<LiveApprovalRequest[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('approval_requests')
    .select('id, action_name, level, reason, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  return data.map((row) => ({
    id: String(row.id),
    actionName: String(row.action_name),
    level: String(row.level),
    reason: String(row.reason ?? ''),
    status: String(row.status),
    createdAt: String(row.created_at),
  }))
}

export interface LiveAgent {
  id: string
  name: string
  division: string
  role: string
  status: string
  model: string
  departmentId: string | null
}

export async function listAgents(): Promise<LiveAgent[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('ai_agents')
    .select('id, name, division, role, status, model, department_id')
    .order('created_at')
  if (error || !data) return []
  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    division: String(row.division),
    role: String(row.role),
    status: String(row.status),
    model: String(row.model),
    departmentId: row.department_id ? String(row.department_id) : null,
  }))
}

export interface LiveDepartment {
  id: string
  name: string
  slug: string
  leadAgentId: string | null
  sortOrder: number
}

export async function listDepartments(): Promise<LiveDepartment[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, slug, lead_agent_id, sort_order')
    .order('sort_order')
  if (error || !data) return []
  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    leadAgentId: row.lead_agent_id ? String(row.lead_agent_id) : null,
    sortOrder: Number(row.sort_order ?? 0),
  }))
}

export interface LiveTaskLog {
  id: string
  taskId: string
  eventType: string
  note: string
  createdAt: string
}

export async function listTaskLogs(): Promise<LiveTaskLog[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('task_logs')
    .select('id, task_id, event_type, note, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error || !data) return []
  return data.map((row) => ({
    id: String(row.id),
    taskId: String(row.task_id),
    eventType: String(row.event_type),
    note: String(row.note ?? ''),
    createdAt: String(row.created_at),
  }))
}
