import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { fixtureContentWith } from './fixture.ts'

const NODE = 'nodes/grammar/grammar-001.yaml'

const explanation = `
    explanation:
      en: With *du* the ending is *-st*.
      fa: با *du* پایانه *-st* است.
      de: Bei *du* ist die Endung *-st*.
`

/** The fixture node with one more question at the end of its pool. */
function withQuestion(question: string): Promise<string> {
  return fixtureContentWith({ [NODE]: (text) => `${text.trimEnd()}\n${question}${explanation}` })
}

async function compiledQuestion(contentDir: string, id: string) {
  const { report, bundle } = await compileContent(contentDir)
  expect(report.errors).toEqual([])
  return bundle?.nodes.find((node) => node.id === 'grammar-001')?.content?.questions.find((q) => q.id === id)
}

test('a true/false question is a German sentence that the learner judges right or wrong', async () => {
  const content = await withQuestion(`
  - id: extra
    type: true-false
    prompt: Du wohne hier.
    answer: false`)

  expect(await compiledQuestion(content, 'extra')).toEqual({
    id: 'extra',
    type: 'true-false',
    prompt: 'Du wohne hier.',
    answer: false,
    explanation: expect.objectContaining({ en: ['With ', { de: 'du' }, ' the ending is ', { de: '-st' }, '.'] }),
  })
})

test('a true/false answer must be true or false', async () => {
  const content = await withQuestion(`
  - id: extra
    type: true-false
    prompt: Du wohne hier.
    answer: wrong`)

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: NODE, where: expect.stringMatching(/^questions\[\d+\]\.answer$/), message: expect.any(String) },
  ])
  expect(bundle).toBeNull()
})

test('a gap fill question offers forms for the one gap in its sentence', async () => {
  const content = await withQuestion(`
  - id: extra
    type: gap-fill
    prompt: Du ___ hier.
    options: [wohne, wohnst]
    answer: wohnst`)

  expect(await compiledQuestion(content, 'extra')).toMatchObject({
    type: 'gap-fill',
    prompt: 'Du ___ hier.',
    options: ['wohne', 'wohnst'],
    answer: 'wohnst',
    // The app gets the sentence already cut at the gap.
    gap: { before: 'Du ', after: ' hier.' },
  })
})

test('a gap may open or close the sentence', async () => {
  const content = await withQuestion(`
  - id: extra
    type: gap-fill
    prompt: _____ du hier?
    options: [Wohne, Wohnst]
    answer: Wohnst`)

  expect(await compiledQuestion(content, 'extra')).toMatchObject({ gap: { before: '', after: ' du hier?' } })
})

test.each([
  ['no gap', 'Du wohnst hier.'],
  ['two gaps', '___ wohnst ___.'],
])('a gap fill sentence with %s is reported', async (_case, prompt) => {
  const content = await withQuestion(`
  - id: extra
    type: gap-fill
    prompt: ${prompt}
    options: [wohne, wohnst]
    answer: wohnst`)

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: NODE, where: expect.stringMatching(/^questions\[\d+\]\.prompt$/), message: expect.stringContaining('___') },
  ])
})

test('a gap fill answer must be exactly one of the offered forms', async () => {
  const content = await withQuestion(`
  - id: extra
    type: gap-fill
    prompt: Du ___ hier.
    options: [wohne, wohnt]
    answer: wohnst`)

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: NODE,
      where: expect.stringMatching(/^questions\[\d+\]\.answer$/),
      message: expect.stringContaining('options'),
    },
  ])
})

test('a node says how many questions an attempt draws, and 10 is the default', async () => {
  const byDefault = await compileContent(await fixtureContentWith({}))
  const chosen = await compileContent(
    await fixtureContentWith({
      [NODE]: (text) => text.replace('status: published', 'status: published\nattemptSize: 15'),
    }),
  )

  const attemptSize = (result: typeof byDefault) =>
    result.bundle?.nodes.find((node) => node.id === 'grammar-001')?.content?.attemptSize
  expect(attemptSize(byDefault)).toBe(10)
  expect(attemptSize(chosen)).toBe(15)
})

test.each([9, 16, 12.5])('an attempt of %s questions is reported: an attempt draws 10 to 15', async (size) => {
  const content = await fixtureContentWith({
    [NODE]: (text) => text.replace('status: published', `status: published\nattemptSize: ${size}`),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([{ file: NODE, where: 'attemptSize', message: expect.any(String) }])
})
