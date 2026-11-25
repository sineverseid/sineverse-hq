import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.tsx'
import {
  listAgents,
  listDepartments,
  listTasks,
  useSession,
  type LiveAgent,
  type LiveDepartment,
  type LiveTask,
} from '../lib/auth.ts'

export default function Departments() {
  const session = useSession()
  const [departments, setDepartments] = useState<LiveDepartment[]>([])
  const [agents, setAgents] = useState<LiveAgent[]>([])
  const [tasks, setTasks] = useState<LiveTask[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setDepartments([])
      setAgents([])
      setTasks([])
      setLoaded(false)
      return
    }
    Promise.all([listDepartments(), listAgents(), listTasks()]).then(
      ([liveDepartments, liveAgents, liveTasks]) => {
        setDepartments(liveDepartments)
        setAgents(liveAgents)
        setTasks(liveTasks)
        setLoaded(true)
      },
    )
  }, [session])

  const agentNames = new Map(agents.map((a) => [a.id, a.name]))

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Struktur 13 divisi SINEVERSE AI Headquarters. Setiap divisi memiliki Lead, ruang lingkup kerja, dan tugasnya masing-masing."
      />

      {!session ? (
        <div className="notice" role="alert">
          <strong>Login sebagai Founder untuk melihat data live divisi.</strong>
        </div>
      ) : null}

      <div className="grid grid-2">
        {departments.map((division) => {
          const deptTasks = tasks.filter((t) => t.departmentId === division.id)
          const open = deptTasks.filter(
            (t) => t.status !== 'completed' && t.status !== 'cancelled',
          ).length
          const completed = deptTasks.filter((t) => t.status === 'completed').length
          const blocked = deptTasks.filter((t) => t.status === 'blocked').length
          const lead = division.leadAgentId
            ? agentNames.get(division.leadAgentId) ?? '—'
            : '—'
          return (
            <article className="card" key={division.id}>
              <h2>
                {String(division.sortOrder).padStart(2, '0')}. {division.name}
              </h2>
              <p>{division.description}</p>
              <p>
                Lead: <strong>{lead}</strong>
              </p>
              <p>
                Tugas terbuka: {open} · Selesai: {completed} · Tertunda:{' '}
                {blocked}
              </p>
            </article>
          )
        })}
      </div>

      {loaded && departments.length === 0 ? (
        <p>Belum ada divisi tercatat.</p>
      ) : null}
    </div>
  )
}
