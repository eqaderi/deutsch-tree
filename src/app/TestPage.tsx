import { use, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import type { CompiledNode, Question } from '../content-model/index.ts'
import { hasPool } from '../content-model/scoring.ts'
import { useLanguage } from '../language/index.tsx'
import { type AttemptResult, applyAttempt, drawAttempt, isDone, scoreAttempt } from '../learning-engine/index.ts'
import { AttemptRun } from './AttemptRun.tsx'
import { loadNode } from './content.ts'
import { plainText } from './German.tsx'
import { isNodeId } from './NodePage.tsx'
import { NotFound } from './NotFound.tsx'
import { updateProgress, useProgress } from './progress.ts'
import { TestResult } from './TestResult.tsx'

/** The address of a node's test. It can be opened without opening the node's page first. */
export function TestPage() {
  const { id = '' } = useParams()
  if (!isNodeId(id)) return <NotFound />

  const node = use(loadNode(id))
  if (!node.content) return <NotFound />
  // A writing or speaking node has no test of questions: its page holds the task and the score.
  if (!hasPool(node.content)) return <Navigate to=".." relative="path" replace />

  return <NodeTest key={node.id} node={node} pool={node.content.questions} attemptSize={node.content.attemptSize} />
}

interface NodeTestProps {
  node: CompiledNode
  /** Every question written for the node. */
  pool: Question[]
  /** How many of them one attempt draws. */
  attemptSize: number
}

interface Attempt {
  /** 1 for the first attempt of this visit, 2 for the first retry, and so on. */
  number: number
  questions: Question[]
  /** Set when the last question has been answered. */
  finished?: { result: AttemptResult; wasDone: boolean }
}

/**
 * A node's test, for any kind of node with a pool: attempts drawn afresh from
 * the pool, as often as the learner likes, each one scored and applied to
 * the progress by the learning engine.
 */
export function NodeTest({ node, pool, attemptSize }: NodeTestProps) {
  const { language, strings } = useLanguage()
  const progress = useProgress()
  const draw = (number: number): Attempt => ({ number, questions: drawAttempt(pool, attemptSize, Math.random) })
  const [attempt, setAttempt] = useState(() => draw(1))

  const title = strings.testTitle(plainText(node.title[language]))
  return (
    <main className="wrap">
      <title>{`${title} · ${strings.appName}`}</title>
      <Link to=".." relative="path" className="back">
        <span className="flip" aria-hidden="true">
          ←
        </span>
        {strings.backToTopic}
      </Link>
      <header className="page-head">
        <h1>{title}</h1>
      </header>

      {attempt.finished ? (
        <TestResult
          nodeId={node.id}
          result={attempt.finished.result}
          wasDone={attempt.finished.wasDone}
          onRetry={() => setAttempt(draw(attempt.number + 1))}
        />
      ) : (
        <AttemptRun
          key={attempt.number}
          nodeId={node.id}
          questions={attempt.questions}
          focusOnStart={attempt.number > 1}
          onFinish={(answers) => {
            const result = scoreAttempt(attempt.questions, answers)
            setAttempt({ ...attempt, finished: { result, wasDone: isDone(progress, node.id) } })
            updateProgress((before) => applyAttempt(before, node.id, result))
          }}
        />
      )}
    </main>
  )
}
