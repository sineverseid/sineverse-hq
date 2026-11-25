import PageHeader from '../components/PageHeader.tsx'
import { SEED_AGENTS, SEED_AGENT_LABEL } from '../lib/seed.ts'

export default function Agents() {
  return (
    <div>
      <PageHeader
        title="AI Agent Management"
        description="NARA dan 13 Division Lead HQ — peran AI sesuai registry organisasi yang disahkan Founder 25 Nov 2026."
      />

      <div className="notice notice-info" role="note">
        <strong>Data awal HQ terverifikasi.</strong>
        Daftar di bawah ini adalah 14 agen terdaftar (NARA + 13 Lead) beserta
        peran, model, dan statusnya. Eksekusi agen berjalan setelah backend
        aktif.
      </div>

      <div className="grid grid-2">
        {SEED_AGENTS.map((agent) => (
          <article className="card" key={agent.code}>
            <h2>{agent.name}</h2>
            <p>{agent.role}</p>
            <p>{agent.jobDesc}</p>
            <p>Divisi: {agent.departmentName}</p>
            <p>Model: {agent.model}</p>
            <p>Keahlian: {agent.skills}</p>
            <p>
              Status:{' '}
              <span
                className={`status-badge${
                  agent.status === 'active' ? ' status-badge-ok' : ''
                }`}
              >
                {SEED_AGENT_LABEL[agent.status]}
              </span>{' '}
              · Tugas terbuka: {agent.openTasks}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}
