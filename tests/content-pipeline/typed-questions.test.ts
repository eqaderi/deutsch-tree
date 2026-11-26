import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { blindPool, type ReviewSheet, recordReview, reviewFingerprint } from '../../src/content-pipeline/review.ts'
import { changeNode, changeReviewedNode, fixtureContentWith, PUBLISHED } from './fixture.ts'

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
  const content = bundle?.nodes.find((node) => node.id === 'grammar-001')?.content
  return content?.kind === 'grammar' ? content.questions.find((q) => q.id === 'extra') : undefined
}

const typedAnswer = { type: 'typed-answer', prompt: 'wohnen (du)', answers: ['du wohnst', 'wohnst'] }
const typedGapFill = { type: 'typed-gap-fill', prompt: 'Du ___ hier.', answers: ['wohnst'] }

// ---------- the two question types ----------

test('a typed answer question lists every accepted answer', async () => {
  const content = await withQuestion(typedAnswer)

  expect(await compiledExtra(content)).toEqual({
    id: 'extra',
    type: 'typed-answer',
    prompt: 'wohnen (du)',
    answers: ['du wohnst', 'wohnst'],
    explanation: expect.objectContaining({ en: ['With ', { de: 'du' }, ' the ending is ', { de: '-st' }, '.'] }),
  })
})

test('a typed gap fill question lists every accepted answer for the one gap in its sentence', async () => {
  const content = await withQuestion({ ...typedGapFill, answers: ['wohnst', 'lebst'] })

  expect(await compiledExtra(content)).toMatchObject({
    type: 'typed-gap-fill',
    prompt: 'Du ___ hier.',
    answers: ['wohnst', 'lebst'],
    // The app gets the sentence already cut at the gap.
    gap: { before: 'Du ', after: ' hier.' },
  })
})

test.each([
  ['no gap', 'Du wohnst hier.'],
  ['two gaps', '___ wohnst ___.'],
])('a typed gap fill sentence with %s is rejected', async (_case, prompt) => {
  const content = await withQuestion({ ...typedGapFill, prompt })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'prompt', message: 'must have exactly one gap, written as ___' },
  ])
})

// ---------- the accepted answers ----------

test.each([
  ['typed answer', typedAnswer],
  ['typed gap fill', typedGapFill],
])('a %s question that lists no accepted answer is rejected', async (_type, question) => {
  const { answers: _answers, ...listsNone } = question
  const message = 'no correct answer: the question lists none under "answers"'

  expect(await problemsOfExtra(await withQuestion(listsNone))).toEqual([{ where: 'answers', message }])
  expect(await problemsOfExtra(await withQuestion({ ...question, answers: [] }))).toEqual([
    { where: 'answers', message },
  ])
})

test('accepted answers that are not written as a list are rejected', async () => {
  const content = await withQuestion({ ...typedAnswer, answers: 'wohnst' })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answers', message: 'must be a list of every accepted answer, such as [wohnst]' },
  ])
})

test('an empty accepted answer is rejected', async () => {
  const content = await withQuestion({ ...typedAnswer, answers: ['wohnst', ' '] })

  expect(await problemsOfExtra(content)).toEqual([{ where: 'answers[1]', message: 'must not be empty' }])
})

test('an accepted answer listed twice is rejected, also when only its spacing differs', async () => {
  const content = await withQuestion({ ...typedAnswer, answers: ['du wohnst', 'wohnst', 'du  wohnst'] })

  expect(await problemsOfExtra(content)).toEqual([{ where: 'answers[2]', message: '"du wohnst" is listed twice' }])
})

// ---------- blind review ----------

/** The review sheet of the question "extra" alone, as the reviewer gets it. */
async function sheetOfExtra(contentDir: string): Promise<ReviewSheet> {
  return blindPool(contentDir, 'grammar-001', ['extra'])
}

/** What stands between the question "extra" and a recorded review, when the reviewer answers it with `answer`. */
async function disagreementsAboutExtra(contentDir: string, answer: unknown): Promise<string[]> {
  const sheet = await sheetOfExtra(contentDir)
  for (const entry of sheet.questions) entry.answer = answer
  const result = await recordReview(contentDir, 'grammar-001', [sheet], { reviewer: 'A reviewer', date: '2026-02-03' })
  return result.disagreements.filter((entry) => entry.question === 'extra').map((entry) => entry.problem)
}

test.each([
  ['typed answer', typedAnswer],
  ['typed gap fill', typedGapFill],
])('the reviewer of a %s question sees the prompt and none of the accepted answers', async (_type, question) => {
  const sheet = await sheetOfExtra(await withQuestion(question))

  expect(sheet.questions).toEqual([
    {
      id: 'extra',
      question: { type: question.type, prompt: question.prompt },
      answerFormat: expect.stringContaining('type'),
      answer: null,
      objection: null,
    },
  ])
})

test('a reviewer who types one of the accepted answers agrees with the key', async () => {
  const content = await withQuestion(typedAnswer)

  expect(await disagreementsAboutExtra(content, 'wohnst')).toEqual([])
  expect(await disagreementsAboutExtra(content, 'du wohnst')).toEqual([])
  // Compared as a learner's answer is: spaces do not matter.
  expect(await disagreementsAboutExtra(content, ' du  wohnst ')).toEqual([])
})

test('a reviewer who types an answer that is not listed disagrees: the list may be incomplete', async () => {
  const content = await withQuestion(typedAnswer)

  expect(await disagreementsAboutExtra(content, 'ihr wohnt')).toEqual([
    'the reviewer answered "ihr wohnt", the key says ["du wohnst","wohnst"]',
  ])
})

test('a reviewer may give every answer they hold right; each one must be listed', async () => {
  const content = await withQuestion(typedAnswer)

  expect(await disagreementsAboutExtra(content, ['wohnst', 'du wohnst'])).toEqual([])
  expect(await disagreementsAboutExtra(content, ['wohnst', 'Sie wohnen'])).toEqual([
    'the reviewer answered ["wohnst","Sie wohnen"], the key says ["du wohnst","wohnst"]',
  ])
  expect(await disagreementsAboutExtra(content, [])).toEqual([expect.stringContaining('the reviewer answered []')])
})

test('a change to the accepted answers of a reviewed node calls for a new review', async () => {
  const reviewed = await withQuestion(typedAnswer)
  expect((await compileContent(reviewed)).report.ok).toBe(true)

  const changed = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.questions.push({ id: 'extra', ...typedAnswer, explanation })
      // Reviewed with two accepted answers; then one of them is taken away.
      node.review.pool = reviewFingerprint(node)
      node.questions.at(-1).answers = ['wohnst']
    }),
  })

  expect((await compileContent(changed)).report.errors).toEqual([
    expect.objectContaining({ node: 'grammar-001', message: expect.stringContaining('needs a new review') }),
  ])
})
