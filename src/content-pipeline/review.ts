/**
 * Blind review of what a node asks (its question pool, the items of its
 * practice tasks with their texts, and for a vocabulary node the questions
 * made from its words), and the review record that proves it.
 */
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { parse as parseYaml, stringify as toYaml } from 'yaml'
import { z } from 'zod'
import {
  type ItemTaskFile,
  LANGUAGES,
  type Language,
  type MockExamFile,
  mockExamFileSchema,
  type NodeFile,
  nodeFileSchema,
  type Question,
} from '../content-model/index.ts'
import { de } from '../language/strings.de.ts'
import { fa } from '../language/strings.fa.ts'
import { en } from '../language/strings.ts'
import { checkTyped } from '../learning-engine/index.ts'
import { mixed } from './mix.ts'
import { MOCK_EXAMS_FOLDER, mockExamTasks } from './mock-exams.ts'
import { vocabularyQuestions } from './vocabulary.ts'

type PoolQuestionFile = NonNullable<NodeFile['questions']>[number]
/** A question of a pool, or an item of a practice task. */
type QuestionFile = PoolQuestionFile | ItemTaskFile['items'][number]

// ---------------------------------------------------------------------------
// What a reviewer may see of each question type
// ---------------------------------------------------------------------------

/** How one question type is reviewed blind. */
interface ReviewView<Q> {
  /** The question as the reviewer sees it: nothing in it may give the answer away. */
  blind(question: Q): Record<string, unknown>
  /** The answer key, in the form the reviewer is asked to answer in. */
  key(question: Q): unknown
  /** One line telling the reviewer how to write the answer. */
  answerFormat: string
  /** Whether a reviewer's answer agrees with the key. */
  agrees(question: Q, answer: unknown): boolean
}

const TYPED =
  'the German you would type, as text. Several right answers are no flaw here: give a list with each of them, such as ["…", "…"]. Object only when the question leaves its answer open'

/**
 * A typed question's key is the list of accepted answers. The reviewer agrees
 * when each answer they give would be marked right for a learner. One that
 * is not listed shows that the list is incomplete, or that the question is
 * unclear.
 */
function everyAnswerIsAccepted(key: unknown, answer: unknown): boolean {
  const given: unknown[] = Array.isArray(answer) ? answer : [answer]
  return given.length > 0 && given.every((one) => typeof one === 'string' && checkTyped(one, key as string[]).correct)
}

/**
 * One entry per question type; TypeScript refuses a type that has none.
 *
 * `keyIn` covers every type whose key is a single field and whose other
 * fields are safe to show. A type that holds its key in its structure (the
 * right order of words, the right pairs) writes its own entry and shuffles
 * what it shows in `blind`.
 */
