import PageHeader from '../components/PageHeader.tsx'
import { DIVISIONS } from '../types.ts'

export default function Agents() {
  return (
    <div>
      <PageHeader
        title="AI Agent Management"
        description="HQ memiliki 13 divisi sebagai peran organisasi. Setiap divisi dijalankan oleh satu Lead. Belum ada executor agen yang terhubung, sehingga belum ada agen yang dapat ditampilkan sebagai aktif."
      />

      <div className="notice notice-info" role="note">
        <strong>Belum ada agen yang terdaftar.</strong>
        Daftar di bawah ini adalah struktur 13 divisi sesuai blueprint —
        bukan agen yang sedang berjalan. Status setiap divisi adalah
        &ldquo;Belum terdaftar&rdquo; sampai executor terhubung.
      </div>

      <div className="grid grid-2">
        {DIVISIONS.map((division) => (
          <article className="card" key={division.id}>
            <h2>
              Divisi {division.id} — {division.name}
            </h2>
            <p>{division.description}</p>
            <p>
              Status:{' '}
              <span className="status-badge">Belum terdaftar</span>
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}
