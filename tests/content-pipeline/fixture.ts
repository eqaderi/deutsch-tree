import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, stringify } from 'yaml'

/** The small, valid content folder that tests start from. */
export const fixtureContent = fileURLToPath(new URL('../fixtures/content', import.meta.url))

/** The fixture's published node and its "coming soon" node. */
export const PUBLISHED = 'nodes/grammar/grammar-001.yaml'
export const COMING_SOON = 'nodes/grammar/grammar-002.yaml'

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
    order: Number(id.replace(/\D/g, '')),
    status: 'coming-soon',
    title: { en: `Extra topic ${id}`, fa: `موضوع اضافه ${id}`, de: `Zusatzthema ${id}` },
    ...fields,
  })
}
