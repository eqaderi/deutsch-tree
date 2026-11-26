import { rm } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { stringify } from 'yaml'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContentWith } from './fixture.ts'

/** The fixture's scope list (Mutter, Vater, kochen) and the one vocabulary node that holds its words. */
const SCOPE_LIST = 'vocabulary/scope-list.tsv'
const FAMILY = 'nodes/vocabulary/vocabulary-fixture-family.yaml'

test('a word of the scope list that no vocabulary node holds is rejected', async () => {
  const content = await fixtureContentWith({
    [FAMILY]: changeNode((node) => {
      node.words = node.words.filter((entry: { word: string }) => entry.word !== 'Vater')
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: SCOPE_LIST,
      where: 'line 3',
      message:
        'the word "Vater" (A1) is in no vocabulary node; every word of the scope list belongs to exactly one node',
    },
  ])
  expect(report.ok).toBe(false)
  expect(bundle).toBeNull()
})

/** A second vocabulary node in the fixture's vocabulary chapter. */
const SECOND = 'nodes/vocabulary/vocabulary-fixture-kitchen.yaml'
const secondNode = (words: string[]) => () =>
  stringify({
    id: 'vocabulary-fixture-kitchen',
    kind: 'vocabulary',
    level: 'A1',
    chapter: 'fixture-words',
    order: 2,
    status: 'coming-soon',
    title: { en: 'Fixture kitchen words', fa: 'واژه‌های آزمایشی آشپزخانه', de: 'Test-Wörter zur Küche' },
    words: words.map((word) => ({ word })),
  })

test('a word that two vocabulary nodes hold is rejected, and the report names both nodes', async () => {
  const content = await fixtureContentWith({ [SECOND]: secondNode(['kochen']) })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: SECOND,
      node: 'vocabulary-fixture-kitchen',
      where: 'words[0].word',
      message: '"kochen" is also a word of node vocabulary-fixture-family; every word belongs to exactly one node',
    },
  ])
})

test('a word that a node lists twice is rejected', async () => {
  const content = await fixtureContentWith({
    [FAMILY]: changeNode((node) => {
      node.words.push({ word: 'Mutter' })
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: FAMILY,
      node: 'vocabulary-fixture-family',
      where: 'words[3].word',
      message: '"Mutter" is twice in this node; every word belongs to exactly one node',
    },
  ])
})

test('a word that the scope list does not have is rejected', async () => {
  const content = await fixtureContentWith({
    [FAMILY]: changeNode((node) => {
      node.words.push({ word: 'Onkel' })
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: FAMILY,
      node: 'vocabulary-fixture-family',
      where: 'words[3].word',
      message: '"Onkel" is not a word of the scope list (vocabulary/scope-list.tsv); check its spelling there',
    },
  ])
})

test('a word added to the scope list must be given to a node', async () => {
  const content = await fixtureContentWith({
    [SCOPE_LIST]: (text) => `${text}Onkel\tnoun\tA2\tder\t-\n`,
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: SCOPE_LIST,
      where: 'line 16',
      message:
        'the word "Onkel" (A2) is in no vocabulary node; every word of the scope list belongs to exactly one node',
    },
  ])
})

test('vocabulary nodes without a scope list are rejected', async () => {
  const content = await fixtureContentWith({})
  await rm(path.join(content, SCOPE_LIST))

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: SCOPE_LIST,
      message: 'is missing: the list of the words in scope, which the vocabulary nodes must cover',
    },
  ])
})

test('a line of the scope list that cannot be read is reported with its line number', async () => {
  const content = await fixtureContentWith({
    [SCOPE_LIST]: (text) =>
      text.replace('kochen\tverb\tA1', 'kochen\tverbs\tA1').replace('Vater\tnoun\tA1', 'Vater\tnoun\tA7'),
  })

  const { report } = await compileContent(content)

  expect(
    report.errors.filter((problem) => problem.file === SCOPE_LIST && !problem.message.includes('is in no')),
  ).toEqual([
    { file: SCOPE_LIST, where: 'line 3', message: '"A7" is not a level such as A1, A2 or B1' },
    {
      file: SCOPE_LIST,
      where: 'line 4',
      message: expect.stringContaining('"verbs" is not a word class (noun, verb, adjective'),
    },
  ])
})

test('a vocabulary node without words is rejected', async () => {
  const content = await fixtureContentWith({
    [FAMILY]: changeNode((node) => {
      delete node.words
    }),
    [SCOPE_LIST]: (text) =>
      text
        .split('\n')
        .filter((line) => !/^(Mutter|Vater|kochen)\t/.test(line))
        .join('\n'),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: FAMILY,
      node: 'vocabulary-fixture-family',
      where: 'words',
      message: 'is missing: a vocabulary node lists its words',
    },
  ])
})

test('only a vocabulary node has words', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.words = [{ word: 'Mutter' }]
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: COMING_SOON,
      node: 'grammar-002',
      where: 'words',
      message: 'only a vocabulary node has this',
    },
  ])
})

test('the id of a vocabulary node starts with "vocabulary-"', async () => {
  const content = await fixtureContentWith({
    'nodes/vocabulary/family.yaml': () =>
      secondNode(['Onkel'])().replace('id: vocabulary-fixture-kitchen', 'id: family'),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: 'nodes/vocabulary/family.yaml',
      node: 'family',
      where: 'id',
      message: 'a vocabulary node id is "vocabulary-" plus the name of its theme, like "vocabulary-family"',
    },
  ])
})
