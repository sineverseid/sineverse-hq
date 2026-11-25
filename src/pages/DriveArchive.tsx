import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'

export default function DriveArchive() {
  return (
    <div>
      <PageHeader
        title="Google Drive Archive"
        description="Arsip dokumen HQ di Google Drive: Master Archive, laporan, dan dokumen divisi. Sinkronisasi Drive belum aktif."
      />

      <div className="notice notice-info" role="note">
        <strong>Arsip Drive belum terhubung.</strong>
        Sinkronisasi Google Drive (Edge Function drive-sync) belum aktif,
        sehingga daftar folder dan dokumen belum dapat ditampilkan.
      </div>

      <div className="card">
        <EmptyState
          title="Belum ada dokumen terarsip"
          description="Dokumen dari Google Drive akan tampil di sini setelah sinkronisasi Drive aktif."
        />
      </div>
    </div>
  )
}
