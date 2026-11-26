/**
 * Blind review of what a node asks (its question pool, and the items of its
 * practice tasks with their texts), and the review record that proves it.
 */
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { parse as parseYaml, stringify as toYaml } from 'yaml'
import { z } from 'zod'
import { type NodeFile, nodeFileSchema } from '../content-model/index.ts'

type PoolQuestionFile = NonNullable<NodeFile['questions']>[number]
type ExamTaskFile = NonNullable<NodeFile['practice']>[number]
/** A question of a pool, or an item of a practice task. */
type QuestionFile = PoolQuestionFile | ExamTaskFile['items'][number]

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
  'richtig-falsch': keyIn(
    'answer',
    'true when the statement is right according to the text (Richtig), false when it is not (Falsch) (no quotes)',
  ),
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

/** One question as a review goes through it. */
interface Reviewed {
  /** A pool question's id, or "task/item" for an item of a practice task. */
  id: string
  question: QuestionFile
  /** The practice task the question is an item of. */
  task?: ExamTaskFile
}

type ReviewedContent = Pick<NodeFile, 'questions' | 'practice'>

/** Everything a reviewer answers: the pool, then the items of each practice task. */
function reviewedIn(node: ReviewedContent): Reviewed[] {
  return [
    ...(node.questions ?? []).map((question) => ({ id: question.id, question })),
    ...(node.practice ?? []).flatMap((task) =>
      task.items.map((item) => ({ id: `${task.id}/${item.id}`, question: item, task })),
    ),
  ]
}

/** A question as the reviewer sees it. An item names its task, whose texts stand at the top of the sheet. */
function blindView({ question, task }: Reviewed): Record<string, unknown> {
  return { ...(task ? { task: task.id } : {}), ...viewOf(question).blind(question) }
}

/** A task's texts as the reviewer sees them. */
function textsOf(task: ExamTaskFile): SheetTask {
  return { id: task.id, texts: task.texts }
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
  texts: Array<{ id: string; title?: string; body: string }>
}

export interface SheetQuestion {
  id: string
  /** The question without its key. */
  question: Record<string, unknown>
  answerFormat: string
  /** Filled in by the reviewer. */
  answer: unknown
  /** Filled in by the reviewer when the question itself is flawed. */
  objection: string | null
}

const INSTRUCTIONS = [
  'This is the test of one node of a German course. You are its independent reviewer.',
  'Answer every question from your own knowledge of German. Do not open any other file of this project.',
  'Write your answer in "answer", in the form that "answerFormat" asks for.',
  'If a question is flawed (no right answer, more than one right answer, unclear, or wrong or unnatural German),',
  'say why in "objection" in one sentence, and still give your best answer. Otherwise leave "objection" as null.',
  'Change nothing else, and save the file where it is.',
].join(' ')

const TASK_INSTRUCTIONS = [
  'A question that names a "task" is an item of an exam reading task: a statement or question about the texts of that task,',
  'which are under "tasks". Answer it from those texts alone, as a candidate in the exam would.',
  'Object too when a text does not settle an item, or when a text has wrong or unnatural German.',
].join(' ')

/** A node's pool as a reviewer may see it. `only` limits it to some questions, for a second pass. */
export async function blindPool(contentDir: string, nodeId: string, only?: string[]): Promise<ReviewSheet> {
  const { node } = await loadNode(contentDir, nodeId)
  const reviewed = reviewedIn(node)
  if (reviewed.length === 0) throw new Error(`Node ${nodeId} has no questions to review.`)

  const unknown = (only ?? []).filter((id) => !reviewed.some((entry) => entry.id === id))
  if (unknown.length > 0) throw new Error(`Node ${nodeId} has no question ${unknown.join(', ')}.`)

  const chosen = reviewed.filter((entry) => !only || only.includes(entry.id))
  const tasks = (node.practice ?? []).filter((task) => chosen.some((entry) => entry.task === task))
  return {
    node: node.id,
    level: node.level,
    topic: node.title.en,
    instructions: tasks.length > 0 ? `${INSTRUCTIONS} ${TASK_INSTRUCTIONS}` : INSTRUCTIONS,
    ...(tasks.length > 0 ? { tasks: tasks.map(textsOf) } : {}),
    questions: chosen.map((entry) => ({
      id: entry.id,
      question: blindView(entry),
      answerFormat: viewOf(entry.question).answerFormat,
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
  const { file, source, node } = await loadNode(contentDir, nodeId)
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
    const { id, question, task } = one
    const disagree = (problem: string) => disagreements.push({ question: id, problem })
    const view = viewOf(question)
    const entry = returned.get(id)
    const again = `get it answered with "pnpm review:pool ${nodeId} --only ${id}"`
    if (!entry) {
      disagree(`no reviewer has seen this question; ${again}`)
      continue
    }
    if (!same(entry.question, blindView(one))) {
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
    } else if (!view.agrees(question, entry.answer)) {
      disagree(
        `the reviewer answered ${JSON.stringify(entry.answer)}, the key says ${JSON.stringify(view.key(question))}`,
      )
    }
  }
  if (disagreements.length > 0) return { disagreements, record: null }

  const record = nodeFileSchema.shape.review.unwrap().parse({ ...by, pool: reviewFingerprint(node) })
  await writeFile(file, withReviewRecord(source, node, record))
  return { disagreements, record }
}

/** The node file's text with `record` as its review record and every other line as it was. */
function withReviewRecord(source: string, node: NodeFile, record: ReviewRecord): string {
  const withoutRecord = source.replace(/^review:.*\n(?:[ \t]+.*(?:\n|$))*/m, '')
  const result = `${withoutRecord.trimEnd()}\n\n${toYaml({ review: record })}`
  if (!isDeepStrictEqual(nodeFileSchema.parse(parseYaml(result)), { ...node, review: record })) {
    throw new Error(`Could not add the review record to ${node.id}.yaml without changing something else in it.`)
  }
  return result
}

async function loadNode(contentDir: string, nodeId: string): Promise<{ file: string; source: string; node: NodeFile }> {
  const nodesDir = path.join(contentDir, 'nodes')
  const entries = await readdir(nodesDir, { recursive: true }).catch(() => [] as string[])
  const entry = entries.find((candidate) => path.basename(candidate) === `${nodeId}.yaml`)
  if (!entry) throw new Error(`No file ${nodeId}.yaml under ${nodesDir}.`)

  const file = path.join(nodesDir, entry)
  const source = await readFile(file, 'utf8')
  const parsed = nodeFileSchema.safeParse(parseYaml(source))
  if (!parsed.success) {
    throw new Error(`${file} breaks the content model. Run "pnpm content:check" and fix it first.`)
  }
  return { file, source, node: parsed.data }
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
    .map((entry) => ({ id: entry.id, blind: blindView(entry), key: viewOf(entry.question).key(entry.question) }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  // A node without practice tasks keeps the fingerprint it had before tasks existed.
  const covered = node.practice ? { questions, tasks: node.practice.map(textsOf) } : questions
  return createHash('sha256').update(canonical(covered)).digest('hex').slice(0, 16)
}

/** Why a node may not be published as far as its review goes, or undefined when it may. */
export function reviewProblem(node: NodeFile): string | undefined {
  if (node.status !== 'published') return undefined
  const steps = `Run "pnpm review:pool ${node.id}"; the steps are in content/README.md`
  if (!node.review) return `a published node needs a review record. ${steps}`
  if (node.review.pool !== reviewFingerprint(node)) {
    return `the questions, their answers or the texts they are about changed after the review of ${node.review.date}, so the node needs a new review. ${steps}`
  }
  return undefined
}