const REVIEW_VIEWS: { [T in QuestionFile['type']]: ReviewView<Extract<QuestionFile, { type: T }>> } = {
  'multiple-choice': keyIn('answer', 'the exact text of the one correct option'),
  'gap-fill': keyIn('answer', 'the exact text of the one option that fills the gap'),
  'true-false': keyIn('answer', 'true when the sentence is correct German, false when it holds a mistake (no quotes)'),
  'typed-answer': keyIn('answers', TYPED, everyAnswerIsAccepted),
  'typed-gap-fill': keyIn('answers', `what fills the gap: ${TYPED}`, everyAnswerIsAccepted),
  'find-error': keyIn('answer', 'the one wrong word of the sentence, exactly as it is written there'),
  'word-order': {
    // Mixed by the pieces alone: the order on the sheet says nothing about the key.
    blind: (question) => ({ type: question.type, pieces: mixed(question.answers[0] ?? []), end: question.end }),
    key: (question) => question.answers,
    answerFormat: [
      'every order of the pieces that is a correct German sentence closed by the mark in "end":',
      'a list of orders, each order a list of all the pieces exactly as written, such as [["ich", "wohne", "hier"]].',
      'Use every piece once per order. The pieces are written as they stand inside a sentence; the learner sees',
      'the first one with a capital letter. Most questions have one right order. More than one is no flaw here:',
      'list each order that is just as correct.',
    ].join(' '),
    // The reviewer must find every accepted order and no other one. One order may come without the outer list.
    agrees: (question, answer) => sameSet(question.answers, listOfLists(answer)),
  },
  matching: {
    // The partners are mixed by themselves alone: their order says nothing about the pairs.
    blind: (question) => ({
      type: question.type,
      left: question.answer.map(([item]) => item),
      right: mixed(question.answer.map(([, partner]) => partner)),
    }),
    key: (question) => question.answer,
    answerFormat:
      'every pair as [item from "left", its partner from "right"], exactly as written, such as [["ich", "wohne"], ["du", "wohnst"]]',
    agrees: (question, answer) => sameSet(question.answer, listOfLists(answer)),
  },
  'richtig-falsch': keyIn(
    'answer',
    'true when the statement is right according to the text (Richtig), false when it is not (Falsch) (no quotes)',
  ),
  'ja-nein': keyIn('answer', 'true when the writer of the text is for it (Ja), false when against (Nein) (no quotes)'),
  'which-text': keyIn(
    'answer',
    'the id of the one text of the task that fits the situation, such as "c", or "0" when no text fits (each text fits one situation at most)',
  ),
  'who-says': keyIn('answer', 'the name of the one speaker of the text who says this, exactly as the lines name them'),
}

/** The view of a type whose key is the field `field`. The reviewer sees every other field except the explanation. */
function keyIn<Q extends QuestionFile>(
  field: keyof Q & string,
  answerFormat: string,
  agrees: (key: unknown, answer: unknown) => boolean = same,
): ReviewView<Q> {
  const hidden = ['id', 'explanation', field]
  return {
    blind: (question) => Object.fromEntries(Object.entries(question).filter(([name]) => !hidden.includes(name))),
    key: (question) => question[field],
    answerFormat,
    agrees: (question, answer) => agrees(question[field], answer),
  }
}

function viewOf(question: QuestionFile): ReviewView<QuestionFile> {
  return REVIEW_VIEWS[question.type] as ReviewView<QuestionFile>
}

/** Equal once differences in spacing and in how a letter is encoded are set aside. */
function same(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b)
}

/** The same things, in whatever order and however often each is listed. */
function sameSet(a: unknown[], b: unknown[]): boolean {
  const members = (list: unknown[]) => [...new Set(list.map(canonical))].sort()
  return isDeepStrictEqual(members(a), members(b))
}

/** A reviewer's answer that should be a list of lists; a single list of texts counts as a list of one. */
function listOfLists(answer: unknown): unknown[] {
  if (!Array.isArray(answer)) return [answer]
  return answer.length > 0 && answer.every((part) => typeof part === 'string') ? [answer] : answer
}

/** The same text for the same value, whatever order its keys were written in. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, part) => {
    if (typeof part === 'string') return part.normalize('NFC').replace(/\s+/g, ' ').trim()
    if (part && typeof part === 'object' && !Array.isArray(part)) {
      return Object.fromEntries(Object.entries(part).sort(([a], [b]) => (a < b ? -1 : 1)))
    }
    return part
  })
}

// ---------------------------------------------------------------------------
// What is reviewed in a node
// ---------------------------------------------------------------------------

/** One question as a review goes through it, with all that the review needs of it. */
interface Reviewed {
  /** A pool question's id, "task/item" for an item of a practice task, or "<question>-<language>" for vocabulary. */
  id: string
  /** As the reviewer sees it: nothing in it may give the answer away. An item names its task. */
  blind: Record<string, unknown>
  /** The answer key, in the form the reviewer is asked to answer in. */
  key: unknown
  answerFormat: string
  /** Whether a reviewer's answer agrees with the key. */
  agrees(answer: unknown): boolean
  /** The practice task the question is an item of. */
  task?: ItemTaskFile
  /** For a question that differs by language: the language of this one, and what its learner is told to do. */
  language?: Language
  instruction?: string
}

