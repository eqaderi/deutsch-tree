import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import type { Question } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { type Answer, type AnswerNote, type AttemptResult, rightAnswer } from '../learning-engine/index.ts'
import { RichText } from './German.tsx'
import { AnswerText, QuestionPrompt } from './QuestionView.tsx'
import { ReportProblem } from './ReportProblem.tsx'
import { lastTreeAddress } from './treeAddress.ts'

interface TestResultProps {
  nodeId: string
  result: AttemptResult
  /** The node was done before this attempt. */
  wasDone: boolean
  onRetry: () => void
  /** Where "All topics" leads: the tree at the node's level. Left out, the tree as the learner last saw it. */
  treeAddress?: string
}

/**
 * The result of a node's test: one panel with the score as a big number, the
 * wrong answers with their one-line reasons, and two buttons.
 */
export function TestResult({ nodeId, result, wasDone, onRetry, treeAddress }: TestResultProps) {
  const { strings } = useLanguage()
  const answered = result.questions.map((item, index) => ({ ...item, nodeId, place: index + 1 }))
  const wrong = answered.filter((item) => !item.correct)
  const noted = answered.filter(isNoted)

  // The result takes the place of the last question: take the keyboard and a screen reader to it.
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  return (
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
            <p>{wasDone ? strings.topicStaysDone : strings.retryAnyTime}</p>
          </>
        )}
      </div>

      <WrongAnswers wrong={wrong} />

      <NotedAnswers noted={noted} />

      <div className="result-actions">
        {result.passed ? (
          <>
            <Link to={treeAddress ?? lastTreeAddress()} className="btn btn-main">
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
  )
}

/** One wrong answer of a finished test or checkpoint. */
export interface WrongAnswer {
  /** The place of the question in the test, from 1. */
  place: number
  /** The node the question belongs to. */
  nodeId: string
  question: Question
  answer: Answer | undefined
}

/**
 * The wrong answers of a test or a checkpoint under their heading: each
 * question with what was answered, the right answer and its one-line reason.
 * Shows nothing when there is none.
 */
export function WrongAnswers({ wrong }: { wrong: WrongAnswer[] }) {
  const { language, strings } = useLanguage()
  if (wrong.length === 0) return null
  return (
    <>
      <h3 id="wrong-heading" className="cap">
        {strings.wrongAnswers}
      </h3>
      <ol className="wrong-answers" aria-labelledby="wrong-heading">
        {wrong.map(({ nodeId, question, answer, place }) => (
          <li key={place} className="wrong-answer">
            <span className="wrong-answer-place">{strings.questionNumber(place)}</span>
            <QuestionPrompt question={question} className="wrong-answer-prompt" />
            <dl>
              <div className="answer-given">
                <dt>{strings.yourAnswer}</dt>
                <dd>
                  <AnswerText question={question} answer={answer} />
                </dd>
              </div>
              <div className="answer-right">
                <dt>{strings.rightAnswer}</dt>
                <dd>
                  <AnswerText question={question} answer={rightAnswer(question)} />
                </dd>
              </div>
            </dl>
            <p className="wrong-answer-reason">
              <RichText parts={question.explanation[language]} />
            </p>
            <ReportProblem nodeId={nodeId} question={question} />
          </li>
        ))}
      </ol>
    </>
  )
}

/** One answer of a finished test or checkpoint that was right, but not written exactly. */
export interface NotedAnswer {
  /** The place of the question in the test, from 1. */
  place: number
  question: Question
  answer: Answer | undefined
  notes: AnswerNote[]
  /** The accepted answer it stands for, written exactly. */
  accepted?: string | undefined
}

/** Whether a checked answer was right but not written exactly: an accepted answer with a note. */
export function isNoted(item: { correct: boolean; notes: AnswerNote[] }): boolean {
  return item.correct && item.notes.length > 0
}

/**
 * The answers of a test or a checkpoint that were accepted with a note,
 * under their heading: what was typed, the exact spelling, and which slip it
 * was. Shows nothing when there is none.
 */
export function NotedAnswers({ noted }: { noted: NotedAnswer[] }) {
  const { strings } = useLanguage()
  if (noted.length === 0) return null
  return (
    <>
      <h3 id="noted-heading" className="cap">
        {strings.acceptedWithNote}
      </h3>
      <ol className="noted-answers" aria-labelledby="noted-heading">
        {noted.map(({ question, answer, notes, accepted, place }) => (
          <li key={place} className="noted-answer">
            <span className="noted-answer-place">{strings.questionNumber(place)}</span>
            <QuestionPrompt question={question} className="noted-answer-prompt" />
            <dl>
              <div className="answer-noted">
                <dt>{strings.yourAnswer}</dt>
                <dd>
                  <AnswerText question={question} answer={answer} />
                </dd>
              </div>
              <div className="answer-right">
                <dt>{strings.exactSpelling}</dt>
                <dd>
                  <AnswerText question={question} answer={accepted} />
                </dd>
              </div>
            </dl>
            {notes.map((note) => (
              <p key={note} className="noted-answer-note">
                {strings.answerNotes[note]}
              </p>
            ))}
          </li>
        ))}
      </ol>
    </>
  )
}
