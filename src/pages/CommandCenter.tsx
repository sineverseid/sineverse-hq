import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import {
  checkCommandCenterBackend,
  listInstructions,
  sendInstruction,
  useSession,
  type BackendStatus,
} from '../lib/auth.ts'

interface SentInstruction {
  instruction: string
  result: string
  ok: boolean
  time: string
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CommandCenter() {
  const session = useSession()
  const [backend, setBackend] = useState<BackendStatus>('loading')
  const [instruction, setInstruction] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<SentInstruction[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    checkCommandCenterBackend().then(setBackend)
  }, [])

  // Riwayat diambil dari database supaya tidak hilang saat pindah halaman.
  useEffect(() => {
    if (!session) {
      setSent([])
      return
    }
    setHistoryLoading(true)
    listInstructions()
      .then((rows) =>
        setSent(
          rows.map((row) => ({
            instruction: row.instruction,
            result: `Rencana dibuat (${row.status}).`,
            ok: true,
            time: formatTime(row.createdAt),
          })),
        ),
      )
      .finally(() => setHistoryLoading(false))
  }, [session])

  const backendReady = backend === 'deployed'
  const loggedIn = Boolean(session)
  const inputEnabled = backendReady && loggedIn && !sending

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = instruction.trim()
    if (!text || !inputEnabled) return
    setSending(true)
    const result = await sendInstruction(text)
    setSending(false)
    setInstruction('')
    if (!result.ok) {
      setSent((previous) => [
        ...previous,
        {
          instruction: text,
          result: result.message,
          ok: false,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      return
    }
    // Muat ulang dari database supaya entri baru muncul sekali saja.
    const rows = await listInstructions()
    setSent(
      rows.map((row) => ({
        instruction: row.instruction,
        result: `Rencana dibuat (${row.status}).`,
        ok: true,
        time: formatTime(row.createdAt),
      })),
    )
  }

  return (
    <div>
      <PageHeader
        title="NARA Command Center"
        description="Kirim instruksi ke NARA, Executive Director AI Headquarters. Instruksi dieksekusi oleh agen divisi setelah backend aktif."
      />

      {backend === 'loading' ? (
        <div className="notice" role="status">
          <strong>Memeriksa backend Command Center…</strong>
        </div>
      ) : backend === 'deployed' ? (
        <div className="notice notice-info" role="status">
          <strong>Backend Command Center terhubung.</strong>
          Edge Function Command Center aktif. Instruksi yang dikirim dibuat
          menjadi rencana tugas; eksekusi agen belum terkoneksi.
        </div>
      ) : (
        <div className="notice" role="alert">
          <strong>Backend Command Center belum di-deploy.</strong>
          Edge Function Command Center belum aktif, sehingga instruksi belum
          dapat dieksekusi. Kolom di bawah ini nonaktif sampai backend terhubung.
        </div>
      )}

      <section className="card" aria-label="Percakapan dengan NARA">
        <h2>Percakapan</h2>
        <p>
          Status NARA:{' '}
          {backend === 'loading' ? (
            <span className="status-badge">Memeriksa…</span>
          ) : backendReady ? (
            <span className="status-badge status-badge-ok">Terhubung</span>
          ) : (
            <span className="status-badge status-badge-warn">
              Belum terhubung
            </span>
          )}
        </p>
        <div className="chat-box">
          {historyLoading ? (
            <EmptyState
              title="Memuat percakapan…"
              description="Mengambil riwayat instruksi dari database."
            />
          ) : sent.length === 0 ? (
            <EmptyState
              title="Belum ada percakapan"
              description="Belum ada instruksi yang dikirim ke NARA. Instruksi yang dikirim akan tercatat di sini."
            />
          ) : (
            <ul className="list">
              {sent.map((item, index) => (
                <li className="list-row" key={`${item.time}-${index}`}>
                  <span className="list-row-main">
                    <strong>{item.instruction}</strong>
                    <small>
                      {item.time} — {item.result}
                    </small>
                  </span>
                  <span
                    className={`status-badge${item.ok ? ' status-badge-ok' : ' status-badge-warn'}`}
                  >
                    {item.ok ? 'Terkirim' : 'Gagal'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="chat-input-row">
            <input
              className="chat-input"
              type="text"
              placeholder={
                !backendReady
                  ? 'Tulis instruksi untuk NARA… (nonaktif — backend belum di-deploy)'
                  : !loggedIn
                    ? 'Login sebagai Founder untuk mengirim instruksi…'
                    : 'Tulis instruksi untuk NARA…'
              }
              disabled={!inputEnabled}
              aria-label="Instruksi untuk NARA"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
            />
            <button className="button" type="submit" disabled={!inputEnabled}>
              {sending ? 'Mengirim…' : 'Kirim'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
