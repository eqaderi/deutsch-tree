import { Fragment, use, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { type ChapterSummary, NODE_KINDS, type NodeKind, type NodeSummary } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { countNodes, hasProgress, nextRecommended, nodeState, passMark, youAreHere } from '../learning-engine/index.ts'
import { BackupSuggestion } from './BackupSuggestion.tsx'
import { CheckpointStop } from './CheckpointPage.tsx'
import { loadIndex } from './content.ts'
import { ExamStop } from './ExamStop.tsx'
import { useFirstSteps } from './firstVisit.ts'
import { RichText } from './German.tsx'
import { KindLabel } from './KindLabel.tsx'
import { NodeRow } from './NodeRow.tsx'
import { useProgress } from './progress.ts'
import { rememberTreeView, treeAddress } from './treeAddress.ts'

/**
 * The tree, in the "route" layout: a strip of levels, then the chosen level as
 * one vertical line with a stop for each chapter. A stop opens to list the
 * chapter's topics.
 *
 * Above the route it says where the learner stands: the next recommended
 * topic, the level they are in, and how many topics are done and left. Every
 * rule behind that (state, next recommended, counts) is the learning
 * engine's; this file only lays the answers out.
 *
 * What is shown is in the address: `?level=A2` chooses the level and
 * `?kind=vocabulary` filters the tree to one kind.
 */
export function TreePage() {
  const { strings } = useLanguage()
  const { chapters, nodes } = use(loadIndex())
  const progress = useProgress()
  const [search] = useSearchParams()

  const next = nextRecommended(nodes, progress)
  const here = youAreHere(nodes, progress)

  const levels = [...new Set(nodes.map((node) => node.level))].sort()
  const kinds = NODE_KINDS.filter((candidate) => nodes.some((node) => node.kind === candidate))
  // Until the learner chooses a level, the tree shows the one they are in.
  const level = levels.find((candidate) => candidate === search.get('level')) ?? here?.level ?? levels.at(-1)
  const kind = kinds.find((candidate) => candidate === search.get('kind'))
  useEffect(() => rememberTreeView({ level, kind }), [level, kind])

  const ofKind = (candidate: NodeKind | undefined) =>
    candidate === undefined ? nodes : nodes.filter((node) => node.kind === candidate)
  const inLevel = (list: NodeSummary[], candidate: string | undefined) =>
    list.filter((node) => node.level === candidate)

  const shown = inLevel(ofKind(kind), level)
  const counts = countNodes(shown, progress)
  const stops = chapters
    .filter((chapter) => chapter.level === level && (kind === undefined || chapter.kind === kind))
    .map((chapter) => ({ chapter, topics: shown.filter((node) => node.chapter === chapter.id) }))
    .filter((stop) => stop.topics.length > 0)
  // The chapter that is open before the learner chooses: the one with their next topic, or else the first.
  const current = stops.find((stop) => stop.chapter.id === next?.chapter) ?? stops[0]
  const levelName = level === undefined ? undefined : strings.levelNames[level]

  return (
    <main className="wrap">
      <title>{`${strings.treeTitle} · ${strings.appName}`}</title>
      <header className="intro">
        <h1>{strings.treeTitle}</h1>
        <p>{strings.treeIntro}</p>
      </header>
      {/*
        Above the route there is the next topic and at most one note. The steps are for a learner
        who has not started; the backup suggestion needs done topics. So the two never meet.
      */}
      {!hasProgress(progress) && <FirstSteps />}
      <NextTopic node={next} chapter={chapters.find((chapter) => chapter.id === next?.chapter)} />
      <BackupSuggestion />

      <nav className="strip" aria-label={strings.levels}>
        <span className="strip-end">{strings.routeStart}</span>
        {levels.map((candidate) => {
          const levelCounts = countNodes(inLevel(ofKind(kind), candidate), progress)
          return (
            <Fragment key={candidate}>
              <span className="strip-line" aria-hidden="true" />
              <Link
                to={treeAddress({ level: candidate, kind })}
                className="strip-level"
                aria-current={candidate === level ? 'true' : undefined}
              >
                {candidate === here?.level && <em className="here">{strings.youAreHere}</em>}
                <b>{candidate}</b>
                <small>{strings.doneCount(levelCounts.done)}</small>
                <small>{strings.leftCount(levelCounts.remaining)}</small>
              </Link>
            </Fragment>
          )
        })}
        <span className="strip-line" aria-hidden="true" />
        <Link to="/readiness" className="strip-end">
          {/* Every topic is done: the learner is past the last level. */}
          {here === undefined && nodes.length > 0 && <em className="here">{strings.youAreHere}</em>}
          {strings.routeExam}
        </Link>
      </nav>

      {level !== undefined && (
        <>
          <h2 className="level-heading">
            {level}
            {levelName && ` · ${levelName}`} <span>· {strings.topicCount(counts.total)}</span>
          </h2>
          <p className="level-counts">{strings.countsSummary(counts.done, counts.remaining, counts.comingSoon)}</p>

          <nav className="kinds" aria-label={strings.kindsOfTopic}>
            {[undefined, ...kinds].map((candidate) => {
              const kindCounts = countNodes(inLevel(ofKind(candidate), level), progress)
              return (
                <Link
                  key={candidate ?? 'all'}
                  to={treeAddress({ level, kind: candidate })}
                  className="kind-choice"
                  aria-current={candidate === kind ? 'true' : undefined}
                >
                  {candidate === undefined ? <b>{strings.allKinds}</b> : <KindLabel kind={candidate} />}
                  <small>
                    {strings.doneCount(kindCounts.done)} · {strings.leftCount(kindCounts.remaining)}
                  </small>
                </Link>
              )
            })}
          </nav>

          {stops.length === 0 && <p className="panel message no-topics">{strings.noTopicsHere}</p>}
          <div className="route">
            {stops.map(({ chapter, topics }, index) => (
              <ChapterStop
                key={chapter.id}
                chapter={chapter}
                topics={topics}
                place={index + 1}
                openAtFirst={chapter === current?.chapter}
                next={next}
              />
            ))}
            {/* The checkpoint is the level's, whatever kind the tree is filtered to. */}
            <CheckpointStop level={level} ready={inLevel(nodes, level).some((node) => node.status === 'published')} />
            {/* The last level ends with the exam and the readiness rule. */}
            {level === levels.at(-1) && <ExamStop />}
          </div>
        </>
      )}
    </main>
  )
}

/**
 * How the tree works, in three steps, for a learner who has not started.
 * Dismissed once, it stays away on this device.
 */
function FirstSteps() {
  const { strings } = useLanguage()
  const { shown, dismiss } = useFirstSteps()
  if (!shown) return null
  // The pass mark as a percentage: what is needed out of a hundred.
  const steps = [strings.firstSteps.pick, strings.firstSteps.read, strings.firstSteps.pass(passMark(100))]
  return (
    <section className="first-steps" aria-labelledby="first-steps-heading">
      <h2 id="first-steps-heading" className="visually-hidden">
        {strings.howItWorks}
      </h2>
      <ol>
        {steps.map((step, index) => (
          <li key={index}>
            <b aria-hidden="true">{strings.number(index + 1)}</b>
            {step}
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-quiet btn-small" onClick={dismiss}>
        {strings.gotIt}
      </button>
    </section>
  )
}

/** The one obvious next step: the next recommended topic, wherever it is in the tree, whatever the tree shows. */
function NextTopic({ node, chapter }: { node: NodeSummary | undefined; chapter: ChapterSummary | undefined }) {
  const { language, strings } = useLanguage()
  const progress = useProgress()
  return (
    <section className="panel next-topic" aria-labelledby="next-topic-heading">
      <h2 id="next-topic-heading" className="cap">
        {strings.yourNextTopic}
      </h2>
      {node === undefined ? (
        <p>{strings.nothingNext}</p>
      ) : (
        <>
          <p id="next-topic-title" className="next-topic-title">
            <RichText parts={node.title[language]} />
          </p>
          <div className="meta">
            <span className="tag">{node.level}</span>
            <KindLabel kind={node.kind} />
            {chapter && (
              <span className="next-topic-chapter">
                <RichText parts={chapter.title[language]} />
              </span>
            )}
          </div>
          <div className="next-topic-actions">
            <Link to={`/node/${node.id}`} className="btn btn-main" aria-describedby="next-topic-title">
              {nodeState(progress, node.id) === 'in-progress' ? strings.continueTopic : strings.start}
            </Link>
            {node.hasTest && (
              <Link to={`/node/${node.id}/test`} className="btn btn-quiet" aria-describedby="next-topic-title">
                {strings.takeTheTest}
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  )
}

/**
 * Which chapters the learner opened or closed, until the page is reloaded.
 * Coming back from a topic, the tree is as they left it.
 */
const openChoices = new Map<string, boolean>()

interface ChapterStopProps {
  chapter: ChapterSummary
  /** The chapter's topics that the tree shows. */
  topics: NodeSummary[]
  place: number
  /** Open until the learner chooses otherwise. */
  openAtFirst: boolean
  /** The next recommended topic, in this chapter or another. */
  next: NodeSummary | undefined
}

/** One chapter: its name, its kind and how many of its topics are done, and behind them its topics. */
function ChapterStop({ chapter, topics, place, openAtFirst, next }: ChapterStopProps) {
  const { language, strings } = useLanguage()
  const counts = countNodes(topics, useProgress())
  const holdsNext = next?.chapter === chapter.id
  const allDone = counts.remaining === 0
  return (
    <div className={holdsNext ? 'stop stop-here' : allDone ? 'stop stop-done' : 'stop'}>
      <span className="stop-dot" aria-hidden="true">
        {strings.number(place)}
      </span>
      <details
        className="panel"
        open={openChoices.get(chapter.id) ?? openAtFirst}
        onToggle={(event) => openChoices.set(chapter.id, event.currentTarget.open)}
      >
        <summary className="stop-head">
          <span className="stop-text">
            {holdsNext && <span className="here">{strings.youAreHere}</span>}
            <h3 className="stop-name">
              <RichText parts={chapter.title[language]} />
            </h3>
            <span className="stop-meta">
              <KindLabel kind={chapter.kind} />
              <span>{strings.doneOfTotal(counts.done, counts.total)}</span>
              {counts.comingSoon > 0 && <span>{strings.comingSoonCount(counts.comingSoon)}</span>}
            </span>
          </span>
          <span className="stop-sign" aria-hidden="true" />
        </summary>
        <ul className="rows">
          {topics.map((node) => (
            <li key={node.id}>
              <NodeRow node={node} isNext={node.id === next?.id} />
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
