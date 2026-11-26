import type { Page } from '@playwright/test'
import { isTyped, takeTest } from './taking-a-test.ts'
import { expect, test } from './test.ts'

/**
 * The fixture's phrases node, "Fixture greetings": three phrases that serve
 * two exam tasks. 6 of its 15 questions are answered by choosing and 9 by
 * typing; an attempt draws 10 and is passed with 9 right.
 */
const PHRASES_NODE = 'phrases-greeting'
const PHRASES_PAGE = `./#/node/${PHRASES_NODE}`

const phrases = (page: Page, name = 'Phrases') => page.getByRole('list', { name }).locator('> li')

const sidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test('a phrases page says what its phrases are for and shows each one with its meaning, an example in use and the exam tasks it serves', async ({
  page,
}) => {
  await page.goto('./#/?level=B2')
  await page
    .getByRole('main')
    .getByRole('link', { name: /Fixture greetings/ })
    .click()

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture greetings' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'What these phrases are for',
    'Phrases',
    'Test',
  ])
  await expect(page.getByText('Say hello and goodbye, for example with Guten Tag!')).toBeVisible()

  await expect(phrases(page).getByRole('heading', { level: 3 })).toHaveText([
    'Guten Tag!',
    'Wie geht es dir?',
    'Bis bald!',
  ])
  const howAreYou = phrases(page).nth(1)
  await expect(howAreYou.getByText('How are you? You ask a friend.')).toBeVisible()
  await expect(howAreYou.locator('[lang="de"]').filter({ hasText: 'Hallo Tom, wie geht es dir?' })).toBeVisible()
  await expect(howAreYou.getByText('Hello Tom, how are you?')).toBeVisible()
  // As the learner sees it: the German inside a task's name keeps the space before it.
  await expect(howAreYou.getByRole('list', { name: 'Useful for' }).getByRole('link')).toHaveText(
    ['Fixture writing task with du', 'Fixture speaking task'],
    { useInnerText: true },
  )
  // Each phrase names its own exam tasks, not those of the whole node.
  await expect(phrases(page).nth(0).getByRole('list', { name: 'Useful for' }).getByRole('link')).toHaveText([
    'Fixture speaking task',
  ])
  await expect(phrases(page).nth(2).getByRole('list', { name: 'Useful for' }).getByRole('link')).toHaveText([
    'Fixture writing task with du',
  ])

  // An exam task is a link to the page of that part of the exam.
  await howAreYou.getByRole('link', { name: 'Fixture speaking task' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture speaking task' })).toBeVisible()
  expect(new URL(page.url()).hash).toBe('#/node/exam-sprechen-1')
})

test('a phrases page in Persian and in German: the phrases stay German and read left to right, the meaning follows the language', async ({
  page,
}) => {
  await page.goto(PHRASES_PAGE)
  await page.getByRole('button', { name: 'فارسی' }).click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('سلام‌های آزمایشی')
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'این عبارت‌ها برای چیست',
    'عبارت‌ها',
    'آزمون',
  ])
  const first = phrases(page, 'عبارت‌ها').nth(0)
  const phrase = first.getByRole('heading', { level: 3 }).locator('[lang="de"]')
  await expect(phrase).toHaveText('Guten Tag!')
  await expect(phrase).toHaveAttribute('dir', 'ltr')
  // German inside the Persian meaning is marked as German, without its asterisks.
  await expect(first.getByText('سلام. در طول روز می‌گویید، همچنین به کسی که Sie خطابش می‌کنید.')).toBeVisible()
  await expect(first.locator('p [lang="de"]').filter({ hasText: 'Sie' })).toHaveAttribute('dir', 'ltr')
  await expect(first.getByText('سلام، خانم تست!')).toBeVisible()
  await expect(first.getByRole('list', { name: 'کاربرد در امتحان' }).getByRole('link')).toHaveText([
    'تمرین صحبت کردن آزمایشی',
  ])

  // A learner who reads in German gets the explanation in simple German, and no translation of the example.
  await page.getByRole('button', { name: 'Deutsch' }).click()
  const inGerman = phrases(page, 'Redemittel').nth(0)
  await expect(inGerman.getByText('So sagt man am Tag Hallo, auch zu einer Person, zu der man Sie sagt.')).toBeVisible()
  await expect(inGerman.getByText('Guten Tag, Frau Test!')).toBeVisible()
  await expect(inGerman.getByText('Hello, Ms Test!')).toHaveCount(0)
  await expect(inGerman.getByText('سلام، خانم تست!')).toHaveCount(0)
})

test('a phrases page fits the screen it is opened on, in English and in Persian', async ({ page }) => {
  await page.goto(PHRASES_PAGE)

  await expect(page.getByRole('link', { name: 'Take the test' })).toBeInViewport()
  expect(await sidewaysScroll(page)).toBe(0)

  await page.getByRole('button', { name: 'فارسی' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  expect(await sidewaysScroll(page)).toBe(0)
})

test('the test of a phrases node makes the learner type phrases, and passing it marks the topic done', async ({
  page,
}) => {
  await page.goto(PHRASES_PAGE)
  await page.getByRole('link', { name: 'Take the test' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Test: Fixture greetings' })).toBeVisible()

  const met = await takeTest(page, () => 'right', { node: PHRASES_NODE })

  // Only 6 questions of the pool are answered by choosing, so at least 4 of the 10 were typed.
  expect(met.filter(isTyped).length).toBeGreaterThanOrEqual(4)
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('10 of 10 right')

  await page.getByRole('link', { name: 'All topics' }).click()
  await page.goto('./#/?level=B2')
  await expect(page.getByRole('main').getByRole('link', { name: /Fixture greetings/ })).toContainText('Done')
})

test('a learner who recognises the phrases but cannot write them does not pass', async ({ page }) => {
  await page.goto(`${PHRASES_PAGE}/test`)

  // Every question that is answered by choosing is right; every typed answer is wrong.
  await takeTest(page, (_place, question) => (isTyped(question) ? 'wrong' : 'right'), { node: PHRASES_NODE })

  await expect(page.getByRole('heading', { name: 'Not passed yet' })).toBeVisible()
  await expect(page.getByText('You need 9 of 10 right to pass.')).toBeVisible()
})
