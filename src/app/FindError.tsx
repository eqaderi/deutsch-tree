import { useId } from 'react'
import type { FindErrorQuestion } from '../content-model/index.ts'
import type { Answer } from '../learning-engine/index.ts'

/** The words of the sentence, in order. An answer is the place of one of them. */
export function wordsOf(question: FindErrorQuestion): string[] {
  return question.parts.flatMap((part) => (typeof part === 'string' ? [] : [part.word]))
}

interface FindErrorProps {
  question: FindErrorQuestion
  /** What to do, in the learner's language. */
  instruction: string
  answer: Answer | undefined
  onAnswer: (answer: Answer) => void
}

/**
 * A German sentence in which every word can be picked, one at a time. What
 * stands between the words (spaces, commas, the full stop) stays plain text.
 */
export function FindError({ question, instruction, answer, onAnswer }: FindErrorProps) {
  const id = useId()
  let words = 0
  const parts = question.parts.map((part) => (typeof part === 'string' ? part : { word: part.word, place: words++ }))

  return (
    <div role="radiogroup" aria-labelledby={`${id}-instruction`}>
      <p id={`${id}-instruction`} className="question-instruction">
        {instruction}
      </p>
      <p className="question-sentence pick-word de" lang="de" dir="ltr">
        {parts.map((part, index) =>
          typeof part === 'string' ? (
            part
          ) : (
            <label key={index} className="word">
              <input type="radio" name={id} checked={answer === part.place} onChange={() => onAnswer(part.place)} />
              {part.word}
            </label>
          ),
        )}
      </p>
    </div>
  )
}
