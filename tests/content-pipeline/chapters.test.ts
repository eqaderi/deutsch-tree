import { rm } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, comingSoonNode, fixtureContentWith } from './fixture.ts'

const CHAPTERS = 'chapters.yaml'

/** The fixture's first level: two chapters with one node each. Its other levels are for the checkpoints. */
const inA1 = (node: { level: string }) => node.level === 'A1'

test('the curriculum order runs chapter by chapter, in the order of the chapter list', async () => {
  // grammar-002 has the higher `order`, so only the chapter list can put it first.
  const content = await fixtureContentWith({
    [CHAPTERS]: (text) => {
      const [comment, basics, later, ...otherLevels] = text.split(/\n(?=- id:)/)
      return [comment, later, basics, ...otherLevels].join('\n')
    },
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([])
  expect(bundle?.index.chapters.filter((chapter) => chapter.level === 'A1' && chapter.kind === 'grammar')).toEqual([
    {
      id: 'fixture-later',
      level: 'A1',
      kind: 'grammar',
      title: {
        en: ['Fixture topics with ', { de: 'sein' }],
        fa: ['موضوع‌های آزمایشی با ', { de: 'sein' }],
        de: ['Test-Themen mit ', { de: 'sein' }],
      },
    },
    {
      id: 'fixture-basics',
      level: 'A1',
      kind: 'grammar',
      title: { en: ['Fixture basics'], fa: ['مبانی آزمایشی'], de: ['Test-Grundlagen'] },
    },
  ])
  expect(bundle?.index.nodes.filter(inA1).map((node) => [node.chapter, node.id])).toEqual([
    ['fixture-later', 'grammar-002'],
    ['fixture-basics', 'grammar-001'],
    ['fixture-basics', 'grammar-010'],
    ['fixture-words', 'vocabulary-fixture-family'],
    ['fixture-words', 'vocabulary-fixture-home'],
  ])
})

test('a node without a chapter is rejected', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      delete node.chapter
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: COMING_SOON,
      node: 'grammar-002',
      where: 'chapter',
      message: 'is missing: every node belongs to a chapter of chapters.yaml',
    },
  ])
  expect(bundle).toBeNull()
})

test('a node in a chapter that the chapter list does not have is rejected', async () => {
  const content = await fixtureContentWith({
    [CHAPTERS]: (text) => text.replace('- id: fixture-later', '- id: fixture-renamed'),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: COMING_SOON,
      node: 'grammar-002',
      where: 'chapter',
      message: 'points nowhere: there is no chapter "fixture-later" in chapters.yaml',
    },
  ])
  expect(bundle).toBeNull()
})

test('a node must be of the level and the kind of its chapter', async () => {
  const content = await fixtureContentWith({
    [CHAPTERS]: (text) => text.replace(/(- id: fixture-later\n {2}level: )A1(\n {2}kind: )grammar/, '$1A2$2vocabulary'),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: COMING_SOON,
      node: 'grammar-002',
      where: 'level',
      message: 'is A1, but its chapter "fixture-later" is a chapter of A2',
    },
    {
      file: COMING_SOON,
      node: 'grammar-002',
      where: 'kind',
      message: 'is grammar, but its chapter "fixture-later" is a vocabulary chapter',
    },
  ])
  expect(bundle).toBeNull()
})

test('a chapter name is needed in all three languages', async () => {
  const content = await fixtureContentWith({
    [CHAPTERS]: (text) => text.replace('    fa: مبانی آزمایشی\n', ''),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: CHAPTERS, where: '[0].title.fa', message: 'is missing; this text is needed in fa' },
  ])
  expect(bundle).toBeNull()
})

test('content without a chapter list is rejected', async () => {
  const content = await fixtureContentWith({})
  await rm(path.join(content, CHAPTERS))

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: CHAPTERS, message: 'is missing: the chapter list that every node file names a chapter of' },
  ])
  expect(bundle).toBeNull()
})

test('German marked in a topic title is compiled as German, like in every other text for the learner', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.title = { en: 'The ending *-st* with *du*', fa: 'پایانهٔ *-st* با *du*', de: 'Die Endung *-st* bei *du*' }
    }),
  })

  const { bundle } = await compileContent(content)

  expect(bundle?.index.nodes.filter(inA1).map((node) => node.title.fa)).toEqual([
    ['فعل‌های آزمایشی'],
    ['اوملاوت‌های آزمایشی'],
    ['پایانهٔ ', { de: '-st' }, ' با ', { de: 'du' }],
    ['واژه‌های آزمایشی خانواده'],
    ['واژه‌های آزمایشی خانه'],
  ])
  expect(bundle?.nodes.find((node) => node.id === 'grammar-002')?.title.en).toEqual([
    'The ending ',
    { de: '-st' },
    ' with ',
    { de: 'du' },
  ])
})

test('a new level needs only content: a chapter of that level and a node in it', async () => {
  const content = await fixtureContentWith({
    [CHAPTERS]: (text) =>
      `${text}\n- id: fixture-b2\n  level: B2\n  kind: grammar\n  title: { en: Fixture B2, fa: آزمایشی, de: Test B2 }\n`,
    'nodes/grammar/grammar-003.yaml': () => comingSoonNode('grammar-003', { level: 'B2', chapter: 'fixture-b2' }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([])
  expect(bundle?.index.nodes.map((node) => [node.level, node.chapter, node.id])).toEqual([
    ['A1', 'fixture-basics', 'grammar-001'],
    ['A1', 'fixture-basics', 'grammar-010'],
    ['A1', 'fixture-later', 'grammar-002'],
    ['A1', 'fixture-words', 'vocabulary-fixture-family'],
    ['A1', 'fixture-words', 'vocabulary-fixture-home'],
    ['A2', 'fixture-nouns', 'grammar-101'],
    ['A2', 'fixture-nouns', 'grammar-102'],
    ['A2', 'fixture-nouns', 'grammar-103'],
    ['B1', 'fixture-unwritten', 'grammar-201'],
    ['B2', 'fixture-b2', 'grammar-003'],
  ])
})
