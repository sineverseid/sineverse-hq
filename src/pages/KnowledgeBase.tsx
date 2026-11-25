import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'

export default function KnowledgeBase() {
  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Basis pengetahuan HQ: master prompt, keputusan Founder, playbook divisi, dan dokumen referensi yang dipakai agen saat bekerja."
      />

      <div className="card">
        <EmptyState
          title="Belum ada dokumen"
          description="Belum ada dokumen yang diindeks ke Knowledge Base. Dokumen akan tampil di sini setelah diunggah dan diindeks."
        />
      </div>
    </div>
  )
}