type ReviewedContent = Partial<Pick<NodeFile, 'questions' | 'practice' | 'kind' | 'words'>>

/** Everything a reviewer answers: the pool, the items of each practice task, and the questions made from words. */
function reviewedIn(node: ReviewedContent): Reviewed[] {
  return [
    ...(node.questions ?? []).map((question) => written(question.id, question)),
    ...(node.practice ?? []).flatMap((task) => task.items.map((item) => written(`${task.id}/${item.id}`, item, task))),
    ...vocabularyItems(node),
  ]
}

/** A question written in the node file. An item names its task, whose texts stand at the top of the sheet. */
function written(id: string, question: QuestionFile, task?: ItemTaskFile): Reviewed {
  const view = viewOf(question)
  return {
    id,
    blind: { ...(task ? { task: task.id } : {}), ...view.blind(question) },
    key: view.key(question),
    answerFormat: view.answerFormat,
    agrees: (answer) => view.agrees(question, answer),
    ...(task ? { task } : {}),
  }
}

/** What a learner of each language is told to do with a question: the words of the test screen itself. */
const LEARNER_INSTRUCTIONS: Record<Language, Record<Question['type'], string>> = {
  en: en.instructions,
  fa: fa.instructions,
  de: de.instructions,
}

/**
 * The questions made from the words of a vocabulary node, each once per
 * language: a learner reads the meanings in their own language, so a
 * question that is clear in English may have two right answers in Persian.
 * The reviewer answers what each learner is asked.
 */
function vocabularyItems(node: ReviewedContent): Reviewed[] {
  return vocabularyQuestions(node).flatMap((question) =>
    LANGUAGES.flatMap((language): Reviewed[] => {
      const shared = {
        id: `${question.id}-${language}`,
        language,
        instruction: LEARNER_INSTRUCTIONS[language][question.type],
      }
      if (question.type === 'meaning-of-word') {
        const key = question.options.find((option) => option.word === question.answer)?.meaning[language]
        return [
          {
            ...shared,
            blind: {
              type: question.type,
              prompt: question.prompt,
              options: question.options.map((option) => option.meaning[language]),
            },
            key,
            answerFormat: 'the exact text of the one option that says what the German word means',
            agrees: (answer) => same(key, answer),
          },
        ]
      }
      if (question.type === 'word-for-meaning') {
        return [
          {
            ...shared,
            blind: { type: question.type, prompt: question.prompt[language] },
            key: question.answers,
            answerFormat: `the German word that the instruction asks for: ${TYPED}`,
            agrees: (answer) => everyAnswerIsAccepted(question.answers, answer),
          },
        ]
      }
      return []
    }),
  )
}

/**
 * A task's texts as the reviewer sees them. A text to hear is its
 * transcript: who says what, line by line. The voices are left out, so a
 * change of voice needs no new review; what is said does.
 */
function textsOf(task: ItemTaskFile): SheetTask {
  return {
    id: task.id,
    texts: task.texts.map(({ id, title, body, lines }) => ({
      id,
      ...(title === undefined ? {} : { title }),
      ...(lines === undefined
        ? { body: body ?? '' }
        : { lines: lines.map(({ speaker, text }) => ({ speaker, text })) }),
    })),
  }
}

// ---------------------------------------------------------------------------
// The review sheet: the blind pool out, the reviewer's answers back in
// ---------------------------------------------------------------------------

/** What a reviewer gets, fills in and gives back. It is plain JSON. */
export interface ReviewSheet {
  node: string
  level: string
  topic: string
  instructions: string
  /** The texts of the practice tasks whose items are in `questions`. Absent for a node without tasks. */
  tasks?: SheetTask[]
  questions: SheetQuestion[]
}

/** The texts of one practice task. A question with `task: <id>` is answered from them. */
export interface SheetTask {
  id: string
  /** A text to read has a body; a text to hear has its lines, each with who says it. */
  texts: Array<
    { id: string; title?: string } & ({ body: string } | { lines: Array<{ speaker: string; text: string }> })
  >
}

