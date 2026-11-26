import type {
  GapFillQuestion,
  MultipleChoiceQuestion,
  Question,
  TrueFalseQuestion,
  TypedAnswerQuestion,
  TypedGapFillQuestion,
} from '../../src/content-model/index.ts'

const explanation = { en: ['Because.'], fa: ['چون.'], de: ['Darum.'] }

export function multipleChoice(id: string, answer: string, others: string[]): MultipleChoiceQuestion {
  return { id, type: 'multiple-choice', prompt: `Prompt of ${id}`, options: [...others, answer], answer, explanation }
}

export function gapFill(id: string, answer: string, others: string[]): GapFillQuestion {
  return {
    id,
    type: 'gap-fill',
    prompt: `Gap of ${id}: ___`,
    options: [answer, ...others],
    answer,
    explanation,
    gap: { before: `Gap of ${id}: `, after: '' },
  }
}

export function trueFalse(id: string, answer: boolean): TrueFalseQuestion {
  return { id, type: 'true-false', prompt: `Sentence of ${id}`, answer, explanation }
}

/** A typed answer question that accepts each of `answers`. */
export function typedAnswer(id: string, answers: string[]): TypedAnswerQuestion {
  return { id, type: 'typed-answer', prompt: `Prompt of ${id}`, answers, explanation }
}

/** A typed gap fill question whose gap accepts each of `answers`. */
export function typedGapFill(id: string, answers: string[]): TypedGapFillQuestion {
  return {
    id,
    type: 'typed-gap-fill',
    prompt: `Gap of ${id}: ___`,
    answers,
    explanation,
    gap: { before: `Gap of ${id}: `, after: '' },
  }
}

/** `count` multiple choice questions, q1 to q<count>, each with the right answer "right". */
export function questions(count: number): Question[] {
  return Array.from({ length: count }, (_, index) => multipleChoice(`q${index + 1}`, 'right', ['wrong']))
}
