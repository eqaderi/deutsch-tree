import { use, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { NodeSummary } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import {
  type Checkpoint,
  type CheckpointResult,
  type CheckpointSource,
  drawCheckpoint,
  scoreCheckpoint,
} from '../learning-engine/index.ts'
import { AttemptRun } from './AttemptRun.tsx'
import { loadCheckpoint, loadIndex } from './content.ts'
import { RichText } from './German.tsx'
import { BackToTree, NotFound } from './NotFound.tsx'
import { isNoted, NotedAnswers, WrongAnswers } from './TestResult.tsx'
import { treeAddress } from './treeAddress.ts'

/** The address of a level's checkpoint in the app. */
const checkpointPath = (level: string) => `/checkpoint/${level}`

/**
 * Whether a node gives questions to the checkpoint of its level. An exam part
 * gives none: what it asks is a whole task, and an item of a task cannot be
 * asked without the text it is about. The content pipeline writes the pools of
 * exactly these nodes into the level's checkpoint file (`checkpoint-data.ts`).
 */
export function givesToCheckpoint(node: NodeSummary): boolean {
  return node.hasTest && node.kind !== 'exam-part'
}

/**
 * The last stop of a level's line in the tree: its checkpoint, or a line that
 * says why there is none yet, then the way on to the next level. `ready` says
 * whether the level has a published topic with a pool; a writing or speaking
 * topic has none. The last level has no `nextLevel`: the exam follows it.
 */
export function CheckpointStop({ level, ready, nextLevel }: { level: string; ready: boolean; nextLevel?: string }) {
  const { strings } = useLanguage()
  return (
    <div className="stop">
      <span className="stop-dot" aria-hidden="true" />
      <section className="panel checkpoint-stop" aria-labelledby="checkpoint-stop-heading">
        <h3 id="checkpoint-stop-heading" className="stop-name">
          {strings.checkpointTitle(level)}
        </h3>
        <p>{ready ? strings.checkpointIntro : strings.checkpointNothingYet}</p>
        {ready && (
          <Link to={checkpointPath(level)} className="btn btn-quiet">
            {strings.startCheckpoint}
          </Link>
        )}
        {nextLevel !== undefined && (
          <p className="next-level">
            <Link to={treeAddress({ level: nextLevel })}>{strings.onToLevel(nextLevel)}</Link>
          </p>
        )}
      </section>
    </div>
  )
}

/** A level's checkpoint, at `#/checkpoint/<level>`. */
export function CheckpointPage() {
  const { level = '' } = useParams()
  const topics = use(loadIndex()).nodes.filter((node) => node.level === level)
  if (topics.length === 0) return <NotFound />

  // The checkpoint draws across every published topic of the level that has a pool: one file holds all their pools.
  const published = topics.filter(givesToCheckpoint)
  const sources = use(loadCheckpoint(level))
  return <LevelCheckpoint key={level} level={level} topics={published} sources={sources} />
}

interface LevelCheckpointProps {
  level: string
  /** The published topics of the level, in curriculum order. */
  topics: NodeSummary[]
  /** What each of them gives to the checkpoint, in the same order. */
  sources: CheckpointSource[]
}

interface Take {
  /** 1 for the first checkpoint of this visit, 2 for the next, and so on. */
  number: number
  checkpoint: Checkpoint
  /** Set when the last question has been answered. */
  result?: CheckpointResult
}

/**
 * The checkpoint of one level: drawn afresh by the learning engine as often
 * as the learner likes, asked through the same screens as a topic's test,
 * then scored. It is advice: nothing here reads or changes the progress.
 */
function LevelCheckpoint({ level, topics, sources }: LevelCheckpointProps) {
  const { strings } = useLanguage()
  const draw = (number: number): Take => ({ number, checkpoint: drawCheckpoint(sources, Math.random) })
  const [take, setTake] = useState(() => draw(1))
  const { checkpoint } = take

  const title = strings.checkpointTitle(level)
  return (
    <main className="wrap">
      <title>{`${title} · ${strings.appName}`}</title>
      <BackToTree level={level} />
      <header className="page-head">
        <h1>{title}</h1>
        {checkpoint.questions.length > 0 && (
          <p className="page-note">{strings.checkpointSize(checkpoint.questions.length, checkpoint.nodeIds.length)}</p>
        )}
      </header>

      {checkpoint.questions.length === 0 ? (
        <section className="panel message">
          <p>{strings.checkpointNothingYet}</p>
        </section>
      ) : take.result ? (
        <CheckpointResultPanel
          level={level}
          result={take.result}
          topics={topics}
          onRetry={() => setTake(draw(take.number + 1))}
        />
      ) : (
        <AttemptRun
          key={take.number}
          nodeId={checkpoint.questions.map(({ nodeId }) => nodeId)}
          questions={checkpoint.questions.map(({ question }) => question)}
          focusOnStart={take.number > 1}
          onFinish={(answers) => setTake({ ...take, result: scoreCheckpoint(checkpoint, answers) })}
        />
      )}
    </main>
  )
}

interface CheckpointResultPanelProps {
  level: string
  result: CheckpointResult
  /** The topics the checkpoint could ask, for their names. */
  topics: NodeSummary[]
  onRetry: () => void
}

/**
 * The result of a checkpoint: one panel with the score as a big number, the
 * topics with wrong answers as links to their pages, the wrong answers with
 * their reasons, and two buttons.
 */
function CheckpointResultPanel({ level, result, topics, onRetry }: CheckpointResultPanelProps) {
  const { language, strings } = useLanguage()
  const answered = result.questions.map((item, index) => ({ ...item, place: index + 1 }))
  const wrong = answered.filter((item) => !item.correct)
  const noted = answered.filter(isNoted)

  // The result takes the place of the last question: take the keyboard and a screen reader to it.
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  return (
    <section className="panel result" aria-labelledby="result-heading">
      <h2 id="result-heading" ref={heading} tabIndex={-1} className="cap">
        {strings.checkpointResult}
      </h2>
      <p className="score">
        <span className="big-number">{strings.number(result.correct)}</span>{' '}
        <span className="secondary">{strings.ofTotalRight(result.total)}</span>
      </p>
      <div className="message">
        <p>{result.nodesToRevisit.length > 0 ? strings.checkpointSomeWrong : strings.checkpointAllRight}</p>
        <p>{strings.checkpointChangesNothing}</p>
      </div>

      {result.nodesToRevisit.length > 0 && (
        <>
          <h3 id="revisit-heading" className="cap">
            {strings.topicsToRevisit}
          </h3>
          <ul className="revisit" aria-labelledby="revisit-heading">
            {result.nodesToRevisit.map(({ nodeId, asked, wrong: wrongOfNode }) => (
              <li key={nodeId}>
                <Link to={`/node/${nodeId}`} className="row">
                  <span className="row-text">
                    <span className="row-title">
                      <RichText parts={topics.find((topic) => topic.id === nodeId)?.title[language] ?? [nodeId]} />
                    </span>
                  </span>
                  <span className="row-state">{strings.wrongOfAsked(wrongOfNode, asked)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <WrongAnswers wrong={wrong} />
      <NotedAnswers noted={noted} />

      <div className="result-actions">
        <Link to={treeAddress({ level })} className="btn btn-main">
          {strings.allTopics}
        </Link>
        <button type="button" className="btn btn-quiet" onClick={onRetry}>
          {strings.tryAgain}
        </button>
      </div>
    </section>
  )
}
