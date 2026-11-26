import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import {
  listKnowledgeBase,
  safe,
  useSession,
  type LiveKnowledgeDoc,
} from '../lib/auth.ts'

function formatWib(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function KnowledgeBase() {
  const session = useSession()
  const [docs, setDocs] = useState<LiveKnowledgeDoc[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setDocs([])
      setLoaded(false)
      return
    }
    safe(listKnowledgeBase(), []).then((live) => {
      setDocs(live)
      setLoaded(true)
    })
  }, [session])

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Basis pengetahuan HQ: master prompt, keputusan Founder, playbook divisi, dan dokumen referensi yang dipakai agen saat bekerja."
      />

      <div className="card">
        {!session ? (
          <p>Login sebagai Founder untuk melihat Knowledge Base.</p>
        ) : !loaded ? (
          <p>Memuat dokumen…</p>
        ) : docs.length === 0 ? (
          <EmptyState
            title="Belum ada dokumen"
            description="Belum ada dokumen yang diindeks ke Knowledge Base. Dokumen akan tampil di sini setelah diunggah dan diindeks."
          />
        ) : (
          <ul className="list">
            {docs.map((doc) => (
              <li className="list-row" key={doc.id}>
                <span className="list-row-main">
                  <strong>{doc.title}</strong>
                  <small>
                    {doc.content.slice(0, 220)}
                    {doc.content.length > 220 ? '…' : ''}
                    {' — '}
                    {formatWib(doc.createdAt)}
                  </small>
                </span>
                <span className="status-badge">{doc.category}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
