import { type ReactNode, useId, useLayoutEffect, useRef } from 'react'
import { useLanguage } from '../language/index.tsx'
import { German } from './German.tsx'

/** The German letters that many keyboards lack, in the order their buttons stand. */
const GERMAN_LETTERS = ['ä', 'ö', 'ü', 'ß']

interface TypedAnswerProps {
  /** What to do, in the learner's language. */
  instruction: string
  /** The German the question is about. */
  sentence: ReactNode
  /** False when the sentence is in the learner's language instead, as a meaning whose word is asked for. */
  sentenceIsGerman?: boolean
  /** What the learner has typed so far. */
  text: string
  onType: (text: string) => void
}

/**
 * A German sentence, a field to type the answer in, and one button for each
 * letter that the learner's keyboard may lack. Any question whose answer is
 * typed uses this.
 *
 * The field and the buttons read left to right on every page: they hold German.
 */
export function TypedAnswer({ instruction, sentence, sentenceIsGerman = true, text, onType }: TypedAnswerProps) {
  const { strings } = useLanguage()
  const id = useId()
  const field = useRef<HTMLInputElement>(null)

  // Where the cursor belongs once the field shows the text with a new letter in it.
  const cursorAfterLetter = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (cursorAfterLetter.current === null) return
    field.current?.setSelectionRange(cursorAfterLetter.current, cursorAfterLetter.current)
    cursorAfterLetter.current = null
  })

  /** Writes a letter where the cursor is, in place of what is selected, as a key of the keyboard would. */
  const write = (letter: string) => {
    const input = field.current
    if (!input) return
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? start
    cursorAfterLetter.current = start + letter.length
    input.focus()
    onType(input.value.slice(0, start) + letter + input.value.slice(end))
  }

  return (
    <div className="typed">
      <p id={`${id}-instruction`} className="question-instruction">
        {instruction}
      </p>
      <p id={`${id}-sentence`} className="question-sentence">
        {sentenceIsGerman ? <German>{sentence}</German> : sentence}
      </p>
      <input
        ref={field}
        type="text"
        className="typed-field de"
        lang="de"
        dir="ltr"
        aria-labelledby={`${id}-instruction ${id}-sentence`}
        value={text}
        onChange={(event) => onType(event.target.value)}
        // A phone must not change what the learner writes: capitals and spelling are part of the answer.
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="next"
      />
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own frame and legend; this is a plain row of buttons with a name. */}
      <div role="group" aria-label={strings.germanLetters} dir="ltr" className="typed-letters">
        {GERMAN_LETTERS.map((letter) => (
          <button
            key={letter}
            type="button"
            lang="de"
            className="typed-letter de"
            // Keeps the cursor in the field, and a phone's keyboard open, while the button is pressed.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => write(letter)}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  )
}
