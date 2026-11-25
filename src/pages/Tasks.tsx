import { useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { TASK_STATUSES, type TaskStatus } from '../types.ts'

export default function Tasks() {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>(
    'all',
  )

  const emptyDescription =
    selectedStatus === 'all'
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
        <EmptyState
          title="Belum ada tugas"
          description={emptyDescription}
        />
      </div>
    </div>
  )
}
