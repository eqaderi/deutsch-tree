import { type Ref, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { CompiledNode, ItemTask, Question } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import {
  type Answer,
  type AttemptResult,
  applyAttempt,
  isAnswered,
  isDone,
  nextTask,
  rightAnswer,
  scoreAttempt,
} from '../learning-engine/index.ts'
import { German, plainText, RichText } from './German.tsx'
import { NotFound } from './NotFound.tsx'
import { updateProgress, useProgress } from './progress.ts'
import { AnswerText, QuestionView } from './QuestionView.tsx'
import { ReportProblem } from './ReportProblem.tsx'

interface PracticeTestProps {
  node: CompiledNode
  /** The practice tasks of the exam part. An attempt takes one of them, whole. */
  tasks: ItemTask[]
}

interface Attempt {
  /** 1 for the first attempt of this visit, 2 for the first retry, and so on. */
  number: number
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
    const task = nextTask(tasks, last, Math.random)
    return task && { number, task }
  }
  const [attempt, setAttempt] = useState(() => start(1))
  if (!attempt) return <NotFound />

  const title = strings.practiceTitle(plainText(node.title[language]))
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
        <TaskResult
          nodeId={node.id}
          task={attempt.task}
          result={attempt.finished.result}
          wasDone={attempt.finished.wasDone}
          onRetry={() => setAttempt(start(attempt.number + 1, attempt.task))}
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

/** How a report names an item: with its task, since two tasks may both have an item "i1". */
function reported(task: ItemTask, item: Pick<Question, 'id' | 'prompt'>) {
  return { id: `${task.id}/${item.id}`, prompt: item.prompt }
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

  // The items of one exam part are of one type, so what to do is said once, above them.
  const types = new Set(task.items.map((item) => item.type))
  const instruction = task.items[0] && types.size === 1 ? strings.instructions[task.items[0].type] : undefined

  return (
    <>
      <TaskTexts task={task} headingRef={heading} />

      <section className="panel" aria-labelledby="task-items-heading">
        <h2 id="task-items-heading" className="cap">
          {strings.questions}
        </h2>
        {instruction && <p className="question-instruction">{instruction}</p>}
        <ol
          className={instruction ? 'task-items task-items-one-instruction' : 'task-items'}
          aria-labelledby="task-items-heading"
        >
          {task.items.map((item, index) => (
            <li key={item.id} className="task-item">
              <span className="task-item-place">{strings.questionNumber(index + 1)}</span>
              <QuestionView
                question={item}
                answer={answers[index]}
                onAnswer={(given) => setAnswers((before) => Object.assign([...before], { [index]: given }))}
              />
              <ReportProblem nodeId={nodeId} question={reported(task, item)} />
            </li>
          ))}
        </ol>
      </section>

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
  const { language, strings } = useLanguage()

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

      <TaskTexts task={task} />

      <section className="panel" aria-labelledby="item-results-heading">
        <h2 id="item-results-heading" className="cap">
          {strings.yourAnswers}
        </h2>
        <ol className="item-results" aria-labelledby="item-results-heading">
          {result.questions.map(({ question, answer, correct }, index) => (
            <li key={question.id} className="item-result">
              <span className="item-result-head">
                <span className="task-item-place">{strings.questionNumber(index + 1)}</span>
                <span className={correct ? 'verdict verdict-right' : 'verdict verdict-wrong'}>
                  {correct ? strings.answerIsRight : strings.answerIsWrong}
                </span>
              </span>
              <German className="item-result-prompt">{question.prompt}</German>
              <dl>
                <div className={correct ? 'answer-right' : 'answer-given'}>
                  <dt>{strings.yourAnswer}</dt>
                  <dd>
                    <AnswerText question={question} answer={answer} />
                  </dd>
                </div>
                {!correct && (
                  <div className="answer-right">
                    <dt>{strings.rightAnswer}</dt>
                    <dd>
                      <AnswerText question={question} answer={rightAnswer(question)} />
                    </dd>
                  </div>
                )}
              </dl>
              <p className="item-result-reason">
                <RichText parts={question.explanation[language]} />
              </p>
              <ReportProblem nodeId={nodeId} question={reported(task, question)} />
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

/** The texts of a task. They are German, so they read left to right in every language. */
function TaskTexts({ task, headingRef }: { task: ItemTask; headingRef?: Ref<HTMLHeadingElement> }) {
  const { strings } = useLanguage()
  return (
    <section className="panel" aria-labelledby="task-text-heading">
      <h2 id="task-text-heading" ref={headingRef} tabIndex={-1} className="cap task-text-heading">
        {strings.practiceText}
      </h2>
      {task.texts.map((text) => (
        <article key={text.id} className="task-text de" lang="de" dir="ltr">
          {text.title !== undefined && <h3>{text.title}</h3>}
          {text.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </article>
      ))}
    </section>
  )
}
