interface PageHeaderProps {
  title: string
  description?: string
}

/** Header halaman: judul + penjelasan singkat. */
export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  )
}
