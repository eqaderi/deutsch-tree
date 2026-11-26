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

/** The most questions one checkpoint asks. */
export const CHECKPOINT_SIZE = 30

/** The most questions one node gives to a checkpoint. */
export const CHECKPOINT_MOST_PER_NODE = 5

/** What a published node brings to the checkpoint of its level: its pool. */
export interface CheckpointSource {
  nodeId: string
  questions: readonly Question[]
}

/** One question of a checkpoint, with the node it came from. */
export interface CheckpointQuestion {
  nodeId: string
  question: Question
}

export interface Checkpoint {
  /** In the order they are asked. */
  questions: CheckpointQuestion[]
  /** The nodes that gave a question, in the order the nodes were given: the curriculum order. */
  nodeIds: string[]
}

/**
 * The checkpoint of a level, drawn across the pools of its published nodes.
 *
 * Questions are dealt in rounds. A round gives one question to every node
 * that has one left; when fewer questions remain to be dealt than that, the
 * nodes that get one are drawn at random. Dealing stops at `CHECKPOINT_SIZE`
 * questions or after `CHECKPOINT_MOST_PER_NODE` rounds. So:
 *   - up to 6 nodes: 5 questions of each (1 node: 5 questions, 2 nodes: 10);
 *   - 7 to 29 nodes: 30 questions, every node in, no node more than one ahead of another;
 *   - 30 nodes or more: 30 nodes drawn at random, each with the same chance, one question of each.
 */
export function drawCheckpoint(sources: readonly CheckpointSource[], random: Random): Checkpoint {
  const hands = sources.map(({ nodeId, questions }) => ({
    nodeId,
    questions: drawAttempt(questions, CHECKPOINT_MOST_PER_NODE, random),
  }))

  const dealt: CheckpointQuestion[] = []
  for (let round = 0; round < CHECKPOINT_MOST_PER_NODE && dealt.length < CHECKPOINT_SIZE; round += 1) {
    const stillIn = hands.filter((hand) => hand.questions.length > round)
    for (const { nodeId, questions } of drawAttempt(stillIn, CHECKPOINT_SIZE - dealt.length, random)) {
      const question = questions[round]
      if (question) dealt.push({ nodeId, question })
    }
  }
  const asked = new Set(dealt.map(({ nodeId }) => nodeId))
  return { questions: dealt, nodeIds: sources.map(({ nodeId }) => nodeId).filter((nodeId) => asked.has(nodeId)) }
}

/** What a finished checkpoint says. It has no pass mark: a checkpoint is advice. */
export interface CheckpointResult {
  /** How many questions the checkpoint had. */
  total: number
  /** How many were answered right. */
  correct: number
  /** Every question of the checkpoint, in order, with its node and what was answered. */
  questions: Array<CheckpointQuestion & { answer: Answer | undefined; correct: boolean }>
  /** The nodes with a wrong answer, in curriculum order. */
  nodesToRevisit: Array<{ nodeId: string; asked: number; wrong: number }>
}

/**
 * Scores a checkpoint and reports the nodes with wrong answers. `answers`
 * runs parallel to the checkpoint's questions; a missing answer is a wrong
 * one. It takes no progress and gives none back: a checkpoint changes no
 * node, whatever the score.
 */
export function scoreCheckpoint(checkpoint: Checkpoint, answers: readonly (Answer | undefined)[]): CheckpointResult {
  const questions = checkpoint.questions.map((asked, index) => {
    const answer = answers[index]
    return { ...asked, answer, correct: checkAnswer(asked.question, answer).correct }
  })
  const nodesToRevisit = checkpoint.nodeIds
    .map((nodeId) => {
      const ofNode = questions.filter((item) => item.nodeId === nodeId)
      return { nodeId, asked: ofNode.length, wrong: ofNode.filter((item) => !item.correct).length }
    })
    .filter((node) => node.wrong > 0)
  return {
    total: questions.length,
    correct: questions.filter((item) => item.correct).length,
    questions,
    nodesToRevisit,
  }
}
