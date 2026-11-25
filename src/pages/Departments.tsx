import PageHeader from '../components/PageHeader.tsx'
import { DIVISIONS } from '../types.ts'

export default function Departments() {
  return (
    <div>
      <PageHeader
        title="Departments"
        description="Struktur 13 divisi SINEVERSE AI Headquarters. Setiap divisi memiliki Lead, ruang lingkup kerja, dan tugasnya masing-masing."
      />

      <div className="grid grid-2">
        {DIVISIONS.map((division) => (
          <article className="card" key={division.id}>
            <h2>
              {division.id}. {division.name}
            </h2>
            <p>{division.description}</p>
            <p>
              Lead: <span className="status-badge">Belum terdaftar</span>
            </p>
            <p>
              Anggota: <span className="status-badge">Belum ada data</span>
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}
