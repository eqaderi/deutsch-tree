/**
 * Learning engine: the rules of learning as pure functions. No interface, no
 * storage, no clock. Whatever is random comes in as a `Random`, so a caller
 * (and a test) decides the dice.
 */
import {
  asLearned,
  type Localised,
  type NodeStatus,
  type NodeSummary,
  type Question,
  type RichText,
  type VocabularyWord,
} from '../content-model/index.ts'

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

/**
 * The questions of one attempt at a test, drawn from a node's pool.
 *
 * Two questions about the same word (a vocabulary node asks every word in
 * both directions) give each other away, so an attempt asks about a word
 * once, and takes the directions in turn: as many questions from German as
 * into German, or one more of either. Only a pool with fewer words than
 * `size` asks a word both ways. A pool without such questions is drawn as
 * `drawAttempt` draws it.
 */
export function drawQuestions(pool: readonly Question[], size: number, random: Random): Question[] {
  const about = new Map<string, Question[]>()
  for (const question of pool) {
    const subject = 'word' in question ? `word ${question.word}` : `question ${about.size}`
    about.set(subject, [...(about.get(subject) ?? []), question])
  }
  const subjects = drawAttempt([...about.values()], size, random)

  // Which of a word's questions comes first is drawn once; after that they take turns.
  let turn = subjects.some((questions) => questions.length > 1) ? Math.floor(random() * 2) : 0
  const drawn = subjects.map((questions) => {
    if (questions.length > 1) turn += 1
    return questions[turn % questions.length] as Question
  })
  if (drawn.length === size) return drawn

  const left = pool.filter((question) => !drawn.includes(question))
  return [...drawn, ...drawAttempt(left, size - drawn.length, random)]
}

/**
 * The practice task of the next attempt at an exam part. A task is always
 * taken whole, so an attempt is one task and not a draw of items. After a
 * task, the next attempt takes another one, so that a retry is not the text
 * the learner has just seen with its answers; a part with a single task gives
 * that task again. `last` is the task of the attempt before, if there was one.
 */
export function nextTask<T>(tasks: readonly T[], last: T | undefined, random: Random): T | undefined {
  const others = tasks.filter((task) => task !== last)
  return drawAttempt(others.length > 0 ? others : tasks, 1, random)[0]
}

/**
 * A node test is passed at 90%: the smallest whole number of questions that
 * is at least 90% of the attempt. The same rule holds for a practice task of
 * an exam part, counted over the items of the task, so a task of up to nine
 * items is passed only with every item right.
 */
export function passMark(attemptSize: number): number {
  // Whole numbers only: 0.9 * 30 is a hair above 27 in floating point and would round up to 28.
  return Math.ceil((attemptSize * 9) / 10)
}

/**
 * What a learner gave for one question: the chosen option for multiple choice
 * and gap fill, true or false for a true/false question and for a
 * Richtig/Falsch or a Ja/Nein item of an exam task, the id of the chosen text
 * or speaker for an item that chooses among them, the typed text for a typed answer and
 * a typed gap fill, the place of the picked word for find the error, the
 * pieces placed so far (in their order) for word ordering, the partner chosen
 * for each item (null where none is chosen yet) for matching. A question type
 * with another kind of answer adds it here and gets a case in `checkAnswer`,
 * `rightAnswer` and `isAnswered`.
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
    case 'richtig-falsch':
    case 'ja-nein':
    case 'which-text':
    case 'who-says':
    case 'find-error':
      return { correct: answer === question.answer, notes: [] }
    case 'typed-answer':
    case 'typed-gap-fill':
      return typeof answer === 'string' ? checkTyped(answer, question.answers) : wrong()
    case 'meaning-of-word':
      return { correct: answer === question.answer, notes: [] }
    case 'word-for-meaning':
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
    case 'richtig-falsch':
    case 'ja-nein':
    case 'which-text':
    case 'who-says':
    case 'find-error':
    case 'matching':
      return question.answer
    case 'typed-answer':
    case 'typed-gap-fill':
      // The content model guarantees at least one accepted answer.
      return question.answers[0] ?? ''
    case 'meaning-of-word':
      return question.answer
    case 'word-for-meaning':
      return question.answers[0] ?? ''
    case 'word-order':
      return question.answers[0] ?? []
  }
}

/** How many meanings a `meaning-of-word` question offers, the right one among them, where the node has that many. */
export const MEANINGS_OFFERED = 4

/**
 * The pool of a vocabulary node, made from its words: every word is asked in
 * both directions. The same words always give the same pool, so the pool that
 * was reviewed is the pool a learner is asked.
 *
 * From German (`meaning-of-word`) the learner reads the word as it is learned
 * and chooses its meaning among the meanings of other words of the node:
 * words of the same class before others, and never a word that either of the
 * two names in `tooCloseTo`.
 *
 * Into German (`word-for-meaning`) the learner reads the meaning and types
 * the word as it is learned: a noun with its article. The accepted answers
 * are that form and what the word lists under `alsoAccepted`, so a noun
 * without its article, or with another one, is a wrong answer.
 *
 * The reason of both questions is the word with its meaning and its example
 * sentence.
 */
