import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, stringify } from 'yaml'
import { nodeFileSchema } from '../../src/content-model/index.ts'
import { poolFingerprint } from '../../src/content-pipeline/review.ts'

/** The small, valid content folder that tests start from. */
export const fixtureContent = fileURLToPath(new URL('../fixtures/content', import.meta.url))

/** The fixture's published node and its "coming soon" node. */
export const PUBLISHED = 'nodes/grammar/grammar-001.yaml'
export const COMING_SOON = 'nodes/grammar/grammar-002.yaml'

/** The fixture's published writing node and speaking node: exam parts that an AI assistant grades. */
export const WRITING = 'nodes/exam-part/exam-schreiben-1.yaml'
export const SPEAKING = 'nodes/exam-part/exam-sprechen-1.yaml'

/**
 * A temporary copy of the fixture content with some files rewritten or added.
 * Keys are paths inside the content folder; each function gets the file's
 * text (empty for a new file) and returns the new text. An edit that changes
 * nothing is a mistake in the test, so it throws.
 */
export async function fixtureContentWith(edits: Record<string, (text: string) => string>): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'deutsch-tree-content-'))
  await cp(fixtureContent, dir, { recursive: true })
  for (const [file, edit] of Object.entries(edits)) {
    const target = path.join(dir, file)
    const before = await readFile(target, 'utf8').catch(() => '')
    const after = edit(before)
    if (after === before) throw new Error(`the edit of ${file} changed nothing`)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, after)
  }
  return dir
}

// biome-ignore lint/suspicious/noExplicitAny: a test breaks a node on purpose, in ways the schema forbids.
type LooseNode = any

/**
 * An edit for `fixtureContentWith` that changes a node as data instead of as
 * text: `changeNode((node) => { delete node.title.fa })`.
 */
export function changeNode(change: (node: LooseNode) => void): (text: string) => string {
  return (text) => {
    const node = parse(text)
    change(node)
    return stringify(node)
  }
}

/** The text of a new, valid "coming soon" grammar node, for a test that needs more nodes than the fixture has. */
export function comingSoonNode(id: string, fields: Record<string, unknown> = {}): string {
  return stringify({
    id,
    kind: 'grammar',
    level: 'A1',
    chapter: 'fixture-later',
    order: Number(id.replace(/\D/g, '')),
    status: 'coming-soon',
    title: { en: `Extra topic ${id}`, fa: `موضوع اضافه *${id}*`, de: `Zusatzthema ${id}` },
    ...fields,
  })
}

/**
 * `changeNode` for a change to the questions of a published node, in a test
 * that is not about the review: the review record is brought up to date, as
 * a new review would do. Without it the test also gets "needs a new review".
 */
export function changeReviewedNode(change: (node: LooseNode) => void): (text: string) => string {
  return changeNode((node) => {
    change(node)
    // The record is of the questions as the pipeline reads them. A node that
    // breaks the content model is rejected before its review is looked at.
    const read = nodeFileSchema.safeParse(node)
    if (read.success) node.review.pool = poolFingerprint(read.data.questions ?? [])
  })
}

/** An edit for `fixtureContentWith`: the node as it is before any review. */
export const withoutReviewRecord = changeNode((node) => {
  delete node.review
})
