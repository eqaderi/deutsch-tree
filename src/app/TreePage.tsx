import { Fragment, use } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { NodeSummary } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { isDone } from '../learning-engine/index.ts'
import { BackupSuggestion } from './BackupSuggestion.tsx'
import { loadIndex } from './content.ts'
import { KindLabel } from './KindLabel.tsx'
import { useProgress } from './progress.ts'

/**
 * The tree, in the "route" layout: a strip of levels, then the chosen level as
 * one vertical line. Topics are not grouped into chapters yet, so a level is a
 * single stop that lists all its topics.
 */
export function TreePage() {
  const { strings } = useLanguage()
  const { nodes } = use(loadIndex())
  const [search] = useSearchParams()

  const levels = [...new Set(nodes.map((node) => node.level))].sort()
  const requested = search.get('level')
  const level = levels.find((candidate) => candidate === requested) ?? levels[0]
  const inLevel = nodes.filter((node) => node.level === level)
  const levelName = level === undefined ? undefined : strings.levelNames[level]

  return (
    <main className="wrap">
      <title>{`${strings.treeTitle} · ${strings.appName}`}</title>
      <header className="intro">
        <h1>{strings.treeTitle}</h1>
        <p>{strings.treeIntro}</p>
      </header>

      <BackupSuggestion />

      <nav className="strip" aria-label={strings.levels}>
        <span className="strip-end">{strings.routeStart}</span>
        {levels.map((candidate) => (
          <Fragment key={candidate}>
            <span className="strip-line" aria-hidden="true" />
            <Link
              to={`/?level=${candidate}`}
              className="strip-level"
              aria-current={candidate === level ? 'true' : undefined}
            >
              <b>{candidate}</b>
              <small>{strings.topicCount(nodes.filter((node) => node.level === candidate).length)}</small>
            </Link>
          </Fragment>
        ))}
        <span className="strip-line" aria-hidden="true" />
        <span className="strip-end">{strings.routeExam}</span>
      </nav>

      {level !== undefined && (
        <>
          <h2 className="level-heading">
            {level}
            {levelName && ` · ${levelName}`} <span>· {strings.topicCount(inLevel.length)}</span>
          </h2>
          <div className="route">
            <div className="stop">
              <span className="stop-dot" aria-hidden="true" />
              <section className="panel">
                <ul className="rows">
                  {inLevel.map((node) => (
                    <li key={node.id}>
                      <NodeRow node={node} />
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  )
}

function NodeRow({ node }: { node: NodeSummary }) {
  const { language, strings } = useLanguage()
  const done = isDone(useProgress(), node.id)
  const text = (
    <span className="row-text">
      <span className="row-title">{node.title[language]}</span>
      <KindLabel kind={node.kind} />
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
