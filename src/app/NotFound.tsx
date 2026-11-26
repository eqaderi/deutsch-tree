import { Link } from 'react-router'
import { useLanguage } from '../language/index.tsx'

export function NotFound() {
  const { strings } = useLanguage()
  return (
    <main className="wrap">
      <title>{`${strings.notFoundTitle} · ${strings.appName}`}</title>
      <BackToTree />
      <header className="page-head">
        <h1>{strings.notFoundTitle}</h1>
      </header>
      <section className="panel message">
        <p>{strings.notFoundText}</p>
      </section>
    </main>
  )
}

export function BackToTree() {
  const { strings } = useLanguage()
  return (
    <Link to="/" className="back">
      <span className="flip" aria-hidden="true">
        ←
      </span>
      {strings.allTopics}
    </Link>
  )
}
