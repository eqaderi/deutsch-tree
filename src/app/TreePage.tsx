import { Fragment, use } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { ChapterSummary, NodeSummary } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { isDone } from '../learning-engine/index.ts'
import { BackupSuggestion } from './BackupSuggestion.tsx'
import { loadIndex } from './content.ts'
import { ExamStop } from './ExamStop.tsx'
import { RichText } from './German.tsx'
import { KindLabel } from './KindLabel.tsx'
import { useProgress } from './progress.ts'

/**
 * The tree, in the "route" layout: a strip of levels, then the chosen level as
 * one vertical line with a stop for each chapter. A stop opens to list the
 * chapter's topics.
 */
export function TreePage() {
  const { strings } = useLanguage()
  const { chapters, nodes } = use(loadIndex())
  const [search] = useSearchParams()

  const levels = [...new Set(nodes.map((node) => node.level))].sort()
  const requested = search.get('level')
  const level = levels.find((candidate) => candidate === requested) ?? levels[0]
  const inLevel = nodes.filter((node) => node.level === level)
  const stops = chapters
    .filter((chapter) => chapter.level === level)
    .map((chapter) => ({ chapter, topics: inLevel.filter((node) => node.chapter === chapter.id) }))
    .filter((stop) => stop.topics.length > 0)
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
        <Link to="/readiness" className="strip-end">
          {strings.routeExam}
        </Link>
      </nav>

      {level !== undefined && (
        <>
          <h2 className="level-heading">
            {level}
            {levelName && ` · ${levelName}`} <span>· {strings.topicCount(inLevel.length)}</span>
          </h2>
          <div className="route">
            {stops.map(({ chapter, topics }, index) => (
              <ChapterStop key={chapter.id} chapter={chapter} topics={topics} place={index + 1} />
            ))}
            {/* The last level ends with the exam and the readiness rule. */}
            {level === levels.at(-1) && <ExamStop />}
          </div>
        </>
      )}
    </main>
  )
}

/**
 * Which chapters the learner opened or closed, until the page is reloaded.
 * Coming back from a topic, the tree is as they left it.
 */
const openChoices = new Map<string, boolean>()

/** One chapter: its name, kind and number of topics, and behind them its topics. */
function ChapterStop({ chapter, topics, place }: { chapter: ChapterSummary; topics: NodeSummary[]; place: number }) {
  const { language, strings } = useLanguage()
  // Until the learner chooses, the first chapter of the level is the open one.
  const open = openChoices.get(chapter.id) ?? place === 1
  return (
    <div className="stop">
      <span className="stop-dot" aria-hidden="true">
        {strings.number(place)}
      </span>
      <details
        className="panel"
        open={open}
        onToggle={(event) => openChoices.set(chapter.id, event.currentTarget.open)}
      >
        <summary className="stop-head">
          <span className="stop-text">
            <h3 className="stop-name">
              <RichText parts={chapter.title[language]} />
            </h3>
            <span className="stop-meta">
              <KindLabel kind={chapter.kind} />
              <span>{strings.topicCount(topics.length)}</span>
            </span>
          </span>
          <span className="stop-sign" aria-hidden="true" />
        </summary>
        <ul className="rows">
          {topics.map((node) => (
            <li key={node.id}>
              <NodeRow node={node} />
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

/** One topic. Its kind is not repeated here: the chapter above it says it. */
function NodeRow({ node }: { node: NodeSummary }) {
  const { language, strings } = useLanguage()
  const done = isDone(useProgress(), node.id)
  const text = (
    <span className="row-text">
      <span className="row-title">
        <RichText parts={node.title[language]} />
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
