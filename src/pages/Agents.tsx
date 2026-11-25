import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.tsx'
import {
  listAgents,
  useSession,
  type LiveAgent,
} from '../lib/auth.ts'

function statusLabel(status: string): string {
  if (status === 'active') return 'Aktif'
  if (status === 'idle') return 'Siaga'
  if (status === 'working') return 'Bekerja'
  if (status === 'waiting_approval') return 'Menunggu Persetujuan'
  if (status === 'blocked') return 'Tertunda'
  if (status === 'offline') return 'Offline'
  if (status === 'error') return 'Error'
  return status
}

export default function Agents() {
  const session = useSession()
  const [agents, setAgents] = useState<LiveAgent[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setAgents([])
      setLoaded(false)
      return
    }
    listAgents().then((liveAgents) => {
      setAgents(liveAgents)
      setLoaded(true)
    })
  }, [session])

  return (
    <div>
      <PageHeader
        title="AI Agent Management"
        description="NARA dan 13 Division Lead HQ — peran AI sesuai registry organisasi yang disahkan Founder 25 Nov 2026."
      />

      {!session ? (
        <div className="notice" role="alert">
          <strong>Login sebagai Founder untuk melihat daftar agen live.</strong>
        </div>
      ) : (
        <div className="notice notice-info" role="note">
          <strong>Data live dari database HQ.</strong>
          {loaded
            ? ` ${agents.length} agen terdaftar (NARA + 13 Lead) beserta peran, model, dan statusnya.`
            : ' Memuat…'}
        </div>
      )}

      <div className="grid grid-2">
        {agents.map((agent) => (
          <article className="card" key={agent.id}>
            <h2>{agent.name}</h2>
            <p>{agent.role}</p>
            <p>{agent.jobDescription}</p>
            <p>Divisi: {agent.division}</p>
            <p>Model: {agent.model}</p>
            <p>
              Status:{' '}
              <span
                className={`status-badge${
                  agent.status === 'active' ? ' status-badge-ok' : ''
                }`}
              >
                {statusLabel(agent.status)}
              </span>
            </p>
          </article>
        ))}
      </div>

      {loaded && agents.length === 0 ? (
        <p>Belum ada agen terdaftar.</p>
      ) : null}
    </div>
  )
}
