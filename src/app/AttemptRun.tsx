import { useEffect, useRef, useState } from 'react'
import type { Question } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import type { Answer } from '../learning-engine/index.ts'
import { QuestionView } from './QuestionView.tsx'
import { ReportProblem } from './ReportProblem.tsx'

interface AttemptRunProps {
  /** The node the questions belong to, for the "report a problem" link. */
  nodeId: string
  /** The questions of this attempt, in the order they are asked. */
  questions: Question[]
  /** Moves the keyboard and a screen reader to the first question (after "Try again"). */
  focusOnStart?: boolean
  /** Called once, after the last question, with one answer per question in the same order. */
  onFinish: (answers: Array<Answer | undefined>) => void
}

/**
 * The questions of one attempt, one per screen: a segmented progress bar, the
 * question in a panel, and one main button. It only collects answers; what
 * they are worth is decided by whoever gets them in `onFinish`.
 *
 * Mount it with a new `key` for a new attempt.
 */
export function AttemptRun({ nodeId, questions, focusOnStart = false, onFinish }: AttemptRunProps) {
  const { strings } = useLanguage()
  const [place, setPlace] = useState(0)
  const [answers, setAnswers] = useState<Array<Answer | undefined>>([])

  // A new question takes the place of the old one: take the keyboard and a screen reader to it.
  const heading = useRef<HTMLHeadingElement>(null)
  const focusedPlace = useRef(focusOnStart ? -1 : 0)
  useEffect(() => {
    if (focusedPlace.current === place) return
    focusedPlace.current = place
    heading.current?.focus()
  }, [place])

  const question = questions[place]
  if (!question) return null
  const answer = answers[place]
  const isLast = place === questions.length - 1

  return (
    <>
      <div className="test-progress">
        <div className="segments" aria-hidden="true">
          {questions.map((_, index) => (
            <span key={index} className={index < place ? 'segment-done' : index === place ? 'segment-current' : ''} />
          ))}
        </div>
        <h2 ref={heading} tabIndex={-1}>
          {strings.questionOf(place + 1, questions.length)}
        </h2>
      </div>

      <section className="panel question">
        <QuestionView
          key={place}
          question={question}
          answer={answer}
          onAnswer={(given) => setAnswers((before) => Object.assign([...before], { [place]: given }))}
        />
        <ReportProblem nodeId={nodeId} question={question} />
      </section>

      <div className="action-bar">
        <button
          type="button"
          className="btn btn-main"
          disabled={answer === undefined}
          onClick={() => (isLast ? onFinish(answers) : setPlace(place + 1))}
        >
          {isLast ? strings.checkAnswers : strings.next}
        </button>
      </div>
    </>
  )
}
