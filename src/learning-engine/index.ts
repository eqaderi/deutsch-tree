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
 * and gap fill, true or false for a true/false question. A question type with
 * another kind of answer adds it here and gets a case in `checkAnswer`.
 */
export type Answer = string | boolean

export interface AnswerCheck {
  correct: boolean
}

/** Is this answer right for this question? No answer is a wrong answer. */
export function checkAnswer(question: Question, answer: Answer | undefined): AnswerCheck {
  switch (question.type) {
    case 'multiple-choice':
    case 'gap-fill':
    case 'true-false':
      return { correct: answer === question.answer }
  }
}

export interface AttemptResult {
  /** How many questions the attempt had. */
  total: number
  /** How many were answered right. */
  correct: number
  /** How many had to be right to pass. */
  passMark: number
  passed: boolean
  /** Every question of the attempt, in order, with what was answered. */
  questions: Array<{ question: Question; answer: Answer | undefined; correct: boolean }>
}

/**
 * Scores an attempt. `answers` runs parallel to `questions`: the answer to
 * the third question is the third answer. A missing answer is a wrong one.
 */
export function scoreAttempt(questions: readonly Question[], answers: readonly (Answer | undefined)[]): AttemptResult {
  const checked = questions.map((question, index) => {
    const answer = answers[index]
    return { question, answer, correct: checkAnswer(question, answer).correct }
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
  /** How many tests of this node were finished, passed or not. An entered score counts as one. */
  attempts: number
  /**
   * The scores out of 100 that the learner typed in for this node, oldest
   * first. Only a node scored outside the app has them (a writing or speaking
   * exam part, graded by an AI assistant). Absent means: no score yet.
   */
  scores?: number[]
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
    nodes: {
      ...progress.nodes,
      [nodeId]: { ...before, done: before.done || result.passed, attempts: before.attempts + 1 },
    },
  }
}

// ---------------------------------------------------------------------------
// Scores that the learner types in (writing and speaking)
// ---------------------------------------------------------------------------

/** The highest score that can be entered. Writing and speaking are scored out of 100, like an exam module. */
export const FULL_SCORE = 100

/** An entered score passes at 90%, the pass mark of every node. */
export function scorePasses(score: number): boolean {
  return score >= passMark(FULL_SCORE)
}

/**
 * What a learner typed as a score, as a whole number from 0 to 100. Null for
 * anything else. Persian and Arabic digits count as digits, since a Persian
 * keyboard types them.
 */
export function readScore(typed: string): number | null {
  const latin = typed.trim().replace(/[۰-۹٠-٩]/g, (digit) => String(digit.charCodeAt(0) & 0xf))
  if (!/^\d{1,3}$/.test(latin)) return null
  const score = Number(latin)
  return score <= FULL_SCORE ? score : null
}

/** The scores entered for a node, oldest first. Empty when there is none yet. */
export function enteredScores(progress: Progress, nodeId: string): number[] {
  return nodeProgress(progress, nodeId).scores ?? []
}

/**
 * The progress after the learner entered a score out of 100 for a node. The
 * score is kept; 90 or more marks the node done; a lower score never changes
 * a done node. Returns new progress and leaves the given one untouched.
 */
export function applyEnteredScore(progress: Progress, nodeId: string, score: number): Progress {
  const after = applyAttempt(progress, nodeId, { passed: scorePasses(score) })
  const node = nodeProgress(after, nodeId)
  return { ...after, nodes: { ...after.nodes, [nodeId]: { ...node, scores: [...(node.scores ?? []), score] } } }
}
