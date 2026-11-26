import { useId } from 'react'
import type { WordOrderQuestion } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import type { Answer } from '../learning-engine/index.ts'

/** A piece as German writes it at the start of a sentence: with a capital letter. */
function atSentenceStart(piece: string): string {
  return piece.charAt(0).toLocaleUpperCase('de') + piece.slice(1)
}

/** The pieces of an answer to a word ordering question, in the order they were placed. */
function placedIn(answer: Answer | undefined): string[] {
  return Array.isArray(answer) ? answer.filter((piece) => piece !== null) : []
}

/** An order of the pieces as one sentence: a capital letter at the start, the closing mark at the end. */
export function sentenceOf(question: WordOrderQuestion, answer: Answer | undefined): string {
  return atSentenceStart(placedIn(answer).join(' ')) + question.end
}

interface WordOrderProps {
  question: WordOrderQuestion
  /** What to do, in the learner's language. */
  instruction: string
  answer: Answer | undefined
  onAnswer: (answer: Answer) => void
}

/**
 * The pieces of a sentence, put in order by choosing them one after the
 * other: no dragging. Each piece is a button that places it at the end of the
 * sentence and, chosen again, takes it back; a piece in the sentence takes
 * itself back too. Both lines always read left to right.
 */
export function WordOrder({ question, instruction, answer, onAnswer }: WordOrderProps) {
  const { strings } = useLanguage()
  const id = useId()
  const placed = placedIn(answer)

  /** The same piece may be there twice: the first copy is placed when one is in the sentence, the second when two are. */
  const isPlaced = (index: number) => {
    const piece = question.pieces[index]
    const copy = question.pieces.slice(0, index + 1).filter((other) => other === piece).length
    return placed.filter((other) => other === piece).length >= copy
  }
  const takeBack = (position: number) => onAnswer(placed.toSpliced(position, 1))
  const choose = (index: number) => {
    const piece = question.pieces[index]
    if (piece === undefined) return
    if (isPlaced(index)) takeBack(placed.lastIndexOf(piece))
    else onAnswer([...placed, piece])
  }

  return (
    <fieldset className="word-order" aria-labelledby={`${id}-instruction`}>
      <p id={`${id}-instruction`} className="question-instruction">
        {instruction}
      </p>
      {/* Read out as it grows. Its pieces are left out of the Tab order: the keyboard uses the pieces below. */}
      <fieldset className="sentence-line" aria-label={strings.yourSentence} aria-live="polite" dir="ltr">
        {placed.map((piece, position) => (
          <button
            key={position}
            type="button"
            className="piece"
            lang="de"
            tabIndex={-1}
            onClick={() => takeBack(position)}
          >
            {position === 0 ? atSentenceStart(piece) : piece}
          </button>
        ))}
        <span className="sentence-end">{question.end}</span>
      </fieldset>
      <fieldset className="pieces" aria-label={strings.wordsToPlace} dir="ltr">
        {question.pieces.map((piece, index) => (
          <button
            key={index}
            type="button"
            className="piece"
            lang="de"
            aria-pressed={isPlaced(index)}
            onClick={() => choose(index)}
          >
            {piece}
          </button>
        ))}
      </fieldset>
    </fieldset>
  )
}
