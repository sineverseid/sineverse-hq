import PageHeader from '../components/PageHeader.tsx'
import {
  SEED_DRIVE_ARCHIVE,
  SEED_DRIVE_ENTRIES,
  SEED_DRIVE_ORGANIZATION,
  SEED_DRIVE_ROOT,
  driveFolderUrl,
  type SeedDriveFolder,
} from '../lib/seed.ts'

function FolderList({ folders }: { folders: SeedDriveFolder[] }) {
  return (
    <ul className="list">
      {folders.map((folder) => (
        <li className="list-row" key={folder.id}>
          <span className="list-row-main">
            <strong>
              <a
                href={driveFolderUrl(folder.id)}
                target="_blank"
                rel="noreferrer"
              >
                {folder.name}
              </a>
            </strong>
            <small>
              {folder.subfolders.length > 0
                ? `${folder.subfolders.length} subfolder: ${folder.subfolders.join(', ')}`
                : 'Belum ada subfolder.'}
            </small>
          </span>
          <span className="status-badge">
            {folder.subfolders.length} subfolder
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function DriveArchive() {
  return (
    <div>
      <PageHeader
        title="Google Drive Archive"
        description="Arsip dokumen HQ di Google Drive: folder SINEVERSE ORGANIZATION (18 folder) dan SINEVERSE MASTER ARCHIVE (17 folder), dengan tautan langsung ke Drive."
      />

      <section className="card" aria-label="Folder induk Drive">
        <h2>Folder Induk</h2>
        <p>
          Pusat dokumentasi HQ memakai folder Drive yang sudah ada sebelumnya
          — bukan folder baru.
        </p>
        <p>
          Struktur folder di bawah ini diverifikasi langsung via Drive API
          pada 25 Nov 2026 (18 folder ORGANIZATION + 17 folder MASTER
          ARCHIVE). Isi folder dapat berubah — buka tautan Drive untuk kondisi
          terbaru.
        </p>
        <p>
          <a href={SEED_DRIVE_ROOT.url} target="_blank" rel="noreferrer">
            {SEED_DRIVE_ROOT.name} — Buka di Google Drive →
          </a>
        </p>
      </section>

      <section className="section" aria-label="Dokumen terindeks">
        <h2>Dokumen Terindeks</h2>
        <div className="card">
          <ul className="list">
            {SEED_DRIVE_ENTRIES.map((entry) => (
              <li className="list-row" key={entry.fileName}>
                <span className="list-row-main">
                  <strong>{entry.fileName}</strong>
                  <small>
                    {entry.version} · {entry.division} · Pemilik:{' '}
                    {entry.owner} · {entry.fileDate} · Folder:{' '}
                    <a href={entry.folderUrl} target="_blank" rel="noreferrer">
                      {entry.folder}
                    </a>
                  </small>
                </span>
                <span className="status-badge status-badge-ok">
                  Terverifikasi
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-label="SINEVERSE ORGANIZATION">
        <h2>SINEVERSE ORGANIZATION — 18 Folder</h2>
        <div className="card">
          <p>
            <a
              href="https://drive.google.com/drive/folders/1QppIY9bcDDBdObnq32wfQoqeMqt7OtY3"
              target="_blank"
              rel="noreferrer"
            >
              Buka SINEVERSE ORGANIZATION di Google Drive →
            </a>
          </p>
          <FolderList folders={SEED_DRIVE_ORGANIZATION} />
        </div>
      </section>

      <section className="section" aria-label="SINEVERSE MASTER ARCHIVE">
        <h2>SINEVERSE MASTER ARCHIVE — 17 Folder</h2>
        <div className="card">
          <p>
            <a
              href="https://drive.google.com/drive/folders/1baOb-f5XO71UAgTUJ3Kb2xIjsujp4K1I"
              target="_blank"
              rel="noreferrer"
            >
              Buka SINEVERSE MASTER ARCHIVE di Google Drive →
            </a>
          </p>
          <FolderList folders={SEED_DRIVE_ARCHIVE} />
        </div>
      </section>
    </div>
  )
}
