import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { CompiledNode, ItemTask } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import {
  type Answer,
  type AttemptResult,
  applyAttempt,
  isAnswered,
  isDone,
  nextTask,
  scoreAttempt,
  taskAsAsked,
} from '../learning-engine/index.ts'
import { plainText } from './German.tsx'
import { ItemResults, TaskItems, TaskTexts } from './ItemTaskView.tsx'
import { NotFound } from './NotFound.tsx'
import { BackLink, PageTitle } from './PageTitle.tsx'
import { updateProgress, useProgress } from './progress.ts'

interface PracticeTestProps {
  node: CompiledNode
  /** The practice tasks of the exam part. An attempt takes one of them, whole. */
  tasks: ItemTask[]
}

interface Attempt {
  /** 1 for the first attempt of this visit, 2 for the first retry, and so on. */
  number: number
  /** The task as the node holds it, so that a retry takes another one. */
  drawn: ItemTask
  /** The same task as this attempt asks it. */
  task: ItemTask
  /** Set when the answers have been checked. */
  finished?: { result: AttemptResult; wasDone: boolean }
}

/**
 * The practice task of an exam part, as the exam sets it: the text and all
 * its items on one page, answered in any order, then the result of every
 * item. The learning engine picks the task, scores it and applies the result
 * to the progress; a passed task marks the part done.
 */
export function PracticeTest({ node, tasks }: PracticeTestProps) {
  const { language, strings } = useLanguage()
  const progress = useProgress()
  const start = (number: number, last?: ItemTask): Attempt | undefined => {
    const drawn = nextTask(tasks, last, Math.random)
    return drawn && { number, drawn, task: taskAsAsked(drawn, Math.random) }
  }
  const [attempt, setAttempt] = useState(() => start(1))
  if (!attempt) return <NotFound />

  const title = strings.practiceTitle(plainText(node.title[language]))
  return (
    <main className="wrap">
      <PageTitle title={title} />
      <BackLink to=".." relative="path">
        {strings.backToTopic}
      </BackLink>
      <header className="page-head">
        <h1>{title}</h1>
      </header>

      {attempt.finished ? (
        <TaskResult
          nodeId={node.id}
          task={attempt.task}
          result={attempt.finished.result}
          wasDone={attempt.finished.wasDone}
          onRetry={() => setAttempt(start(attempt.number + 1, attempt.drawn))}
        />
      ) : (
        <TaskRun
          key={attempt.number}
          nodeId={node.id}
          task={attempt.task}
          focusOnStart={attempt.number > 1}
          onFinish={(answers) => {
            const result = scoreAttempt(attempt.task.items, answers)
            setAttempt({ ...attempt, finished: { result, wasDone: isDone(progress, node.id) } })
            updateProgress((before) => applyAttempt(before, node.id, result))
          }}
        />
      )}
    </main>
  )
}

interface TaskRunProps {
  nodeId: string
  task: ItemTask
  /** Moves the keyboard and a screen reader to the text (after "Try again"). */
  focusOnStart: boolean
  /** Called once, with one answer per item in the order of the items. */
  onFinish: (answers: Array<Answer | undefined>) => void
}

/** One task while it is answered. It only collects answers. Mount it with a new `key` for a new attempt. */
function TaskRun({ nodeId, task, focusOnStart, onFinish }: TaskRunProps) {
  const { strings } = useLanguage()
  const [answers, setAnswers] = useState<Array<Answer | undefined>>([])
  const answered = task.items.filter((item, index) => isAnswered(item, answers[index])).length

  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusOnStart) heading.current?.focus()
  }, [focusOnStart])

  return (
    <>
      <TaskTexts task={task} headingRef={heading} />
      <TaskItems
        reportAs={nodeId}
        task={task}
        answers={answers}
        onAnswer={(index, given) => setAnswers((before) => Object.assign([...before], { [index]: given }))}
      />

      <div className="action-bar">
        <button
          type="button"
          className="btn btn-main btn-with-note"
          disabled={answered < task.items.length}
          onClick={() => onFinish(answers)}
        >
          {strings.checkAnswers}
          <small>{strings.answeredOf(answered, task.items.length)}</small>
        </button>
      </div>
    </>
  )
}

interface TaskResultProps {
  nodeId: string
  task: ItemTask
  result: AttemptResult
  /** The part was done before this attempt. */
  wasDone: boolean
  onRetry: () => void
}

/**
 * The result of a task: the score as a big number, then the text again and
 * every item with what was answered, whether it was right, and the reason.
 */
function TaskResult({ nodeId, task, result, wasDone, onRetry }: TaskResultProps) {
  const { strings } = useLanguage()

  // The result takes the place of the task: take the keyboard and a screen reader to it.
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  return (
    <>
      <section className="panel result" aria-labelledby="result-heading">
        <h2 id="result-heading" ref={heading} tabIndex={-1} className="cap">
          {result.passed ? strings.passed : strings.notPassed}
        </h2>
        <p className="score">
          <span className="big-number">{strings.number(result.correct)}</span>{' '}
          <span className="secondary">{strings.ofTotalRight(result.total)}</span>
        </p>
        <div className="message">
          {result.passed ? (
            <p>{wasDone ? strings.topicStaysDone : strings.topicNowDone}</p>
          ) : (
            <>
              <p>{strings.neededToPass(result.passMark, result.total)}</p>
              <p>{wasDone ? strings.topicStaysDone : strings.practiceRetry}</p>
            </>
          )}
        </div>
        <div className="result-actions">
          {result.passed ? (
            <>
              <Link to="/" className="btn btn-main">
                {strings.allTopics}
              </Link>
              <button type="button" className="btn btn-quiet" onClick={onRetry}>
                {strings.tryAgain}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-main" onClick={onRetry}>
                {strings.tryAgain}
              </button>
              <Link to=".." relative="path" className="btn btn-quiet">
                {strings.backToTopic}
              </Link>
            </>
          )}
        </div>
      </section>

      <TaskTexts task={task} checked />

      <ItemResults reportAs={nodeId} task={task} result={result} />
    </>
  )
}
