import PageHeader from '../components/PageHeader.tsx'
import { SEED_DEPARTMENTS } from '../lib/seed.ts'

export default function Departments() {
  return (
    <div>
      <PageHeader
        title="Departments"
        description="Struktur 13 divisi SINEVERSE AI Headquarters. Setiap divisi memiliki Lead, ruang lingkup kerja, dan tugasnya masing-masing."
      />

      <div className="grid grid-2">
        {SEED_DEPARTMENTS.map((division) => (
          <article className="card" key={division.code}>
            <h2>
              {division.code}. {division.name}
            </h2>
            <p>{division.mandate}</p>
            <p>
              Lead: <strong>{division.leadName}</strong>
            </p>
            <p>Tugas terbuka: 0 · Selesai: 0 · Tertunda: 0</p>
          </article>
        ))}
      </div>
    </div>
  )
}
