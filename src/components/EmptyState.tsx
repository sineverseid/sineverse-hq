interface EmptyStateProps {
  title: string
  description?: string
}

/**
 * Empty state bersama — dipakai setiap daftar, grafik, kartu KPI,
 * dan feed yang belum memiliki data. Tidak pernah menampilkan angka
 * atau baris contoh sebagai data nyata.
 */
export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">
        —
      </div>
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-text">{description}</p> : null}
    </div>
  )
}
