/**
 * The generated parts of docs/approvals/vocabulary-themes.md: the numbers,
 * the chapters of each level in curriculum order, every vocabulary node with
 * its words, and the words the scope rule left out.
 *
 * The document is what the learner reads to approve the vocabulary list. Its
 * prose is written by hand; the parts between `<!-- generated: name -->` and
 * `<!-- end generated -->` are replaced by `pnpm vocabulary:approval`, so they
 * can never say something else than the content does.
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { NodeFile } from '../content-model/index.ts'
import { textOf } from '../content-model/rich-text.ts'
import { parseScopeList, SCOPE_LIST_FILE, type ScopeWord } from '../content-model/scope-list.ts'
import { compileContent, formatReport } from '../content-pipeline/index.ts'
import { LEFT_OUT_FILE, type LeftOut, parseLeftOut } from './index.ts'

/** Where the document lies, from the repository root. */
export const APPROVAL_DOCUMENT = 'docs/approvals/vocabulary-themes.md'

/** The document with its generated parts brought up to date with the content folder. */
export async function refreshApprovalDocument(document: string, contentDir: string): Promise<string> {
  const parts = await generatedParts(contentDir)
  return document.replace(
    /(<!-- generated: ([a-z-]+) -->\n)[\s\S]*?(<!-- end generated -->)/g,
    (_whole, start: string, name: string, end: string) => {
      const part = parts[name]
      if (part === undefined) throw new Error(`the document asks for a generated part "${name}" that does not exist`)
      return `${start}\n${part}\n\n${end}`
    },
  )
}

async function generatedParts(contentDir: string): Promise<Record<string, string>> {
  const { report, bundle } = await compileContent(contentDir)
  if (!bundle) throw new Error(formatReport(report))
  const { chapters, nodes } = bundle.index

  const scope = parseScopeList(await readFile(path.join(contentDir, SCOPE_LIST_FILE), 'utf8')).words
  const scopeWord = new Map(scope.map((word) => [word.word, word]))
  const leftOut = parseLeftOut(await readFile(path.join(contentDir, LEFT_OUT_FILE), 'utf8'))
  const wordsOf = await wordsOfVocabularyNodes(contentDir)

  const levels = [...new Set(chapters.map((chapter) => chapter.level))]
  const vocabulary = nodes.filter((node) => node.kind === 'vocabulary')
  const nodesIn = (chapter: string) => nodes.filter((node) => node.chapter === chapter)
  /** "A1-W3": the third vocabulary chapter of A1. */
  const label = new Map<string, string>()
  for (const level of levels) {
    chapters
      .filter((chapter) => chapter.level === level && chapter.kind === 'vocabulary')
      .forEach((chapter, index) => {
        label.set(chapter.id, `${level}-W${index + 1}`)
      })
  }

  const numbers = [
    '| Level | Words | Nodes | Vocabulary chapters | Smallest and largest node |',
    '|---|---|---|---|---|',
    ...[...levels, 'All'].map((level) => {
      const inLevel = <T extends { level: string }>(items: T[]) =>
        level === 'All' ? items : items.filter((item) => item.level === level)
      const sizes = inLevel(vocabulary).map((node) => wordsOf.get(node.id)?.length ?? 0)
      return `| ${level} | ${count(inLevel(scope).length)} | ${inLevel(vocabulary).length} | ${
        inLevel(chapters).filter((chapter) => chapter.kind === 'vocabulary').length
      } | ${sizes.length === 0 ? '–' : `${Math.min(...sizes)} and ${Math.max(...sizes)} words`} |`
    }),
  ].join('\n')

  const overview = levels
    .map((level) => {
      const rows = chapters
        .filter((chapter) => chapter.level === level)
        .map((chapter, index) => {
          const name = textOf(chapter.title.en)
          const isVocabulary = chapter.kind === 'vocabulary'
          return `| ${index + 1} | ${isVocabulary ? `**${label.get(chapter.id)}**` : KIND_NAMES[chapter.kind]} | ${
            isVocabulary ? `**${name}**` : name
          } | ${nodesIn(chapter.id).length} |`
        })
      return [`### ${level}`, '', '| Place | Kind | Chapter | Nodes |', '|---|---|---|---|', ...rows].join('\n')
    })
    .join('\n\n')

  const list = levels
    .map((level) => {
      const inLevel = chapters.filter((chapter) => chapter.level === level && chapter.kind === 'vocabulary')
      const sections = inLevel.map((chapter) => {
        const before = chapters
          .slice(0, chapters.indexOf(chapter))
          .findLast((other) => other.level === level && other.kind === 'grammar')
        const themes = nodesIn(chapter.id).map((node, index) => {
          const words = wordsOf.get(node.id) ?? []
          const shown = words.map((word) => display(scopeWord.get(word), word)).join(' · ')
          return [
            `**${label.get(chapter.id)}.${index + 1} ${textOf(node.title.en)}** · ${textOf(node.title.fa)} · ${textOf(
              node.title.de,
            )} · ${words.length} words  `,
            shown,
          ].join('\n')
        })
        return [
          `#### ${label.get(chapter.id)} ${textOf(chapter.title.en)}`,
          '',
          `Persian: ${textOf(chapter.title.fa)}  `,
          `Simple German: ${textOf(chapter.title.de)}  `,
          `Comes after the grammar chapter: ${before ? `"${textOf(before.title.en)}"` : 'none; it opens the level'}  `,
          `${themes.length} nodes, ${count(nodesIn(chapter.id).reduce((sum, node) => sum + (wordsOf.get(node.id)?.length ?? 0), 0))} words:`,
          '',
          themes.join('\n\n'),
        ].join('\n')
      })
      return [`### ${level}`, '', sections.join('\n\n')].join('\n')
    })
    .join('\n\n')

  return { numbers, overview, list, 'left-out': leftOutPart(leftOut) }
}

