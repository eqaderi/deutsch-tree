/**
 * Learning engine: the rules of learning as pure functions. No interface, no
 * storage, no clock. Whatever is random comes in as a `Random`, so a caller
 * (and a test) decides the dice.
 */
import type { Question } from '../content-model/index.ts'

/** A source of randomness with the contract of Math.random: a number from 0 up to, not including, 1. */
export type Random = () => number

/**
 * One attempt: `size` different items of the pool, in random order. A pool
 * smaller than `size` gives the whole pool. Works for any pool, so a
 * checkpoint can draw across the pools of many nodes.
 */
export function drawAttempt<T>(pool: readonly T[], size: number, random: Random): T[] {
  const remaining = [...pool]
  const drawn: T[] = []
  while (drawn.length < size && remaining.length > 0) {
    const index = Math.floor(random() * remaining.length)
    drawn.push(...remaining.splice(index, 1))
  }
  return drawn
}

/** A node test is passed at 90%: the smallest whole number of questions that is at least 90% of the attempt. */
export function passMark(attemptSize: number): number {
  // Whole numbers only: 0.9 * 30 is a hair above 27 in floating point and would round up to 28.
  return Math.ceil((attemptSize * 9) / 10)
}

/**
 * What a learner gave for one question: the chosen option for multiple choice
 * and gap fill, true or false for a true/false question, the typed text for
 * a typed answer and a typed gap fill. A question type with another kind of
 * answer adds it here and gets a case in `checkAnswer`.
 */
export type Answer = string | boolean

export interface AnswerCheck {
  correct: boolean
  /** Why a right answer counts although it is not written exactly. Empty for an exact answer and for a wrong one. */
  notes: AnswerNote[]
  /** For a typed answer that is right: the accepted answer it stands for, written exactly. */
  accepted?: string
}

const wrong = (): AnswerCheck => ({ correct: false, notes: [] })

/** Is this answer right for this question? No answer is a wrong answer. */
export function checkAnswer(question: Question, answer: Answer | undefined): AnswerCheck {
  switch (question.type) {
    case 'multiple-choice':
    case 'gap-fill':
    case 'true-false':
      return { correct: answer === question.answer, notes: [] }
    case 'typed-answer':
    case 'typed-gap-fill':
      return typeof answer === 'string' ? checkTyped(answer, question.answers) : wrong()
  }
}

/**
 * The right answer to a question, as a result shows it. Where a question
 * accepts several answers, it is the first one listed.
 */
export function rightAnswer(question: Question): Answer {
  switch (question.type) {
    case 'multiple-choice':
    case 'gap-fill':
    case 'true-false':
      return question.answer
    case 'typed-answer':
    case 'typed-gap-fill':
      // The content model guarantees at least one accepted answer.
      return question.answers[0] ?? ''
  }
}

/**
 * A slip in a typed answer that is accepted, and said to the learner:
 * "umlaut-substitute" for ae, oe, ue or ss written in place of ä, ö, ü or ß,
 * "capitalisation" for a capital or a small letter in the wrong place.
 */
export type AnswerNote = 'umlaut-substitute' | 'capitalisation'

/**
 * Compares typed text with the accepted answers of a question. Any question
 * whose answer is typed uses this, whatever it asks for.
 *
 * Spaces at the ends and doubled spaces are ignored. An answer that then
 * differs from an accepted one only by the slips of `AnswerNote` is right,
 * and `notes` names those slips. Nothing else is forgiven: a missing word
 * (an article, say) or a missing letter is a wrong answer.
 *
 * Among several accepted answers, the one that needs the fewest notes counts.
 */
export function checkTyped(typed: string, accepted: readonly string[]): AnswerCheck {
  const given = spaced(typed)
  if (given === '') return wrong()
  for (const slips of SLIPS) {
    const found = accepted.find((answer) => sameBut(slips, given, spaced(answer)))
    if (found !== undefined) return { correct: true, notes: [...slips], accepted: found }
  }
  return wrong()
}

/** The slips an answer may be accepted with, from none to all. */
const SLIPS: AnswerNote[][] = [[], ['umlaut-substitute'], ['capitalisation'], ['umlaut-substitute', 'capitalisation']]

