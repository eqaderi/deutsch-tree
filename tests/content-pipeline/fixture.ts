import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** The small, valid content folder that tests start from. */
export const fixtureContent = fileURLToPath(new URL('../fixtures/content', import.meta.url))

/**
 * A temporary copy of the fixture content with some files rewritten.
 * Keys are paths inside the content folder; each function gets the file's
 * text and returns the new text.
 */
export async function fixtureContentWith(edits: Record<string, (text: string) => string>): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'deutsch-tree-content-'))
  await cp(fixtureContent, dir, { recursive: true })
  for (const [file, edit] of Object.entries(edits)) {
    const target = path.join(dir, file)
    await writeFile(target, edit(await readFile(target, 'utf8')))
  }
  return dir
}

/** A node file's text with its review record cut out: the node as it is before any review. */
export function withoutReviewRecord(text: string): string {
  return text.replace(/^review:\n(?:[ \t].*\n?)*/m, '')
}