export function vocabularyPool(words: readonly VocabularyWord[]): Question[] {
  const ids = questionIds(words)
  return words.flatMap((word, index): Question[] => {
    const id = ids[index] ?? ''
    const meaning: Localised = { ...word.meaning, de: word.definition }
    const learned = asLearned(word)
    const explanation: Localised<RichText> = {
      en: [{ de: learned }, `: ${word.meaning.en}. `, { de: word.example.de }],
      fa: [{ de: learned }, `: ${word.meaning.fa}. `, { de: word.example.de }],
      de: [{ de: `${learned}: ${word.definition}. ${word.example.de}` }],
    }
    return [
      {
        id: `${id}-meaning`,
        type: 'meaning-of-word',
        word: word.word,
        prompt: learned,
        options: mixed([word, ...wrongOptions(word, words)], word.word).map((option) => ({
          word: option.word,
          meaning: { ...option.meaning, de: option.definition },
        })),
        answer: word.word,
        explanation,
      },
      {
        id: `${id}-word`,
        type: 'word-for-meaning',
        word: word.word,
        prompt: meaning,
        answers: [learned, ...word.alsoAccepted],
        explanation,
      },
    ]
  })
}

/** The words whose meanings are offered beside the meaning of `word`: the same every time. */
function wrongOptions(word: VocabularyWord, words: readonly VocabularyWord[]): VocabularyWord[] {
  const tooClose = (other: VocabularyWord) =>
    word.tooCloseTo.includes(other.word) || other.tooCloseTo.includes(word.word)
  const others = mixed(
    words.filter((other) => other.word !== word.word && !tooClose(other)),
    word.word,
  )
  const sameClass = others.filter((other) => other.class === word.class)
  const otherClass = others.filter((other) => other.class !== word.class)
  return [...sameClass, ...otherClass].slice(0, MEANINGS_OFFERED - 1)
}

/**
 * The words in an order that looks random and is always the same for the
 * same `seed`. Adding a word to a node moves no other word in it.
 */
function mixed(words: readonly VocabularyWord[], seed: string): VocabularyWord[] {
  const rank = (word: VocabularyWord) => fingerprint(`${seed}\u0000${word.word}`)
  return [...words].sort((a, b) => rank(a) - rank(b) || (a.word < b.word ? -1 : 1))
}

/** A number that depends on every letter of the text (FNV-1a, with a last stir so that near texts land far apart). */
function fingerprint(text: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193)
  }
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x2c1b3c6d)
  return (hash ^ (hash >>> 12)) >>> 0
}

/**
 * The start of the question ids of each word: a short code made from the
 * word, the same every time and for every place of the word in its node. It
 * is a code and not the word because an id is shown: in the address of the
 * "report a problem" link of a question that asks for the word, and on the
 * sheet of the reviewer who answers the pool without its key.
 */
function questionIds(words: readonly VocabularyWord[]): string[] {
  const code = (text: string) => `w${fingerprint(text).toString(36).padStart(7, '0')}`
  const taken = new Set<string>()
  return words.map((word) => {
    let id = code(word.word)
    for (let again = 1; taken.has(id); again += 1) id = code(`${word.word}\u0000${again}`)
    taken.add(id)
    return id
  })
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
    case 'richtig-falsch':
    case 'ja-nein':
    case 'which-text':
    case 'who-says':
    case 'find-error':
    case 'typed-answer':
    case 'typed-gap-fill':
    case 'meaning-of-word':
    case 'word-for-meaning':
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
 *
 * An exam task is scored with this too: `scoreAttempt(task.items, answers)`
 * gives the result per item. A mock exam adds up `correct` over its parts and
 * leaves `passMark` and `passed`, which are the rule of a node, aside.
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
  /**
   * The module scores the learner recorded for official mock exams, by exam
   * identifier. An exam with nothing recorded has no entry.
   */
  officialExams: Record<string, ModuleScores>
  /**
   * Every module of an original mock exam that the learner finished, oldest
   * first. A result is never changed or replaced: this is the history.
   */
  mockExams: MockModuleResult[]
}

export function emptyProgress(): Progress {
  return { nodes: {}, officialExams: {}, mockExams: [] }
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
 * The module of an exam-part node as the engine names modules. A node file
 * says `module: lesen`, with the exam's own word, because its id does
 * ("exam-lesen-1"); scores are kept under the names above.
 */
export function examModuleOf(module: NonNullable<NodeSummary['module']>): ExamModule {
  return ({ lesen: 'reading', hoeren: 'listening', schreiben: 'writing', sprechen: 'speaking' } as const)[module]
}

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
 * Lesen and Hören: right items brought to a score out of 100, in whole
 * points. Every item counts the same, so 27 of 30 is 90.
 */
export function examScore(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * MAXIMUM_SCORE)
}

/** The right answer to one item of an answer sheet, as a book's answer key gives it. */
export interface KeyedAnswer {
  /** The item's number as printed, for example 7. */
  item: number
  answer: string
}

