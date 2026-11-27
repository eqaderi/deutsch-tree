import { expect, test } from 'vitest'
import { stringify } from 'yaml'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContentWith } from './fixture.ts'

const EXAM_PART = 'nodes/exam-part/exam-lesen-2.yaml'
const PHRASES = 'nodes/phrases/phrases-agreeing.yaml'

const examPart = {
  id: 'exam-lesen-2',
  kind: 'exam-part',
  level: 'B1',
  chapter: 'fixture-exam',
  order: 2,
  status: 'coming-soon',
  module: 'lesen',
  part: 2,
  title: { en: 'Fixture reading part', fa: 'بخش خواندن آزمایشی', de: 'Test-Leseteil' },
}

const phrases = {
  id: 'phrases-agreeing',
  kind: 'phrases',
  level: 'B1',
  chapter: 'fixture-phrases',
  order: 1,
  status: 'coming-soon',
  purpose: {
    en: 'Say that you agree, for example with *Das stimmt.*',
    fa: 'بگویید که موافقید، مثلاً با *Das stimmt.*',
    de: 'Sagen, dass man zustimmt, zum Beispiel mit *Das stimmt.*',
  },
  examTasks: ['exam-lesen-2'],
  title: { en: 'Fixture phrases', fa: 'عبارت‌های آزمایشی', de: 'Test-Sätze' },
}

const CHAPTERS = `
- id: fixture-phrases
  level: B1
  kind: phrases
  title: { en: Fixture phrases chapter, fa: فصل عبارت‌های آزمایشی, de: Test-Kapitel Sätze }
- id: fixture-exam
  level: B1
  kind: exam-part
  title: { en: Fixture exam chapter, fa: فصل امتحان آزمایشی, de: Test-Kapitel Prüfung }
`

/** The fixture content with a phrases chapter and an exam-part chapter, and the given nodes in them. */
function fixtureContentWithNodes(nodes: { examPart?: object; phrases?: object }) {
  return fixtureContentWith({
    'chapters.yaml': (text) => text + CHAPTERS,
    ...(nodes.examPart && { [EXAM_PART]: () => stringify(nodes.examPart) }),
    ...(nodes.phrases && { [PHRASES]: () => stringify(nodes.phrases) }),
  })
}

const summaryOf = async (content: string, id: string) => {
  const { report, bundle } = await compileContent(content)
  expect(report.errors).toEqual([])
  return bundle?.index.nodes.find((node) => node.id === id)
}

test('an exam-part node tells the tree its module and its part number', async () => {
  const content = await fixtureContentWithNodes({ examPart })

  expect(await summaryOf(content, 'exam-lesen-2')).toMatchObject({
    kind: 'exam-part',
    status: 'coming-soon',
    module: 'lesen',
    part: 2,
  })
})

test('a phrases node tells the tree its purpose and the exam tasks it serves', async () => {
  const content = await fixtureContentWithNodes({ examPart, phrases })

  expect(await summaryOf(content, 'phrases-agreeing')).toMatchObject({
    kind: 'phrases',
    status: 'coming-soon',
    purpose: {
      en: ['Say that you agree, for example with ', { de: 'Das stimmt.' }],
      fa: ['بگویید که موافقید، مثلاً با ', { de: 'Das stimmt.' }],
      de: ['Sagen, dass man zustimmt, zum Beispiel mit ', { de: 'Das stimmt.' }],
    },
    examTasks: ['exam-lesen-2'],
  })
})

test('a phrases node without a purpose or without an exam task is rejected', async () => {
  const { purpose: _purpose, examTasks: _examTasks, ...bare } = phrases
  const content = await fixtureContentWithNodes({ examPart, phrases: bare })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PHRASES,
      node: 'phrases-agreeing',
      where: 'purpose',
      message: 'is missing: a phrases node says in one line what its phrases are for',
    },
    {
      file: PHRASES,
      node: 'phrases-agreeing',
      where: 'examTasks',
      message: 'is missing: a phrases node names the exam tasks it serves, by the ids of their exam-part nodes',
    },
  ])
  expect(bundle).toBeNull()
})

test('the id of a phrases node starts with "phrases-"', async () => {
  const content = await fixtureContentWith({
    'chapters.yaml': (text) => text + CHAPTERS,
    [EXAM_PART]: () => stringify(examPart),
    'nodes/phrases/agreeing.yaml': () => stringify({ ...phrases, id: 'agreeing' }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: 'nodes/phrases/agreeing.yaml',
      node: 'agreeing',
      where: 'id',
      message: 'a phrases node id is "phrases-" plus its purpose in a word or two, like "phrases-agreeing"',
    },
  ])
})

test('an exam task that is not an exam-part node is rejected', async () => {
  const content = await fixtureContentWithNodes({
    examPart,
    phrases: { ...phrases, examTasks: ['exam-lesen-2', 'exam-lesen-9', 'grammar-001'] },
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PHRASES,
      node: 'phrases-agreeing',
      where: 'examTasks[1]',
      message: 'points nowhere: there is no node "exam-lesen-9"',
    },
    {
      file: PHRASES,
      node: 'phrases-agreeing',
      where: 'examTasks[2]',
      message: 'is not an exam task: "grammar-001" is a grammar node, not an exam-part node',
    },
  ])
  expect(bundle).toBeNull()
})

test('German outside asterisks is found in the Persian purpose of a phrases node', async () => {
  const content = await fixtureContentWithNodes({
    examPart,
    phrases: { ...phrases, purpose: { ...phrases.purpose, fa: 'بگویید که موافقید، مثلاً با Das stimmt.' } },
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: PHRASES, node: 'phrases-agreeing', where: 'purpose.fa', message: expect.stringContaining('"Das"') },
  ])
})

test('an exam-part node without its module or its part number is rejected', async () => {
  const { module: _module, part: _part, ...bare } = examPart
  const content = await fixtureContentWithNodes({ examPart: bare })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: EXAM_PART,
      node: 'exam-lesen-2',
      where: 'module',
      message: 'is missing: an exam-part node names its module: lesen, hoeren, schreiben or sprechen',
    },
    {
      file: EXAM_PART,
      node: 'exam-lesen-2',
      where: 'part',
      message: 'is missing: an exam-part node gives the number of its part inside the module',
    },
  ])
  expect(bundle).toBeNull()
})

test('the id of an exam-part node is its module and its part number', async () => {
  const content = await fixtureContentWithNodes({ examPart: { ...examPart, part: 3 } })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: EXAM_PART,
      node: 'exam-lesen-2',
      where: 'id',
      message: 'the id of part 3 of the module lesen is "exam-lesen-3"',
    },
  ])
})

test('only an exam-part node has a module and a part number', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.module = 'lesen'
      node.part = 1
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: COMING_SOON, node: 'grammar-002', where: 'module', message: 'only an exam-part node has this' },
    { file: COMING_SOON, node: 'grammar-002', where: 'part', message: 'only an exam-part node has this' },
  ])
})