export interface SheetQuestion {
  id: string
  /** Only for a question that differs by language: the language this learner reads in. */
  language?: Language
  /** Only then: what the test tells this learner to do, in their language. */
  instruction?: string
  /** The question without its key. */
  question: Record<string, unknown>
  answerFormat: string
  /** Filled in by the reviewer. */
  answer: unknown
  /** Filled in by the reviewer when the question itself is flawed. */
  objection: string | null
}

/** What the reviewer is told they review, by what the sheet is of. */
const OPENING: Record<Reviewable['kind'], string> = {
  node: 'This is the test of one node of a German course. You are its independent reviewer.',
  'mock-exam':
    'This is the reading and listening of one original mock exam for the Goethe B1 exam. You are its independent reviewer.',
}

const INSTRUCTIONS = [
  'Answer every question from your own knowledge of German. Do not open any other file of this project.',
  'Write your answer in "answer", in the form that "answerFormat" asks for.',
  'A question with a "language" is asked of a learner who reads in that language ("de" is simple German): "instruction" is what',
  'the test tells that learner. Answer each such question on its own, from what it shows, also when you met the same word in another language.',
  'If a question is flawed (no right answer, more than one right answer, unclear, or wrong or unnatural German),',
  'say why in "objection" in one sentence, and still give your best answer. Otherwise leave "objection" as null.',
  'Change nothing else, and save the file where it is.',
].join(' ')

const TASK_INSTRUCTIONS = [
  'A question that names a "task" is an item of an exam reading or listening task: a statement or question about the texts of that task,',
  'which are under "tasks". Answer it from those texts alone, as a candidate in the exam would.',
  'Object too when a text does not settle an item, or when a text has wrong or unnatural German.',
].join(' ')

const HEARD_TEXT_INSTRUCTIONS = [
  'A text with "lines" is heard, not read: a conversation or an announcement, each line with who says it.',
  'The candidate hears it without seeing these words, so object too when an item hangs on a detail that is hard to catch by ear.',
].join(' ')

/** A node's pool as a reviewer may see it. `only` limits it to some questions, for a second pass. */
export async function blindPool(contentDir: string, nodeId: string, only?: string[]): Promise<ReviewSheet> {
  const { kind, node } = await loadReviewable(contentDir, nodeId)
  const reviewed = reviewedIn(node)
  if (reviewed.length === 0) throw new Error(`Node ${nodeId} has no questions to review.`)

  const unknown = (only ?? []).filter((id) => !reviewed.some((entry) => entry.id === id))
  if (unknown.length > 0) throw new Error(`Node ${nodeId} has no question ${unknown.join(', ')}.`)

  const chosen = reviewed.filter((entry) => !only || only.includes(entry.id))
  const tasks = (node.practice ?? []).filter((task) => chosen.some((entry) => entry.task === task))
  const heard = tasks.some((task) => task.texts.some((text) => text.lines !== undefined))
  const instructions = [
    OPENING[kind],
    INSTRUCTIONS,
    ...(tasks.length > 0 ? [TASK_INSTRUCTIONS] : []),
    ...(heard ? [HEARD_TEXT_INSTRUCTIONS] : []),
  ].join(' ')
  return {
    node: node.id,
    level: node.level,
    topic: node.title.en,
    instructions,
    ...(tasks.length > 0 ? { tasks: tasks.map(textsOf) } : {}),
    questions: chosen.map((entry) => ({
      id: entry.id,
      ...(entry.language ? { language: entry.language, instruction: entry.instruction } : {}),
      question: entry.blind,
      answerFormat: entry.answerFormat,
      answer: null,
      objection: null,
    })),
  }
}

/** What a sheet must still hold when it comes back. Anything else in it is ignored. */
const returnedSheet = z.object({
  node: z.string(),
  tasks: z.array(z.object({ id: z.string(), texts: z.unknown() })).optional(),
  questions: z.array(
    z.object({ id: z.string(), question: z.unknown(), answer: z.unknown(), objection: z.string().nullish() }),
  ),
})

