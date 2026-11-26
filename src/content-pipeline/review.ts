/**
 * Blind review of a node's question pool, and the review record that proves it.
 */
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { parse as parseYaml, stringify as toYaml } from 'yaml'
import { z } from 'zod'
import { type NodeFile, nodeFileSchema } from '../content-model/index.ts'
import { checkTyped } from '../learning-engine/index.ts'

type QuestionFile = NonNullable<NodeFile['questions']>[number]

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
  'the German you would type, as text; if several answers are equally right, a list with each of them, such as ["…", "…"]'

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
// The review sheet: the blind pool out, the reviewer's answers back in
// ---------------------------------------------------------------------------

/** What a reviewer gets, fills in and gives back. It is plain JSON. */
export interface ReviewSheet {
  node: string
  level: string
  topic: string
  instructions: string
  questions: SheetQuestion[]
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

/** A node's pool as a reviewer may see it. `only` limits it to some questions, for a second pass. */
export async function blindPool(contentDir: string, nodeId: string, only?: string[]): Promise<ReviewSheet> {
  const { node } = await loadNode(contentDir, nodeId)
  const questions = node.questions ?? []
  if (questions.length === 0) throw new Error(`Node ${nodeId} has no questions to review.`)

  const unknown = (only ?? []).filter((id) => !questions.some((question) => question.id === id))
  if (unknown.length > 0) throw new Error(`Node ${nodeId} has no question ${unknown.join(', ')}.`)

  return {
    node: node.id,
    level: node.level,
    topic: node.title.en,
    instructions: INSTRUCTIONS,
    questions: questions
      .filter((question) => !only || only.includes(question.id))
      .map((question) => ({
        id: question.id,
        question: viewOf(question).blind(question),
        answerFormat: viewOf(question).answerFormat,
        answer: null,
        objection: null,
      })),
  }
}

/** What a sheet must still hold when it comes back. Anything else in it is ignored. */
const returnedSheet = z.object({
  node: z.string(),
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
  const questions = node.questions ?? []
  if (questions.length === 0) throw new Error(`Node ${nodeId} has no questions to review.`)

  const returned = new Map<string, z.infer<typeof returnedSheet>['questions'][number]>()
  for (const sheet of sheets) {
    const parsed = returnedSheet.safeParse(sheet)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      throw new Error(`A review sheet has lost its form at "${issue?.path.join('.')}": ${issue?.message}.`)
    }
    if (parsed.data.node !== nodeId) throw new Error(`A review sheet is for ${parsed.data.node}, not for ${nodeId}.`)
    for (const entry of parsed.data.questions) returned.set(entry.id, entry)
  }

  const disagreements: Disagreement[] = []
  const disagree = (question: QuestionFile, problem: string) => disagreements.push({ question: question.id, problem })
  for (const question of questions) {
    const view = viewOf(question)
    const entry = returned.get(question.id)
    const again = `get it answered with "pnpm review:pool ${nodeId} --only ${question.id}"`
    if (!entry) {
      disagree(question, `no reviewer has seen this question; ${again}`)
      continue
    }
    if (!same(entry.question, view.blind(question))) {
      disagree(question, `the question changed after the reviewer saw it; ${again}`)
      continue
    }
    if (entry.objection?.trim()) disagree(question, `the reviewer objects: ${entry.objection.trim()}`)
    if (entry.answer === null || entry.answer === undefined || entry.answer === '') {
      disagree(question, 'the reviewer gave no answer')
    } else if (!view.agrees(question, entry.answer)) {
      disagree(
        question,
        `the reviewer answered ${JSON.stringify(entry.answer)}, the key says ${JSON.stringify(view.key(question))}`,
      )
    }
  }
  if (disagreements.length > 0) return { disagreements, record: null }

  const record = nodeFileSchema.shape.review.unwrap().parse({ ...by, pool: poolFingerprint(questions) })
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
 * and its key. Explanations are not part of it; the reviewer never sees them.
 */
export function poolFingerprint(questions: QuestionFile[]): string {
  const reviewed = questions
    .map((question) => ({
      id: question.id,
      blind: viewOf(question).blind(question),
      key: viewOf(question).key(question),
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return createHash('sha256').update(canonical(reviewed)).digest('hex').slice(0, 16)
}

/** Why a node may not be published as far as its review goes, or undefined when it may. */
export function reviewProblem(node: NodeFile): string | undefined {
  if (node.status !== 'published') return undefined
  const steps = `Run "pnpm review:pool ${node.id}"; the steps are in content/README.md`
  if (!node.review) return `a published node needs a review record. ${steps}`
  if (node.review.pool !== poolFingerprint(node.questions ?? [])) {
    return `the questions or their answers changed after the review of ${node.review.date}, so the node needs a new review. ${steps}`
  }
  return undefined
}
