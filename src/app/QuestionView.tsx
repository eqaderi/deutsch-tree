/**
 * How each question type looks: while it is answered (`QuestionView`) and
 * when its answer is quoted in a result (`AnswerText`). A new question type
 * gets one case in each; nothing else in the test screens knows the types.
 */
import { type ReactNode, useId } from 'react'
import type { Language, Localised, Question } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import type { Answer } from '../learning-engine/index.ts'
import { FindError, wordsOf } from './FindError.tsx'
import { German } from './German.tsx'
import { Matching, partnersIn } from './Matching.tsx'
import { TypedAnswer } from './TypedAnswer.tsx'
import { sentenceOf, WordOrder } from './WordOrder.tsx'

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
    case 'meaning-of-word':
      return (
        <Choices
          instruction={instruction}
          sentence={question.prompt}
          // An option is named by its word, so the answer stays the same when the language changes.
          options={question.options.map((option) => ({ value: option.word, label: <Meaning of={option.meaning} /> }))}
          chosen={answer}
          onChoose={onAnswer}
        />
      )
    case 'word-for-meaning':
      return (
        <TypedAnswer
          instruction={instruction}
          sentence={<Meaning of={question.prompt} />}
          sentenceIsGerman={false}
          text={typeof answer === 'string' ? answer : ''}
          onType={(text) => onAnswer(typedText(text))}
        />
      )
    case 'find-error':
      return <FindError question={question} instruction={instruction} answer={answer} onAnswer={onAnswer} />
    case 'word-order':
      return <WordOrder question={question} instruction={instruction} answer={answer} onAnswer={onAnswer} />
    case 'matching':
      return <Matching question={question} instruction={instruction} answer={answer} onAnswer={onAnswer} />
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

/**
 * What a word means, for the learner who reads this page: the meaning in
 * English or Persian, or the German definition for a learner who reads in
 * German.
 */
export function Meaning({ of }: { of: Localised }) {
  const { language } = useLanguage()
  return language === 'de' ? <German>{of.de}</German> : <bdi>{of[language]}</bdi>
}

/** What a question asks about, as a result quotes it: German, or for a word asked for in German its meaning. */
export function QuestionPrompt({ question, className }: { question: Question; className?: string }) {
  if (typeof question.prompt === 'string') return <German className={className}>{question.prompt}</German>
  return (
    <span className={className}>
      <Meaning of={question.prompt} />
    </span>
  )
}

/** The same as plain text, in one language. */
export function promptText(question: Pick<Question, 'prompt'>, language: Language): string {
  return typeof question.prompt === 'string' ? question.prompt : question.prompt[language]
}

/** "Richtig" or "Falsch", as the exam's answer sheet has it: German in every language. */
function ExamAnswer({ answer }: { answer: boolean }) {
  const { strings } = useLanguage()
  return <German>{answer ? strings.examAnswers.richtig : strings.examAnswers.falsch}</German>
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
    case 'word-for-meaning':
      return <German>{String(answer)}</German>
    case 'true-false':
      return answer === true ? strings.sentenceCorrect : strings.sentenceNotCorrect
    case 'meaning-of-word': {
      // The answer names a word of the node; the learner chose, and reads, its meaning.
      const chosen = question.options.find((option) => option.word === answer)
      return chosen ? <Meaning of={chosen.meaning} /> : '–'
    }
    case 'find-error':
      return <German>{(typeof answer === 'number' && wordsOf(question)[answer]) || '–'}</German>
    case 'word-order':
      return <German>{sentenceOf(question, answer)}</German>
    case 'matching': {
      // Left to right as a whole, so that each arrow points from an item to its partner.
      const partners = partnersIn(question, answer)
      return <German>{question.left.map((item, index) => `${item} → ${partners[index] ?? '–'}`).join(', ')}</German>
    }
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
