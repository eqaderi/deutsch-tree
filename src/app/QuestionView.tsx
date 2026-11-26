/**
 * How each question type looks: while it is answered (`QuestionView`) and
 * when its answer is quoted in a result (`AnswerText`). A new question type
 * gets one case in each; nothing else in the test screens knows the types.
 */
import { type ReactNode, useId } from 'react'
import type { Question } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import type { Answer } from '../learning-engine/index.ts'
import { German } from './German.tsx'
import { TypedAnswer } from './TypedAnswer.tsx'

interface QuestionViewProps {
  question: Question
  /** What the learner has given so far. */
  answer: Answer | undefined
  /** Called with every change. Undefined takes the answer back: the question is unanswered again. */
  onAnswer: (answer: Answer | undefined) => void
}

/** One question, ready to be answered. */
export function QuestionView({ question, answer, onAnswer }: QuestionViewProps) {
  const { strings } = useLanguage()
  const instruction = strings.instructions[question.type]

  switch (question.type) {
    case 'multiple-choice':
      return (
        <Choices
          instruction={instruction}
          sentence={question.prompt}
          options={question.options.map((option) => ({ value: option, label: <German>{option}</German> }))}
          chosen={answer}
          onChoose={onAnswer}
        />
      )
    case 'gap-fill':
      return (
        <Choices
          instruction={instruction}
          sentence={<GapSentence gap={question.gap} filled={answer} />}
          options={question.options.map((option) => ({ value: option, label: <German>{option}</German> }))}
          chosen={answer}
          onChoose={onAnswer}
        />
      )
    case 'true-false':
      return (
        <Choices
          instruction={instruction}
          sentence={question.prompt}
          options={[
            { value: true, label: strings.sentenceCorrect },
            { value: false, label: strings.sentenceNotCorrect },
          ]}
          chosen={answer}
          onChoose={onAnswer}
        />
      )
    case 'typed-answer':
      return (
        <TypedAnswer
          instruction={instruction}
          sentence={question.prompt}
          text={typeof answer === 'string' ? answer : ''}
          onType={(text) => onAnswer(typedText(text))}
        />
      )
    case 'typed-gap-fill':
      return (
        <TypedAnswer
          instruction={instruction}
          sentence={<GapSentence gap={question.gap} filled={answer} />}
          text={typeof answer === 'string' ? answer : ''}
          onType={(text) => onAnswer(typedText(text))}
        />
      )
  }
}

/** What a field holds, as an answer. A field with nothing but spaces in it is no answer yet. */
function typedText(text: string): Answer | undefined {
  return text.trim() === '' ? undefined : text
}

/** A sentence with one gap: a line while the gap is empty, then the chosen or typed form on the line. */
function GapSentence({ gap, filled }: { gap: { before: string; after: string }; filled: Answer | undefined }) {
  const { strings } = useLanguage()
  return (
    <>
      {gap.before}
      <span className={typeof filled === 'string' ? 'gap gap-filled' : 'gap'}>
        {typeof filled === 'string' ? filled : <span className="visually-hidden">{strings.gap}</span>}
      </span>
      {gap.after}
    </>
  )
}

/** An answer to a question, as a result quotes it. */
export function AnswerText({ question, answer }: { question: Question; answer: Answer | undefined }) {
  const { strings } = useLanguage()
  if (answer === undefined) return '–'

  switch (question.type) {
    case 'multiple-choice':
    case 'gap-fill':
    case 'typed-answer':
    case 'typed-gap-fill':
      return <German>{String(answer)}</German>
    case 'true-false':
      return answer === true ? strings.sentenceCorrect : strings.sentenceNotCorrect
  }
}

interface ChoicesProps {
  /** What to do, in the learner's language. */
  instruction: string
  /** The German the question is about. */
  sentence: ReactNode
  options: Array<{ value: Answer; label: ReactNode }>
  chosen: Answer | undefined
  onChoose: (value: Answer) => void
}

/** A German sentence and a short list of answers, one of which is chosen. */
function Choices({ instruction, sentence, options, chosen, onChoose }: ChoicesProps) {
  const id = useId()
  return (
    <div role="radiogroup" aria-labelledby={`${id}-instruction ${id}-sentence`}>
      <p id={`${id}-instruction`} className="question-instruction">
        {instruction}
      </p>
      <p id={`${id}-sentence`} className="question-sentence">
        <German>{sentence}</German>
      </p>
      <div className="options">
        {options.map((option, index) => (
          <label key={index} className="option">
            <input type="radio" name={id} checked={option.value === chosen} onChange={() => onChoose(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
