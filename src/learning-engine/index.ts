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
 * and gap fill, true or false for a true/false question, the typed text for
 * a typed answer and a typed gap fill, the place of the picked word for find
 * the error, the pieces placed so far (in their order) for word ordering, the
 * partner chosen for each item (null where none is chosen yet) for matching.
 * A question type with another kind of answer adds it here and gets a case
 * in `checkAnswer`, `rightAnswer` and `isAnswered`.
 */
export type Answer = string | boolean | number | Array<string | null>

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
    case 'find-error':
      return { correct: answer === question.answer, notes: [] }
    case 'typed-answer':
    case 'typed-gap-fill':
      return typeof answer === 'string' ? checkTyped(answer, question.answers) : wrong()
    case 'word-order':
      return { correct: question.answers.some((order) => sameList(order, answer)), notes: [] }
    case 'matching':
      return { correct: sameList(question.answer, answer), notes: [] }
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
    case 'find-error':
    case 'matching':
      return question.answer
    case 'typed-answer':
    case 'typed-gap-fill':
      // The content model guarantees at least one accepted answer.
      return question.answers[0] ?? ''
    case 'word-order':
      return question.answers[0] ?? []
  }
}

/**
 * Has the learner given a whole answer, so that the test may move on? An
 * answer that is built in steps is not whole until its last step.
 */
export function isAnswered(question: Question, answer: Answer | undefined): boolean {
  switch (question.type) {
    case 'multiple-choice':
    case 'gap-fill':
    case 'true-false':
    case 'find-error':
    case 'typed-answer':
    case 'typed-gap-fill':
      return answer !== undefined
    case 'word-order':
      return Array.isArray(answer) && answer.length === question.pieces.length
    case 'matching':
      return Array.isArray(answer) && question.left.every((_, index) => typeof answer[index] === 'string')
  }
}

/** Is `answer` a list with exactly the items of `list`, in the same order? */
function sameList(list: readonly unknown[], answer: Answer | undefined): boolean {
  return Array.isArray(answer) && answer.length === list.length && list.every((item, index) => item === answer[index])
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
  /**
   * The module scores the learner recorded for official mock exams, by exam
   * identifier. An exam with nothing recorded has no entry.
   */
  officialExams: Record<string, ModuleScores>
}

export function emptyProgress(): Progress {
  return { nodes: {}, officialExams: {} }
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

/**
 * Whether anything at all has been recorded, so that replacing the progress
 * would lose something. Every field of `Progress` is a list or a record that
 * starts empty; a field of another kind needs its own line here.
 */
export function hasProgress(progress: Progress): boolean {
  return Object.values(progress).some((field) => Object.keys(field).length > 0)
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
  return progress.officialExams[examId] ?? {}
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
  const { [examId]: _before, ...others } = progress.officialExams
  return { ...progress, officialExams: Object.keys(kept).length > 0 ? { ...others, [examId]: kept } : others }
}

/** A module is scored in whole points from 0 to this. */
export const MAXIMUM_SCORE = 100

/** Is this a module score: a whole number from 0 to 100? */
export function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAXIMUM_SCORE
}

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
  return isScore(score) ? score : 'invalid'
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

/** How one official mock exam stands, from what the learner recorded for it. */
export function examStanding(progress: Progress, examId: string): ExamReadiness {
  const scores = officialExamScores(progress, examId)
  const below: ExamReadiness['below'] = []
  const notRecorded: ExamModule[] = []
  for (const module of EXAM_MODULES) {
    const score = scores[module]
    if (score === undefined) notRecorded.push(module)
    else if (score < READINESS_SCORE) below.push({ module, score })
  }
  return {
    id: examId,
    started: notRecorded.length < EXAM_MODULES.length,
    met: below.length === 0 && notRecorded.length === 0,
    below,
    notRecorded,
  }
}

/**
 * The readiness rule: 90 or more in every module on two official mock exams,
 * as recorded by the learner. `officialExamIds` are the exams that count, in
 * the order the content lists them; a score recorded for any other exam is
 * ignored.
 */
export function readiness(progress: Progress, officialExamIds: readonly string[]): Readiness {
  const exams = officialExamIds.map((id) => examStanding(progress, id))
  const met = exams.filter((exam) => exam.met).length
  return {
    ready: met >= READINESS_EXAMS,
    needed: READINESS_EXAMS,
    met,
    missing: Math.max(0, READINESS_EXAMS - met),
    exams,
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
 * The checkpoint of a level, drawn across the pools of its published nodes,
 * which are given in curriculum order. A node without questions gives none.
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
