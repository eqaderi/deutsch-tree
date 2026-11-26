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

interface QuestionViewProps {
  question: Question
  /** What the learner has given so far. */
  answer: Answer | undefined
  onAnswer: (answer: Answer) => void
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
          sentence={
            <>
              {question.gap.before}
              <span className={typeof answer === 'string' ? 'gap gap-filled' : 'gap'}>
                {typeof answer === 'string' ? answer : <span className="visually-hidden">{strings.gap}</span>}
              </span>
              {question.gap.after}
            </>
          }
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
    case 'richtig-falsch':
      return (
        <Choices
          instruction={instruction}
          sentence={question.prompt}
          options={[true, false].map((value) => ({ value, label: <ExamAnswer answer={value} /> }))}
          chosen={answer}
          onChoose={onAnswer}
          sideBySide
        />
      )
  }
}

/** "Richtig" or "Falsch", as the exam's answer sheet has it: German in every language. */
function ExamAnswer({ answer }: { answer: boolean }) {
  const { strings } = useLanguage()
  return <German>{answer ? strings.examAnswers.richtig : strings.examAnswers.falsch}</German>
}

/** An answer to a question, as a result quotes it. */
export function AnswerText({ question, answer }: { question: Question; answer: Answer | undefined }) {
  const { strings } = useLanguage()
  if (answer === undefined) return '–'

  switch (question.type) {
    case 'multiple-choice':
    case 'gap-fill':
      return <German>{String(answer)}</German>
    case 'true-false':
      return answer === true ? strings.sentenceCorrect : strings.sentenceNotCorrect
    case 'richtig-falsch':
      return <ExamAnswer answer={answer === true} />
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
  /** Two short answers stand next to each other, as on an answer sheet. */
  sideBySide?: boolean
}

/** A German sentence and a short list of answers, one of which is chosen. */
function Choices({ instruction, sentence, options, chosen, onChoose, sideBySide = false }: ChoicesProps) {
  const id = useId()
  return (
    <div role="radiogroup" aria-labelledby={`${id}-instruction ${id}-sentence`}>
      <p id={`${id}-instruction`} className="question-instruction">
        {instruction}
      </p>
      <p id={`${id}-sentence`} className="question-sentence">
        <German>{sentence}</German>
      </p>
      <div className={sideBySide ? 'options options-side-by-side' : 'options'}>
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
