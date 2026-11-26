import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { TASK_STATUSES, type TaskStatus } from '../types.ts'
import {
  listDepartments,
  listTasks,
  safe,
  useSession,
  type LiveDepartment,
  type LiveTask,
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
  return (
    TASK_STATUSES.find((s) => s.value === status)?.label ?? status
  )
}

export default function Tasks() {
  const session = useSession()
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>(
    'all',
  )
  const [tasks, setTasks] = useState<LiveTask[]>([])
  const [departments, setDepartments] = useState<LiveDepartment[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) {
      setTasks([])
      setDepartments([])
      setLoaded(false)
      return
    }
    Promise.all([safe(listTasks(), []), safe(listDepartments(), [])]).then(
      ([liveTasks, liveDepartments]) => {
        setTasks(liveTasks)
        setDepartments(liveDepartments)
        setLoaded(true)
      },
    )
  }, [session])

  const deptNames = new Map(departments.map((d) => [d.id, d.name]))
  const visible =
    selectedStatus === 'all'
      ? tasks
      : tasks.filter((t) => t.status === selectedStatus)

  const emptyDescription = !session
    ? 'Login sebagai Founder untuk melihat tugas HQ.'
    : !loaded
      ? 'Memuat tugas…'
      : selectedStatus === 'all'
      ? 'Belum ada tugas yang tercatat di HQ.'
      : 'Belum ada tugas dengan status ini.'

  return (
    <div>
      <PageHeader
        title="Task Management"
        description="Seluruh tugas HQ di semua divisi. Filter berdasarkan status untuk melihat tugas pada tahap tertentu."
      />

      <div className="chip-row" role="group" aria-label="Filter status tugas">
        <button
          type="button"
          className={`chip${selectedStatus === 'all' ? ' chip-active' : ''}`}
          onClick={() => setSelectedStatus('all')}
        >
          Semua
        </button>
        {TASK_STATUSES.map((status) => (
          <button
            type="button"
            key={status.value}
            className={`chip${
              selectedStatus === status.value ? ' chip-active' : ''
            }`}
            onClick={() => setSelectedStatus(status.value)}
          >
            {status.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loaded && visible.length > 0 ? (
          <ul className="list">
            {visible.map((task) => (
              <li className="list-row" key={task.id}>
                <span className="list-row-main">
                  <strong>{task.title}</strong>
                  <small>
                    {task.departmentId
                      ? `${deptNames.get(task.departmentId) ?? 'Divisi'} · `
                      : ''}
                    Dibuat {formatWib(task.createdAt)}
                  </small>
                </span>
                <span
                  className={`status-badge${
                    task.status === 'completed'
                      ? ' status-badge-ok'
                      : task.status === 'blocked' ||
                          task.status === 'awaiting-approval'
                        ? ' status-badge-warn'
                        : ''
                  }`}
                >
                  {statusLabel(task.status)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Belum ada tugas"
            description={emptyDescription}
          />
        )}
      </div>
    </div>
  )
}
