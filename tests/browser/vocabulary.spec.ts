import type { Page } from '@playwright/test'
import {
  ENGLISH,
  type FixtureQuestion,
  giveAnswer,
  PERSIAN,
  questionOnScreen,
  reportedIssue,
  reportLink,
  type TestWords,
  takeTest,
} from './taking-a-test.ts'
import { expect, test } from './test.ts'

/** The fixture's published vocabulary node: ten words about the home. An attempt asks each word once. */
const NODE = 'vocabulary-fixture-home'

/** The words of the test screens in simple German, as far as these journeys need them. */
const GERMAN_QUESTION_OF = (place: number, total: number) => `Frage ${place} von ${total}`
const GERMAN_NEXT = 'Weiter'

/** The word list on the page, one item per word. */
const wordsOnPage = (page: Page) => page.getByRole('list', { name: 'Words' }).getByRole('listitem')

test('a vocabulary page lists each word with its article, plural, word class, level, meaning and example', async ({
  page,
}) => {
  await page.goto(`./#/node/${NODE}`)

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture home words' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText(['Words', 'Test'])
  await expect(wordsOnPage(page)).toHaveCount(10)

  const tisch = wordsOnPage(page).first()
  await expect(tisch.locator('[lang="de"]').first()).toHaveText('der Tisch')
  await expect(tisch).toContainText('noun')
  await expect(tisch).toContainText('A1')
  await expect(tisch).toContainText('Plural')
  await expect(tisch.locator('[lang="de"]').filter({ hasText: 'die Tische' })).toBeVisible()
  await expect(tisch).toContainText('table')
  await expect(tisch.locator('[lang="de"]').filter({ hasText: 'ein Möbelstück mit einer Platte' })).toBeVisible()
  await expect(tisch.locator('[lang="de"]').filter({ hasText: 'Das Essen steht auf dem Tisch.' })).toBeVisible()
  await expect(tisch).toContainText('The food is on the table.')

  const moebel = wordsOnPage(page).filter({ hasText: 'die Möbel' })
  await expect(moebel).toContainText('plural only')
  await expect(moebel).toContainText('A2')

  const wohnen = wordsOnPage(page).filter({ hasText: 'to live (somewhere)' })
  await expect(wohnen).toContainText('verb')
  await expect(wohnen).not.toContainText('Plural')
})

test('in Persian the meaning is Persian, right to left, and the German still reads left to right', async ({ page }) => {
  await page.goto(`./#/node/${NODE}`)
  await page.getByRole('button', { name: 'فارسی' }).click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  const tisch = page.getByRole('list', { name: 'واژه‌ها' }).getByRole('listitem').first()
  await expect(tisch).toContainText('میز')
  await expect(tisch).toContainText('غذا روی میز است.')
  await expect(tisch.locator('[lang="de"]').first()).toHaveAttribute('dir', 'ltr')
})

test('in simple German a word is explained by its German definition, with no translation', async ({ page }) => {
  await page.goto(`./#/node/${NODE}`)
  await page.getByRole('button', { name: 'Deutsch' }).click()

  const tisch = page.getByRole('list', { name: 'Wörter' }).getByRole('listitem').first()
  await expect(tisch).toContainText('ein Möbelstück mit einer Platte und vier Beinen')
  await expect(tisch).toContainText('Nomen')
  await expect(tisch).not.toContainText('table')
  await expect(tisch).not.toContainText('The food is on the table.')
})

/** Takes the vocabulary test from its page, answering each question as `how` says. */
async function takeVocabularyTest(
  page: Page,
  how: (place: number, question: FixtureQuestion) => 'right' | 'wrong',
  words: TestWords = ENGLISH,
) {
  await page.goto(`./#/node/${NODE}/test`)
  return takeTest(page, how, { node: NODE, words })
}

test('the test asks from German and into German, each word once; all right passes and marks the topic done', async ({
  page,
}) => {
  const met = await takeVocabularyTest(page, () => 'right')

  const directions = met.map((question) => question.type)
  expect(directions.filter((type) => type === 'meaning-of-word')).toHaveLength(5)
  expect(directions.filter((type) => type === 'word-for-meaning')).toHaveLength(5)
  expect(new Set(met.map((question) => ('word' in question ? question.word : question.id))).size).toBe(10)
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  await expect(page.getByText('This topic is now done.')).toBeVisible()

  await page.reload()
  await page.goto(`./#/node/${NODE}`)
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toBeVisible()
})

