import { expect, test } from 'vitest'
import { stringify } from 'yaml'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContent, fixtureContentWith } from './fixture.ts'

/** The fixture's published phrases node, "Fixture greetings". */
const PHRASES_NODE = 'phrases-greeting'
const PHRASES = `nodes/phrases/${PHRASES_NODE}.yaml`
const LISTENING_PART = 'nodes/exam-part/exam-hoeren-1.yaml'

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
      { de: 'Wie geht es dir?', examTasks: ['exam-schreiben-3', 'exam-sprechen-1'] },
      { de: 'Bis bald!', examTasks: ['exam-schreiben-3'] },
    ],
  })
  // The test of a phrases node is drawn from its pool like any other.
  expect(node?.content).toMatchObject({ questions: expect.any(Array), attemptSize: 10 })
  expect(node?.content && 'questions' in node.content && node.content.questions).toHaveLength(15)
})

test('a phrases node cannot be published without its phrases, nor a listening part without its tasks', async () => {
  const content = await fixtureContentWith({
    [PHRASES]: changeNode((node) => {
      delete node.phrases
    }),
    [LISTENING_PART]: () =>
      stringify({
        id: 'exam-hoeren-1',
        kind: 'exam-part',
        level: 'B2',
        chapter: 'fixture-exam-parts',
        order: 2,
        status: 'published',
        module: 'hoeren',
        part: 1,
        title: { en: 'Fixture listening', fa: 'شنیدن آزمایشی', de: 'Test-Hören' },
      }),
  })

  expect(await errorsOf(content)).toEqual([
    { file: LISTENING_PART, node: 'exam-hoeren-1', where: 'explanations', message: 'is required for a published node' },
    { file: LISTENING_PART, node: 'exam-hoeren-1', where: 'practice', message: 'is required for a published node' },
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

test('search finds a phrases node by what it is for, by a phrase with its meaning and by an example', async () => {
  const { bundle } = await compileContent(fixtureContent)

  const passagesIn = (language: 'en' | 'fa' | 'de') =>
    bundle?.search[language].entries.find((entry) => entry.node === PHRASES_NODE)?.passages
  expect(passagesIn('en')?.slice(0, 3)).toEqual([
    ['Say hello and goodbye, for example with ', { de: 'Guten Tag!' }],
    [{ de: 'Guten Tag!' }, ' – Hello. You say it in the daytime, also to a person you call ', { de: 'Sie' }, '.'],
    [{ de: 'Guten Tag, Frau Test!' }, ' – Hello, Ms Test!'],
  ])
  expect(passagesIn('en')).toHaveLength(1 + 2 * 3)
  expect(passagesIn('fa')?.[2]).toEqual([{ de: 'Guten Tag, Frau Test!' }, ' – سلام، خانم تست!'])
  // A learner reading in German needs no translation of an example.
  expect(passagesIn('de')?.[2]).toEqual([{ de: 'Guten Tag, Frau Test!' }])
  // The questions stay out of the search data, with their answers.
  expect(JSON.stringify(bundle?.search)).not.toContain('wie / gehen / es / du')
})
