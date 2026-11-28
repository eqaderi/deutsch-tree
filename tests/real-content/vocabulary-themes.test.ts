/**
 * The real content in `content/`, held against facts of the vocabulary list
 * that is shown to the learner for approval
 * (docs/approvals/vocabulary-themes.md): how many words are in scope, how the
 * nodes are cut, and where the vocabulary chapters stand.
 *
 * A number here changes only when the learner's answer changes: another scope
 * rule, a node split or joined, a chapter moved. A test of code belongs on
 * the fixture content instead.
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, expect, test } from 'vitest'
import { parse as parseYaml } from 'yaml'
import type { ContentIndex, NodeFile } from '../../src/content-model/index.ts'
import { parseScopeList, SCOPE_LIST_FILE, type ScopeWord } from '../../src/content-model/scope-list.ts'
import { compileContent, formatReport } from '../../src/content-pipeline/index.ts'
import { APPROVAL_DOCUMENT, refreshApprovalDocument } from '../../src/vocabulary-scope/approval.ts'
import { LEFT_OUT_FILE, parseLeftOut } from '../../src/vocabulary-scope/index.ts'

const root = fileURLToPath(new URL('../..', import.meta.url))
const realContent = path.join(root, 'content')

let index: ContentIndex
let scope: ScopeWord[]
/** The vocabulary node files, as written. */
let nodes: NodeFile[]

const perLevel = <T extends { level: string }>(items: T[]) =>
  Object.fromEntries(['A1', 'A2', 'B1'].map((level) => [level, items.filter((item) => item.level === level).length]))

beforeAll(async () => {
  const { report, bundle } = await compileContent(realContent)
  if (!bundle) throw new Error(formatReport(report))
  index = bundle.index
  scope = parseScopeList(await readFile(path.join(realContent, SCOPE_LIST_FILE), 'utf8')).words

  const folder = path.join(realContent, 'nodes/vocabulary')
  nodes = await Promise.all(
    (await readdir(folder)).map(async (file) => parseYaml(await readFile(path.join(folder, file), 'utf8')) as NodeFile),
  )
})

test('the scope list has the words of the scope rule in force', () => {
  expect(scope).toHaveLength(3271)
  expect(perLevel(scope)).toEqual({ A1: 788, A2: 688, B1: 1795 })
})

test('the scope list holds headwords only: a word, its class, level, article and plural marker', () => {
  const tooLong = scope.filter((word) => word.word.split(' ').length > 4 || /[.!?]$/.test(word.word.replace(/\.$/, '')))
  const nounsWithoutArticle = scope.filter((word) => word.class === 'noun' && word.article === '')
  const articlesOnOtherWords = scope.filter((word) => word.class !== 'noun' && word.article !== '')

  expect(tooLong.map((word) => word.word)).toEqual([])
  expect(nounsWithoutArticle.map((word) => word.word)).toEqual([])
  expect(articlesOnOtherWords.map((word) => word.word)).toEqual([])
})

test('there are 138 vocabulary nodes, in 23 chapters', () => {
  expect(perLevel(nodes)).toEqual({ A1: 34, A2: 29, B1: 75 })
  expect(perLevel(index.chapters.filter((chapter) => chapter.kind === 'vocabulary'))).toEqual({ A1: 6, A2: 6, B1: 11 })
})

test('every node holds about 25 words', () => {
  const sizes = nodes.map((node) => node.words?.length ?? 0)

  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(15)
  expect(Math.max(...sizes)).toBeLessThanOrEqual(28)
  expect(Math.round(scope.length / nodes.length)).toBe(24)
})

test('every word stands in a node of its own level', () => {
  const levelOf = new Map(scope.map((word) => [word.word, word.level]))
  const elsewhere = nodes.flatMap((node) =>
    (node.words ?? [])
      .filter(({ word }) => levelOf.get(word) !== node.level)
      .map(({ word }) => `${word} (${levelOf.get(word)}) in ${node.id} (${node.level})`),
  )

  expect(elsewhere).toEqual([])
})

// Which nodes are published changes with every chapter ticket of stage 3 (#39), so it is not pinned here:
// the pipeline holds each published node to its review record and its audio.
test('every vocabulary node has its name in three languages', () => {
  const vocabulary = index.nodes.filter((node) => node.kind === 'vocabulary')

  expect(vocabulary).toHaveLength(nodes.length)
  expect(vocabulary.filter((node) => !(node.title.en.length && node.title.fa.length && node.title.de.length))).toEqual(
    [],
  )
})

test('each vocabulary chapter follows the grammar chapter it was placed after', () => {
  const grammarBefore = Object.fromEntries(
    index.chapters
      .filter((chapter) => chapter.kind === 'vocabulary')
      .map((chapter) => [
        chapter.id,
        index.chapters
          .slice(0, index.chapters.indexOf(chapter))
          .findLast((other) => other.kind === 'grammar' && other.level === chapter.level)?.id,
      ]),
  )

  expect(grammarBefore).toEqual({
    'a1-words-people': 'a1-first-sentences',
    'a1-words-numbers-time': 'a1-numbers-time',
    'a1-words-food-home': 'a1-more-articles',
    'a1-words-daily-life': 'a1-modal-verbs',
    'a1-words-town-travel': 'a1-prepositions',
    'a1-words-small-words': 'a1-pronouns',
    'a2-words-people': 'a2-past',
    'a2-words-home-food': 'a2-dativ-objects',
    'a2-words-free-time': 'a2-reflexive-prepositional',
    'a2-words-health-town': 'a2-prepositions',
    'a2-words-school-work': 'a2-polite-forms',
    'a2-words-small-words': 'a2-subordinate-clauses',
    'b1-words-people-feelings': 'b1-tenses',
    'b1-words-health': 'b1-time-clauses',
    'b1-words-home-food': 'b1-reason-condition-clauses',
    'b1-words-learning': 'b1-connectors-negation',
    'b1-words-time-amounts': 'b1-two-part-connectors',
    'b1-words-work-money': 'b1-genitive-nouns',
    'b1-words-travel-nature': 'b1-prepositions',
    'b1-words-media-free-time': 'b1-adjectives-participles',
    'b1-words-thinking-talking': 'b1-relative-clauses',
    'b1-words-society': 'b1-modal-konjunktiv',
    'b1-words-general': 'b1-passive',
  })
})

test('a word that was left out is not in the scope list, and the word it is noted on is', async () => {
  const leftOut = parseLeftOut(await readFile(path.join(realContent, LEFT_OUT_FILE), 'utf8'))
  const inScope = new Set(scope.map((word) => word.word))
  const count = (reason: string) => leftOut.filter((word) => word.reason === reason).length

  expect({
    affixes: count('affix'),
    feminineForms: count('feminine form'),
    regionalVariants: count('regional variant'),
    sameWord: count('same word'),
  }).toEqual({ affixes: 37, feminineForms: 103, regionalVariants: 96, sameWord: 54 })
  expect(leftOut.filter((word) => word.notedOn !== '' && !inScope.has(word.notedOn))).toEqual([])
  expect(
    leftOut.filter((word) => word.reason !== 'same word' && inScope.has(word.word)).map((word) => word.word),
  ).toEqual([])
})

test('the approval document says what the content has', async () => {
  const document = await readFile(path.join(root, APPROVAL_DOCUMENT), 'utf8')

  // Fails after a change to a vocabulary node, chapter or the scope list: run `pnpm vocabulary:approval`.
  expect(await refreshApprovalDocument(document, realContent)).toBe(document)
})
