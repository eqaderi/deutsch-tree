import type { Page } from '@playwright/test'
import {
  answerField,
  asShown,
  ENGLISH,
  giveAnswer,
  PERSIAN,
  questionOnScreen,
  rightAnswerText,
  takeCheckpoint,
  takeTest,
} from './taking-a-test.ts'
import { expect, test } from './test.ts'

/**
 * The fixture has three levels: A1 with three published topics (verbs;
 * umlauts, whose answers are typed; and the home words, a vocabulary topic), A2 with three (articles, plurals,
 * negation: grammar-101 to grammar-103) and B1 with none. A checkpoint asks
 * five questions of each published topic.
 */
const ARTICLES = 'grammar-101'
const NEGATION = 'grammar-103'

const topicInTree = (page: Page, name: RegExp) => page.getByRole('main').getByRole('link', { name })

/** Everything this browser has stored for the site, as one text. */
const stored = (page: Page) => page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))

test('a level ends with its checkpoint; it asks every topic of the level and then lists the topics with wrong answers, each a link to its page', async ({
  page,
}) => {
  await page.goto('./#/?level=A2')
  await page.getByRole('main').getByRole('link', { name: 'Start the checkpoint' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'A2 checkpoint' })).toBeVisible()
  await expect(page.getByText('15 questions from 3 topics')).toBeVisible()

  // Wrong: the first question of "articles" that comes up, and every question of "negation".
  let articlesMet = 0
  const met = await takeCheckpoint(page, 15, (_place, question) => {
    if (question.node === NEGATION) return 'wrong'
    if (question.node === ARTICLES) return ++articlesMet === 1 ? 'wrong' : 'right'
    return 'right'
  })

  // Five different questions of each of the three topics.
  expect(new Set(met.map((question) => `${question.node}/${question.id}`)).size).toBe(15)
  for (const node of ['grammar-101', 'grammar-102', 'grammar-103']) {
    expect(met.filter((question) => question.node === node)).toHaveLength(5)
  }

  await expect(page.getByRole('heading', { name: 'Checkpoint result' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('9 of 15 right')

  // In curriculum order; "Fixture plurals" had no wrong answer and is not listed.
  const toRevisit = page.getByRole('list', { name: 'Topics to look at again' }).getByRole('listitem')
  await expect(toRevisit).toHaveCount(2)
  await expect(toRevisit.nth(0)).toContainText('Fixture articles')
  await expect(toRevisit.nth(0)).toContainText('1 of 5 wrong')
  await expect(toRevisit.nth(1)).toContainText('Fixture negation')
  await expect(toRevisit.nth(1)).toContainText('5 of 5 wrong')

  // Each wrong answer with its reason, as after a topic's test.
  const wrong = page.getByRole('list', { name: 'Wrong answers' }).getByRole('listitem')
  await expect(wrong).toHaveCount(6)
  const firstWrong = met.find((question) => question.node === ARTICLES || question.node === NEGATION)
  if (!firstWrong) throw new Error('no question was answered wrong')
  await expect(wrong.first()).toContainText(asShown(firstWrong.explanation.en))

  await toRevisit
    .nth(1)
    .getByRole('link', { name: /Fixture negation/ })
    .click()

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture negation' })).toBeVisible()
  expect(new URL(page.url()).hash).toBe('#/node/grammar-103')
})

test('a checkpoint changes no topic: every answer right marks nothing done', async ({ page }) => {
  await page.goto('./#/checkpoint/A2')
  await expect(page.getByText('Question 1 of 15')).toBeVisible()
  const before = await stored(page)

  await takeCheckpoint(page, 15, () => 'right')

  await expect(page.getByRole('main')).toContainText('15 of 15 right')
  await expect(page.getByText('Everything was right.')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Topics to look at again' })).toHaveCount(0)
  expect(await stored(page)).toBe(before)

  await page.getByRole('region', { name: 'Checkpoint result' }).getByRole('link', { name: 'All topics' }).click()

  // Back in the tree at the level of the checkpoint, with every topic as it was.
  expect(new URL(page.url()).hash).toBe('#/?level=A2')
  for (const name of [/Fixture articles/, /Fixture plurals/, /Fixture negation/]) {
    await expect(topicInTree(page, name)).toContainText('Start')
    await expect(topicInTree(page, name)).not.toContainText('Done')
  }
})

test('a checkpoint changes no topic: every answer wrong leaves a done topic done', async ({ page }) => {
  // Passing the test of "Fixture verbs" marks it done.
  await page.goto('./#/node/grammar-001/test')
  await takeTest(page, () => 'right')
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  const before = await stored(page)

  // The A1 checkpoint asks five questions of each of its three topics; those of "Fixture umlauts" are typed.
  await page.goto('./')
  await page.getByRole('main').getByRole('link', { name: 'Start the checkpoint' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'A1 checkpoint' })).toBeVisible()
  await expect(page.getByText('15 questions from 3 topics')).toBeVisible()
  const met = await takeCheckpoint(page, 15, () => 'wrong')

  expect(new Set(met.map((question) => `${question.node}/${question.id}`)).size).toBe(15)
  for (const node of ['grammar-001', 'grammar-010', 'vocabulary-fixture-home']) {
    expect(met.filter((question) => question.node === node)).toHaveLength(5)
  }
  // A vocabulary topic gives a checkpoint each of its words once.
  const words = met.flatMap((question) => ('word' in question ? [question.word] : []))
  expect(new Set(words).size).toBe(5)
  await expect(page.getByRole('main')).toContainText('0 of 15 right')
  const toRevisit = page.getByRole('list', { name: 'Topics to look at again' }).getByRole('listitem')
  await expect(toRevisit).toHaveCount(3)
  await expect(toRevisit.nth(0)).toContainText('Fixture verbs')
  await expect(toRevisit.nth(1)).toContainText('Fixture umlauts')
  await expect(toRevisit.nth(2)).toContainText('Fixture home words')
  await expect(page.getByText('Your topics stay as they are.')).toBeVisible()
  expect(await stored(page)).toBe(before)

  await page.goto('./')
  await expect(topicInTree(page, /Fixture verbs/)).toContainText('Done')
  await page.reload()
  await expect(topicInTree(page, /Fixture verbs/)).toContainText('Done')
})

test('a new checkpoint starts from the result, as often as the learner likes', async ({ page }) => {
  await page.goto('./#/checkpoint/A1')
  await takeCheckpoint(page, 15, () => 'right')
  await expect(page.getByRole('main')).toContainText('15 of 15 right')

  await page.getByRole('button', { name: 'Try again' }).click()

  await expect(page.getByText('Question 1 of 15')).toBeVisible()
  await takeCheckpoint(page, 15, (place) => (place === 2 ? 'wrong' : 'right'))
  await expect(page.getByRole('main')).toContainText('14 of 15 right')
})

test('a level with no published topic says that it has no checkpoint yet, in the tree and at the checkpoint’s address', async ({
  page,
}) => {
  const nothingYet = page.getByText('No topic of this level has a test yet')

  await page.goto('./#/?level=B1')
  await expect(page.getByRole('main').getByText('Fixture level not written yet')).toBeVisible()
  await expect(nothingYet).toBeVisible()
  await expect(page.getByRole('link', { name: 'Start the checkpoint' })).toHaveCount(0)

  await page.goto('./#/checkpoint/B1')
  await expect(page.getByRole('heading', { level: 1, name: 'B1 checkpoint' })).toBeVisible()
  await expect(nothingYet).toBeVisible()
  await expect(page.getByText(/Question 1/)).toHaveCount(0)
})

test('a level with one published topic has a checkpoint of five of its questions, fetched as one file', async ({
  page,
}) => {
  // B2 has one topic with a pool, the phrases; its listening part gives a checkpoint nothing.
  await page.goto('./#/?level=B2')
  // The last level leads on to the exam, not to another level.
  await expect(page.getByRole('link', { name: /^On to / })).toHaveCount(0)
  const fetched: string[] = []
  page.on('request', (request) => fetched.push(new URL(request.url()).pathname))
  await page.getByRole('main').getByRole('link', { name: 'Start the checkpoint' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'B2 checkpoint' })).toBeVisible()
  await expect(page.getByText('5 questions from 1 topic')).toBeVisible()
  const met = await takeCheckpoint(page, 5, (place) => (place === 1 ? 'wrong' : 'right'))

  expect(new Set(met.map((question) => question.id)).size).toBe(5)
  expect(met.every((question) => question.node === 'phrases-greeting')).toBe(true)
  // The level's pools come in one file; no node file is fetched for them.
  expect(fetched.filter((file) => file.includes('/content/checkpoints/'))).toEqual([
    '/deutsch-tree/content/checkpoints/B2.json',
  ])
  expect(fetched.filter((file) => file.includes('/content/nodes/'))).toEqual([])
  await expect(page.getByRole('main')).toContainText('4 of 5 right')
  const toRevisit = page.getByRole('list', { name: 'Topics to look at again' }).getByRole('listitem')
  await expect(toRevisit).toHaveCount(1)
  await expect(toRevisit.first()).toContainText('1 of 5 wrong')

  // Back to the tree at the checkpoint's level.
  await page.getByRole('link', { name: 'All topics' }).first().click()
  expect(new URL(page.url()).hash).toBe('#/?level=B2')
})

test('a typed answer of a checkpoint that is accepted with a note is shown with its note, as after a test', async ({
  page,
}) => {
  await page.goto('./#/checkpoint/A1')
  // The typed answers of "Fixture umlauts" are given with the first letter's case turned round: right, with a note.
  const flipped = (text: string) =>
    (text[0] === text[0]?.toLowerCase() ? text[0]?.toUpperCase() : text[0]?.toLowerCase()) + text.slice(1)
  const typedPlaces: number[] = []
  for (let place = 1; place <= 15; place += 1) {
    await expect(page.getByText(ENGLISH.questionOf(place, 15))).toBeVisible()
    const question = await questionOnScreen(page)
    if (question.node === 'grammar-010') {
      typedPlaces.push(place)
      await answerField(page).fill(flipped(rightAnswerText(question)))
    } else {
      await giveAnswer(page, question, 'right')
    }
    await page.getByRole('button', { name: place < 15 ? ENGLISH.next : ENGLISH.checkAnswers }).click()
  }

  await expect(page.getByRole('main')).toContainText('15 of 15 right')
  const noted = page.getByRole('list', { name: 'Accepted with a note' }).getByRole('listitem')
  await expect(noted).toHaveCount(5)
  for (const [index, place] of typedPlaces.entries()) {
    await expect(noted.nth(index)).toContainText(`Question ${place}`)
    await expect(noted.nth(index).getByRole('term')).toHaveText(['Your answer', 'Exact spelling'])
  }
})

test('the checkpoint stop of a level leads on to the next level', async ({ page }) => {
  await page.goto('./#/?level=A1')
  await page.getByRole('main').getByRole('link', { name: 'On to A2' }).click()

  expect(new URL(page.url()).hash).toBe('#/?level=A2')
  await expect(page.getByRole('main').getByRole('link', { name: 'On to B1' })).toBeVisible()
})

test('a checkpoint of a level that does not exist is not found', async ({ page }) => {
  await page.goto('./#/checkpoint/C2')

  await expect(page.getByRole('heading', { level: 1, name: 'Topic not found' })).toBeVisible()
})

test('a checkpoint and its result fit the screen, in English and in Persian', async ({ page }) => {
  const sidewaysScroll = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  await page.goto('./#/?level=A2')
  await expect(page.getByRole('link', { name: 'Start the checkpoint' })).toBeVisible()
  expect(await sidewaysScroll()).toBe(0)

  await page.getByRole('button', { name: 'فارسی' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  expect(await sidewaysScroll()).toBe(0)
  await page.getByRole('link', { name: 'شروع آزمون مرور' }).click()
  await expect(page.getByRole('button', { name: PERSIAN.next })).toBeInViewport()
  expect(await sidewaysScroll()).toBe(0)

  await takeCheckpoint(page, 15, () => 'wrong', PERSIAN)

  await expect(page.getByRole('main')).toContainText('۰ از ۱۵ درست')
  const toRevisit = page.getByRole('list', { name: 'موضوع‌هایی برای مرور دوباره' }).getByRole('listitem')
  await expect(toRevisit).toHaveCount(3)
  await expect(toRevisit.first()).toContainText('۵ نادرست از ۵')
  expect(await sidewaysScroll()).toBe(0)

  // The result follows the language, like every other page.
  await page.getByRole('button', { name: 'Deutsch' }).click()
  await expect(page.getByRole('list', { name: 'Noch einmal ansehen' }).getByRole('listitem')).toHaveCount(3)
  expect(await sidewaysScroll()).toBe(0)
})
