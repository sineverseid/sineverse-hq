import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import {
  listDeliverables,
  safe,
  useSession,
  type LiveDeliverable,
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

function statusLabel(status: string): string {
  if (status === 'draft') return 'Draf'
  if (status === 'in_review') return 'Dalam Review'
  if (status === 'approved') return 'Disetujui'
  if (status === 'published') return 'Terbit'
  if (status === 'archived') return 'Diarsipkan'
  return status
}

export default function Deliverables() {
  const session = useSession()
  const [items, setItems] = useState<LiveDeliverable[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setItems([])
      setLoaded(false)
      return
    }
    safe(listDeliverables(), []).then((live) => {
      setItems(live)
      setLoaded(true)
    })
  }, [session])

  return (
    <div>
      <PageHeader
        title="Deliverables"
        description="Hasil kerja yang diserahkan divisi: dokumen, laporan, desain, dan artefak lain. Setiap baris terhubung ke tugas dan file Drive-nya."
      />

      <div className="card">
        {!session ? (
          <p>Login sebagai Founder untuk melihat deliverable.</p>
        ) : !loaded ? (
          <p>Memuat deliverable…</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="Belum ada deliverable"
            description="Belum ada hasil kerja yang diserahkan. Deliverable akan tampil di sini setelah tugas selesai dan disetujui."
          />
        ) : (
          <ul className="list">
            {items.map((item) => (
              <li className="list-row" key={item.id}>
                <span className="list-row-main">
                  <strong>{item.title}</strong>
                  <small>
                    {item.description
                      ? `${item.description.slice(0, 140)}${item.description.length > 140 ? '…' : ''} · `
                      : ''}
                    v{item.version} · {formatWib(item.createdAt)}
                    {item.driveLink ? (
                      <>
                        {' · '}
                        <a
                          href={item.driveLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Buka di Drive →
                        </a>
                      </>
                    ) : null}
                  </small>
                </span>
                <span
                  className={`status-badge${
                    item.status === 'approved' || item.status === 'published'
                      ? ' status-badge-ok'
                      : ''
                  }`}
                >
                  {statusLabel(item.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
