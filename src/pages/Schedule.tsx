import PageHeader from '../components/PageHeader.tsx'
import { DAILY_SCHEDULE, PERIODIC_SCHEDULE } from '../types.ts'

export default function Schedule() {
  return (
    <div>
      <PageHeader
        title="Work Schedule"
        description="Jadwal kerja otomatis HQ: pemeriksaan sistem, briefing, laporan harian, mingguan, dan bulanan."
      />

      <div className="notice" role="alert">
        <strong>Scheduler backend belum aktif.</strong>
        Jadwal di bawah ini adalah jadwal yang sudah disetujui, tetapi
        eksekusi otomatisnya belum berjalan karena scheduler backend belum
        aktif. Belum ada laporan yang dihasilkan otomatis.
      </div>

      <section className="card" aria-label="Jadwal harian">
        <h2>Jadwal Harian</h2>
        <ul className="list">
          {DAILY_SCHEDULE.map((slot) => (
            <li className="list-row" key={slot.time}>
              <span className="list-row-main">
                <strong>{slot.title}</strong>
                <small>{slot.description}</small>
              </span>
              <span className="list-time">{slot.time} WIB</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" aria-label="Jadwal berkala">
        <h2>Jadwal Berkala</h2>
        <ul className="list">
          {PERIODIC_SCHEDULE.map((slot) => (
            <li className="list-row" key={slot.time}>
              <span className="list-row-main">
                <strong>{slot.title}</strong>
                <small>{slot.description}</small>
              </span>
              <span className="list-time">{slot.time}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
