/**
 * Learning engine: the rules of learning as pure functions. No interface, no
 * storage, no clock. Whatever is random comes in as a `Random`, so a caller
 * (and a test) decides the dice.
 */
import type { NodeStatus, Question } from '../content-model/index.ts'

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

// ---------------------------------------------------------------------------
// Finding the way: a node's state, the next recommended node, counts
// ---------------------------------------------------------------------------

/** Where a learner stands with one node. "Coming soon" is not a state: it is the node's status in the content. */
export type NodeState = 'not-started' | 'in-progress' | 'done'

/**
 * A node is in progress when the learner has finished at least one test of
 * it (or entered a score for it) and it is not done. Reading a page starts
 * nothing: only a result does.
 */
export function nodeState(progress: Progress, nodeId: string): NodeState {
  const { done, attempts } = nodeProgress(progress, nodeId)
  if (done) return 'done'
  return attempts > 0 ? 'in-progress' : 'not-started'
}

/**
 * The progress after the learner un-marked a done node, to come back to a
 * topic they have forgotten. The node is not done any more; everything else
 * recorded for it stays, so it reads as in progress. A node that is not done
 * is left as it is. Returns new progress and leaves the given one untouched.
 */
export function unmarkDone(progress: Progress, nodeId: string): Progress {
  const before = nodeProgress(progress, nodeId)
  if (!before.done) return progress
  return { ...progress, nodes: { ...progress.nodes, [nodeId]: { ...before, done: false } } }
}

/** What the rules below need to know about a node of the curriculum. A node summary of the content index fits. */
export interface CurriculumNode {
  id: string
  status: NodeStatus
}

/**
 * The next recommended node: the earliest node in the curriculum order that
 * is published and not done, whatever its kind or level. `curriculum` is
 * every node in curriculum order, as the content index lists them. Undefined
 * when every published node is done, or when nothing is published.
 *
 * It only recommends. Nothing is ever locked: any published node can be
 * opened and tested at any time.
 */
export function nextRecommended<Node extends CurriculumNode>(
  curriculum: readonly Node[],
  progress: Progress,
): Node | undefined {
  return curriculum.find((node) => node.status === 'published' && !isDone(progress, node.id))
}

/**
 * Where the learner is on the way through the curriculum: at the next
 * recommended node, or, when every published node is done, at the first node
 * that is still to be written. Undefined when every node is done: the learner
 * is past the last node, at the exam.
 */
export function youAreHere<Node extends CurriculumNode>(
  curriculum: readonly Node[],
  progress: Progress,
): Node | undefined {
  return nextRecommended(curriculum, progress) ?? curriculum.find((node) => !isDone(progress, node.id))
}

export interface NodeCounts {
  /** Every node counted, written or not. */
  total: number
  done: number
  /** Every node that is not done. `done + remaining` is `total`. */
  remaining: number
  /** How many of the remaining nodes are not written yet, so cannot be done today. */
  comingSoon: number
}

/**
 * Done and remaining nodes among `nodes`: pass the nodes of one level, of one
 * kind or of one chapter to count that part of the tree.
 *
 * A "coming soon" node counts as remaining. The counts measure the way to the
 * exam, so one done node out of 212 is "1 done, 211 left" even while only that
 * one is written; `comingSoon` says how many of the 211 have to wait.
 */
export function countNodes(nodes: readonly CurriculumNode[], progress: Progress): NodeCounts {
  const done = nodes.filter((node) => isDone(progress, node.id)).length
  const comingSoon = nodes.filter((node) => node.status === 'coming-soon' && !isDone(progress, node.id)).length
  return { total: nodes.length, done, remaining: nodes.length - done, comingSoon }
}
