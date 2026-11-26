import type { Page } from '@playwright/test'
import {
  ATTEMPT_SIZE,
  asShown,
  choice,
  PERSIAN,
  questionOnScreen,
  reportedIssue,
  reportLink,
  rightAnswerText,
  takeTest,
} from './taking-a-test.ts'
import { expect, test } from './test.ts'

const topicInTree = (page: Page) => page.getByRole('main').getByRole('link', { name: /Fixture verbs/ })

test('a learner passes a topic’s test, and the topic is still done after a reload', async ({ page }) => {
  await page.goto('./')
  await expect(topicInTree(page)).not.toContainText('Done')
  await topicInTree(page).click()
  await page.getByRole('link', { name: 'Take the test' }).click()

  const met = await takeTest(page, () => 'right')

  // The attempt was the configured number of different questions.
  expect(new Set(met.map((question) => question.id)).size).toBe(ATTEMPT_SIZE)
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('10 of 10 right')
  await expect(page.getByText('This topic is now done.')).toBeVisible()

  await page.getByRole('link', { name: 'All topics' }).click()
  await expect(topicInTree(page)).toContainText('Done')

  await page.reload()

  await expect(topicInTree(page)).toContainText('Done')
  await topicInTree(page).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture verbs' })).toBeVisible()
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toBeVisible()
})

test('one wrong answer in ten still passes', async ({ page }) => {
  await page.goto('./#/node/grammar-001/test')

  await takeTest(page, (place) => (place === 4 ? 'wrong' : 'right'))

  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('9 of 10 right')
  await expect(page.getByRole('list', { name: 'Wrong answers' }).getByRole('listitem')).toHaveCount(1)
})

