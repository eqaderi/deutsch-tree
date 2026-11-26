import { expect, test } from 'vitest'
import { type ContentBundle, hasPool } from '../../src/content-model/index.ts'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { changeNode, changeReviewedNode, fixtureContent, fixtureContentWith, PUBLISHED } from './fixture.ts'

const explanation = {
  en: 'With *du* the ending is *-st*.',
  fa: 'با *du* پایانه *-st* است.',
  de: 'Bei *du* ist die Endung *-st*.',
}

/** The fixture content with one more question, "extra", at the end of the published node's pool. */
function withQuestion(question: Record<string, unknown>): Promise<string> {
  return fixtureContentWith({
    [PUBLISHED]: changeReviewedNode((node) => {
      node.questions.push({ id: 'extra', ...question, explanation })
    }),
  })
}

/** What the report says about the question "extra": where the problem is and the message. */
async function problemsOfExtra(contentDir: string) {
  const { report, bundle } = await compileContent(contentDir)
  expect(bundle).toBeNull()
  for (const problem of report.errors) {
    expect(problem).toMatchObject({ file: PUBLISHED, node: 'grammar-001', question: 'extra' })
  }
  return report.errors.map(({ where, message }) => ({ where: where?.replace(/^questions\[\d+\]\./, ''), message }))
}

async function compiledExtra(contentDir: string) {
  const { report, bundle } = await compileContent(contentDir)
  expect(report.errors).toEqual([])
  return pool(bundle)?.questions.find((q) => q.id === 'extra')
}

/** The compiled content of the fixture's grammar node, which has a pool. */
function pool(bundle: ContentBundle | null) {
  const content = bundle?.nodes.find((node) => node.id === 'grammar-001')?.content
  return content && hasPool(content) ? content : undefined
}

// ---------- true/false ----------

test('a true/false question is a German sentence that the learner judges right or wrong', async () => {
  const content = await withQuestion({ type: 'true-false', prompt: 'Du wohne hier.', answer: false })

  expect(await compiledExtra(content)).toEqual({
    id: 'extra',
    type: 'true-false',
    prompt: 'Du wohne hier.',
    answer: false,
    explanation: expect.objectContaining({ en: ['With ', { de: 'du' }, ' the ending is ', { de: '-st' }, '.'] }),
  })
})

test('a true/false question that states no answer is rejected', async () => {
  const content = await withQuestion({ type: 'true-false', prompt: 'Du wohne hier.' })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer', message: 'no correct answer: the question states none' },
  ])
})

test('a true/false question that states two answers is rejected', async () => {
  const content = await withQuestion({ type: 'true-false', prompt: 'Du wohne hier.', answer: [true, false] })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer', message: '2 correct answers: a true-false question has exactly one' },
  ])
})

test('a true/false answer that is neither true nor false is rejected', async () => {
  const content = await withQuestion({ type: 'true-false', prompt: 'Du wohne hier.', answer: 'wrong' })

  expect(await problemsOfExtra(content)).toEqual([{ where: 'answer', message: 'must be true or false' }])
})

// ---------- gap fill ----------

const gapFill = { type: 'gap-fill', prompt: 'Du ___ hier.', options: ['wohne', 'wohnst'], answer: 'wohnst' }

test('a gap fill question offers forms for the one gap in its sentence', async () => {
  const content = await withQuestion(gapFill)

  expect(await compiledExtra(content)).toMatchObject({
    type: 'gap-fill',
    prompt: 'Du ___ hier.',
    options: ['wohne', 'wohnst'],
    answer: 'wohnst',
    // The app gets the sentence already cut at the gap.
    gap: { before: 'Du ', after: ' hier.' },
  })
})

test('a gap may open or close the sentence', async () => {
  const content = await withQuestion({
    ...gapFill,
    prompt: '_____ du hier?',
    options: ['Wohne', 'Wohnst'],
    answer: 'Wohnst',
  })

  expect(await compiledExtra(content)).toMatchObject({ gap: { before: '', after: ' du hier?' } })
})

test.each([
  ['no gap', 'Du wohnst hier.'],
  ['two gaps', '___ wohnst ___.'],
])('a gap fill sentence with %s is rejected', async (_case, prompt) => {
  const content = await withQuestion({ ...gapFill, prompt })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'prompt', message: 'must have exactly one gap, written as ___' },
  ])
})

test('a gap fill question whose answer is none of its forms is rejected', async () => {
  const content = await withQuestion({ ...gapFill, answer: 'wohnt' })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer', message: 'no correct answer: "wohnt" is not one of the options' },
  ])
})

test('a gap fill question that states no answer, or two, is rejected', async () => {
  const { answer: _answer, ...noAnswer } = gapFill

  expect(await problemsOfExtra(await withQuestion(noAnswer))).toEqual([
    { where: 'answer', message: 'no correct answer: the question states none' },
  ])
  expect(await problemsOfExtra(await withQuestion({ ...gapFill, answer: ['wohne', 'wohnst'] }))).toEqual([
    { where: 'answer', message: '2 correct answers: a gap-fill question has exactly one' },
  ])
})

test('a gap fill question whose answer is offered twice is rejected', async () => {
  const content = await withQuestion({ ...gapFill, options: ['wohne', 'wohnst', 'wohnst'] })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer', message: '2 correct answers: "wohnst" is in the options 2 times' },
  ])
})

// ---------- how many questions an attempt draws ----------

const withAttemptSize = (attemptSize: unknown) =>
  fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.attemptSize = attemptSize
    }),
  })

test('a node says how many questions an attempt draws, and 10 is the default', async () => {
  const byDefault = await compileContent(fixtureContent)
  const chosen = await compileContent(await withAttemptSize(15))

  const attemptSize = (result: typeof byDefault) => pool(result.bundle)?.attemptSize
  expect(attemptSize(byDefault)).toBe(10)
  expect(attemptSize(chosen)).toBe(15)
})

test.each([9, 16, 12.5])('an attempt of %s questions is rejected: an attempt draws 10 to 15', async (size) => {
  const { report, bundle } = await compileContent(await withAttemptSize(size))

  expect(report.errors).toEqual([
    { file: PUBLISHED, node: 'grammar-001', where: 'attemptSize', message: expect.any(String) },
  ])
  expect(bundle).toBeNull()
})