test('from German the learner reads the word with its article and chooses its meaning in their language', async ({
  page,
}) => {
  await page.goto(`./#/node/${NODE}/test`)
  const question = await firstOfType(page, 'meaning-of-word')
  if (question.type !== 'meaning-of-word') throw new Error('unreachable')

  await expect(page.getByText('What does this word mean?')).toBeVisible()
  await expect(page.locator('.question-sentence [lang="de"]')).toHaveText(question.prompt)
  await expect(page.getByRole('radio')).toHaveCount(4)
  for (const option of question.options) {
    await expect(page.getByRole('radio', { name: option.meaning.en, exact: true })).toBeVisible()
  }
})

test('into German the learner reads the meaning and must type a noun with its article', async ({ page }) => {
  await page.goto(`./#/node/${NODE}/test`)
  const question = await firstOfType(
    page,
    'word-for-meaning',
    (one) => one.type === 'word-for-meaning' && /^(der|die|das) /.test(one.answers[0] ?? ''),
  )
  if (question.type !== 'word-for-meaning') throw new Error('unreachable')
  const [learned = ''] = question.answers
  const bare = learned.replace(/^(der|die|das) /, '')

  await expect(page.getByText('Type the German word. A noun needs its article.')).toBeVisible()
  await expect(page.locator('.question-sentence')).toHaveText(question.prompt.en)
  await page.getByRole('textbox').fill(bare)
  const place = Number(/\d+/.exec((await page.getByRole('heading', { level: 2 }).first().textContent()) ?? '')?.[0])
  await page.getByRole('button', { name: place < 10 ? 'Next' : 'Check answers' }).click()
  await takeTest(page, () => 'right', { node: NODE, from: place + 1 })

  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('9 of 10 right')
  const wrong = page.getByRole('list', { name: 'Wrong answers' }).getByRole('listitem')
  await expect(wrong).toHaveCount(1)
  await expect(wrong).toContainText(question.prompt.en)
  await expect(wrong.locator('.answer-given')).toContainText(bare)
  await expect(wrong.locator('.answer-right')).toContainText(learned)
})

test('a Persian learner is asked by the Persian meaning; the report of a problem names the word’s question', async ({
  page,
}) => {
  await page.goto(`./#/node/${NODE}/test`)
  await page.getByRole('button', { name: 'فارسی' }).click()
  const question = await firstOfType(page, 'word-for-meaning', undefined, PERSIAN)
  if (question.type !== 'word-for-meaning') throw new Error('unreachable')

  await expect(page.locator('.question-sentence')).toHaveText(question.prompt.fa)
  const issue = await reportedIssue(reportLink(page))
  expect(issue.node).toBe(NODE)
  expect(issue.question).toBe(question.id)
  expect(issue.body).toContain(`Prompt: ${question.prompt.fa}`)
})

test('a learner who reads in German is asked for the word by its German definition', async ({ page }) => {
  await page.goto(`./#/node/${NODE}/test`)
  await page.getByRole('button', { name: 'Deutsch' }).click()
  const words: TestWords = { ...ENGLISH, language: 'de', questionOf: GERMAN_QUESTION_OF, next: GERMAN_NEXT }
  const question = await firstOfType(page, 'word-for-meaning', undefined, words)
  if (question.type !== 'word-for-meaning') throw new Error('unreachable')

  await expect(page.locator('.question-sentence [lang="de"]')).toHaveText(question.prompt.de)
})

/**
 * Answers the attempt on screen right until a question of `type` (that also
 * passes `also`) comes, and leaves that one unanswered. An attempt asks half
 * of its words in each direction, so one comes within the first attempt.
 */
async function firstOfType(
  page: Page,
  type: FixtureQuestion['type'],
  also: (question: FixtureQuestion) => boolean = () => true,
  words: TestWords = ENGLISH,
): Promise<FixtureQuestion> {
  for (let place = 1; place <= 10; place += 1) {
    await expect(page.getByText(words.questionOf(place, 10))).toBeVisible()
    const question = await questionOnScreen(page)
    if (question.type === type && also(question)) return question
    await giveAnswer(page, question, 'right', words)
    await page.getByRole('button', { name: place < 10 ? words.next : words.checkAnswers }).click()
  }
  throw new Error(`no ${type} question in the attempt`)
}
