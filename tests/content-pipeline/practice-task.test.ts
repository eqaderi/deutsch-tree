import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { changeNode, changeReviewedNode, comingSoonNode, EXAM_PART, fixtureContentWith } from './fixture.ts'

const explanation = { en: 'The text says so.', fa: 'متن همین را می‌گوید.', de: 'So steht es im Text.' }

test('a published exam part whose practice task has not the number of items of its part is rejected', async () => {
  const content = await fixtureContentWith({
    [EXAM_PART]: changeReviewedNode((node) => {
      // Lesen, Teil 1 has six statements.
      node.practice[1].items.pop()
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: EXAM_PART,
      node: 'exam-lesen-1',
      where: 'practice[1].items',
      message: 'not the format of Lesen, Teil 1: its task has 6 items, task "t2" has 5',
    },
  ])
  expect(bundle).toBeNull()
})

test('a published exam part whose practice task has not the number of texts of its part is rejected', async () => {
  const content = await fixtureContentWith({
    [EXAM_PART]: changeReviewedNode((node) => {
      // Lesen, Teil 1 is one text.
      node.practice[0].texts.push({ id: 'b', body: 'Noch ein Text.' })
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: EXAM_PART,
      node: 'exam-lesen-1',
      where: 'practice[0].texts',
      message: 'not the format of Lesen, Teil 1: its task has 1 text, task "t1" has 2',
    },
  ])
})

test('a "coming soon" exam part may hold a practice task that is still being written', async () => {
  const content = await fixtureContentWith({
    [EXAM_PART]: changeNode((node) => {
      node.status = 'coming-soon'
      delete node.review
      node.practice = [
        {
          id: 't1',
          texts: [{ id: 'a', body: 'Ein Text, der noch wächst.' }],
          items: [{ id: 'i1', type: 'richtig-falsch', prompt: 'Der Text ist fertig.', answer: false, explanation }],
        },
      ]
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})

test('two practice tasks of one node may not share an id, nor two items or two texts of one task', async () => {
  const task = (texts: string[], items: string[]) => ({
    id: 't1',
    texts: texts.map((id) => ({ id, body: 'Ein Text.' })),
    items: items.map((id) => ({ id, type: 'richtig-falsch', prompt: 'Das ist ein Text.', answer: true, explanation })),
  })
  const content = await fixtureContentWith({
    'nodes/exam/exam-lesen-2.yaml': () =>
      comingSoonNode('exam-lesen-2', {
        kind: 'exam-part',
        level: 'B1',
        chapter: 'fixture-exam-lesen',
        order: 2,
        exam: { module: 'lesen', part: 2 },
        practice: [task(['a', 'a'], ['i1', 'i2', 'i1']), task(['a'], ['i1'])],
      }),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map(({ question, where, message }) => ({ question, where, message }))).toEqual([
    {
      question: undefined,
      where: 'practice[0].texts[1].id',
      message: 'duplicated text id: "a" is also the id of practice[0].texts[0]',
    },
    {
      question: 't1/i1',
      where: 'practice[0].items[2].id',
      message: 'duplicated item id: "i1" is also the id of practice[0].items[0]',
    },
    {
      question: undefined,
      where: 'practice[1].id',
      message: 'duplicated task id: "t1" is also the id of practice[0]',
    },
  ])
})

test('two practice tasks may use the same item ids: an item is named with its task', async () => {
  // The fixture exam part does: both of its tasks have the items i1 to i6.
  const content = await fixtureContentWith({})

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})
