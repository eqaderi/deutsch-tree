import type { Page } from '@playwright/test'
import { asShown, PERSIAN, takeCheckpoint, takeTest } from './taking-a-test.ts'
import { expect, test } from './test.ts'

/**
 * The fixture has three levels: A1 with one published topic, A2 with three
 * (articles, plurals, negation: grammar-101 to grammar-103) and B1 with none.
 * A checkpoint asks five questions of each published topic.
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
  // A1 has one published topic. Passing its test marks it done.
  await page.goto('./#/node/grammar-001/test')
  await takeTest(page, () => 'right')
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  const before = await stored(page)

  // A level with one topic still has a checkpoint: five of that topic's questions.
  await page.goto('./')
  await page.getByRole('main').getByRole('link', { name: 'Start the checkpoint' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'A1 checkpoint' })).toBeVisible()
  await expect(page.getByText('5 questions from 1 topic')).toBeVisible()
  const met = await takeCheckpoint(page, 5, () => 'wrong')

  expect(new Set(met.map((question) => `${question.node}/${question.id}`)).size).toBe(5)
  await expect(page.getByRole('main')).toContainText('0 of 5 right')
  const toRevisit = page.getByRole('list', { name: 'Topics to look at again' }).getByRole('listitem')
  await expect(toRevisit).toHaveCount(1)
  await expect(toRevisit).toContainText('Fixture verbs')
  await expect(page.getByText('Your topics stay as they are.')).toBeVisible()
  expect(await stored(page)).toBe(before)

  await page.goto('./')
  await expect(topicInTree(page, /Fixture verbs/)).toContainText('Done')
  await page.reload()
  await expect(topicInTree(page, /Fixture verbs/)).toContainText('Done')
})

test('a new checkpoint starts from the result, as often as the learner likes', async ({ page }) => {
  await page.goto('./#/checkpoint/A1')
  await takeCheckpoint(page, 5, () => 'right')
  await expect(page.getByRole('main')).toContainText('5 of 5 right')

  await page.getByRole('button', { name: 'Try again' }).click()

  await expect(page.getByText('Question 1 of 5')).toBeVisible()
  await takeCheckpoint(page, 5, (place) => (place === 2 ? 'wrong' : 'right'))
  await expect(page.getByRole('main')).toContainText('4 of 5 right')
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
