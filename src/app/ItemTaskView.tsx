/**
 * How an item task looks, wherever it is taken: the practice task of an
 * exam part (`PracticeTest.tsx`) and a part of a mock exam's Lesen or Hören
 * (`MockExamPage.tsx`). Its texts, its items while they are answered, and
 * every item's result. None of these knows where the task comes from or what
 * a result changes.
 */
import { type Ref, useId } from 'react'
import type { ItemTask, Question } from '../content-model/index.ts'
import { isHeard } from '../content-model/scoring.ts'
import { useLanguage } from '../language/index.tsx'
import { type Answer, type AttemptResult, rightAnswer } from '../learning-engine/index.ts'
import { German, RichText } from './German.tsx'
import { PlayButton, PlayRecording } from './PlayButton.tsx'
import { AnswerText, QuestionPrompt, QuestionView } from './QuestionView.tsx'
import { ReportProblem } from './ReportProblem.tsx'

/** How a report names an item: with its task, since two tasks may both have an item "i1". */
export function reported(task: ItemTask, item: Pick<Question, 'id' | 'prompt'>) {
  return { id: `${task.id}/${item.id}`, prompt: item.prompt }
}

interface TaskTextsProps {
  task: ItemTask
  /** The answers have been checked: a heard text now shows what is said. */
  checked?: boolean
  headingRef?: Ref<HTMLHeadingElement>
  /** How often each recording may be played while the items are answered; unlimited when absent. */
  plays?: number
}

/**
 * The texts of a task. A text to read is shown whole. A text to hear is its
 * recording while the items are answered, as in the exam; once the answers
 * are checked, also what is said, line by line, each line with its speaker
 * and its own play button. The texts are German, so they read left to
 * right in every language.
 */
export function TaskTexts({ task, checked = false, headingRef, plays }: TaskTextsProps) {
  const { strings } = useLanguage()
  const id = useId()
  const heard = task.texts.some(isHeard)
  // The items of a part such as Lesen, Teil 3 name a text by its letter, so the letter stands at the text.
  const lettered = task.items.some((item) => item.type === 'which-text')
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} ref={headingRef} tabIndex={-1} className="cap task-text-heading">
        {heard ? (checked ? strings.transcript : strings.practiceRecording) : strings.practiceText}
      </h2>
      {task.texts.map((text) =>
        isHeard(text) ? (
          <div key={text.id} className="task-text task-heard">
            {text.title !== undefined && (
              <h3 lang="de" dir="ltr">
                {text.title}
              </h3>
            )}
            <PlayRecording lines={text.lines} plays={checked ? undefined : plays} />
            {checked && (
              // Left to right as a whole, so each speaker stays at the start of the line.
              <ol className="transcript" dir="ltr">
                {text.lines.map((line, index) => (
                  <li key={index} className="transcript-line">
                    <PlayButton audio={line.audio} />
                    <German>
                      <span className="transcript-speaker">{line.speaker}</span> {line.text}
                    </German>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <article key={text.id} className="task-text de" lang="de" dir="ltr">
            {(text.title !== undefined || lettered) && (
              <h3>
                {lettered && <span className="text-letter">{text.id}</span>}
                {text.title}
              </h3>
            )}
            {text.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </article>
        ),
      )}
      {heard && !checked && <p className="secondary recording-note">{strings.recordingHidden}</p>}
    </section>
  )
}

interface TaskItemsProps {
  /** Where a report of a problem says the item is: the node, or the mock exam. */
  reportAs: string
  task: ItemTask
  answers: ReadonlyArray<Answer | undefined>
  onAnswer: (index: number, answer: Answer | undefined) => void
  /** The number of the first item, as the exam counts them across a module (Lesen, Teil 2 begins at 7). */
  firstNumber?: number
}

/** The items of a task while they are answered, in any order. It only collects answers. */
export function TaskItems({ reportAs, task, answers, onAnswer, firstNumber = 1 }: TaskItemsProps) {
  const { strings } = useLanguage()
  const id = useId()

  // When the items of a part are of one type, what to do is said once, above them.
  const types = new Set(task.items.map((item) => item.type))
  const instruction = task.items[0] && types.size === 1 ? strings.instructions[task.items[0].type] : undefined

  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="cap">
        {strings.questions}
      </h2>
      {instruction && <p className="question-instruction">{instruction}</p>}
      <ol className={instruction ? 'task-items task-items-one-instruction' : 'task-items'} aria-labelledby={id}>
        {task.items.map((item, index) => (
          <li key={item.id} className="task-item">
            <span className="task-item-place">{strings.questionNumber(firstNumber + index)}</span>
            <QuestionView question={item} answer={answers[index]} onAnswer={(given) => onAnswer(index, given)} />
            <ReportProblem nodeId={reportAs} question={reported(task, item)} />
          </li>
        ))}
      </ol>
    </section>
  )
}

interface ItemResultsProps {
  reportAs: string
  task: ItemTask
  result: AttemptResult
  firstNumber?: number
}

/** Every item of a checked task: what was answered, whether it was right, the right answer and the reason. */
export function ItemResults({ reportAs, task, result, firstNumber = 1 }: ItemResultsProps) {
  const { language, strings } = useLanguage()
  const id = useId()
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="cap">
        {strings.yourAnswers}
      </h2>
      <ol className="item-results" aria-labelledby={id}>
        {result.questions.map(({ question, answer, correct }, index) => (
          <li key={question.id} className="item-result">
            <span className="item-result-head">
              <span className="task-item-place">{strings.questionNumber(firstNumber + index)}</span>
              <span className={correct ? 'verdict verdict-right' : 'verdict verdict-wrong'}>
                {correct ? strings.answerIsRight : strings.answerIsWrong}
              </span>
            </span>
            <QuestionPrompt question={question} className="item-result-prompt" />
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
            <ReportProblem nodeId={reportAs} question={reported(task, question)} />
          </li>
        ))}
      </ol>
    </section>
  )
}
