import type {
  GapFillQuestion,
  MultipleChoiceQuestion,
  Question,
  TrueFalseQuestion,
} from '../../src/content-model/index.ts'

const explanation = { en: ['Because.'], fa: ['چون.'], de: ['Darum.'] }

export function multipleChoice(id: string, answer: string, others: string[]): MultipleChoiceQuestion {
  return { id, type: 'multiple-choice', prompt: `Prompt of ${id}`, options: [...others, answer], answer, explanation }
}

export function gapFill(id: string, answer: string, others: string[]): GapFillQuestion {
  return { id, type: 'gap-fill', prompt: `Gap of ${id}: ___`, options: [answer, ...others], answer, explanation }
}

export function trueFalse(id: string, answer: boolean): TrueFalseQuestion {
  return { id, type: 'true-false', prompt: `Sentence of ${id}`, answer, explanation }
}

/** `count` multiple choice questions, q1 to q<count>, each with the right answer "right". */
export function questions(count: number): Question[] {
  return Array.from({ length: count }, (_, index) => multipleChoice(`q${index + 1}`, 'right', ['wrong']))
}
