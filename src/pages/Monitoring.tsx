import PageHeader from '../components/PageHeader.tsx'
import {
  SEED_ACTIVITY,
  SEED_GROQ_USAGE,
  SEED_INTEGRATIONS,
  SEED_INTEGRATION_LABEL,
} from '../lib/seed.ts'

export default function Monitoring() {
  return (
    <div>
      <PageHeader
        title="System Monitoring"
        description="Pemantauan kesehatan sistem HQ: status integrasi, pemakaian AI, dan log audit."
      />

      <section className="card" aria-label="Status integrasi">
        <h2>Status Integrasi</h2>
        <ul className="list">
          {SEED_INTEGRATIONS.map((integration) => (
            <li className="list-row" key={integration.name}>
              <span className="list-row-main">
                <strong>{integration.name}</strong>
                <small>
                  {integration.kind} — {integration.detail}
                </small>
              </span>
              <span
                className={`status-badge${
                  integration.status === 'verified' ||
                  integration.status === 'connected'
                    ? ' status-badge-ok'
                    : ''
                }`}
              >
                {SEED_INTEGRATION_LABEL[integration.status]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" aria-label="Pemakaian AI">
        <h2>Pemakaian AI</h2>
        <p>
          {SEED_GROQ_USAGE.provider} {SEED_GROQ_USAGE.model}:{' '}
          {SEED_GROQ_USAGE.totalRequests} request ·{' '}
          {SEED_GROQ_USAGE.totalTokens.toLocaleString('id-ID')} token · Rp
          {SEED_GROQ_USAGE.totalCostIdr}.
        </p>
      </section>

      <section className="card" aria-label="Log audit">
        <h2>Log Audit</h2>
        <ul className="list">
          {SEED_ACTIVITY.map((activity) => (
            <li className="list-row" key={activity.event}>
              <span className="list-row-main">
                <strong>{activity.detail}</strong>
                <small>
                  {activity.actor} — {activity.timeWib}
                </small>
              </span>
              <span className="status-badge">{activity.event}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
