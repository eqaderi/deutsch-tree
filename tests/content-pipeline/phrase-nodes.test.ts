import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContent, fixtureContentWith } from './fixture.ts'

/** The fixture's published phrases node, "Fixture greetings". */
const PHRASES_NODE = 'phrases-greeting'
const PHRASES = `nodes/phrases/${PHRASES_NODE}.yaml`
const EXAM_PART = 'nodes/exam-part/exam-sprechen-1.yaml'

const errorsOf = async (content: string) => (await compileContent(content)).report.errors

test('a published phrases node gives its page each phrase with its meaning, its exam tasks and an example in use', async () => {
  const { report, bundle } = await compileContent(fixtureContent)

  expect(report.errors).toEqual([])
  const node = bundle?.nodes.find((candidate) => candidate.id === PHRASES_NODE)
  expect(node?.content).toMatchObject({
    phrases: [
      {
        de: 'Guten Tag!',
        meaning: {
          en: ['Hello. You say it in the daytime, also to a person you call ', { de: 'Sie' }, '.'],
          fa: ['سلام. در طول روز می‌گویید، همچنین به کسی که ', { de: 'Sie' }, ' خطابش می‌کنید.'],
          de: ['So sagt man am Tag Hallo, auch zu einer Person, zu der man ', { de: 'Sie' }, ' sagt.'],
        },
        examTasks: ['exam-sprechen-1'],
        example: { de: 'Guten Tag, Frau Test!', en: 'Hello, Ms Test!', fa: 'سلام، خانم تست!' },
      },
      { de: 'Wie geht es dir?', examTasks: ['exam-schreiben-1', 'exam-sprechen-1'] },
      { de: 'Bis bald!', examTasks: ['exam-schreiben-1'] },
    ],
  })
  // The test of a phrases node is drawn from its pool like any other.
  expect(node?.content?.questions).toHaveLength(15)
  expect(node?.content?.attemptSize).toBe(10)
})

test('a phrases node cannot be published without its phrases, and an exam-part node not at all', async () => {
  const content = await fixtureContentWith({
    [PHRASES]: changeNode((node) => {
      delete node.phrases
    }),
    [EXAM_PART]: changeNode((node) => {
      node.status = 'published'
    }),
  })

  expect(await errorsOf(content)).toEqual([
    {
      file: EXAM_PART,
      node: 'exam-sprechen-1',
      where: 'status',
      message: 'an exam-part node cannot be published yet; only grammar and phrases nodes have a page',
    },
    { file: PHRASES, node: PHRASES_NODE, where: 'phrases', message: 'is required for a published node' },
  ])
})

test('a phrase needs its meaning in all three languages, an exam task and an example', async () => {
  const content = await fixtureContentWith({
    [PHRASES]: changeNode((node) => {
      delete node.phrases[0].meaning.fa
      node.phrases[1].examTasks = []
      delete node.phrases[2].example
    }),
  })

  expect(await errorsOf(content)).toEqual([
    {
      file: PHRASES,
      node: PHRASES_NODE,
      where: 'phrases[0].meaning.fa',
      message: 'is missing; this text is needed in fa',
    },
    { file: PHRASES, node: PHRASES_NODE, where: 'phrases[1].examTasks', message: 'must name at least one exam task' },
    {
      file: PHRASES,
      node: PHRASES_NODE,
      where: 'phrases[2].example',
      message: 'is missing: a phrase is shown in use, in one German sentence with its English and Persian',
    },
  ])
})

test('only a phrases node has phrases', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.phrases = [
        {
          de: 'Bis bald!',
          meaning: { en: 'See you soon.', fa: 'به امید دیدار.', de: 'Das sagt man am Ende.' },
          examTasks: ['exam-sprechen-1'],
          example: { de: 'Tschüs und bis bald!', en: 'Bye, and see you soon!', fa: 'خداحافظ و به امید دیدار!' },
        },
      ]
    }),
  })

  expect(await errorsOf(content)).toEqual([
    { file: COMING_SOON, node: 'grammar-002', where: 'phrases', message: 'only a phrases node has this' },
  ])
})

test('German outside asterisks is found in the Persian meaning of a phrase', async () => {
  const content = await fixtureContentWith({
    [PHRASES]: changeNode((node) => {
      node.phrases[0].meaning.fa = 'سلام، همچنین به کسی که Sie خطابش می‌کنید.'
    }),
  })

  expect(await errorsOf(content)).toEqual([
    { file: PHRASES, node: PHRASES_NODE, where: 'phrases[0].meaning.fa', message: expect.stringContaining('"Sie"') },
  ])
})
