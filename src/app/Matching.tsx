import { useId } from 'react'
import type { MatchingQuestion } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import type { Answer } from '../learning-engine/index.ts'

/** The partner given to each item of a matching question, in the order of the items; null where none is chosen. */
export function partnersIn(question: MatchingQuestion, answer: Answer | undefined): Array<string | null> {
  return question.left.map((_, index) => (Array.isArray(answer) ? (answer[index] ?? null) : null))
}

interface MatchingProps {
  question: MatchingQuestion
  /** What to do, in the learner's language. */
  instruction: string
  answer: Answer | undefined
  onAnswer: (answer: Answer) => void
}

/**
 * One row per item: the item, and a list from which its partner is chosen.
 * The list is the device's own, so it works with a finger, a mouse and a
 * keyboard alike. A partner belongs to one item: given to another item, it
 * leaves the first. Every row reads left to right.
 */
export function Matching({ question, instruction, answer, onAnswer }: MatchingProps) {
  const { strings } = useLanguage()
  const id = useId()
  const partners = partnersIn(question, answer)
  const give = (index: number, partner: string) =>
    onAnswer(partners.map((other, place) => (place === index ? partner || null : other === partner ? null : other)))

  return (
    <fieldset className="matching" aria-labelledby={`${id}-instruction`}>
      <p id={`${id}-instruction`} className="question-instruction">
        {instruction}
      </p>
      <ul className="pairs">
        {question.left.map((item, index) => (
          <li key={index} className="pair" dir="ltr">
            <span id={`${id}-item-${index}`} className="de" lang="de">
              {item}
            </span>
            <select
              aria-labelledby={`${id}-item-${index}`}
              value={partners[index] ?? ''}
              onChange={(event) => give(index, event.target.value)}
            >
              <option value="">{strings.choosePartner}</option>
              {question.right.map((partner) => (
                <option key={partner} value={partner} lang="de">
                  {partner}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