/** One thing to resolve before the review can be recorded. */
export interface Disagreement {
  question: string
  problem: string
}

export interface ReviewRecord {
  reviewer: string
  date: string
  pool: string
}

export interface ReviewResult {
  disagreements: Disagreement[]
  /** The record now stored in the node file. Null while disagreements remain. */
  record: ReviewRecord | null
}

/**
 * Compares the reviewer's answers with the key. With no disagreement left it
 * stores the review record in the node file; otherwise it changes nothing.
 *
 * `sheets` are filled-in review sheets as parsed JSON. Where several hold the
 * same question, the last one counts: that is how a second pass on a changed
 * or disputed question replaces the first.
 */
export async function recordReview(
  contentDir: string,
  nodeId: string,
  sheets: unknown[],
  by: { reviewer: string; date: string },
): Promise<ReviewResult> {
  const { file, source, node, withRecord } = await loadReviewable(contentDir, nodeId)
  const reviewed = reviewedIn(node)
  if (reviewed.length === 0) throw new Error(`Node ${nodeId} has no questions to review.`)

  type Returned = z.infer<typeof returnedSheet>
  /** Each answered question, with the task texts that stood on the same sheet. */
  const returned = new Map<string, Returned['questions'][number] & { tasks: NonNullable<Returned['tasks']> }>()
  for (const sheet of sheets) {
    const parsed = returnedSheet.safeParse(sheet)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      throw new Error(`A review sheet has lost its form at "${issue?.path.join('.')}": ${issue?.message}.`)
    }
    if (parsed.data.node !== nodeId) throw new Error(`A review sheet is for ${parsed.data.node}, not for ${nodeId}.`)
    for (const entry of parsed.data.questions) returned.set(entry.id, { ...entry, tasks: parsed.data.tasks ?? [] })
  }

  const disagreements: Disagreement[] = []
  for (const one of reviewed) {
    const { id, task } = one
    const disagree = (problem: string) => disagreements.push({ question: id, problem })
    const entry = returned.get(id)
    const again = `get it answered with "pnpm review:pool ${nodeId} --only ${id}"`
    if (!entry) {
      disagree(`no reviewer has seen this question; ${again}`)
      continue
    }
    if (!same(entry.question, one.blind)) {
      disagree(`the question changed after the reviewer saw it; ${again}`)
      continue
    }
    if (task && !same(entry.tasks.find((seen) => seen.id === task.id)?.texts, textsOf(task).texts)) {
      disagree(`the text of task ${task.id} changed after the reviewer read it; ${again}`)
      continue
    }
    if (entry.objection?.trim()) disagree(`the reviewer objects: ${entry.objection.trim()}`)
    if (entry.answer === null || entry.answer === undefined || entry.answer === '') {
      disagree('the reviewer gave no answer')
    } else if (!one.agrees(entry.answer)) {
      disagree(`the reviewer answered ${JSON.stringify(entry.answer)}, the key says ${JSON.stringify(one.key)}`)
    }
  }
  if (disagreements.length > 0) return { disagreements, record: null }

  const record = nodeFileSchema.shape.review.unwrap().parse({ ...by, pool: reviewFingerprint(node) })
  await writeFile(file, withRecord(source, record))
  return { disagreements, record }
}

/**
 * The file's text with `record` as its review record and every other line as
 * it was, or an error when that cannot be done. `read` reads the text back
 * as the content model does; `expected` is the file's content with the record.
 */
function withReviewRecord(
  source: string,
  record: ReviewRecord,
  read: (text: string) => unknown,
  expected: unknown,
  name: string,
): string {
  const withoutRecord = source.replace(/^review:.*\n(?:[ \t]+.*(?:\n|$))*/m, '')
  const result = `${withoutRecord.trimEnd()}\n\n${toYaml({ review: record })}`
  if (!isDeepStrictEqual(read(result), expected)) {
    throw new Error(`Could not add the review record to ${name} without changing something else in it.`)
  }
  return result
}

