/**
 * The answer sheet of one part of a book's exam, and its result. The items
 * are on the book's pages; the sheet has only their numbers and the answers
 * to choose from, as the exam's own answer sheet has. Scoring is the
 * learning engine's (`scoreAnswerSheet`); these views only show it.
 *
 * They know nothing about packs, so any exam whose items are numbers and
 * choices can use them.
 */
import { type ReactNode, useEffect, useId, useRef } from 'react'
import { useLanguage } from '../language/index.tsx'
import { MAXIMUM_SCORE, type SheetResult } from '../learning-engine/index.ts'
import { German } from './German.tsx'

/** One line of the sheet: the number printed beside the item, and the answers it offers. */
export interface SheetItem {
  number: number
  choices: readonly string[]
}

/** The learner's marks, by item number. */
export type SheetMarks = Partial<Record<number, string>>

interface AnswerSheetProps {
  items: readonly SheetItem[]
  marks: SheetMarks
  onMark: (item: number, choice: string) => void
  onCheck: () => void
}

export function AnswerSheet({ items, marks, onMark, onCheck }: AnswerSheetProps) {
  const { strings } = useLanguage()
  const id = useId()
  const answered = items.filter((item) => marks[item.number] !== undefined).length

  return (
    <section className="panel" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="cap">
        {strings.answerSheet}
      </h2>
      <ol className="sheet-items">
        {items.map((item) => (
          <li key={item.number} className="sheet-item">
            <div role="radiogroup" aria-label={strings.sheetItem(item.number)} className="sheet-line">
              <span className="sheet-number" aria-hidden="true">
                {strings.number(item.number)}
              </span>
              <span className="sheet-choices" dir="ltr">
                {item.choices.map((choice) => (
                  <label key={choice} className="sheet-choice">
                    <input
                      type="radio"
                      name={`${id}-${item.number}`}
                      checked={marks[item.number] === choice}
                      onChange={() => onMark(item.number, choice)}
                    />
                    <German>{choice}</German>
                  </label>
                ))}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="btn btn-main btn-with-note sheet-check"
        disabled={answered < items.length}
        onClick={onCheck}
      >
        {strings.checkAnswers}
        <small>{strings.answeredOf(answered, items.length)}</small>
      </button>
    </section>
  )
}

interface SheetResultViewProps {
  /** The part's number, for the heading. */
  part: number
  result: SheetResult
  /** Where "Next part" leads; none for the last part. */
  next?: ReactNode
  onAnswerAgain: () => void
}

/** The result of one part: the score out of 100, the right items, and every item with the right answer. */
export function SheetResultView({ part, result, next, onAnswerAgain }: SheetResultViewProps) {
  const { strings } = useLanguage()
  const id = useId()

  // The result takes the place of the sheet: take the keyboard and a screen reader to it.
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  return (
    <section className="panel result" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} ref={heading} tabIndex={-1} className="cap">
        {strings.partResult(part)}
      </h2>
      <p className="score">
        <span className="big-number">{strings.number(result.score)}</span>{' '}
        <span className="secondary">{strings.ofTotal(MAXIMUM_SCORE)}</span>
      </p>
      <p>{strings.rightOfTotal(result.correct, result.total)}</p>

      <ol className="item-results sheet-results" aria-label={strings.yourAnswers}>
        {result.items.map(({ item, given, right, correct }) => (
          <li key={item} className="item-result">
            <span className="item-result-head">
              <span className="task-item-place">{strings.sheetItem(item)}</span>
              <span className={correct ? 'verdict verdict-right' : 'verdict verdict-wrong'}>
                {correct ? strings.answerIsRight : strings.answerIsWrong}
              </span>
            </span>
            <dl>
              <div className={correct ? 'answer-right' : 'answer-given'}>
                <dt>{strings.yourAnswer}</dt>
                <dd>{given === undefined ? '–' : <German>{given}</German>}</dd>
              </div>
              {!correct && (
                <div className="answer-right">
                  <dt>{strings.rightAnswer}</dt>
                  <dd>
                    <German>{right}</German>
                  </dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ol>

      <div className="result-actions">
        {next}
        <button type="button" className={next ? 'btn btn-quiet' : 'btn btn-main'} onClick={onAnswerAgain}>
          {strings.answerAgain}
        </button>
      </div>
    </section>
  )
}
