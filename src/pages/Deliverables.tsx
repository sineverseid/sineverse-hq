import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'

export default function Deliverables() {
  return (
    <div>
      <PageHeader
        title="Deliverables"
        description="Hasil kerja yang diserahkan divisi: dokumen, laporan, desain, dan artefak lain yang sudah melewati persetujuan."
      />

      <div className="card">
        <EmptyState
          title="Belum ada deliverable"
          description="Belum ada hasil kerja yang diserahkan. Deliverable akan tampil di sini setelah tugas selesai dan disetujui."
        />
      </div>
    </div>
  )
}
