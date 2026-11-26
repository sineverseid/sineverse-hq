import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { APPROVAL_LEVELS } from '../types.ts'
import {
  decideApprovalRequest,
  listApprovalRequests,
  useSession,
  type DecideApprovalAction,
  type LiveApprovalRequest,
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

function levelLabel(level: string): string {
  if (level === 'level_1') return 'Level 1'
  if (level === 'level_2') return 'Level 2'
  if (level === 'level_3') return 'Level 3'
  return level
}

export default function Approvals() {
  const session = useSession()
  const [requests, setRequests] = useState<LiveApprovalRequest[]>([])
  const [loaded, setLoaded] = useState(false)
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleDecide(id: string, action: DecideApprovalAction) {
    setDecidingId(id)
    setNotice(null)
    const result = await decideApprovalRequest(id, action)
    setDecidingId(null)
    setNotice(result.message)
    if (result.ok) {
      const live = await listApprovalRequests()
      setRequests(live)
    }
  }

  useEffect(() => {
    if (!session) {
      setRequests([])
      setLoaded(false)
      return
    }
    listApprovalRequests().then((live) => {
      setRequests(live)
      setLoaded(true)
    })
  }, [session])

  return (
    <div>
      <PageHeader
        title="Approval Center"
        description="Seluruh permintaan persetujuan HQ. Tindakan agen diklasifikasikan ke tiga level persetujuan — hanya Level 2 yang membutuhkan keputusan Founder."
      />

      <div className="grid grid-3">
        {APPROVAL_LEVELS.map((level) => (
          <article className="card" key={level.level}>
            <h2>{level.title}</h2>
            <p>{level.description}</p>
          </article>
        ))}
      </div>

      <section className="section" aria-label="Antrean persetujuan">
        <h2>Antrean Persetujuan</h2>
        {notice ? (
          <p className="notice" role="status">
            {notice}
          </p>
        ) : null}
        <div className="card">
          {loaded && requests.length > 0 ? (
            <ul className="list">
              {requests.map((req) => (
                <li className="list-row" key={req.id}>
                  <span className="list-row-main">
                    <strong>
                      {req.actionName} — {levelLabel(req.level)}
                    </strong>
                    <small>
                      {req.reason || '—'} · {formatWib(req.createdAt)}
                    </small>
                  </span>
                  <span
                    className={`status-badge${
                      req.status === 'pending' ? ' status-badge-warn' : ''
                    }`}
                  >
                    {req.status}
                  </span>
                  {req.status === 'pending' ? (
                    <span className="list-row-actions">
                      <button
                        type="button"
                        className="button"
                        disabled={decidingId === req.id}
                        onClick={() => void handleDecide(req.id, 'approve')}
                      >
                        Setujui
                      </button>
                      <button
                        type="button"
                        className="button button-ghost"
                        disabled={decidingId === req.id}
                        onClick={() => void handleDecide(req.id, 'reject')}
                      >
                        Tolak
                      </button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Belum ada persetujuan menunggu"
              description={
                !session
                  ? 'Login sebagai Founder untuk melihat antrean persetujuan.'
                  : 'Tidak ada permintaan persetujuan yang menunggu keputusan Founder saat ini. Keputusan persetujuan membutuhkan login MFA.'
              }
            />
          )}
        </div>
      </section>
    </div>
  )
}
