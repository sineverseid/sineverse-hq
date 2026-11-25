import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import {
  checkCommandCenterBackend,
  listInstructions,
  sendInstruction,
  subscribeConversation,
  useSession,
  type BackendStatus,
  type ConversationEntry,
} from '../lib/auth.ts'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Bersihkan sisa Markdown dari balasan NARA supaya enak dibaca:
 * hapus ** dan awalan #, buang garis pemisah --- / |---|,
 * dan ubah baris tabel | a | b | menjadi "a — b".
 * Instruksi Founder tidak disentuh (tampil apa adanya).
 */
function stripMarkdown(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      let clean = line.replace(/\*\*/g, '').replace(/^#{1,6}\s*/, '')
      if (/^[\s|:-]+$/.test(clean)) return ''
      if (/^\|.*\|$/.test(clean)) {
        clean = clean
          .split('|')
          .map((cell) => cell.trim())
          .filter(Boolean)
          .join(' — ')
      }
      return clean
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function CommandCenter() {
  const session = useSession()
  const [backend, setBackend] = useState<BackendStatus>('loading')
  const [instruction, setInstruction] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<ConversationEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    checkCommandCenterBackend().then(setBackend)
  }, [])

  // Riwayat diambil dari database supaya tidak hilang saat pindah halaman,
  // dan diperbarui otomatis lewat Realtime saat ada instruksi atau balasan baru.
  useEffect(() => {
    if (!session) {
      setSent([])
      return
    }
    let mounted = true
    setHistoryLoading(true)
    const load = () =>
      listInstructions().then((rows) => {
        if (mounted) setSent(rows)
      })
    load().finally(() => {
      if (mounted) setHistoryLoading(false)
    })
    const unsubscribe = subscribeConversation(() => {
      void load()
    })
    return () => {
      mounted = false
      unsubscribe()
    }
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
          id: `local-fail-${Date.now()}`,
          kind: 'instruction' as const,
          text,
          sub: result.message,
          createdAt: new Date().toISOString(),
          ok: false,
        },
      ])
      return
    }
    // Muat ulang dari database supaya entri baru muncul sekali saja,
    // beserta balasan NARA bila ada.
    setSent(await listInstructions())
  }

  return (
    <div>
      <PageHeader
        title="NARA Command Center"
        description="Kirim instruksi ke NARA, Executive Director AI Headquarters. Instruksi dibuat menjadi rencana tugas dan dijawab oleh NARA."
      />

      {backend === 'loading' ? (
        <div className="notice" role="status">
          <strong>Memeriksa backend Command Center…</strong>
        </div>
      ) : backend === 'deployed' ? (
        <div className="notice notice-info" role="status">
          <strong>Backend Command Center terhubung.</strong>
          Edge Function Command Center aktif. Instruksi yang dikirim dibuat
          menjadi rencana tugas dan dijawab NARA.
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
              {sent.map((item) => (
                <li
                  className={`list-row${item.kind === 'reply' ? ' list-row-reply' : ''}`}
                  key={item.id}
                >
                  <span className="list-row-main">
                    {item.kind === 'reply' ? (
                      <span className="chat-reply-text">
                        {stripMarkdown(item.text)}
                      </span>
                    ) : (
                      <strong>{item.text}</strong>
                    )}
                    <small>
                      {formatTime(item.createdAt)} — {item.sub}
                    </small>
                  </span>
                  {item.kind === 'reply' ? (
                    <span className="status-badge status-badge-ok">NARA</span>
                  ) : item.ok === false ? (
                    <span className="status-badge status-badge-warn">
                      Gagal
                    </span>
                  ) : (
                    <span className="status-badge status-badge-ok">
                      Terkirim
                    </span>
                  )}
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
