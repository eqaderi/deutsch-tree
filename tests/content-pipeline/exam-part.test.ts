import { expect, test } from 'vitest'
import { hasPractice } from '../../src/content-model/scoring.ts'
import { compileContent } from '../../src/content-pipeline/index.ts'
import {
  COMING_SOON,
  changeNode,
  comingSoonNode,
  EXAM_PART,
  fixtureContent,
  fixtureContentWith,
  PUBLISHED,
} from './fixture.ts'

/**
 * A new "coming soon" exam-part node for Hören, Teil 2, with some fields
 * changed. That an exam-part node names its module and part, and that its id
 * says the same, is covered in phrases-and-exam-parts.test.ts.
 */
function examPartNode(id: string, fields: Record<string, unknown> = {}): string {
  return comingSoonNode(id, {
    kind: 'exam-part',
    level: 'B1',
    chapter: 'fixture-exam-lesen',
    order: 9,
    module: 'hoeren',
    part: 2,
    ...fields,
  })
}

async function problemsOf(file: string, text: string) {
  const { report } = await compileContent(await fixtureContentWith({ [file]: () => text }))
  return report.errors.map(({ where, message }) => ({ where, message }))
}

test('a part that its module does not have is rejected', async () => {
  const problems = await problemsOf('nodes/exam-part/exam-hoeren-5.yaml', examPartNode('exam-hoeren-5', { part: 5 }))

  expect(problems).toEqual([{ where: 'part', message: 'Hören has parts 1 to 4, not a part 5' }])
})

test('a published Lesen part compiles to its page: what the part asks, how it is scored, how to approach it', async () => {
  const { report, bundle } = await compileContent(fixtureContent)

  expect(report.errors).toEqual([])
  const node = bundle?.nodes.find((candidate) => candidate.id === 'exam-lesen-1')
  expect(node).toMatchObject({ kind: 'exam-part', module: 'lesen', part: 1, status: 'published' })
  expect(node?.content).toMatchObject({
    explanations: {
      en: {
        task: [
          'You read one fixture text and decide whether six statements about it are right. The answer sheet says ',
          { de: 'Richtig' },
          ' or ',
          { de: 'Falsch' },
          '.',
        ],
        scoring: ['Each right answer is one fixture point.'],
        approach: [['Read the six statements first.'], ['Then look for each statement in the text.']],
      },
      de: { approach: [['Lies zuerst die sechs Sätze.'], ['Such dann jeden Satz im Text.']] },
    },
  })
})

test('a practice task compiles to its texts, cut into paragraphs, and its items in the order they were written', async () => {
  const { bundle } = await compileContent(fixtureContent)

  const content = bundle?.nodes.find((candidate) => candidate.id === 'exam-lesen-1')?.content
  if (!content || !hasPractice(content)) throw new Error('the fixture reading part has no practice tasks')
  expect(content.practice.map((task) => task.id)).toEqual(['t1', 't2'])
  const [task] = content.practice
  expect(task?.texts).toEqual([
    {
      id: 'a',
      title: 'Neu in Bonn',
      paragraphs: [
        'Hallo Mia,',
        'ich wohne seit Mai in Bonn. Die Wohnung ist klein, aber hell. Ich fahre jeden Tag mit dem Rad zur Arbeit, denn der Bus ist teuer.',
        'Am Samstag kommt mein Bruder zu Besuch. Wir wollen zusammen kochen. Komm doch auch!',
        'Viele Grüße\nTom',
      ],
    },
  ])
  expect(task?.items.map((item) => item.id)).toEqual(['i1', 'i2', 'i3', 'i4', 'i5', 'i6'])
  expect(task?.items[1]).toEqual({
    id: 'i2',
    type: 'richtig-falsch',
    prompt: 'Toms Wohnung ist groß.',
    answer: false,
    explanation: {
      en: ['The flat is ', { de: 'klein, aber hell' }, '.'],
      fa: ['خانه ', { de: 'klein, aber hell' }, ' است.'],
      de: ['Die Wohnung ist ', { de: 'klein, aber hell' }, '.'],
    },
  })
})

test('a published exam-part node needs its explanations and a practice task', async () => {
  const content = await fixtureContentWith({
    [EXAM_PART]: changeNode((node) => {
      delete node.explanations
      delete node.practice
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors.filter((problem) => problem.where !== 'review')).toEqual([
    { file: EXAM_PART, node: 'exam-lesen-1', where: 'explanations', message: 'is required for a published node' },
    { file: EXAM_PART, node: 'exam-lesen-1', where: 'practice', message: 'is required for a published node' },
  ])
})

test('an exam-part node explains the task, the scoring and an approach in every language', async () => {
  const content = await fixtureContentWith({
    [EXAM_PART]: changeNode((node) => {
      delete node.explanations.fa.approach
      delete node.explanations.de.scoring
      node.explanations.en.rule = 'A rule is what a grammar node explains.'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map(({ where, message }) => ({ where, message }))).toEqual([
    {
      where: 'explanations.en.rule',
      message: 'belongs to a grammar node; an exam-part node explains task, scoring and approach',
    },
    { where: 'explanations.fa.approach', message: 'is missing; this text is needed in fa' },
    { where: 'explanations.de.scoring', message: 'is missing; this text is needed in de' },
  ])
})

test('a grammar node explains a rule, not an exam task', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.explanations.en.task = 'Read the text.'
      delete node.explanations.de.rule
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map(({ where, message }) => ({ where, message }))).toEqual([
    { where: 'explanations.en.task', message: 'belongs to an exam-part node; a grammar node explains its rule' },
    { where: 'explanations.de.rule', message: 'is missing; this text is needed in de' },
  ])
})

test('every reading and listening part has a practice format, so a published one needs its explanations and tasks', async () => {
  const problems = await problemsOf(
    'nodes/exam-part/exam-hoeren-2.yaml',
    examPartNode('exam-hoeren-2', { status: 'published' }),
  )

  expect(problems).toEqual([
    { where: 'explanations', message: 'is required for a published node' },
    { where: 'practice', message: 'is required for a published node' },
  ])
})

test('only an exam-part node holds a practice task', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.practice = [
        {
          id: 't1',
          texts: [{ id: 'a', body: 'Ein Text.' }],
          items: [
            {
              id: 'i1',
              type: 'richtig-falsch',
              prompt: 'Das ist ein Text.',
              answer: true,
              explanation: { en: 'It is one.', fa: 'یک متن است.', de: 'Es ist einer.' },
            },
          ],
        },
      ]
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map(({ where, message }) => ({ where, message }))).toEqual([
    { where: 'practice', message: 'only an exam-part node has this' },
  ])
})

test('an item of a practice task states one answer, and the report names the task and the item', async () => {
  const content = await fixtureContentWith({
    [EXAM_PART]: changeNode((node) => {
      delete node.practice[0].items[4].answer
      node.practice[1].items[2].answer = 'Richtig'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: EXAM_PART,
      node: 'exam-lesen-1',
      question: 't1/i5',
      where: 'practice[0].items[4].answer',
      message: 'no correct answer: the question states none',
    },
    {
      file: EXAM_PART,
      node: 'exam-lesen-1',
      question: 't2/i3',
      where: 'practice[1].items[2].answer',
      message: 'must be true (Richtig) or false (Falsch)',
    },
  ])
})
