import './feature-pages.css'

export default function FeaturePage({
  title,
  description,
  actions,
  children,
}) {
  return (
    <section className="feature-page">
      <header className="feature-page__header">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>

        {actions && (
          <div className="feature-page__actions">
            {actions}
          </div>
        )}
      </header>

      {children}
    </section>
  )
}