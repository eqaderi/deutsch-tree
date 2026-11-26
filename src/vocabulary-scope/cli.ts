/**
 * Writes the vocabulary scope list from the extracted word lists.
 *
 *   node src/vocabulary-scope/cli.ts --lists <folder with union-headwords.tsv and b1-headwords.tsv>
 *
 * The lists are not in the repository (they are extracted from the Goethe
 * PDFs, which may not be copied). Run this again after changing `SCOPE_RULE`
 * or the corrections; then `pnpm content:check` names every word that the
 * vocabulary nodes lack or have too many.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { parse as parseYaml } from 'yaml'
import { formatScopeList, SCOPE_LIST_FILE } from '../content-model/scope-list.ts'
import {
  buildScopeList,
  CORRECTIONS_FILE,
  correctionsSchema,
  formatLeftOut,
  LEFT_OUT_FILE,
  parseTable,
  SCOPE_RULE,
} from './index.ts'

const USAGE = `Writes ${SCOPE_LIST_FILE} and ${LEFT_OUT_FILE} into the content folder.

  pnpm vocabulary:scope --lists <folder>

  --lists <folder>     the folder with union-headwords.tsv and b1-headwords.tsv
  --content <folder>   the content folder; default: content`

const { values } = parseArgs({
  options: {
    lists: { type: 'string' },
    content: { type: 'string', default: process.env.CONTENT_DIR ?? 'content' },
  },
})
if (!values.lists) {
  console.error(`--lists is missing\n\n${USAGE}`)
  process.exit(2)
}

const table = async (name: string) => parseTable(await readFile(path.join(values.lists as string, name), 'utf8'))
const inContent = (file: string) => path.join(values.content, file)

try {
  const corrections = correctionsSchema.parse(parseYaml(await readFile(inContent(CORRECTIONS_FILE), 'utf8')))
  const { words, leftOut } = buildScopeList({
    merged: await table('union-headwords.tsv'),
    b1: await table('b1-headwords.tsv'),
    corrections,
    rule: SCOPE_RULE,
  })

  await mkdir(path.dirname(inContent(SCOPE_LIST_FILE)), { recursive: true })
  await writeFile(inContent(SCOPE_LIST_FILE), formatScopeList(words))
  await writeFile(inContent(LEFT_OUT_FILE), formatLeftOut(leftOut))

  const count = <T>(items: T[], key: (item: T) => string) => {
    const sizes = new Map<string, number>()
    for (const item of items) sizes.set(key(item), (sizes.get(key(item)) ?? 0) + 1)
    return [...sizes]
      .sort()
      .map(([name, size]) => `${name} ${size}`)
      .join(', ')
  }
  console.log(`Scope rule: ${JSON.stringify(SCOPE_RULE)}`)
  console.log(`In scope: ${words.length} words (${count(words, (word) => word.level)}).`)
  console.log(`Left out: ${leftOut.length} (${count(leftOut, (word) => word.reason)}).`)
} catch (error) {
  console.error(`The scope list was not written: ${(error as Error).message}`)
  process.exitCode = 1
}
