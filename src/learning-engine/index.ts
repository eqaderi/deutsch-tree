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
  /**
   * The module scores the learner recorded for official mock exams, by exam
   * identifier. Absent means that nothing was recorded.
   */
  officialExams?: Record<string, ModuleScores>
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

// ---------------------------------------------------------------------------
// Official mock exams and readiness
// ---------------------------------------------------------------------------

/** The four modules of the Goethe B1 exam, in the order of the exam. */
export const EXAM_MODULES = ['reading', 'listening', 'writing', 'speaking'] as const
export type ExamModule = (typeof EXAM_MODULES)[number]

/**
 * The scores of one mock exam: points out of 100 for each module. A module
 * with no score was not recorded yet. The learner types these in, and they
 * are trusted.
 */
export type ModuleScores = Partial<Record<ExamModule, number>>

/** Readiness: this score or more in every module… */
export const READINESS_SCORE = 90
/** …on this many official mock exams. */
export const READINESS_EXAMS = 2

/** What the learner recorded for one official mock exam. Empty when nothing was. */
export function officialExamScores(progress: Progress, examId: string): ModuleScores {
  return progress.officialExams?.[examId] ?? {}
}

/**
 * The progress after the learner recorded the scores of one official mock
 * exam. The scores given replace what was recorded for that exam before; a
 * module left out is "not recorded". Returns new progress.
 */
export function recordOfficialExamScores(progress: Progress, examId: string, scores: ModuleScores): Progress {
  const kept: ModuleScores = {}
  for (const module of EXAM_MODULES) {
    const score = scores[module]
    if (score !== undefined) kept[module] = score
  }
  const { [examId]: _before, ...others } = progress.officialExams ?? {}
  return { ...progress, officialExams: Object.keys(kept).length > 0 ? { ...others, [examId]: kept } : others }
}

/** A module is scored in whole points from 0 to this. */
export const MAXIMUM_SCORE = 100

/**
 * What the learner typed into a score field: the score, 'none' for an empty
 * field (the module is not recorded), or 'invalid' for anything that is not
 * a whole number from 0 to 100. Persian and Arabic digits are read too.
 */
export function readScore(typed: string): number | 'none' | 'invalid' {
  const text = typed.trim()
  if (text === '') return 'none'
  const latin = text
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
  if (!/^\d{1,4}$/.test(latin)) return 'invalid'
  const score = Number(latin)
  return score <= MAXIMUM_SCORE ? score : 'invalid'
}

/** How one official mock exam stands against the readiness rule. */
export interface ExamReadiness {
  id: string
  /** At least one module score is recorded. */
  started: boolean
  /** Every module is recorded at the readiness score or more. */
  met: boolean
  /** The modules recorded under the readiness score, in exam order. */
  below: Array<{ module: ExamModule; score: number }>
  /** The modules with no score recorded, in exam order. */
  notRecorded: ExamModule[]
}

export interface Readiness {
  /** The learner has reached the target and can book the exam. */
  ready: boolean
  /** How many official mock exams must meet the target. */
  needed: number
  /** How many do. */
  met: number
  /** How many more are needed. 0 when ready. */
  missing: number
  /** Every official mock exam, in the order given. */
  exams: ExamReadiness[]
}

/**
 * The readiness rule: 90 or more in every module on two official mock exams,
 * as recorded by the learner. `officialExamIds` are the exams that count, in
 * the order the content lists them; a score recorded for any other exam is
 * ignored.
 */
export function readiness(progress: Progress, officialExamIds: readonly string[]): Readiness {
  const exams = officialExamIds.map((id): ExamReadiness => {
    const scores = officialExamScores(progress, id)
    const below: ExamReadiness['below'] = []
    const notRecorded: ExamModule[] = []
    for (const module of EXAM_MODULES) {
      const score = scores[module]
      if (score === undefined) notRecorded.push(module)
      else if (score < READINESS_SCORE) below.push({ module, score })
    }
    return {
      id,
      started: notRecorded.length < EXAM_MODULES.length,
      met: below.length === 0 && notRecorded.length === 0,
      below,
      notRecorded,
    }
  })
  const met = exams.filter((exam) => exam.met).length
  return {
    ready: met >= READINESS_EXAMS,
    needed: READINESS_EXAMS,
    met,
    missing: Math.max(0, READINESS_EXAMS - met),
    exams,
  }
}