/** What a review goes through: a node file, or a mock exam file as the practice tasks of its parts. */
interface Reviewable {
  kind: 'node' | 'mock-exam'
  file: string
  source: string
  node: ReviewedContent & { id: string; level: string; title: { en: string } }
  withRecord(source: string, record: ReviewRecord): string
}

/** The node or mock exam of this id, ready for its review. A node file is looked for first. */
async function loadReviewable(contentDir: string, id: string): Promise<Reviewable> {
  const nodesDir = path.join(contentDir, 'nodes')
  const entries = await readdir(nodesDir, { recursive: true }).catch(() => [] as string[])
  const entry = entries.find((candidate) => path.basename(candidate) === `${id}.yaml`)
  if (entry) {
    const file = path.join(nodesDir, entry)
    const source = await readFile(file, 'utf8')
    const node = readOrRefuse(file, source, (raw) => nodeFileSchema.safeParse(raw))
    return {
      kind: 'node',
      file,
      source,
      node,
      withRecord: (text, record) =>
        withReviewRecord(
          text,
          record,
          (result) => nodeFileSchema.parse(parseYaml(result)),
          { ...node, review: record },
          `${id}.yaml`,
        ),
    }
  }

  const file = path.join(contentDir, MOCK_EXAMS_FOLDER, `${id}.yaml`)
  const source = await readFile(file, 'utf8').catch(() => {
    throw new Error(`No file ${id}.yaml under ${nodesDir} or ${path.dirname(file)}.`)
  })
  const exam: MockExamFile = readOrRefuse(file, source, (raw) => mockExamFileSchema.safeParse(raw))
  return {
    kind: 'mock-exam',
    file,
    source,
    // A mock exam is reviewed as the practice tasks of its parts: "lesen-3/i2" is Lesen, Teil 3, item i2.
    node: { id: exam.id, level: 'B1', title: exam.title, practice: mockExamTasks(exam) },
    withRecord: (text, record) =>
      withReviewRecord(
        text,
        record,
        (result) => mockExamFileSchema.parse(parseYaml(result)),
        { ...exam, review: record },
        `${id}.yaml`,
      ),
  }
}

function readOrRefuse<T>(
  file: string,
  source: string,
  parse: (raw: unknown) => { success: true; data: T } | { success: false },
): T {
  const parsed = parse(parseYaml(source))
  if (!parsed.success) {
    throw new Error(`${file} breaks the content model. Run "pnpm content:check" and fix it first.`)
  }
  return parsed.data
}

// ---------------------------------------------------------------------------
// The review record
// ---------------------------------------------------------------------------

/**
 * Identifies what a review covers: every question as the reviewer saw it,
 * and its key; for the items of a practice task also the texts they are
 * answered from. Explanations are not part of it; the reviewer never sees
 * them. Takes the node file, or just the parts of it named here.
 */
export function reviewFingerprint(node: ReviewedContent): string {
  const questions = reviewedIn(node)
    .map((entry) => ({ id: entry.id, blind: entry.blind, key: entry.key }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  // A node without practice tasks keeps the fingerprint it had before tasks existed.
  const covered = node.practice ? { questions, tasks: node.practice.map(textsOf) } : questions
  return createHash('sha256').update(canonical(covered)).digest('hex').slice(0, 16)
}

/**
 * Why a node may not be published as far as its review goes, or undefined
 * when it may. A mock exam is held to the same rule, as the practice tasks
 * of its parts (`what` is then "mock exam").
 */
export function reviewProblem(
  node: ReviewedContent & Pick<NodeFile, 'id' | 'status' | 'review'>,
  what = 'node',
): string | undefined {
  if (node.status !== 'published') return undefined
  const steps = `Run "pnpm review:pool ${node.id}"; the steps are in content/README.md`
  if (!node.review) return `a published ${what} needs a review record. ${steps}`
  if (node.review.pool !== reviewFingerprint(node)) {
    return `the questions, their answers or the texts they are about changed after the review of ${node.review.date}, so the ${what} needs a new review. ${steps}`
  }
  return undefined
}