/** One item of a checked answer sheet. */
export interface SheetItemResult {
  item: number
  /** What the learner marked; undefined for an item left empty. */
  given: string | undefined
  right: string
  correct: boolean
}

export interface SheetResult {
  total: number
  correct: number
  /** Out of 100. */
  score: number
  /** In the order of the key. */
  items: SheetItemResult[]
}

/**
 * Checks an answer sheet (a private pack's part) against the book's answer
 * key. `given` holds the learner's choice by item number; an empty item is
 * wrong. A choice is right when it is the key's, spelled the same.
 */
export function scoreAnswerSheet(
  key: readonly KeyedAnswer[],
  given: Readonly<Partial<Record<number, string>>>,
): SheetResult {
  const items = key.map(({ item, answer }) => ({
    item,
    given: given[item],
    right: answer,
    correct: given[item] === answer,
  }))
  const correct = items.filter((item) => item.correct).length
  return { total: items.length, correct, score: examScore(correct, items.length), items }
}

/** A module over the results of its parts: right items (or points) of all parts, and the score out of 100. */
export function scoreModule(parts: ReadonlyArray<{ total: number; correct: number }>): {
  total: number
  correct: number
  score: number
} {
  const total = parts.reduce((sum, part) => sum + part.total, 0)
  const correct = parts.reduce((sum, part) => sum + part.correct, 0)
  return { total, correct, score: examScore(correct, total) }
}

// ---------------------------------------------------------------------------
// Original mock exams: a finished module, its score and the history
// ---------------------------------------------------------------------------

/** A module of the exam is passed with this score or more. */
export const PASS_SCORE = 60

/**
 * One part of a finished mock exam module. For Lesen and Hören: the items of
 * the part and how many were right. A module whose parts are graded in
 * points (Schreiben, Sprechen) gives the points reached as `correct` and the
 * points the part is worth as `total`, so its score is reached the same way.
 */
export interface MockPartResult {
  /** The part's number in its module: Teil 1 is 1. */
  part: number
  correct: number
  total: number
}

/** A module of an original mock exam, finished: what the history keeps. */
export interface MockModuleResult {
  /** The id of the mock exam. */
  exam: string
  module: ExamModule
  /** When the module was finished, as an ISO date and time. */
  finished: string
  /** Whether it was taken with the time limit of the exam. */
  timed: boolean
  /** Out of 100, over all the parts. */
  score: number
  /** Every part, in the order of the module. */
  parts: MockPartResult[]
}

/** The result of a finished module, scored out of 100 over all its parts (27 of 30 is 90). */
export function mockModuleResult(finished: Omit<MockModuleResult, 'score'>): MockModuleResult {
  const { exam, module, finished: at, timed, parts } = finished
  return { exam, module, finished: at, timed, score: scoreModule(parts).score, parts }
}

/** Where a module score stands: under the pass mark of 60, passed, or at the target of 90 or more. */
export function scoreStanding(score: number): 'not-passed' | 'passed' | 'at-target' {
  if (score >= READINESS_SCORE) return 'at-target'
  return score >= PASS_SCORE ? 'passed' : 'not-passed'
}

/** The progress with one more finished module in the history. Returns new progress. */
export function recordMockExamResult(progress: Progress, result: MockModuleResult): Progress {
  return { ...progress, mockExams: [...progress.mockExams, result] }
}

/** The finished modules of mock exams, the latest first; of one exam only when `examId` is given. */
export function mockExamHistory(progress: Progress, examId?: string): MockModuleResult[] {
  return progress.mockExams
    .filter((result) => examId === undefined || result.exam === examId)
    .toSorted((a, b) => (a.finished < b.finished ? 1 : a.finished > b.finished ? -1 : 0))
}

/**
 * The seconds left of a time limit of `minutes` that began at `startedAt`
 * (milliseconds, like Date.now()), at the moment `now`. The last second
 * counts until it is over; 0 when time is up.
 */
export function timeLeft(minutes: number, startedAt: number, now: number): number {
  return Math.max(0, Math.ceil((minutes * 60_000 - (now - startedAt)) / 1000))
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
    questions: drawQuestions(questions, CHECKPOINT_MOST_PER_NODE, random),
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

/**
 * The vocabulary nodes the learner has started, in curriculum order: the
 * published ones that are done or in progress (`nodeState`). These are the
 * nodes whose words go into one Anki file. Opening a page starts nothing.
 */
export function startedVocabulary<Node extends CurriculumNode & Pick<NodeSummary, 'kind'>>(
  curriculum: readonly Node[],
  progress: Progress,
): Node[] {
  return curriculum.filter(
    (node) =>
      node.kind === 'vocabulary' && node.status === 'published' && nodeState(progress, node.id) !== 'not-started',
  )
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

// ---------------------------------------------------------------------------
// Scores that the learner types in (writing and speaking)
// ---------------------------------------------------------------------------

/** An entered score passes at 90%, the pass mark of every node. */
export function scorePasses(score: number): boolean {
  return score >= passMark(MAXIMUM_SCORE)
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
