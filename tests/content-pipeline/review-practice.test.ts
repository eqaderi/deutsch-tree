import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { blindPool, type ReviewSheet, recordReview } from '../../src/content-pipeline/review.ts'
import { changeNode, EXAM_PART, fixtureContent, fixtureContentWith, withoutReviewRecord } from './fixture.ts'

/**
 * What a careful reviewer answers to the two practice tasks of the fixture
 * exam part, from their texts. Written out here, not read from the node file.
 */
const RIGHT = {
  't1/i1': true,
  't1/i2': false,
  't1/i3': false,
  't1/i4': true,
  't1/i5': false,
  't1/i6': true,
  't2/i1': true,
  't2/i2': false,
  't2/i3': true,
  't2/i4': false,
  't2/i5': true,
  't2/i6': false,
}
const BY = { reviewer: 'Second fixture reviewer', date: '2026-02-03' }

test('the review sheet of an exam part holds the texts of its practice tasks and every item without its answer', async () => {
  const sheet = await blindPool(fixtureContent, 'exam-lesen-1')

  expect(sheet.tasks?.map((task) => task.id)).toEqual(['t1', 't2'])
  expect(sheet.tasks?.[1]?.texts).toEqual([
    { id: 'a', title: 'Mein Deutschkurs', body: expect.stringContaining('mein Deutschkurs beginnt am Montag') },
  ])
  expect(sheet.questions.map((entry) => entry.id)).toEqual(Object.keys(RIGHT))
  expect(sheet.questions[7]).toEqual({
    id: 't2/i2',
    question: { task: 't2', type: 'richtig-falsch', prompt: 'Der Kurs dauert drei Wochen.' },
    answerFormat: expect.stringContaining('according to the text'),
    answer: null,
    objection: null,
  })
  expect(sheet.instructions).toContain('from those texts alone')
  // No reason of any item: a reason gives its answer away.
  expect(JSON.stringify(sheet)).not.toContain('schon gekauft*')
  expect(JSON.stringify(sheet)).not.toContain('It lasts')
})

test('the review sheet of a node without practice tasks has no texts', async () => {
  const sheet = await blindPool(fixtureContent, 'grammar-001')

  expect(sheet).not.toHaveProperty('tasks')
  expect(sheet.instructions).not.toContain('texts')
})

test('a review of an exam part with no disagreement is recorded, and the node can then be published', async () => {
  const content = await unreviewedFixture()
  expect((await compileContent(content)).report.errors).toEqual([
    {
      file: EXAM_PART,
      node: 'exam-lesen-1',
      where: 'review',
      message: expect.stringContaining('needs a review record'),
    },
  ])
  const sheet = answered(await blindPool(content, 'exam-lesen-1'), RIGHT)

  const result = await recordReview(content, 'exam-lesen-1', [sheet], BY)

  expect(result.disagreements).toEqual([])
  expect(await readFile(path.join(content, EXAM_PART), 'utf8')).toContain('reviewer: Second fixture reviewer')
  expect((await compileContent(content)).report).toMatchObject({ ok: true, errors: [] })
})

test('an item that the reviewer answers otherwise than the key is listed under its task and item', async () => {
  const content = await unreviewedFixture()
  const sheet = answered(await blindPool(content, 'exam-lesen-1'), { ...RIGHT, 't2/i4': true })

  const result = await recordReview(content, 'exam-lesen-1', [sheet], BY)

  expect(result.record).toBeNull()
  expect(result.disagreements).toEqual([
    { question: 't2/i4', problem: 'the reviewer answered true, the key says false' },
  ])
})

test('a published exam part whose text changed after its review needs a new review', async () => {
  const content = await fixtureContentWith({
    [EXAM_PART]: changeNode((node) => {
      // The key no longer fits: item i1 says "seit Mai".
      node.practice[0].texts[0].body = node.practice[0].texts[0].body.replace('seit Mai', 'seit März')
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: EXAM_PART, node: 'exam-lesen-1', where: 'review', message: expect.stringContaining('needs a new review') },
  ])
  expect(bundle).toBeNull()
})

test('a published exam part whose item or key changed after its review needs a new review', async () => {
  const changes = [{ prompt: 'Der Kurs beginnt am Dienstag.' }, { answer: false }]
  for (const change of changes) {
    const content = await fixtureContentWith({
      [EXAM_PART]: changeNode((node) => Object.assign(node.practice[1].items[0], change)),
    })

    const { report } = await compileContent(content)

    expect(report.errors).toEqual([
      {
        file: EXAM_PART,
        node: 'exam-lesen-1',
        where: 'review',
        message: expect.stringContaining('needs a new review'),
      },
    ])
  }
})

test('the reason of an item, and the explanations of the part, may change after the review', async () => {
  const content = await fixtureContentWith({
    [EXAM_PART]: changeNode((node) => {
      node.practice[0].items[0].explanation.en = 'Tom says so in his first sentence.'
      node.explanations.en.scoring = 'One fixture point for each right answer.'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})

test('items answered from a text that has changed since need a fresh answer; the other task stands', async () => {
  const content = await unreviewedFixture()
  const first = answered(await blindPool(content, 'exam-lesen-1'), RIGHT)
  const changed = await fixtureContentWith({
    [EXAM_PART]: changeNode((node) => {
      delete node.review
      node.practice[0].texts[0].body = node.practice[0].texts[0].body.replace('klein, aber hell', 'klein und hell')
    }),
  })

  const stillOpen = await recordReview(changed, 'exam-lesen-1', [first], BY)

  expect(stillOpen.record).toBeNull()
  expect(stillOpen.disagreements.map((entry) => entry.question)).toEqual([
    't1/i1',
    't1/i2',
    't1/i3',
    't1/i4',
    't1/i5',
    't1/i6',
  ])
  expect(stillOpen.disagreements[0]?.problem).toContain('the text of task t1 changed after the reviewer read it')

  // A second pass on the items of that task alone brings only that task's text.
  const itemsOfFirstTask = Object.keys(RIGHT).filter((id) => id.startsWith('t1/'))
  const second = answered(await blindPool(changed, 'exam-lesen-1', itemsOfFirstTask), RIGHT)
  expect(second.tasks?.map((task) => task.id)).toEqual(['t1'])

  const settled = await recordReview(changed, 'exam-lesen-1', [first, second], BY)

  expect(settled.disagreements).toEqual([])
  expect((await compileContent(changed)).report.ok).toBe(true)
})

/** The fixture content as it is before the review of its exam part. */
function unreviewedFixture(): Promise<string> {
  return fixtureContentWith({ [EXAM_PART]: withoutReviewRecord })
}

/** The sheet as a reviewer hands it back. */
function answered(sheet: ReviewSheet, answers: Record<string, unknown>) {
  return {
    ...sheet,
    questions: sheet.questions.map((entry) => ({ ...entry, answer: answers[entry.id] ?? null })),
  }
}
