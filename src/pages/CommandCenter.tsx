import EmptyState from '../components/EmptyState.tsx'
import PageHeader from '../components/PageHeader.tsx'

export default function CommandCenter() {
  return (
    <div>
      <PageHeader
        title="NARA Command Center"
        description="Kirim instruksi ke NARA, Executive Director AI Headquarters. Instruksi dieksekusi oleh agen divisi setelah backend aktif."
      />

      <div className="notice" role="alert">
        <strong>Backend Command Center belum di-deploy.</strong>
        Edge Function Command Center belum aktif, sehingga instruksi belum
        dapat dieksekusi. Kolom di bawah ini nonaktif sampai backend terhubung.
      </div>

      <section className="card" aria-label="Percakapan dengan NARA">
        <h2>Percakapan</h2>
        <p>
          Status NARA:{' '}
          <span className="status-badge status-badge-warn">
            Belum terhubung
          </span>
        </p>
        <div className="chat-box">
          <EmptyState
            title="Belum ada percakapan"
            description="Belum ada instruksi yang dikirim ke NARA. Percakapan akan tercatat di sini setelah backend Command Center aktif."
          />
        </div>
        <div className="chat-input-row">
          <input
            className="chat-input"
            type="text"
            placeholder="Tulis instruksi untuk NARA… (nonaktif — backend belum di-deploy)"
            disabled
            aria-label="Instruksi untuk NARA"
          />
          <button className="button" type="button" disabled>
            Kirim
          </button>
        </div>
      </section>
    </div>
  )
}