/** Whether `typed` is `exact` once the given slips are set aside. */
function sameBut(slips: AnswerNote[], typed: string, exact: string): boolean {
  if (slips.includes('capitalisation')) return sameBut(without(slips, 'capitalisation'), small(typed), small(exact))
  return slips.includes('umlaut-substitute') ? standsFor(typed, exact) : typed === exact
}

function without(slips: AnswerNote[], slip: AnswerNote): AnswerNote[] {
  return slips.filter((other) => other !== slip)
}

function small(text: string): string {
  return text.toLocaleLowerCase('de')
}

/** What may be typed in place of a letter that many keyboards lack. */
const SUBSTITUTES: Record<string, string[] | undefined> = {
  ä: ['ae'],
  ö: ['oe'],
  ü: ['ue'],
  ß: ['ss'],
  Ä: ['Ae', 'AE'],
  Ö: ['Oe', 'OE'],
  Ü: ['Ue', 'UE'],
  ẞ: ['SS'],
}

/**
 * Whether `typed` is `exact` with a substitute at some or all of the places
 * where `exact` has ä, ö, ü or ß. Only that way round: an umlaut typed where
 * the answer has "ae" is a wrong answer.
 */
function standsFor(typed: string, exact: string): boolean {
  let place = 0
  for (const letter of exact) {
    const written = [letter, ...(SUBSTITUTES[letter] ?? [])].find((spelling) => typed.startsWith(spelling, place))
    if (written === undefined) return false
    place += written.length
  }
  return place === typed.length
}

/** Text without spaces at its ends and with one space wherever it has several. Never worth a note. */
function spaced(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim()
}

export interface AttemptResult {
  /** How many questions the attempt had. */
  total: number
  /** How many were answered right. */
  correct: number
  /** How many had to be right to pass. */
  passMark: number
  passed: boolean
  /** Every question of the attempt, in order, with what was answered and how it was checked. */
  questions: AnsweredQuestion[]
}

/** One question of a finished attempt. An answer accepted with a note is `correct` and has `notes`. */
export interface AnsweredQuestion extends AnswerCheck {
  question: Question
  answer: Answer | undefined
}

/**
 * Scores an attempt. `answers` runs parallel to `questions`: the answer to
 * the third question is the third answer. A missing answer is a wrong one.
 */
export function scoreAttempt(questions: readonly Question[], answers: readonly (Answer | undefined)[]): AttemptResult {
  const checked = questions.map((question, index) => {
    const answer = answers[index]
    return { question, answer, ...checkAnswer(question, answer) }
  })
  const correct = checked.filter((item) => item.correct).length
  const mark = passMark(questions.length)
  const passed = questions.length > 0 && correct >= mark
  return { total: questions.length, correct, passMark: mark, passed, questions: checked }
}

/** What a learner has done with one node. */
export interface NodeProgress {
  /** The node's test was passed. Only a pass sets this; a failed test never clears it. */
  done: boolean
  /** How many tests of this node were finished, passed or not. */
  attempts: number
}

/**
 * Everything a learner has done, by node identifier. A node that was never
 * tested has no entry. The progress store saves this; the functions below are
 * the only place that decides how it changes.
 */
export interface Progress {
  nodes: Record<string, NodeProgress>
}

export function emptyProgress(): Progress {
  return { nodes: {} }
}

export function nodeProgress(progress: Progress, nodeId: string): NodeProgress {
  return progress.nodes[nodeId] ?? { done: false, attempts: 0 }
}

export function isDone(progress: Progress, nodeId: string): boolean {
  return nodeProgress(progress, nodeId).done
}

/**
 * The progress after a finished test of a node. Passing marks the node done;
 * failing never changes a done node. Returns new progress and leaves the
 * given one untouched. (A checkpoint changes no node: it does not call this.)
 */
export function applyAttempt(progress: Progress, nodeId: string, result: Pick<AttemptResult, 'passed'>): Progress {
  const before = nodeProgress(progress, nodeId)
  return {
    ...progress,
    nodes: { ...progress.nodes, [nodeId]: { done: before.done || result.passed, attempts: before.attempts + 1 } },
  }
}