const KIND_NAMES = { grammar: 'Grammar', vocabulary: 'Words', phrases: 'Phrases', 'exam-part': 'Exam' } as const

function leftOutPart(leftOut: LeftOut[]): string {
  const because = (reason: LeftOut['reason']) => leftOut.filter((word) => word.reason === reason)
  const noted = (words: LeftOut[]) => words.filter((word) => word.notedOn !== '')
  const alone = (words: LeftOut[]) => words.filter((word) => word.notedOn === '')
  const pairs = (words: LeftOut[], sign: string) =>
    words.map((word) => `${word.word} ${sign} ${word.notedOn}`).join(' · ') || 'none'
  const names = (words: LeftOut[]) => words.map((word) => word.word).join(' · ') || 'none'

  const affixes = because('affix')
  const feminine = because('feminine form')
  const regional = because('regional variant')
  const same = because('same word')
  const noWord = because('no word')
  return [
    `**Word-building parts, ${affixes.length}.** Not words; grammar teaches word building.  `,
    names(affixes),
    '',
    `**Feminine forms, ${feminine.length}.** Each is noted on its masculine noun (${noted(feminine).length}) and learned with it.  `,
    pairs(noted(feminine), '→'),
    ...(alone(feminine).length > 0
      ? ['', `Left out with their masculine noun, which is itself left out: ${names(alone(feminine))}`]
      : []),
    '',
    `**Austrian and Swiss words, ${regional.length}.** ${noted(regional).length} are noted on the word used in Germany:  `,
    pairs(noted(regional), '→'),
    '',
    `${alone(regional).length} have no counterpart in the lists (mostly school types and political offices of Austria and Switzerland) and are left out:  `,
    names(alone(regional)),
    '',
    `**Second spellings and forms of a word that is in scope, ${same.length}.** The word counts once, at the lower level of the two.  `,
    pairs(same, '='),
    ...(noWord.length > 0 ? ['', `**No word, ${noWord.length}.**  `, names(noWord)] : []),
  ].join('\n')
}

/** "die Mutter", "(sich) ändern", "gern". A word the scope list does not have is shown as written. */
function display(word: ScopeWord | undefined, written: string): string {
  if (word === undefined) return written
  const before = word.class === 'noun' ? word.article : word.reflexive
  const number = word.plural === 'pl' ? ' (Pl.)' : ''
  return `${before ? `${before} ` : ''}${word.word}${number}`
}

/** 3271 as "3,271". */
const count = (value: number) => value.toLocaleString('en')

/** The words of every vocabulary node file, by node id. */
async function wordsOfVocabularyNodes(contentDir: string): Promise<Map<string, string[]>> {
  const nodesDir = path.join(contentDir, 'nodes')
  const files = (await readdir(nodesDir, { recursive: true })).filter((file) => file.endsWith('.yaml'))
  const words = new Map<string, string[]>()
  for (const file of files) {
    const node = parseYaml(await readFile(path.join(nodesDir, file), 'utf8')) as Partial<NodeFile>
    if (node.kind === 'vocabulary' && node.id)
      words.set(
        node.id,
        (node.words ?? []).map((entry) => entry.word),
      )
  }
  return words
}
