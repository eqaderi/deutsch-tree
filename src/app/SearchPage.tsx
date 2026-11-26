import { Suspense, use, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useLanguage } from '../language/index.tsx'
import { isDone } from '../learning-engine/index.ts'
import { prepareSearch, type SearchResult } from '../search/index.ts'
import { loadIndex, loadSearchData } from './content.ts'
import { RichText } from './German.tsx'
import { KindLabel } from './KindLabel.tsx'
import { BackToTree } from './NotFound.tsx'
import { useProgress } from './progress.ts'

/**
 * Search across all topics. The words typed are kept in the address
 * (`#/search?q=…`), so coming back from a topic shows the same results.
 */
export function SearchPage() {
  const { strings } = useLanguage()
  const [params, setParams] = useSearchParams()
  // The box answers at once, and the address follows it.
  const [query, setQuery] = useState(params.get('q') ?? '')
  useEffect(() => {
    if ((params.get('q') ?? '') !== query) setParams(query === '' ? {} : { q: query }, { replace: true })
  }, [query, params, setParams])

  return (
    <main className="wrap">
      <title>{`${strings.searchTitle} · ${strings.appName}`}</title>
      <BackToTree />
      <header className="page-head">
        <h1>
          <label htmlFor="search-box">{strings.searchTitle}</label>
        </h1>
      </header>
      {/* biome-ignore lint/a11y/useSemanticElements: <search> is not known to every browser a learner may have */}
      <form role="search" className="search-form" onSubmit={(event) => event.preventDefault()}>
        <input
          id="search-box"
          className="search-box"
          type="search"
          // Persian is typed right to left and German left to right, on either page.
          dir="auto"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          // biome-ignore lint/a11y/noAutofocus: the learner opened this page to type in this box
          autoFocus
        />
        <p className="search-hint">{strings.searchHint}</p>
      </form>
      {/* The box is there at once; only the results wait for the search data. */}
      <Suspense fallback={<p className="secondary">{strings.loading}</p>}>
        <Results query={query} />
      </Suspense>
    </main>
  )
}

function Results({ query }: { query: string }) {
  const { language, strings } = useLanguage()
  const { nodes } = use(loadIndex())
  const data = use(loadSearchData(language))
  const search = useMemo(() => prepareSearch(nodes, data, language), [nodes, data, language])
  const results = useMemo(() => search(query), [search, query])

  if (query.trim() === '') return null
  return (
    <>
      <p className="search-count" role="status">
        {results.length === 0 ? strings.searchNothing : strings.searchResults(results.length)}
      </p>
      {results.length > 0 && (
        <section className="panel">
          <ul className="rows">
            {results.map((result) => (
              <li key={result.node.id}>
                <ResultRow result={result} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/** One topic found: its title, the passage the words were found in, its level and kind, and its state. */
function ResultRow({ result: { node, passage } }: { result: SearchResult }) {
  const { language, strings } = useLanguage()
  const done = isDone(useProgress(), node.id)
  const text = (
    <span className="row-text">
      <span className="row-title">
        <RichText parts={node.title[language]} />
      </span>
      {passage && (
        <span className="result-passage">
          <RichText parts={passage} />
        </span>
      )}
      <span className="result-meta">
        <span className="tag">{node.level}</span>
        <KindLabel kind={node.kind} />
      </span>
    </span>
  )

  if (node.status === 'coming-soon') {
    return (
      <div className="row row-soon">
        <span className="mark mark-coming-soon" aria-hidden="true" />
        {text}
        <span className="row-state">{strings.comingSoon}</span>
      </div>
    )
  }
  return (
    <Link to={`/node/${node.id}`} className="row">
      <span className={done ? 'mark mark-done' : 'mark'} aria-hidden="true" />
      {text}
      <span className="pill">{done ? strings.done : strings.start}</span>
    </Link>
  )
}
