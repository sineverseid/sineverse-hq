import PageHeader from '../components/PageHeader.tsx'
import { SEED_DRIVE_ENTRIES } from '../lib/seed.ts'

export default function DriveArchive() {
  return (
    <div>
      <PageHeader
        title="Google Drive Archive"
        description="Arsip dokumen HQ di Google Drive: Master Archive, laporan, dan dokumen divisi."
      />

      <div className="notice notice-info" role="note">
        <strong>Entri terverifikasi dari Master Drive Index.</strong>
        Sinkronisasi otomatis (Edge Function drive-sync) belum aktif — entri
        di bawah ini adalah indeks yang sudah terverifikasi.
      </div>

      <div className="card">
        <ul className="list">
          {SEED_DRIVE_ENTRIES.map((entry) => (
            <li className="list-row" key={entry.fileName}>
              <span className="list-row-main">
                <strong>{entry.fileName}</strong>
                <small>
                  {entry.version} · {entry.folder} · {entry.division} ·
                  Pemilik: {entry.owner} · {entry.fileDate}
                </small>
              </span>
              <span className="status-badge status-badge-ok">
                Terverifikasi
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
