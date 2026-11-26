/**
 * Learning engine: the rules of learning as pure functions. No interface, no
 * storage, no clock. Whatever is random comes in as a `Random`, so a caller
 * (and a test) decides the dice.
 */
import type { NodeSummary, Question } from '../content-model/index.ts'

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

/**
 * A point at which a learner has done enough that losing it would hurt: the
 * app then suggests exporting progress to a file, once per milestone.
 */
export type Milestone =
  /** Every topic of the level that can be taken is done. */
  | { id: string; kind: 'level'; level: string }
  /** This many topics are done, counted in steps of TOPICS_PER_MILESTONE. */
  | { id: string; kind: 'topics'; count: number }

export const TOPICS_PER_MILESTONE = 10

/**
 * The milestones this progress has reached: first the finished levels, in
 * the order of `nodes` (the content index, in curriculum order), then the
 * latest step of done topics.
 *
 * A level is finished when all its published topics are done and it has at
 * least one; a topic that is coming soon cannot hold a level open. Done
 * topics are counted from the progress alone, so a topic the content no
 * longer has still counts.
 */
export function milestonesReached(
  nodes: ReadonlyArray<Pick<NodeSummary, 'id' | 'level' | 'status'>>,
  progress: Progress,
): Milestone[] {
  const reached: Milestone[] = []

  const published = nodes.filter((node) => node.status === 'published')
  for (const level of new Set(published.map((node) => node.level))) {
    if (published.every((node) => node.level !== level || isDone(progress, node.id))) {
      reached.push({ id: `level:${level}`, kind: 'level', level })
    }
  }

  const done = doneCount(progress)
  const count = done - (done % TOPICS_PER_MILESTONE)
  if (count > 0) reached.push({ id: `topics:${count}`, kind: 'topics', count })

  return reached
}

/**
 * The one milestone worth telling the learner about, if any: the latest
 * finished level whose identifier is not in `acknowledged`, or else the
 * count of done topics.
 */
export function milestoneToMention(
  reached: readonly Milestone[],
  acknowledged: readonly string[],
): Milestone | undefined {
  const fresh = reached.filter((milestone) => !acknowledged.includes(milestone.id))
  return fresh.findLast((milestone) => milestone.kind === 'level') ?? fresh[0]
}

/** How many topics are done. */
export function doneCount(progress: Progress): number {
  return Object.values(progress.nodes).filter((node) => node.done).length
}