test('a learner fails a test, sees each wrong question with the right answer and its reason, and tries again', async ({
  page,
}) => {
  await page.goto('./#/node/grammar-001/test')

  // Two wrong answers in ten are one too many.
  const met = await takeTest(page, (place) => (place === 2 || place === 7 ? 'wrong' : 'right'))

  await expect(page.getByRole('heading', { name: 'Not passed yet' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('8 of 10 right')
  await expect(page.getByText('You need 9 of 10 right to pass.')).toBeVisible()

  const wrong = page.getByRole('list', { name: 'Wrong answers' }).getByRole('listitem')
  await expect(wrong).toHaveCount(2)
  for (const [index, place] of [2, 7].entries()) {
    const question = met[place - 1]
    if (!question) throw new Error(`no question at place ${place}`)
    await expect(wrong.nth(index)).toContainText(`Question ${place}`)
    await expect(wrong.nth(index).getByText('Right answer')).toBeVisible()
    await expect(wrong.nth(index)).toContainText(rightAnswerText(question))
    await expect(wrong.nth(index)).toContainText(asShown(question.explanation.en))
  }

  // Failing costs nothing: the topic is as it was, and a new attempt starts at once.
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('Question 1 of 10')).toBeVisible()
  await page.getByRole('link', { name: 'Back to the topic' }).click()
  await page.getByRole('link', { name: 'All topics' }).click()
  await expect(topicInTree(page)).toContainText('Start')
  await expect(topicInTree(page)).not.toContainText('Done')
})

test('failing a test of a done topic leaves it done', async ({ page }) => {
  await page.goto('./#/node/grammar-001/test')
  await takeTest(page, () => 'right')
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()

  await page.getByRole('button', { name: 'Try again' }).click()
  await takeTest(page, () => 'wrong')

  await expect(page.getByRole('heading', { name: 'Not passed yet' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('0 of 10 right')
  await expect(page.getByText('This topic was already done. It stays done.')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Wrong answers' }).getByRole('listitem')).toHaveCount(ATTEMPT_SIZE)

  await page.goto('./')
  await expect(topicInTree(page)).toContainText('Done')
  await page.reload()
  await expect(topicInTree(page)).toContainText('Done')
})

test('every question has a "report a problem" link that opens a pre-filled issue naming the topic and the question', async ({
  page,
}) => {
  await page.goto('./#/node/grammar-001/test')
  await expect(page.getByText('Question 1 of 10')).toBeVisible()

  // While answering. The link is only read, never followed: the app itself sends nothing anywhere.
  const link = page.getByRole('link', { name: 'Report a problem' })
  const question = await questionOnScreen(page)
  const issue = await reportedIssue(link)
  expect(issue.site).toBe('https://github.com')
  expect(issue.path).toBe('/eqaderi/deutsch-tree/issues/new')
  expect(issue.title).toContain('grammar-001')
  expect(issue.title).toContain(question.id)
  expect(issue.body).toContain('Topic: grammar-001')
  expect(issue.body).toContain(`Question: ${question.id}`)
  expect(issue.body).toContain(question.prompt)
  await expect(link).toHaveAttribute('target', '_blank')

  // And in the result, where a learner sees the right answer and may doubt it.
  const met = await takeTest(page, () => 'wrong')
  const wrong = page.getByRole('list', { name: 'Wrong answers' }).getByRole('listitem')
  await expect(wrong).toHaveCount(ATTEMPT_SIZE)
  for (const [index, wrongQuestion] of met.entries()) {
    const reported = await reportedIssue(reportLink(wrong.nth(index)))
    expect(reported).toMatchObject({ node: 'grammar-001', question: wrongQuestion.id })
  }
})

test('switching language in the middle of a test keeps the question and the answers already given', async ({
  page,
}) => {
  await page.goto('./#/node/grammar-001/test')

  // Three questions answered right, the fourth chosen but not yet confirmed.
  for (let place = 1; place <= 3; place += 1) {
    await expect(page.getByText(`Question ${place} of 10`)).toBeVisible()
    await choice(page, await questionOnScreen(page), 'right').check()
    await page.getByRole('button', { name: 'Next' }).click()
  }
  await expect(page.getByText('Question 4 of 10')).toBeVisible()
  const fourth = await questionOnScreen(page)
  await choice(page, fourth, 'right').check()

  await page.getByRole('button', { name: 'فارسی' }).click()

  // The same place, the same question, the same choice, now in Persian.
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByText(PERSIAN.questionOf(4, 10))).toBeVisible()
  expect((await questionOnScreen(page)).id).toBe(fourth.id)
  await expect(choice(page, fourth, 'right', PERSIAN)).toBeChecked()
  expect(new URL(page.url()).hash).toBe('#/node/grammar-001/test')

  // The first three answers still count: the rest answered right gives ten of ten.
  await page.getByRole('button', { name: PERSIAN.next }).click()
  await takeTest(page, () => 'right', { from: 5, words: PERSIAN })
  await expect(page.getByRole('heading', { name: 'قبول شدید' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('۱۰ از ۱۰ درست')

  // The result survives a change of language too.
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('10 of 10 right')
})

test('a test fits the screen it is taken on, in English and in Persian', async ({ page }) => {
  const sidewaysScroll = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  await page.goto('./#/node/grammar-001/test')
  await expect(page.getByText('Question 1 of 10')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next' })).toBeInViewport()
  expect(await sidewaysScroll()).toBe(0)

  await page.getByRole('button', { name: 'فارسی' }).click()
  await expect(page.getByRole('button', { name: PERSIAN.next })).toBeInViewport()
  expect(await sidewaysScroll()).toBe(0)

  const met = await takeTest(page, () => 'wrong', { words: PERSIAN })
  const wrong = page.getByRole('list', { name: 'پاسخ‌های نادرست' }).getByRole('listitem')
  await expect(wrong).toHaveCount(ATTEMPT_SIZE)
  expect(await sidewaysScroll()).toBe(0)

  // The reasons are in the learner's language, and change with it.
  const first = met[0]
  if (!first) throw new Error('the attempt had no question')
  await expect(wrong.first()).toContainText(asShown(first.explanation.fa))
  await page.getByRole('button', { name: 'Deutsch' }).click()
  const wrongInGerman = page.getByRole('list', { name: 'Falsche Antworten' }).getByRole('listitem')
  await expect(wrongInGerman.first()).toContainText(asShown(first.explanation.de))
})
